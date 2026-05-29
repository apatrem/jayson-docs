import { useState, type CSSProperties, type DragEvent, type FC } from "react";

/**
 * Floating, foldable section navigator (ADR-0018, item 1). Lists the document's
 * sections by nav title (PowerPoint-style — titles aren't rendered in the
 * document itself). Supports click-to-jump, drag-to-reorder, inline rename, and
 * create/delete. It owns whole-section reordering; block reordering is the
 * editor's gutter handle. Purely presentational — all mutations go through the
 * callbacks so DocumentView keeps the single source of truth.
 */
export interface SectionSummary {
  id: string;
  title?: string | undefined;
}

export interface SectionSidebarProps {
  sections: SectionSummary[];
  activeSectionId?: string;
  onJump: (sectionId: string) => void;
  onRename: (sectionId: string, title: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onCreate: (afterIndex: number) => void;
  onDelete: (sectionId: string) => void;
}

const UNTITLED = "Untitled section";

export const SectionSidebar: FC<SectionSidebarProps> = ({
  sections,
  activeSectionId,
  onJump,
  onRename,
  onReorder,
  onCreate,
  onDelete,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const startEdit = (section: SectionSummary): void => {
    setEditingId(section.id);
    setDraft(section.title ?? "");
  };
  const commitEdit = (): void => {
    if (editingId !== null) {
      onRename(editingId, draft);
    }
    setEditingId(null);
  };

  const onDrop = (event: DragEvent, targetIndex: number): void => {
    event.preventDefault();
    if (dragIndex !== null && dragIndex !== targetIndex) {
      onReorder(dragIndex, targetIndex);
    }
    setDragIndex(null);
  };

  return (
    <nav aria-label="Sections" style={styles.sidebar}>
      <div style={styles.header}>
        <button
          type="button"
          aria-label={collapsed ? "Expand sections" : "Collapse sections"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((prev) => !prev)}
          style={styles.collapseButton}
        >
          {collapsed ? "▸" : "▾"} Sections
        </button>
        {!collapsed ? (
          <button
            type="button"
            aria-label="Add section"
            title="Add section"
            onClick={() => onCreate(sections.length - 1)}
            style={styles.iconButton}
          >
            ＋
          </button>
        ) : null}
      </div>

      {collapsed ? null : (
        <ol style={styles.list}>
          {sections.map((section, index) => {
            const isActive = section.id === activeSectionId;
            const isEditing = section.id === editingId;
            return (
              <li
                key={section.id}
                draggable={!isEditing}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, index)}
                onDragEnd={() => setDragIndex(null)}
                style={{
                  ...styles.item,
                  ...(isActive ? styles.itemActive : {}),
                  ...(dragIndex === index ? styles.itemDragging : {}),
                }}
              >
                <span aria-hidden="true" style={styles.grip}>
                  ⠿
                </span>
                {isEditing ? (
                  <input
                    aria-label="Section title"
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitEdit();
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        setEditingId(null);
                      }
                    }}
                    style={styles.input}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onJump(section.id)}
                    onDoubleClick={() => startEdit(section)}
                    style={{
                      ...styles.titleButton,
                      ...(section.title ? {} : styles.untitled),
                    }}
                    title="Click to jump · double-click to rename"
                  >
                    {section.title ?? UNTITLED}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Rename section ${section.title ?? UNTITLED}`}
                  onClick={() => startEdit(section)}
                  style={styles.iconButton}
                >
                  ✎
                </button>
                <button
                  type="button"
                  aria-label={`Delete section ${section.title ?? UNTITLED}`}
                  onClick={() => onDelete(section.id)}
                  disabled={sections.length <= 1}
                  style={styles.iconButton}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </nav>
  );
};

const styles: Record<string, CSSProperties> = {
  sidebar: {
    width: 220,
    flex: "0 0 220px",
    borderRight: "1px solid rgba(148, 163, 184, 0.3)",
    padding: "12px 8px",
    overflowY: "auto",
    background: "rgba(248, 250, 252, 0.6)",
  },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 },
  collapseButton: {
    border: "none",
    background: "transparent",
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#475569",
    cursor: "pointer",
    padding: "4px 2px",
  },
  list: { listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 2 },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 4px",
    borderRadius: 5,
  },
  itemActive: { background: "rgba(37, 99, 235, 0.12)" },
  itemDragging: { opacity: 0.5 },
  grip: { color: "rgba(100, 116, 139, 0.6)", cursor: "grab", fontSize: 12 },
  titleButton: {
    flex: 1,
    minWidth: 0,
    textAlign: "left",
    border: "none",
    background: "transparent",
    fontSize: 13,
    color: "#1e293b",
    cursor: "pointer",
    padding: "4px 2px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  untitled: { color: "#94a3b8", fontStyle: "italic" },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    padding: "3px 6px",
    border: "1px solid rgba(148, 163, 184, 0.6)",
    borderRadius: 4,
  },
  iconButton: {
    border: "none",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    fontSize: 12,
    padding: "2px 4px",
    borderRadius: 4,
  },
};
