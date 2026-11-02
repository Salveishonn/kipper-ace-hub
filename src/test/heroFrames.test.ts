import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { frameLoadOrder, HERO_FRAMES, momentOpacity, nearestIndex, pickFrameSet } from "@/lib/heroFrames";

describe("hero frame sequence", () => {
  it("declares the frame counts that are actually on disk", () => {
    for (const set of Object.values(HERO_FRAMES)) {
      expect(readdirSync(resolve(process.cwd(), "public", set.dir.slice(1)))).toHaveLength(set.count);
    }
  });

  it("loads every frame exactly once, coarse to fine", () => {
    const order = frameLoadOrder(366);
    expect(new Set(order).size).toBe(366);
    expect(order).toHaveLength(366);
    expect(order.slice(0, 4)).toEqual([0, 365, 16, 32]);
  });

  it("finds the closest ready frame in either direction", () => {
    const ready = new Set([10, 20]);
    const has = (i: number) => ready.has(i);
    expect(nearestIndex(10, 30, has)).toBe(10);
    expect(nearestIndex(13, 30, has)).toBe(10);
    expect(nearestIndex(18, 30, has)).toBe(20);
    expect(nearestIndex(29, 30, has)).toBe(20);
    expect(nearestIndex(5, 30, () => false)).toBe(-1);
  });

  it("serves the cropped set only to portrait phones", () => {
    expect(pickFrameSet(390, 844)).toBe(HERO_FRAMES.tall);
    expect(pickFrameSet(844, 390)).toBe(HERO_FRAMES.wide);
    expect(pickFrameSet(820, 1180)).toBe(HERO_FRAMES.wide);
    expect(pickFrameSet(1440, 900)).toBe(HERO_FRAMES.wide);
  });

  it("fades moments in and out across their ranges", () => {
    const hero = { fadeOut: [0.06, 0.11] } as const;
    expect(momentOpacity(0, hero)).toBe(1);
    expect(momentOpacity(0.2, hero)).toBe(0);

    const last = { fadeIn: [0.9, 0.95] } as const;
    expect(momentOpacity(0.5, last)).toBe(0);
    expect(momentOpacity(1, last)).toBe(1);

    const middle = { fadeIn: [0.2, 0.3], fadeOut: [0.5, 0.6] } as const;
    expect(momentOpacity(0.25, middle)).toBeCloseTo(0.5);
    expect(momentOpacity(0.4, middle)).toBe(1);
    expect(momentOpacity(0.55, middle)).toBeCloseTo(0.5);
    expect(momentOpacity(0.7, middle)).toBe(0);
  });
});
