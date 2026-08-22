import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NotebookPen, Users, History, Palette } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Catatan Studio PWK — Catatan Kelompok Bersama" },
      {
        name: "description",
        content:
          "Catatan cloud untuk kelompok studio Perencanaan Wilayah dan Kota: tulis, edit bersama, dan lihat siapa yang menulis serta mengubah setiap bagian.",
      },
      { property: "og:title", content: "Catatan Studio PWK — Catatan Kelompok Bersama" },
      {
        property: "og:description",
        content:
          "Catatan kelompok dengan penanda penulis, riwayat perubahan, dan daftar peran anggota untuk dosen pembimbing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: NotebookPen,
    title: "Tulis catatan rapat",
    text: "Judul, isi berformat, dan gambar dokumentasi dalam satu catatan.",
  },
  {
    icon: Palette,
    title: "Tanda per bagian",
    text: "Setiap bagian diberi warna dan nama penulis atau pengubah terakhir.",
  },
  {
    icon: History,
    title: "Riwayat perubahan",
    text: "Tercatat siapa mengubah apa, kapan dibuat dan kapan terakhir diperbarui.",
  },
  {
    icon: Users,
    title: "Peran anggota",
    text: "Ketua, sekretaris, bendahara, dan anggota terlihat jelas bagi pembimbing.",
  },
];

function Landing() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function signIn() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Gagal masuk dengan Google. Coba lagi ya.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-10 px-4 py-16">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <NotebookPen className="size-3.5" /> Kelompok Studio PWK
        </span>
        <h1 className="mt-5 text-4xl leading-tight sm:text-5xl">
          Catatan kelompok yang jelas siapa penulis dan penanggung jawabnya.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Sekretaris menulis, anggota lain menambahkan, dan semua perubahan tercatat lengkap dengan
          nama serta tanggalnya — seperti dokumen bersama versi sederhana.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={signIn} disabled={busy || loading}>
            {busy ? "Menghubungkan…" : "Masuk dengan Google"}
          </Button>
          <span className="text-sm text-muted-foreground">
            Nama tampilan bisa diatur setelah masuk.
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="surface-paper p-5">
            <feature.icon className="size-5 text-primary" />
            <h2 className="mt-3 text-lg">{feature.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{feature.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
