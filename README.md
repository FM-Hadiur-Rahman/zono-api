# 🧩 Zono API

Backend for **Zono** — a Smart Workforce & Shift Management System for restaurants and delivery teams.  
Built with **Node.js**, **Express**, **Prisma**, and **PostgreSQL**, providing RESTful APIs for employees, attendance, shifts, and notifications.

---

## 🚀 Tech Stack

- **Node.js + Express** — backend framework
- **Prisma ORM** — database modeling and migrations
- **PostgreSQL** — relational database
- **Docker** — local Postgres setup
- **Vitest** — testing

---

## ⚙️ Local Development Setup

### Prerequisites

- Node.js **v20+**
- Docker Desktop (for running Postgres)
- Git

### Quick Start

```bash
# 1️⃣ Start the database (Postgres via Docker)
docker compose up -d

# 2️⃣ Copy example env and adjust values
cp .env.example .env.development

# 3️⃣ Install dependencies
npm ci

# 4️⃣ Generate Prisma client
npx prisma generate

# 5️⃣ Apply migrations
npx prisma migrate dev

# 6️⃣ Start the server
npm run dev
The API will be running at 👉 http://localhost:4000

🌱 Environment Variables
Your .env.example should look like this:

env
Copy code
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zono?schema=public"

# App
PORT=4000
NODE_ENV=development
APP_ORIGIN="http://localhost:5173"
CORS_ORIGINS="http://localhost:5173"

# Auth
JWT_SECRET="CHANGE_ME"

# Email
EMAIL_ENABLED=true
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
EMAIL_USER="example@gmail.com"
EMAIL_PASS="app_password_here"
👉 Copy it to .env.development and fill in your real local values.
Never commit .env files — only .env.example.

🐳 Docker Setup (for local DB)
yaml
Copy code
# docker-compose.yml
version: "3.9"
services:
  db:
    image: postgres:15
    container_name: zono-pg
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: zono
    volumes:
      - zono_pg:/var/lib/postgresql/data

volumes:
  zono_pg:
Common Docker Commands
bash
Copy code
docker compose up -d      # start DB
docker compose ps         # check status
docker compose logs -f db # view logs
docker compose down       # stop containers
docker compose down -v    # stop + delete data
🧠 Useful NPM Scripts
json
Copy code
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js",
  "build": "echo \"(no build step for JS)\"",
  "db:generate": "prisma generate",
  "db:migrate:dev": "prisma migrate dev",
  "db:migrate:deploy": "prisma migrate deploy",
  "test": "vitest"
}
☁️ Deployment Guide
🔹 Render (Backend Hosting)
Create a Render Web Service from this repo.

Add Render Managed PostgreSQL → copy its DATABASE_URL.

Set Environment Variables:

DATABASE_URL = Render DB URL

NODE_ENV=production

PORT=10000

APP_ORIGIN=https://<your-vercel-domain>

CORS_ORIGINS=https://<your-vercel-domain>

JWT_SECRET, EMAIL_USER, EMAIL_PASS, etc.

Build Command:

arduino
Copy code
npm ci && npm run db:generate && npm run build
Start Command:

arduino
Copy code
npm run db:migrate:deploy && npm start
Render will automatically expose your backend at
👉 https://zono-api.onrender.com

🔹 Vercel (Frontend Hosting)
Frontend (zono-web) connects to this API.
Set its environment variable:

ini
Copy code
VITE_API_BASE_URL="https://zono-api.onrender.com"
🧾 Example API Endpoints
Method	Endpoint	Description
POST	/api/auth/login	Authenticate user
GET	/api/employees	List employees
POST	/api/shifts	Create new shift
GET	/api/notifications	Fetch user notifications

🧪 Testing
bash
Copy code
npm test
🧰 Folder Structure
pgsql
Copy code
zono-api/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── schemas/
│   ├── services/
│   ├── app.js
│   └── server.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.example
├── package.json
├── docker-compose.yml
└── README.md
🛠️ Notes
Always run migrations after any Prisma schema change.

Never commit real .env files.

For a teammate setup:

bash
Copy code
git clone <repo>
docker compose up -d
cp .env.example .env.development
npm ci && npx prisma migrate dev && npm run dev
```
