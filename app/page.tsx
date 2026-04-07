import HomePage from '@/components/HomePage'
import { getPublishedPosts } from '@/lib/posts'

export const revalidate = 300 // re-fetch every 5 minutes

export default async function Page() {
  const posts = await getPublishedPosts()
  return <HomePage posts={posts} />
}
