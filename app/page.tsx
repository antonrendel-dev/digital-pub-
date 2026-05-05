import HomePage from '@/components/HomePage'
import { getPublishedPosts } from '@/lib/posts'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const posts = await getPublishedPosts()
  return <HomePage posts={posts} />
}
