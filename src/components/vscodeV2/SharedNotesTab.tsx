'use client';

import { useEffect, useRef, useState } from 'react';
import { MobileSharedNotesEditor } from './MobileSharedNotesEditor';
import { MonacoSharedNotesEditor } from './MonacoSharedNotesEditor';

type SharedNotesDocument = {
  content: string;
  id: string;
  revision: number;
  updatedAt: string;
};

const SAVE_DEBOUNCE_MS = 650;

// Notes backend lives on the innies API (exe.dev) — Vercel serverless can't
// hold the SSE /stream connection open long enough for LISTEN/NOTIFY.
// Fall back to same-origin for local dev without the env var.
const SHARED_NOTES_BASE_URL = (process.env.NEXT_PUBLIC_INNIES_API_BASE_URL ?? '').trim();

function sharedNotesBaseUrl(path: string): string {
  if (!SHARED_NOTES_BASE_URL) return path;
  return `${SHARED_NOTES_BASE_URL.replace(/\/$/, '')}${path}`;
}

function parseSharedNotesDocument(value: unknown): SharedNotesDocument | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const document = value as Partial<SharedNotesDocument>;

  if (
    typeof document.id !== 'string' ||
    typeof document.content !== 'string' ||
    typeof document.revision !== 'number' ||
    typeof document.updatedAt !== 'string'
  ) {
    return null;
  }

  return document as SharedNotesDocument;
}

export function SharedNotesTab() {
  const [content, setContent] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [revision, setRevision] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [canConnectRealtime, setCanConnectRealtime] = useState(false);
  const [status, setStatus] = useState('loading...');
  const [hasRemoteUpdate, setHasRemoteUpdate] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const contentRef = useRef(content);
  const revisionRef = useRef(revision);
  const dirtyRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const isPersistingRef = useRef(false);
  const persistSharedNotesRef = useRef(
    async (_options?: { immediate?: boolean; keepalive?: boolean }) => {}
  );
  const isDirty = isLoaded && content !== savedContent;

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    revisionRef.current = revision;
  }, [revision]);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  persistSharedNotesRef.current = async ({
    immediate = false,
    keepalive = false
  }: {
    immediate?: boolean;
    keepalive?: boolean;
  } = {}) => {
    if (!immediate || !dirtyRef.current) {
      return;
    }

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (isPersistingRef.current) {
      return;
    }

    isPersistingRef.current = true;

    try {
      const response = await fetch(sharedNotesBaseUrl('/v2/notes'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        keepalive,
        body: JSON.stringify({
          content: contentRef.current,
          baseRevision: revisionRef.current
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save shared notes');
      }

      const nextDocument = parseSharedNotesDocument(await response.json());

      if (!nextDocument) {
        throw new Error('Shared notes response was invalid');
      }

      const hasPendingDraft = contentRef.current !== nextDocument.content;

      setContent(hasPendingDraft ? contentRef.current : nextDocument.content);
      setSavedContent(nextDocument.content);
      setRevision(nextDocument.revision);
      setLastSavedAt(nextDocument.updatedAt);
      setHasRemoteUpdate(false);
      setStatus(hasPendingDraft ? 'saving...' : 'saved');
    } catch (error) {
      setStatus('save failed');
    } finally {
      isPersistingRef.current = false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadDocument = async () => {
      try {
        const response = await fetch(sharedNotesBaseUrl('/v2/notes'), {
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error('Failed to load shared notes');
        }

        const nextDocument = parseSharedNotesDocument(await response.json());

        if (!nextDocument || cancelled) {
          return;
        }

        setContent(nextDocument.content);
        setSavedContent(nextDocument.content);
        setRevision(nextDocument.revision);
        setLastSavedAt(nextDocument.updatedAt);
        setHasRemoteUpdate(false);
        setCanConnectRealtime(true);
        setStatus('live');
      } catch (error) {
        if (!cancelled) {
          setCanConnectRealtime(false);
          setStatus('offline');
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    };

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canConnectRealtime) {
      return;
    }

    const stream = new EventSource(sharedNotesBaseUrl('/v2/notes/stream'));

    const handleOpen = () => {
      setStatus((currentStatus) => {
        if (currentStatus === 'saving...' || currentStatus === 'remote update available') {
          return currentStatus;
        }

        return 'live';
      });
    };

    const handleNotesEvent = (event: MessageEvent<string>) => {
      const nextDocument = parseSharedNotesDocument(JSON.parse(event.data));

      if (!nextDocument) {
        return;
      }

      if (nextDocument.revision <= revisionRef.current) {
        return;
      }

      if (dirtyRef.current) {
        setRevision(nextDocument.revision);
        setHasRemoteUpdate(true);
        setLastSavedAt(nextDocument.updatedAt);
        setStatus('remote update available');
        return;
      }

      setContent(nextDocument.content);
      setSavedContent(nextDocument.content);
      setRevision(nextDocument.revision);
      setLastSavedAt(nextDocument.updatedAt);
      setHasRemoteUpdate(false);
      setStatus('live updated');
    };

    const handleError = () => {
      setStatus((currentStatus) => {
        if (
          currentStatus === 'saving...' ||
          currentStatus === 'save failed' ||
          currentStatus === 'remote update available'
        ) {
          return currentStatus;
        }

        return 'reconnecting...';
      });
    };

    stream.addEventListener('open', handleOpen);
    stream.addEventListener('notes', handleNotesEvent as EventListener);
    stream.onerror = handleError;

    return () => {
      stream.removeEventListener('open', handleOpen);
      stream.removeEventListener('notes', handleNotesEvent as EventListener);
      stream.close();
    };
  }, [canConnectRealtime]);

  useEffect(() => {
    const handlePageHide = () => {
      void persistSharedNotesRef.current({ immediate: true, keepalive: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') {
        return;
      }

      void persistSharedNotesRef.current({ immediate: true, keepalive: true });
    };

    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!isDirty) {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      return;
    }

    setStatus(hasRemoteUpdate ? 'remote update available' : 'saving...');

    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      void persistSharedNotesRef.current({ immediate: true });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [content, hasRemoteUpdate, isDirty]);

  const Editor = isMobile ? MobileSharedNotesEditor : MonacoSharedNotesEditor;

  return (
    <Editor
      lastSavedAt={lastSavedAt}
      onBlur={() => {
        void persistSharedNotesRef.current({ immediate: true });
      }}
      onChange={setContent}
      status={status}
      value={content}
    />
  );
}
