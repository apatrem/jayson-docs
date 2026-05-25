import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { CSSProperties, FC } from "react";

export interface EditorProps {
  initialContent?: JSONContent | string;
  editable?: boolean;
  onUpdate?: (content: JSONContent) => void;
}

const DEFAULT_CONTENT: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Start writing..." }],
    },
  ],
};

export const Editor: FC<EditorProps> = ({
  initialContent = DEFAULT_CONTENT,
  editable = true,
  onUpdate,
}) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        "aria-label": "Document editor",
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      onUpdate?.(updatedEditor.getJSON());
    },
  });

  return (
    <section style={styles.shell} aria-label="WYSIWYG editor">
      <div style={styles.toolbar} aria-label="Formatting toolbar">
        <ToolbarButton
          label="Bold"
          active={editor?.isActive("bold") ?? false}
          disabled={editor === null || !editable}
          onClick={() => {
            editor?.chain().focus().toggleBold().run();
          }}
        />
        <ToolbarButton
          label="Italic"
          active={editor?.isActive("italic") ?? false}
          disabled={editor === null || !editable}
          onClick={() => {
            editor?.chain().focus().toggleItalic().run();
          }}
        />
      </div>
      <EditorContent editor={editor} style={styles.surface} />
    </section>
  );
};

const ToolbarButton: FC<{
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}> = ({ label, active, disabled, onClick }) => (
  <button
    type="button"
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    style={{
      ...styles.toolbarButton,
      fontWeight: active ? 700 : 400,
    }}
  >
    {label}
  </button>
);

const styles: Record<string, CSSProperties> = {
  shell: {
    display: "grid",
    gap: "0.75rem",
  },
  toolbar: {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
  },
  toolbarButton: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.375rem",
    cursor: "pointer",
    padding: "0.375rem 0.625rem",
  },
  surface: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    minHeight: "16rem",
    padding: "1rem",
  },
};

export default Editor;
