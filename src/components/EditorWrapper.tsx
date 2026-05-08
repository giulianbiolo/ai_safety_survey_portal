import Editor, { OnMount } from "@monaco-editor/react";

interface EditorWrapperProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  readOnly?: boolean;
  disableCopyPaste?: boolean;
}

export function EditorWrapper({
  value,
  onChange,
  language = "python",
  readOnly = false,
  disableCopyPaste = false,
}: EditorWrapperProps) {
  const handleMount: OnMount = (editor, monaco) => {
    if (!disableCopyPaste) return;

    // Override Monaco's clipboard keyboard shortcuts (Ctrl/Cmd +C/V/X
    // and the Ins/Del variants) so they become no-ops.
    const noop = () => undefined;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, noop);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, noop);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, noop);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Insert, noop);
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Insert, noop);
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Delete, noop);

    // Belt-and-braces: also block at the DOM level so middle-click paste,
    // browser menu paste, and drag-paste are covered.
    const domNode = editor.getDomNode();
    if (domNode) {
      const block = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      };
      domNode.addEventListener("copy", block, true);
      domNode.addEventListener("cut", block, true);
      domNode.addEventListener("paste", block, true);
    }
  };

  return (
    <div className="h-full w-full rounded-md overflow-hidden border border-zinc-800 bg-zinc-900">
      <Editor
        // Force remount when the clipboard policy flips between scenarios so
        // onMount re-runs and Monaco re-binds (or restores) its shortcuts.
        key={disableCopyPaste ? "no-clipboard" : "default"}
        height="100%"
        defaultLanguage={language}
        theme="vs-dark"
        value={value}
        onChange={onChange}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 1.6,
          padding: { top: 16, bottom: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          readOnly,
          renderLineHighlight: "all",
          contextmenu: !disableCopyPaste,
          dragAndDrop: !disableCopyPaste,
        }}
        loading={
          <div className="flex items-center justify-center h-full text-zinc-500">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
