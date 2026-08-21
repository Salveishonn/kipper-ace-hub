import { Link } from "react-router-dom";
import kipperMarkK from "@/assets/kipper-mark-k.png";
import { cn } from "@/lib/utils";

/** Sidebar brand: the header K mark only, flush to the top-left edge. */
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
      className={cn("block h-[4.75rem] shrink-0", className)}
      aria-label="Organización Kipper — Inicio"
    >
      <img
        src={kipperMarkK}
        alt=""
        className="block h-full w-auto object-cover object-left mix-blend-screen"
      />
    </Link>
  );
}
