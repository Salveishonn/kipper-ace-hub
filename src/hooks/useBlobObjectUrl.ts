import { useEffect, useState } from "react";

/** Fetch a remote file and expose it as a blob: URL so iframes stay same-policy. */
export function useBlobObjectUrl(remoteUrl: string | undefined, enabled = true) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !remoteUrl) {
      setObjectUrl(null);
      return;
    }

    let cancelled = false;
    let created: string | null = null;
    setObjectUrl(null);

    fetch(remoteUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      })
      .catch(() => {
        if (cancelled) return;
        setObjectUrl(remoteUrl);
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [remoteUrl, enabled]);

  return objectUrl;
}
