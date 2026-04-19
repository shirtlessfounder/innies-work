import { NextResponse } from 'next/server';
import { getSharedNotesDocument, saveSharedNotesDocument } from '../../../../lib/v2Notes/repository';

const MAX_NOTES_LENGTH = 50_000;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const document = await getSharedNotesDocument();

    return NextResponse.json(document, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load shared notes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const { content, baseRevision } = payload as {
      baseRevision?: number | null;
      content?: unknown;
    };

    if (typeof content !== 'string') {
      return NextResponse.json({ error: '`content` must be a string' }, { status: 400 });
    }

    if (content.length > MAX_NOTES_LENGTH) {
      return NextResponse.json({ error: 'Shared notes content is too large' }, { status: 400 });
    }

    if (
      baseRevision !== undefined &&
      baseRevision !== null &&
      (typeof baseRevision !== 'number' || Number.isNaN(baseRevision))
    ) {
      return NextResponse.json({ error: '`baseRevision` must be a number when provided' }, { status: 400 });
    }

    const document = await saveSharedNotesDocument(content, baseRevision ?? null);
    return NextResponse.json(document, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save shared notes';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
