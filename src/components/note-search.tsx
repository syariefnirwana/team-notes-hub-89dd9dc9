import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { Note } from "@/lib/notes";
import { formatDate, NOTE_CATEGORY_LABEL } from "@/lib/people";

export function NoteSearch({ notes }: { notes: Note[] }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (q.length < 2) return [];
    return notes
      .filter(
        (note) =>
          note.title.toLowerCase().includes(q) ||
          NOTE_CATEGORY_LABEL[note.category].toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [term, notes]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        placeholder="Cari catatan…"
        className="pl-9"
        aria-label="Cari catatan"
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 ? (
        <ul className="surface-paper absolute z-30 mt-2 w-full overflow-hidden p-1">
          {suggestions.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-secondary"
                onClick={() => {
                  setTerm("");
                  setOpen(false);
                  navigate({ to: "/notes/$noteId", params: { noteId: note.id } });
                }}
              >
                <span className="block truncate text-sm font-medium">{note.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {NOTE_CATEGORY_LABEL[note.category]} · {formatDate(note.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
