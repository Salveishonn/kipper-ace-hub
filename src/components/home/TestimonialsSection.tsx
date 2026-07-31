import { ExternalLink, Star } from "lucide-react";
import { useGoogleReviews } from "@/hooks/useGoogleReviews";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnimeScope } from "@/hooks/useAnimeScope";
import { registerSectionReveal } from "@/lib/motion/sectionReveal";

export function TestimonialsSection() {
  const { data, isLoading } = useGoogleReviews();
  const reviews = data?.reviews ?? [];
  const mapsUrl = data?.maps_url;

  const scopeRef = useAnimeScope((scope) => {
    registerSectionReveal(scope, {
      selector: "[data-section='testimonials']",
      childSelector: "[data-review-card]",
    });
  });

  return (
    <section ref={scopeRef} data-section="testimonials" className="section-padding bg-muted/30">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12 max-w-2xl mx-auto">
          <h2 data-reveal="heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Lo que dicen nuestros clientes
          </h2>
          <p data-reveal="copy" className="text-muted-foreground">
            Reseñas destacadas desde Google Maps. Google muestra solo una selección limitada acá.
          </p>
          {data?.rating != null && (
            <p className="mt-2 text-sm font-medium">
              {data.rating.toFixed(1)} ★
              {data.user_ratings_total != null && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · {data.user_ratings_total} reseñas en Google
                </span>
              )}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center text-muted-foreground mb-8">
            Las reseñas se mostrarán cuando el administrador configure Google Place ID y API en Supabase.
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {reviews.slice(0, 6).map((testimonial, index) => (
              <div
                key={`${testimonial.author}-${index}`}
                data-review-card
                className="bg-card p-6 rounded-xl shadow-soft border border-border/60"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(Math.min(5, testimonial.rating ?? 5))].map((_, i) => (
                    <Star key={i} size={16} className="fill-primary text-primary" aria-hidden />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4 line-clamp-4">&ldquo;{testimonial.text}&rdquo;</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.author}</p>
                  {testimonial.relativeTime && (
                    <p className="text-sm text-muted-foreground">{testimonial.relativeTime}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {mapsUrl && (
          <div className="text-center">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-hero-outline inline-flex items-center gap-2"
            >
              Ver todas las reseñas en Google
              <ExternalLink size={16} aria-hidden />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
