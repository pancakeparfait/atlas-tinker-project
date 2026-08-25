# ADR-0008: Radix UI + Tailwind CSS Component System

**Status:** Accepted  
**Date:** 2026-02-18

## Context

We need a consistent, accessible UI component system that's customizable and doesn't ship bundled CSS.

## Decision

Use Radix UI primitives styled with Tailwind CSS (shadcn/ui pattern).

### Key Choices

- **Primitives:** Radix UI for accessible, unstyled components
- **Styling:** Tailwind CSS for utility-first styling
- **Pattern:** shadcn/ui (code-based components, not npm package)
- **Icons:** lucide-react for consistent iconography

### Component Library

- Button, Input, Card, Badge, Select, Textarea, Label
- Located in `src/components/ui/`
- Customized via Tailwind classes
- `cn()` utility for conditional classes

## Consequences

### Positive

- Accessible by default (Radix handles ARIA, keyboard navigation)
- Highly customizable via Tailwind classes
- No runtime CSS-in-JS overhead
- Components are source files (full control)

### Negative

- Must maintain component code (not a dependency)
- Tailwind learning curve for complex styling
- Class name strings can become long

### Neutral

- Follows shadcn/ui conventions (widely adopted)
- Easy to add new components as needed

## Alternatives Considered

- **Material-UI:** Heavier, more opinionated styling
- **Chakra UI:** Good but less customizable
- **Headless UI:** Fewer components available

---

_Related: `CONTEXT.md` (Technology Stack section)_
