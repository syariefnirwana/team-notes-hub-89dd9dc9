import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials, personColor, TEAM_ROLE_LABEL } from "@/lib/people";
import type { Profile } from "@/lib/notes";

export function PersonMark({ person, subtitle }: { person?: Profile | undefined; subtitle?: string | undefined }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="person-dot" style={{ "--person-color": personColor(person?.id) } as React.CSSProperties} />
      <span className="font-medium text-foreground">{person?.username ?? "Anggota"}</span>
      {subtitle ? <span className="text-muted-foreground">{subtitle}</span> : null}
    </span>
  );
}

export function PersonAvatar({ person, size = "size-9" }: { person?: Profile | undefined; size?: string }) {
  return (
    <Avatar className={size} style={{ "--person-color": personColor(person?.id) } as React.CSSProperties}>
      {person?.avatar_url ? <AvatarImage src={person.avatar_url} alt={person.username} /> : null}
      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
        {initials(person?.username)}
      </AvatarFallback>
    </Avatar>
  );
}

export function TeamRoleBadge({ person }: { person: Profile }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
      {TEAM_ROLE_LABEL[person.team_role]}
    </span>
  );
}
