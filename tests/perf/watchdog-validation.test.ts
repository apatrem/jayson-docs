import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type FC } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { BrandProvider } from "../../src/brand-tokens/BrandProvider";
import {
  DEFAULT_RENDER_BUDGET_MS,
  WATCHDOG_UNMOUNT_GRACE_MS,
  withRenderWatchdog,
} from "../../src/block-primitives/RenderWatchdog";

const brandTokens = parse(
  readFileSync(join(process.cwd(), "brand.example.yaml"), "utf8"),
) as Parameters<typeof BrandProvider>[0]["tokens"];

const SlowGeneratedBlock: FC = () => {
  const deadline = performance.now() + DEFAULT_RENDER_BUDGET_MS + 35;
  const allocation: number[] = [];
  while (performance.now() < deadline) {
    allocation.push(allocation.length);
  }
  return createElement("div", { "data-generated-block": "slow" }, allocation.length);
};

const WatchdoggedSlowBlock = withRenderWatchdog(SlowGeneratedBlock, {
  budgetMs: DEFAULT_RENDER_BUDGET_MS,
});

const EditorFixture: FC = () =>
  createElement(
    BrandProvider,
    { tokens: brandTokens },
    createElement(
      "section",
      { "aria-label": "editor fixture" },
      createElement("label", {}, "Separate prose block", createElement("input", {
        "aria-label": "Separate prose block",
        defaultValue: "editable",
      })),
      createElement(WatchdoggedSlowBlock),
      createElement("p", {}, "Other editor content remains mounted."),
    ),
  );

describe("watchdog adversarial validation", () => {
  afterEach(() => {
    cleanup();
  });

  it("unmounts a slow generated block and keeps the rest of the editor responsive", async () => {
    render(createElement(EditorFixture));
    const afterInitialRender = performance.now();

    const placeholder = await screen.findByRole("alert");
    const unmountElapsed = performance.now() - afterInitialRender;
    expect(placeholder.getAttribute("data-render-failed")).toBe(
      "render-budget-exceeded",
    );
    expect(unmountElapsed).toBeLessThan(WATCHDOG_UNMOUNT_GRACE_MS);
    expect(screen.getByText("Other editor content remains mounted.")).toBeTruthy();

    const input = screen.getByLabelText("Separate prose block");
    const typingStart = performance.now();
    fireEvent.change(input, { target: { value: "still responsive" } });
    const typingElapsed = performance.now() - typingStart;
    expect(typingElapsed).toBeLessThan(16);
  });
});
