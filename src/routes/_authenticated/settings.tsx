import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarPlus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { AppHeader } from "@/components/app-header";
import { PersonAvatar } from "@/components/person-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useMyProfile, useSession } from "@/hooks/use-session";
import {
  createTimelineEvent,
  deleteMember,
  deleteTimelineEvent,
  fetchProfiles,
  fetchTimeline,
  updateMember,
  type Profile,
} from "@/lib/notes";
import {
  AGENDA_MANAGER_ROLES,
  formatDateTime,
  TEAM_ROLES,
  TEAM_ROLE_LABEL,
  TIMELINE_KINDS,
  TIMELINE_KIND_LABEL,
  type TeamRole,
  type TimelineKind,
} from "@/lib/people";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan Anggota & Agenda — MyCatatanGwe" },
      {
        name: "description",
        content:
          "Halaman khusus pengurus untuk mengatur nama tampilan, peran anggota kelompok, dan agenda penting kelompok studio.",
      },
      { property: "og:title", content: "Pengaturan Anggota & Agenda — MyCatatanGwe" },
      { property: "og:description", content: "Atur anggota kelompok dan agenda penting kelompok studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { data: me, isPending } = useMyProfile();
  const profilesQuery = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  if (isPending) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    );
  }

  const isAdmin = Boolean(me?.isAdmin);
  const canManageAgenda =
    isAdmin || (me?.profile ? AGENDA_MANAGER_ROLES.includes(me.profile.team_role as TeamRole) : false);

  if (!isAdmin && !canManageAgenda) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl">Halaman tidak tersedia</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pengaturan ini hanya bisa dibuka oleh admin dan pengurus kelompok.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Dashboard
        </Link>
        <div className="mt-4 flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h1 className="text-2xl">Pengaturan</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Atur nama tampilan, peran anggota, dan agenda kelompok. Halaman ini tersembunyi dari anggota biasa."
            : "Atur agenda kelompok. Pengaturan anggota hanya untuk admin."}
        </p>

        {isAdmin ? (
          <section className="mt-8">
            <h2 className="text-lg">Anggota kelompok</h2>
            <div className="mt-3 space-y-3">
              {(profilesQuery.data ?? []).map((person) => (
                <MemberRow key={person.id} person={person} selfId={me?.profile?.id ?? null} />
              ))}
            </div>
          </section>
        ) : null}

        {canManageAgenda ? <AgendaSection /> : null}
      </main>
    </div>
  );
}

function MemberRow({ person, selfId }: { person: Profile; selfId: string | null }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState(person.username);
  const [teamRole, setTeamRole] = useState<TeamRole>(person.team_role);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.invalidateQueries({ queryKey: ["my-profile"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const name = username.trim();
      if (!name) throw new Error("Nama tampilan tidak boleh kosong");
      if (name.length > 60) throw new Error("Nama tampilan maksimal 60 karakter");
      await updateMember({ id: person.id, username: name, teamRole });
    },
    onSuccess: () => {
      toast.success("Data anggota diperbarui");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: () => deleteMember(person.id),
    onSuccess: () => {
      toast.success("Anggota dihapus");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dirty = username !== person.username || teamRole !== person.team_role;

  return (
    <div className="surface-paper flex flex-wrap items-end gap-4 p-4">
      <div className="flex items-center gap-3">
        <PersonAvatar person={person} />
        <div>
          <p className="text-xs text-muted-foreground">{person.email}</p>
        </div>
      </div>
      <div className="min-w-40 flex-1 space-y-1.5">
        <Label htmlFor={`name-${person.id}`}>Nama tampilan</Label>
        <Input
          id={`name-${person.id}`}
          value={username}
          maxLength={60}
          onChange={(event) => setUsername(event.target.value)}
        />
      </div>
      <div className="w-40 space-y-1.5">
        <Label>Peran</Label>
        <Select value={teamRole} onValueChange={(value) => setTeamRole(value as TeamRole)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEAM_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {TEAM_ROLE_LABEL[role]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Menyimpan…" : "Simpan"}
      </Button>
      {person.id !== selfId ? (
        <Button
          variant="ghost"
          className="text-destructive"
          aria-label={`Hapus ${person.username}`}
          disabled={remove.isPending}
          onClick={() => {
            if (confirm(`Hapus ${person.username} dari daftar anggota?`)) remove.mutate();
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function AgendaSection() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const timelineQuery = useQuery({ queryKey: ["timeline"], queryFn: fetchTimeline });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<TimelineKind>("meeting");
  const [eventAt, setEventAt] = useState("");
  const [location, setLocation] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["timeline"] });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Belum masuk");
      if (!title.trim()) throw new Error("Judul agenda tidak boleh kosong");
      if (!eventAt) throw new Error("Tanggal & waktu agenda wajib diisi");
      const desc = description.trim();
      const loc = location.trim();
      await createTimelineEvent({
        title: title.trim(),
        kind,
        eventAt,
        userId: user.id,
        ...(desc ? { description: desc } : {}),
        ...(loc ? { location: loc } : {}),
      });
    },
    onSuccess: () => {
      toast.success("Agenda ditambahkan");
      setTitle("");
      setDescription("");
      setLocation("");
      setEventAt("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTimelineEvent(id),
    onSuccess: () => {
      toast.success("Agenda dihapus");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="mt-10">
      <h2 className="text-lg">Timeline kelompok</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Masukkan tanggal penting seperti zoom, meeting, survey lapangan, atau asistensi dosen.
      </p>

      <div className="surface-paper mt-3 space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="agenda-title">Judul</Label>
            <Input
              id="agenda-title"
              value={title}
              maxLength={120}
              placeholder="Asistensi Dosen Pertemuan 5"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agenda-date">Tanggal & waktu</Label>
            <Input
              id="agenda-date"
              type="datetime-local"
              value={eventAt}
              onChange={(event) => setEventAt(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Jenis</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as TimelineKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMELINE_KINDS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {TIMELINE_KIND_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agenda-location">Lokasi / tautan</Label>
            <Input
              id="agenda-location"
              value={location}
              maxLength={160}
              placeholder="Ruang studio / link Zoom"
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="agenda-desc">Catatan agenda</Label>
          <Textarea
            id="agenda-desc"
            value={description}
            rows={2}
            placeholder="Bawa peta hasil survey, bahas progres bab 2."
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button disabled={create.isPending} onClick={() => create.mutate()}>
            <CalendarPlus className="size-4" />
            {create.isPending ? "Menyimpan…" : "Tambah agenda"}
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(timelineQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada agenda tercatat.</p>
        ) : (
          (timelineQuery.data ?? []).map((event) => (
            <div key={event.id} className="surface-paper flex flex-wrap items-center gap-3 p-3">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                {TIMELINE_KIND_LABEL[event.kind]}
              </span>
              <div className="min-w-40 flex-1">
                <p className="text-sm">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(event.event_at)}
                  {event.location ? ` · ${event.location}` : ""}
                </p>
                {event.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                ) : null}
              </div>
              <Button
                variant="ghost"
                className="text-destructive"
                aria-label={`Hapus agenda ${event.title}`}
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm("Hapus agenda ini?")) remove.mutate(event.id);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
