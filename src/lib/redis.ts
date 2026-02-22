import { Redis } from '@upstash/redis';

// Inicializa o cliente Redis do Upstash
// Em ambiente de desenvolvimento local (sem as variáveis), retorna um mock simples ou falha graciosamente.

const MOCK_REDIS = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  incr: async () => 1,
  expire: async () => 1,
};

// Verifica se as variáveis de ambiente necessárias existem
const hasUpstashConfig = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export const redis = hasUpstashConfig 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : MOCK_REDIS as unknown as Redis;

export const isRedisEnabled = hasUpstashConfig;
