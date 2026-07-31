/** Shared motion design tokens — keep in sync with CSS variables in index.css */

export const motion = {
  duration: {
    fast: 180,
    hover: 220,
    standard: 560,
    reveal: 680,
    cinematic: 1000,
    nav: 320,
    route: 360,
  },
  stagger: {
    tight: 45,
    standard: 65,
    relaxed: 85,
  },
  distance: {
    reveal: 24,
    subtle: 16,
  },
  easing: {
    out: "out(3)",
    inOut: "inOut(2)",
    smooth: "out(4)",
  },
} as const;

export const MQ = {
  desktop: "(min-width: 1024px)",
  tabletDown: "(max-width: 1023px)",
  mobile: "(max-width: 767px)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
} as const;

export const scopeMediaQueries = {
  desktop: MQ.desktop,
  tabletDown: MQ.tabletDown,
  mobile: MQ.mobile,
  reducedMotion: MQ.reducedMotion,
} as const;
