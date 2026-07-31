import { useEffect, useRef } from "react";
import { createScope, type Scope } from "animejs";
import { scopeMediaQueries } from "@/lib/motion/tokens";

type ScopeSetup = (scope: Scope) => void | (() => void);

/**
 * Binds Anime.js createScope to a React root. Reverts on unmount (Strict Mode safe).
 */
export function useAnimeScope(setup: ScopeSetup, deps: readonly unknown[] = []) {
  const rootRef = useRef<HTMLDivElement>(null);
  const setupRef = useRef(setup);
  setupRef.current = setup;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scope = createScope({
      root,
      mediaQueries: scopeMediaQueries,
    });

    scope.add((s) => {
      const teardown = setupRef.current(s);
      return typeof teardown === "function" ? teardown : undefined;
    });

    return () => {
      scope.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional scope lifecycle
  }, deps);

  return rootRef;
}
