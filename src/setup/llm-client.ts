export type LlmRole = "system" | "user";

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmClient {
  complete(messages: LlmMessage[]): Promise<string>;
}

export interface MockLlmClientOptions {
  responder?: (messages: LlmMessage[]) => string;
}

export class MockLlmClient implements LlmClient {
  private readonly responder: (messages: LlmMessage[]) => string;

  constructor(options: MockLlmClientOptions = {}) {
    this.responder =
      options.responder ??
      ((messages) => {
        const text = messages.map((m) => m.content).join("\n");
        if (text.includes("catalogue diff") || text.includes("pre-built block catalogue")) {
          return JSON.stringify({
            usedBlocks: ["prose", "heading", "chart", "callout"],
            unusedBlocks: [
              "bullet-list",
              "numbered-list",
              "table",
              "kpi-cards",
              "timeline",
              "roadmap",
              "risk-matrix",
              "team",
              "image",
              "diagram",
              "divider",
            ],
            newBlockProposals: [
              {
                proposedId: "stat-badge",
                name: "Stat Badge",
                description: "Compact KPI highlight from slide titles",
                observedIn: ["sample.pptx:slide-1"],
                proposedSchema: { fields: { label: "string", value: "string" } },
                rationale: "Repeated title+metric pairs not covered by kpi-cards layout",
              },
            ],
          });
        }
        if (text.includes("four files") || text.includes("Scaffold templates")) {
          return JSON.stringify({
            files: [
              { path: "schema.ts", content: "__MOCK_SCHEMA__" },
              { path: "StatBadge.tsx", content: "__MOCK_RENDERER__" },
              { path: "StatBadgeNode.tsx", content: "__MOCK_NODE__" },
              { path: "stat-badge.test.ts", content: "__MOCK_TEST__" },
            ],
          });
        }
        return "__MOCK_BRAND_YAML__";
      });
  }

  complete(messages: LlmMessage[]): Promise<string> {
    return Promise.resolve(this.responder(messages));
  }
}
