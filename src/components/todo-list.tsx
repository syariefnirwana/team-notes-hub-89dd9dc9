import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { parseTodos, type TodoItem } from "@/lib/notes";

export function TodoListBlock({
  content,
  saving,
  onChange,
}: {
  content: string;
  saving?: boolean;
  onChange: (nextContent: string) => void;
}) {
  const [items, setItems] = useState<TodoItem[]>(() => parseTodos(content));
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setItems(parseTodos(content));
  }, [content]);

  const commit = (next: TodoItem[]) => {
    setItems(next);
    onChange(JSON.stringify(next));
  };

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    commit([...items, { id: crypto.randomUUID(), text, done: false }]);
  };

  const done = items.filter((item) => item.done).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          To do list · {done}/{items.length} selesai
        </p>
        {saving ? <span className="text-xs text-muted-foreground">menyimpan…</span> : null}
      </div>

      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2">
            <Checkbox
              id={`todo-${item.id}`}
              checked={item.done}
              className="mt-0.5"
              onCheckedChange={(checked) =>
                commit(
                  items.map((row) =>
                    row.id === item.id ? { ...row, done: checked === true } : row,
                  ),
                )
              }
            />
            <label
              htmlFor={`todo-${item.id}`}
              className={`flex-1 cursor-pointer text-sm ${
                item.done ? "text-muted-foreground line-through" : ""
              }`}
            >
              {item.text}
            </label>
            <button
              type="button"
              aria-label="Hapus item"
              className="text-muted-foreground transition-colors hover:text-destructive"
              onClick={() => commit(items.filter((row) => row.id !== item.id))}
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2">
        <Input
          value={draft}
          placeholder="Tambah tugas…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" size="icon" aria-label="Tambah tugas" onClick={add}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
