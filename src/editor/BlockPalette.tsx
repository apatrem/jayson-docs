import type { CSSProperties, FC } from "react";

export interface BlockPaletteItem {
  id: string;
  name: string;
  when: string;
  command: string;
  generated?: boolean;
  /**
   * For Authored blocks: the sub-folder within `generated-blocks/` the file
   * lives in.  `"active"` blocks appear in the palette; `"archived"` blocks
   * are hidden from the palette but still render in existing documents.
   * Absent for Standard and Brand blocks.
   */
  folder?: "active" | "archived";
}

export interface BlockPaletteProps {
  editor: {
    commands: Record<string, ((attrs?: unknown) => boolean) | undefined>;
  } | null;
  generatedBlocks?: BlockPaletteItem[];
  onInsert?: (blockId: string) => void;
  /**
   * Called when the consultant clicks "Create new Authored block".
   * The parent is responsible for opening the authoring UI (T-172) and passing
   * the current document context to the generation pipeline.
   * If omitted the button is rendered but disabled.
   */
  onCreateAuthoredBlock?: () => void;
}

export const DEFAULT_BLOCK_PALETTE_ITEMS: BlockPaletteItem[] = [
  {
    id: "prose",
    name: "Prose",
    when: "Any continuous narrative text. The default block for body content.",
    command: "insertProse",
  },
  {
    id: "heading",
    name: "Heading",
    when: "Start of a new section or subsection. Use level 1 for top sections, 2 for subsections.",
    command: "insertHeading",
  },
  {
    id: "bullet-list",
    name: "Bulleted list",
    when: "Enumerating 3-7 related points. Ideal for objectives, deliverables, key takeaways.",
    command: "insertBulletList",
  },
  {
    id: "numbered-list",
    name: "Numbered list",
    when: "Sequence matters (steps, ranking, methodology phases). Use when order is meaningful.",
    command: "insertNumberedList",
  },
  {
    id: "chart",
    name: "Chart",
    when: "Quantitative comparison or trend. Always include a takeaway string.",
    command: "insertChart",
  },
  {
    id: "table",
    name: "Table",
    when: "Structured comparison with aligned rows/columns. Use for matrices, option comparisons, or feature lists.",
    command: "insertDocTable",
  },
  {
    id: "callout",
    name: "Callout",
    when: "Key insight, risk, decision, quote, or recommendation that should stand apart from body text.",
    command: "insertCallout",
  },
  {
    id: "kpi-cards",
    name: "KPI cards",
    when: "Small set of metrics where each number needs a label and optional trend.",
    command: "insertKpiCards",
  },
  {
    id: "timeline",
    name: "Timeline",
    when: "Chronological sequence of events or milestones.",
    command: "insertTimeline",
  },
  {
    id: "roadmap",
    name: "Roadmap",
    when: "Plan over time with lanes or phases.",
    command: "insertRoadmap",
  },
  {
    id: "risk-matrix",
    name: "Risk matrix",
    when: "Risks need likelihood/impact positioning and mitigation text.",
    command: "insertRiskMatrix",
  },
  {
    id: "team",
    name: "Team",
    when: "Project team, governance, or role roster with short bios.",
    command: "insertTeam",
  },
  {
    id: "image",
    name: "Image",
    when: "A figure, screenshot, or brand asset needs caption and alt text.",
    command: "insertImage",
  },
  {
    id: "diagram",
    name: "Diagram",
    when: "Process, system, or relationship diagram best expressed as Mermaid source.",
    command: "insertDiagram",
  },
  {
    id: "divider",
    name: "Divider",
    when: "Visual separation between sections or slide zones.",
    command: "insertDivider",
  },
];

export const BlockPalette: FC<BlockPaletteProps> = ({
  editor,
  generatedBlocks = [],
  onInsert,
  onCreateAuthoredBlock,
}) => {
  // Filter out archived Authored blocks — they must not appear in the palette.
  // loadBrandBlockPaletteItems already excludes them at the loader level;
  // this is a defense-in-depth guard in case the caller passes a mixed list.
  const items = [
    ...DEFAULT_BLOCK_PALETTE_ITEMS,
    ...generatedBlocks.filter(
      (block) => block.generated && block.folder !== "archived",
    ),
  ];

  return (
    <aside style={styles.panel} aria-label="Block palette">
      <header>
        <h2 style={styles.title}>Add block</h2>
        <p style={styles.description}>
          Choose a block from the closed library, plus any active approved
          generated blocks.
        </p>
      </header>
      <div style={styles.grid}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            style={styles.card}
            disabled={editor === null || editor.commands[item.command] === undefined}
            onClick={() => {
              const inserted = editor?.commands[item.command]?.();
              if (inserted === true) {
                onInsert?.(item.id);
              }
            }}
          >
            <span style={styles.name}>
              {item.name}
              {item.generated === true ? " (generated)" : ""}
            </span>
            <span style={styles.when}>{item.when}</span>
          </button>
        ))}
      </div>
      <div style={styles.createSection}>
        <button
          type="button"
          style={styles.createButton}
          disabled={onCreateAuthoredBlock === undefined}
          onClick={() => {
            onCreateAuthoredBlock?.();
          }}
          aria-label="Create new Authored block"
        >
          <span style={styles.createIcon}>✦</span>
          Create new Authored block
        </button>
      </div>
    </aside>
  );
};

const styles: Record<string, CSSProperties> = {
  panel: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.5rem",
    display: "grid",
    gap: "1rem",
    padding: "1rem",
  },
  title: {
    fontSize: "1rem",
    margin: 0,
  },
  description: {
    color: "GrayText",
    margin: "0.25rem 0 0",
  },
  grid: {
    display: "grid",
    gap: "0.5rem",
  },
  card: {
    border: "1px solid ButtonBorder",
    borderRadius: "0.375rem",
    cursor: "pointer",
    display: "grid",
    gap: "0.25rem",
    padding: "0.75rem",
    textAlign: "left",
  },
  name: {
    fontWeight: 700,
  },
  when: {
    color: "GrayText",
    fontSize: "0.875rem",
  },
  createSection: {
    borderTop: "1px solid ButtonBorder",
    paddingTop: "0.75rem",
  },
  createButton: {
    alignItems: "center",
    border: "1px dashed ButtonBorder",
    borderRadius: "0.375rem",
    cursor: "pointer",
    display: "flex",
    fontSize: "0.875rem",
    gap: "0.5rem",
    padding: "0.625rem 0.75rem",
    width: "100%",
  },
  createIcon: {
    fontSize: "1rem",
  },
};

export default BlockPalette;
