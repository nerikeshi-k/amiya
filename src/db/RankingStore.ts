import { Db } from 'mongodb';

const LATE_24_SNAPSHOT_STORE_COLLECTION_KEY = 'late-24-snapshot';

export class RankingStore {
  constructor(readonly db: Db) {}

  private get snapshotCollection() {
    return this.db.collection<PlayCountSnapshot>(
      LATE_24_SNAPSHOT_STORE_COLLECTION_KEY
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
