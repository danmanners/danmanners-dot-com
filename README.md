# danmanners.com

Source for [danmanners.com](https://danmanners.com) — personal website with blog, about page, and resume.

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com).

## Pages

- **Home** (`/`) — recent blog posts
- **About** (`/about/`) — background, tech stack, and homelab
- **Posts** (`/posts/`) — full blog index with search
- **Resume** (`/resume/`) — resume rendered from `src/content/resume/resume.yaml`

## Development

```sh
npm install
astro dev --background
```

Manage the background dev server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

| Command             | Action                                          |
| :------------------ | :---------------------------------------------- |
| `npm run build`     | Build the production site to `./dist/`          |
| `npm run preview`   | Preview the build locally                       |
| `npm run astro ...` | Run CLI commands like `astro add`, `astro check` |

## Deployment

Pushing to `main` deploys via GitHub Actions (`.github/workflows/deploy.yml`):
the site is built with Node 22 and synced to S3 using OIDC credentials.

## Structure

```
/
├── src/
│   ├── components/     # Astro components (Nav, Footer, PostCard, Homelab, ...)
│   ├── content/
│   │   ├── blog/       # Markdown blog posts (one file per post)
│   │   └── resume/     # resume.yaml
│   ├── data/site.ts    # Site metadata (title, description)
│   ├── layouts/        # Page layouts
│   ├── pages/          # Routes (index, about, posts, resume)
│   └── styles/         # Global CSS
├── public/             # Static assets (images, favicons, htmx)
├── astro.config.mjs
└── package.json
```

To add a blog post, create a Markdown file in `src/content/blog/` with `title`, `pubDate`, and `draft` frontmatter.
