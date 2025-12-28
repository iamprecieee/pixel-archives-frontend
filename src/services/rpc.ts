const API_URL = import.meta.env.VITE_API_TARGET
  ? `${import.meta.env.VITE_API_TARGET}/api`
  : "/api";

import { devLog } from "../utils/safeError";

interface RpcResponse<T> {
  jsonrpc: "2.0";
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string;
}

export const rpc = async <T>(method: string, params: any = {}): Promise<T> => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const payload = {
    jsonrpc: "2.0",
    method,
    params,
    id: Date.now(),
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers,
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
      // Throw full error object to access data (e.g. cooldown remaining_ms)
      const err: any = new Error(data.error.message || "RPC Error");
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
