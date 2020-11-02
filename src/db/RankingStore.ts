import { Redis } from 'ioredis';
import { Db } from 'mongodb';
import { PlayCountSnapshot } from '../types/PlayCountSnapshot';

const RANKING_STORE_SNAPSHOT_COLLECTION_KEY = 'rankingSnapshot';

export class RankingStore {
  constructor(readonly db: Db, readonly redis: Redis) {}

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

  async getRanking(limit: number = 0): Promise<number[]> {
    const result = await this.snapshotCollection
      .find()
      .sort({ play_count: -1 })
      .limit(limit)
      .toArray();
    return result.map((item) => item.maker_id);
  }
}
