CREATE POLICY "note_images_select_authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'note-images');
CREATE POLICY "note_images_insert_authenticated" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'note-images' AND owner = auth.uid());
CREATE POLICY "note_images_delete_owner" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'note-images' AND owner = auth.uid());
