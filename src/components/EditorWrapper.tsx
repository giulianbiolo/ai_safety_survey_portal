import Editor from "@monaco-editor/react";

interface EditorWrapperProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  readOnly?: boolean;
}

export function EditorWrapper({
  value,
  onChange,
  language = "python",
  readOnly = false,
}: EditorWrapperProps) {
  return (
    <div className="h-full w-full rounded-md overflow-hidden border border-zinc-800 bg-zinc-900">
      <Editor
        height="100%"
        defaultLanguage={language}
        theme="vs-dark"
        value={value}
        onChange={onChange}
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
