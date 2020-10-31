import { MongoClient } from 'mongodb';
import { ItemStore } from './ItemStore';
import { RankingStore } from './RankingStore';

type Option = {
  url: string;
  dbName: string;
};

export class Store {
  private dbName: string;
  private client: MongoClient;
  private _items: ItemStore | null = null;
  private _ranking: RankingStore | null = null;

  constructor(option: Option) {
    this.dbName = option.dbName;
    this.client = new MongoClient(option.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }

  async connect() {
    await this.client.connect();
    this._items = new ItemStore(this.client.db(this.dbName));
    this._ranking = new RankingStore(this.client.db(this.dbName));
  }

  get items(): ItemStore {
    const { _items } = this;
    if (_items == null) {
      throw new Error('store unconnected');
    }
    return _items;
  }

  get ranking(): RankingStore {
    const { _ranking } = this;
    if (_ranking == null) {
      throw new Error('store unconnected');
    }
    return _ranking;
  }

  async updateAllSnapshot(since: Date) {
    const makerIds = await this.items.getMakerIds();
    await Promise.all(
      makerIds.map(async (makerId) => {
        const count = await this.items.getMakerPlayCountRecently(
          makerId,
          since
        );
        this.ranking.updateSnapshot(makerId, count);
      })
    );
  }
}
