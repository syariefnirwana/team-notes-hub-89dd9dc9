import { supabase } from "@/integrations/supabase/client";
import type { TeamRole } from "@/lib/people";

export type Profile = {
  id: string;
  email: string | null;
  username: string;
  avatar_url: string | null;
  team_role: TeamRole;
  created_at: string;
};

export type Note = {
  id: string;
  title: string;
  author_id: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteBlock = {
  id: string;
  note_id: string;
  position: number;
  kind: "text" | "image";
  content: string;
  image_url: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type NoteVersion = {
  id: string;
  note_id: string;
  editor_id: string;
  action: string;
  summary: string | null;
  created_at: string;
};

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, username, avatar_url, team_role, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function fetchAdminIds(): Promise<string[]> {
  const { data, error } = await supabase.from("user_roles").select("user_id, role").eq("role", "admin");
  if (error) throw error;
  return (data ?? []).map((row) => row.user_id);
}

export async function fetchNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Note[];
}

export async function fetchNote(noteId: string) {
  const [noteRes, blocksRes, versionsRes] = await Promise.all([
    supabase.from("notes").select("*").eq("id", noteId).maybeSingle(),
    supabase.from("note_blocks").select("*").eq("note_id", noteId).order("position", { ascending: true }),
    supabase
      .from("note_versions")
      .select("*")
      .eq("note_id", noteId)
      .order("created_at", { ascending: false }),
  ]);
  if (noteRes.error) throw noteRes.error;
  if (blocksRes.error) throw blocksRes.error;
  if (versionsRes.error) throw versionsRes.error;

  return {
    note: noteRes.data as Note | null,
    blocks: (blocksRes.data ?? []) as NoteBlock[],
    versions: (versionsRes.data ?? []) as NoteVersion[],
  };
}

export async function logVersion(input: {
  noteId: string;
  userId: string;
  action: string;
  summary?: string;
}) {
  const { error } = await supabase.from("note_versions").insert({
    note_id: input.noteId,
    editor_id: input.userId,
    action: input.action,
    summary: input.summary ?? null,
  });
  if (error) throw error;
}

export async function createNote(input: { title: string; content: string; userId: string }) {
  const { data, error } = await supabase
    .from("notes")
    .insert({ title: input.title, author_id: input.userId, updated_by: input.userId })
    .select("id")
    .single();
  if (error) throw error;

  if (input.content.trim()) {
    const { error: blockError } = await supabase.from("note_blocks").insert({
      note_id: data.id,
      position: 0,
      kind: "text",
      content: input.content,
      created_by: input.userId,
      updated_by: input.userId,
    });
    if (blockError) throw blockError;
  }

  await logVersion({ noteId: data.id, userId: input.userId, action: "created", summary: "Membuat catatan" });
  return data.id as string;
}

export async function renameNote(input: { noteId: string; title: string; userId: string }) {
  const { error } = await supabase
    .from("notes")
    .update({ title: input.title, updated_by: input.userId })
    .eq("id", input.noteId);
  if (error) throw error;
  await logVersion({
    noteId: input.noteId,
    userId: input.userId,
    action: "renamed",
    summary: `Judul diubah menjadi "${input.title}"`,
  });
}

export async function touchNote(input: { noteId: string; userId: string }) {
  const { error } = await supabase
    .from("notes")
    .update({ updated_by: input.userId })
    .eq("id", input.noteId);
  if (error) throw error;
}

export async function addBlock(input: {
  noteId: string;
  userId: string;
  position: number;
  kind: "text" | "image";
  content?: string;
  imageUrl?: string;
}) {
  const { error } = await supabase.from("note_blocks").insert({
    note_id: input.noteId,
    position: input.position,
    kind: input.kind,
    content: input.content ?? "",
    image_url: input.imageUrl ?? null,
    created_by: input.userId,
    updated_by: input.userId,
  });
  if (error) throw error;
  await touchNote({ noteId: input.noteId, userId: input.userId });
  await logVersion({
    noteId: input.noteId,
    userId: input.userId,
    action: "added",
    summary: input.kind === "image" ? "Menambah gambar" : "Menambah bagian baru",
  });
}

export async function updateBlock(input: {
  blockId: string;
  noteId: string;
  userId: string;
  content: string;
}) {
  const { error } = await supabase
    .from("note_blocks")
    .update({ content: input.content, updated_by: input.userId })
    .eq("id", input.blockId);
  if (error) throw error;
  await touchNote({ noteId: input.noteId, userId: input.userId });
  await logVersion({
    noteId: input.noteId,
    userId: input.userId,
    action: "edited",
    summary: "Mengubah isi salah satu bagian",
  });
}

export async function deleteBlock(input: { blockId: string; noteId: string; userId: string }) {
  const { error } = await supabase.from("note_blocks").delete().eq("id", input.blockId);
  if (error) throw error;
  await touchNote({ noteId: input.noteId, userId: input.userId });
  await logVersion({
    noteId: input.noteId,
    userId: input.userId,
    action: "removed",
    summary: "Menghapus salah satu bagian",
  });
}

export async function deleteNote(noteId: string) {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;
}

export async function uploadNoteImage(input: { file: File; userId: string; noteId: string }) {
  const ext = input.file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${input.userId}/${input.noteId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("note-images").upload(path, input.file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signedImageUrl(path: string) {
  const { data, error } = await supabase.storage.from("note-images").createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function updateMember(input: { id: string; username?: string; teamRole?: TeamRole }) {
  const payload: Record<string, unknown> = {};
  if (input.username !== undefined) payload.username = input.username;
  if (input.teamRole !== undefined) payload.team_role = input.teamRole;
  const { error } = await supabase.from("profiles").update(payload).eq("id", input.id);
  if (error) throw error;
}
