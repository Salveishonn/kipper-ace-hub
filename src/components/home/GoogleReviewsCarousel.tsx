import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { CachedGoogleReview } from "@/lib/googleReviews";
import {
  getReviewPageSize,
  groupReviews,
  isIncompleteReviewGroup,
  shouldAutoplayReviews,
} from "@/lib/googleReviews";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 8000;
const TRUNCATE_AT = 220;

type Props = {
  reviews: CachedGoogleReview[];
};

export function GoogleReviewsCarousel({ reviews }: Props) {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const pageSize = getReviewPageSize(viewportWidth);
  const groups = useMemo(() => groupReviews(reviews.slice(0, 5), pageSize), [reviews, pageSize]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: groups.length > 1,
    align: "start",
    duration: reducedMotion ? 0 : 25,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    emblaApi?.reInit();
    setSelectedIndex(0);
    emblaApi?.scrollTo(0, true);
  }, [pageSize, groups.length, emblaApi]);

  const autoplay = shouldAutoplayReviews(groups.length, reducedMotion);

  useEffect(() => {
    if (!emblaApi || !autoplay || paused) return;
    const id = window.setInterval(() => {
      emblaApi.scrollNext();
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [emblaApi, autoplay, paused]);

  if (groups.length === 0) return null;

  const gridClass =
    pageSize === 4
      ? "grid-cols-4"
      : pageSize === 2
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <div
      className="relative"
      data-reviews-carousel
      data-page-size={pageSize}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {groups.map((group, groupIndex) => {
            const incomplete = isIncompleteReviewGroup(group.length, pageSize);
            return (
              <div
                key={`group-${groupIndex}`}
                className="min-w-0 shrink-0 grow-0 basis-full px-1"
                data-review-group
                data-incomplete={incomplete ? "true" : "false"}
              >
                <div
                  className={cn(
                    incomplete
                      ? "flex flex-wrap justify-center gap-4"
                      : cn("grid gap-4", gridClass),
                  )}
                >
                  {group.map((review, idx) => {
                    const key = `${groupIndex}-${idx}-${review.author}`;
                    const long = (review.text?.length ?? 0) > TRUNCATE_AT;
                    const open = expanded[key];
                    const displayText =
                      long && !open
                        ? `${review.text.slice(0, TRUNCATE_AT).trim()}…`
                        : review.text;

                    return (
                      <article
                        key={key}
                        data-review-card
                        className={cn(
                          "bg-card p-5 sm:p-6 rounded-xl shadow-soft border border-border/60 h-full flex flex-col",
                          incomplete
                            ? "w-full max-w-sm"
                            : "min-w-0",
                        )}
                      >
                        <div
                          className="flex gap-1 mb-3"
                          aria-label={`${review.rating ?? 5} estrellas`}
                        >
                          {[...Array(Math.min(5, Math.max(0, review.rating ?? 5)))].map((_, i) => (
                            <Star key={i} size={15} className="fill-primary text-primary" aria-hidden />
                          ))}
                        </div>
                        <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                          &ldquo;{displayText}&rdquo;
                        </p>
                        {long && (
                          <button
                            type="button"
                            className="mt-2 self-start text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
                            }
                          >
                            {open ? "Ver menos" : "Leer más"}
                          </button>
                        )}
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <p className="font-semibold text-foreground text-sm">{review.author}</p>
                          {review.relativeTime && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {review.relativeTime}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-2">
                            Reseña de Google
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {groups.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Reseñas anteriores"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-40"
            onClick={() => emblaApi?.scrollPrev()}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <div className="flex gap-2" role="tablist" aria-label="Grupos de reseñas">
            {groups.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === selectedIndex}
                aria-label={`Grupo ${i + 1} de ${groups.length}`}
                className={cn(
                  "h-2.5 w-2.5 rounded-full transition-colors",
                  i === selectedIndex ? "bg-primary" : "bg-border hover:bg-muted-foreground/40",
                )}
                onClick={() => emblaApi?.scrollTo(i)}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Reseñas siguientes"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            onClick={() => emblaApi?.scrollNext()}
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
