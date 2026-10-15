import { supabase } from './supabase'
import { getPostsForLocation, type Post } from './posts'

export type VoteValue = 1 | -1 | 0 // 0 = remove vote

export interface VoteSummary {
  upvotes: number
  downvotes: number
  score: number
  myVote: 1 | -1 | null
}

export type PostWithVotes = Post & { votes: VoteSummary }

export const EMPTY_VOTES: VoteSummary = { upvotes: 0, downvotes: 0, score: 0, myVote: null }

/** Maps the columns of a post_vote_summary row. */
export function voteSummaryFromRow(row: {
  upvotes?: number | null
  downvotes?: number | null
  vote_score?: number | null
  my_vote?: number | null
}): VoteSummary {
  return {
    upvotes: row.upvotes ?? 0,
    downvotes: row.downvotes ?? 0,
    score: row.vote_score ?? 0,
    myVote: row.my_vote === 1 ? 1 : row.my_vote === -1 ? -1 : null,
  }
}

/** Cast (1 / -1), change, or remove (0) a vote. Voting the same way twice never double-counts. */
export async function setVote(postId: number, value: VoteValue): Promise<void> {
  const { error } = await supabase.rpc('cast_vote', { p_post_id: postId, p_value: value })
  if (error) throw error
}

/** Vote summaries for every post at a spot: one request, however many posts. */
export async function getVotesForLocation(locationId: number): Promise<Map<number, VoteSummary>> {
  const { data, error } = await supabase
    .from('post_vote_summary')
    .select('post_id, upvotes, downvotes, vote_score, my_vote')
    .eq('location_id', locationId)
  if (error) throw error

  const summaries = new Map<number, VoteSummary>()
  for (const row of data ?? []) summaries.set(row.post_id, voteSummaryFromRow(row))
  return summaries
}

/** getPostsForLocation plus votes. Two requests per spot, none per post. */
export async function getPostsWithVotes(locationId: number): Promise<PostWithVotes[]> {
  const [posts, votes] = await Promise.all([
    getPostsForLocation(locationId),
    getVotesForLocation(locationId),
  ])
  return posts.map((post) => ({ ...post, votes: votes.get(post.post_id) ?? EMPTY_VOTES }))
}