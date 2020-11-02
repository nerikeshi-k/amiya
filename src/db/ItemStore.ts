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

  async getItem(key: string) {
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

  // slow method
  async getMakerPlayCountRecently(
    makerId: number,
    period: { since: Date; until: Date }
  ): Promise<number> {
    const result = await this.itemsCollection
      .aggregate<{ count: number }>([
        { $match: { created_at: { $gte: period.since, $lte: period.until } } },
        { $match: { maker_id: makerId } },
        { $group: { _id: '$user_hash' } },
        { $count: 'count' },
      ])
      .next();
    return result?.count ?? 0;
  }
}
