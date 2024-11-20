declare module 'color-thief-node' {
    export function getPalette(image: string, colorCount: number): Promise<number[][]>;
    export function getColor(image: string): Promise<number[]>;
    export function getPaletteFromRgba(imageData: Uint8ClampedArray, colorCount: number): Promise<number[][]>;
    export function getColorFromRgba(imageData: Uint8ClampedArray): Promise<number[]>;
  }