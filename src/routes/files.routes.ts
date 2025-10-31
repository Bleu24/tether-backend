import { Router, Request, Response } from "express";
import { env } from "../config/env";

// Lazy require to avoid mandatory SDK at build time
let S3ClientCtor: any = null;
let GetObjectCommandCtor: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const s3 = require("@aws-sdk/client-s3");
  S3ClientCtor = s3.S3Client;
  GetObjectCommandCtor = s3.GetObjectCommand;
} catch {}

export function filesRouter(): Router {
  const router = Router();

  // Stream an object from S3/R2 via backend to avoid CORS/public bucket needs
  router.get("/:key(*)", async (req: Request, res: Response) => {
    if (!S3ClientCtor || !GetObjectCommandCtor || !env.S3_BUCKET || !env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
      return res.status(503).json({ error: "File proxy not configured" });
    }
    try {
      const client = new S3ClientCtor({
        region: env.S3_REGION || "auto",
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
        credentials: { accessKeyId: env.S3_ACCESS_KEY_ID!, secretAccessKey: env.S3_SECRET_ACCESS_KEY! },
      });
      const key = req.params.key;
      const result = await client.send(new GetObjectCommandCtor({ Bucket: env.S3_BUCKET, Key: key }));
      // CORS header for browsers
      const cors = env.CORS_ORIGIN === "*" ? "*" : (env.CORS_ORIGIN || "*");
      res.setHeader("Access-Control-Allow-Origin", cors);
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (result.ContentType) res.setHeader("Content-Type", result.ContentType);
      // @ts-ignore Body is a stream
      result.Body.pipe(res);
    } catch (err: any) {
      return res.status(404).json({ error: "File not found", detail: err?.message });
    }
  });

  return router;
}
