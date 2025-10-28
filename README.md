# Tether Backend (Express + MySQL)

This folder contains a small, SOLID-friendly Express API for the Tether MVP.

## Stack
- Express (routing/middleware)
- mysql2 (pooled MySQL connection)
- Zod (env and DTO validation)
- TypeScript (strict mode)

## Project structure
```
backend/
  src/
    config/        # env loader & validation
    controllers/   # HTTP controllers (skinny)
    middleware/    # error handling, etc
    models/        # typed domain models
    repositories/  # DB access via interfaces (DIP)
    routes/        # route modules per domain
    services/      # business logic + database service
    app.ts         # express app creation (composition root)
    server.ts      # starts the HTTP server
```

Key principles
- Single Responsibility: each layer does one thing (controller, service, repo)
- Open/Closed: add new features via new classes; avoid editing stable contracts
- Liskov: repository/service contracts are substitutable (interfaces)
- Interface Segregation: small interfaces (e.g., IDatabase, IUserRepository)
- Dependency Inversion: high-level code depends on abstractions, not mysql2

## Getting started
1. Copy `.env.example` to `.env` and fill in your MySQL credentials
2. Create the database and a basic `users` table (temporary minimal schema):

```sql
CREATE DATABASE IF NOT EXISTS tether;
USE tether;
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

3. Install and run

```bash
cd backend
npm install
npm run dev
```

The API will start on http://localhost:4000

## Routes
- GET `/` – API info
- GET `/api/health` – health check
- GET `/api/users` – list users
- POST `/api/users` – create a user

Example create request:
```bash
curl -X POST http://localhost:4000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alex","email":"alex@example.com"}'
```

## Frontend integration
From the Next.js app you can call the API, e.g.:
```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const res = await fetch(`${API_URL}/api/users`);
```

When you switch to a hosted DB, only `.env` changes — the app code stays the same because it depends on interfaces.
