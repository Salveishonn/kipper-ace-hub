import { ExternalLink } from "lucide-react";
import { useGoogleReviews } from "@/hooks/useGoogleReviews";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleReviewsCarousel } from "@/components/home/GoogleReviewsCarousel";
import { useAnimeScope } from "@/hooks/useAnimeScope";
import { registerSectionReveal } from "@/lib/motion/sectionReveal";

const DEFAULT_MAPS =
  "https://www.google.com/maps/search/?api=1&query=Kipper+Seguros";

export function TestimonialsSection() {
  const { data, isLoading } = useGoogleReviews();
  const reviews = data?.reviews ?? [];
  const mapsUrl = data?.maps_url || DEFAULT_MAPS;
  const hasReviews = reviews.length > 0;

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
            Reseñas destacadas de Google
          </h2>
          <p data-reveal="copy" className="text-muted-foreground">
            Una selección de opiniones reales publicadas en nuestro perfil de Google.
          </p>
          {data?.rating != null && (
            <p className="mt-3 text-sm font-medium" data-reviews-summary>
              {Number(data.rating).toFixed(1)} ★
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
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            aria-busy="true"
            aria-label="Cargando reseñas"
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : hasReviews ? (
          <div className="mb-10">
            <GoogleReviewsCarousel reviews={reviews} />
          </div>
        ) : (
          <div className="text-center mb-10 max-w-lg mx-auto" data-reviews-empty>
            <p className="text-muted-foreground mb-4">
              Conocé nuestras reseñas en Google. La selección destacada aparecerá acá cuando
              esté disponible.
            </p>
          </div>
        )}

        <div className="text-center">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-hero-outline inline-flex items-center gap-2"
          >
            {hasReviews ? "Ver todas en Google" : "Ver nuestras reseñas en Google"}
            <ExternalLink size={16} aria-hidden />
          </a>
        </div>
      </div>
    </section>
  );
}
