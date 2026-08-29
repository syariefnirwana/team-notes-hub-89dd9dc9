import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CalendarDays, Plus, Pencil, ShieldCheck, Tag, Activity, Clock } from "lucide-react";
import { toast } from "sonner";

import { ActivityGraph } from "@/components/activity-graph";
import { AppHeader } from "@/components/app-header";
import { NoteSearch } from "@/components/note-search";
import { PersonAvatar, PersonMark, TeamRoleBadge } from "@/components/person-mark";
import { PresenceBar } from "@/components/presence-bar";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePresence } from "@/hooks/use-presence";
import { useMyProfile, useSession } from "@/hooks/use-session";
import {
  createNote,
  fetchActivity,
  fetchActivityStats,
  fetchNotes,
  fetchProfiles,
  fetchTimeline,
  type Profile,
} from "@/lib/notes";
import {
  dayKey,
  formatDate,
  formatDateTime,
  NOTE_CATEGORIES,
  NOTE_CATEGORY_LABEL,
  personColor,
  relativeTime,
  sortByTeamRole,
  TIMELINE_KIND_LABEL,
  type NoteCategory,
} from "@/lib/people";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Catatan — MyCatatanGwe" },
      {
        name: "description",
        content:
          "Semua catatan kelompok studio dikelompokkan per tanggal atau kategori, lengkap dengan penulis, aktivitas terbaru, dan daftar peran anggota.",
      },
      { property: "og:title", content: "Dashboard Catatan — MyCatatanGwe" },
      {
        property: "og:description",
        content: "Catatan kelompok per tanggal dan kategori beserta aktivitas serta peran anggota.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const ACTION_TEXT: Record<string, string> = {
  created: "membuat catatan",
  renamed: "mengubah judul",
  added: "menambah bagian pada",
  edited: "memperbarui",
  removed: "menghapus bagian pada",
  categorized: "mengubah kategori",
};

function Dashboard() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data: me } = useMyProfile();

  const notesQuery = useQuery({ queryKey: ["notes"], queryFn: fetchNotes });
  const profilesQuery = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });
  const activityQuery = useQuery({ queryKey: ["activity"], queryFn: () => fetchActivity(12) });
  const statsQuery = useQuery({ queryKey: ["activity-stats"], queryFn: fetchActivityStats });
  const timelineQuery = useQuery({ queryKey: ["timeline"], queryFn: fetchTimeline });

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NoteCategory>("rapat");
  const [groupMode, setGroupMode] = useState<"tanggal" | "kategori">("tanggal");

  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    (profilesQuery.data ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [profilesQuery.data]);

  const myProfile = me?.profile as Profile | null | undefined;
  const { peers } = usePresence(
    "group",
    user
      ? {
          userId: user.id,
          username: myProfile?.username ?? "Anggota",
          avatarUrl: myProfile?.avatar_url ?? null,
        }
      : null,
  );

  const notes = notesQuery.data ?? [];

  const grouped = useMemo(() => {
    if (groupMode === "kategori") {
      return NOTE_CATEGORIES.filter((cat) => notes.some((note) => note.category === cat)).map(
        (cat) =>
          [NOTE_CATEGORY_LABEL[cat], notes.filter((note) => note.category === cat)] as const,
      );
    }
    const groups = new Map<string, typeof notes>();
    notes.forEach((note) => {
      const key = dayKey(note.created_at);
      const list = groups.get(key) ?? [];
      list.push(note);
      groups.set(key, list);
    });
    return [...groups.entries()].map(
      ([, list]) => [formatDate(list[0]!.created_at), list] as const,
    );
  }, [notes, groupMode]);

  const upcoming = useMemo(
    () =>
      (timelineQuery.data ?? [])
        .filter((event) => new Date(event.event_at).getTime() >= Date.now() - 3600_000)
        .slice(0, 4),
    [timelineQuery.data],
  );

  const create = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Belum masuk");
      if (!title.trim()) throw new Error("Judul catatan belum diisi");
      return createNote({ title: title.trim(), content, category, userId: user.id });
    },
    onSuccess: () => {
      toast.success("Catatan dibuat");
      setOpen(false);
      setTitle("");
      setCategory("rapat");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      queryClient.invalidateQueries({ queryKey: ["activity-stats"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_18rem]">
        <section className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl">Catatan kelompok</h1>
              <p className="text-sm text-muted-foreground">
                Kelompokkan berdasarkan tanggal atau kategori catatan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PresenceBar peers={peers} profileById={profileById} />
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="size-4" /> Catatan baru
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Catatan baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
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
                        <Label>Kategori</Label>
                        <Select
                          value={category}
                          onValueChange={(value) => setCategory(value as NoteCategory)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {NOTE_CATEGORY_LABEL[cat]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <NoteSearch notes={notes} />
            <div className="flex rounded-xl border border-border p-1">
              {(["tanggal", "kategori"] as const).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={groupMode === mode ? "default" : "ghost"}
                  onClick={() => setGroupMode(mode)}
                >
                  {mode === "tanggal" ? (
                    <CalendarDays className="size-3.5" />
                  ) : (
                    <Tag className="size-3.5" />
                  )}
                  <span className="capitalize">{mode}</span>
                </Button>
              ))}
            </div>
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
              grouped.map(([label, list]) => (
                <div key={label}>
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    {groupMode === "tanggal" ? (
                      <CalendarDays className="size-4" />
                    ) : (
                      <Tag className="size-4" />
                    )}
                    {label}
                  </div>
                  <div className="space-y-3">
                    {list.map((note) => {
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
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h2 className="text-lg">{note.title}</h2>
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                              {NOTE_CATEGORY_LABEL[note.category]}
                            </span>
                          </div>
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

        <aside className="min-w-0 space-y-4">
          <ActivityGraph rows={statsQuery.data ?? []} />

          <div className="surface-paper p-5">
            <h2 className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" /> Aktivitas terbaru
            </h2>
            <ul className="mt-4 space-y-3">
              {(activityQuery.data ?? []).length === 0 ? (
                <li className="text-xs text-muted-foreground">Belum ada aktivitas.</li>
              ) : (
                (activityQuery.data ?? []).map((row) => {
                  const person = profileById.get(row.editor_id);
                  return (
                    <li key={row.id} className="flex gap-2">
                      <PersonAvatar person={person} size="size-7" />
                      <div className="min-w-0">
                        <p className="text-xs leading-snug">
                          <span className="font-medium">{person?.username ?? "Anggota"}</span>{" "}
                          {ACTION_TEXT[row.action] ?? row.action}{" "}
                          <span className="font-medium">{row.note_title ?? "catatan"}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {relativeTime(row.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          <div className="surface-paper p-5">
            <h2 className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-primary" /> Agenda mendatang
              </span>
              <Link to="/timeline" className="text-xs font-medium text-primary hover:underline">
                Lihat timeline
              </Link>
            </h2>
            <ul className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <li className="text-xs text-muted-foreground">Belum ada agenda terjadwal.</li>
              ) : (
                upcoming.map((event) => (
                  <li key={event.id} className="text-xs">
                    <p className="font-medium">{event.title}</p>
                    <p className="text-muted-foreground">
                      {TIMELINE_KIND_LABEL[event.kind]} · {formatDateTime(event.event_at)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="surface-paper p-5">
            <h2 className="text-base">Anggota kelompok</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Diurutkan sesuai peran tanggung jawab kelompok.
            </p>
            <ul className="mt-4 space-y-3">
              {sortByTeamRole(profilesQuery.data ?? []).map((person) => {
                const online = peers.some((peer) => peer.userId === person.id);
                return (
                  <li key={person.id} className="flex items-center gap-3">
                    <span className="relative">
                      <PersonAvatar person={person} />
                      {online ? (
                        <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{person.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                    </div>
                    <TeamRoleBadge person={person} />
                  </li>
                );
              })}
            </ul>
          </div>

          <Link
            to="/settings"
            className="surface-paper flex items-center gap-2 p-4 text-sm font-medium transition-shadow hover:shadow-lift"
          >
            <ShieldCheck className="size-4 text-primary" />
            {me?.isAdmin ? "Pengaturan anggota & agenda" : "Agenda kelompok"}
          </Link>
        </aside>
      </main>
    </div>
  );
}
