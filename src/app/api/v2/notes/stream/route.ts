import { getSharedNotesDocument, listenForSharedNotesUpdates } from '../../../../../lib/v2Notes/repository';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function encodeServerEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let closed = false;
  let cleanupListener: (() => Promise<void>) | null = null;
  let heartbeatId: ReturnType<typeof setInterval> | null = null;

  const closeStream = async () => {
    if (closed) {
      return;
    }

    closed = true;

    if (heartbeatId) {
      clearInterval(heartbeatId);
      heartbeatId = null;
    }

    if (cleanupListener) {
      const disconnect = cleanupListener;
      cleanupListener = null;
      await disconnect();
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: string, payload: unknown) => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(encodeServerEvent(event, payload)));
      };

      const currentDocument = await getSharedNotesDocument();
      push('notes', currentDocument);

      heartbeatId = setInterval(() => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 15_000);

      cleanupListener = await listenForSharedNotesUpdates((document) => {
        push('notes', document);
      });

      request.signal.addEventListener(
        'abort',
        () => {
          void closeStream().finally(() => {
            controller.close();
          });
        },
        { once: true }
      );
    },
    async cancel() {
      await closeStream();
    }
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8'
    }
  });
}
