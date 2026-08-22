import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { PersonAvatar } from "@/components/person-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/hooks/use-session";
import { fetchProfiles, updateMember, type Profile } from "@/lib/notes";
import { TEAM_ROLES, TEAM_ROLE_LABEL, type TeamRole } from "@/lib/people";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Pengaturan Anggota — Catatan Studio PWK" },
      {
        name: "description",
        content: "Halaman khusus admin untuk mengatur nama tampilan dan peran setiap anggota kelompok studio.",
      },
      { property: "og:title", content: "Pengaturan Anggota — Catatan Studio PWK" },
      { property: "og:description", content: "Atur nama tampilan dan peran anggota kelompok." },
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

  if (!me?.isAdmin) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl">Halaman tidak tersedia</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pengaturan anggota hanya bisa dibuka oleh admin kelompok.
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
          <h1 className="text-2xl">Pengaturan anggota</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur nama tampilan dan peran tiap anggota. Halaman ini hanya terlihat untuk admin.
        </p>

        <div className="mt-6 space-y-3">
          {(profilesQuery.data ?? []).map((person) => (
            <MemberRow key={person.id} person={person} />
          ))}
        </div>
      </main>
    </div>
  );
}

function MemberRow({ person }: { person: Profile }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState(person.username);
  const [teamRole, setTeamRole] = useState<TeamRole>(person.team_role);

  const save = useMutation({
    mutationFn: async () => {
      const name = username.trim();
      if (!name) throw new Error("Nama tampilan tidak boleh kosong");
      if (name.length > 60) throw new Error("Nama tampilan maksimal 60 karakter");
      await updateMember({ id: person.id, username: name, teamRole });
    },
    onSuccess: () => {
      toast.success("Data anggota diperbarui");
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
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
    </div>
  );
}
