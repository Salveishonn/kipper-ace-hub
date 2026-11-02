Office flythrough for the homepage scroll story.

  oficina-v1/wide/            — 351 WebP frames, 1280×720 (~10MB), most screens
  oficina-v1/tall/            — 176 WebP frames, 540×720 center crop (~2.3MB), portrait phones
  kipper-oficina-poster.jpg   — first frame; shown before frames load and for reduced motion / data saver

Generated from media-src/kipper-oficina.mp4 by scripts/build-hero-frames.mjs (stabilises, speed-ramps, exports).
To swap the footage: run the script with the new source, bump OUT_VERSION there, and update src/lib/heroFrames.ts.
