#!/usr/bin/env node
/**
 * Turns the office flythrough into the frame sequences used by the homepage hero.
 *
 *   node scripts/build-hero-frames.mjs [source.mp4]
 *
 * Needs ffmpeg with libvidstab and libwebp on PATH. When the output changes, bump
 * OUT_VERSION here and copy the printed frame counts into src/lib/heroFrames.ts:
 * /videos/* is cached as immutable, so a new folder is what invalidates it.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const OUT_VERSION = "v1";
const SOURCE = resolve(process.argv[2] ?? "media-src/kipper-oficina.mp4");
const OUT = resolve(`public/videos/oficina-${OUT_VERSION}`);
const QUALITY = 74;

// Non-uniform sampling acts as a speed ramp: slow where there is something to
// see, fast through blank walls and the road. Times are source seconds.
const SEGMENTS = [
  { from: 1.5, to: 6, fps: 6 }, // storefront to door (before 1.5s the Federación Patronal sign fills the frame)
  { from: 6, to: 44, fps: 5 }, // reception, meeting room, offices
  { from: 44, to: 54, fps: 3 }, // back offices
  { from: 54, to: 62, fps: 4 }, // walking out
  { from: 62, to: 72, fps: 2 }, // road
  { from: 72, to: 80.6, fps: 6 }, // landing on the sign (later than this it no longer fits the frame)
];

function ffmpeg(args, cwd) {
  execFileSync("ffmpeg", ["-hide_banner", "-v", "error", "-y", ...args], { cwd, stdio: "inherit" });
}

function extract({ input, dir, rate, vf }) {
  mkdirSync(dir, { recursive: true });
  for (const seg of SEGMENTS) {
    const start = readdirSync(dir).length;
    ffmpeg([
      "-i", input,
      "-vf", `trim=start=${seg.from}:end=${seg.to},setpts=PTS-STARTPTS,fps=${seg.fps * rate},${vf(seg)}`,
      "-c:v", "libwebp",
      "-q:v", String(QUALITY),
      "-compression_level", "6",
      "-start_number", String(start),
      join(dir, "%04d.webp"),
    ]);
  }
  const files = readdirSync(dir);
  const bytes = files.reduce((sum, f) => sum + statSync(join(dir, f)).size, 0);
  console.log(`${dir}: ${files.length} frames, ${(bytes / 1048576).toFixed(1)} MB`);
}

const tmp = mkdtempSync(join(tmpdir(), "hero-frames-"));

try {
  // vidstab writes its transforms next to cwd; a relative name avoids the
  // Windows drive colon breaking ffmpeg's filter syntax.
  console.log("Stabilising…");
  ffmpeg(["-i", SOURCE, "-an", "-vf", "vidstabdetect=shakiness=6:accuracy=15:result=t.trf", "-f", "null", "-"], tmp);
  ffmpeg([
    "-i", SOURCE,
    "-an",
    "-vf", "vidstabtransform=input=t.trf:smoothing=24:optzoom=1:interpol=bicubic,unsharp=5:5:0.45:5:5:0",
    "-c:v", "libx264",
    "-crf", "12",
    "-preset", "veryfast",
    "stable.mp4",
  ], tmp);
  const stable = join(tmp, "stable.mp4");

  rmSync(OUT, { recursive: true, force: true });

  console.log("Extracting wide frames…");
  extract({ input: stable, dir: join(OUT, "wide"), rate: 1, vf: () => "format=yuv420p" });

  // Portrait phones only ever see the middle of the frame, so crop instead of
  // shrinking: same sharpness, a fraction of the bytes. Half the frames too.
  // The sign sits left of center, so the last segment pans the crop onto the logo.
  console.log("Extracting tall frames…");
  extract({
    input: stable,
    dir: join(OUT, "tall"),
    rate: 0.5,
    vf: (seg) => {
      const x = seg === SEGMENTS.at(-1) ? `370*(1-pow(t/${(seg.to - seg.from).toFixed(2)},2))` : "370";
      return `crop=540:720:'${x}':0,format=yuv420p`;
    },
  });

  ffmpeg(["-i", join(OUT, "wide", "0000.webp"), "-q:v", "3", resolve("public/videos/kipper-oficina-poster.jpg")]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
