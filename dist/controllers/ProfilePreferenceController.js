"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilePreferenceController = void 0;
const BaseController_1 = require("./BaseController");
class ProfilePreferenceController extends BaseController_1.BaseController {
    constructor(service) {
        super();
        this.service = service;
        this.get = this.handler(async (req, res) => {
            const userId = Number(req.params.userId);
            if (!Number.isFinite(userId) || userId <= 0) {
                return this.fail(res, "Invalid user id", 400);
            }
            const pref = await this.service.get(userId);
            return this.ok(res, pref);
        });
        this.update = this.handler(async (req, res) => {
            const userId = Number(req.params.userId);
            if (!Number.isFinite(userId) || userId <= 0) {
                return this.fail(res, "Invalid user id", 400);
            }
            const pref = await this.service.update(userId, req.body);
            return this.ok(res, pref);
        });
    }
}
exports.ProfilePreferenceController = ProfilePreferenceController;
