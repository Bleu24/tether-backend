"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadsRouter = uploadsRouter;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const env_1 = require("../config/env");
// Optional S3-compatible storage
let useS3 = Boolean(env_1.env.S3_BUCKET && env_1.env.S3_ENDPOINT && env_1.env.S3_ACCESS_KEY_ID && env_1.env.S3_SECRET_ACCESS_KEY);
let S3ClientCtor = null;
let PutObjectCommandCtor = null;
if (useS3) {
    try {
        // Lazy require to avoid install requirement during local-only flows
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const s3 = require("@aws-sdk/client-s3");
        S3ClientCtor = s3.S3Client;
        PutObjectCommandCtor = s3.PutObjectCommand;
    }
    catch {
        useS3 = false;
    }
}
// Multer storage: memory for S3, disk otherwise
let upload;
if (useS3) {
    upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 6 } });
}
else {
    const uploadsRoot = path_1.default.resolve(process.cwd(), "uploads");
    fs_1.default.mkdirSync(uploadsRoot, { recursive: true });
    const storage = multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadsRoot),
        filename: (_req, file, cb) => {
            const ts = Date.now();
            const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
            cb(null, `${ts}-${safe}`);
        },
    });
    upload = (0, multer_1.default)({ storage, limits: { fileSize: 5 * 1024 * 1024, files: 6 } });
}
function uploadsRouter() {
    const router = (0, express_1.Router)();
    router.use(auth_1.requireUser);
    // Upload one or more images; field name: "files"
    router.post("/", upload.array("files", 6), async (req, res) => {
        const files = req.files || [];
        if (useS3 && S3ClientCtor && PutObjectCommandCtor) {
            const client = new S3ClientCtor({
                region: env_1.env.S3_REGION || "auto",
                endpoint: env_1.env.S3_ENDPOINT,
                forcePathStyle: env_1.env.S3_FORCE_PATH_STYLE,
                credentials: { accessKeyId: env_1.env.S3_ACCESS_KEY_ID, secretAccessKey: env_1.env.S3_SECRET_ACCESS_KEY },
            });
            const urls = [];
            for (const f of files) {
                const ts = Date.now();
                const safe = (f.originalname || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
                const key = `${res.locals.userId}/${ts}-${safe}`;
                await client.send(new PutObjectCommandCtor({
                    Bucket: env_1.env.S3_BUCKET,
                    Key: key,
                    Body: f.buffer,
                    ContentType: f.mimetype || "application/octet-stream",
                }));
                // Determine URL to return
                let url;
                if (env_1.env.S3_PUBLIC_BASE_URL && env_1.env.S3_PROXY === false) {
                    const base = env_1.env.S3_PUBLIC_BASE_URL.replace(/\/$/, "");
                    url = `${base}/${key}`;
                }
                else if (env_1.env.S3_PROXY || !env_1.env.S3_PUBLIC_BASE_URL) {
                    // Serve via backend proxy to avoid CORS/public bucket requirement
                    url = `/api/files/${encodeURIComponent(key)}`;
                }
                else {
                    // Best-effort direct R2 URL
                    try {
                        const host = new URL(env_1.env.S3_ENDPOINT).host;
                        url = `https://${env_1.env.S3_BUCKET}.${host}/${key}`;
                    }
                    catch {
                        url = `/${key}`;
                    }
                }
                urls.push(url);
            }
            return res.json({ urls });
        }
        else {
            const urls = files.map((f) => `/uploads/${path_1.default.basename(f.path)}`);
            return res.json({ urls });
        }
    });
    return router;
}
