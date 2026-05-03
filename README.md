SYSTEM-OS
Your AI. Your rules. Your data.
An open source cognitive agent with persistent memory. You connect your own model
and your own database. No dependency on any company.
What it does
SYSTEM-OS is a cognitive operating system that runs 24/7. It remembers who you are,
what you’re working on, and what you’ve told it. You talk to the system — the system
talks to the AI. Not the other way around.
Persistent memory across sessions
Connects to any OpenAI-compatible model
Runs tasks autonomously in the background
Upload files for analysis
Web UI + terminal interface
Stack
Node.js (ES modules)
Express
PostgreSQL (Neon recommended)
OpenAI API (swappable)
Setup
1. Clone the repogit clone https://github.com/youruser/system-os.git
cd system-os
npm install
2. Environment variables
Create a .env file:
OPENAI_API_KEY=your_key_here
DATABASE_URL=your_postgres_connection_string
3. Create the database tables
Run this once to set up your database:
CREATE TABLE IF NOT EXISTS structured_memory (
id SERIAL PRIMARY KEY,
key TEXT NOT NULL,
value TEXT,
created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS file_memory (
id SERIAL PRIMARY KEY,
user_id TEXT,
file_name TEXT,
content TEXT,
created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS devchat_memory (
id SERIAL PRIMARY KEY,
user_id TEXT,
role TEXT,
content TEXT,
created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS executor_tasks (
id SERIAL PRIMARY KEY,
user_id TEXT,
description TEXT,
status TEXT DEFAULT 'pending',
created_at TIMESTAMP DEFAULT NOW()
);4. Run
node chat-cli.js # terminal interface
node server.js # web interface (localhost:3000)
Commands
Command What it does
/file path/to/file.js Saves a file into memory
/task build a login system Breaks a task into SYSTEM and HUMAN steps

Key files
chat-cli.js — terminal interface
server.js — Express server
index.html — web UI
CoreMindEngine/
modules/
router/devchat.js — main router
thinking/agentLoop.js — conversational brain
executor/executor.js — background task runner
cognition/
buildContext.js — builds context for each message
intent/detectIntent.js — detects what the user wants
memory/ — memory read/write
How memory works
The system has three types of memory:
structured
_memory — stores your name, projects, and operational statefile
_memory — stores files you send with /file
devchat
_memory — stores conversation history
Memory persists across sessions. The system knows who you are every time it starts.
Roadmap
Persistent memory
Intent detection
Task decomposition
File memory
Background executor
Multi-user support
Pluggable model interface (bring your own model)
Web installer (10-minute setup)
License
MIT