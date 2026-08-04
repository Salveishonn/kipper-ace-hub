import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { animate } from "animejs";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { KipperAssistant } from "@/components/assistant/KipperAssistant";
import { motion } from "@/lib/motion/tokens";

interface MainLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
  /** @deprecated Brand bar is always fixed; prop kept for call-site compatibility. */
  overlayNav?: boolean;
}

function isDashboardPath(path: string) {
  return path.startsWith("/admin") || path.startsWith("/productor");
}

export function MainLayout({ children, showFooter = true }: MainLayoutProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el || isDashboardPath(location.pathname)) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    animate(el, {
      opacity: [0.94, 1],
      translateY: [6, 0],
      duration: motion.duration.route,
      ease: motion.easing.out,
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />
      <main ref={mainRef} className="flex-1 pt-[4.25rem] sm:pt-[4.75rem]">
        {children}
      </main>
      {showFooter && <Footer />}
      <KipperAssistant />
    </div>
  );
}
