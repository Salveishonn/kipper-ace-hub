import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { CotizarButton, WhatsAppButton } from "@/components/ui/KipperCta";
import { MQ } from "@/lib/motion/tokens";

const PIN_H = "h-[calc(100svh-4.25rem)] sm:h-[calc(100svh-4.75rem)] min-h-[480px]";
const VIDEO_SRC = "/videos/kipper-oficina.mp4";
const VIDEO_POSTER = "/videos/kipper-oficina-poster.jpg";
const LERP = 0.12;

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

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

export function KipperScrollStory() {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const panelsRef = useRef<HTMLElement[]>([]);
  const targetTimeRef = useRef(0);
  const currentTimeRef = useRef(0);
  const rafRef = useRef(0);
  const activeRef = useRef(false);
  const videoFailedRef = useRef(false);
  const [videoReady, setVideoReady] = useState(false);
  const [allowVideo, setAllowVideo] = useState(false);

  useEffect(() => {
    const desktopMq = window.matchMedia(MQ.desktop);
    const reducedMq = window.matchMedia(MQ.reducedMotion);
    const update = () => {
      setAllowVideo(desktopMq.matches && !reducedMq.matches);
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
    const track = root?.querySelector<HTMLElement>("[data-scroll-track]");
    const video = videoRef.current;
    if (!root || !track) return;

    const desktopMq = window.matchMedia(MQ.desktop);
    const reducedMq = window.matchMedia(MQ.reducedMotion);
    const panels = panelsRef.current;

    const readProgress = () => {
      const rect = track.getBoundingClientRect();
      const span = Math.max(1, track.offsetHeight - window.innerHeight);
      return clamp(-rect.top / span);
    };

    const applyPanelProgress = (p: number) => {
      const n = Math.max(1, panels.length);
      panels.forEach((el, i) => {
        const start = i / n;
        const end = (i + 1) / n;
        const local = clamp((p - start) / Math.max(0.0001, end - start));
        const opacity = local < 0.12 ? local / 0.12 : local > 0.88 ? (1 - local) / 0.12 : 1;
        el.style.opacity = String(clamp(opacity));
        el.style.transform = `translate3d(0, ${((0.5 - local) * 12).toFixed(2)}px, 0)`;
        el.setAttribute("aria-hidden", opacity < 0.2 ? "true" : "false");
      });
    };

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      if (!activeRef.current || reducedMq.matches || !desktopMq.matches) return;
      const p = readProgress();
      applyPanelProgress(p);
      if (!video || videoFailedRef.current || !video.duration || video.readyState < 2) return;
      targetTimeRef.current = p * video.duration;
      currentTimeRef.current += (targetTimeRef.current - currentTimeRef.current) * LERP;
      video.currentTime = currentTimeRef.current;
    };

    const onVideoMeta = () => {
      if (!video) return;
      video.muted = true;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = 0;
        currentTimeRef.current = 0;
        targetTimeRef.current = 0;
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

    if (reducedMq.matches || !desktopMq.matches) {
      panels.forEach((el, i) => {
        el.style.opacity = "1";
        el.style.transform = "none";
        el.setAttribute("aria-hidden", "false");
        if (i > 0 && desktopMq.matches) {
          /* keep stacked copy readable on reduced-motion desktop */
        }
      });
      return () => {
        video?.removeEventListener("loadedmetadata", onVideoMeta);
        video?.removeEventListener("loadeddata", onVideoReady);
        video?.removeEventListener("error", onVideoError);
      };
    }

    applyPanelProgress(0);
    const io = new IntersectionObserver(
      ([entry]) => {
        activeRef.current = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(root);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      io.disconnect();
      video?.removeEventListener("loadedmetadata", onVideoMeta);
      video?.removeEventListener("loadeddata", onVideoReady);
      video?.removeEventListener("error", onVideoError);
    };
  }, [allowVideo]);

  return (
    <section
      ref={rootRef}
      className="scroll-story relative overflow-clip bg-kipper-bordo-dark text-primary-foreground"
      aria-label="Recorrido por la oficina Kipper"
    >
      <div data-scroll-track className="relative">
        <div className={`sticky top-[4.25rem] sm:top-[4.75rem] z-0 flex overflow-hidden motion-reduce:relative motion-reduce:top-0 ${PIN_H}`}>
          <img
            src={VIDEO_POSTER}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              videoReady ? "opacity-0" : "opacity-100"
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
              preload="metadata"
              aria-hidden
            >
              <source src={VIDEO_SRC} type="video/mp4" />
            </video>
          ) : null}
          <div
            className="absolute inset-0 z-[2] bg-gradient-to-t from-kipper-bordo-dark/80 via-kipper-bordo-dark/25 to-kipper-bordo-dark/35"
            aria-hidden
          />
        </div>

        <div className="relative z-10 -mt-[calc(100svh-4.25rem)] sm:-mt-[calc(100svh-4.75rem)] pointer-events-none motion-reduce:mt-0">
          {MOMENTS.map((moment, index) => (
            <article
              key={moment.title}
              ref={(el) => {
                if (el) panelsRef.current[index] = el;
              }}
              data-moment-panel
              className="flex min-h-[calc(100svh-4.25rem)] sm:min-h-[calc(100svh-4.75rem)] lg:h-[200vh] flex-col justify-center px-[5%] py-16 sm:py-24 motion-reduce:!h-auto motion-reduce:!min-h-0 motion-reduce:py-16"
            >
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
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
