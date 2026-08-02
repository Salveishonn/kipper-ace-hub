import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { animate } from "animejs";
import { BotmakerWebchat } from "@/components/assistant/BotmakerWebchat";
import {
  getBotmakerWebchatConfig,
  shouldMountPublicAssistant,
} from "@/lib/botmakerWebchat";
import { siteConfig } from "@/lib/siteConfig";
import { motion } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

const LABEL_KEY = "kipper_assistant_label_seen";

/**
 * Public floating assistant: Botmaker Webchat when configured, otherwise
 * a WhatsApp launcher. Mounted once from MainLayout.
 */
export function KipperAssistant() {
  const { pathname } = useLocation();
  const config = getBotmakerWebchatConfig();
  const [mode, setMode] = useState<"pending" | "botmaker" | "whatsapp">(
    config.enabled ? "pending" : "whatsapp",
  );
  const [labelOpen, setLabelOpen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  const allowed = shouldMountPublicAssistant(pathname);

  const handleBotmakerReady = useCallback(() => setMode("botmaker"), []);
  const handleBotmakerFail = useCallback(() => setMode("whatsapp"), []);

  useEffect(() => {
    if (!allowed || mode !== "whatsapp") return;
    try {
      if (sessionStorage.getItem(LABEL_KEY) === "1") {
        setLabelOpen(false);
      }
    } catch {
      /* ignore */
    }
  }, [allowed, mode]);

  useEffect(() => {
    if (!allowed || mode !== "whatsapp") return;
    const root = rootRef.current;
    if (!root) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      root.style.opacity = "1";
      root.style.transform = "none";
      return;
    }

    const anim = animate(root, {
      opacity: [0, 1],
      translateY: [16, 0],
      scale: [0.92, 1],
      duration: motion.duration.standard,
      ease: motion.easing.out,
    });

    return () => {
      anim.revert?.();
    };
  }, [allowed, mode]);

  useEffect(() => {
    const label = labelRef.current;
    if (!label || mode !== "whatsapp") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      label.style.opacity = labelOpen ? "1" : "0";
      label.style.maxWidth = labelOpen ? "220px" : "0px";
      return;
    }
    animate(label, {
      opacity: labelOpen ? [0, 1] : [1, 0],
      maxWidth: labelOpen ? [0, 220] : [220, 0],
      duration: motion.duration.nav,
      ease: motion.easing.out,
    });
  }, [labelOpen, mode]);

  if (!allowed) return null;

  // Load official snippet; Botmaker paints its own launcher — no second bubble.
  if (mode === "pending") {
    return <BotmakerWebchat onReady={handleBotmakerReady} onFail={handleBotmakerFail} />;
  }

  if (mode === "botmaker") {
    return null;
  }

  const href = `${siteConfig.whatsappUrl}?text=${encodeURIComponent(
    "Hola Kipper, necesito ayuda",
  )}`;

  const collapseLabel = () => {
    setLabelOpen(false);
    try {
      sessionStorage.setItem(LABEL_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "fixed z-[60] flex items-center gap-2",
        "right-4 bottom-4 md:right-6 md:bottom-6",
        "pb-[max(0px,env(safe-area-inset-bottom))]",
      )}
      style={{ opacity: 0 }}
      data-kipper-assistant="whatsapp-fallback"
    >
      <span
        ref={labelRef}
        className={cn(
          "overflow-hidden whitespace-nowrap rounded-full bg-card text-foreground",
          "border border-border/70 px-3 py-1.5 text-sm font-medium shadow-soft",
          !labelOpen && "pointer-events-none px-0",
        )}
        style={{ maxWidth: labelOpen ? 220 : 0, opacity: labelOpen ? 1 : 0 }}
        aria-hidden={!labelOpen}
      >
        ¿Necesitás ayuda?
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={collapseLabel}
        onFocus={collapseLabel}
        className={cn(
          "inline-flex h-12 w-12 min-h-[44px] min-w-[44px] items-center justify-center",
          "rounded-full bg-[#25D366] text-white shadow-elevated",
          "transition-[transform,box-shadow] duration-200",
          "hover:shadow-card hover:brightness-105 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]",
        )}
        aria-label="Abrir WhatsApp para hablar con Kipper"
      >
        <MessageCircle size={22} aria-hidden />
      </a>
    </div>
  );
}

export default KipperAssistant;
