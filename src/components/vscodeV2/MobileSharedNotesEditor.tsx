'use client';

import type { ChangeEvent } from 'react';

type MobileSharedNotesEditorProps = {
  lastSavedAt: string | null;
  onBlur: () => void;
  onChange: (value: string) => void;
  status: string;
  value: string;
};

const editorFontFamily = 'Monaco, Menlo, "Courier New", monospace';

export function MobileSharedNotesEditor({
  lastSavedAt,
  onBlur,
  onChange,
  status,
  value
}: MobileSharedNotesEditorProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <section
      key="shared-notes-mobile"
      className="relative flex w-full flex-col"
      aria-label="Shared notes editor"
      style={{ minHeight: 'calc(100dvh - 72px)' }}
    >
      <textarea
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="w-full flex-1 resize-none bg-transparent px-2 py-3 text-[13px] leading-6 text-[#D4D4D4] outline-none"
        style={{
          fontFamily: editorFontFamily,
          minHeight: 'calc(100dvh - 120px)'
        }}
      />
      <div
        className="pointer-events-none sticky bottom-1 flex justify-end gap-3 pr-2 text-[11px] text-gray-500"
        style={{ fontFamily: editorFontFamily }}
      >
        <span>{status}</span>
        <span>{lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : 'not saved yet'}</span>
      </div>
    </section>
  );
}
