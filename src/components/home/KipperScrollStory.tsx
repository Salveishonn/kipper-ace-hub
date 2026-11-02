import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { CotizarButton, WhatsAppButton } from "@/components/ui/KipperCta";
import { FrameSequence, momentOpacity, pickFrameSet } from "@/lib/heroFrames";
import { MQ } from "@/lib/motion/tokens";

const NAV_TOP = "top-[4.25rem] sm:top-[4.75rem]";
const PIN_H = "h-[calc(100svh-4.25rem)] sm:h-[calc(100svh-4.75rem)] min-h-[480px]";
const VIDEO_POSTER = "/videos/kipper-oficina-poster.jpg";
/** Seconds for the footage to catch up with the scrollbar. Gives wheel steps some weight. */
const SCRUB_LAG = 0.12;
const MOMENT_TRAVEL_PX = 28;

// Fade ranges are scroll progress, placed where the footage matches the copy:
// reception, then the offices, then landing on the Kipper sign.
const MOMENTS = [
  {
    eyebrow: "+20 años junto a familias argentinas",
    title: "Seguros simples, atención real, gestión digital.",
    body: "Organización PAS con productores especializados. Cotizá, escribinos o recorré la oficina con el scroll.",
    isHero: true,
    isCta: true,
    fadeOut: [0.06, 0.11],
  },
  {
    eyebrow: "Cercanía real",
    title: "Asesoramiento humano cuando más lo necesitás.",
    body: "Productores que conocen tu riesgo y responden por WhatsApp, sin vueltas ni call center eterno.",
    fadeIn: [0.11, 0.14],
    fadeOut: [0.22, 0.26],
  },
  {
    eyebrow: "Para cada etapa",
    title: "Auto, hogar, vida y el resto del camino.",
    body: "Un mismo equipo, compañías de primer nivel y coberturas que se entienden.",
    fadeIn: [0.35, 0.38],
    fadeOut: [0.47, 0.51],
  },
  {
    eyebrow: "Próximo paso",
    title: "Cotizá tu seguro.",
    body: "Empezá online o escribinos. Te acompañamos en minutos.",
    isCta: true,
    showSumate: true,
    fadeIn: [0.9, 0.95],
  },
] as const;

type Moment = (typeof MOMENTS)[number];

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

/** Reduced motion and data-saver visitors get the poster and plain stacked copy. */
function prefersStatic() {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return (
    Boolean(saveData) ||
    typeof createImageBitmap !== "function" ||
    window.matchMedia(MQ.reducedMotion).matches
  );
}

function MomentCopy({ moment, index }: { moment: Moment; index: number }) {
  return (
    <div className="w-full max-w-[46rem] text-left">
      <p className="text-sm uppercase tracking-[0.18em] text-white/80 mb-4 font-medium">
        {moment.eyebrow}
      </p>
      {"isHero" in moment && moment.isHero ? (
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-tight text-balance">
          {moment.title}
        </h1>
      ) : (
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.06] tracking-tight text-balance">
          {moment.title}
        </h2>
      )}
      {/* On phones the closing copy has to stay short or it covers the sign behind it. */}
      <p
        className={`mt-5 text-base sm:text-lg font-medium text-white/90 max-w-[38rem] leading-relaxed ${
          "showSumate" in moment ? "hidden sm:block" : ""
        }`}
      >
        {moment.body}
      </p>
      {"isCta" in moment && moment.isCta ? (
        <div
          className={`mt-7 gap-3 pointer-events-auto sm:flex sm:flex-row sm:flex-wrap ${
            "showSumate" in moment ? "grid grid-cols-2 [&>a:last-child]:col-span-2" : "flex flex-col"
          }`}
        >
          <CotizarButton
            label={index === 0 ? "Cotizá tu seguro" : "Cotizar"}
            size={index === 0 ? "lg" : "md"}
            variant="onBrand"
          />
          <WhatsAppButton label="WhatsApp" />
          {"showSumate" in moment && moment.showSumate ? (
            <Link to="/sumate" className="sumate-pas-link-brand">
              Sumate como PAS
            </Link>
          ) : null}
        </div>
      ) : null}
      {index === 0 ? (
        <p className="hero-scroll-hint mt-7 hidden sm:flex items-center gap-2 text-sm text-white/70">
          <ChevronDown size={18} className="motion-safe:animate-bounce" aria-hidden />
          Deslizá para entrar a la oficina
        </p>
      ) : null}
    </div>
  );
}

export function KipperScrollStory() {
  const rootRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const panelsRef = useRef<HTMLElement[]>([]);
  const metricsRef = useRef({ top: 0, distance: 1, pinTop: 0 });
  const [isStatic, setIsStatic] = useState(prefersStatic);
  const [frameSet, setFrameSet] = useState(() => pickFrameSet(window.innerWidth, window.innerHeight));
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    const reducedMq = window.matchMedia(MQ.reducedMotion);
    const onMotion = () => setIsStatic(prefersStatic());
    const onResize = () => setFrameSet(pickFrameSet(window.innerWidth, window.innerHeight));
    reducedMq.addEventListener("change", onMotion);
    window.addEventListener("resize", onResize);
    return () => {
      reducedMq.removeEventListener("change", onMotion);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    const panels = panelsRef.current;
    if (!root || !sticky) return;

    if (isStatic || !canvas) {
      panels.forEach((el) => {
        el.style.cssText = "";
        el.removeAttribute("aria-hidden");
      });
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      setIsStatic(true);
      return;
    }

    canvas.width = frameSet.width;
    canvas.height = frameSet.height;

    let raf = 0;
    let lastTime = 0;
    let shown = 0;
    let drawnFrame = -1;
    let onScreen = true;

    const measure = () => {
      const stickyH = sticky.offsetHeight || window.innerHeight;
      const pinTop = Number.parseFloat(getComputedStyle(sticky).top) || 0;
      metricsRef.current = {
        top: root.getBoundingClientRect().top + window.scrollY,
        distance: Math.max(1, root.offsetHeight - stickyH),
        pinTop,
      };
    };

    const readProgress = () => {
      const { top, distance, pinTop } = metricsRef.current;
      return clamp((window.scrollY + pinTop - top) / distance);
    };

    const renderMoments = (p: number) => {
      panels.forEach((el, i) => {
        const moment = MOMENTS[i];
        const opacity = momentOpacity(p, moment);
        const leaving = "fadeOut" in moment && p > moment.fadeOut[0];
        const shift = (1 - opacity) * MOMENT_TRAVEL_PX * (leaving ? -1 : 1);
        el.style.opacity = opacity.toFixed(3);
        el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
        // visibility, not just opacity: hidden moments must not catch clicks or focus.
        el.style.visibility = opacity > 0 ? "visible" : "hidden";
      });
      if (railRef.current) railRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      if (skipRef.current) {
        skipRef.current.style.visibility = p > 0.88 ? "hidden" : "visible";
      }
    };

    const renderFrame = (p: number) => {
      const frame = sequence.frameAt(Math.round(p * (frameSet.count - 1)));
      if (!frame || frame.index === drawnFrame) return;
      ctx.drawImage(frame.bitmap, 0, 0, canvas.width, canvas.height);
      if (drawnFrame === -1) setHasFrame(true);
      drawnFrame = frame.index;
    };

    const tick = (now: number) => {
      raf = 0;
      const target = readProgress();
      const dt = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;
      shown += (target - shown) * (1 - Math.exp(-dt / SCRUB_LAG));
      if (Math.abs(target - shown) < 0.0002) shown = target;

      renderMoments(shown);
      renderFrame(shown);

      if (shown !== target) {
        raf = requestAnimationFrame(tick);
      } else {
        lastTime = 0;
      }
    };

    const wake = () => {
      if (!raf && onScreen) raf = requestAnimationFrame(tick);
    };

    const sequence = new FrameSequence(frameSet, wake);

    const onResize = () => {
      measure();
      wake();
    };

    measure();
    // A reload mid-page should land on the right frame, not animate there.
    shown = readProgress();
    renderMoments(shown);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sequence.setRunning(onScreen);
        if (onScreen) onResize();
      },
      { rootMargin: "50% 0px" },
    );
    io.observe(root);

    const ro = new ResizeObserver(onResize);
    ro.observe(root);

    window.addEventListener("scroll", wake, { passive: true });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", wake);
      sequence.destroy();
    };
  }, [isStatic, frameSet]);

  const skipStory = () => {
    const root = rootRef.current;
    if (!root) return;
    const { pinTop } = metricsRef.current;
    window.scrollTo({
      top: root.getBoundingClientRect().bottom + window.scrollY - pinTop,
      // The site sets scroll-behavior: smooth; this must jump, not crawl through every frame.
      behavior: "instant",
    });
  };

  return (
    <section
      ref={rootRef}
      data-static={isStatic ? "" : undefined}
      className="scroll-story relative bg-kipper-bordo-dark text-primary-foreground"
      aria-label="Recorrido por la oficina Kipper"
    >
      <div
        ref={stickyRef}
        className={`hero-sticky sticky ${NAV_TOP} z-0 overflow-hidden ${PIN_H}`}
      >
        <img
          src={VIDEO_POSTER}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          aria-hidden
        />
        {isStatic ? null : (
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-300 ${
              hasFrame ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden
          />
        )}
        <div
          className="absolute inset-0 z-[2] bg-gradient-to-t from-kipper-bordo-dark/95 via-kipper-bordo-dark/55 via-55% to-transparent sm:from-kipper-bordo-dark/90 sm:via-kipper-bordo-dark/20 sm:via-45%"
          aria-hidden
        />
        <div
          className="absolute inset-0 z-[2] bg-gradient-to-r from-black/35 via-transparent to-transparent"
          aria-hidden
        />

        <div className="absolute inset-0 z-10">
          {MOMENTS.map((moment, index) => (
            <article
              key={moment.title}
              ref={(el) => {
                if (el) panelsRef.current[index] = el;
              }}
              style={index === 0 ? undefined : { opacity: 0, visibility: "hidden" }}
              className={`hero-moment-panel absolute inset-0 flex flex-col justify-end px-[5%] pb-24 sm:pb-16 pointer-events-none will-change-[opacity,transform] ${
                index > 0 ? "hero-moment-pin-only" : ""
              }`}
            >
              <MomentCopy moment={moment} index={index} />
            </article>
          ))}
        </div>

        {isStatic ? null : (
          <>
            <button
              ref={skipRef}
              type="button"
              onClick={skipStory}
              className="absolute right-[5%] top-4 z-20 rounded-full bg-black/25 px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm transition-colors hover:bg-black/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Saltar recorrido
            </button>
            <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/15" aria-hidden>
              <div
                ref={railRef}
                className="h-full origin-left bg-white/80"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </>
        )}
      </div>

      <div className="hero-moment-stack relative z-10 px-[5%] py-16 sm:py-24">
        {MOMENTS.slice(1).map((moment, i) => (
          <article key={moment.title} className={i > 0 ? "mt-14 sm:mt-16" : undefined}>
            <MomentCopy moment={moment} index={i + 1} />
          </article>
        ))}
      </div>
    </section>
  );
}
