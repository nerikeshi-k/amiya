import { isValid, parseISO } from 'date-fns';
import { FastifyPluginCallback } from 'fastify';
import type { Store } from '../db/Store';
import { PostRankingUpdateRequestBody } from '../types/requestBody';

export const rankingView = (store: Store): FastifyPluginCallback => (
  fastify,
  opts,
  done
) => {
  // 現在のランキングを返す
  fastify.get<{ Querystring: { limit?: number } }>(
    '/ranking',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            limit: {
              type: 'integer',
              nullable: true,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { limit } = request.query;
      const makerIds = await store.ranking.getRanking(limit);
      return { maker_id_list: makerIds };
    }
  );

  // ランキング用スナップショットに強制更新をかける
  fastify.post<{ Body: PostRankingUpdateRequestBody }>(
    '/ranking/update',
    {
      schema: {
        body: {
          type: 'object',
          required: ['since'],
          properties: {
            since: { type: 'string' },
            until: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { since: sinceString, until: untilString } = request.body;
      const since = parseISO(sinceString);
      const until = parseISO(untilString);
      if (!isValid(since) || !isValid(until)) {
        reply.status(400);
        return { message: 'date format is invalid' };
      }
      await store.updateAllSnapshot({ since, until });
      return { message: 'ok' };
    }
  );

  done();
};
