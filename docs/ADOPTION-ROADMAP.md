# Adoption Roadmap — From 6.8 → 9.5 in 30 Days

> **North star**: Hit Product Hunt #1 of the Day, top 5 of the Week, top 25 of the Month. Become the default answer when a developer asks "how do I make my AI assistant safer / faster / multi-LLM?" — within 90 days.

---

## Honest baseline (today)

| Metric | Today | 30-day target | 90-day target |
|---|---|---|---|
| npm downloads / month | 7.4K | 25K | 100K |
| GitHub stars | (track baseline) | +1.5K | +6K |
| Discord members | 0 | 500 | 3K |
| External contributors (PRs merged) | 0 | 5 | 25 |
| Third-party power packs | 0 | 3 | 15 |
| Time-to-first-value (TTFV) | ~15 min | < 60 sec | < 30 sec |
| Featured on Product Hunt | no | **#1 of Day** | top 25 of Month |
| Hacker News front page | no | yes | yes (twice) |
| Adoption score (composite) | 6.8 | 8.5 | 9.5 |

If we don't track these, we're guessing. **First action**: wire up `umami` or `plausible` on the landing page and a baseline-stars-grabber script before anything else ships.

---

## The three problems that gate adoption

These are not engineering problems. Engineering is fine.

1. **Category confusion** — "AI control plane" is not a search term. Devs search "AI coding assistant" and find Cursor.
2. **No social proof loop** — no public case studies, no visible enterprise users, no peer recommendations.
3. **The pitch is too broad** — Glasswing + Sandbox + Memory Lock + SDD + Multi-agent + Zero-egress = sounds like vapor.

The plan below is structured around solving these, in order.

---

## Phase 0: Instrument & decide (Day 0–2)

Before shipping anything else, we need to know what's working.

- [ ] **0.1 Install Plausible Analytics** on `magnetoai.vercel.app` — track unique visitors, top pages, install command copies, GitHub clicks.
- [ ] **0.2 Wire `npm install` telemetry** (opt-in, anonymous). One number: count of `magneto init` runs / week. No PII.
- [ ] **0.3 Set up a `stars.txt` baseline** — script that grabs current GitHub stars + npm downloads daily into `metrics/daily.csv`. Public dashboard.
- [ ] **0.4 Pick the launch date.** PH launches go live 12:01 AM PST. **Recommended: Tuesday, May 26, 2026** (4 weeks out, mid-week, post-Memorial-Day attention recovery).
- [ ] **0.5 Decide the **one** headline.** Three options to A/B in week 1:
  - "The AI control plane your AI assistant is missing"
  - "Make Cursor, Copilot, and Claude work together — and never leak your code"
  - "The only AI coding tool that's safe enough for healthcare"

---

## Phase 1: Positioning week (Day 3–9)

**Goal**: Solve "category confusion" and "pitch too broad" with focused landing pages.

- [ ] **1.1 Comparison matrix page** — `/compare` route on landing.
  - Compare against Cursor, Copilot, Aider, Claude Code (standalone), Continue.dev, Cody.
  - Rows: Multi-LLM, Zero-egress option, Source code never leaves machine, Sandbox isolation, Memory tamper protection, Spec-driven, Pre-execution security gate, Compliance reports, Lock-in risk, Free.
  - Acceptance: page lives at `/compare`, linked from hero CTA, mentions every competitor by name.
- [ ] **1.2 Three ICP landing pages**:
  - [ ] **`/for/regulated`** — headline: *"The only AI coding tool your compliance team will sign off on."* CTA: `magneto init --sdd bmad`
  - [ ] **`/for/security-conscious`** — headline: *"Your AI just generated this. Magneto already audited it."* CTA: `magneto security audit`
  - [ ] **`/for/multi-llm-teams`** — headline: *"You use Cursor. Your teammate uses Copilot. Magneto is what makes them ship the same code."* CTA: `magneto adapter list`
- [ ] **1.3 Rewrite homepage hero** with the chosen headline (single sentence). Subline = the proof point. CTA above the fold.
- [ ] **1.4 Replace passive terminal demo with a 90-second Loom** showing one end-to-end flow:
  1. `magneto init` (5s)
  2. Cursor writes vulnerable code (15s)
  3. `magneto security audit` catches it (15s)
  4. `magneto security fix` patches it (10s)
  5. Same task with Ollama, zero network, identical fix (40s)
- [ ] **1.5 Public benchmark repo** — `magneto-benchmark/` GitHub org. Real numbers comparing Cursor vs Cursor+Magneto on 5 tasks (refactor, security fix, dep upgrade, multi-file feature, test gen). Methodology + raw timings + reproduction scripts.

**Exit criteria**: Plausible shows ≥2× improvement in `/for/*` page → install-command-copy conversion vs current homepage.

---

## Phase 2: Activation week (Day 10–16)

**Goal**: Drop time-to-first-value from 15 minutes to under 60 seconds.

- [ ] **2.1 `npx magneto-ai demo`** — one command, no install, runs a 30-second simulated flow showing the value. Self-contained, downloadable demo project under the hood.
- [ ] **2.2 MCP one-line install for Claude Code**:
  ```bash
  claude mcp add magneto npx -- magneto-ai mcp
  ```
  Acceptance: documented as the recommended install in the Claude section of `docs/AI-ASSISTANTS.md` and on the homepage.
- [ ] **2.3 VS Code extension MVP** — already on roadmap. Minimum viable:
  - Single panel "Magneto"
  - Two commands: "Audit this file" and "Plan a task from selection"
  - Drift indicator gutter (red dot on lines whose spec is stale)
  - Publish to Marketplace as `magneto.magneto-ai`
  - Extension activates Magneto CLI under the hood — no logic duplication.
- [ ] **2.4 GitHub Action: `magneto-action`** — drop-in for any repo:
  ```yaml
  - uses: rijuvashisht/magneto-action@v1
    with:
      command: security audit
      sdd-sync: true
  ```
  Three preset workflows shipped: PR security gate, weekly drift check, dep auto-fix PR.
- [ ] **2.5 "Bring your own LLM" flag** — `magneto run --byo-llm <openai-compatible-url>` so anyone running a local OpenAI-compatible server (LM Studio, text-generation-webui) gets first-class support without an Ollama install.

**Exit criteria**: A new user can go from `npx` → see real value → ⌘C the install command in **under 60 seconds**, measured.

---

## Phase 3: Content & community (Day 17–23)

**Goal**: Solve "no social proof loop" by manufacturing the loop.

- [ ] **3.1 Launch the blog** — `magnetoai.vercel.app/blog`. Three inaugural posts, all written this week:
  - [ ] **"Why I built Magneto"** (founder's story — the single best PH content) — 1200 words. Pain that drove it. The moment Cursor wrote auth code that leaked tokens. Why no existing tool fit. Read it like a confession.
  - [ ] **"Cursor wrote this. Magneto caught it."** — 800 words. Real CVE found in real AI-generated code, with screenshots.
  - [ ] **"Lock your AI agent's memory before it betrays you"** — 1000 words. Memory poisoning threat model + how the HMAC manifest works. Technical deep-dive that gets reshared on /r/cybersecurity.
- [ ] **3.2 Discord server** — three channels: `#start-here`, `#help`, `#power-pack-builders`. Invite the top 50 GitHub stargazers manually with a personal note.
- [ ] **3.3 Twitter/X "build in public" thread** — daily progress thread leading to launch. Tease one feature per day.
- [ ] **3.4 First three customer stories** (even if they're personal projects) — a one-paragraph card on the homepage with a name, role, repo link, and one-sentence outcome.
- [ ] **3.5 HN warm-up** — post a technical "Show HN" at end of week 3, **not** as the launch (that's PH). Title: *"Show HN: Magneto — HMAC-signed memory for AI coding agents"*. Goal is comments, not front page.

**Exit criteria**: 100+ Discord members, blog published, 1 HN front-page hit (even if it dies in 4 hours).

---

## Phase 4: Product Hunt launch prep (Day 24–28)

**Goal**: Don't fly blind into PH. Adopters who launched #1 of the Day all did this.

- [ ] **4.1 PH listing copy + assets**:
  - [ ] Tagline (60 chars max). Best so far: *"The AI control plane that doesn't trust your AI"*
  - [ ] Description (260 chars). Lead with one pain, not a feature list.
  - [ ] Hunter — find one. Top hunters in the dev-tools space: [Kevin William David](https://www.producthunt.com/@kwdinc), [Chris Messina](https://www.producthunt.com/@chrismessina), [Pulkit Agrawal](https://www.producthunt.com/@startup_pulkit). Reach out **2 weeks before launch** with a personalized note.
  - [ ] 5 gallery images: hero shot, comparison matrix, security-audit screenshot, sandbox-shell screenshot, multi-LLM diagram.
  - [ ] 30-second video (re-cut from the 90-second Loom).
  - [ ] First comment drafted (your own, posted at 12:02 AM PST). Should be the founder's story TL;DR + a hook ("I'll be here all day, AMA").
- [ ] **4.2 Outreach list of 200 supporters** who'll upvote in the first hour:
  - GitHub stargazers
  - Discord members
  - Personal network
  - Anyone who's tweeted about AI coding tools in the last month
  - Pre-write the Slack/email/DM template. Send T-1 day, **not earlier** (PH penalizes coordinated voting).
- [ ] **4.3 Final QA pass**:
  - Every link on the landing page works
  - `npm install -g magneto-ai && magneto init` works on fresh macOS, Windows, Linux
  - VS Code extension installs from Marketplace
  - GitHub Action works in a fresh repo
  - All three ICP pages load fast (Lighthouse > 95)
  - Discord invite link doesn't expire
- [ ] **4.4 Launch-day asset bundle**:
  - 5 pre-drafted tweets for milestone moments (top 10, top 5, top 3, #1, end-of-day thank-you)
  - 1 LinkedIn post
  - 1 r/programming post (timed for 9 AM EST when US devs wake up)
  - 1 r/MachineLearning post (different angle: "we built a sandbox for AI code")
  - 1 dev.to post
  - HN cross-post draft (post at noon EST when PH momentum is established)

---

## Phase 5: Launch day (Day 29 — Tuesday May 26)

| Time (PST) | Action |
|---|---|
| **12:01 AM** | PH listing goes live. First comment posted at 12:02. |
| **12:05 AM** | Personal network DM blast (the 200-list). Single message, no group sends. |
| **12:30 AM** | Discord ping: "We're live, here's how to help: [link]" |
| **6:00 AM** | First check: where in rankings? |
| **8:00 AM EST** | Tweet #1 with the launch link. LinkedIn post. |
| **9:00 AM EST** | r/programming post. |
| **10:00 AM EST** | Reply to every PH comment within 5 min for the first 6 hours. |
| **12:00 PM EST** | HN cross-post if PH momentum is good (top 5). |
| **3:00 PM EST** | Tweet #2 with a milestone ("we hit top 3!" or "thank you" depending on position). |
| **6:00 PM EST** | Engage every reply. Don't sleep yet. |
| **9:00 PM EST** | dev.to + r/MachineLearning post. |
| **11:59 PM PST** | Final position locked. End-of-day thank-you tweet + LinkedIn. |

**Don't do**:
- Don't ask for upvotes publicly (PH bans this).
- Don't argue with critics in comments. Acknowledge, fix, move on.
- Don't ignore the long tail at hour 18 — that's when product-hunt-of-the-week is decided.

---

## Phase 6: Post-launch retention (Day 30–60)

The top of every PH winner's traffic dies in 72 hours. Plan for that.

- [ ] **6.1 Weekly digest email** — subject: *"Magneto, weekly"*. Sent every Friday. Format: 1 new feature, 1 community PR, 1 security finding, 1 power pack. Build the muscle now.
- [ ] **6.2 Power-pack registry MVP** — `magnetoai.vercel.app/packs`. Public list of every pack (built-in + community). One-line install: `magneto pack install @user/rust`.
- [ ] **6.3 Rust + Go power packs** — high-leverage. Devs in those communities are vocal and underserved by Cursor.
- [ ] **6.4 First three case studies** from real users — even if they're hobbyist projects. Format: 1 paragraph, screenshot, link.
- [ ] **6.5 VS Code extension v0.2** — add inline diff for `security fix`, drift gutter, MCP-aware completions.
- [ ] **6.6 GitHub Discussions** — turn it on. Seed it with 5 useful posts you'd want answered.
- [ ] **6.7 First conference talk submission** — pick one: KubeCon, DevSecCon, AI Engineer Summit. Talk title: *"How HMAC saved my AI agent's memory."*

---

## Phase 7: 60–90 day platform pivot

The asymmetric bet. Read carefully — this is where the score goes from 8.5 → 9.5.

- [ ] **7.1 Open the power-pack registry for publishing.** `magneto pack publish my-rust-pack` ships to the registry. Every contribution becomes social proof.
- [ ] **7.2 Power-pack revenue share** — once a pack hits 1K installs, the author gets a slot on the homepage and (eventually) a tip jar / sponsor link. Aligns incentives.
- [ ] **7.3 Magneto Cloud (opt-in, paid)** — a thin dashboard for teams: "see every Magneto-audited PR across your org, in one place." Free CLI stays free forever. Cloud is the upgrade path for the 10% who'll pay $20/seat.
- [ ] **7.4 The "Magneto Certified" program** — companies that pass `magneto security compliance SOC2` get a badge for their docs. Self-serve, auto-issued, drives the brand into compliance conversations.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| PH launch flops (< top 20 of day) | Medium | Have a backup HN angle. Don't let it kill momentum — keep shipping the weekly digest. Re-launch in 6 months as v0.30 with new feature. PH allows re-launches if the product has materially changed. |
| Solo-maintainer burnout | High | This roadmap is **aggressive**. If you slip, slip Phase 2 and Phase 6 first; Phases 1, 4, 5 are non-negotiable. |
| Negative HN comment derails the narrative | Medium | Pre-draft a polite "you're right, here's the fix and the PR" response. The fastest way to win HN is to ship the fix in the comment thread. |
| Cursor / Copilot ships a competing feature | Medium | Lean harder into zero-egress + sandbox + compliance — Cursor will never ship those because it conflicts with their cloud-first model. **Make their architecture the wedge.** |
| 7.4K npm downloads turn out to be bots | Low but possible | Audit with `npm-stat` and `npmtrends` filters. If real number is < 3K, restate the metric honestly — "100% of our users are humans" beats inflated claims. |

---

## Success criteria (the bar)

**Tier 1 (must-hit) by Day 30**:
- Product Hunt #1 of the Day
- 1.5K new GitHub stars
- 25K monthly npm downloads
- 500 Discord members

**Tier 2 (stretch) by Day 90**:
- Product Hunt top 25 of the Month
- 6K new GitHub stars (12K total)
- 100K monthly npm downloads
- 25 external contributors merged
- One company (named) using Magneto in production

**Tier 3 (north star) by Day 365**:
- 50K monthly npm downloads is the floor, not the ceiling
- "Magneto" becomes a verb in dev-tools-Twitter ("did you Magneto that PR?")
- Cited in at least one O'Reilly / academic publication
- Adoption score: **9.5 / 10**

---

## Tracking this plan

This file is the source of truth. Every checkbox is a real deliverable. Update it weekly. Commit the updates. Public progress is itself a marketing channel — tweet a screenshot every Friday.

Last updated: 2026-04-26 by initial draft.
