import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Highlighter,
  ImagePlus,
  Italic,
  List,
  Palette,
  Strikethrough,
  Underline,
  Eraser,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  applySignedUrls,
  collectImagePaths,
  inlineImageTag,
  signedImageUrlMap,
  stripSignedUrls,
} from "@/lib/note-html";

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
  /** Uploads a file and resolves with its storage path; enables inline images. */
  onUploadImage?: (file: File) => Promise<string>;
};

type DragState = {
  img: HTMLImageElement;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  startWidth: number;
  dx: number;
  dy: number;
};

function readTranslate(img: HTMLImageElement) {
  const match = /translate\(\s*(-?[\d.]+)px[,\s]+(-?[\d.]+)px/.exec(img.style.transform || "");
  return { x: Number(match?.[1] ?? 0), y: Number(match?.[2] ?? 0) };
}

export function RichTextEditor({
  value,
  placeholder = "Tulis catatan di sini…",
  onSave,
  onCancel,
  saving,
  autoFocus,
  submitLabel = "Simpan",
  onUploadImage,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load the value with fresh signed URLs for inline images.
  useEffect(() => {
    let active = true;
    async function hydrate() {
      if (!ref.current || dirty) return;
      const paths = collectImagePaths(value);
      const html = paths.length > 0 ? applySignedUrls(value, await signedImageUrlMap(paths)) : value;
      if (!active || !ref.current) return;
      if (ref.current.innerHTML !== html) ref.current.innerHTML = html;
    }
    hydrate().catch(() => {
      if (ref.current && !dirty) ref.current.innerHTML = value;
    });
    return () => {
      active = false;
    };
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

  async function insertImage(file: File) {
    if (!onUploadImage) return;
    setUploading(true);
    try {
      const path = await onUploadImage(file);
      const map = await signedImageUrlMap([path]);
      const tag = inlineImageTag(path, map[path] ?? "");
      ref.current?.focus();
      document.execCommand("insertHTML", false, `${tag}<br/>`);
      setDirty(true);
    } finally {
      setUploading(false);
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLImageElement) || !target.dataset["path"]) return;
    const rect = target.getBoundingClientRect();
    const nearCorner =
      rect.right - event.clientX < 22 && rect.bottom - event.clientY < 22;
    const start = readTranslate(target);
    dragRef.current = {
      img: target,
      mode: nearCorner ? "resize" : "move",
      startX: event.clientX,
      startY: event.clientY,
      startWidth: rect.width,
      dx: start.x,
      dy: start.y,
    };
    target.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.mode === "resize") {
      const max = ref.current?.clientWidth ?? 600;
      const next = Math.min(Math.max(drag.startWidth + dx, 60), max);
      drag.img.style.width = `${Math.round(next)}px`;
      drag.img.style.height = "auto";
    } else {
      drag.img.style.transform = `translate(${Math.round(drag.dx + dx)}px, ${Math.round(drag.dy + dy)}px)`;
    }
    setDirty(true);
    event.preventDefault();
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    try {
      drag.img.releasePointerCapture(event.pointerId);
    } catch {
      /* pointer already released */
    }
    dragRef.current = null;
  }

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
        {onUploadImage ? (
          <>
            <Separator orientation="vertical" className="mx-1 h-6" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Sisipkan gambar"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="size-4" />
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void insertImage(file);
              }}
            />
          </>
        ) : null}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={() => setDirty(true)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="note-prose note-editable min-h-28 px-4 py-3 text-sm outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)]"
      />

      {onUploadImage ? (
        <p className="border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
          {uploading
            ? "Mengunggah gambar…"
            : "Tarik gambar untuk memindahkannya, tarik sudut kanan bawah untuk mengubah ukuran."}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDirty(false);
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
            const html = stripSignedUrls(ref.current?.innerHTML ?? "");
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
