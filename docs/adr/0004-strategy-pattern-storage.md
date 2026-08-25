# ADR-0004: Strategy Pattern for Image Storage

**Status:** Accepted  
**Date:** 2026-02-18

## Context

We need to store recipe images but want flexibility to change storage backends without modifying API routes or business logic.

## Decision

Implement the Strategy pattern via a `StorageAdapter` interface for image storage.

### Key Choices

- **Interface:** `StorageAdapter` with `saveImage`, `getImage`, `deleteImage`, `validateImage`
- **Current implementation:** `DatabaseStorageAdapter` (PostgreSQL BYTEA)
- **Future options:** S3, Cloudinary, filesystem

### Interface Definition

```typescript
interface StorageAdapter {
  saveImage(recipeId: string, image: Buffer, mimeType: string): Promise<ImageResult>
  getImage(recipeId: string): Promise<Buffer | null>
  deleteImage(recipeId: string): Promise<void>
  validateImage(buffer: Buffer, mimeType: string): ValidationResult
}
```

## Consequences

### Positive

- API routes don't know about storage implementation details
- Can swap storage backends without changing business logic
- Easy to test with mock adapters
- Clear separation of concerns

### Negative

- Additional abstraction layer
- Must maintain interface compatibility across implementations

### Neutral

- Current database storage is simple but has scaling limits
- Future migration to cloud storage will be straightforward

## Alternatives Considered

- **Direct database storage:** Simpler but harder to migrate
- **Abstract base class:** Less flexible than interface
- **No abstraction:** Quick but creates tight coupling

---

_Related: `CONTEXT.md` (Architecture section, Key Abstractions)_
