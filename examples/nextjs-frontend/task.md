# Task: Build Magneto AI Landing Page with Performance Metrics

## Task Metadata
- **ID:** LANDING-001
- **Title:** Create Magneto AI Landing Page with Feature Showcase
- **Type:** feature-implementation
- **Status:** in-progress
- **Priority:** high
- **Owner:** frontend-agent

## Objectives
1. Build responsive, animated landing page for Magneto AI
2. Showcase all framework features with visual pipeline
3. Achieve Lighthouse score > 90
4. Implement scroll-driven animations with Framer Motion
5. Create interactive knowledge graph preview

## Success Criteria
- [ ] All 9 sections implemented and responsive
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse Accessibility > 95
- [ ] Lighthouse Best Practices > 90
- [ ] Mobile Core Web Vitals pass
- [ ] Dark theme (#0d1117 background, #58a6ff accent)
- [ ] Animations GPU-accelerated
- [ ] Open Graph meta tags present

## Performance Targets
- **LCP:** < 2.5s (Largest Contentful Paint)
- **FID:** < 100ms (First Input Delay)
- **CLS:** < 0.1 (Cumulative Layout Shift)
- **TTFB:** < 600ms (Time to First Byte)
- **Total Bundle:** < 150KB (JS)

## Dependencies Required
```json
{
  "framer-motion": "^10.16.0",
  "lucide-react": "^0.263.0",
  "vis-network": "^9.1.2",
  "clsx": "^2.0.0"
}
```

## Deliverables
- [ ] `src/app/page.tsx` — Main landing page
- [ ] `src/app/layout.tsx` — Root layout with metadata
- [ ] `src/components/landing/Hero.tsx` 
- [ ] `src/components/landing/HowItWorks.tsx` 
- [ ] `src/components/landing/FeaturesGrid.tsx` 
- [ ] `src/components/landing/ArchitectureDiagram.tsx` 
- [ ] `src/components/landing/CLIDemo.tsx` 
- [ ] `src/components/landing/KnowledgeGraphPreview.tsx` 
- [ ] `src/components/landing/Testimonials.tsx` 
- [ ] `src/components/landing/GettingStarted.tsx` 
- [ ] `src/components/landing/Footer.tsx` 
- [ ] `src/lib/animations.ts` — Shared animation configs
- [ ] `tailwind.config.ts` — Theme customization

## Estimated Metrics
- **Completion Time:** 4-6 hours
- **Lines of Code:** ~2,500
- **Components:** 11
- **Animation Variants:** 20+
- **Responsive Breakpoints:** 4 (mobile, tablet, laptop, desktop)

## Notes
- Static landing page (no backend required)
- Use Next.js App Router
- Optimize for Core Web Vitals
- Test on real devices before deployment
