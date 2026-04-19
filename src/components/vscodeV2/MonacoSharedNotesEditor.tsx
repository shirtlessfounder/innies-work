'use client';

import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';

type MonacoSharedNotesEditorProps = {
  lastSavedAt: string | null;
  onBlur: () => void;
  onChange: (value: string) => void;
  status: string;
  value: string;
};

type MonacoEditorInstance = Parameters<OnMount>[0];
type MonacoGutterLineNumber = {
  number: number;
  top: number;
};

const editorFontFamily = 'Monaco, Menlo, "Courier New", monospace';
const SHELL_HEADER_HEIGHT = 44;
const SHELL_FOOTER_HEIGHT = 28;
const editorHeight = `calc(100vh - ${SHELL_HEADER_HEIGHT}px - ${SHELL_FOOTER_HEIGHT}px)`;
const editorLineHeight = 24;
const gutterWidth = 48;
const gutterTopOffset = 3;
const gutterRightPadding = 12;
const editorContentInsetLeft = 16;
const gutterDivider = '1px solid #2B2B2B';
const activeLineNumberColor = '#C6C6C6';
const inactiveLineNumberColor = '#858585';

function fallbackLineNumbers(value: string) {
  const lineCount = Math.max(value.split('\n').length, 1);

  return Array.from({ length: lineCount }, (_, index) => ({
    number: index + 1,
    top: gutterTopOffset + index * editorLineHeight
  }));
}

const editorOptions = {
  automaticLayout: true,
  cursorBlinking: 'blink' as const,
  cursorSmoothCaretAnimation: 'off' as const,
  folding: false,
  fontFamily: editorFontFamily,
  fontSize: 13,
  glyphMargin: false,
  lineDecorationsWidth: 0,
  lineHeight: editorLineHeight,
  lineNumbers: 'off' as const,
  lineNumbersMinChars: 0,
  minimap: { enabled: false },
  overviewRulerBorder: false,
  padding: {
    bottom: 24,
    top: gutterTopOffset
  },
  renderFinalNewline: 'dimmed' as const,
  renderLineHighlight: 'line' as const,
  renderLineHighlightOnlyWhenFocus: true,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  scrollbar: {
    alwaysConsumeMouseWheel: false,
    horizontalScrollbarSize: 10,
    verticalScrollbarSize: 10
  },
  wordWrap: 'on' as const,
  wordWrapColumn: 120,
  wrappingIndent: 'same' as const
};

export function MonacoSharedNotesEditor({
  lastSavedAt,
  onBlur,
  onChange,
  status,
  value
}: MonacoSharedNotesEditorProps) {
  const [activeLineNumber, setActiveLineNumber] = useState(1);
  const [gutterContentHeight, setGutterContentHeight] = useState(0);
  const [gutterLineNumbers, setGutterLineNumbers] = useState<MonacoGutterLineNumber[]>(
    () => fallbackLineNumbers(value)
  );
  const [gutterScrollTop, setGutterScrollTop] = useState(0);
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const editorDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);

  const syncGutterLineNumbers = (editor: MonacoEditorInstance) => {
    const lineCount = editor.getModel()?.getLineCount() ?? 1;
    const nextLineNumbers = Array.from({ length: lineCount }, (_, index) => {
      const lineNumber = index + 1;

      return {
        number: lineNumber,
        top: editor.getTopForLineNumber(lineNumber)
      };
    });

    setActiveLineNumber(editor.getPosition()?.lineNumber ?? 1);
    setGutterContentHeight(Math.max(editor.getContentHeight(), editor.getLayoutInfo().height));
    setGutterLineNumbers(nextLineNumbers);
    setGutterScrollTop(editor.getScrollTop());
  };

  useEffect(() => {
    if (editorRef.current) {
      return;
    }

    setGutterLineNumbers(fallbackLineNumbers(value));
  }, [value]);

  useEffect(() => {
    return () => {
      editorDisposablesRef.current.forEach((disposable) => {
        disposable.dispose();
      });
      editorDisposablesRef.current = [];
      editorRef.current = null;
    };
  }, []);

  const beforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme('vscode-v2-notes', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1F1F1F',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#252526',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editorCursor.foreground': '#E6E6E6',
        'editorOverviewRuler.border': '#1F1F1F',
        'scrollbar.shadow': '#00000000'
      }
    });
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.setTheme('vscode-v2-notes');
    syncGutterLineNumbers(editor);

    editorDisposablesRef.current.forEach((disposable) => {
      disposable.dispose();
    });

    editorDisposablesRef.current = [
      editor.onDidBlurEditorText(() => {
        onBlur();
      }),
      editor.onDidChangeCursorPosition((event) => {
        setActiveLineNumber(event.position.lineNumber);
      }),
      editor.onDidChangeModelContent(() => {
        syncGutterLineNumbers(editor);
      }),
      editor.onDidChangeModel(() => {
        syncGutterLineNumbers(editor);
      }),
      editor.onDidContentSizeChange(() => {
        syncGutterLineNumbers(editor);
      }),
      editor.onDidLayoutChange(() => {
        syncGutterLineNumbers(editor);
      }),
      editor.onDidScrollChange((event) => {
        setGutterScrollTop(event.scrollTop);
      })
    ];
  };

  return (
    <section key="shared-notes" className="relative w-full overflow-hidden" aria-label="Shared notes editor">
      <div className="flex" style={{ height: editorHeight }}>
        <div
          aria-hidden="true"
          style={{
            backgroundColor: '#1F1F1F',
            borderRight: gutterDivider,
            color: inactiveLineNumberColor,
            flexShrink: 0,
            fontFamily: editorFontFamily,
            fontSize: '13px',
            overflow: 'hidden',
            position: 'relative',
            userSelect: 'none',
            width: `${gutterWidth}px`
          }}
        >
          <div
            style={{
              height: `${gutterContentHeight || editorLineHeight}px`,
              position: 'relative',
              transform: `translateY(-${gutterScrollTop}px)`
            }}
          >
            {gutterLineNumbers.map((lineNumber) => (
              <div
                key={lineNumber.number}
                style={{
                  alignItems: 'center',
                  color: activeLineNumber === lineNumber.number ? activeLineNumberColor : inactiveLineNumberColor,
                  display: 'flex',
                  height: `${editorLineHeight}px`,
                  justifyContent: 'flex-end',
                  paddingRight: `${gutterRightPadding}px`,
                  position: 'absolute',
                  right: 0,
                  top: `${lineNumber.top}px`,
                  width: '100%'
                }}
              >
                {lineNumber.number}
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative flex-1 overflow-hidden"
          style={{ paddingLeft: `${editorContentInsetLeft}px` }}
        >
          <Editor
            defaultLanguage="plaintext"
            height="100%"
            loading={
              <div
                className="flex h-full items-center justify-center text-[13px] text-gray-500"
                style={{ fontFamily: editorFontFamily }}
              >
                loading notes...
              </div>
            }
            onChange={(nextValue) => {
              onChange(nextValue ?? '');
            }}
            onMount={handleMount}
            beforeMount={beforeMount}
            options={editorOptions}
            path="file:///v2/leave-a-note.md"
            theme="vscode-v2-notes"
            value={value}
            width="100%"
          />
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-3 right-4 flex gap-4 text-[13px] text-gray-500"
        style={{ fontFamily: editorFontFamily }}
      >
        <span>{status}</span>
        <span>{lastSavedAt ? new Date(lastSavedAt).toLocaleString() : 'not saved yet'}</span>
      </div>
    </section>
  );
}
