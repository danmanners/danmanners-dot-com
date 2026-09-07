import { getCollection } from 'astro:content';

// Static search index generated at build time for client-side search.
export async function GET() {
  const posts = (await getCollection('blog'))
    .filter((p) => !p.data.draft)
    .map((p) => ({
      title: p.data.title,
      url: `/posts/${p.id}/`,
      tags: p.data.tags,
      categories: p.data.categories,
      excerpt: (p.body || '')
        .replace(/[#>*`_\[\]()!-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200),
    }));

  return new Response(JSON.stringify({ posts }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
