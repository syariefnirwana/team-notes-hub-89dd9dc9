export const TEAM_ROLES = ["dosen", "ketua", "wakil", "sekretaris", "bendahara", "anggota"] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  dosen: "Dosen Pembimbing",
  ketua: "Ketua",
  wakil: "Wakil Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  anggota: "Anggota",
};

/** Display order: dosen pembimbing first, anggota biasa last. */
export const TEAM_ROLE_ORDER: Record<TeamRole, number> = {
  dosen: 0,
  ketua: 1,
  wakil: 2,
  sekretaris: 3,
  bendahara: 4,
  anggota: 5,
};

export function sortByTeamRole<T extends { team_role: TeamRole; username: string }>(people: T[]) {
  return [...people].sort((a, b) => {
    const diff = (TEAM_ROLE_ORDER[a.team_role] ?? 9) - (TEAM_ROLE_ORDER[b.team_role] ?? 9);
    if (diff !== 0) return diff;
    return a.username.localeCompare(b.username, "id-ID");
  });
}

/** Roles allowed to manage the group agenda/timeline (mirrors the database rule). */
export const AGENDA_MANAGER_ROLES: TeamRole[] = ["ketua", "wakil", "sekretaris", "bendahara"];

export const NOTE_CATEGORIES = ["rapat", "survey", "arahan_dosen", "analisis", "data"] as const;

export type NoteCategory = (typeof NOTE_CATEGORIES)[number];

export const NOTE_CATEGORY_LABEL: Record<NoteCategory, string> = {
  rapat: "Rapat",
  survey: "Survey",
  arahan_dosen: "Arahan Dosen",
  analisis: "Analisis",
  data: "Data",
};

export const TIMELINE_KINDS = ["zoom", "meeting", "survey", "asistensi", "deadline", "lainnya"] as const;

export type TimelineKind = (typeof TIMELINE_KINDS)[number];

export const TIMELINE_KIND_LABEL: Record<TimelineKind, string> = {
  zoom: "Zoom",
  meeting: "Meeting",
  survey: "Survey Lapangan",
  asistensi: "Asistensi Dosen",
  deadline: "Tenggat",
  lainnya: "Lainnya",
};

/** Stable per-person tint token so every member keeps the same mark color. */
export function personColor(id: string | null | undefined) {
  if (!id) return "var(--muted-foreground)";
  return `var(--person-${personIndex(id)})`;
}

export function personIndex(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  }
  return (hash % 8) + 1;
}

/** Concrete color (not a CSS var) for canvas-free cursor overlays. */
const PERSON_HEX = [
  "#5b8def",
  "#2bb3a3",
  "#4faa54",
  "#d79a2b",
  "#e0655c",
  "#c46bbd",
  "#8b6ee0",
  "#3fa8c9",
];

export function personHex(id: string | null | undefined) {
  if (!id) return "#7b8a9c";
  return PERSON_HEX[personIndex(id) - 1] ?? "#7b8a9c";
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const TIME_FMT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string) {
  return DATE_FMT.format(new Date(value));
}

export function formatDateTime(value: string) {
  return TIME_FMT.format(new Date(value));
}

export function dayKey(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return formatDate(value);
}
