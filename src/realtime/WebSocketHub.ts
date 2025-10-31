import { WebSocketServer, WebSocket, RawData } from "ws";
import type { Server, IncomingMessage } from "http";
import { MatchRepository } from "../repositories/MatchRepository";
import { DatabaseService } from "../services/DatabaseService";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

type ClientInfo = { userId: number; subscriptions: Set<number> };

function parseCookie(header?: string | string[]): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const raw = Array.isArray(header) ? header.join("; ") : header;
  raw.split(";").forEach((p) => {
    const idx = p.indexOf("=");
    if (idx > -1) {
      const k = p.slice(0, idx).trim();
      const v = decodeURIComponent(p.slice(idx + 1).trim());
      out[k] = v;
    }
  });
  return out;
}

export class WebSocketHub {
  private static _instance: WebSocketHub | null = null;
  private wss!: WebSocketServer;
  private clients = new Map<WebSocket, ClientInfo>();
  private matchRooms = new Map<number, Set<WebSocket>>();
  private userIndex = new Map<number, Set<WebSocket>>();
  private heartbeatTimer: NodeJS.Timer | null = null;

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
    // Use manual upgrade handling for better compatibility with proxies (Render, etc.)
    this.wss = new WebSocketServer({ noServer: true, clientTracking: true, perMessageDeflate: false });
    const db = DatabaseService.get();
    const matchRepo = new MatchRepository(db);

    // Accept WS on both /ws and /api/ws (some deployments rewrite through /api)
    const validPaths = new Set(["/ws", "/api/ws"]);
    (server as any).on("upgrade", (req: IncomingMessage, socket: any, head: Buffer) => {
      try {
        const pathname = new URL(req.url ?? "", "http://localhost").pathname || "/";
        if (!validPaths.has(pathname)) {
          socket.destroy();
          return;
        }
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit("connection", ws as unknown as WebSocket, req);
        });
      } catch {
        try { socket.destroy(); } catch {}
      }
    });

  this.wss.on("connection", async (socket: WebSocket, req: IncomingMessage) => {
      // Heartbeat tracking to keep connections alive behind proxies
      (socket as any).isAlive = true;
      socket.on("pong", () => { (socket as any).isAlive = true; });
      const url = new URL(req.url ?? "", "http://localhost");
      // Prefer JWT token for auth, fallback to userId (legacy)
      let userId: number | null = null;
      let token = url.searchParams.get("token");
      if (!token && req.headers?.authorization?.startsWith("Bearer ")) {
        token = req.headers.authorization.slice("Bearer ".length);
      }
      if (!token) {
        const cookies = parseCookie(req.headers.cookie);
        token = cookies["auth_token"]; // same cookie name used by HTTP auth
      }
      if (token) {
        try {
          const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
          const id = Number(payload.sub);
          if (Number.isFinite(id) && id > 0) userId = id;
        } catch {
          // invalid token
        }
      }
      if (userId === null) {
        const userIdParam = url.searchParams.get("userId");
        const id = Number(userIdParam);
        if (userIdParam && Number.isFinite(id) && id > 0) userId = id;
      }
      if (!userId) {
        // Don't hard-close; allow connection to stay open for later auth or passive features
        try { socket.send(JSON.stringify({ event: "unauthorized" })); } catch {}
        // Do not register this socket until authenticated
        socket.on("close", () => socket.terminate());
        socket.on("error", () => socket.terminate());
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

    // Initialize heartbeat pings (runs once)
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        for (const ws of this.wss.clients) {
          const alive = (ws as any).isAlive;
          if (alive === false) {
            try { ws.terminate(); } catch {}
            continue;
          }
          (ws as any).isAlive = false;
          try { ws.ping(); } catch {}
        }
      }, 30000);
    }
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
