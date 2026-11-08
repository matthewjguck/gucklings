export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          author_id: string
          content: string
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          author_id: string
          content: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          content?: string
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string
        }
        Relationships: []
      }
      friends: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: 'pending' | 'accepted'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          addressee_id?: string
          status?: 'pending' | 'accepted'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      printers: {
        Row: {
          id: string
          name: string
          latitude: number
          longitude: number
          geofence_radius_m: number
          api_key: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          latitude: number
          longitude: number
          geofence_radius_m?: number
          api_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          latitude?: number
          longitude?: number
          geofence_radius_m?: number
          api_key?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          author_id: string
          recipient_id: string | null
          content: Json
          print_job_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          author_id: string
          recipient_id?: string | null
          content: Json
          print_job_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          author_id?: string
          recipient_id?: string | null
          content?: Json
          print_job_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      print_jobs: {
        Row: {
          id: string
          printer_id: string | null
          sender_id: string | null
          recipient_name: string | null
          recipient_id: string | null
          payload_base64: string
          message_text: string | null
          status: string
          error_message: string | null
          sender_latitude: number | null
          sender_longitude: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          printer_id?: string | null
          sender_id?: string | null
          recipient_name?: string | null
          recipient_id?: string | null
          payload_base64: string
          message_text?: string | null
          status?: string
          error_message?: string | null
          sender_latitude?: number | null
          sender_longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          printer_id?: string | null
          sender_id?: string | null
          recipient_name?: string | null
          recipient_id?: string | null
          payload_base64?: string
          message_text?: string | null
          status?: string
          error_message?: string | null
          sender_latitude?: number | null
          sender_longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      nearest_printer: {
        Args: {
          lat: number
          lng: number
        }
        Returns: string | null
      }
    }
    Enums: Record<string, never>
  }
}
