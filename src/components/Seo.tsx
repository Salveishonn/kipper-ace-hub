import { useEffect } from "react";

interface SeoProps {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown>;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function Seo({ title, description, canonical, ogImage, jsonLd }: SeoProps) {
  useEffect(() => {
    const fullTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
    document.title = fullTitle;

    if (description) {
      const desc = description.length > 160 ? description.slice(0, 157) + "..." : description;
      setMeta("description", desc);
      setMeta("og:description", desc, "property");
    }
    setMeta("og:title", fullTitle, "property");
    setMeta("og:type", "website", "property");

    // Canonical + og:url (prefer explicit prop; otherwise current location)
    const href = canonical || (typeof window !== "undefined" ? window.location.href : "");
    if (href) {
      setMeta("og:url", href, "property");
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    }

    if (ogImage) setMeta("og:image", ogImage, "property");

    // JSON-LD
    let scriptEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.text = JSON.stringify(jsonLd);
      document.head.appendChild(scriptEl);
    }
    return () => {
      if (scriptEl) scriptEl.remove();
    };
  }, [title, description, canonical, ogImage, jsonLd]);

  return null;
}

export default Seo;
