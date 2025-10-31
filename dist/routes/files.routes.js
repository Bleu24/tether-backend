"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filesRouter = filesRouter;
const express_1 = require("express");
const env_1 = require("../config/env");
// Lazy require to avoid mandatory SDK at build time
let S3ClientCtor = null;
let GetObjectCommandCtor = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const s3 = require("@aws-sdk/client-s3");
    S3ClientCtor = s3.S3Client;
    GetObjectCommandCtor = s3.GetObjectCommand;
}
catch { }
function filesRouter() {
    const router = (0, express_1.Router)();
    // Stream an object from S3/R2 via backend to avoid CORS/public bucket needs
    router.get("/:key(*)", async (req, res) => {
        if (!S3ClientCtor || !GetObjectCommandCtor || !env_1.env.S3_BUCKET || !env_1.env.S3_ENDPOINT || !env_1.env.S3_ACCESS_KEY_ID || !env_1.env.S3_SECRET_ACCESS_KEY) {
            return res.status(503).json({ error: "File proxy not configured" });
        }
        try {
            const client = new S3ClientCtor({
                region: env_1.env.S3_REGION || "auto",
                endpoint: env_1.env.S3_ENDPOINT,
                forcePathStyle: env_1.env.S3_FORCE_PATH_STYLE,
                credentials: { accessKeyId: env_1.env.S3_ACCESS_KEY_ID, secretAccessKey: env_1.env.S3_SECRET_ACCESS_KEY },
            });
            const key = req.params.key;
            const result = await client.send(new GetObjectCommandCtor({ Bucket: env_1.env.S3_BUCKET, Key: key }));
            // CORS header for browsers
            const cors = env_1.env.CORS_ORIGIN === "*" ? "*" : (env_1.env.CORS_ORIGIN || "*");
            res.setHeader("Access-Control-Allow-Origin", cors);
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            if (result.ContentType)
                res.setHeader("Content-Type", result.ContentType);
            // @ts-ignore Body is a stream
            result.Body.pipe(res);
        }
        catch (err) {
            return res.status(404).json({ error: "File not found", detail: err?.message });
        }
    });
    return router;
}
