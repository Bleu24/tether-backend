import { createPool } from "mysql2/promise";
import fs from "fs";
import { env } from "../config/env";
import { DatabaseService } from "./DatabaseService";

export async function bootstrapDatabase() {
  // First, verify credentials by connecting without a default database
  const adminConfig: any = {
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: env.DB_CONN_LIMIT,
    timezone: "+00:00",
  };
  if (env.DB_SOCKET) {
    adminConfig.socketPath = env.DB_SOCKET;
  } else {
    adminConfig.host = env.DB_HOST;
    adminConfig.port = env.DB_PORT;
  }
  // TLS for TiDB Cloud
  if (env.DB_SSL || env.DB_SSL_CA) {
    let ssl: any = { minVersion: "TLSv1.2" };
    if (env.DB_SSL_CA) {
      try { ssl.ca = fs.readFileSync(env.DB_SSL_CA, "utf8"); }
      catch { ssl = { ...ssl, rejectUnauthorized: true }; }
    } else {
      ssl = { ...ssl, rejectUnauthorized: true };
    }
    adminConfig.ssl = ssl;
  }
  const adminPool = createPool(adminConfig);
  let dbExists = false;
  try {
    await adminPool.query("SELECT 1");
    const [schemas] = await adminPool.query(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
      [env.DB_NAME]
    );
    dbExists = Array.isArray(schemas) && (schemas as any[]).length > 0;
    if (!dbExists) {
      await adminPool.query(
        `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      dbExists = true;
    }
  } catch (err: any) {
    const hint =
      "If you're using MySQL's auth_socket plugin for 'root', either create an app user with mysql_native_password " +
      "or adjust root's plugin. Alternatively, configure DB_SOCKET and use a user allowed via socket with your OS user.";
    throw new Error(
      `Cannot connect to MySQL as ${env.DB_USER}@${env.DB_HOST}. Original error: ${err?.message || err}. ${hint}`
    );
  } finally {
    await adminPool.end();
  }

  // 2) Ensure tables exist (idempotent). Requires CREATE TABLE privileges. If not, log a clear error.
  // Now connect to the app database and ensure tables
  const db = DatabaseService.get();
  try {
    // Users
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    birthdate DATE NULL,
    gender ENUM('male','female','non-binary','other') NULL,
    location VARCHAR(255) NULL,
    bio TEXT NULL,
    photos JSON NULL,
    subscription_tier ENUM('free','plus','gold','premium') NOT NULL DEFAULT 'free',
    setup_complete TINYINT(1) NOT NULL DEFAULT 0,
    is_deleted TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Ensure new columns on existing tables (post-creation for idempotency)
  // Add birthdate column to users if missing (for older databases)
  const { rows: cols } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'birthdate'`,
    [env.DB_NAME]
  );
  const hasBirthdate = Array.isArray(cols) && cols.length > 0;
  if (!hasBirthdate) {
    await db.execute(`ALTER TABLE users ADD COLUMN birthdate DATE NULL`);
  }

  // Ensure password_hash column exists
  const { rows: colsPwd } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'`,
    [env.DB_NAME]
  );
  const hasPassword = Array.isArray(colsPwd) && colsPwd.length > 0;
  if (!hasPassword) {
    await db.execute(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email`);
  }

  // Ensure setup_complete column exists
  const { rows: colsSetup } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'setup_complete'`,
    [env.DB_NAME]
  );
  const hasSetup = Array.isArray(colsSetup) && colsSetup.length > 0;
  if (!hasSetup) {
    await db.execute(`ALTER TABLE users ADD COLUMN setup_complete TINYINT(1) NOT NULL DEFAULT 0 AFTER subscription_tier`);
  }

  // Ensure is_deleted column exists
  const { rows: colsDeleted } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'is_deleted'`,
    [env.DB_NAME]
  );
  const hasIsDeleted = Array.isArray(colsDeleted) && colsDeleted.length > 0;
  if (!hasIsDeleted) {
    await db.execute(`ALTER TABLE users ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0 AFTER setup_complete`);
  }

  // Ensure geolocation columns exist (latitude, longitude) and last_seen
  const { rows: hasLat } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'latitude'`,
    [env.DB_NAME]
  );
  if (!Array.isArray(hasLat) || hasLat.length === 0) {
    await db.execute(`ALTER TABLE users ADD COLUMN latitude DECIMAL(10,7) NULL AFTER location`);
  }
  const { rows: hasLon } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'longitude'`,
    [env.DB_NAME]
  );
  if (!Array.isArray(hasLon) || hasLon.length === 0) {
    await db.execute(`ALTER TABLE users ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude`);
  }
  const { rows: hasLastSeen } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_seen'`,
    [env.DB_NAME]
  );
  if (!Array.isArray(hasLastSeen) || hasLastSeen.length === 0) {
    await db.execute(`ALTER TABLE users ADD COLUMN last_seen DATETIME NULL AFTER longitude`);
  }

  // Profile preferences
  await db.execute(`CREATE TABLE IF NOT EXISTS profile_preferences (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Swipes
  await db.execute(`CREATE TABLE IF NOT EXISTS swipes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    swiper_id INT UNSIGNED NOT NULL,
    target_id INT UNSIGNED NOT NULL,
    direction ENUM('like','pass') NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_swipe_pair (swiper_id, target_id),
    CONSTRAINT fk_swiper FOREIGN KEY (swiper_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_target FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Rejections: track explicit passes to enable future undo for subscribers
  await db.execute(`CREATE TABLE IF NOT EXISTS rejections (
    swiper_id INT UNSIGNED NOT NULL,
    target_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    undone_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (swiper_id, target_id),
    CONSTRAINT fk_rej_swiper FOREIGN KEY (swiper_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rej_target FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Matches
  await db.execute(`CREATE TABLE IF NOT EXISTS matches (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_a_id INT UNSIGNED NOT NULL,
    user_b_id INT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_pair (user_a_id, user_b_id),
    CONSTRAINT fk_match_user_a FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_match_user_b FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Ensure celebration flags exist on matches (idempotent ALTERs)
  const { rows: hasCeleA } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'celebration_shown_to_a'`,
    [env.DB_NAME]
  );
  if (!Array.isArray(hasCeleA) || hasCeleA.length === 0) {
    await db.execute(`ALTER TABLE matches ADD COLUMN celebration_shown_to_a TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active`);
  }
  const { rows: hasCeleB } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'matches' AND COLUMN_NAME = 'celebration_shown_to_b'`,
    [env.DB_NAME]
  );
  if (!Array.isArray(hasCeleB) || hasCeleB.length === 0) {
    await db.execute(`ALTER TABLE matches ADD COLUMN celebration_shown_to_b TINYINT(1) NOT NULL DEFAULT 0 AFTER celebration_shown_to_a`);
  }

  // Messages
  await db.execute(`CREATE TABLE IF NOT EXISTS messages (
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
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Message deletions
  await db.execute(`CREATE TABLE IF NOT EXISTS message_deletions (
    message_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id),
    CONSTRAINT fk_md_msg FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    CONSTRAINT fk_md_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Recommendation queue: persist server-side recommendations so they don't repeat on reload
  await db.execute(`CREATE TABLE IF NOT EXISTS recommendation_queue (
    user_id INT UNSIGNED NOT NULL,
    target_id INT UNSIGNED NOT NULL,
    status ENUM('queued','consumed') NOT NULL DEFAULT 'queued',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consumed_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (user_id, target_id),
    KEY idx_user_status (user_id, status),
    CONSTRAINT fk_rq_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_rq_target FOREIGN KEY (target_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Super Likes
  await db.execute(`CREATE TABLE IF NOT EXISTS super_likes (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    sender_id INT UNSIGNED NOT NULL,
    receiver_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_sender_created (sender_id, created_at),
    KEY idx_receiver_created (receiver_id, created_at),
    CONSTRAINT fk_sl_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sl_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Boosts
  await db.execute(`CREATE TABLE IF NOT EXISTS boosts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    KEY idx_user_active (user_id, is_active),
    KEY idx_user_time (user_id, start_time, end_time),
    CONSTRAINT fk_boost_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Subscription resource credits (carry-over when upgrading tiers)
  await db.execute(`CREATE TABLE IF NOT EXISTS resource_credits (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    type ENUM('super_like','boost') NOT NULL,
    amount INT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_type (user_id, type),
    KEY idx_expiry (expires_at),
    CONSTRAINT fk_rc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Soft-deleted users snapshot table
  await db.execute(`CREATE TABLE IF NOT EXISTS soft_deleted_users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    source_user_id INT UNSIGNED NULL,
    email VARCHAR(190) NOT NULL,
    name VARCHAR(100) NULL,
    birthdate DATE NULL,
    gender ENUM('male','female','non-binary','other') NULL,
    location VARCHAR(255) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    last_seen DATETIME NULL,
    bio TEXT NULL,
    photos JSON NULL,
    preferences JSON NULL,
    subscription_tier ENUM('free','plus','gold','premium') NULL,
    deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_email (email),
    CONSTRAINT fk_sdu_user FOREIGN KEY (source_user_id) REFERENCES users(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  // Ensure soft_deleted_users has geo columns (idempotent)
  const { rows: sduHasLat } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soft_deleted_users' AND COLUMN_NAME = 'latitude'`,
    [env.DB_NAME]
  );
  if (!Array.isArray(sduHasLat) || sduHasLat.length === 0) {
    await db.execute(`ALTER TABLE soft_deleted_users ADD COLUMN latitude DECIMAL(10,7) NULL AFTER location`);
  }
  const { rows: sduHasLon } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soft_deleted_users' AND COLUMN_NAME = 'longitude'`,
    [env.DB_NAME]
  );
  if (!Array.isArray(sduHasLon) || sduHasLon.length === 0) {
    await db.execute(`ALTER TABLE soft_deleted_users ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude`);
  }
  const { rows: sduHasLast } = await db.query<any>(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'soft_deleted_users' AND COLUMN_NAME = 'last_seen'`,
    [env.DB_NAME]
  );
  if (!Array.isArray(sduHasLast) || sduHasLast.length === 0) {
    await db.execute(`ALTER TABLE soft_deleted_users ADD COLUMN last_seen DATETIME NULL AFTER longitude`);
  }
  } catch (err: any) {
    const hint =
      "If CREATE TABLE is denied, run the schema from backend/README.md manually, or grant CREATE on the DB to your app user.";
    throw new Error(`Failed to ensure tables: ${err?.message || err}. ${hint}`);
  }
}
