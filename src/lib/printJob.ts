import { supabase } from './supabase'
import { renderToPrintBuffer, bufferToBase64, renderBase64ToPrintBuffer, type CornerStickerData } from './escpos'
import { PRINT_SERVER_URL, USE_LOCAL_PRINT_SERVER } from './printBackend'

interface SubmitPrintJobOptions {
  receiptElement: HTMLElement
  recipientName: string
  messageText?: string
  recipientId?: string
  recipientEmail?: string
  skipGeofence?: boolean
  printerId?: string
  cornerSticker?: CornerStickerData
  receiptStateJson?: string
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(out).set(bytes)
  return out
}

/**
 * Request location permission from the user (mobile-friendly).
 * Shows a system permission prompt on mobile devices.
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (!navigator.geolocation) {
    return false
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve(true),
      (error) => {
        console.error('Geolocation error:', error.code, error.message)
        resolve(false)
      },
      { enableHighAccuracy: true, timeout: 30_000, maximumAge: 0 }
    )
  })
}

/**
 * Get the user's current position via the Geolocation API.
 * Returns null if permission is denied or unavailable.
 */
function getCurrentPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000 }
    )
  })
}

/**
 * Fetch all active printers from the database.
 * Returns list of { id, name } or empty array if none found.
 */
export async function fetchAllActivePrinters(): Promise<{ id: string; name: string }[]> {
  if (!supabase) throw new Error('Supabase not configured')

  const { data: printers, error } = await supabase
    .from('printers')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[PrintJob] Error fetching printers:', error)
    return []
  }

  return printers ?? []
}

/**
 * Check which printer is nearest via geofence using the user's GPS location.
 * Returns { id, name } of the nearest printer, or null if outside all geofences or location unavailable.
 */
export async function checkNearestPrinter(): Promise<{ id: string; name: string } | null> {
  if (!supabase) throw new Error('Supabase not configured')

  // Get user's current position
  const position = await getCurrentPosition()
  if (!position) {
    console.log('[PrintJob] Could not get user location, cannot determine nearest printer')
    return null
  }

  const { latitude: lat, longitude: lng } = position.coords
  console.log('[PrintJob] User location:', { lat, lng })

  // Call the nearest_printer() RPC function
  const { data: nearestId, error } = await supabase.rpc('nearest_printer', {
    lat,
    lng,
  })

  if (error) {
    console.error('[PrintJob] Error calling nearest_printer RPC:', error)
    return null
  }

  if (!nearestId) {
    console.log('[PrintJob] No printer within geofence')
    return null
  }

  // Fetch the printer's name
  const { data: printer, error: fetchError } = await supabase
    .from('printers')
    .select('id, name')
    .eq('id', nearestId)
    .single()

  if (fetchError || !printer) {
    console.error('[PrintJob] Error fetching nearest printer details:', fetchError)
    return null
  }

  console.log('[PrintJob] Found nearest printer:', { id: printer.id, name: printer.name })
  return { id: printer.id, name: printer.name }
}

/**
 * Render a receipt element to ESC/POS, find the nearest printer via geofence,
 * and insert a print job into Supabase.
 *
 * Returns the job ID on success, or throws on failure.
 */
export async function submitPrintJob({ receiptElement, recipientName, messageText, recipientId, recipientEmail, skipGeofence: _skipGeofence, printerId: specifiedPrinterId, cornerSticker, receiptStateJson }: SubmitPrintJobOptions): Promise<string> {
  // 1. Render receipt to ESC/POS binary
  const { buffer, imageBase64 } = await renderToPrintBuffer(receiptElement, { cornerSticker })
  const payload = bufferToBase64(buffer)
  console.log('[PrintJob] Received imageBase64:', imageBase64 ? imageBase64.substring(0, 50) + '...' : 'null')

  if (USE_LOCAL_PRINT_SERVER || !supabase) {
    const response = await fetch(PRINT_SERVER_URL + '/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: toArrayBuffer(buffer),
    })

    if (!response.ok) {
      throw new Error(`Local print server returned ${response.status}: ${await response.text()}`)
    }

    return `local-${Date.now()}`
  }

  if (!supabase) throw new Error('Supabase not configured')

  // If a printer is explicitly specified, use it directly (admin override)
  if (specifiedPrinterId) {
    console.log('[PrintJob] Using specified printer:', specifiedPrinterId)
    const position = await getCurrentPosition()
    const lat = position?.coords.latitude ?? null
    const lng = position?.coords.longitude ?? null

    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      throw new Error('User email not available')
    }

    let senderName = user.email
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user.id)
        .single()

      if (profile?.display_name) {
        senderName = profile.display_name
      } else if (profile?.username) {
        senderName = profile.username
      }
    } catch (e) {
      console.log('[PrintJob] Could not fetch sender display name, using email:', senderName)
    }

    console.log('[PrintJob] Inserting with sender_email:', user.email, 'sender_name:', senderName)
    const { data: job, error } = await supabase
      .from('print_jobs')
      .insert({
        printer_id: specifiedPrinterId,
        sender_id: user?.id ?? null,
        sender_email: user.email,
        sender_name: senderName,
        recipient_name: recipientName,
        recipient_id: recipientId ?? null,
        recipient_email: recipientEmail ?? null,
        message_text: messageText ?? null,
        payload_base64: payload,
        receipt_state_json: receiptStateJson ?? null,
        receipt_image: imageBase64,
        sender_latitude: lat,
        sender_longitude: lng,
        printed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('[PrintJob] Insert error:', error)
      throw error
    }
    console.log('[PrintJob] Job submitted:', job.id)
    return job.id
  }

  // 2. Get sender's location for logging (optional, geofence disabled)
  let lat: number | null = null
  let lng: number | null = null
  try {
    const position = await getCurrentPosition()
    lat = position?.coords.latitude ?? null
    lng = position?.coords.longitude ?? null
    if (lat && lng) {
      console.log('[PrintJob] User location:', { lat, lng })
    }
  } catch (e) {
    console.log('[PrintJob] Location unavailable, proceeding without geofence')
  }

  // 3. Get the first available printer (geofence disabled for now)
  const { data: printers, error: printerError } = await supabase
    .from('printers')
    .select('id')
    .limit(1)

  if (printerError || !printers || printers.length === 0) {
    throw new Error('No printer available')
  }

  const printerId = printers[0].id
  console.log('[PrintJob] Using printer:', printerId)

  // 4. Get current user and their display name
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    throw new Error('User email not available')
  }

  let senderName = user.email
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', user.id)
      .single()

    if (profile?.display_name) {
      senderName = profile.display_name
    } else if (profile?.username) {
      senderName = profile.username
    }
  } catch (e) {
    console.log('[PrintJob] Could not fetch sender display name, using email:', senderName)
  }

  // 5. Insert print job
  console.log('[PrintJob] Submitting job to printer:', printerId, 'with sender_email:', user.email, 'sender_name:', senderName)
  const { data: job, error } = await supabase
    .from('print_jobs')
    .insert({
      printer_id: printerId,
      sender_id: user?.id ?? null,
      sender_email: user.email,
      sender_name: senderName,
      recipient_name: recipientName,
      recipient_id: recipientId ?? null,
      recipient_email: recipientEmail ?? null,
      message_text: messageText ?? null,
      payload_base64: payload,
      receipt_state_json: receiptStateJson ?? null,
      receipt_image: imageBase64,
      sender_latitude: lat,
      sender_longitude: lng,
      printed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[PrintJob] Insert error:', error)
    throw error
  }
  console.log('[PrintJob] Job submitted successfully:', job.id)
  return job.id
}

/**
 * Submit a print job directly from a base64 receipt image.
 * Used for re-printing received receipts.
 */
export async function submitBase64PrintJob({
  base64Image,
  recipientName,
  recipientEmail,
  skipGeofence,
  printerId,
}: {
  base64Image: string
  recipientName: string
  recipientEmail?: string
  skipGeofence?: boolean
  printerId?: string
}): Promise<string> {
  // 1. Convert base64 image to ESC/POS buffer
  const { buffer } = await renderBase64ToPrintBuffer(base64Image)
  const payload = bufferToBase64(buffer)

  if (USE_LOCAL_PRINT_SERVER || !supabase) {
    const response = await fetch(PRINT_SERVER_URL + '/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: toArrayBuffer(buffer),
    })

    if (!response.ok) {
      throw new Error(`Local print server returned ${response.status}: ${await response.text()}`)
    }

    return `local-${Date.now()}`
  }

  if (!supabase) throw new Error('Supabase not configured')

  // 2. Get sender's location for geofence routing
  let lat: number | null = null
  let lng: number | null = null
  if (!skipGeofence) {
    const position = await getCurrentPosition()
    lat = position?.coords.latitude ?? null
    lng = position?.coords.longitude ?? null
  }

  // 3. Get printer via explicit selection, geofence, or default
  const finalPrinterId = printerId ?? (skipGeofence ? null : (await checkNearestPrinter())?.id ?? null)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) throw new Error('User email not available')

  // 4. Insert print job into Supabase
  const { data: job, error } = await supabase
    .from('print_jobs')
    .insert({
      printer_id: finalPrinterId,
      sender_id: user?.id ?? null,
      sender_email: user.email,
      sender_name: user.email,
      recipient_name: recipientName,
      recipient_email: recipientEmail ?? null,
      message_text: null,
      payload_base64: payload,
      receipt_state_json: null,
      receipt_image: base64Image,
      sender_latitude: lat,
      sender_longitude: lng,
      printed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[PrintJob] Base64 insert error:', error)
    throw error
  }

  console.log('[PrintJob] Base64 job submitted successfully:', job.id)
  return job.id
}
