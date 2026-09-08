export function officeEmbedUrl(signedUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
}

export function getVideoEmbedUrl(url: string) {
  try {
    if (url.includes("youtube.com/watch")) {
      const id = new URL(url).searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (url.includes("youtube.com/embed/") || url.includes("youtube-nocookie.com/embed/")) {
      return url;
    }
    if (url.includes("vimeo.com/")) {
      const id = url.split("vimeo.com/")[1]?.split("?")[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    /* keep raw url */
  }
  return url;
}
