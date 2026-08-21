import { Link } from "react-router-dom";
import kipperMarkK from "@/assets/kipper-mark-k.png";
import { cn } from "@/lib/utils";

/** Public-header lockup, scaled to fit the 16rem admin/PAS sidebar. */
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
      className={cn("flex items-stretch h-[4.5rem] min-w-0 overflow-hidden", className)}
      aria-label="Organización Kipper — Inicio"
    >
      <img
        src={kipperMarkK}
        alt=""
        aria-hidden
        className="block h-full w-14 object-cover object-left mix-blend-screen shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center leading-none text-white px-2.5">
        <span className="text-[8px] font-medium tracking-[0.16em] uppercase opacity-95 truncate">
          Organización
        </span>
        <span className="font-kipper text-[1.4rem] font-normal tracking-[0.02em] uppercase leading-none mt-0.5 truncate">
          Kipper
        </span>
      </div>
    </Link>
  );
}
