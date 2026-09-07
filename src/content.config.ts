import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    image: z.string().optional(),
  }),
});

const resume = defineCollection({
  loader: glob({ pattern: 'resume/*.yaml', base: './src/content' }),
  schema: z.object({
    profile: z.object({
      name: z.string(),
      tagline: z.string(),
      avatar: z.string(),
    }),
    contact: z.array(
      z.object({
        class: z.string(),
        icon: z.string(),
        url: z.string(),
        title: z.string(),
      })
    ),
    education: z.array(
      z.object({
        college: z.string(),
        dates: z.string(),
      })
    ),
    languages: z.array(
      z.object({
        language: z.string(),
        level: z.string(),
      })
    ),
    interests: z.array(z.string()),
    skills: z.array(
      z.object({
        skill: z.string(),
        level: z.number(),
      })
    ),
    summary: z.string(),
    experiences: z.array(
      z.object({
        position: z.string(),
        dates: z.string(),
        company: z.string(),
        details: z.string(),
      })
    ),
    projects: z.array(
      z.object({
        title: z.string(),
        url: z.string(),
        tagline: z.string(),
      })
    ),
    locations: z.array(
      z.object({
        title: z.string(),
        tagline: z.string(),
      })
    ),
  }),
});

export const collections = { blog, resume };
