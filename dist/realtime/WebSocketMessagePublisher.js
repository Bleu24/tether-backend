"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketMessagePublisher = void 0;
const WebSocketHub_1 = require("./WebSocketHub");
class WebSocketMessagePublisher {
    static get() {
        if (!this._instance)
            this._instance = new WebSocketMessagePublisher();
        return this._instance;
    }
    hub() {
        return WebSocketHub_1.WebSocketHub.get();
    }
    messageCreated(message) {
        this.hub().broadcastToMatch(message.match_id, "message:created", { message });
    }
    messageUpdated(message) {
        this.hub().broadcastToMatch(message.match_id, "message:updated", { message });
    }
    messageDeleted(id, matchId, scope, requesterId) {
        if (scope === "everyone") {
            this.hub().broadcastToMatch(matchId, "message:deleted", { id, matchId, scope });
        }
        else {
            this.hub().sendToUser(requesterId, "message:deleted", { id, matchId, scope });
        }
    }
    messageSeen(id, matchId, seenBy) {
        this.hub().broadcastToMatch(matchId, "message:seen", { id, matchId, seenBy });
    }
}
exports.WebSocketMessagePublisher = WebSocketMessagePublisher;
WebSocketMessagePublisher._instance = null;
