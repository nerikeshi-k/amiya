import Fastify from 'fastify';
import { Store } from './db/Store';
import { itemsView } from './views/items';
import { makersView } from './views/makers';

const PORT = process.env.PORT ?? 3000;
const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME ?? 'gacha-result-items-dev';

export const store = new Store({
  url: DB_URL,
  dbName: DB_NAME,
});

async function bootstrap() {
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

  fastify.register(itemsView);
  fastify.register(makersView);

  fastify.listen(PORT, (err, address) => {
    if (err) throw err;
    fastify.log.info(`server listening on ${address}`);
  });
}

bootstrap();
