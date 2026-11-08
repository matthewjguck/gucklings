import { supabase } from './supabase'
import type { FriendProfile } from '@/types/app'

/**
 * Get all accepted friends of a user.
 * Returns friends where the user is either requester or addressee, and status is accepted.
 */
export async function getFriends(userId: string): Promise<FriendProfile[]> {
  if (!supabase) return []

  try {
    // Query friendships where user is the requester
    const { data: sent, error: sentError } = await supabase
      .from('friends')
      .select(
        `id, addressee_id, status,
        addressee:profiles!friends_addressee_id_fkey(id, username, display_name, avatar_url)`
      )
      .eq('requester_id', userId)
      .eq('status', 'accepted')

    // Query friendships where user is the addressee
    const { data: received, error: receivedError } = await supabase
      .from('friends')
      .select(
        `id, requester_id, status,
        requester:profiles!friends_requester_id_fkey(id, username, display_name, avatar_url)`
      )
      .eq('addressee_id', userId)
      .eq('status', 'accepted')

    if (sentError || receivedError) {
      console.error('getFriends error:', sentError || receivedError)
      return []
    }

    const results: FriendProfile[] = []

    // Process sent friendships (user is requester, so other party is addressee)
    if (sent) {
      results.push(
        ...sent.map((row: any) => ({
          friendRowId: row.id,
          friendshipStatus: row.status,
          iRequested: true,
          profile: row.addressee,
        }))
      )
    }

    // Process received friendships (user is addressee, so other party is requester)
    if (received) {
      results.push(
        ...received.map((row: any) => ({
          friendRowId: row.id,
          friendshipStatus: row.status,
          iRequested: false,
          profile: row.requester,
        }))
      )
    }

    return results
  } catch (error) {
    console.error('getFriends exception:', error)
    return []
  }
}

/**
 * Get pending friend requests received by the user (where user is addressee).
 */
export async function getPendingRequests(userId: string): Promise<FriendProfile[]> {
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from('friends')
      .select(
        `id, requester_id, status,
        requester:profiles!friends_requester_id_fkey(id, username, display_name, avatar_url)`
      )
      .eq('addressee_id', userId)
      .eq('status', 'pending')

    if (error) {
      console.error('getPendingRequests error:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      friendRowId: row.id,
      friendshipStatus: row.status,
      iRequested: false,
      profile: row.requester,
    }))
  } catch (error) {
    console.error('getPendingRequests exception:', error)
    return []
  }
}

type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

interface FriendshipInfo {
  status: FriendshipStatus
  rowId?: string
}

/**
 * Get the friendship status between two users.
 * Used to determine button state in FindInklings.
 */
export async function getFriendshipStatus(
  currentUserId: string,
  otherUserId: string
): Promise<FriendshipInfo> {
  if (!supabase) return { status: 'none' }

  try {
    // Look for any friendship row between these two users
    const { data, error } = await supabase
      .from('friends')
      .select('id, requester_id, status')
      .or(
        `and(requester_id.eq.${currentUserId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${currentUserId})`
      )

    if (error || !data || data.length === 0) {
      return { status: 'none' }
    }

    const row = data[0]

    if (row.status === 'accepted') {
      return { status: 'accepted', rowId: row.id }
    }

    // pending — determine if current user sent it or received it
    if (row.requester_id === currentUserId) {
      return { status: 'pending_sent', rowId: row.id }
    } else {
      return { status: 'pending_received', rowId: row.id }
    }
  } catch (error) {
    console.error('getFriendshipStatus exception:', error)
    return { status: 'none' }
  }
}

/**
 * Send a friend request from requester to addressee.
 */
export async function sendFriendRequest(
  requesterId: string,
  addresseeId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase.from('friends').insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: 'pending',
    })

    if (error) {
      // Check if it's a unique constraint violation (request already exists)
      if (error.code === '23505') {
        return { success: false, error: 'Request already exists' }
      }
      console.error('sendFriendRequest error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('sendFriendRequest exception:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Accept a friend request.
 */
export async function acceptFriendRequest(friendRowId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendRowId)

    if (error) {
      console.error('acceptFriendRequest error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('acceptFriendRequest exception:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Remove a friend (delete the friendship row).
 */
export async function removeFriend(friendRowId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  try {
    const { error } = await supabase.from('friends').delete().eq('id', friendRowId)

    if (error) {
      console.error('removeFriend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('removeFriend exception:', error)
    return { success: false, error: String(error) }
  }
}
