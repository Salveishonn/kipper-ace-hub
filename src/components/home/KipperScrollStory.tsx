import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { createScope, animate, onScroll, stagger } from "animejs";
import heroPoster from "@/assets/hero-bg.jpg";
import { CotizarButton, WhatsAppButton } from "@/components/ui/KipperCta";
import { motion } from "@/lib/motion/tokens";

const VIDEO_SRC = "/videos/kipper-oficina.mp4";

const MOMENTS = [
  {
    eyebrow: "Kipper Seguros",
    title: "Seguros pensados para acompañarte.",
    body: "Coberturas claras y un equipo que responde cuando lo necesitás.",
  },
  {
    eyebrow: "Cercanía real",
    title: "Asesoramiento humano cuando más lo necesitás.",
    body: "Productores especializados y atención por WhatsApp sin vueltas.",
  },
  {
    eyebrow: "Para cada etapa",
    title: "Soluciones para cada etapa.",
    body: "Auto, hogar, vida y más — con las mejores compañías del mercado.",
  },
  {
    eyebrow: "Próximo paso",
    title: "Cotizá tu seguro",
    body: "Empezá online o escribinos. Te acompañamos en minutos.",
    isCta: true,
  },
] as const;

export function KipperScrollStory() {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const durationRef = useRef(0);
  const activeMomentRef = useRef(-1);
  const videoFailedRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scope = createScope({
      root,
      mediaQueries: {
        desktop: "(min-width: 1024px)",
        tabletDown: "(max-width: 1023px)",
        reducedMotion: "(prefers-reduced-motion: reduce)",
      },
    });

    scope.add((s) => {
      const track = root.querySelector<HTMLElement>("[data-scroll-track]");
      const video = videoRef.current;
      const momentEls = root.querySelectorAll<HTMLElement>("[data-moment-panel]");
      const mediaWrap = root.querySelector<HTMLElement>("[data-story-media]");
      if (!track) return;

      const setMoment = (index: number, immediate = false) => {
        if (index === activeMomentRef.current && !immediate) return;
        const prev = activeMomentRef.current;
        activeMomentRef.current = index;

        momentEls.forEach((el, i) => {
          if (i === prev && prev >= 0 && !immediate) {
            animate(el, {
              opacity: 0,
              translateY: -12,
              duration: motion.duration.fast,
              ease: motion.easing.inOut,
            });
          }
        });

        const current = momentEls[index];
        if (!current) return;

        const parts = current.querySelectorAll("[data-moment-part]");
        if (immediate || s.matches.reducedMotion) {
          momentEls.forEach((el, i) => {
            el.style.opacity = i === index ? "1" : "0";
            el.style.transform = "translateY(0)";
          });
          parts.forEach((p) => {
            (p as HTMLElement).style.opacity = "1";
            (p as HTMLElement).style.transform = "translateY(0)";
          });
          return;
        }

        animate(current, {
          opacity: [0, 1],
          translateY: [motion.distance.reveal, 0],
          duration: motion.duration.cinematic,
          ease: motion.easing.out,
        });
        animate(parts, {
          opacity: [0, 1],
          translateY: [motion.distance.subtle, 0],
          duration: motion.duration.standard,
          delay: stagger(motion.stagger.standard),
          ease: motion.easing.out,
        });
      };

      const progressState = { t: 0 };
      let scrollObserver: ReturnType<typeof onScroll> | null = null;
      let mobileObserver: IntersectionObserver | null = null;

      const applyVideoTime = (p: number) => {
        if (!video || videoFailedRef.current || !durationRef.current) return;
        const t = Math.min(durationRef.current - 0.05, Math.max(0, p * durationRef.current));
        if (Math.abs(video.currentTime - t) > 0.03) {
          video.currentTime = t;
        }
      };

      const onVideoMeta = () => {
        if (!video) return;
        durationRef.current = video.duration || 0;
        if (Number.isFinite(durationRef.current) && durationRef.current > 0) {
          video.currentTime = 0;
        }
      };

      const onVideoError = () => {
        videoFailedRef.current = true;
        if (video) video.style.opacity = "0";
      };

      if (video) {
        video.addEventListener("loadedmetadata", onVideoMeta);
        video.addEventListener("error", onVideoError);
        if (video.readyState >= 1) onVideoMeta();
      }

      if (s.matches.reducedMotion) {
        setMoment(0, true);
        return () => {
          video?.removeEventListener("loadedmetadata", onVideoMeta);
          video?.removeEventListener("error", onVideoError);
        };
      }

      momentEls.forEach((el) => {
        el.style.opacity = "0";
      });
      setMoment(0, true);

      if (s.matches.desktop && !videoFailedRef.current) {
        track.style.height = "320vh";

        scrollObserver = onScroll({
          target: track,
          enter: "start start",
          leave: "end end",
          sync: 0.12,
          onUpdate: (self) => {
            const p = self.progress;
            progressState.t = p;
            applyVideoTime(p);
            if (mediaWrap) {
              const scale = 1.04 - p * 0.04;
              mediaWrap.style.transform = `scale(${scale})`;
            }
            const idx = Math.min(MOMENTS.length - 1, Math.floor(p * MOMENTS.length * 0.999));
            setMoment(idx);
          },
        });

        const scrollAnim = animate(progressState, {
          t: 1,
          duration: 1000,
          ease: "linear",
          autoplay: scrollObserver,
          onUpdate: () => applyVideoTime(progressState.t),
        });
        s.register(scrollAnim);
        s.register(scrollObserver);
      } else {
        track.style.height = "auto";
        if (mediaWrap) mediaWrap.style.transform = "scale(1)";

        if (video && !videoFailedRef.current) {
          video.loop = true;
          mobileObserver = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  video.play().catch(() => undefined);
                } else {
                  video.pause();
                }
              });
            },
            { threshold: 0.35 },
          );
          mobileObserver.observe(root);
        }

        const stepTimers: number[] = [];

        scrollObserver = onScroll({
          target: track,
          enter: "top 80%",
          leave: "bottom 20%",
          repeat: true,
          onEnter: () => setMoment(0),
          onEnterForward: () => {
            stepTimers.forEach((id) => window.clearTimeout(id));
            stepTimers.length = 0;
            let i = 0;
            const step = () => {
              setMoment(i);
              i += 1;
              if (i < MOMENTS.length) {
                stepTimers.push(window.setTimeout(step, 2200));
              }
            };
            step();
          },
        });
        s.register(scrollObserver);

        return () => {
          stepTimers.forEach((id) => window.clearTimeout(id));
          video?.removeEventListener("loadedmetadata", onVideoMeta);
          video?.removeEventListener("error", onVideoError);
          mobileObserver?.disconnect();
        };
      }

      return () => {
        video?.removeEventListener("loadedmetadata", onVideoMeta);
        video?.removeEventListener("error", onVideoError);
        mobileObserver?.disconnect();
      };
    });

    return () => scope.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="scroll-story relative bg-kipper-bordo-dark text-primary-foreground"
      aria-label="Experiencia Kipper Seguros"
    >
      <div data-scroll-track className="relative">
        <div className="sticky top-0 h-[100svh] min-h-[520px] overflow-hidden">
          <div
            data-story-media
            className="absolute inset-0 origin-center will-change-transform"
          >
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover z-[1]"
              poster={heroPoster}
              muted
              playsInline
              preload="metadata"
              aria-hidden
            >
              <source src={VIDEO_SRC} type="video/mp4" />
            </video>
            <img
              src={heroPoster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover z-0"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-t from-kipper-bordo-dark/95 via-kipper-bordo-dark/55 to-kipper-bordo-dark/40"
              aria-hidden
            />
          </div>

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex flex-1 items-center relative">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-3xl relative min-h-[240px] sm:min-h-[280px]">
                {MOMENTS.map((moment, index) => (
                  <div
                    key={moment.title}
                    data-moment-panel
                    data-moment={index}
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 sm:px-0 pointer-events-none"
                    aria-hidden={index !== 0}
                  >
                    <p
                      data-moment-part
                      className="text-sm uppercase tracking-[0.2em] text-primary-foreground/75 mb-4 font-medium"
                    >
                      {moment.eyebrow}
                    </p>
                    <h2
                      data-moment-part
                      className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance"
                    >
                      {moment.title}
                    </h2>
                    <p data-moment-part className="mt-4 text-lg text-primary-foreground/85 max-w-xl">
                      {moment.body}
                    </p>
                    {moment.isCta && (
                      <div
                        data-moment-part
                        className="mt-8 flex flex-col sm:flex-row gap-3 pointer-events-auto"
                      >
                        <CotizarButton label="Cotizar ahora" />
                        <WhatsAppButton label="WhatsApp" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-auto border-t border-primary-foreground/15 bg-kipper-bordo-dark/80 backdrop-blur-sm">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-primary-foreground/80 hidden sm:block">
                  Deslizá para conocer Kipper · Cotizá cuando quieras
                </p>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-start sm:justify-end">
                  <CotizarButton size="sm" />
                  <WhatsAppButton size="sm" />
                  <Link
                    to="/sumate"
                    className="sumate-pas-link text-primary-foreground/90 border-primary-foreground/25 hover:bg-primary-foreground/10"
                  >
                    Sumate como PAS
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen reader: full narrative without relying on scroll animation */}
      <div className="sr-only">
        {MOMENTS.map((m) => (
          <p key={m.title}>
            {m.eyebrow}: {m.title}. {m.body}
          </p>
        ))}
      </div>
    </section>
  );
}
