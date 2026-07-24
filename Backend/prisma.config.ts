import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Prisma configuration (replaces the deprecated `package.json#prisma` block).
 * `dotenv/config` loads .env, since a config file disables Prisma's automatic
 * .env loading.
 */
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
});
