import { FastifyPluginCallback } from 'fastify';
import { store } from '..';

export const makersView: FastifyPluginCallback = (fastify, opts, done) => {
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
      const count = await store.items.makerPlayCount(parseInt(makerId, 10));
      return { count };
    }
  );

  done();
};
