import { WebSocketServer, WebSocket, RawData } from "ws";
import type { Server, IncomingMessage } from "http";
import { MatchRepository } from "../repositories/MatchRepository";
import { DatabaseService } from "../services/DatabaseService";

type ClientInfo = { userId: number; subscriptions: Set<number> };

export class WebSocketHub {
  private static _instance: WebSocketHub | null = null;
  private wss!: WebSocketServer;
  private clients = new Map<WebSocket, ClientInfo>();
  private matchRooms = new Map<number, Set<WebSocket>>();
  private userIndex = new Map<number, Set<WebSocket>>();

  static init(server: Server): WebSocketHub {
    if (!this._instance) {
      this._instance = new WebSocketHub();
      this._instance.attach(server);
    }
    return this._instance;
  }

  static get(): WebSocketHub {
    if (!this._instance) throw new Error("WebSocketHub not initialized");
    return this._instance;
  }

  private attach(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    const db = DatabaseService.get();
    const matchRepo = new MatchRepository(db);

  this.wss.on("connection", async (socket: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url ?? "", "http://localhost");
      const userIdParam = url.searchParams.get("userId");
      const userId = Number(userIdParam);
      if (!userIdParam || !userId || Number.isNaN(userId)) {
        socket.close(1008, "userId is required");
        return;
      }

      this.addToUserIndex(userId, socket);
      this.clients.set(socket, { userId, subscriptions: new Set() });

  socket.on("message", async (raw: RawData) => {
        try {
          const msg = JSON.parse(String(raw));
          if (msg?.type === "subscribe" && typeof msg.matchId === "number") {
            const match = await matchRepo.findById(msg.matchId);
            if (!match) return;
            if (match.user_a_id !== userId && match.user_b_id !== userId) return;
            this.joinRoom(socket, msg.matchId);
            socket.send(JSON.stringify({ event: "subscribed", data: { matchId: msg.matchId } }));
          } else if (msg?.type === "unsubscribe" && typeof msg.matchId === "number") {
            this.leaveRoom(socket, msg.matchId);
            socket.send(JSON.stringify({ event: "unsubscribed", data: { matchId: msg.matchId } }));
          } else if (msg?.type === "typing" && typeof msg.matchId === "number") {
            // Broadcast typing indicator to the match room if the sender is a member
            const match = await matchRepo.findById(msg.matchId);
            if (!match) return;
            if (match.user_a_id !== userId && match.user_b_id !== userId) return;
            this.broadcastToMatch(msg.matchId, "message:typing", { matchId: msg.matchId, userId });
          }
        } catch {
          // ignore malformed
        }
      });

      socket.on("close", () => this.cleanup(socket));
      socket.on("error", () => this.cleanup(socket));
    });
  }

  private addToUserIndex(userId: number, socket: WebSocket) {
    if (!this.userIndex.has(userId)) this.userIndex.set(userId, new Set());
    this.userIndex.get(userId)!.add(socket);
  }

  private removeFromUserIndex(userId: number, socket: WebSocket) {
    const set = this.userIndex.get(userId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) this.userIndex.delete(userId);
  }

  private joinRoom(socket: WebSocket, matchId: number) {
    if (!this.matchRooms.has(matchId)) this.matchRooms.set(matchId, new Set());
    this.matchRooms.get(matchId)!.add(socket);
    const info = this.clients.get(socket);
    if (info) info.subscriptions.add(matchId);
  }

  private leaveRoom(socket: WebSocket, matchId: number) {
    const room = this.matchRooms.get(matchId);
    if (room) {
      room.delete(socket);
      if (room.size === 0) this.matchRooms.delete(matchId);
    }
    const info = this.clients.get(socket);
    if (info) info.subscriptions.delete(matchId);
  }

  private cleanup(socket: WebSocket) {
    const info = this.clients.get(socket);
    if (!info) return;
    for (const matchId of info.subscriptions) this.leaveRoom(socket, matchId);
    this.removeFromUserIndex(info.userId, socket);
    this.clients.delete(socket);
  }

  broadcastToMatch(matchId: number, event: string, data: any) {
    const room = this.matchRooms.get(matchId);
    if (!room) return;
    const payload = JSON.stringify({ event, data });
    for (const ws of room) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }

  sendToUser(userId: number, event: string, data: any) {
    const set = this.userIndex.get(userId);
    if (!set) return;
    const payload = JSON.stringify({ event, data });
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) ws.send(payload);
    }
  }
}
