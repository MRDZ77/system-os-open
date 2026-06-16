CREATE TABLE IF NOT EXISTS structured_memory (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  weight DECIMAL DEFAULT 0.7,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, key)
);

CREATE TABLE IF NOT EXISTS file_memory (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, file_name)
);

CREATE TABLE IF NOT EXISTS devchat_memory (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executor_tasks (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  task TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  result TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE structured_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE devchat_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE executor_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for structured_memory
CREATE POLICY "select_own_memory" ON structured_memory FOR SELECT
  TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "insert_own_memory" ON structured_memory FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "update_own_memory" ON structured_memory FOR UPDATE
  TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "delete_own_memory" ON structured_memory FOR DELETE
  TO authenticated USING (auth.uid()::text = user_id);

-- RLS Policies for file_memory
CREATE POLICY "select_own_files" ON file_memory FOR SELECT
  TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "insert_own_files" ON file_memory FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "update_own_files" ON file_memory FOR UPDATE
  TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "delete_own_files" ON file_memory FOR DELETE
  TO authenticated USING (auth.uid()::text = user_id);

-- RLS Policies for devchat_memory
CREATE POLICY "select_own_chat" ON devchat_memory FOR SELECT
  TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "insert_own_chat" ON devchat_memory FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "update_own_chat" ON devchat_memory FOR UPDATE
  TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "delete_own_chat" ON devchat_memory FOR DELETE
  TO authenticated USING (auth.uid()::text = user_id);

-- RLS Policies for executor_tasks
CREATE POLICY "select_own_tasks" ON executor_tasks FOR SELECT
  TO authenticated USING (auth.uid()::text = user_id);
CREATE POLICY "insert_own_tasks" ON executor_tasks FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "update_own_tasks" ON executor_tasks FOR UPDATE
  TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "delete_own_tasks" ON executor_tasks FOR DELETE
  TO authenticated USING (auth.uid()::text = user_id);

-- For service role (server-side) allow all
CREATE POLICY "service_all_memory" ON structured_memory FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_files" ON file_memory FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_chat" ON devchat_memory FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_tasks" ON executor_tasks FOR ALL
  TO service_role USING (true) WITH CHECK (true);