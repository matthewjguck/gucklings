export type TextStyle = 'normal' | 'heading' | 'handwriting' | 'pixel' | 'shout' | 'artsy' | 'decorative' | 'comic' | 'bold' | 'liquida' | 'dottonoji' | 'tsuchinoko' | 'redaction' | 'inter'

import type { ImageAdjustments } from '@/lib/imageProcessing'

export interface CornerSticker {
  id: string
  previewUrl: string
  fullUrl: string
  ditheredDataUrl?: string
  rotation?: number
  scale?: number
  offsetX?: number
  offsetY?: number
}

export interface Signature {
  text: string
  style: TextStyle
  rotation?: number
  scale?: number
  offsetX?: number
  offsetY?: number
}

export type Block =
  | { id: string; type: 'text'; content: string; style: TextStyle; fontSizeMultiplier?: number; redactionLevel?: number; fontWeight?: number; isItalic?: boolean; isBold?: boolean }
  | { id: string; type: 'image'; dataUrl: string; adjustments?: ImageAdjustments }
  | { id: string; type: 'sticker'; previewUrl: string; fullUrl: string; ditheredDataUrl?: string; size?: number }

export interface FontStyleConfig {
  fontFamily: string
  fontSize: number
  fontWeight: number
  textTransform?: 'uppercase' | 'none'
  lineHeight: number
}

export const FONT_STYLES: Record<TextStyle, FontStyleConfig> = {
  normal: {
    fontFamily: "adobe-garamond-pro, 'Playfair Display', Georgia, serif",
    fontSize: 32,
    fontWeight: 400,
    lineHeight: 1.6,
  },
  heading: {
    fontFamily: "benton-sans, 'Playfair Display', Georgia, serif",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  handwriting: {
    fontFamily: "snell-roundhand, 'Caveat', cursive",
    fontSize: 20,
    fontWeight: 400,
    lineHeight: 1.4,
  },
  pixel: {
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 18,
    fontWeight: 400,
    lineHeight: 2,
  },
  shout: {
    fontFamily: "bureau-grot, 'Permanent Marker', cursive",
    fontSize: 28,
    fontWeight: 400,
    textTransform: 'uppercase',
    lineHeight: 1.3,
  },
  artsy: {
    fontFamily: "snell-roundhand, cursive",
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  decorative: {
    fontFamily: "ff-tisa-web-pro, adobe-garamond-pro, Georgia, serif",
    fontSize: 38,
    fontWeight: 700,
    lineHeight: 2.0,
  },
  comic: {
    fontFamily: "europa, 'Comic Neue', cursive",
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.6,
  },
  bold: {
    fontFamily: "av-pro, ff-tisa-web-pro, Georgia, serif",
    fontSize: 28,
    fontWeight: 900,
    lineHeight: 1.6,
  },
  liquida: {
    fontFamily: "liquida, sans-serif",
    fontSize: 28,
    fontWeight: 200,
    lineHeight: 1.4,
  },
  dottonoji: {
    fontFamily: "dottonoji, sans-serif",
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1.4,
  },
  tsuchinoko: {
    fontFamily: "tsuchinoko, sans-serif",
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1.4,
  },
  redaction: {
    fontFamily: "redaction-50, sans-serif",
    fontSize: 32,
    fontWeight: 400,
    lineHeight: 1.4,
  },
  inter: {
    fontFamily: "var(--font-printvetica), Inter, sans-serif",
    fontSize: 28,
    fontWeight: 400,
    lineHeight: 1.5,
  },
}

export const STYLE_LABELS: Record<TextStyle, string> = {
  normal: 'Serif',
  heading: 'Heading',
  handwriting: 'Handwriting',
  pixel: 'Pixel',
  shout: 'Shout!',
  artsy: 'Artsy',
  decorative: 'Fancy',
  comic: 'Comic',
  bold: 'Bold',
  liquida: 'Liquida',
  dottonoji: 'Dottonoji',
  tsuchinoko: 'Tsuchinoko',
  redaction: 'Redaction',
  inter: 'Printvetica',
}

let _blockId = 0
export function newBlockId(): string {
  return `block-${Date.now()}-${_blockId++}`
}
