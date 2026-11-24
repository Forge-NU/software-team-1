import { supabase } from './supabase'

export interface OpenFlag {
  flag_id: number
  reporter_id: string
  review_id: number | null
  photo_id: number | null
  reported_user_id: string | null
  post_id: number | null
  reason: string
  status: 'pending'
  report_count: number
}

/** Report a post. One report per user per post. */
export async function reportPost(postId: number, reason: string): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to report a post.')

  const trimmed = reason.trim()
  if (!trimmed) throw new Error('A reason is required.')

  const { data, error } = await supabase
    .from('flag')
    .insert({ post_id: postId, reason: trimmed })
    .select('flag_id')
    .single()

  if (error) {
    if (error.code === '23505') throw new Error('You already reported this.')
    throw error
  }
  return Number(data.flag_id)
}

/** Pending flags visible to the caller (own rows, or all if admin). */
export async function listOpenFlags(): Promise<OpenFlag[]> {
  const { data, error } = await supabase
    .from('open_flags')
    .select(
      'flag_id, reporter_id, review_id, photo_id, reported_user_id, post_id, reason, status, report_count',
    )
    .order('flag_id', { ascending: false })

  if (error) throw error
  return (data ?? []) as OpenFlag[]
}
