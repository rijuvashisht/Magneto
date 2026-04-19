# Example: Node.js + Gatsby Content Marketing Site

**Scenario Type:** Static Site / Content Platform  
**Framework Stack:** Gatsby 5 + React 18 + Contentful CMS + Netlify + Algolia Search  
**Team Size:** 4 developers (1 frontend lead, 1 content engineer, 1 full-stack, 1 QA)

---

## Getting Started

This is a **documentation example** showing how Magneto AI would be configured for this stack.

To actually use Magneto with this project:

```bash
# 1. Navigate to your project
cd your-gatsby-project

# 2. Initialize Magneto with the power packs
magneto init --with javascript typescript react gatsby contentful algolia netlify jest playwright

# 3. Run analysis
magneto analyze

# 4. Start using magneto commands
magneto query "algolia search"
```

---

## Project Overview

High-performance marketing website with:
- Gatsby static site generation with ISR
- Contentful headless CMS for content management
- Algolia instant search across 10,000+ articles
- Netlify Edge Functions for personalization
- Performance target: 90+ Lighthouse score

---

## Power Packs Configuration

### `magneto.config.json`

```json
{
  "name": "nodejs-gatsby-content-site",
  "version": "1.0.0",
  "powerPacks": [
    "languages/javascript",
    "languages/typescript",
    "frameworks/react",
    "frameworks/gatsby",
    "ssg/gatsby",
    "cms/contentful",
    "search/algolia",
    "hosting/netlify",
    "edge/netlify-functions",
    "analytics/google-analytics",
    "testing/jest",
    "testing/react-testing-library",
    "testing/playwright",
    "performance/lighthouse",
    "project-types/marketing-site"
  ],
  "adapters": [],
  "security": {
    "protectedPaths": [
      "**/netlify/functions/personalization.js",
      "**/gatsby-node.js",
      "**/gatsby-config.js",
      "**/.env*",
      "src/utils/algolia-queries.js",
      "scripts/contentful-migration.js"
    ],
    "blockedActions": [
      "delete_contentful_content_type",
      "modify_algolia_index_directly",
      "disable_gatsby_caching",
      "bypass_preview_mode"
    ],
    "riskLevels": {
      "low": ["src/components/ui/**", "src/styles/**", "tests/**"],
      "medium": ["src/templates/**", "src/pages/**"],
      "high": [
        "src/hooks/useContentful.js",
        "src/utils/algolia.js",
        "netlify/functions/**"
      ],
      "critical": [
        "gatsby-node.js",
        "gatsby-config.js",
        "scripts/contentful-migration.js",
        "algolia-index-config.js"
      ]
    }
  }
}
```

---

## Role Assignments

### 1. Feature: "Add Algolia-powered faceted search"

```yaml
orchestrator:
  strategy: "content_first_with_index_sync"
  
  steps:
    - phase: "content_analysis"
      role: "content_engineer"
      tasks:
        - query_graph: "contentful content types"
        - analyze: "facets available (tags, categories, dates)"
        - design: "Algolia index schema"
        - output: "search-index-schema.json"
      
    - phase: "frontend_implementation"
      parallel:
        - role: "frontend_lead"
          scope: ["src/components/search/", "src/hooks/useAlgolia.js"]
          tasks:
            - implement: "InstantSearch component"
            - implement: "Facet filters UI"
            
        - role: "content_engineer"
          scope: ["netlify/functions/", "scripts/"]
          tasks:
            - implement: "Algolia indexing function"
            - setup: "Contentful webhook → Algolia sync"
      
    - phase: "performance_optimization"
      role: "frontend_lead"
      tasks:
        - lighthouse: "search page performance"
        - optimize: "bundle splitting for search"
        
    - phase: "testing_deployment"
      parallel:
        - role: "qa"
          scope: ["tests/e2e/search/", "tests/integration/algolia/"]
          tasks:
            - playwright: "search flow with 1000 results"
            - test: "mobile search experience"
            
        - role: "fullstack"
          scope: ["netlify.toml", "gatsby-config.js"]
          tasks:
            - configure: "Netlify Edge caching"
            - monitor: "Core Web Vitals"
```

### 2. Bug: "Build failing on Contentful rate limit"

```yaml
orchestrator:
  - query_graph: "contentful fetch"
  - query_graph: "gatsby-node createPages"
  - security_check: { audit: true }
  
  fullstack:
    - analyze: "build process bottlenecks"
    - identify: "rate limiting hotspots"
    - fix: "Implement request batching with exponential backoff"
    - fix: "Add Contentful cache layer"
    - fix: "Enable Gatsby parallel sourcing"
    
  content_engineer:
    - optimize: "content model queries"
    - implement: "selective field fetching"
    - test: "peak load simulation"
    
  frontend_lead:
    - improve: "build error handling"
    - add: "retry logic with circuit breaker"
    - monitor: "build time metrics"
```

---

## Security for Content Platform

### Prevent Accidental Production Content Deletion

```javascript
// contentful-migration.js
// Agent attempts to run migration:

async function runMigration() {
  // ❌ BLOCKED by Magneto
  // "delete_contentful_content_type" is blocked action
  
  if (environment === 'production') {
    // ✅ APPROVED pattern:
    await verifyContentBackup(contentTypeId);
    await createSoftDeleteArchive(contentTypeId);
    await scheduleGradualDeprecation(contentTypeId);
  }
}
```

---

## Graph Query Patterns

### Find all pages affected by content type change

```bash
magneto query "BlogPost contentful"
# → Returns all components, templates, pages using BlogPost
```

### Trace image optimization chain

```bash
magneto path "ContentfulAsset" "GatsbyImage" --via "gatsby-plugin-image"
```

### Find personalization touchpoints

```bash
magneto query "personalization edge function"
# → Discovers all affected pages and components
```

---

## Mix & Match Variations

### Replace Gatsby with Next.js 14
```json
{
  "powerPacks": [
    ...
    "frameworks/nextjs",
    "ssr/nextjs-app-router",
    ...
  ]
}
```

### Replace Contentful with Sanity
```json
{
  "powerPacks": [
    ...
    "cms/sanity",
    ...
  ]
}
```

### Replace Netlify with Vercel
```json
{
  "powerPacks": [
    ...
    "hosting/vercel",
    "edge/vercel-edge-config",
    ...
  ]
}
```

### Add E-commerce (Stripe + Shopify)
```json
{
  "powerPacks": [
    ...
    "payments/stripe",
    "commerce/shopify",
    "project-types/ecommerce"
  ]
}
```
