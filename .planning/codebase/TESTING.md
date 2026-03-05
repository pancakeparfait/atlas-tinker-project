# Testing Patterns

**Analysis Date:** 2026-02-18

## Test Framework

**Runner:**

- Jest 30.2.0
- Config: `jest.config.js`
- Test environment: jsdom (for React component testing)

**Assertion Library:**

- Jest built-in matchers
- `@testing-library/jest-dom` 6.9.1 for DOM matchers

**Testing Library:**

- `@testing-library/react` 16.3.2 for component testing
- `@testing-library/user-event` 14.6.1 for user interactions

**Run Commands:**

```bash
pnpm test                # Run all tests
pnpm test:watch          # Watch mode
pnpm test <pattern>      # Run specific test file/pattern
pnpm test -t "test name" # Run specific test by name
```

**Examples:**

```bash
pnpm test json-ld-parser           # Run specific test file
pnpm test -t "Compound Measurements" # Run specific test case
```

## Test File Organization

**Location:**

- Colocated in `__tests__/` directories next to source files
- Pattern: Tests live alongside the code they test

**Structure:**

```
src/
├── lib/
│   ├── utils.ts
│   ├── __tests__/
│   │   └── utils.test.ts
│   └── recipe-importers/
│       ├── json-ld-parser.ts
│       └── __tests__/
│           └── json-ld-parser.test.ts
├── app/
│   └── recipes/
│       └── [id]/
│           ├── page.tsx
│           └── __tests__/
│               └── page.test.tsx
```

**Naming:**

- Test files: `<name>.test.ts` or `<name>.test.tsx`
- NOT using `*.spec.*` suffix
- File name matches source file: `utils.ts` → `utils.test.ts`

## Test Structure

**Suite Organization:**

```typescript
describe('ComponentName or FeatureName', () => {
  describe('Subcategory or Method', () => {
    it('should do specific behavior', () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

**Example from `utils.test.ts`:**

```typescript
describe('formatQuantityAsFraction', () => {
  describe('whole numbers', () => {
    it('should format 1 as "1"', () => {
      expect(formatQuantityAsFraction(1)).toBe('1')
    })
  })

  describe('halves', () => {
    it('should format 0.5 as "1/2"', () => {
      expect(formatQuantityAsFraction(0.5)).toBe('1/2')
    })

    it('should format 1.5 as "1 1/2"', () => {
      expect(formatQuantityAsFraction(1.5)).toBe('1 1/2')
    })
  })
})
```

**Patterns:**

- Nested `describe()` blocks for grouping related tests
- Clear, descriptive test names: "should [expected behavior]"
- One assertion per test (preferred but not strict)
- Setup in `beforeEach()`, cleanup in `afterEach()` when needed

**Setup/Teardown:**

```typescript
describe('RecipeDetailPage', () => {
  const mockPush = jest.fn()
  const mockMutateAsync = jest.fn()

  beforeEach(() => {
    jest
      .clearAllMocks()(useRouter as jest.Mock)
      .mockReturnValue({ push: mockPush })(useParams as jest.Mock)
      .mockReturnValue({ id: 'recipe-1' })(useDeleteRecipe as jest.Mock)
      .mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      })
  })
})
```

## Mocking

**Framework:** Jest built-in mocking

**Next.js Mocking:**

```typescript
// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))
```

**React Query Hooks:**

```typescript
// Mock TanStack Query hooks
jest
  .mock('@/lib/queries/recipe-queries', () => ({
    useRecipe: jest.fn(),
    useDeleteRecipe: jest.fn(),
  }))
  (
    // Use in tests
    useRecipe as jest.Mock
  )
  .mockReturnValue({
    data: mockRecipeComplete,
    isLoading: false,
    error: null,
  })
```

**Global Browser APIs:**

```typescript
// Mock window.confirm
const mockConfirm = jest.fn()
global.confirm = mockConfirm

// Mock window.alert
const mockAlert = jest.fn()
global.alert = mockAlert

// Mock window.matchMedia (in jest.setup.js)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
```

**What to Mock:**

- Next.js hooks and components (`useRouter`, `useParams`, `Image`)
- TanStack Query hooks (`useQuery`, `useMutation`)
- Browser APIs (`window.confirm`, `window.alert`, `window.matchMedia`)
- External services and API calls

**What NOT to Mock:**

- UI components (test integration with real components)
- Utility functions (test actual implementations)
- Simple data transformations

## Fixtures and Factories

**Test Data Pattern:**
Define mock data objects at the top of test files:

```typescript
const mockRecipeComplete = {
  id: 'recipe-1',
  title: 'Chocolate Chip Cookies',
  description: 'Delicious homemade cookies',
  cuisineType: 'American',
  mealCategory: 'DESSERT',
  difficultyLevel: 'EASY',
  prepTimeMinutes: 15,
  cookTimeMinutes: 12,
  servings: 24,
  personalRating: 5,
  isDraft: false,
  imageUrl: 'http://example.com/image.jpg',
  tags: ['dessert', 'baking', 'cookies'],
  source: "Sally's Baking Addiction",
  sourceUrl: 'https://example.com/recipe',
  instructions: [
    'Preheat oven to 350°F',
    'Mix butter and sugars',
    'Add eggs and vanilla',
  ],
  ingredients: [
    {
      id: 'ing-1',
      quantity: '1',
      unit: 'cup',
      preparationNote: 'softened',
      isOptional: false,
      ingredient: { name: 'unsalted butter' },
    },
  ],
}

const mockRecipeMinimal = {
  id: 'recipe-2',
  title: 'Simple Recipe',
  description: null,
  cuisineType: null,
  mealCategory: 'DINNER',
  // ... minimal data for edge case testing
}
```

**Fixture Variations:**

- `mockRecipeComplete` - Full data for happy path
- `mockRecipeMinimal` - Minimal required fields
- `mockRecipeEmpty` - Empty arrays/null values for edge cases
- `mockRecipeWithEntities` - Special characters for HTML entity testing

**Location:**

- Fixtures defined at top of test file (NOT separate files)
- Shared fixtures would go in `src/lib/__tests__/fixtures/` (not currently used)

## Coverage

**Requirements:** No enforced coverage targets

**View Coverage:**

```bash
pnpm test -- --coverage
```

**Current Test Files:**

- `src/lib/__tests__/utils.test.ts` - Utility function tests (164 lines)
- `src/lib/recipe-importers/__tests__/json-ld-parser.test.ts` - Parser tests (86 lines)
- `src/app/recipes/[id]/__tests__/page.test.tsx` - Component tests (739 lines)

## Test Types

**Unit Tests:**

- Scope: Individual functions and utilities
- Location: `src/lib/__tests__/`
- Example: `utils.test.ts` testing `gcd()` and `formatQuantityAsFraction()`
- Pattern: Pure functions with various inputs

```typescript
describe('gcd', () => {
  it('should calculate GCD of 8 and 4', () => {
    expect(gcd(8, 4)).toBe(4)
  })

  it('should handle zero as one argument', () => {
    expect(gcd(0, 5)).toBe(5)
  })

  it('should handle negative numbers', () => {
    expect(gcd(-8, 4)).toBe(4)
  })
})
```

**Integration Tests:**

- Scope: React components with hooks and interactions
- Location: Colocated in `__tests__/` near components
- Example: `page.test.tsx` testing full page rendering with mocked dependencies
- Pattern: Render component, interact with user-event, assert on DOM

```typescript
describe('RecipeDetailPage', () => {
  it('renders complete recipe with all fields', () => {
    (useRecipe as jest.Mock).mockReturnValue({
      data: mockRecipeComplete,
      isLoading: false,
      error: null,
    })

    render(<RecipeDetailPage />)

    expect(screen.getByText('Chocolate Chip Cookies')).toBeInTheDocument()
    expect(screen.getByText('Delicious homemade cookies')).toBeInTheDocument()
  })
})
```

**E2E Tests:**

- Framework: Not currently used
- Future consideration: Playwright or Cypress

## Common Patterns

**Async Testing:**

```typescript
it('successful delete redirects to recipes list', async () => {
  const user = userEvent.setup()
  mockConfirm.mockReturnValue(true)
  mockMutateAsync.mockResolvedValue({})

  (useRecipe as jest.Mock).mockReturnValue({
    data: mockRecipeComplete,
    isLoading: false,
    error: null,
  })

  render(<RecipeDetailPage />)

  const deleteButton = screen.getByRole('button', { name: /delete/i })
  await user.click(deleteButton)

  await waitFor(() => {
    expect(mockMutateAsync).toHaveBeenCalledWith('recipe-1')
    expect(mockPush).toHaveBeenCalledWith('/recipes')
  })
})
```

**Error Testing:**

```typescript
it('displays error message when recipe fetch fails', () => {
  (useRecipe as jest.Mock).mockReturnValue({
    data: null,
    isLoading: false,
    error: new Error('Network error'),
  })

  render(<RecipeDetailPage />)

  expect(screen.getByText('Error loading recipe')).toBeInTheDocument()
  expect(screen.getByText('Return to Recipes')).toBeInTheDocument()
})
```

**User Interaction Testing:**

```typescript
it('back button navigates to recipes list', async () => {
  const user = userEvent.setup()
  (useRecipe as jest.Mock).mockReturnValue({
    data: mockRecipeComplete,
    isLoading: false,
    error: null,
  })

  render(<RecipeDetailPage />)

  const backButton = screen.getByRole('button', { name: /back to recipes/i })
  await user.click(backButton)

  expect(mockPush).toHaveBeenCalledWith('/recipes')
})
```

**Loading State Testing:**

```typescript
it('shows loading skeleton while fetching recipe', () => {
  (useRecipe as jest.Mock).mockReturnValue({
    data: null,
    isLoading: true,
    error: null,
  })

  render(<RecipeDetailPage />)

  expect(screen.getByText('Loading recipe...')).toBeInTheDocument()
  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
})
```

**Query Selectors:**

```typescript
// Prefer accessible queries
screen.getByRole('button', { name: /edit/i })
screen.getByText('Chocolate Chip Cookies')
screen.getByLabelText('Recipe Title')

// Use queryBy* for asserting absence
expect(screen.queryByText('Draft')).not.toBeInTheDocument()

// Use getAllBy* for multiple matches
const stars = screen.getAllByTestId(/star/i)
expect(stars.length).toBeGreaterThanOrEqual(5)
```

**Closeness Assertions:**

```typescript
// For floating point comparisons
expect(ingredient.quantity).toBeCloseTo(0.625, 3)
```

**DOM Assertions:**

```typescript
// Check attributes
expect(sourceLink).toHaveAttribute('href', 'https://example.com/recipe')
expect(sourceLink).toHaveAttribute('target', '_blank')

// Check disabled state
expect(deleteButton).toBeDisabled()

// Check presence/absence
expect(screen.getByText('Draft')).toBeInTheDocument()
expect(screen.queryByText('Source')).not.toBeInTheDocument()
```

## Test Configuration

**jest.config.js:**

```javascript
{
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: { jsx: 'react-jsx' },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
}
```

**jest.setup.js:**

```javascript
// Import jest-dom matchers
require('@testing-library/jest-dom')

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})
```

**Path Mapping:**

- `@/` alias configured to resolve to `<rootDir>/src/`
- Matches TypeScript `tsconfig.json` paths

---

_Testing analysis: 2026-02-18_
