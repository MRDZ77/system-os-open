CREATE TABLE IF NOT EXISTS interactions (
    id SERIAL PRIMARY KEY,
    app_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);