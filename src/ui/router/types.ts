export type Route =
  | { kind: "welcome" }
  | { kind: "folder-picker"; reason: "first-launch" | "missing" }
  | { kind: "library" }
  | {
      kind: "document";
      openDocs: Array<{ id: string; path: string }>;
      activeIndex: number;
    };

export type RouteIntent =
  | { intent: "open-document"; path: string }
  | { intent: "create-from-template"; templateId: string; newDocName: string }
  | { intent: "back-to-library" }
  | { intent: "re-pick-folder" }
  | { intent: "use-sample" }
  | { intent: "__set"; route: Route };
