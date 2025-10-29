import { Router, Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireUser } from "../middleware/auth";

const uploadsRoot = path.resolve(process.cwd(), "uploads");
// Ensure directory exists
fs.mkdirSync(uploadsRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: (error: any, destination: string) => void) => cb(null, uploadsRoot),
  filename: (_req: Request, file: any, cb: (error: any, filename: string) => void) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${ts}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 }, // 5MB per file, max 6
});

export function uploadsRouter(): Router {
  const router = Router();
  router.use(requireUser);

  // Upload one or more images; field name: "files"
  router.post("/", upload.array("files", 6), (req: Request, res) => {
    const files = (req.files as any[]) || [];
    const urls = files.map((f) => `/uploads/${path.basename(f.path)}`);
    return res.json({ urls });
  });

  return router;
}
