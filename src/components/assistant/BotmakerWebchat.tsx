import { useEffect, useRef } from "react";
import { getBotmakerWebchatConfig, loadBotmakerWebchatScript } from "@/lib/botmakerWebchat";

type Props = {
  onReady?: () => void;
  onFail?: (reason: string) => void;
};

/**
 * Loads the official Botmaker Webchat snippet once.
 * Botmaker renders its own launcher — we do not draw a second bubble.
 */
export function BotmakerWebchat({ onReady, onFail }: Props) {
  const settled = useRef(false);

  useEffect(() => {
    const { enabled, scriptUrl } = getBotmakerWebchatConfig();
    if (!enabled || !scriptUrl) {
      if (!settled.current) {
        settled.current = true;
        onFail?.("disabled");
      }
      return;
    }

    let cancelled = false;

    loadBotmakerWebchatScript(scriptUrl)
      .then(() => {
        if (cancelled || settled.current) return;
        settled.current = true;
        onReady?.();
      })
      .catch((err: Error) => {
        if (cancelled || settled.current) return;
        settled.current = true;
        onFail?.(err.message || "load_failed");
      });

    return () => {
      cancelled = true;
    };
  }, [onReady, onFail]);

  return null;
}

export default BotmakerWebchat;
