import { supabase } from "@/integrations/supabase/client";

/**
 * Inline images inside note HTML are stored as
 * `<img data-path="storage/path" style="width:…;transform:translate(…)">`.
 * The bucket is private, so `src` is resolved to a fresh signed URL at render
 * time and stripped again before saving.
 */
export const INLINE_IMAGE_ATTR = "data-path";

export function collectImagePaths(html: string): string[] {
  const paths = new Set<string>();
  const regex = /data-path="([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    if (match[1]) paths.add(match[1]);
  }
  return [...paths];
}

export async function signedImageUrlMap(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from("note-images")
    .createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  const map: Record<string, string> = {};
  (data ?? []).forEach((row) => {
    if (row.path && row.signedUrl) map[row.path] = row.signedUrl;
  });
  return map;
}

/** Injects fresh signed URLs into every inline image tag. */
export function applySignedUrls(html: string, map: Record<string, string>): string {
  return html.replace(/<img\b[^>]*>/g, (tag) => {
    const path = /data-path="([^"]+)"/.exec(tag)?.[1];
    if (!path) return tag;
    const url = map[path];
    if (!url) return tag;
    const withoutSrc = tag.replace(/\ssrc="[^"]*"/g, "");
    return withoutSrc.replace(/^<img/, `<img src="${url}"`);
  });
}

/** Removes expiring signed URLs so only the storage path is persisted. */
export function stripSignedUrls(html: string): string {
  return html.replace(/<img\b[^>]*>/g, (tag) =>
    /data-path="/.test(tag) ? tag.replace(/\ssrc="[^"]*"/g, "") : tag,
  );
}

export function inlineImageTag(path: string, url: string) {
  return `<img ${INLINE_IMAGE_ATTR}="${path}" src="${url}" alt="Gambar catatan" class="note-inline-image" style="width:55%;transform:translate(0px, 0px);" />`;
}
