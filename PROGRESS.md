# PROGRESS — MyCatatanGwe

Catatan cloud kolaboratif untuk kelompok studio Perencanaan Wilayah & Kota.
Dokumen ini adalah sumber kebenaran untuk status pengerjaan. **Jangan menghapus
atau mengubah fitur yang sudah ditandai selesai** tanpa permintaan pemilik.

Pemilik / admin tunggal: `syariefnirwana35@gmail.com`.

---

## 1. Tech stack & arsitektur

- **Framework**: TanStack Start v1 (React 19 + Vite 7, SSR ke edge runtime).
  Routing berbasis file di `src/routes` (`routeTree.gen.ts` auto-generate — jangan diedit).
- **Styling**: Tailwind CSS v4 lewat `src/styles.css` (token `oklch`, tema **biru pastel**,
  dukungan dark mode via class `dark`). Komponen UI: shadcn/ui di `src/components/ui`.
- **State & data**: TanStack Query (`useQuery`/`useMutation`), tanpa Redux.
- **Backend**: Lovable Cloud (Supabase) — Postgres + RLS, Auth Google, Storage, Realtime.
- **Grafik**: `recharts`. **Ikon**: `lucide-react`. **Toast**: `sonner`.

Struktur folder penting:

```text
src/
  routes/
    __root.tsx                      shell + meta + <Toaster/>
    index.tsx                       landing + tombol login Google
    _authenticated/route.tsx        gate auth (redirect ke / jika belum login)
    _authenticated/dashboard.tsx    dashboard: catatan, anggota, aktivitas, agenda
    _authenticated/notes.$noteId.tsx halaman catatan + editor + riwayat versi
    _authenticated/settings.tsx     tersembunyi: kelola anggota + timeline
  components/
    app-header.tsx, theme-toggle.tsx, presence-bar.tsx (online + kursor realtime)
    rich-text-editor.tsx (format teks + gambar inline drag/resize)
    note-content.tsx (render HTML catatan + signed URL gambar)
    note-image.tsx, note-search.tsx, activity-graph.tsx, todo-list.tsx, person-mark.tsx
  lib/
    notes.ts       semua akses data (notes, blocks, versions, profiles, timeline)
    people.ts      enum peran/kategori, urutan peran, warna per orang, format tanggal
    note-html.ts   utilitas gambar inline (path <-> signed URL)
    export-note.ts export PDF (print) & Word (.doc)
  hooks/ use-session.ts, use-theme.ts, use-presence.ts, use-mobile.tsx
  integrations/supabase/  auto-generated — jangan diedit
```

Skema database (schema `public`, semua tabel RLS aktif + GRANT):

- `profiles` — `username`, `email`, `avatar_url`, `team_role`
  (`dosen | ketua | wakil | sekretaris | bendahara | anggota`).
- `user_roles` — role aplikasi (`admin | member`), dipakai fungsi `has_role`.
  Trigger `on_auth_user_created` otomatis memberi `admin` ke email pemilik.
- `notes` — `title`, `category` (`rapat | survey | arahan_dosen | analisis | data`),
  `author_id`, `updated_by`, timestamps.
- `note_blocks` — blok konten: `kind` = `text | image | todo`, `content`,
  `image_url`, `created_by`, `updated_by`.
- `note_versions` — log riwayat: `action` (created/renamed/added/edited/removed),
  `summary`, `snapshot` (JSON before/after untuk diff).
- `timeline_events` — agenda kelompok (`kind`, `event_at`, `location`), dikelola
  admin + ketua/wakil/sekretaris/bendahara lewat fungsi `can_manage_agenda`.
- Storage bucket privat `note-images` (akses lewat signed URL 1 jam).

---

## 2. Fitur yang SUDAH selesai

- Login Google + gate route `_authenticated`; profil dibuat otomatis saat pertama login.
- Nama aplikasi **MyCatatanGwe** di header, landing, dan meta.
- Buat / ubah judul / hapus catatan, pilih & ubah **kategori** kapan saja.
- Editor teks kaya: bold, italic, underline, strikethrough, warna teks, stabilo,
  bullet list, hapus format.
- **Gambar inline di dalam blok teks**: sisipkan dari toolbar, lalu **geser posisi**
  (drag) dan **ubah ukuran** (drag sudut kanan bawah). Posisi/ukuran disimpan
  sebagai inline style; sumbernya disimpan sebagai storage path, bukan signed URL.
- Blok gambar terpisah dan blok **to do list** (centang, tambah, hapus item).
- Atribusi per blok: siapa penulis awal + siapa pengubah terakhir, dengan warna
  tint khas per orang, lengkap dengan tanggal/waktu.
- Riwayat versi ala GitHub: log per aksi, hover untuk menandai bagian yang diubah,
  pop-up "lihat versi sebelumnya" (diff before/after). Tidak ada perubahan =
  tidak ada entri riwayat baru.
- Realtime: indikator siapa yang online + kursor anggota lain di halaman catatan.
- Export catatan ke **PDF** dan **Word (.doc)** termasuk gambar dan metadata penulis.
- Dashboard: pengelompokan catatan per tanggal atau per kategori, daftar anggota
  urut peran (dosen → ketua → wakil → sekretaris → bendahara → anggota) + titik online,
  feed aktivitas terbaru, grafik aktivitas 1 / 7 / 30 hari, agenda mendatang.
- Search bar dengan saran otomatis saat mengetik beberapa huruf.
- Dark / light theme dengan tombol di header, tersimpan di localStorage.
- `/settings` tersembunyi: hanya admin (kelola nama tampilan, peran, **hapus anggota**)
  dan pengurus (kelola **timeline/agenda**: tambah & hapus).
- Layout responsif (mobile → desktop) memakai grid/flex Tailwind.
- Halaman timeline penuh `/timeline`: agenda mendatang + riwayat agenda, dikelompokkan
  per bulan, dengan tombol "Kelola agenda" (ke `/settings`) hanya untuk admin/pengurus.
  Dashboard punya tautan "Lihat timeline" di kartu agenda.

---

## 3. Fitur yang BELUM selesai / catatan bug

- Pengecekan responsif manual di berbagai device belum tuntas (hanya diuji lewat
  breakpoint Tailwind, belum diuji satu-satu di perangkat nyata).
- Editor memakai `document.execCommand` (deprecated tapi stabil di browser modern);
  belum ada undo/redo kustom, heading, atau tabel.
- Kursor realtime hanya muncul di halaman catatan, bukan di dashboard, dan tidak
  menampilkan seleksi teks orang lain.
- Belum ada kolaborasi simultan pada satu blok yang sama (last write wins) —
  belum ada penguncian atau merge otomatis.
- Export Word memakai format `.doc` (HTML) — cukup untuk Microsoft Word, tetapi
  bukan `.docx` asli.
- Belum ada notifikasi email/push, komentar per blok, dan lampiran non-gambar.
- Belum ada halaman timeline penuh (agenda hanya ringkasan di dashboard + kelola
  di `/settings`).

---

## 4. Catatan penting soal logika aplikasi

- **Admin ditentukan database**, bukan client: cek lewat `user_roles` + `has_role`.
  Jangan pernah menyimpan status admin di localStorage atau hardcode di UI.
- `updateBlock` mengembalikan `boolean` (`changed`). Jika konten identik dengan
  sebelumnya, tidak ada baris `note_versions` baru dan toast tidak muncul.
  Pertahankan perilaku ini — permintaan eksplisit pemilik.
- Riwayat menyimpan `snapshot` before/after. Fitur hover-mark dan pop-up versi
  sebelumnya bergantung pada `snapshot.block_id`; jangan hapus kolom ini.
- Gambar disimpan sebagai **storage path** di dalam HTML (`data-path`), lalu
  di-resolve ke signed URL saat render (`note-html.ts`: `collectImagePaths`,
  `applySignedUrls`, `stripSignedUrls`). Sebelum simpan, signed URL selalu di-strip
  supaya tidak kedaluwarsa. Jangan menyimpan signed URL ke database.
- Warna tint per orang dihitung deterministik dari user id (`personColor`), jadi
  satu orang selalu memakai warna yang sama.
- Urutan anggota selalu lewat `sortByTeamRole`, bukan urutan pembuatan akun.
- Semua akses data lewat `src/lib/notes.ts`; jangan memanggil `supabase` langsung
  dari komponen agar RLS dan bentuk data konsisten.
- File di `src/integrations/supabase/*` dan `src/routeTree.gen.ts` auto-generate.
