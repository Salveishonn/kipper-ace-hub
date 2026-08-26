/// <reference types="vite/client" />
import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare namespace JSX {
  interface IntrinsicElements {
    "fedpat-widget": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
  }
}
