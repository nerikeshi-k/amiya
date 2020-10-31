import { FastifyPluginCallback } from 'fastify';
import { PostGachaResultItemRequestBody } from 'requestBody';
import type { Store } from '../db/Store';

export const itemsView = (store: Store): FastifyPluginCallback => (
  fastify,
  opts,
  done
) => {
  fastify.get<{ Params: { key: string } }>(
    '/items/:key',
    async (request, reply) => {
      const { key } = request.params;
      const item = await store.items.getItem(key);
      if (item == null) {
        reply.status(404);
        return { message: 'item not found' };
      }
      return {
        id: item.key,
        text: item.text,
        created_at: item.created_at,
        maker_id: item.maker_id,
      };
    }
  );

  fastify.post<{ Body: PostGachaResultItemRequestBody }>(
    '/items',
    {
      schema: {
        body: {
          type: 'object',
          required: ['text', 'created_at', 'maker_id', 'user_hash'],
          properties: {
            text: { type: 'string' },
            created_at: { type: 'integer' },
            maker_id: { type: 'integer' },
            user_hash: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const key = await store.items.appendItem(request.body);
      return { id: key };
    }
  );

  fastify.delete<{ Params: { key: string } }>(
    '/items/:key',
    async (request, reply) => {
      const { key } = request.params;
      await store.items.deleteItem(key);
      return { message: 'ok' };
    }
  );

  done();
};
