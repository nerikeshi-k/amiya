import { fromUnixTime } from 'date-fns';
import { Redis } from 'ioredis';
import { Db } from 'mongodb';
import { customAlphabet } from 'nanoid';
import { GachaResultItem, MakerPlayCount } from '../types/item';
import { PostGachaResultItemRequestBody } from '../types/requestBody';

export const ITEM_STORE_COLLECTION_KEY = 'items';
export const ITEM_STORE_PLAY_COUNT_COLLECTION_KEY = 'makerPlayCount';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateId = customAlphabet(ALPHABET, 16);

const LATE_PLAYED_KEY_PREFIX = 'items:late-played-log:';
const LATE_PLAYED_EXPIRES_SECONDS = 60 * 60 * 24; // 1 day

export class ItemStore {
  constructor(readonly db: Db, readonly redis: Redis) {}

  private get itemsCollection() {
    return this.db.collection<GachaResultItem>(ITEM_STORE_COLLECTION_KEY);
  }

  private get playCountCollection() {
    return this.db.collection<MakerPlayCount>(
      ITEM_STORE_PLAY_COUNT_COLLECTION_KEY
    );
  }

  private getLatePlayedLogKey(maker_id: number, user_hash: string) {
    return `${LATE_PLAYED_KEY_PREFIX}${maker_id}--${user_hash}`;
  }

  private async insertItemToCollection(
    key: string,
    payload: PostGachaResultItemRequestBody
  ) {
    await this.itemsCollection.insertOne({
      key,
      text: payload.text,
      maker_id: payload.maker_id,
      user_hash: payload.user_hash,
      created_at: fromUnixTime(Math.floor(payload.created_at / 1000)),
    });
  }

  private async incrementPlayCount(maker_id: number, user_hash: string) {
    const latePlayedKey = this.getLatePlayedLogKey(maker_id, user_hash);
    const alreadyPlayed = (await this.redis.get(latePlayedKey)) != null;
    if (!alreadyPlayed) {
      await this.redis.set(
        latePlayedKey,
        '1',
        'EX',
        LATE_PLAYED_EXPIRES_SECONDS
      );
      await this.playCountCollection.updateOne(
        { maker_id: maker_id },
        { $inc: { play_count: 1 } },
        { upsert: true }
      );
    }
  }

  async getItem(key: string): Promise<GachaResultItem | null> {
    return this.itemsCollection.findOne({ key });
  }

  async appendItem(payload: PostGachaResultItemRequestBody): Promise<string> {
    const key = generateId();
    await Promise.all([
      this.insertItemToCollection(key, payload),
      this.incrementPlayCount(payload.maker_id, payload.user_hash),
    ]);
    return key;
  }

  async deleteItem(key: string): Promise<boolean> {
    const { result } = await this.itemsCollection.deleteOne({ key });
    return result.ok === 1;
  }

  async getMakerIds(): Promise<number[]> {
    const results = await this.itemsCollection
      .aggregate<{ _id: { maker_id: number } }>([
        { $group: { _id: { maker_id: '$maker_id' } } },
      ])
      .toArray();
    return results.map((item) => item._id.maker_id);
  }

  async getMakerPlayCount(makerId: number): Promise<number> {
    const result = await this.playCountCollection.findOne({
      maker_id: makerId,
    });
    return result?.play_count ?? 0;
  }

  async getMakerPlayCountMany(makerIds: number[]): Promise<MakerPlayCount[]> {
    const result = await this.playCountCollection
      .find({
        maker_id: { $in: makerIds },
      })
      .toArray();
    return result.map((item) => ({
      maker_id: item.maker_id,
      play_count: item.play_count,
    }));
  }

  async getMakerPlayCountsRecently(
    makerIds: number[],
    period: { since: Date; until: Date }
  ): Promise<{ makerId: number; count: number }[]> {
    const userHashMap = makerIds.reduce((map, id) => {
      map.set(id, new Set());
      return map;
    }, new Map<number, Set<string>>());
    const cursor = await this.itemsCollection
      .find({ created_at: { $gte: period.since, $lte: period.until } })
      .batchSize(1000);
    while (await cursor.hasNext()) {
      const chunk = await cursor.next();
      if (chunk == null) {
        break;
      }
      const hashSet = userHashMap.get(chunk.maker_id);
      if (hashSet == null) {
        continue;
      }
      hashSet.add(chunk.user_hash);
      userHashMap.set(chunk.maker_id, hashSet);
    }
    const result: { makerId: number; count: number }[] = [];
    for (let key of userHashMap.keys()) {
      const set = userHashMap.get(key);
      result.push({ makerId: key, count: set != null ? set.size : 0 });
    }
    return result;
  }
}
