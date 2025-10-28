import { Request, Response, NextFunction } from "express";

export abstract class BaseController {
    protected ok<T>(res: Response, data?: T) {
        return res.status(200).json({ success: true, data });
    }
    protected created<T>(res: Response, data?: T) {
        return res.status(201).json({ success: true, data });
    }
    protected fail(res: Response, error: unknown, status = 500) {
        const message = error instanceof Error ? error.message : String(error);
        return res.status(status).json({ success: false, message });
    }
    // A small wrapper to catch errors from async routes.
    protected handler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
        return (req: Request, res: Response, next: NextFunction) => {
            fn(req, res, next).catch(next);
        };
    }
}
