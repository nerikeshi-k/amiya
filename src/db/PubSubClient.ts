import RedisClient, { Redis, RedisOptions } from 'ioredis';

type ChannelAction = (message: string) => void;

export class PubSubClient {
  private subscriber: Redis;
  private publisher: Redis;
  private actions: Map<string, ChannelAction> = new Map();

  constructor(redisOptions: RedisOptions) {
    this.subscriber = new RedisClient(redisOptions);
    this.publisher = new RedisClient(redisOptions);
  }

  async init() {
    return this.subscriber.on('message', (channel: string, message: string) => {
      const action = this.actions.get(channel);
      if (action != null) {
        action(message);
      }
    });
  }

  async subscribe(channel: string, action: ChannelAction) {
    if (!this.actions.has(channel)) {
      await this.subscriber.subscribe(channel);
    }
    return this.actions.set(channel, action);
  }

  async publish(channel: string, message: string) {
    return this.publisher.publish(channel, message);
  }
}
