import { parseTodos, signedImageUrl, type Note, type NoteBlock, type Profile } from "@/lib/notes";
import { formatDateTime, NOTE_CATEGORY_LABEL } from "@/lib/people";

async function buildHtml(
  note: Note,
  blocks: NoteBlock[],
  profileById: Map<string, Profile>,
) {
  const parts: string[] = [];

  for (const block of blocks) {
    const creator = profileById.get(block.created_by)?.username ?? "Anggota";
    const editor = profileById.get(block.updated_by)?.username ?? "Anggota";
    let body = "";

    if (block.kind === "image" && block.image_url) {
      try {
        const url = await signedImageUrl(block.image_url);
        body = `<img src="${url}" style="max-width:100%" />`;
      } catch {
        body = "<p><i>[gambar tidak dapat dimuat]</i></p>";
      }
    } else if (block.kind === "todo") {
      const items = parseTodos(block.content);
      body = `<ul>${items
        .map((item) => `<li>${item.done ? "☑" : "☐"} ${escapeHtml(item.text)}</li>`)
        .join("")}</ul>`;
    } else {
      body = block.content;
    }

    parts.push(
      `<section style="margin:0 0 22px 0;padding:0 0 14px 0;border-bottom:1px solid #dbe4f0">
        ${body}
        <p style="font-size:11px;color:#5b6b83;margin-top:8px">Ditulis ${escapeHtml(creator)} · ${formatDateTime(
          block.created_at,
        )}${
          block.updated_at !== block.created_at
            ? ` · Diubah ${escapeHtml(editor)} · ${formatDateTime(block.updated_at)}`
            : ""
        }</p>
      </section>`,
    );
  }

  const author = profileById.get(note.author_id)?.username ?? "Anggota";

  return `<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(note.title)}</title></head>
  <body style="font-family:Arial,Helvetica,sans-serif;color:#1f2c3f;max-width:760px;margin:32px auto;padding:0 20px">
    <h1 style="margin-bottom:4px">${escapeHtml(note.title)}</h1>
    <p style="font-size:12px;color:#5b6b83;margin-top:0">
      Kategori ${NOTE_CATEGORY_LABEL[note.category]} · Penanggung jawab ${escapeHtml(author)} ·
      Dibuat ${formatDateTime(note.created_at)} · Terakhir diubah ${formatDateTime(note.updated_at)}
    </p>
    <hr style="border:none;border-top:2px solid #cfdcee;margin:18px 0" />
    ${parts.join("")}
    <p style="font-size:11px;color:#8494a8">Diekspor dari MyCatatanGwe</p>
  </body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;",
  );
}

function safeFileName(title: string) {
  return title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "catatan";
}

export async function exportNoteAsPdf(
  note: Note,
  blocks: NoteBlock[],
  profileById: Map<string, Profile>,
) {
  const html = await buildHtml(note, blocks, profileById);
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) throw new Error("Tidak bisa membuka pratinjau cetak");
  doc.open();
  doc.write(html);
  doc.close();
  await new Promise((resolve) => window.setTimeout(resolve, 400));
  frame.contentWindow?.focus();
  frame.contentWindow?.print();
  window.setTimeout(() => frame.remove(), 60000);
}

export async function exportNoteAsWord(
  note: Note,
  blocks: NoteBlock[],
  profileById: Map<string, Profile>,
) {
  const html = await buildHtml(note, blocks, profileById);
  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(note.title)}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
