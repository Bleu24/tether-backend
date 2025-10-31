"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketHub = void 0;
const ws_1 = require("ws");
const MatchRepository_1 = require("../repositories/MatchRepository");
const DatabaseService_1 = require("../services/DatabaseService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
class WebSocketHub {
    constructor() {
        this.clients = new Map();
        this.matchRooms = new Map();
        this.userIndex = new Map();
    }
    static init(server) {
        if (!this._instance) {
            this._instance = new WebSocketHub();
            this._instance.attach(server);
        }
        return this._instance;
    }
    static get() {
        if (!this._instance)
            throw new Error("WebSocketHub not initialized");
        return this._instance;
    }
    attach(server) {
        this.wss = new ws_1.WebSocketServer({ server, path: "/ws" });
        const db = DatabaseService_1.DatabaseService.get();
        const matchRepo = new MatchRepository_1.MatchRepository(db);
        this.wss.on("connection", async (socket, req) => {
            const url = new URL(req.url ?? "", "http://localhost");
            // Prefer JWT token for auth, fallback to userId (legacy)
            let userId = null;
            const token = url.searchParams.get("token");
            if (token) {
                try {
                    const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
                    const id = Number(payload.sub);
                    if (Number.isFinite(id) && id > 0)
                        userId = id;
                }
                catch {
                    // invalid token
                }
            }
            if (userId === null) {
                const userIdParam = url.searchParams.get("userId");
                const id = Number(userIdParam);
                if (userIdParam && Number.isFinite(id) && id > 0)
                    userId = id;
            }
            if (!userId) {
                socket.close(1008, "unauthorized");
                return;
            }
            this.addToUserIndex(userId, socket);
            this.clients.set(socket, { userId, subscriptions: new Set() });
            socket.on("message", async (raw) => {
                try {
                    const msg = JSON.parse(String(raw));
                    if (msg?.type === "subscribe" && typeof msg.matchId === "number") {
                        const match = await matchRepo.findById(msg.matchId);
                        if (!match)
                            return;
                        if (match.user_a_id !== userId && match.user_b_id !== userId)
                            return;
                        this.joinRoom(socket, msg.matchId);
                        socket.send(JSON.stringify({ event: "subscribed", data: { matchId: msg.matchId } }));
                    }
                    else if (msg?.type === "unsubscribe" && typeof msg.matchId === "number") {
                        this.leaveRoom(socket, msg.matchId);
                        socket.send(JSON.stringify({ event: "unsubscribed", data: { matchId: msg.matchId } }));
                    }
                    else if (msg?.type === "typing" && typeof msg.matchId === "number") {
                        // Broadcast typing indicator to the match room if the sender is a member
                        const match = await matchRepo.findById(msg.matchId);
                        if (!match)
                            return;
                        if (match.user_a_id !== userId && match.user_b_id !== userId)
                            return;
                        this.broadcastToMatch(msg.matchId, "message:typing", { matchId: msg.matchId, userId });
                    }
                }
                catch {
                    // ignore malformed
                }
            });
            socket.on("close", () => this.cleanup(socket));
            socket.on("error", () => this.cleanup(socket));
        });
    }
    addToUserIndex(userId, socket) {
        if (!this.userIndex.has(userId))
            this.userIndex.set(userId, new Set());
        this.userIndex.get(userId).add(socket);
    }
    removeFromUserIndex(userId, socket) {
        const set = this.userIndex.get(userId);
        if (!set)
            return;
        set.delete(socket);
        if (set.size === 0)
            this.userIndex.delete(userId);
    }
    joinRoom(socket, matchId) {
        if (!this.matchRooms.has(matchId))
            this.matchRooms.set(matchId, new Set());
        this.matchRooms.get(matchId).add(socket);
        const info = this.clients.get(socket);
        if (info)
            info.subscriptions.add(matchId);
    }
    leaveRoom(socket, matchId) {
        const room = this.matchRooms.get(matchId);
        if (room) {
            room.delete(socket);
            if (room.size === 0)
                this.matchRooms.delete(matchId);
        }
        const info = this.clients.get(socket);
        if (info)
            info.subscriptions.delete(matchId);
    }
    cleanup(socket) {
        const info = this.clients.get(socket);
        if (!info)
            return;
        for (const matchId of info.subscriptions)
            this.leaveRoom(socket, matchId);
        this.removeFromUserIndex(info.userId, socket);
        this.clients.delete(socket);
    }
    broadcastToMatch(matchId, event, data) {
        const room = this.matchRooms.get(matchId);
        if (!room)
            return;
        const payload = JSON.stringify({ event, data });
        for (const ws of room) {
            if (ws.readyState === ws.OPEN)
                ws.send(payload);
        }
    }
    sendToUser(userId, event, data) {
        const set = this.userIndex.get(userId);
        if (!set)
            return;
        const payload = JSON.stringify({ event, data });
        for (const ws of set) {
            if (ws.readyState === ws.OPEN)
                ws.send(payload);
        }
    }
}
exports.WebSocketHub = WebSocketHub;
WebSocketHub._instance = null;
