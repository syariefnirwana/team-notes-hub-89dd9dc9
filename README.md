# MyCatatanGwe

Catatan cloud kolaboratif untuk kelompok studio Perencanaan Wilayah & Kota.
Tujuannya: setiap anggota (sekretaris, ketua, bendahara, anggota) bisa mencatat
hal penting di satu tempat, dan dosen pembimbing bisa melihat dengan jelas
**siapa menulis apa** dan **siapa mengubah bagian mana**.

## Fitur utama

- Login Google, nama tampilan & peran diatur admin.
- Catatan berbasis blok: teks kaya (warna, stabilo, garis bawah, coret, bullet),
  gambar inline yang bisa digeser & diubah ukurannya, serta to do list.
- Atribusi per blok + riwayat perubahan ala GitHub (hover mark & pop-up versi sebelumnya).
- Kategori catatan (Rapat, Survey, Arahan Dosen, Analisis, Data) dan pengelompokan
  per tanggal atau kategori.
- Indikator online + kursor anggota lain secara realtime.
- Export catatan ke PDF dan Word.
- Dashboard: aktivitas terbaru, grafik aktivitas 1/7/30 hari, daftar anggota urut peran,
  agenda mendatang, dan pencarian dengan saran.
- Tema terang/gelap dengan nuansa biru pastel.
- `/settings` tersembunyi: admin mengelola anggota, pengurus mengelola timeline kelompok.

## Status pengerjaan

Detail lengkap tech stack, arsitektur, fitur yang sudah/belum selesai, dan catatan
logika aplikasi ada di **[PROGRESS.md](./PROGRESS.md)**. Baca dokumen itu lebih dulu
sebelum mengubah kode, agar fitur yang sudah berjalan tidak rusak.

## Development

```sh
npm i
npm run dev
```

Dibangun dengan [Lovable](https://lovable.dev) —
[buka editor](https://lovable.dev/projects/6984542f-924b-49c6-b7c3-8ba914ecef47).
