import { describe, expect, it, vi } from 'vitest';
import type * as nodeFs from 'node:fs';
import type { Automizer, ISlide } from 'pptx-automizer';
import type { RealLayout } from '../src/schema/layouts/real-layouts.js';
import { MasterError } from '../src/pipeline/errors.js';
import { fillRealLayout } from '../src/pipeline/fill-real-layout.js';

// src/setup/layout-spec.json is a read-only contract that never carries an
// unknown regionKind, so the spec loader is stubbed here instead of editing it.
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof nodeFs>();
  const stubSpec = {
    templateId: 'report.master.pptx',
    layouts: [
      {
        layoutId: 'section',
        tier: 'common',
        sourceSlideIndex: 2,
        slots: [
          {
            slotName: 'slot.section-title',
            regionKind: 'mystery',
            match: { currentShapeName: 'x' },
          },
        ],
      },
    ],
  };
  return {
    ...actual,
    readFileSync: (...args: Parameters<typeof actual.readFileSync>) =>
      String(args[0]).endsWith('layout-spec.json')
        ? JSON.stringify(stubSpec)
        : actual.readFileSync(...args),
  };
});

// Minimal Automizer: addSlide runs its modify callback synchronously, like the real one.
const stubAutomizer = {
  addSlide: (_name: string, _index: number, callback?: (slide: ISlide) => void) =>
    callback?.({} as ISlide),
} as unknown as Automizer;

describe('fillRealLayout — unknown regionKind in the layout spec (stubbed loader)', () => {
  it('throws MasterError naming the layout, slot, and unexpected kind', () => {
    const slide = { layoutId: 'section', 'section-title': 'Section One' } as unknown as RealLayout;
    expect(() => fillRealLayout(stubAutomizer, slide)).toThrow(MasterError);
    expect(() => fillRealLayout(stubAutomizer, slide)).toThrow(
      /slot "slot\.section-title" on layout "section" has unknown regionKind "mystery"/,
    );
  });
});
