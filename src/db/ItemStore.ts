import { fromUnixTime } from 'date-fns';
import { GachaResultItem } from 'item';
import { Db } from 'mongodb';
import { customAlphabet } from 'nanoid';
import { PostGachaResultItemRequestBody } from 'requestBody';

export const ITEM_STORE_COLLECTION_KEY = 'items';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generateId = customAlphabet(ALPHABET, 16);

export class ItemStore {
  constructor(readonly db: Db) {}

  private get collection() {
    return this.db.collection<GachaResultItem>(ITEM_STORE_COLLECTION_KEY);
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

  async makerPlayCount(makerId: number): Promise<number> {
    const result = await this.collection
      .aggregate<{ count: number }>([
        { $match: { maker_id: makerId } },
        { $group: { _id: '$user_hash' } },
        { $count: 'count' }
      ]).next();
    return result?.count ?? 0;
  }
}
