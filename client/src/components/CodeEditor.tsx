import Editor, { OnMount } from "@monaco-editor/react";
import { useRuntimeStore } from "@/lib/runtimeStore";
import { useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import type { editor } from "monaco-editor";

export function CodeEditor() {
  const {
    code, setCode, currentLine, executionState,
    breakpoints, toggleBreakpoint, isBreakpointAtLine
  } = useRuntimeStore();
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const breakpointDecorationsRef = useRef<string[]>([]);
  const monacoRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Handle gutter click for breakpoints
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          toggleBreakpoint(lineNumber);
        }
      }
    });
  };

  // Update breakpoint decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const breakpointDecorations: editor.IModelDeltaDecoration[] = breakpoints
      .filter(bp => bp.enabled)
      .map(bp => ({
        range: {
          startLineNumber: bp.line,
          startColumn: 1,
          endLineNumber: bp.line,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: "breakpoint-line",
          glyphMarginClassName: "breakpoint-glyph",
          glyphMarginHoverMessage: { value: bp.condition ? `Condition: ${bp.condition}` : 'Click to remove breakpoint' },
        },
      }));

    breakpointDecorationsRef.current = editorRef.current.deltaDecorations(
      breakpointDecorationsRef.current,
      breakpointDecorations,
    );
  }, [breakpoints]);

  // Update execution line decorations
  useEffect(() => {
    if (!editorRef.current) return;

    const newDecorations: editor.IModelDeltaDecoration[] = [];

    if (currentLine && currentLine > 0 && executionState !== "idle") {
      const isBreakpoint = isBreakpointAtLine(currentLine);
      newDecorations.push({
        range: {
          startLineNumber: currentLine,
          startColumn: 1,
          endLineNumber: currentLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: isBreakpoint ? "execution-line-breakpoint" : "execution-line-highlight",
        },
      });
    }

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      newDecorations,
    );
  }, [currentLine, executionState, isBreakpointAtLine]);

  return (
    <div className="flex flex-col h-full bg-[hsl(var(--app-panel-deep))] rounded-lg overflow-hidden">
      <style>{`
        /* Dark mode (default) — soft yellow glow on dark editor */
        .execution-line-highlight {
          background: rgba(255, 213, 79, 0.15) !important;
          border-left: 3px solid #ffd54f !important;
        }
        .execution-line-breakpoint {
          background: rgba(239, 68, 68, 0.2) !important;
          border-left: 3px solid #ef4444 !important;
        }
        .breakpoint-line {
          background: rgba(239, 68, 68, 0.08) !important;
        }
        /* Light mode — saturated amber on white (Claude warm theme) */
        :root:not(.dark) .execution-line-highlight {
          background: rgba(218, 119, 86, 0.14) !important;
          border-left: 3px solid #DA7756 !important;
          box-shadow: inset 0 0 0 1px rgba(218, 119, 86, 0.10) !important;
        }
        :root:not(.dark) .execution-line-breakpoint {
          background: rgba(220, 38, 38, 0.14) !important;
          border-left: 3px solid #dc2626 !important;
          box-shadow: inset 0 0 0 1px rgba(220, 38, 38, 0.12) !important;
        }
        :root:not(.dark) .breakpoint-line {
          background: rgba(220, 38, 38, 0.06) !important;
        }
        .breakpoint-glyph {
          background: #ef4444;
          border-radius: 50%;
          width: 10px !important;
          height: 10px !important;
          margin-left: 5px;
          margin-top: 5px;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
        }
        .breakpoint-glyph:hover {
          background: #f87171;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);
        }
        .monaco-editor .margin-view-overlays .line-numbers {
          padding-right: 16px !important;
        }
        /* Gutter hover effect */
        .monaco-editor .margin-view-overlays .glyph-margin:hover {
          background: rgba(239, 68, 68, 0.1);
          cursor: pointer;
        }
      `}</style>
      <div className="flex items-center gap-2 px-4 py-3 bg-[hsl(var(--app-panel-deep))]">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
        </div>
        {breakpoints.length > 0 && (
          <div className="ml-auto text-xs text-zinc-500">
            {breakpoints.length} breakpoint{breakpoints.length > 1 ? 's' : ''}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language="javascript"
          theme={resolvedTheme === 'light' ? 'vs' : 'vs-dark'}
          value={code}
          onChange={(value) => setCode(value || "")}
          onMount={handleEditorMount}
          options={{
            fontSize: 15,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineNumbers: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: "none",
            lineDecorationsWidth: 16,
            lineNumbersMinChars: 4,
            glyphMargin: true,
            folding: false,
            readOnly: executionState !== "idle",
            scrollbar: {
              vertical: "hidden",
              horizontal: "hidden",
            },
          }}
          data-testid="editor-monaco"
        />
      </div>
    </div>
  );
}
