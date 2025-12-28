import { useEffect } from "react";
import { devLog } from "../utils/safeError";

type WebSocketHandler = (data: any) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<string, Set<WebSocketHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPongTime: number = 0;
  private canvasId: string | null = null;

  private readonly HEARTBEAT_INTERVAL_MS = 20000;
  private readonly HEARTBEAT_TIMEOUT_MS = 10000;

  connect(canvasId: string) {
    if (
      this.socket?.readyState === WebSocket.OPEN &&
      this.canvasId === canvasId
    )
      return;

    this.disconnect();
    this.canvasId = canvasId;

    let url: string;
    if (import.meta.env.VITE_WS_TARGET) {
      url = `${import.meta.env.VITE_WS_TARGET}/ws?canvas_id=${canvasId}`;
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      url = `${protocol}//${host}/ws?canvas_id=${canvasId}`;
    }

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      devLog.log("WebSocket Connected");
      this.clearReconnect();
      this.lastPongTime = Date.now();
      this.startHeartbeat();
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message === "pong" || event.data === "pong") {
          this.lastPongTime = Date.now();
          return;
        }

        const { type, data } = message;
        this.emit(type, data);
      } catch (err) {
        if (event.data === "pong") {
          this.lastPongTime = Date.now();
          return;
        }
      }
    };

    this.socket.onclose = () => {
      devLog.log("WebSocket Disconnected");
      this.stopHeartbeat();
      this.scheduleReconnect();
    };

    this.socket.onerror = () => {
      devLog.error("WebSocket Error (connection failed)");
    };
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.clearReconnect();
    this.canvasId = null;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (
          timeSinceLastPong >
          this.HEARTBEAT_INTERVAL_MS + this.HEARTBEAT_TIMEOUT_MS
        ) {
          devLog.warn("WebSocket heartbeat timeout, reconnecting...");
          this.socket.close();
          return;
        }

        this.socket.send(JSON.stringify({ type: "Ping" }));
      }
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer && this.canvasId) {
      this.reconnectTimer = setTimeout(() => {
        devLog.log("Attempting to reconnect...");
        if (this.canvasId) {
          this.connect(this.canvasId);
        }
      }, 2000);
    }
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  on(type: string, handler: WebSocketHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)?.add(handler);
  }

  off(type: string, handler: WebSocketHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  private emit(type: string, data: any) {
    this.handlers.get(type)?.forEach((handler) => handler(data));
  }
}

export const wsService = new WebSocketService();

export const useWebSocket = (canvasId: string | undefined) => {
  useEffect(() => {
    if (canvasId) {
      wsService.connect(canvasId);
    } else {
      wsService.disconnect();
    }

    return () => {
      wsService.disconnect();
    };
  }, [canvasId]);
};
