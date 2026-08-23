import { supabase } from "@/integrations/supabase/client";
import type { NoteCategory, TeamRole, TimelineKind } from "@/lib/people";

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
  category: NoteCategory;
  author_id: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type BlockKind = "text" | "image" | "todo";

export type NoteBlock = {
  id: string;
  note_id: string;
  position: number;
  kind: BlockKind;
  content: string;
  image_url: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export type TodoItem = { id: string; text: string; done: boolean };

export type VersionSnapshot = {
  block_id?: string;
  kind?: BlockKind;
  before?: string | null;
  after?: string | null;
  title_before?: string | null;
  title_after?: string | null;
} | null;

export type NoteVersion = {
  id: string;
  note_id: string;
  editor_id: string;
  action: string;
  summary: string | null;
  snapshot: VersionSnapshot;
  created_at: string;
};

export type TimelineEvent = {
  id: string;
  title: string;
  description: string | null;
  kind: TimelineKind;
  event_at: string;
  location: string | null;
  created_by: string;
  created_at: string;
};

export type ActivityRow = NoteVersion & { note_title: string | null };

export function parseTodos(content: string): TodoItem[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item.text === "string");
    }
  } catch {
    /* not json yet */
  }
  return [];
}

export function todoSummary(content: string) {
  const items = parseTodos(content);
  return { total: items.length, done: items.filter((item) => item.done).length };
}

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
  return (data ?? []) as unknown as Note[];
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
    note: noteRes.data as unknown as Note | null,
    blocks: (blocksRes.data ?? []) as NoteBlock[],
    versions: (versionsRes.data ?? []) as unknown as NoteVersion[],
  };
}

export async function fetchActivity(limit = 40): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from("note_versions")
    .select("*, notes(title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as NoteVersion),
    note_title: ((row["notes"] as { title?: string } | null)?.title ?? null) as string | null,
  }));
}

export async function fetchActivityStats(): Promise<{ created_at: string }[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("note_versions")
    .select("created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { created_at: string }[];
}

export async function logVersion(input: {
  noteId: string;
  userId: string;
  action: string;
  summary?: string;
  snapshot?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("note_versions").insert({
    note_id: input.noteId,
    editor_id: input.userId,
    action: input.action,
    summary: input.summary ?? null,
    snapshot: (input.snapshot ?? null) as never,
  });
  if (error) throw error;
}

export async function createNote(input: {
  title: string;
  content: string;
  category: NoteCategory;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      title: input.title,
      author_id: input.userId,
      updated_by: input.userId,
      category: input.category,
    } as never)
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

export async function renameNote(input: {
  noteId: string;
  title: string;
  userId: string;
  previousTitle: string;
}) {
  if (input.title === input.previousTitle) return;
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
    snapshot: { title_before: input.previousTitle, title_after: input.title },
  });
}

export async function updateNoteCategory(input: {
  noteId: string;
  category: NoteCategory;
  previousCategory: NoteCategory;
  userId: string;
}) {
  if (input.category === input.previousCategory) return;
  const { error } = await supabase
    .from("notes")
    .update({ category: input.category, updated_by: input.userId } as never)
    .eq("id", input.noteId);
  if (error) throw error;
  await logVersion({
    noteId: input.noteId,
    userId: input.userId,
    action: "categorized",
    summary: "Mengubah kategori catatan",
    snapshot: { before: input.previousCategory, after: input.category },
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
  kind: BlockKind;
  content?: string;
  imageUrl?: string;
}) {
  const { data, error } = await supabase
    .from("note_blocks")
    .insert({
      note_id: input.noteId,
      position: input.position,
      kind: input.kind,
      content: input.content ?? "",
      image_url: input.imageUrl ?? null,
      created_by: input.userId,
      updated_by: input.userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  await touchNote({ noteId: input.noteId, userId: input.userId });
  await logVersion({
    noteId: input.noteId,
    userId: input.userId,
    action: "added",
    summary:
      input.kind === "image"
        ? "Menambah gambar"
        : input.kind === "todo"
          ? "Menambah to do list"
          : "Menambah bagian baru",
    snapshot: { block_id: data.id, kind: input.kind, before: null, after: input.content ?? "" },
  });
}

/** Returns false when nothing changed, so the history stays clean. */
export async function updateBlock(input: {
  blockId: string;
  noteId: string;
  userId: string;
  content: string;
  previousContent: string;
  kind?: BlockKind;
  silent?: boolean;
}) {
  if (normalizeHtml(input.content) === normalizeHtml(input.previousContent)) return false;

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
    summary: input.kind === "todo" ? "Memperbarui to do list" : "Mengubah isi salah satu bagian",
    snapshot: {
      block_id: input.blockId,
      kind: input.kind ?? "text",
      before: input.previousContent,
      after: input.content,
    },
  });
  return true;
}

function normalizeHtml(value: string) {
  return value
    .replace(/<br\s*\/?>(\s*)$/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function deleteBlock(input: {
  blockId: string;
  noteId: string;
  userId: string;
  content?: string;
  kind?: BlockKind;
}) {
  const { error } = await supabase.from("note_blocks").delete().eq("id", input.blockId);
  if (error) throw error;
  await touchNote({ noteId: input.noteId, userId: input.userId });
  await logVersion({
    noteId: input.noteId,
    userId: input.userId,
    action: "removed",
    summary: "Menghapus salah satu bagian",
    snapshot: {
      block_id: input.blockId,
      kind: input.kind ?? "text",
      before: input.content ?? null,
      after: null,
    },
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
  const payload: { username?: string; team_role?: TeamRole } = {};
  if (input.username !== undefined) payload.username = input.username;
  if (input.teamRole !== undefined) payload.team_role = input.teamRole;
  const { error } = await supabase.from("profiles").update(payload as never).eq("id", input.id);
  if (error) throw error;
}

export async function deleteMember(id: string) {
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- Timeline / agenda kelompok ---------- */

export async function fetchTimeline(): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from("timeline_events")
    .select("*")
    .order("event_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TimelineEvent[];
}

export async function createTimelineEvent(input: {
  title: string;
  description?: string;
  kind: TimelineKind;
  eventAt: string;
  location?: string;
  userId: string;
}) {
  const { error } = await supabase.from("timeline_events").insert({
    title: input.title,
    description: input.description ?? null,
    kind: input.kind,
    event_at: new Date(input.eventAt).toISOString(),
    location: input.location ?? null,
    created_by: input.userId,
  } as never);
  if (error) throw error;
}

export async function deleteTimelineEvent(id: string) {
  const { error } = await supabase.from("timeline_events").delete().eq("id", id);
  if (error) throw error;
}
