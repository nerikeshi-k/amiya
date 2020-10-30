import { MongoClient } from 'mongodb';
import { ItemStore } from './ItemStore';

type Option = {
  url: string;
  dbName: string;
};

export class Store {
  private dbName: string;
  private client: MongoClient;
  private _items: ItemStore | null = null;

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
  }

  get items(): ItemStore {
    const { _items } = this;
    if (_items == null) {
      throw new Error('store unconnected');
    }
    return _items;
  }
}
