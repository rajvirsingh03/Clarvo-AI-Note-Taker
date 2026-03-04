---
applyTo: "**"
---

# Repository Instructions for Copilot

This repository has pre-configured Skills and MCP servers. Copilot should be aware of them when generating responses, reviewing code, or suggesting implementations, but usage is optional and should be applied only when relevant.

---

## Skills

### 1. auth-flow-validation

- Description: Authentication flow validation between frontend and backend. Covers JWT, OAuth2, token refresh, and session management sync.
- USE WHEN: "auth integration", "JWT validation", "token refresh", "401 handling", "authentication flow", "login integration"
- DO NOT USE FOR: security auditing (use security skills), OAuth provider setup (use authentication skills)
- allowed-tools: Read, Grep, Glob, Bash

### 2. backend-code-review

- Description: Review backend code for quality, security, maintainability, and best practices based on established checklist rules.
- USE WHEN: Reviewing backend files (e.g., `.py`) under `api/` directory
- DO NOT USE FOR: Frontend files (e.g., `.tsx`, `.ts`, `.js`)
- Supports: pending-change review, code snippets review, file-focused review

### 3. concept-extraction-prompting

- Description: Generate system prompts, structure LLM outputs, design AI processing pipelines for the AI Learning Copilot.
- USE WHEN: Avoid "stenographer problem", configure Incremental Summarization, multimodal screenshot analysis, flashcard generation, Notion JSON export.

### 4. extension-security

- Description: Enforce secure Chrome Extension architecture and Manifest V3 best practices.

### 5. frontend-code-review

- Description: Trigger when reviewing frontend files (`.tsx`, `.ts`, `.js`). Supports pending-change and focused file reviews. Apply checklist rules.

### 6. frontend-design

- Description: Create production-grade frontend interfaces. Build web components, pages, artifacts, dashboards, React components, HTML/CSS layouts. Avoid generic AI aesthetics.

### 7. gsap-router

- Description: Router for GSAP animations. Implement tweens, timelines, scroll-based animations, React integration. Routes to 4 specialized skills: fundamentals, sequencing, ScrollTrigger, React patterns.

### 8. mcp-builder

- Description: Guide for creating high-quality MCP servers for integrating external APIs or services (Python FastMCP or Node/TypeScript MCP SDK).

### 9. performance

- Description: Web performance optimization (frontend, backend, database)
- USE WHEN: "performance", "slow", "optimization", "Core Web Vitals", "LCP", "INP", "CLS", "bundle size", "lazy load", "caching", "N+1 query", "memory leak", "how to speed up", "improve performance", "reduce load time", "database optimization"
- DO NOT USE FOR: Algorithm complexity (use computer-science-fundamentals), code readability (use clean-code skill), security optimization (use security skill)

### 10. ux-foundations

- Description: Foundational UX knowledge for interface design, usability, accessibility, design systems, Nielsen heuristics, WCAG, color contrast, typography, spacing, UI behavior. Always applicable when designing, reviewing, or auditing interfaces.

---

## MCP Servers

### 1. supabase

- Full access to DB and backend context

### 2. postman

- API collections & endpoints
- Requires bearer token configuration

### 3. notion

- Full access to product docs, structured notes, specs

### 4. chrome dev tools

- Full access for runtime debugging, DOM inspection, and profiling

### 5. stitch

- Full access; use to generate designs of any new page

### 6. playwright

- Full access for E2E testing, automation, and UI validation

---

## General Guidance

- Copilot should intelligently decide when to activate Skills or MCP servers.
- Avoid using MCP servers for simple conceptual tasks.
- For code reviews, consider performance, security, UX, and maintainability.
- For UI design, prioritize clarity, spacing, accessibility, and production-grade quality.
- For auth/API tasks, prioritize correctness, security, and validation.
