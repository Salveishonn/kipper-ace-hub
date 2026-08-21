import { Link } from "react-router-dom";
import kipperMarkK from "@/assets/kipper-mark-k.png";
import { cn } from "@/lib/utils";

/** Same Organización / Kipper lockup as the public header, sized for a sidebar. */
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
      className={cn("flex items-stretch h-[4.75rem] min-w-0 group", className)}
      aria-label="Organización Kipper — Inicio"
    >
      <img
        src={kipperMarkK}
        alt=""
        aria-hidden
        className="block h-full w-auto object-cover object-left mix-blend-screen shrink-0"
      />
      <div className="flex flex-col justify-center leading-none text-white pr-3 min-w-0">
        <span className="text-[9px] sm:text-[10px] font-medium tracking-[0.28em] uppercase opacity-95">
          Organización
        </span>
        <span className="font-kipper text-[1.85rem] font-normal tracking-[0.04em] uppercase leading-none mt-0.5">
          Kipper
        </span>
      </div>
    </Link>
  );
}
