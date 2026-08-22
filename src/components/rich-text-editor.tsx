import { useEffect, useRef, useState } from "react";
import { Bold, Highlighter, Italic, List, Palette, Strikethrough, Underline, Eraser } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

const TEXT_COLORS = [
  { label: "Biru", value: "#3f6fb5" },
  { label: "Hijau", value: "#2f7d5c" },
  { label: "Jingga", value: "#b06a24" },
  { label: "Merah", value: "#b1443c" },
  { label: "Ungu", value: "#77519c" },
  { label: "Netral", value: "#3a4a63" },
];

const HIGHLIGHTS = [
  { label: "Biru", value: "#d7e6fb" },
  { label: "Kuning", value: "#fbf1c9" },
  { label: "Hijau", value: "#d6f0dd" },
  { label: "Pink", value: "#fbdde6" },
  { label: "Ungu", value: "#e6ddfa" },
];

type Props = {
  value: string;
  placeholder?: string;
  onSave: (html: string) => void | Promise<void>;
  onCancel?: () => void;
  saving?: boolean;
  autoFocus?: boolean;
  submitLabel?: string;
};

export function RichTextEditor({
  value,
  placeholder = "Tulis catatan di sini…",
  onSave,
  onCancel,
  saving,
  autoFocus,
  submitLabel = "Simpan",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value && !dirty) {
      ref.current.innerHTML = value;
    }
  }, [value, dirty]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, arg);
    setDirty(true);
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <Button type="button" variant="ghost" size="icon" aria-label="Tebal" onClick={() => exec("bold")}>
          <Bold className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Miring" onClick={() => exec("italic")}>
          <Italic className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Garis bawah"
          onClick={() => exec("underline")}
        >
          <Underline className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Coret"
          onClick={() => exec("strikeThrough")}
        >
          <Strikethrough className="size-4" />
        </Button>
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Warna teks">
              <Palette className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex gap-1.5">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  onClick={() => exec("foreColor", color.value)}
                  className="size-6 rounded-full border border-border"
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Stabilo teks">
              <Highlighter className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2">
            <div className="flex gap-1.5">
              {HIGHLIGHTS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  title={color.label}
                  onClick={() => exec("hiliteColor", color.value)}
                  className="size-6 rounded-full border border-border"
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Daftar poin"
          onClick={() => exec("insertUnorderedList")}
        >
          <List className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Hapus format"
          onClick={() => exec("removeFormat")}
        >
          <Eraser className="size-4" />
        </Button>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={() => setDirty(true)}
        className="note-prose min-h-28 px-4 py-3 text-sm outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />

      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDirty(false);
              if (ref.current) ref.current.innerHTML = value;
              onCancel();
            }}
          >
            Batal
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={async () => {
            const html = ref.current?.innerHTML ?? "";
            await onSave(html);
            setDirty(false);
          }}
        >
          {saving ? "Menyimpan…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
