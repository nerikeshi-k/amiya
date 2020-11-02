import { Redis } from 'ioredis';
import { Db } from 'mongodb';
import { PlayCountSnapshot } from '../types/PlayCountSnapshot';
import { PubSubClient } from './PubSubClient';

const RANKING_STORE_SNAPSHOT_COLLECTION_KEY = 'rankingSnapshot';
const CHANNEL_UPDATE_RANKING = 'CHANNEL_UPDATE_RANKING';

const RANKING_CACHE_KEY = 'ranking:maker-ids';
const RANKING_CACHE_EXPIRES_SECONDS = 60 * 10;
const RANKING_UPDATED_FLAG_KEY = 'ranking:maker-ids-updated-flag';
const RANKING_UPDATED_FLAG_EXPIRES_SECONDS = 30;

export class RankingStore {
  constructor(
    readonly db: Db,
    readonly redis: Redis,
    readonly pubsubClient: PubSubClient
  ) {
    pubsubClient.subscribe(CHANNEL_UPDATE_RANKING, () => {
      this.fetchAndCacheRanking();
    });
  }

  private get snapshotCollection() {
    return this.db.collection<PlayCountSnapshot>(
      RANKING_STORE_SNAPSHOT_COLLECTION_KEY
    );
  }

  async updateSnapshot(makerId: number, playCount: number): Promise<boolean> {
    const { result } = await this.snapshotCollection.updateOne(
      { maker_id: makerId },
      { $set: { play_count: playCount } },
      { upsert: true }
    );
    return result.ok === 1;
  }

  async getRanking(limit?: number): Promise<number[]> {
    await this.updateRankingIfNeeded();
    const cached = await this.getCachedRanking(limit);
    if (cached != null) {
      return cached;
    }
    const result = await this.fetchAndCacheRanking();
    return result.slice(0, limit);
  }

  private async getCachedRanking(limit?: number): Promise<number[] | null> {
    const items = await this.redis.lrange(
      RANKING_CACHE_KEY,
      0,
      // https://redis.io/commands/lrange
      // 1のとき1件、2のとき2件返すようにするとこうなる
      (limit ?? 0) - 1 
    );
    return items.length > 0 ? items.map((item) => parseInt(item, 10)) : null;
  }

  private async fetchAndCacheRanking(): Promise<number[]> {
    const result = await this.snapshotCollection
      .find()
      .sort({ play_count: -1 })
      .toArray();
    const maker_ids = result.map((item) => item.maker_id);
    await this.redis
      .pipeline()
      .del(RANKING_CACHE_KEY)
      .rpush(RANKING_CACHE_KEY, ...maker_ids.map((id) => id.toString()))
      .expire(RANKING_CACHE_KEY, RANKING_CACHE_EXPIRES_SECONDS)
      .exec();
    return maker_ids;
  }

  private async updateRankingIfNeeded() {
    const key = RANKING_UPDATED_FLAG_KEY;
    const expires = RANKING_UPDATED_FLAG_EXPIRES_SECONDS;

    const updated = (await this.redis.get(key)) != null;
    if (!updated) {
      await this.redis.set(key, '1', 'EX', expires);
      await this.pubsubClient.publish(
        CHANNEL_UPDATE_RANKING,
        JSON.stringify({})
      );
    }
  }
}
