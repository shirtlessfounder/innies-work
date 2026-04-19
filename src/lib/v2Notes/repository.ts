import 'server-only';

import type { Notification } from 'pg';
import { createSharedNotesListenerClient, getSharedNotesPool } from './db';

const SHARED_NOTES_DOCUMENT_ID = 'v2:notes.md';
const SHARED_NOTES_CHANNEL = 'v2_shared_notes_updates';

type SharedNotesRow = {
  id: string;
  content: string;
  revision: number | string;
  updatedAt: string | Date;
};

export type SharedNotesDocument = {
  id: string;
  content: string;
  revision: number;
  updatedAt: string;
};

function mapSharedNotesRow(row: SharedNotesRow): SharedNotesDocument {
  return {
    id: row.id,
    content: row.content,
    revision: Number(row.revision),
    updatedAt: new Date(row.updatedAt).toISOString()
  };
}

async function ensureSharedNotesDocument() {
  const pool = getSharedNotesPool();

  await pool.query(
    `
      insert into shared_documents (id, content, revision)
      values ($1, '', 0)
      on conflict (id) do nothing
    `,
    [SHARED_NOTES_DOCUMENT_ID]
  );
}

export async function getSharedNotesDocument() {
  await ensureSharedNotesDocument();

  const pool = getSharedNotesPool();
  const result = await pool.query<SharedNotesRow>(
    `
      select
        id,
        content,
        revision,
        updated_at as "updatedAt"
      from shared_documents
      where id = $1
      limit 1
    `,
    [SHARED_NOTES_DOCUMENT_ID]
  );

  if (result.rowCount !== 1) {
    throw new Error('Shared notes document not found');
  }

  return mapSharedNotesRow(result.rows[0]);
}

export async function saveSharedNotesDocument(content: string, baseRevision?: number | null) {
  const pool = getSharedNotesPool();
  const client = await pool.connect();

  try {
    await client.query('begin');

    const result = await client.query<SharedNotesRow>(
      `
        insert into shared_documents (id, content, revision)
        values ($1, $2, 1)
        on conflict (id) do update
        set
          content = excluded.content,
          revision = shared_documents.revision + 1,
          updated_at = now()
        returning
          id,
          content,
          revision,
          updated_at as "updatedAt"
      `,
      [SHARED_NOTES_DOCUMENT_ID, content]
    );

    const document = mapSharedNotesRow(result.rows[0]);

    // NOTIFY the SSE route so idle clients can refresh without polling.
    await client.query('select pg_notify($1, $2)', [
      SHARED_NOTES_CHANNEL,
      JSON.stringify({
        id: SHARED_NOTES_DOCUMENT_ID,
        revision: document.revision,
        baseRevision: baseRevision ?? null
      })
    ]);

    await client.query('commit');
    return document;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

export async function listenForSharedNotesUpdates(
  onUpdate: (document: SharedNotesDocument) => Promise<void> | void
) {
  const client = await createSharedNotesListenerClient();

  const handleNotification = async (notification: Notification) => {
    if (notification.channel !== SHARED_NOTES_CHANNEL) {
      return;
    }

    const document = await getSharedNotesDocument();
    await onUpdate(document);
  };

  // LISTEN keeps the shared notes stream in sync across open browser tabs.
  client.on('notification', handleNotification);
  await client.query(`LISTEN ${SHARED_NOTES_CHANNEL}`);

  return async () => {
    client.off('notification', handleNotification);
    await client.query(`UNLISTEN ${SHARED_NOTES_CHANNEL}`);
    await client.end();
  };
}
