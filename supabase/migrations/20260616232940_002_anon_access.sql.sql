-- Allow access for demo-user without auth (using anon key)
CREATE POLICY "anon_select_memory" ON structured_memory FOR SELECT
  TO anon USING (user_id = 'demo-user');
CREATE POLICY "anon_insert_memory" ON structured_memory FOR INSERT
  TO anon WITH CHECK (user_id = 'demo-user');
CREATE POLICY "anon_update_memory" ON structured_memory FOR UPDATE
  TO anon USING (user_id = 'demo-user') WITH CHECK (user_id = 'demo-user');

CREATE POLICY "anon_select_files" ON file_memory FOR SELECT
  TO anon USING (user_id = 'demo-user');
CREATE POLICY "anon_insert_files" ON file_memory FOR INSERT
  TO anon WITH CHECK (user_id = 'demo-user');
CREATE POLICY "anon_update_files" ON file_memory FOR UPDATE
  TO anon USING (user_id = 'demo-user') WITH CHECK (user_id = 'demo-user');

CREATE POLICY "anon_select_chat" ON devchat_memory FOR SELECT
  TO anon USING (user_id = 'demo-user');
CREATE POLICY "anon_insert_chat" ON devchat_memory FOR INSERT
  TO anon WITH CHECK (user_id = 'demo-user');
CREATE POLICY "anon_update_chat" ON devchat_memory FOR UPDATE
  TO anon USING (user_id = 'demo-user') WITH CHECK (user_id = 'demo-user');