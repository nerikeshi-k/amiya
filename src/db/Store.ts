import RedisClient, { Redis, RedisOptions } from 'ioredis';
import { MongoClient } from 'mongodb';
import { ItemStore } from './ItemStore';
import { RankingStore } from './RankingStore';

type Option = {
  url: string;
  dbName: string;
  redis: RedisOptions;
};

export class Store {
  private dbName: string;
  private mongoClient: MongoClient;
  private redisClient: Redis;
  private _items: ItemStore | null = null;
  private _ranking: RankingStore | null = null;

  constructor(option: Option) {
    this.dbName = option.dbName;
    this.mongoClient = new MongoClient(option.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.redisClient = new RedisClient(option.redis);
  }

  async connect() {
    await this.mongoClient.connect();
    this._items = new ItemStore(
      this.mongoClient.db(this.dbName),
      this.redisClient
    );
    this._ranking = new RankingStore(
      this.mongoClient.db(this.dbName),
      this.redisClient
    );
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

  async updateAllSnapshot(period: { since: Date, until: Date }) {
    const makerIds = await this.items.getMakerIds();
    await Promise.all(
      makerIds.map(async (makerId) => {
        const count = await this.items.getMakerPlayCountRecently(
          makerId,
          period,
        );
        this.ranking.updateSnapshot(makerId, count);
      })
    );
  }
}
