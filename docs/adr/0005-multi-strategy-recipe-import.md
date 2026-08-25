# ADR-0005: Multi-Strategy Recipe Import

**Status:** Accepted  
**Date:** 2026-02-18

## Context

We need to import recipes from external websites, but different sites structure their data differently (JSON-LD, microdata, plain HTML).

## Decision

Implement a multi-strategy parser system with orchestrator pattern.

### Key Choices

- **Primary strategy:** JSON-LD structured data extraction
- **Fallback strategy:** Generic HTML scraping with heuristics
- **Orchestrator:** Tries JSON-LD first, falls back to HTML parsing
- **Confidence scoring:** Tracks which fields were auto-extracted

### Strategy Chain

1. Fetch HTML from external URL
2. Try `parseJsonLd()` - extract from JSON-LD structured data
3. Try `parseGenericHtml()` - fill gaps with HTML pattern matching
4. `validateImportedRecipe()` - ensure required fields present
5. Return `ImportResult` with confidence scores

## Consequences

### Positive

- Handles most recipe websites automatically
- JSON-LD provides high-confidence structured data
- Fallback covers sites without structured data
- Confidence scores help users verify imports

### Negative

- HTML scraping is fragile (depends on site structure)
- Requires ongoing maintenance as sites change
- Heavy use of `any` types in parsing code (tech debt)

### Neutral

- Cheerio used for server-side HTML parsing
- User-Agent header spoofing to avoid bot detection

## Alternatives Considered

- **Single parser:** Too brittle, would fail on many sites
- **Third-party API:** Would require API keys and add dependencies
- **Browser automation:** Too heavy for server-side import

---

_Related: `CONTEXT.md` (Architecture section, Key Abstractions)_
