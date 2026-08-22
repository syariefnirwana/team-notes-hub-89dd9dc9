import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Plus, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { PersonAvatar, PersonMark, TeamRoleBadge } from "@/components/person-mark";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile, useSession } from "@/hooks/use-session";
import { createNote, fetchNotes, fetchProfiles, type Profile } from "@/lib/notes";
import { dayKey, formatDate, formatDateTime, personColor } from "@/lib/people";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Catatan — Catatan Studio PWK" },
      {
        name: "description",
        content:
          "Semua catatan kelompok studio dikelompokkan per tanggal, lengkap dengan penulis, pengubah terakhir, dan daftar peran anggota.",
      },
      { property: "og:title", content: "Dashboard Catatan — Catatan Studio PWK" },
      {
        property: "og:description",
        content: "Catatan kelompok per tanggal beserta penulis dan peran anggota.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: me } = useMyProfile();

  const notesQuery = useQuery({ queryKey: ["notes"], queryFn: fetchNotes });
  const profilesQuery = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    (profilesQuery.data ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [profilesQuery.data]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof notesQuery.data>();
    (notesQuery.data ?? []).forEach((note) => {
      const key = dayKey(note.created_at);
      const list = groups.get(key) ?? [];
      list.push(note);
      groups.set(key, list);
    });
    return [...groups.entries()];
  }, [notesQuery.data]);

  const create = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Belum masuk");
      if (!title.trim()) throw new Error("Judul catatan belum diisi");
      return createNote({ title: title.trim(), content, userId: user.id });
    },
    onSuccess: () => {
      toast.success("Catatan dibuat");
      setOpen(false);
      setTitle("");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_18rem]">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl">Catatan kelompok</h1>
              <p className="text-sm text-muted-foreground">
                Dikelompokkan berdasarkan tanggal pembuatan.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" /> Catatan baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Catatan baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="note-title">Judul catatan</Label>
                    <Input
                      id="note-title"
                      value={title}
                      maxLength={140}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Contoh: Rapat progres survei lapangan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Isi catatan</Label>
                    <RichTextEditor
                      value=""
                      autoFocus
                      submitLabel="Buat catatan"
                      saving={create.isPending}
                      onSave={(html) => create.mutate(html)}
                      onCancel={() => setOpen(false)}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="mt-6 space-y-8">
            {notesQuery.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : grouped.length === 0 ? (
              <div className="surface-paper p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada catatan. Buat catatan pertama kelompok kamu.
                </p>
              </div>
            ) : (
              grouped.map(([key, notes]) => (
                <div key={key}>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CalendarDays className="size-4" />
                    {formatDate(notes![0]!.created_at)}
                  </div>
                  <div className="space-y-3">
                    {notes!.map((note) => {
                      const author = profileById.get(note.author_id);
                      const editor = note.updated_by ? profileById.get(note.updated_by) : undefined;
                      const edited = note.updated_at !== note.created_at;
                      return (
                        <Link
                          key={note.id}
                          to="/notes/$noteId"
                          params={{ noteId: note.id }}
                          className="surface-paper person-tint block p-5 transition-shadow hover:shadow-lift"
                          style={{ "--person-color": personColor(note.author_id) } as React.CSSProperties}
                        >
                          <h2 className="text-lg">{note.title}</h2>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              Dibuat oleh <PersonMark person={author} />
                            </span>
                            <span>{formatDateTime(note.created_at)}</span>
                            {edited ? (
                              <span className="flex items-center gap-1">
                                <Pencil className="size-3" /> Terakhir diubah{" "}
                                <PersonMark person={editor} /> · {formatDateTime(note.updated_at)}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="surface-paper p-5">
            <h2 className="text-base">Anggota kelompok</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Peran ini menunjukkan penanggung jawab kelompok.
            </p>
            <ul className="mt-4 space-y-3">
              {(profilesQuery.data ?? []).map((person) => (
                <li key={person.id} className="flex items-center gap-3">
                  <PersonAvatar person={person} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{person.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                  </div>
                  <TeamRoleBadge person={person} />
                </li>
              ))}
            </ul>
          </div>

          {me?.isAdmin ? (
            <Link
              to="/settings"
              className="surface-paper flex items-center gap-2 p-4 text-sm font-medium transition-shadow hover:shadow-lift"
            >
              <ShieldCheck className="size-4 text-primary" /> Pengaturan anggota
            </Link>
          ) : null}
        </aside>
      </main>
    </div>
  );
}
