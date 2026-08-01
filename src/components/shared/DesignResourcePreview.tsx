import { useQuery } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { getDesignResourceSignedUrl } from "@/hooks/useDesignResources";

/** Resolves a signed URL for a private preview image; shows a neutral placeholder otherwise. */
export function DesignResourcePreview({
  previewPath,
  alt,
  className,
}: {
  previewPath: string | null;
  alt: string;
  className?: string;
}) {
  const { data: url } = useQuery({
    queryKey: ["design_resource_preview", previewPath],
    queryFn: () => getDesignResourceSignedUrl(previewPath!, 3600),
    enabled: !!previewPath,
    staleTime: 45 * 60 * 1000,
  });

  if (!previewPath || !url) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}
        aria-hidden
      >
        <ImageIcon size={28} />
      </div>
    );
  }

  return <img src={url} alt={alt} loading="lazy" className={`object-cover ${className ?? ""}`} />;
}
