import { formatISO, parseISO } from 'date-fns';
import RedisClient, { Redis, RedisOptions } from 'ioredis';
import { MongoClient } from 'mongodb';
import { ItemStore } from './ItemStore';
import { PubSubClient } from './PubSubClient';
import { RankingStore } from './RankingStore';

type Option = {
  url: string;
  dbName: string;
  redis: RedisOptions;
  pubsub: RedisOptions;
};

const CHANNEL_UPDATE_ALL_RANKING = 'CHANNEL_UPDATE_ALL_RANKING';

export class Store {
  private dbName: string;
  private mongoClient: MongoClient;
  private redisClient: Redis;
  private pubsubClient: PubSubClient;
  private _items: ItemStore | null = null;
  private _ranking: RankingStore | null = null;

  constructor(option: Option) {
    this.dbName = option.dbName;
    this.mongoClient = new MongoClient(option.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    this.redisClient = new RedisClient(option.redis);
    this.pubsubClient = new PubSubClient(option.pubsub);
    this.pubsubClient.subscribe(CHANNEL_UPDATE_ALL_RANKING, (...args) =>
      this.updateAllSnapshotAction(...args)
    );
  }

  async connect() {
    await this.pubsubClient.init();
    await this.mongoClient.connect();
    this._items = new ItemStore(
      this.mongoClient.db(this.dbName),
      this.redisClient
    );
    this._ranking = new RankingStore(
      this.mongoClient.db(this.dbName),
      this.redisClient,
      this.pubsubClient
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

  async updateAllSnapshot(period: Period) {
    return this.pubsubClient.publish(
      CHANNEL_UPDATE_ALL_RANKING,
      JSON.stringify({
        since: formatISO(period.since),
        until: formatISO(period.until),
      })
    );
  }

  private async updateAllSnapshotAction(message: string) {
    const payload: {
      since: string;
      until: string;
    } = JSON.parse(message);
    const makerIds = await this.items.getMakerIds();
    const results = await this.items.getMakerPlayCountsRecently(makerIds, {
      since: parseISO(payload.since),
      until: parseISO(payload.until),
    });
    results.forEach((result) => {
      this.ranking.updateSnapshot(result.makerId, result.count);
    });
  }
}
