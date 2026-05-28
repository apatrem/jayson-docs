/**
 * End-to-end editor wiring for installed Authored blocks (ADR-0015 / ADR-0016):
 *   - The palette button for an active authored block ENABLES (its
 *     insertAuthored_<slug> command exists once the node is registered) and
 *     inserting it round-trips back to the DocModel (save path).
 *   - A document already referencing an installed authored block renders that
 *     block's node in the editor.
 *
 * Both require the real Editor + the AuthoredManifestsContext (schema) and
 * BrandBlocksContext (palette) providers App wires at boot.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DocumentView,
  authoredRemountSignature,
} from "../../../src/ui/views/DocumentView";
import {
  AuthoredManifestsContext,
  BrandBlocksContext,
  type InstalledAuthoredBlock,
} from "../../../src/blocks/runtime-registry";
import type { BlockPaletteItem } from "../../../src/editor/BlockPalette";
import type { DocumentModel } from "../../../src/renderer/DocumentRenderer";

vi.mock("echarts", () => ({
  init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() }),
}));

const SENDER = "alice@firm.example";
const FULL_TYPE = `${SENDER}:sector-risk`;

const installed: InstalledAuthoredBlock[] = [
  {
    manifest: {
      slug: "sector-risk",
      title: "Sector Risk",
      paletteLabel: "Sector Risk",
      content: "none",
      attrs: [{ kind: "string", fieldId: "riskLevel", label: "Risk" }],
      template: { kind: "text", value: "x" },
    },
    sender: SENDER,
    fullType: FULL_TYPE,
    folder: "active",
  },
];

const paletteItem: BlockPaletteItem = {
  id: "authored:sector-risk",
  name: "Sector Risk (Authored)",
  when: "",
  command: "insertAuthored_sector-risk",
  generated: true,
  folder: "active",
};

function baseMeta() {
  return {
    client: "Acme",
    project: "Authored editor test",
    docKind: "proposal" as const,
    tags: [],
    language: "en",
    status: "draft" as const,
    archived: false,
    confidentialityLevel: "medium" as const,
    owner: "owner@example.com",
    reviewers: [],
    createdAt: "2026-05-28T00:00:00Z",
    updatedAt: "2026-05-28T00:00:00Z",
    brandRef: "$brand:default",
  };
}

const standardDoc = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: baseMeta(),
  sections: [
    {
      id: "section-1",
      title: "Overview",
      blocks: [
        { id: "heading-1", type: "heading", level: 1, text: "Hi", numbered: false },
      ],
    },
  ],
  comments: [],
} as unknown as DocumentModel;

const docWithAuthoredBlock = {
  kind: "document",
  schemaVersion: "1.0.0",
  meta: baseMeta(),
  sections: [
    {
      id: "section-1",
      title: "Overview",
      blocks: [{ id: "ab-1", type: FULL_TYPE, note: "", riskLevel: "high" }],
    },
  ],
  comments: [],
} as unknown as DocumentModel;

function renderWithProviders(doc: DocumentModel) {
  return render(
    <BrandBlocksContext.Provider value={[paletteItem]}>
      <AuthoredManifestsContext.Provider value={installed}>
        <DocumentView path="/Users/me/Documents/proposal.yaml" initialDoc={doc} />
      </AuthoredManifestsContext.Provider>
    </BrandBlocksContext.Provider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DocumentView — installed authored blocks", () => {
  it("enables the authored palette button and inserts the block (saves back to the DocModel)", async () => {
    renderWithProviders(standardDoc);

    fireEvent.click(screen.getByRole("button", { name: "Insert block" }));
    const authoredButton = screen.getByRole("button", { name: /Sector Risk/u });

    // Button enables only once `insertAuthored_sector-risk` exists on the editor.
    await waitFor(() => {
      expect(authoredButton.hasAttribute("disabled")).toBe(false);
    });

    fireEvent.click(authoredButton);

    // Insert → onUpdate → editorContentToDocument maps the authored node back to
    // the {sender}:{slug} DocModel block without throwing → autosave engages.
    await waitFor(() => {
      expect(screen.getByLabelText("Autosave status").textContent).toBe("saving");
    });
  });

  it("renders a document that already references an installed authored block", async () => {
    renderWithProviders(docWithAuthoredBlock);

    // The editor mounts (no mapping error) and the authored node is registered.
    await waitFor(() => {
      expect(screen.getByLabelText("Document editor")).toBeTruthy();
    });
    expect(screen.queryByRole("alert")).toBeNull();
    await waitFor(() => {
      expect(
        document.querySelector('[data-block-type="sector-risk"]'),
      ).not.toBeNull();
    });
  });
});

describe("authoredRemountSignature (editor remount key)", () => {
  // Clone the base fixture, applying a manifest override, so each case differs
  // from `installed` in exactly one dimension.
  function withManifest(
    overrides: Partial<InstalledAuthoredBlock["manifest"]> = {},
    entryOverrides: Partial<InstalledAuthoredBlock> = {},
  ): InstalledAuthoredBlock {
    const base = installed[0]!;
    return {
      ...base,
      ...entryOverrides,
      manifest: { ...base.manifest, ...overrides },
    };
  }

  it("is stable for an unchanged installed set (no needless remount)", () => {
    expect(authoredRemountSignature(installed)).toBe(
      authoredRemountSignature([withManifest()]),
    );
  });

  it("differs when an installed manifest is added", () => {
    expect(authoredRemountSignature([])).not.toBe(
      authoredRemountSignature(installed),
    );
  });

  // The point-3 fix: a same-sender v2 replacing v1 keeps the slug (and thus the
  // old slug-only key), so the editor would not have rebuilt its schema. The
  // fingerprint must change when attrs change under the same slug.
  it("differs when attrs change under the SAME slug (T-170 v2 replacement)", () => {
    const v2 = withManifest({
      attrs: [
        { kind: "string", fieldId: "riskLevel", label: "Risk" },
        { kind: "string", fieldId: "owner", label: "Owner" },
      ],
    });
    expect(authoredRemountSignature([v2])).not.toBe(
      authoredRemountSignature(installed),
    );
  });

  it("differs when content mode changes under the same slug", () => {
    const richText = withManifest({ content: "rich-text" });
    expect(authoredRemountSignature([richText])).not.toBe(
      authoredRemountSignature(installed),
    );
  });

  it("differs when the sender (fullType) changes under the same slug", () => {
    const otherSender = withManifest(
      {},
      { sender: "bob@firm.example", fullType: "bob@firm.example:sector-risk" },
    );
    expect(authoredRemountSignature([otherSender])).not.toBe(
      authoredRemountSignature(installed),
    );
  });

  it("is independent of load order", () => {
    const a = withManifest({}, { sender: "a@x.example", fullType: "a@x.example:sector-risk" });
    const b = withManifest(
      { slug: "other" },
      { fullType: `${SENDER}:other` },
    );
    expect(authoredRemountSignature([a, b])).toBe(
      authoredRemountSignature([b, a]),
    );
  });
});
