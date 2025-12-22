import { create } from "zustand";
import { rpc } from "../services/rpc";
import type { Canvas } from "../types/canvas";

interface CanvasState {
  ownedCanvases: Canvas[];
  collaboratingCanvases: Canvas[];
  loading: boolean;
  error: string | null;

  fetchCanvases: () => Promise<void>;
  createCanvas: (name: string, initialColor?: number) => Promise<Canvas>;
  joinCanvas: (inviteCode: string) => Promise<void>;
  initiatePublish: (canvasId: string) => Promise<any>;
  confirmPublish: (
    canvasId: string,
    signature: string,
    canvasPda: string,
  ) => Promise<any>;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  ownedCanvases: [],
  collaboratingCanvases: [],
  loading: false,
  error: null,

  fetchCanvases: async () => {
    set({ loading: true, error: null });
    try {
      const response = await rpc<{ owned: Canvas[]; collaborating: Canvas[] }>(
        "canvas.list",
      );
      set({
        ownedCanvases: response.owned,
        collaboratingCanvases: response.collaborating,
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || "Failed to fetch canvases",
        loading: false,
      });
    }
  },

  createCanvas: async (name: string, initialColor?: number) => {
    set({ loading: true, error: null });
    try {
      const canvas = await rpc<Canvas>("canvas.create", {
        name,
        initial_color: initialColor,
      });
      await get().fetchCanvases();
      return canvas;
    } catch (error: any) {
      set({
        error: error.message || "Failed to create canvas",
        loading: false,
      });
      throw error;
    }
  },

  joinCanvas: async (inviteCode: string) => {
    set({ loading: true, error: null });
    try {
      await rpc("canvas.join", { invite_code: inviteCode });
      await get().fetchCanvases();
    } catch (error: any) {
      set({ error: error.message || "Failed to join canvas", loading: false });
      throw error;
    }
  },

  initiatePublish: async (canvasId: string) => {
    return await rpc<any>("canvas.publish", { canvas_id: canvasId });
  },

  confirmPublish: async (
    canvasId: string,
    signature: string,
    canvasPda: string,
  ) => {
    return await rpc<any>("canvas.confirmPublish", {
      canvas_id: canvasId,
      signature,
      canvas_pda: canvasPda,
    });
  },
}));
