/**
 * Frame-sequence playback for the homepage hero. Built by scripts/build-hero-frames.mjs.
 *
 * Decoded frames are about 3.7 MB each at 720p, so holding all of them would cost over
 * a gigabyte. Compressed blobs stay in memory and only frames near the playhead are
 * decoded, off the main thread, so scrubbing never blocks on a decode.
 */

export interface FrameSet {
  dir: string;
  count: number;
  width: number;
  height: number;
}

export const HERO_FRAMES = {
  wide: { dir: "/videos/oficina-v1/wide", count: 351, width: 1280, height: 720 },
  tall: { dir: "/videos/oficina-v1/tall", count: 176, width: 540, height: 720 },
} satisfies Record<string, FrameSet>;

const FETCH_CONCURRENCY = 6;
const DECODE_CONCURRENCY = 2;
const MAX_DECODED = 48;
const DECODE_AHEAD = 10;
const DECODE_BEHIND = 3;

/** Portrait phones get the cropped set; everything else the full frame. */
export function pickFrameSet(viewportWidth: number, viewportHeight: number): FrameSet {
  return viewportHeight > viewportWidth && viewportWidth < 768 ? HERO_FRAMES.tall : HERO_FRAMES.wide;
}

/**
 * Coarse-to-fine order: first and last frame, then every 16th, 8th, 4th… so the whole
 * section can be scrubbed early and sharpens into full frame rate as the rest arrives.
 */
export function frameLoadOrder(count: number): number[] {
  const order = new Set<number>([0, count - 1]);
  for (let stride = 16; stride >= 1; stride /= 2) {
    for (let i = 0; i < count; i += stride) order.add(i);
  }
  return [...order].filter((i) => i >= 0 && i < count);
}

/** Closest index to `target` for which `has` is true, or -1 when there is none. */
export function nearestIndex(target: number, count: number, has: (index: number) => boolean): number {
  for (let offset = 0; offset < count; offset++) {
    const before = target - offset;
    const after = target + offset;
    if (before >= 0 && has(before)) return before;
    if (after < count && has(after)) return after;
    if (before < 0 && after >= count) break;
  }
  return -1;
}

export class FrameSequence {
  private readonly blobs: (Blob | undefined)[];
  private readonly bitmaps = new Map<number, ImageBitmap>();
  private readonly decoding = new Set<number>();
  private readonly order: number[];
  private readonly abort = new AbortController();
  private cursor = 0;
  private inFlight = 0;
  private running = false;
  private destroyed = false;
  private playhead = 0;
  private direction = 1;

  constructor(
    private readonly set: FrameSet,
    private readonly onChange: () => void,
  ) {
    this.blobs = new Array(set.count);
    this.order = frameLoadOrder(set.count);
  }

  /** Downloads only run while the hero is on screen. */
  setRunning(running: boolean) {
    this.running = running;
    this.pumpFetch();
  }

  /** Moves the playhead and returns the closest frame that is ready to draw. */
  frameAt(index: number): { index: number; bitmap: ImageBitmap } | null {
    if (index !== this.playhead) this.direction = index > this.playhead ? 1 : -1;
    this.playhead = index;
    this.pumpDecode();
    const nearest = nearestIndex(index, this.set.count, (i) => this.bitmaps.has(i));
    const bitmap = this.bitmaps.get(nearest);
    return bitmap ? { index: nearest, bitmap } : null;
  }

  destroy() {
    this.destroyed = true;
    this.abort.abort();
    this.bitmaps.forEach((bitmap) => bitmap.close());
    this.bitmaps.clear();
  }

  private pumpFetch() {
    while (this.running && !this.destroyed && this.inFlight < FETCH_CONCURRENCY && this.cursor < this.order.length) {
      const index = this.order[this.cursor++];
      this.inFlight++;
      fetch(`${this.set.dir}/${String(index).padStart(4, "0")}.webp`, { signal: this.abort.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`frame ${index}: ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (this.destroyed) return;
          this.blobs[index] = blob;
          this.pumpDecode();
        })
        // A missing frame is not fatal: playback falls back to its neighbours.
        .catch(() => undefined)
        .finally(() => {
          this.inFlight--;
          this.pumpFetch();
        });
    }
  }

  private nextToDecode(): number {
    const offsets = [0];
    for (let i = 1; i <= DECODE_AHEAD; i++) offsets.push(i * this.direction);
    for (let i = 1; i <= DECODE_BEHIND; i++) offsets.push(-i * this.direction);

    for (const offset of offsets) {
      const wanted = this.playhead + offset;
      if (wanted < 0 || wanted >= this.set.count) continue;
      const index = nearestIndex(wanted, this.set.count, (i) => Boolean(this.blobs[i]));
      if (index !== -1 && !this.bitmaps.has(index) && !this.decoding.has(index)) return index;
    }
    return -1;
  }

  private pumpDecode() {
    while (!this.destroyed && this.decoding.size < DECODE_CONCURRENCY) {
      const index = this.nextToDecode();
      if (index === -1) return;
      const blob = this.blobs[index];
      if (!blob) return;
      this.decoding.add(index);
      createImageBitmap(blob)
        .then((bitmap) => {
          if (this.destroyed) {
            bitmap.close();
            return;
          }
          this.bitmaps.set(index, bitmap);
          this.evict();
          this.onChange();
        })
        .catch(() => {
          // Undecodable blob: drop it so it is not retried forever.
          this.blobs[index] = undefined;
        })
        .finally(() => {
          this.decoding.delete(index);
          this.pumpDecode();
        });
    }
  }

  private evict() {
    while (this.bitmaps.size > MAX_DECODED) {
      let furthest = -1;
      let distance = -1;
      for (const index of this.bitmaps.keys()) {
        const d = Math.abs(index - this.playhead);
        if (d > distance) {
          distance = d;
          furthest = index;
        }
      }
      this.bitmaps.get(furthest)?.close();
      this.bitmaps.delete(furthest);
    }
  }
}

/** Opacity of a text moment at scroll progress `p`. Omit `fadeIn` or `fadeOut` to stay visible at that end. */
export function momentOpacity(
  p: number,
  { fadeIn, fadeOut }: { fadeIn?: readonly [number, number]; fadeOut?: readonly [number, number] },
): number {
  const ramp = (from: number, to: number) => Math.min(1, Math.max(0, (p - from) / (to - from)));
  const entered = fadeIn ? ramp(fadeIn[0], fadeIn[1]) : 1;
  const left = fadeOut ? ramp(fadeOut[0], fadeOut[1]) : 0;
  return Math.min(entered, 1 - left);
}
