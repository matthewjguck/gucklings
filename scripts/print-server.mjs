#!/usr/bin/env node
/**
 * Local ESC/POS print server for testing.
 *
 * Usage:
 *   node scripts/print-server.mjs [device_path]
 *
 * Examples:
 *   node scripts/print-server.mjs /dev/usb/lp0
 *   node scripts/print-server.mjs /dev/cu.usbserial-1234
 *   node scripts/print-server.mjs              # dry-run mode (no printer)
 *
 * Endpoints:
 *   POST /print    — send raw ESC/POS bytes to the printer
 *   POST /preview  — receive base64 ESC/POS, return a PNG of the decoded bitmap
 *   GET  /status   — health check
 */

import { createServer } from 'node:http'
import { access, writeFile, open, mkdtemp, unlink, rmdir } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCanvas } from './canvas-shim.mjs'

const PORT = 9100
const PRINTER_WIDTH_DOTS = 576
const execFileAsync = promisify(execFile)

async function getDefaultCupsQueue() {
  try {
    const { stdout } = await execFileAsync('lpstat', ['-d'])
    const match = stdout.match(/system default destination:\s*(\S+)/i)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

async function pathExists(path) {
  try {
    await access(path, fsConstants.W_OK)
    return true
  } catch {
    return false
  }
}

async function discoverDevicePath(requestedPath) {
  if (requestedPath && (await pathExists(requestedPath))) {
    return requestedPath
  }

  const candidates = [
    '/dev/usb/lp0',
    '/dev/usb/lp1',
    '/dev/cu.usbserial',
    '/dev/cu.usbmodem',
    '/dev/cu.usb',
  ]

  for (const candidate of candidates) {
    if (candidate.endsWith('*')) continue
    if (await pathExists(candidate)) {
      return candidate
    }
  }

  try {
    const { stdout } = await execFileAsync('sh', ['-lc', 'ls /dev/cu.* /dev/tty.* 2>/dev/null | grep -iE "usb|serial|modem|printer|pos|brightek" | head -n 1'])
    const discovered = stdout.trim()
    if (discovered && (await pathExists(discovered))) {
      return discovered
    }
  } catch {
    // ignore and fall through to dry-run
  }

  return null
}

async function resolvePrintTarget() {
  const arg = process.argv[2] ?? null
  const envQueue = process.env.PRINTER_QUEUE ?? null
  const requestedTarget = arg ?? envQueue

  if (requestedTarget && !requestedTarget.startsWith('/')) {
    return { mode: 'cups', queue: requestedTarget }
  }

  const device = await discoverDevicePath(requestedTarget)
  if (device) {
    return { mode: 'device', device }
  }

  const defaultQueue = await getDefaultCupsQueue()
  if (defaultQueue) {
    return { mode: 'cups', queue: defaultQueue }
  }

  return { mode: 'dry-run' }
}

async function sendViaCups(queue, data) {
  const dir = await mkdtemp(join(tmpdir(), 'escpos-'))
  const filePath = join(dir, 'job.bin')
  try {
    await writeFile(filePath, data)
    const { stdout, stderr } = await execFileAsync('lp', ['-d', queue, '-o', 'raw', filePath])
    const out = (stdout + stderr).trim()
    if (out) {
      console.log(`CUPS: ${out}`)
    }
  } finally {
    try {
      await unlink(filePath)
    } catch {
      // ignore cleanup errors
    }
    try {
      await rmdir(dir)
    } catch {
      // ignore cleanup errors
    }
  }
}

const targetPromise = resolvePrintTarget()

if (!process.argv[2] && !process.env.PRINTER_QUEUE) {
  console.log('⚠  No explicit print target provided — trying device auto-discovery, then default CUPS queue, then dry-run')
  console.log('   Usage: node scripts/print-server.mjs /dev/cu.usbserial-1234')
  console.log('   or:    node scripts/print-server.mjs Brightek_POS80\n')
}

const server = createServer(async (req, res) => {
  // CORS headers for local dev
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/status') {
    const target = await targetPromise
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, ...target }))
    return
  }

  if (req.method === 'POST' && req.url === '/print') {
    try {
      const target = await targetPromise
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const data = Buffer.concat(chunks)

      console.log(`Received ${data.length} bytes`)

      if (target.mode === 'device') {
        const fd = await open(target.device, 'w')
        await fd.write(data)
        await fd.close()
        console.log(`Sent to device ${target.device}`)
      } else if (target.mode === 'cups') {
        await sendViaCups(target.queue, data)
        console.log(`Sent to CUPS queue ${target.queue}`)
      } else {
        await writeFile('last-print.bin', data)
        console.log('Saved to last-print.bin (dry-run)')
      }

      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('OK')
    } catch (e) {
      console.error('Print error:', e.message)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(e.message)
    }
    return
  }

  if (req.method === 'POST' && req.url === '/preview') {
    try {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const b64 = Buffer.concat(chunks).toString('utf-8')
      const data = Buffer.from(b64, 'base64')

      // Parse GS v 0 command to extract bitmap
      const png = decodeEscPosToPng(data)

      res.writeHead(200, { 'Content-Type': 'image/png' })
      res.end(png)
    } catch (e) {
      console.error('Preview error:', e.message)
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(e.message)
    }
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

/**
 * Parse ESC/POS buffer, extract the GS v 0 bitmap, render to PNG.
 * Falls back to a text error image if canvas is not available.
 */
function decodeEscPosToPng(data) {
  const chunks = []
  let scanFrom = 0

  // Parse every GS v 0 raster block in the buffer and combine them vertically.
  while (scanFrom < data.length - 7) {
    let offset = -1
    for (let i = scanFrom; i < data.length - 7; i++) {
      if (data[i] === 0x1D && data[i + 1] === 0x76 && data[i + 2] === 0x30) {
        offset = i
        break
      }
    }
    if (offset === -1) break

    const m = data[offset + 3]
    const xL = data[offset + 4]
    const xH = data[offset + 5]
    const yL = data[offset + 6]
    const yH = data[offset + 7]
    const bytesPerLine = xL + (xH << 8)
    const chunkHeight = yL + (yH << 8)
    const bitmapStart = offset + 8
    const bitmapLen = bytesPerLine * chunkHeight
    const bitmapEnd = bitmapStart + bitmapLen

    if (bitmapEnd > data.length) {
      throw new Error('Corrupt GS v 0 block: bitmap exceeds buffer length')
    }

    chunks.push({ m, bytesPerLine, chunkHeight, bitmapStart, bitmapEnd })
    scanFrom = bitmapEnd
  }

  if (chunks.length === 0) throw new Error('No GS v 0 command found in data')

  const bytesPerLine = chunks[0].bytesPerLine
  for (const chunk of chunks) {
    if (chunk.bytesPerLine !== bytesPerLine) {
      throw new Error('Inconsistent raster width across GS v 0 chunks')
    }
  }

  const totalHeight = chunks.reduce((sum, chunk) => sum + chunk.chunkHeight, 0)
  const width = bytesPerLine * 8
  console.log(`Preview: ${width}x${totalHeight} (${bytesPerLine} bytes/line, ${chunks.length} chunk(s))`)

  const canvas = createCanvas(width, totalHeight)
  const ctx = canvas.getContext('2d')
  const imgData = ctx.createImageData(width, totalHeight)

  let yOffset = 0
  for (const chunk of chunks) {
    for (let y = 0; y < chunk.chunkHeight; y++) {
      for (let x = 0; x < width; x++) {
        const byteIdx = chunk.bitmapStart + y * bytesPerLine + Math.floor(x / 8)
        const bitIdx = 7 - (x % 8)
        const isBlack = (data[byteIdx] >> bitIdx) & 1
        const px = ((yOffset + y) * width + x) * 4
        const val = isBlack ? 0 : 255
        imgData.data[px] = val
        imgData.data[px + 1] = val
        imgData.data[px + 2] = val
        imgData.data[px + 3] = 255
      }
    }
    yOffset += chunk.chunkHeight
  }

  ctx.putImageData(imgData, 0, 0)
  return canvas.toBuffer('image/png')
}

server.listen(PORT, () => {
  console.log(`\n🖨  ESC/POS print server running on http://localhost:${PORT}`)
  targetPromise.then((target) => {
    if (target.mode === 'device') {
      console.log(`   Mode: DEVICE → ${target.device}`)
    } else if (target.mode === 'cups') {
      console.log(`   Mode: CUPS → ${target.queue}`)
    } else {
      console.log('   Mode: DRY-RUN (no printer)')
    }
  })
  console.log(`   Endpoints:`)
  console.log(`     POST /print    — send raw bytes to printer`)
  console.log(`     POST /preview  — base64 ESC/POS → PNG`)
  console.log(`     GET  /status   — health check\n`)
})
