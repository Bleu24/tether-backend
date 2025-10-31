"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const BaseController_1 = require("./BaseController");
class UserController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.list = this.handler(async (_req, res) => {
            const users = await this.service.list();
            return this.ok(res, users);
        });
        this.create = this.handler(async (req, res) => {
            const user = await this.service.create(req.body);
            return this.created(res, user);
        });
        this.get = this.handler(async (req, res) => {
            const id = Number(req.params.id);
            const user = await this.service.getById(id);
            if (!user)
                return this.fail(res, "User not found", 404);
            return this.ok(res, user);
        });
        this.update = this.handler(async (req, res) => {
            const id = Number(req.params.id);
            const user = await this.service.update(id, req.body);
            return this.ok(res, user);
        });
        this.delete = this.handler(async (req, res) => {
            const id = Number(req.params.id);
            const requester = res.locals?.userId;
            if (!requester || requester !== id) {
                return this.fail(res, "Forbidden", 403);
            }
            await this.service.softDelete(id);
            // Optional: clear auth for the deleter if deleting self; enforcement can be in route middleware
            try {
                // static import to satisfy NodeNext module resolution
                const { clearAuthCookie } = require("../middleware/jwt");
                if (typeof clearAuthCookie === "function")
                    clearAuthCookie(res);
            }
            catch { }
            return this.ok(res, { id, deleted: true });
        });
    }
}
exports.UserController = UserController;
