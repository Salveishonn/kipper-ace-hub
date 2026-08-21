import { Link } from "react-router-dom";
import kipperMarkK from "@/assets/kipper-mark-k.png";
import { cn } from "@/lib/utils";

/**
 * Same lockup as the public header (K flush left + Organización / Kipper),
 * scaled so the full mark fits the 16rem sidebar instead of being cropped.
 */
export function KipperBrandLockup({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      to={href}
      className={cn("flex items-stretch h-[4.25rem] min-w-0 overflow-hidden", className)}
      aria-label="Organización Kipper — Inicio"
    >
      <img
        src={kipperMarkK}
        alt=""
        aria-hidden
        className="block h-full w-auto max-w-[5.5rem] object-contain object-left mix-blend-screen shrink-0"
      />
      <div className="flex min-w-0 flex-col justify-center leading-none text-white pl-1.5 pr-3">
        <span className="text-[8px] font-medium tracking-[0.22em] uppercase opacity-95">
          Organización
        </span>
        <span className="font-kipper text-[1.55rem] font-normal tracking-[0.04em] uppercase leading-none mt-0.5">
          Kipper
        </span>
      </div>
    </Link>
  );
}
