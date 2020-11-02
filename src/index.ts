import Fastify from 'fastify';
import { Store } from './db/Store';
import { itemsView } from './views/items';
import { makersView } from './views/makers';
import { rankingView } from './views/ranking';

const PORT = process.env.PORT ?? 3000;
const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME ?? 'amiya-dev';
const REDIS_PORT = parseInt(process.env.REDIS_PORT ?? '6379', 10);
const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_DB = parseInt(process.env.REDIS_DB ?? '0', 10);

const REDIS_KEY_PREFIX = 'amiya:';

async function bootstrap() {
  const redisConfig = {
    port: REDIS_PORT,
    host: REDIS_HOST,
    db: REDIS_DB,
    keyPredix: REDIS_KEY_PREFIX,
  };

  const store = new Store({
    url: DB_URL,
    dbName: DB_NAME,
    redis: redisConfig,
    pubsub: redisConfig,
  });

  try {
    await store.connect();
  } catch (e) {
    console.error(e);
    console.error('Could not connect to database');
    return;
  }

  const fastify = Fastify({
    logger: true,
  });

  fastify.get('/health_check', async (request, reply) => {
    return { message: 'ok' };
  });

  fastify.register(itemsView(store));
  fastify.register(makersView(store));
  fastify.register(rankingView(store));

  fastify.listen(PORT, (err, address) => {
    if (err) throw err;
    fastify.log.info(`server listening on ${address}`);
  });
}

bootstrap();
