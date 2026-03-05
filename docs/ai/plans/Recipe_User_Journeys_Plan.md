# Recipe Management User Journeys - Implementation Plan

## Overview

This plan outlines the implementation of comprehensive recipe CRUD operations with database-stored images, automated recipe imports from popular cooking websites, user review workflows, and robust fallback parsing with draft status for partial imports.

## Objectives

- Enable users to add, view, update, and delete recipes with full categorization
- Support URL-based recipe imports from popular cooking websites
- Provide image upload and storage capabilities using database storage with object storage abstraction
- Implement user review workflow for all imported recipe data
- Handle import failures gracefully with draft status and manual entry flags
- Create a foundation for future migration to cloud storage without code changes

## Implementation Steps

### 1. Database Schema Updates

**File**: `prisma/schema.prisma`

Add new fields to the Recipe model:
- `imageData: Bytes?` - Store image binary data in database
- `imageMimeType: String?` - Store image MIME type (e.g., "image/jpeg")
- `imageFileName: String?` - Store original filename for reference
- `isDraft: Boolean @default(false)` - Flag recipes as drafts for incomplete imports
- `importStatus: Json?` - Track which fields were successfully imported vs. manually flagged

**Migration Strategy**:
- Create new migration with `prisma migrate dev`
- Update existing seed data to include sample images

### 2. Object Storage Abstraction Layer

**Directory**: `src/lib/storage/`

Create abstraction interface for consistent file handling:
- `storage-adapter.ts` - Define interface for storage operations
- `database-adapter.ts` - Implementation for database storage
- `index.ts` - Export storage adapter with current database implementation

**Features**:
- Save/retrieve images with metadata
- Delete operations
- Size and type validation
- Future-proof interface for cloud storage migration

### 3. Recipe API Endpoints

**Directory**: `src/app/api/recipes/`

Implement full CRUD operations:
- `route.ts` - GET (list with filtering) and POST (create)
- `[id]/route.ts` - GET (single), PUT (update), DELETE
- `import/route.ts` - POST endpoint for URL-based recipe imports
- `[id]/image/route.ts` - GET endpoint for serving stored images

**Import Features**:
- URL validation and parsing
- Multi-stage parsing: JSON-LD → site-specific selectors → generic HTML
- Error handling with partial success drafts
- Import status tracking

### 4. Website Import Service

**Directory**: `src/lib/recipe-importers/`

Build focused parsing system for MVP:
- `importer.ts` - Main import orchestration and URL handling
- `json-ld-parser.ts` - Parse structured data (schema.org Recipe)
- `generic-html-parser.ts` - Fallback HTML parsing with common patterns
- `validation.ts` - Validate and normalize extracted data

**Parsing Strategy**:
1. **JSON-LD First**: Extract schema.org Recipe structured data
2. **Generic HTML**: Parse common recipe patterns using heuristics
3. **Manual Flagging**: Mark failed extractions for user review
4. **Draft Creation**: Save partial successes as drafts

**Generic HTML Patterns**:
- Common selectors: `[itemprop="name"]`, `.recipe-title`, `h1`
- Ingredient lists: `[itemprop="recipeIngredient"]`, `.ingredient`, `ul li`
- Instructions: `[itemprop="recipeInstructions"]`, `.instruction`, `.step`
- Times and servings: `[itemprop="cookTime"]`, `.cook-time`, etc.

### 5. Recipe Form Components

**Directory**: `src/components/recipes/`

Build comprehensive form system:
- `recipe-form.tsx` - Main create/edit form with React Hook Form + Zod
- `ingredient-list.tsx` - Dynamic ingredient management with add/remove
- `instruction-steps.tsx` - Step-by-step instruction editor
- `image-upload.tsx` - File upload with preview and validation
- `url-import.tsx` - URL input with import functionality
- `manual-entry-indicator.tsx` - Visual indicators for flagged fields

**Form Features**:
- Real-time validation with Zod schema
- Dynamic ingredient/instruction management
- Image upload with preview
- URL import with loading states
- Manual entry flags with clear visual indicators

### 6. Import Review Workflow

**File**: `src/components/recipes/import-review.tsx`

Create comprehensive review interface:
- Display all imported data with confidence indicators
- Highlight manually flagged fields requiring attention
- Allow inline editing of all recipe data
- Show import source and parsing method used
- Save as draft or publish as complete recipe

**Review Interface**:
- **Green indicators**: Successfully parsed data
- **Yellow warnings**: Low-confidence extractions needing review
- **Red flags**: Failed extractions requiring manual entry
- **Inline editing**: All fields editable during review
- **Batch actions**: Accept all, review flagged only, or manual edit

### 7. Recipe Pages Implementation

**Directory**: `src/app/recipes/`

Build complete recipe management interface:
- `page.tsx` - Recipe listing with search/filter capabilities
- `new/page.tsx` - Recipe creation page
- `[id]/page.tsx` - Recipe detail view
- `[id]/edit/page.tsx` - Recipe editing interface
- `drafts/page.tsx` - Draft recipe management

**Listing Features**:
- Search by title, ingredients, or tags
- Filter by cuisine, meal category, difficulty
- Sort by date, rating, or cooking time
- Grid and list view toggles
- Draft indicators and quick actions

**Detail Features**:
- Full recipe display with formatted instructions
- Image display from database storage
- Ingredient scaling with serving adjustments
- Rating and review system
- Edit/delete controls for recipe owner

### 8. Data Fetching with React Query

**Directory**: `src/lib/queries/`

Implement efficient data management:
- `recipe-queries.ts` - All recipe-related queries and mutations
- `ingredient-queries.ts` - Ingredient autocomplete and management
- `import-queries.ts` - URL import and status tracking

**Caching Strategy**:
- Recipe lists with pagination
- Individual recipe caching
- Optimistic updates for ratings and edits
- Background refetch for draft status changes

## Technical Specifications

### Database Storage Details

**Image Storage**:
- Store as `BYTEA` in PostgreSQL
- Include MIME type and filename metadata
- No size limits initially (can be added later)
- Serve via dedicated API endpoint with proper headers

**Draft Management**:
- `isDraft` boolean flag for incomplete recipes
- `importStatus` JSON field tracking parsing success/failure per field
- Drafts appear in separate listing with completion indicators

### Import Parsing Strategy

**Priority Order**:
1. **JSON-LD structured data** (schema.org Recipe format)
2. **Site-specific CSS selectors** for known websites
3. **Generic HTML parsing** using common recipe patterns
4. **Manual entry flags** for extraction failures

**Supported Websites**:
- Any site with JSON-LD structured data (schema.org Recipe)
- Sites with common HTML patterns (most recipe blogs)
- Popular sites often work due to widespread JSON-LD adoption
- Sites with microdata or RDFa markup

### Error Handling

**Import Failures**:
- Partial success: Save as draft with completed fields
- Complete failure: Return error with manual entry option
- Network errors: Retry logic with user feedback
- Invalid URLs: Validation with helpful error messages

**Data Validation**:
- Required fields: title, at least one ingredient, at least one instruction
- Optional but recommended: cooking times, servings, difficulty
- Image validation: type, basic corruption check
- URL validation: accessible and contains recipe content

## User Experience Flow

### Recipe Import Journey

1. **URL Entry**: User pastes recipe URL in import form
2. **Parsing**: System attempts extraction using priority strategy  
3. **Review**: User sees imported data with confidence indicators
4. **Editing**: User reviews and edits flagged or low-confidence fields
5. **Save**: Recipe saved as complete or draft based on completeness
6. **Draft Management**: Incomplete recipes saved to drafts for later completion

### Manual Entry Journey

1. **Form Access**: User chooses manual recipe creation
2. **Basic Info**: Title, description, meal category, cuisine
3. **Ingredients**: Dynamic list with quantity/unit management
4. **Instructions**: Step-by-step instruction builder
5. **Metadata**: Timing, servings, difficulty, tags
6. **Images**: Optional image upload with preview
7. **Save**: Recipe saved as complete entry

### Recipe Management Journey

1. **Discovery**: Browse, search, and filter recipe collection
2. **Viewing**: Full recipe display with scaling and timing
3. **Editing**: Update any recipe fields with form validation
4. **Organization**: Tag management and categorization
5. **Rating**: Personal rating system for favorites tracking

## Future Considerations

### Phase 2 Enhancements

**Enhanced Parsing**:
- Site-specific parsers for popular websites (AllRecipes, Food Network, etc.)
- Machine learning-based content extraction for complex layouts
- JavaScript rendering support for SPA recipe sites
- Improved confidence scoring for extracted data

**Advanced Import Features**:
- Batch URL processing for importing multiple recipes
- Browser extension for one-click imports
- PDF recipe parsing for cookbook digitization
- OCR support for handwritten recipe photos

**Enhanced User Experience**:
- Recipe scaling with automatic unit conversion
- Cooking mode with large text and timers
- Ingredient substitution suggestions
- Nutritional calculation integration

**Performance Optimizations**:
- Image compression before database storage
- CDN integration for faster image serving
- Search indexing for faster recipe discovery
- Caching layer for frequently accessed recipes

### Migration Path to Cloud Storage

The object storage abstraction layer enables seamless migration:
1. Implement new cloud adapter (AWS S3, Cloudinary, etc.)
2. Update storage configuration
3. Optional: Migrate existing images with background job
4. No changes required to application code using storage interface

This plan provides a comprehensive foundation for recipe management with robust import capabilities, user-friendly review workflows, and future-proof architecture for scaling and feature expansion.