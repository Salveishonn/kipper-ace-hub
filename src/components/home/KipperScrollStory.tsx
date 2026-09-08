import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { CotizarButton, WhatsAppButton } from "@/components/ui/KipperCta";
import { MQ } from "@/lib/motion/tokens";

const NAV_TOP = "top-[4.25rem] sm:top-[4.75rem]";
const PIN_H = "h-[calc(100svh-4.25rem)] sm:h-[calc(100svh-4.75rem)] min-h-[480px]";
const VIDEO_SRC = "/videos/kipper-oficina.mp4";
const VIDEO_POSTER = "/videos/kipper-oficina-poster.jpg";

const MOMENTS = [
  {
    eyebrow: "+20 años junto a familias argentinas",
    title: "Seguros simples, atención real, gestión digital.",
    body: "Organización PAS con productores especializados. Cotizá, escribinos o recorré la oficina con el scroll.",
    isHero: true,
    isCta: true,
  },
  {
    eyebrow: "Cercanía real",
    title: "Asesoramiento humano cuando más lo necesitás.",
    body: "Productores que conocen tu riesgo y responden por WhatsApp, sin vueltas ni call center eterno.",
  },
  {
    eyebrow: "Para cada etapa",
    title: "Auto, hogar, vida y el resto del camino.",
    body: "Un mismo equipo, compañías de primer nivel y coberturas que se entienden.",
  },
  {
    eyebrow: "Próximo paso",
    title: "Cotizá tu seguro.",
    body: "Empezá online o escribinos. Te acompañamos en minutos.",
    isCta: true,
    showSumate: true,
  },
] as const;

type Moment = (typeof MOMENTS)[number];

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

function MomentCopy({ moment, index }: { moment: Moment; index: number }) {
  return (
    <div className="w-full max-w-[42rem] text-left">
      <p className="text-sm uppercase tracking-[0.18em] text-white/80 mb-4 font-medium">
        {moment.eyebrow}
      </p>
      {moment.isHero ? (
        <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.08] tracking-tight text-balance">
          {moment.title}
        </h1>
      ) : (
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance">
          {moment.title}
        </h2>
      )}
      <p className="mt-6 text-base sm:text-lg font-medium text-white/90 max-w-[38rem] leading-relaxed">
        {moment.body}
      </p>
      {moment.isCta ? (
        <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3 pointer-events-auto">
          <CotizarButton
            label={index === 0 ? "Cotizá tu seguro" : "Cotizar ahora"}
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
        <p className="mt-12 hidden lg:flex items-center gap-2 text-sm text-white/70">
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const panelsRef = useRef<HTMLElement[]>([]);
  const rafRef = useRef(0);
  const tickingRef = useRef(false);
  const activeRef = useRef(true);
  const pinEnabledRef = useRef(false);
  const metricsRef = useRef({ top: 0, distance: 1, pinTop: 0 });
  const videoFailedRef = useRef(false);
  const [videoReady, setVideoReady] = useState(false);
  const [allowVideo, setAllowVideo] = useState(false);

  useEffect(() => {
    const desktopMq = window.matchMedia(MQ.desktop);
    const reducedMq = window.matchMedia(MQ.reducedMotion);
    const update = () => {
      const enabled = desktopMq.matches && !reducedMq.matches;
      setAllowVideo(enabled);
      if (!enabled) setVideoReady(false);
    };
    update();
    desktopMq.addEventListener("change", update);
    reducedMq.addEventListener("change", update);
    return () => {
      desktopMq.removeEventListener("change", update);
      reducedMq.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const sticky = stickyRef.current;
    const video = videoRef.current;
    if (!root || !sticky) return;

    const desktopMq = window.matchMedia(MQ.desktop);
    const reducedMq = window.matchMedia(MQ.reducedMotion);
    const panels = panelsRef.current;

    videoFailedRef.current = false;

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

    const applyPanelProgress = (p: number) => {
      const n = Math.max(1, panels.length);
      const pos = p * Math.max(1, n - 1);
      panels.forEach((el, i) => {
        const dist = Math.abs(pos - i);
        const opacity = clamp(dist >= 1 ? 0 : 1 - dist);
        const shift = ((i - pos) * 10).toFixed(2);
        el.style.opacity = String(opacity);
        el.style.transform = `translate3d(0, ${shift}px, 0)`;
        el.setAttribute("aria-hidden", opacity < 0.2 ? "true" : "false");
      });
    };

    const syncVideo = (p: number) => {
      if (!video || videoFailedRef.current) return;
      if (video.readyState < 1) return;
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;
      const nextTime = p <= 0 ? 0 : p >= 1 ? duration : p * duration;
      if (Math.abs(video.currentTime - nextTime) < 0.01) return;
      video.currentTime = nextTime;
    };

    const apply = () => {
      tickingRef.current = false;
      if (!pinEnabledRef.current || !activeRef.current) return;
      const p = readProgress();
      applyPanelProgress(p);
      syncVideo(p);
    };

    const requestTick = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      rafRef.current = requestAnimationFrame(apply);
    };

    const resetStaticPanels = () => {
      panels.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "none";
        el.setAttribute("aria-hidden", "false");
      });
    };

    const enablePin = () => {
      pinEnabledRef.current = desktopMq.matches && !reducedMq.matches;
      if (!pinEnabledRef.current) {
        resetStaticPanels();
        return;
      }
      measure();
      applyPanelProgress(readProgress());
      requestTick();
    };

    const onVideoMeta = () => {
      if (!video) return;
      video.muted = true;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = 0;
      }
      void video
        .play()
        .then(() => {
          video.pause();
          if (video.readyState >= 2) setVideoReady(true);
        })
        .catch(() => undefined);
    };

    const onVideoReady = () => setVideoReady(true);
    const onVideoError = () => {
      videoFailedRef.current = true;
      setVideoReady(false);
    };

    if (video && allowVideo) {
      video.addEventListener("loadedmetadata", onVideoMeta);
      video.addEventListener("loadeddata", onVideoReady);
      video.addEventListener("error", onVideoError);
      if (video.readyState >= 1) onVideoMeta();
      if (video.readyState >= 2) setVideoReady(true);
    }

    enablePin();

    if (!desktopMq.matches || reducedMq.matches) {
      return () => {
        video?.removeEventListener("loadedmetadata", onVideoMeta);
        video?.removeEventListener("loadeddata", onVideoReady);
        video?.removeEventListener("error", onVideoError);
      };
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        activeRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          measure();
          requestTick();
        }
      },
      { threshold: 0 },
    );
    io.observe(root);

    const onScroll = () => requestTick();
    const onResize = () => {
      measure();
      requestTick();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    desktopMq.addEventListener("change", enablePin);
    reducedMq.addEventListener("change", enablePin);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      tickingRef.current = false;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      desktopMq.removeEventListener("change", enablePin);
      reducedMq.removeEventListener("change", enablePin);
      video?.removeEventListener("loadedmetadata", onVideoMeta);
      video?.removeEventListener("loadeddata", onVideoReady);
      video?.removeEventListener("error", onVideoError);
    };
  }, [allowVideo]);

  return (
    <section
      ref={rootRef}
      className="scroll-story relative bg-kipper-bordo-dark text-primary-foreground"
      aria-label="Recorrido por la oficina Kipper"
    >
      <div
        ref={stickyRef}
        className={`hero-sticky sticky ${NAV_TOP} z-0 overflow-hidden motion-reduce:relative motion-reduce:top-0 max-lg:relative max-lg:top-0 ${PIN_H}`}
      >
        <img
          src={VIDEO_POSTER}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            allowVideo && videoReady ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden
        />
        {allowVideo ? (
          <video
            ref={videoRef}
            className={`absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-500 ${
              videoReady ? "opacity-100" : "opacity-0"
            }`}
            poster={VIDEO_POSTER}
            muted
            playsInline
            preload="auto"
            aria-hidden
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
        ) : null}
        <div
          className="absolute inset-0 z-[2] bg-gradient-to-t from-kipper-bordo-dark/80 via-kipper-bordo-dark/25 to-kipper-bordo-dark/35"
          aria-hidden
        />

        <div className="absolute inset-0 z-10">
          {MOMENTS.map((moment, index) => (
            <article
              key={moment.title}
              ref={(el) => {
                if (el) panelsRef.current[index] = el;
              }}
              data-moment-panel
              className={`hero-moment-panel flex h-full flex-col justify-center px-[5%] py-16 sm:py-24 pointer-events-none lg:absolute lg:inset-0 ${
                index > 0 ? "hero-moment-pin-only hidden lg:flex lg:opacity-0" : "relative lg:absolute"
              }`}
            >
              <MomentCopy moment={moment} index={index} />
            </article>
          ))}
        </div>
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
