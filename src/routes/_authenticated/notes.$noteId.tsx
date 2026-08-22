import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  History,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppHeader } from "@/components/app-header";
import { NoteImage } from "@/components/note-image";
import { PersonAvatar, PersonMark } from "@/components/person-mark";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import {
  addBlock,
  deleteBlock,
  deleteNote,
  fetchNote,
  fetchProfiles,
  renameNote,
  updateBlock,
  uploadNoteImage,
  type NoteBlock,
  type Profile,
} from "@/lib/notes";
import { formatDateTime, personColor } from "@/lib/people";

export const Route = createFileRoute("/_authenticated/notes/$noteId")({
  head: () => ({
    meta: [
      { title: "Detail Catatan — Catatan Studio PWK" },
      {
        name: "description",
        content:
          "Baca dan sunting catatan kelompok studio: setiap bagian menampilkan penulisnya, pengubah terakhir, dan riwayat perubahannya.",
      },
      { property: "og:title", content: "Detail Catatan — Catatan Studio PWK" },
      {
        property: "og:description",
        content: "Catatan kelompok dengan penanda penulis per bagian dan riwayat perubahan.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoteDetail,
});

const ACTION_LABEL: Record<string, string> = {
  created: "membuat catatan",
  renamed: "mengubah judul",
  added: "menambah bagian",
  edited: "mengubah bagian",
  removed: "menghapus bagian",
};

function NoteDetail() {
  const { noteId } = Route.useParams();
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const noteQuery = useQuery({ queryKey: ["note", noteId], queryFn: () => fetchNote(noteId) });
  const profilesQuery = useQuery({ queryKey: ["profiles"], queryFn: fetchProfiles });

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [addingText, setAddingText] = useState(false);

  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    (profilesQuery.data ?? []).forEach((p) => map.set(p.id, p));
    return map;
  }, [profilesQuery.data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["note", noteId] });
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  };

  const rename = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Belum masuk");
      const title = titleDraft.trim();
      if (!title) throw new Error("Judul tidak boleh kosong");
      if (title.length > 140) throw new Error("Judul maksimal 140 karakter");
      await renameNote({ noteId, title, userId: user.id });
    },
    onSuccess: () => {
      setEditingTitle(false);
      toast.success("Judul diperbarui");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addText = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Belum masuk");
      const position = (noteQuery.data?.blocks.length ?? 0) + 1;
      await addBlock({ noteId, userId: user.id, position, kind: "text", content });
    },
    onSuccess: () => {
      setAddingText(false);
      toast.success("Bagian ditambahkan");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addImage = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Belum masuk");
      if (!file.type.startsWith("image/")) throw new Error("Berkas harus berupa gambar");
      if (file.size > 8 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 8 MB");
      const path = await uploadNoteImage({ file, userId: user.id, noteId });
      const position = (noteQuery.data?.blocks.length ?? 0) + 1;
      await addBlock({ noteId, userId: user.id, position, kind: "image", imageUrl: path });
    },
    onSuccess: () => {
      toast.success("Gambar ditambahkan");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeBlock = useMutation({
    mutationFn: async (blockId: string) => {
      if (!user) throw new Error("Belum masuk");
      await deleteBlock({ blockId, noteId, userId: user.id });
    },
    onSuccess: () => {
      toast.success("Bagian dihapus");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeNote = useMutation({
    mutationFn: () => deleteNote(noteId),
    onSuccess: () => {
      toast.success("Catatan dihapus");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (noteQuery.isPending) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </main>
      </div>
    );
  }

  const note = noteQuery.data?.note;
  if (!note) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-2xl">Catatan tidak ditemukan</h1>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </main>
      </div>
    );
  }

  const author = profileById.get(note.author_id);
  const lastEditor = note.updated_by ? profileById.get(note.updated_by) : undefined;
  const blocks = noteQuery.data?.blocks ?? [];
  const versions = noteQuery.data?.versions ?? [];
  const canDeleteNote = user?.id === note.author_id;

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_18rem]">
        <article>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Semua catatan
          </Link>

          <div className="mt-4">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={titleDraft}
                  maxLength={140}
                  autoFocus
                  onChange={(event) => setTitleDraft(event.target.value)}
                />
                <Button size="icon" onClick={() => rename.mutate()} disabled={rename.isPending}>
                  <Check className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditingTitle(false)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <h1 className="flex-1 text-3xl">{note.title}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Ubah judul"
                  onClick={() => {
                    setTitleDraft(note.title);
                    setEditingTitle(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                Penanggung jawab <PersonMark person={author} />
              </span>
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3" /> Dibuat {formatDateTime(note.created_at)}
              </span>
              {note.updated_at !== note.created_at ? (
                <span className="flex items-center gap-1">
                  <Pencil className="size-3" /> Terakhir diubah <PersonMark person={lastEditor} /> ·{" "}
                  {formatDateTime(note.updated_at)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {blocks.length === 0 ? (
              <div className="surface-paper p-6 text-sm text-muted-foreground">
                Catatan ini masih kosong. Tambahkan bagian teks atau gambar di bawah.
              </div>
            ) : (
              blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  creator={profileById.get(block.created_by)}
                  editor={profileById.get(block.updated_by)}
                  noteId={noteId}
                  onDelete={() => removeBlock.mutate(block.id)}
                  onSaved={refresh}
                />
              ))
            )}
          </div>

          <div className="mt-6">
            {addingText ? (
              <RichTextEditor
                value=""
                autoFocus
                submitLabel="Tambah bagian"
                saving={addText.isPending}
                onSave={(html) => addText.mutate(html)}
                onCancel={() => setAddingText(false)}
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setAddingText(true)}>
                  <Plus className="size-4" /> Tambah bagian teks
                </Button>
                <Button
                  variant="secondary"
                  disabled={addImage.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="size-4" />
                  {addImage.isPending ? "Mengunggah…" : "Tambah gambar"}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) addImage.mutate(file);
                    event.target.value = "";
                  }}
                />
                {canDeleteNote ? (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Hapus catatan ini beserta seluruh isinya?")) removeNote.mutate();
                    }}
                  >
                    <Trash2 className="size-4" /> Hapus catatan
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </article>

        <aside className="space-y-4">
          <div className="surface-paper p-5">
            <h2 className="flex items-center gap-2 text-base">
              <History className="size-4 text-primary" /> Riwayat perubahan
            </h2>
            <ol className="mt-4 space-y-3">
              {versions.map((version) => {
                const person = profileById.get(version.editor_id);
                return (
                  <li key={version.id} className="flex gap-3">
                    <PersonAvatar person={person} size="size-7" />
                    <div className="min-w-0">
                      <p className="text-xs">
                        <span className="font-medium">{person?.username ?? "Anggota"}</span>{" "}
                        {ACTION_LABEL[version.action] ?? version.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(version.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </main>
    </div>
  );
}

function BlockCard({
  block,
  creator,
  editor,
  noteId,
  onDelete,
  onSaved,
}: {
  block: NoteBlock;
  creator?: Profile | undefined;
  editor?: Profile | undefined;
  noteId: string;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const { user } = useSession();
  const [editing, setEditing] = useState(false);

  const save = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("Belum masuk");
      await updateBlock({ blockId: block.id, noteId, userId: user.id, content });
    },
    onSuccess: () => {
      setEditing(false);
      toast.success("Bagian diperbarui");
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const wasEdited = block.updated_by !== block.created_by || block.updated_at !== block.created_at;

  return (
    <section
      className="surface-paper person-tint p-5"
      style={{ "--person-color": personColor(block.updated_by) } as React.CSSProperties}
    >
      {editing ? (
        <RichTextEditor
          value={block.content}
          autoFocus
          saving={save.isPending}
          onSave={(html) => save.mutate(html)}
          onCancel={() => setEditing(false)}
        />
      ) : block.kind === "image" && block.image_url ? (
        <NoteImage path={block.image_url} alt={`Gambar pada catatan`} />
      ) : (
        <div className="note-prose text-sm" dangerouslySetInnerHTML={{ __html: block.content }} />
      )}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1">
            Ditulis <PersonMark person={creator} /> · {formatDateTime(block.created_at)}
          </span>
          {wasEdited ? (
            <span className="flex items-center gap-1">
              Diubah <PersonMark person={editor} /> · {formatDateTime(block.updated_at)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {block.kind === "text" ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (confirm("Hapus bagian ini?")) onDelete();
            }}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </footer>
    </section>
  );
}
