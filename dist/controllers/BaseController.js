"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseController = void 0;
class BaseController {
    ok(res, data) {
        return res.status(200).json({ success: true, data });
    }
    created(res, data) {
        return res.status(201).json({ success: true, data });
    }
    fail(res, error, status = 500) {
        const message = error instanceof Error ? error.message : String(error);
        return res.status(status).json({ success: false, message });
    }
    // A small wrapper to catch errors from async routes.
    handler(fn) {
        return (req, res, next) => {
            fn(req, res, next).catch(next);
        };
    }
}
exports.BaseController = BaseController;
