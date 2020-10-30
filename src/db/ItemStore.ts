import { fromUnixTime } from 'date-fns';
import { GachaResultItem } from 'item';
import { Db } from 'mongodb';
import { customAlphabet } from 'nanoid';
import { PostGachaResultItemRequestBody } from 'requestBody';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateId = customAlphabet(ALPHABET, 16);

export class ItemStore {
  constructor(readonly db: Db) {}

  private get collection() {
    return this.db.collection<GachaResultItem>('items');
  }

  async getItem(key: string) {
    return this.collection.findOne({ key });
  }

  async appendItem(payload: PostGachaResultItemRequestBody): Promise<string> {
    const key = generateId();
    await this.collection.insertOne({
      key,
      text: payload.text,
      maker_id: payload.maker_id,
      user_hash: payload.user_hash,
      created_at: fromUnixTime(payload.created_at),
    });
    return key;
  }

  async deleteItem(key: string) {
    return this.collection.deleteOne({ key });
  }
}
