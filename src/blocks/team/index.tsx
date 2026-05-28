/**
 * src/blocks/team/index.tsx — full runtime manifest for the Team block.
 *
 * T-153: migrates content from src/editor/nodes/TeamNode.tsx and
 * src/renderer/blocks/Team.tsx into this single file.
 *
 * Named exports: TeamTipTapNode, teamBlockToProseMirror,
 *   proseMirrorToTeamBlock, Team, TeamProps
 *
 * Default export: BlockRegistryRecord consumed by src/blocks/runtime-registry.ts.
 *
 * Note: The Team renderer takes an assetContext prop for member photos.
 * DocumentRenderer supplies it directly via case "team". T-157b handles
 * this properly via renderWithContext().
 */

// ── Schema ───────────────────────────────────────────────────────────────────
import type { TeamBlock, TeamLayout, TeamMember } from "./schema";
import { TeamBlockSchema } from "./schema";

// ── TipTap / editor dependencies ─────────────────────────────────────────────
import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import type { ZodType } from "zod";
import type { ComponentType, CSSProperties, FC, ReactNode } from "react";

// ── Brand-token / renderer dependencies ──────────────────────────────────────
import {
  resolveAssetPath,
  type AssetContext,
} from "../../brand-tokens/resolve-asset";
import { useBrandTokens } from "../../brand-tokens/useBrandTokens";
import { resolveBrandToken } from "../../brand-tokens/resolve";

// ── Registry factory ─────────────────────────────────────────────────────────
import { defineBlock } from "../defineBlock";
import type { ProseMirrorNode } from "../../editor/mapping";

// ─────────────────────────────────────────────────────────────────────────────
// TipTap node
// ─────────────────────────────────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentTeam: {
      insertTeam: (attrs?: {
        layout?: TeamLayout;
        members?: TeamMember[];
      }) => ReturnType;
    };
  }
}

function defaultMembers(): TeamMember[] {
  return [
    {
      name: "Jane Smith",
      role: "Engagement lead",
      allocation: "50%",
    },
  ];
}

export const TeamTipTapNode = Node.create({
  name: "docTeam",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      blockId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-block-id"),
        renderHTML: (attrs: { blockId: string | null }) => ({
          "data-block-id": attrs.blockId,
        }),
      },
      layout: {
        default: "grid",
        parseHTML: (el) =>
          (el.getAttribute("data-layout") as TeamLayout) ?? "grid",
        renderHTML: (attrs: { layout: TeamLayout }) => ({
          "data-layout": attrs.layout,
        }),
      },
      members: {
        default: defaultMembers(),
        parseHTML: (el) => {
          const raw = el.getAttribute("data-members");
          if (!raw) return defaultMembers();
          return JSON.parse(raw) as TeamMember[];
        },
        renderHTML: (attrs: { members: TeamMember[] }) => ({
          "data-members": JSON.stringify(attrs.members),
        }),
      },
      note: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-note") ?? "",
        renderHTML: (attrs: { note: string }) => ({ "data-note": attrs.note }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-block-type="team"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-block-type": "team" }),
    ];
  },

  addCommands() {
    return {
      insertTeam:
        (
          attrs: {
            layout?: TeamLayout;
            members?: TeamMember[];
          } = {},
        ) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: {
              blockId: crypto.randomUUID(),
              layout: attrs.layout ?? "grid",
              members: attrs.members ?? defaultMembers(),
              note: "",
            },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TeamNodeView);
  },
});

const TeamNodeView: FC<NodeViewProps> = ({ node, selected }) => {
  const brand = useBrandTokens();
  const blockId = String(node.attrs.blockId);
  const block: TeamBlock = {
    id: blockId,
    type: "team",
    layout: node.attrs.layout as TeamLayout,
    members: node.attrs.members as TeamMember[],
  };
  const assetContext: AssetContext = {
    sharedFolderPath: "/shared",
    docFolderPath: "/docs",
    brand,
  };

  return (
    <NodeViewWrapper
      className="team-node-view"
      data-block-id={blockId}
      contentEditable={false}
      style={editorBlockStyle(selected)}
    >
      <Team block={block} assetContext={assetContext} />
    </NodeViewWrapper>
  );
};

function editorBlockStyle(selected: boolean): CSSProperties {
  return {
    outline: selected ? "2px solid var(--brand-primary, #0B3D91)" : "none",
    outlineOffset: 4,
    cursor: "pointer",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ProseMirror mapping helpers
// ─────────────────────────────────────────────────────────────────────────────

type TeamPmNode = {
  attrs: {
    blockId: string;
    layout: TeamLayout;
    members: TeamMember[];
    note: string;
  };
};

export function teamBlockToProseMirror(block: TeamBlock): {
  type: string;
  attrs: TeamPmNode["attrs"];
} {
  return {
    type: "docTeam",
    attrs: {
      blockId: block.id,
      layout: block.layout,
      members: block.members,
      note: block.note ?? "",
    },
  };
}

export function proseMirrorToTeamBlock(node: TeamPmNode): TeamBlock {
  return {
    id: node.attrs.blockId,
    type: "team",
    layout: node.attrs.layout,
    members: node.attrs.members,
    note: node.attrs.note || undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Renderer
// ─────────────────────────────────────────────────────────────────────────────

export interface TeamProps {
  block: TeamBlock;
  assetContext: AssetContext;
}

function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

const MemberCard: FC<{
  member: TeamMember;
  assetContext: AssetContext;
  layout: TeamLayout;
}> = ({ member, assetContext, layout }) => {
  const brand = useBrandTokens();
  const textPrimary = resolveBrandToken(brand, "colors.semantic.textPrimary");
  const textSecondary = resolveBrandToken(brand, "colors.semantic.textSecondary");
  const surface = resolveBrandToken(brand, "colors.semantic.surfaceBackground");
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  const accent = resolveBrandToken(brand, "colors.brand.primary");

  const cardStyle: CSSProperties = {
    display: "flex",
    flexDirection: layout === "list" ? "row" : "column",
    alignItems: layout === "list" ? "center" : "stretch",
    gap: brand.spacing.unit * 2,
    padding: brand.spacing.unit * 2,
    border: `1px solid ${borderColor}`,
    borderRadius: brand.spacing.unit,
    backgroundColor: surface,
    fontFamily: brand.typography.fonts.body.family,
  };

  const photoStyle: CSSProperties = {
    width: brand.spacing.unit * 12,
    height: brand.spacing.unit * 12,
    borderRadius: layout === "hierarchical" ? brand.spacing.unit / 2 : "50%",
    objectFit: "cover",
    border: `1px solid ${borderColor}`,
    flexShrink: 0,
  };

  const avatarStyle: CSSProperties = {
    ...photoStyle,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: accent,
    color: resolveBrandToken(brand, "colors.neutral.0"),
    fontWeight: 600,
    fontSize: brand.typography.scale.bodyLg ?? brand.typography.scale.body,
  };

  const nameStyle: CSSProperties = {
    margin: 0,
    fontFamily: brand.typography.fonts.heading.family,
    fontSize: brand.typography.scale.bodyLg ?? brand.typography.scale.h4,
    fontWeight: 600,
    color: textPrimary,
  };

  const roleStyle: CSSProperties = {
    margin: 0,
    fontSize: brand.typography.scale.body,
    color: textSecondary,
  };

  const metaStyle: CSSProperties = {
    margin: 0,
    fontSize: brand.typography.scale.caption,
    color: textSecondary,
  };

  const bioStyle: CSSProperties = {
    margin: 0,
    marginTop: brand.spacing.unit,
    fontSize: brand.typography.scale.caption,
    lineHeight: brand.typography.lineHeight.normal,
    color: textPrimary,
  };

  const photoSrc = member.photo
    ? resolveAssetPath(assetContext, member.photo)
    : undefined;

  return (
    <article style={cardStyle} data-member-name={member.name}>
      {photoSrc ? (
        <img src={photoSrc} alt={member.name} style={photoStyle} />
      ) : (
        <div style={avatarStyle} aria-hidden="true">
          {memberInitials(member.name)}
        </div>
      )}
      <div>
        <h4 style={nameStyle}>{member.name}</h4>
        <p style={roleStyle}>{member.role}</p>
        {member.allocation ? <p style={metaStyle}>{member.allocation}</p> : null}
        {member.bio && layout !== "list" ? <p style={bioStyle}>{member.bio}</p> : null}
      </div>
    </article>
  );
};

const TeamGrid: FC<TeamProps> = ({ block, assetContext }) => {
  const brand = useBrandTokens();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: brand.spacing.unit * 2,
      }}
    >
      {block.members.map((member, index) => (
        <MemberCard
          key={index}
          member={member}
          assetContext={assetContext}
          layout="grid"
        />
      ))}
    </div>
  );
};

const TeamList: FC<TeamProps> = ({ block, assetContext }) => {
  const brand = useBrandTokens();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: brand.spacing.unit * 2,
      }}
    >
      {block.members.map((member, index) => (
        <MemberCard
          key={index}
          member={member}
          assetContext={assetContext}
          layout="list"
        />
      ))}
    </div>
  );
};

const TeamHierarchical: FC<TeamProps> = ({ block, assetContext }) => {
  const brand = useBrandTokens();
  const borderColor = resolveBrandToken(brand, "colors.semantic.border");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: brand.spacing.unit * 2,
        paddingLeft: brand.spacing.unit * 2,
        borderLeft: `2px solid ${borderColor}`,
      }}
    >
      {block.members.map((member, index) => (
        <div
          key={index}
          style={{
            marginLeft: index === 0 ? 0 : brand.spacing.unit * 4,
          }}
        >
          <MemberCard
            member={member}
            assetContext={assetContext}
            layout="hierarchical"
          />
        </div>
      ))}
    </div>
  );
};

export const Team: FC<TeamProps> = ({ block, assetContext }) => {
  const brand = useBrandTokens();
  const wrapperStyle: CSSProperties = {
    fontFamily: brand.typography.fonts.body.family,
    marginBottom: brand.spacing.unit * 3,
  };

  let body: ReactNode;
  switch (block.layout) {
    case "list":
      body = <TeamList block={block} assetContext={assetContext} />;
      break;
    case "hierarchical":
      body = <TeamHierarchical block={block} assetContext={assetContext} />;
      break;
    case "grid":
    default:
      body = <TeamGrid block={block} assetContext={assetContext} />;
      break;
  }

  return (
    <section
      className="doc-keep-together"
      data-block-id={block.id}
      data-block-type="team"
      data-layout={block.layout}
      style={wrapperStyle}
    >
      {body}
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry manifest (default export)
// ─────────────────────────────────────────────────────────────────────────────

const teamBlock = defineBlock<TeamBlock>({
  schemaName: "team",
  schema: TeamBlockSchema as ZodType<TeamBlock>,
  allowedAttrs: ["layout", "members", "note"] as const,
  paletteLabel: "Team",
  tiptapNode: TeamTipTapNode,
  // Team renderer requires assetContext prop not in the registry interface.
  // DocumentRenderer supplies it directly via case "team". T-157b handles this.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: Team as ComponentType<{ block: any }>,
  toPm: (block) => teamBlockToProseMirror(block) as ProseMirrorNode,
  fromPm: (node) =>
    proseMirrorToTeamBlock(node as unknown as TeamPmNode),
});

export default teamBlock;
