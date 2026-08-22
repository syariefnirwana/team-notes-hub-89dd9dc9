export const TEAM_ROLES = ["ketua", "wakil", "sekretaris", "bendahara", "anggota"] as const;

export type TeamRole = (typeof TEAM_ROLES)[number];

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  ketua: "Ketua",
  wakil: "Wakil Ketua",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  anggota: "Anggota",
};

/** Stable per-person tint token so every member keeps the same mark color. */
export function personColor(id: string | null | undefined) {
  if (!id) return "var(--muted-foreground)";
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 100000;
  }
  return `var(--person-${(hash % 8) + 1})`;
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
