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

-- Users table with extended profile fields
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gender ENUM('male','female','non-binary','other') NULL,
  location VARCHAR(255) NULL,
  bio TEXT NULL,
  photos JSON NULL,
  subscription_tier ENUM('free','plus','gold','premium') NOT NULL DEFAULT 'free',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Messages: chat messages tied to a match
CREATE TABLE IF NOT EXISTS messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  match_id INT UNSIGNED NOT NULL,
  sender_id INT UNSIGNED NOT NULL,
  content TEXT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  seen TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_match (match_id),
  CONSTRAINT fk_msg_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Per-user deletions ("delete for me")
CREATE TABLE IF NOT EXISTS message_deletions (
  message_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id, user_id),
  CONSTRAINT fk_md_msg FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
  CONSTRAINT fk_md_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Profile match preferences
CREATE TABLE IF NOT EXISTS profile_preferences (
  user_id INT UNSIGNED NOT NULL,
  min_age TINYINT UNSIGNED NOT NULL,
  max_age TINYINT UNSIGNED NOT NULL,
  distance SMALLINT UNSIGNED NOT NULL,
  gender_preference ENUM('male','female','non-binary','any') NOT NULL,
  interests JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_pp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Swipes: record left/right actions; keep only last action per pair
CREATE TABLE IF NOT EXISTS swipes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  swiper_id INT UNSIGNED NOT NULL,
  target_id INT UNSIGNED NOT NULL,
  direction ENUM('like','pass') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_swipe_pair (swiper_id, target_id),
  CONSTRAINT fk_swiper FOREIGN KEY (swiper_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_target FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Matches: mutual 'like' pairs; user_a_id < user_b_id to enforce uniqueness
CREATE TABLE IF NOT EXISTS matches (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_a_id INT UNSIGNED NOT NULL,
  user_b_id INT UNSIGNED NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  celebration_shown_to_a TINYINT(1) NOT NULL DEFAULT 0,
  celebration_shown_to_b TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_pair (user_a_id, user_b_id),
  CONSTRAINT fk_match_user_a FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_match_user_b FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

3. Install and run

```bash
cd backend
npm install
npm run dev
```

The API will start on http://localhost:4000

## Realtime WebSocket

A lightweight WebSocket server runs at `ws://localhost:4000/ws`.

- Connect with a required `userId` query: `ws://localhost:4000/ws?userId=123`
- Subscribe to a matched chat by sending JSON:

```
{ "type": "subscribe", "matchId": 1 }
```

- Unsubscribe:

```
{ "type": "unsubscribe", "matchId": 1 }
```

Only users that are part of the match can subscribe. The server verifies membership before joining the room.

Events you may receive after subscribing:
- `message:created` { message }
- `message:updated` { message }
- `message:deleted` { id, matchId, scope }
- `message:seen` { id, matchId, seenBy }

Delete semantics:
- scope=self: only sent to the requester (delete-for-me)
- scope=everyone: broadcast to the match room (content removed for all)

## Routes
- GET `/` – API info
- GET `/api/health` – health check
- GET `/api/users` – list users
- POST `/api/users` – create a user
 - GET `/api/users/:id` – get a single user (includes preferences)
 - PUT `/api/users/:id` – update user profile fields
 - GET `/api/users/:userId/preferences` – get profile match preferences
 - PUT `/api/users/:userId/preferences` – upsert profile match preferences
 - POST `/api/swipes` – record a swipe (body: { swiperId, targetId, direction })
 - GET `/api/swipes?swiperId=ID` – list swipes performed by a user
 - GET `/api/users/:userId/swipes` – same as above (nested)
 - POST `/api/matches/check` – check if two users mutually liked; create (or reactivate) a match if so; returns {matched, match}
 - GET `/api/matches?userId=ID` – list active matches for a user
 - DELETE `/api/matches/:id` – deactivate a match
 - GET `/api/users/:userId/matches` – list user matches (nested)
 - GET `/api/matches/:matchId/messages?userId=ID` – list messages in a match (hides ones deleted-for-me for userId)
 - POST `/api/matches/:matchId/messages` – create a message (body: { senderId, content })
 - PUT `/api/messages/:id` – edit a message (author only)
 - DELETE `/api/messages/:id?scope=self|everyone&userId=ID` – delete for me or for everyone (author only for everyone)
 - POST `/api/messages/:id/seen` – mark a message seen (body or query: userId)
 - GET `/api/me/matches/pending-celebrations` – list matches where the current user hasn't seen the celebration yet
 - POST `/api/me/matches/:id/celebration-seen` – mark the celebration as seen for the current user on a specific match
- GET `/api/users/:id` – get a single user (includes preferences)
- PUT `/api/users/:id` – update user profile fields (name, gender, location, bio, photos, subscription)
- GET `/api/users/:userId/preferences` – get profile match preferences
- PUT `/api/users/:userId/preferences` – create/update (upsert) match preferences

Example create request:
```bash
curl -X POST http://localhost:4000/api/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alex","email":"alex@example.com"}'
```

Update preferences:
```bash
curl -X PUT http://localhost:4000/api/users/1/preferences \
  -H 'Content-Type: application/json' \
  -d '{
        "min_age": 22,
        "max_age": 35,
        "distance": 30,
        "gender_preference": "any",
        "interests": ["music","coffee"]
      }'
```

Record a swipe:
```bash
curl -X POST http://localhost:4000/api/swipes \
  -H 'Content-Type: application/json' \
  -d '{"swiperId":1,"targetId":2,"direction":"like"}'
```

Check or create a match:
```bash
curl -X POST http://localhost:4000/api/matches/check \
  -H 'Content-Type: application/json' \
  -d '{"userAId":1,"userBId":2}'
```

> Note: When a match is created, we will create a chat thread (not implemented yet).

List messages in a match (hide those deleted for requester):
```bash
curl "http://localhost:4000/api/matches/1/messages?userId=2"
```

Create a message in a match:
```bash
curl -X POST http://localhost:4000/api/matches/1/messages \
  -H 'Content-Type: application/json' \
  -d '{"senderId":2, "content":"Hey there!"}'
```

Edit a message (author only):
```bash
curl -X PUT http://localhost:4000/api/messages/10 \
  -H 'Content-Type: application/json' \
  -d '{"senderId":2, "content":"Edited text"}'
```

Delete for me vs everyone:
```bash
# delete for me
curl -X DELETE "http://localhost:4000/api/messages/10?scope=self&userId=2"

# delete for everyone (author only)
curl -X DELETE "http://localhost:4000/api/messages/10?scope=everyone&userId=2"
```

Mark seen:
```bash
curl -X POST http://localhost:4000/api/messages/10/seen \
  -H 'Content-Type: application/json' \
  -d '{"userId":1}'
```

## Frontend integration
From the Next.js app you can call the API, e.g.:
```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const res = await fetch(`${API_URL}/api/users`);
```

When you switch to a hosted DB, only `.env` changes — the app code stays the same because it depends on interfaces.

## Schema updates for existing databases

If you created the database before this change, add celebration flags to `matches`:

```sql
ALTER TABLE matches ADD COLUMN celebration_shown_to_a TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;
ALTER TABLE matches ADD COLUMN celebration_shown_to_b TINYINT(1) NOT NULL DEFAULT 0 AFTER celebration_shown_to_a;
```
