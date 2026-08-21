import { Link } from "react-router-dom";
import kipperMarkK from "@/assets/kipper-mark-k.png";
import { cn } from "@/lib/utils";

/** Same brand block as the public header: K flush to the bar edges, wordmark centered beside it. */
export function KipperBrandLockup({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative h-[4.75rem] shrink-0", className)}>
      <Link
        to={href}
        className="absolute inset-0 flex items-stretch gap-2 min-w-0"
        aria-label="Organización Kipper — Inicio"
      >
        <img
          src={kipperMarkK}
          alt=""
          aria-hidden
          className="block h-full w-auto object-cover object-left mix-blend-screen"
        />
        <div className="flex flex-col justify-center leading-none text-white pr-3 min-w-0">
          <span className="text-[9px] font-medium tracking-[0.28em] uppercase opacity-95">
            Organización
          </span>
          <span className="font-kipper text-[1.85rem] font-normal tracking-[0.04em] uppercase leading-none mt-0.5">
            Kipper
          </span>
        </div>
      </Link>
    </div>
  );
}
