import { devLog } from "../utils/safeError";
import { refreshToken, isRefreshing } from "./tokenRefresh";
import { useAuthStore } from "../store/authStore";

const API_URL = import.meta.env.VITE_API_TARGET
  ? `${import.meta.env.VITE_API_TARGET}/api`
  : "/api";

interface RpcResponse<T> {
  jsonrpc: "2.0";
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: number | string;
}

const UNAUTHORIZED_ERROR_CODE = -32020;

export const rpc = async <T>(method: string, params: Record<string, unknown> = {}, isRetry = false): Promise<T> => {
  const payload = {
    jsonrpc: "2.0",
    method,
    params,
    id: Date.now(),
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      }
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data: RpcResponse<T> = await response.json();

    if (data.error) {
      // Retry with refresh on auth errors (skip for auth methods and retries)
      if (
        data.error.code === UNAUTHORIZED_ERROR_CODE &&
        !method.startsWith("auth.") &&
        !isRetry &&
        !isRefreshing()
      ) {
        try {
          await refreshToken();
          return rpc<T>(method, params, true);
        } catch {
          useAuthStore.getState().clearAuth();
        }
      }

      const err: Error & { code?: number; data?: unknown } = new Error(data.error.message || "RPC Error");
      err.code = data.error.code;
      err.data = data.error.data;
      throw err;
    }

    return data.result as T;
  } catch (error) {
    devLog.error("RPC Call Failed:", error);
    throw error;
  }
};
