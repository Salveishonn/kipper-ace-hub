import { cn } from "@/lib/utils";

type PageHeroProps = {
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
};

export function PageHero({ title, subtitle, align = "center", className }: PageHeroProps) {
  return (
    <section className={cn("bg-primary text-primary-foreground py-16 sm:py-20", className)}>
      <div className={cn("page-wrap", align === "center" ? "text-center" : "text-left")}>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 text-balance">{title}</h1>
        {subtitle ? (
          <p
            className={cn(
              "text-lg opacity-90 leading-relaxed text-pretty",
              align === "center" ? "max-w-2xl mx-auto" : "max-w-2xl",
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
