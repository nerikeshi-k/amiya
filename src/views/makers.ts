import { FastifyPluginCallback } from 'fastify';
import type { Store } from '../db/Store';

export const makersView = (store: Store): FastifyPluginCallback => (
  fastify,
  opts,
  done
) => {
  fastify.get<{ Params: { makerId: string } }>(
    '/makers/:makerId/play_count',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            makerId: {
              type: 'integer',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { makerId } = request.params;
      const count = await store.items.getMakerPlayCount(parseInt(makerId, 10));
      return { count };
    }
  );

  done();
};
