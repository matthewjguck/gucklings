#!/usr/bin/env node
/**
 * Test print server setup and connectivity
 *
 * Usage:
 *   node scripts/test-print-setup.mjs
 *   node scripts/test-print-setup.mjs supabase   # Test Supabase specifically
 *   node scripts/test-print-setup.mjs local      # Test local server
 */

import https from 'https'
import http from 'http'

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

function log(color, icon, message) {
  console.log(`${colors[color]}${icon} ${message}${colors.reset}`)
}

function success(msg) { log('green', '✓', msg) }
function error(msg) { log('red', '✗', msg) }
function warn(msg) { log('yellow', '⚠', msg) }
function info(msg) { log('blue', 'ℹ', msg) }

async function testLocalPrintServer() {
  info('Testing local print server...')

  const url = 'http://localhost:9100/status'

  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const status = JSON.parse(data)
          success(`Local server running (mode: ${status.mode})`)
          resolve(true)
        } catch {
          error('Invalid response from local server')
          resolve(false)
        }
      })
    })

    req.on('error', () => {
      error('Local print server not running at http://localhost:9100')
      info('Start it with: npm run dev:print')
      resolve(false)
    })

    req.setTimeout(2000)
  })
}

async function testSupabaseConnection() {
  info('Testing Supabase configuration...')

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    warn('VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set')
    info('Add them to .env file')
    return false
  }

  success('Supabase credentials found in .env')

  // Test connectivity
  return new Promise((resolve) => {
    const testUrl = new URL(url)
    const options = {
      hostname: testUrl.hostname,
      path: '/rest/v1/printers?select=id&limit=1',
      headers: {
        'Authorization': `Bearer ${key}`,
        'apikey': key,
      }
    }

    const req = https.get(options, (res) => {
      if (res.statusCode === 200) {
        success('Connected to Supabase')
        resolve(true)
      } else {
        error(`Supabase returned ${res.statusCode}`)
        resolve(false)
      }
    })

    req.on('error', (err) => {
      error(`Supabase connection failed: ${err.message}`)
      resolve(false)
    })

    req.setTimeout(5000)
  })
}

async function testPrintBackendConfig() {
  info('Checking print backend configuration...')

  const backend = process.env.VITE_PRINT_BACKEND || 'local (default)'

  if (backend === 'local' || backend === 'local (default)') {
    info(`Print backend: LOCAL (testing mode)`)
    info('Prints will be saved to last-print.bin')
  } else if (backend === 'supabase') {
    info('Print backend: SUPABASE (production)')
    info('Jobs will be queued in Supabase for Raspberry Pi')
  } else {
    warn(`Unknown backend: ${backend}`)
  }
}

async function testRaspberryPiSetup() {
  info('Checking Raspberry Pi print server setup...')

  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'PRINTER_ID',
  ]

  const envPath = './print-server/.env'
  const fs = await import('fs/promises')

  try {
    const content = await fs.readFile(envPath, 'utf-8')
    const missing = []

    for (const key of required) {
      if (!content.includes(key)) {
        missing.push(key)
      }
    }

    if (missing.length === 0) {
      success(`${envPath} is configured`)
    } else {
      warn(`${envPath} missing: ${missing.join(', ')}`)
      info(`See SETUP_PRINTING.md for configuration steps`)
    }
  } catch {
    warn(`${envPath} not found`)
    info('Create it with: cp print-server/.env.example print-server/.env')
  }
}

async function main() {
  console.log('')
  console.log(`${colors.blue}Prague Print System - Setup Test${colors.reset}`)
  console.log('================================')
  console.log('')

  const target = process.argv[2]

  if (!target || target === 'local') {
    await testLocalPrintServer()
  }

  if (!target || target === 'supabase') {
    const localOk = !target || target === 'supabase'
    if (localOk) console.log('')
    await testSupabaseConnection()
  }

  console.log('')
  await testPrintBackendConfig()

  console.log('')
  await testRaspberryPiSetup()

  console.log('')
  info('For detailed setup: cat SETUP_PRINTING.md')
  console.log('')
}

main().catch(console.error)
