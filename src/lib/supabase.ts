import { createClient } from '@supabase/supabase-js'

// Lovable automatically injects Supabase credentials when connected
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// For development: Use valid placeholder URLs that won't break the URL constructor
// In production with Lovable + Supabase integration, real values will be auto-injected
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'
)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          resume_data: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          resume_data?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          resume_data?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      linkedin_posts: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          post_type: string
          tone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          post_type?: string
          tone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          post_type?: string
          tone?: string
          created_at?: string
          updated_at?: string
        }
      }
      post_templates: {
        Row: {
          id: string
          name: string
          template_content: string
          post_type: string
          tone: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          template_content: string
          post_type: string
          tone: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          template_content?: string
          post_type?: string
          tone?: string
          is_active?: boolean
          created_at?: string
        }
      }
    }
  }
}