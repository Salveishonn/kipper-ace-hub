import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { animate } from "animejs";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { cn } from "@/lib/utils";
import { motion } from "@/lib/motion/tokens";

interface MainLayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
  overlayNav?: boolean;
}

function isDashboardPath(path: string) {
  return path.startsWith("/admin") || path.startsWith("/productor") || path.startsWith("/portal");
}

export function MainLayout({ children, showFooter = true, overlayNav = false }: MainLayoutProps) {
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
      <Navbar overlay={overlayNav} />
      <main ref={mainRef} className={cn("flex-1", overlayNav ? "pt-0" : "pt-20")}>
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}
