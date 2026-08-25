import { useQuery } from "@tanstack/react-query";

import { applySignedUrls, collectImagePaths, signedImageUrlMap } from "@/lib/note-html";

/**
 * Renders saved note HTML, resolving inline image storage paths into signed URLs.
 * Position and size of each image come from the inline styles saved by the editor.
 */
export function NoteContent({ html, className = "" }: { html: string; className?: string }) {
  const paths = collectImagePaths(html);
  const { data } = useQuery({
    queryKey: ["inline-images", paths.slice().sort()],
    queryFn: () => signedImageUrlMap(paths),
    enabled: paths.length > 0,
    staleTime: 1000 * 60 * 30,
  });

  const resolved = paths.length > 0 ? applySignedUrls(html, data ?? {}) : html;

  return (
    <div className={`note-prose ${className}`} dangerouslySetInnerHTML={{ __html: resolved }} />
  );
}
