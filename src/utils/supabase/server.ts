import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 用于Server Components的Supabase客户端
export async function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        },
        set: async (name, value, options) => {
          const cookieStore = await cookies()
          cookieStore.set(name, value, options)
        },
        remove: async (name, options) => {
          const cookieStore = await cookies()
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
}

// 用于Route Handlers的Supabase客户端
export async function createRouteHandlerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          const cookieStore = await cookies()
          return cookieStore.get(name)?.value
        },
        set: async (name, value, options) => {
          const cookieStore = await cookies()
          cookieStore.set(name, value, options)
        },
        remove: async (name, options) => {
          const cookieStore = await cookies()
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
} 