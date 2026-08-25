# ADR-0006: Database-Backed Image Storage

**Status:** Accepted  
**Date:** 2026-02-18

## Context

We need to store recipe images but want to avoid external service dependencies for Phase 1 simplicity.

## Decision

Store images directly in PostgreSQL using BYTEA columns.

### Key Choices

- **Storage:** `Recipe.imageData` (Bytes column)
- **Metadata:** `Recipe.imageMimeType`, `Recipe.imageFileName`
- **URL reference:** `Recipe.imageUrl` for imported recipes
- **Size limit:** 10MB per image (enforced by `IMAGE_CONFIG`)
- **Allowed types:** jpeg, jpg, png, webp, gif

### Storage Pattern

- Images stored as binary data in database
- Served via API route (`/api/recipes/[id]/image`)
- Strategy pattern allows future migration to cloud storage

## Consequences

### Positive

- No external service dependencies
- Simple backup (database dump includes images)
- Transactional consistency (images and recipe data together)
- Works offline/air-gapped environments

### Negative

- Database size grows quickly with images
- No CDN or image optimization
- Larger backups and longer restore times
- Query performance affected when selecting image data

### Neutral

- Current approach is fine for single-user Phase 1
- Strategy pattern enables migration to S3/Cloudinary later

## Alternatives Considered

- **S3/Cloudinary:** Better scaling but adds dependencies
- **Filesystem:** Simpler but harder to backup/deploy
- **Base64 in JSON:** Larger payload, no streaming

---

_Related: `CONTEXT.md` (Constraints section)_
