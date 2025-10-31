import { Router, Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireUser } from "../middleware/auth";
import { env } from "../config/env";

// Optional S3-compatible storage
let useS3 = Boolean(env.S3_BUCKET && env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
let S3ClientCtor: any = null;
let PutObjectCommandCtor: any = null;
if (useS3) {
  try {
    // Lazy require to avoid install requirement during local-only flows
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const s3 = require("@aws-sdk/client-s3");
    S3ClientCtor = s3.S3Client;
    PutObjectCommandCtor = s3.PutObjectCommand;
  } catch {
    useS3 = false;
  }
}

// Multer storage: memory for S3, disk otherwise
let upload: multer.Multer;
if (useS3) {
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 6 } });
} else {
  const uploadsRoot = path.resolve(process.cwd(), "uploads");
  fs.mkdirSync(uploadsRoot, { recursive: true });
  const storage = multer.diskStorage({
    destination: (_req: Request, _file: any, cb: (error: any, destination: string) => void) => cb(null, uploadsRoot),
    filename: (_req: Request, file: any, cb: (error: any, filename: string) => void) => {
      const ts = Date.now();
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${ts}-${safe}`);
    },
  });
  upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 6 } });
}

export function uploadsRouter(): Router {
  const router = Router();
  router.use(requireUser);

  // Upload one or more images; field name: "files"
  router.post("/", upload.array("files", 6), async (req: Request, res) => {
    const files = (req.files as any[]) || [];
    if (useS3 && S3ClientCtor && PutObjectCommandCtor) {
      const client = new S3ClientCtor({
        region: env.S3_REGION || "auto",
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
      });
      const urls: string[] = [];
      for (const f of files) {
        const ts = Date.now();
        const safe = (f.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
        const key = `${res.locals.userId}/${ts}-${safe}`;
        await client.send(new PutObjectCommandCtor({
          Bucket: env.S3_BUCKET,
          Key: key,
          Body: f.buffer,
          ContentType: f.mimetype || "application/octet-stream",
        }));
        // Determine public URL base
        let base = env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
        if (!base && env.S3_ENDPOINT) {
          try {
            const host = new URL(env.S3_ENDPOINT).host;
            if (host.endsWith("r2.cloudflarestorage.com")) {
              base = `https://${env.S3_BUCKET}.${host}`;
            }
          } catch {}
        }
        const url = base ? `${base}/${key}` : `/${key}`; // fall back to relative; caller can prefix later
        urls.push(url);
      }
      return res.json({ urls });
    } else {
      const urls = files.map((f) => `/uploads/${path.basename(f.path)}`);
      return res.json({ urls });
    }
  });

  return router;
}
