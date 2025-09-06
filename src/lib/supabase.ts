import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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