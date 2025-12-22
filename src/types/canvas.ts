export interface Canvas {
  id: string;
  name: string;
  invite_code: string;
  state:
    | "draft"
    | "publishing"
    | "published"
    | "mint_pending"
    | "minting"
    | "minted";
  owner_id: string;
  canvas_pda?: string;
  mint_address?: string;
  creators?: Array<{ address: string; share: number }>;
}

export interface CanvasPixel {
  x: number;
  y: number;
  color: number;
  owner_id?: string;
  price_lamports: number;
  pending?: boolean;
}

export interface CanvasWithPixels {
  canvas: Canvas;
  pixels: CanvasPixel[];
}
