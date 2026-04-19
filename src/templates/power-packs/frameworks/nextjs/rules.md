# Next.js Power Pack Rules

## Routing Analysis
- Validate App Router directory structure (page.tsx, layout.tsx, loading.tsx, error.tsx)
- Check for conflicting route segments
- Verify dynamic route parameter handling ([slug], [...catchAll], [[...optional]])
- Analyze parallel routes and intercepting routes
- Check route group organization (parentheses folders)

## Server/Client Boundaries
- Ensure 'use client' is only used when necessary (event handlers, hooks, browser APIs)
- Detect server-only code leaking into client components
- Validate that Server Actions are properly defined with 'use server'
- Check for proper component composition (server wrapping client, not vice versa)
- Flag unnecessary 'use client' on components that could be server components

## Hydration Safety
- Detect `window`, `document`, `localStorage` usage without hydration guards
- Check for conditional rendering that differs between server and client
- Validate `useEffect` usage for client-only side effects
- Flag `Date.now()` or `Math.random()` in render paths

## Data Fetching
- Validate fetch deduplication in Server Components
- Check for proper cache and revalidation configuration
- Detect waterfall data fetching patterns
- Verify proper use of `generateStaticParams` for static generation
- Check Route Handler patterns (GET, POST, etc.)

## Performance
- Analyze bundle size impact of client components
- Check for proper dynamic imports (`next/dynamic`)
- Validate Image component usage (`next/image`)
- Review font optimization (`next/font`)
