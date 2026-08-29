import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  CalendarDays,
  ChevronLeft,
  Clock,
  MapPin,
  Settings2,
} from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { fetchTimeline } from "@/lib/notes";
import { useMyProfile } from "@/hooks/use-session";
import {
  AGENDA_MANAGER_ROLES,
  TIMELINE_KIND_LABEL,
  formatDate,
  formatDateTime,
} from "@/lib/people";
import type { TimelineEvent } from "@/lib/notes";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { title: "Timeline Kelompok — MyCatatanGwe" },
      {
        name: "description",
        content:
          "Timeline lengkap agenda kelompok studio: zoom, meeting, survey, asistensi, dan tenggat.",
      },
      { property: "og:title", content: "Timeline Kelompok — MyCatatanGwe" },
      {
        property: "og:description",
        content: "Semua tanggal penting kelompok studio dalam satu timeline.",
      },
    ],
  }),
  component: TimelinePage,
});

const MONTH_FMT = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

function monthKey(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function TimelinePage() {
  const timelineQuery = useQuery({ queryKey: ["timeline"], queryFn: fetchTimeline });
  const { data: me } = useMyProfile();

  const canManage = useMemo(() => {
    if (me?.isAdmin) return true;
    const role = me?.profile?.team_role;
    return role ? AGENDA_MANAGER_ROLES.includes(role) : false;
  }, [me]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const events = timelineQuery.data ?? [];
    return {
      upcoming: events.filter((e) => new Date(e.event_at).getTime() >= now),
      past: events.filter((e) => new Date(e.event_at).getTime() < now).reverse(),
    };
  }, [timelineQuery.data]);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" /> Kembali ke dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-semibold">Timeline kelompok</h1>
            <p className="text-sm text-muted-foreground">
              Semua tanggal penting selama kelompok studio berjalan.
            </p>
          </div>
          {canManage ? (
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-shadow hover:shadow-lift"
            >
              <Settings2 className="size-4 text-primary" /> Kelola agenda
            </Link>
          ) : null}
        </div>

        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays className="size-4 text-primary" /> Agenda mendatang
          </h2>
          <EventGroups events={upcoming} empty="Belum ada agenda terjadwal." />
        </section>

        <section className="mt-10">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="size-4 text-muted-foreground" /> Riwayat agenda
          </h2>
          <EventGroups events={past} empty="Belum ada agenda yang berlalu." muted />
        </section>
      </main>
    </div>
  );
}

function EventGroups({
  events,
  empty,
  muted,
}: {
  events: TimelineEvent[];
  empty: string;
  muted?: boolean;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const event of events) {
      const key = monthKey(event.event_at);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [events]);

  if (events.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="mt-4 space-y-6">
      {groups.map(([key, list]) => (
        <div key={key}>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {MONTH_FMT.format(new Date(list[0]!.event_at))}
          </p>
          <ul className="mt-2 space-y-2">
            {list.map((event) => (
              <li
                key={event.id}
                className={`surface-paper p-4 ${muted ? "opacity-70" : ""}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{event.title}</p>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                    {TIMELINE_KIND_LABEL[event.kind]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(event.event_at)}
                  {event.location ? (
                    <span className="inline-flex items-center gap-1">
                      {" "}
                      · <MapPin className="size-3" /> {event.location}
                    </span>
                  ) : null}
                </p>
                {event.description ? (
                  <p className="mt-2 text-sm whitespace-pre-wrap">{event.description}</p>
                ) : null}
                <p className="sr-only">{formatDate(event.event_at)}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
