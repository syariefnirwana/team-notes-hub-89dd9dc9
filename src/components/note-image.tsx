import { useQuery } from "@tanstack/react-query";

import { signedImageUrl } from "@/lib/notes";
import { Skeleton } from "@/components/ui/skeleton";

export function NoteImage({ path, alt }: { path: string; alt: string }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["note-image", path],
    queryFn: () => signedImageUrl(path),
    staleTime: 1000 * 60 * 30,
  });

  if (isPending) return <Skeleton className="h-56 w-full rounded-lg" />;
  if (isError || !data) {
    return <p className="text-sm text-muted-foreground">Gambar tidak dapat dimuat.</p>;
  }

  return <img src={data} alt={alt} loading="lazy" className="w-full rounded-lg border border-border" />;
}
