import 'server-only';

import { Client, Pool } from 'pg';

declare global {
  var __v2SharedNotesPool: Pool | undefined;
}

function readDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for shared /v2 notes');
  }

  return databaseUrl;
}

export function getSharedNotesPool() {
  if (!globalThis.__v2SharedNotesPool) {
    globalThis.__v2SharedNotesPool = new Pool({
      connectionString: readDatabaseUrl(),
      max: 10
    });
  }

  return globalThis.__v2SharedNotesPool;
}

export async function createSharedNotesListenerClient() {
  const client = new Client({
    connectionString: readDatabaseUrl()
  });

  await client.connect();
  return client;
}
