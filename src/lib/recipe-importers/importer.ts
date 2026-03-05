import { ImportResult, ImportedRecipe, ImportStatus, validateImportedRecipe } from './validation';
import { parseJsonLd } from './json-ld-parser';
import { parseGenericHtml } from './generic-html-parser';

export async function importRecipeFromUrl(url: string): Promise<ImportResult> {
  const errors: string[] = [];
  let html: string;

  try {
    // Validate URL
    new URL(url);
  } catch (error) {
    return {
      success: false,
      status: [],
      source: url,
      errors: ['Invalid URL format'],
    };
  }

  try {
    // Fetch the webpage
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeImporter/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    html = await response.text();
  } catch (error) {
    return {
      success: false,
      status: [],
      source: url,
      errors: [`Failed to fetch URL: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }

  // Parse using multiple strategies
  const allStatus: ImportStatus[] = [];
  let recipe: Partial<ImportedRecipe> = {};

  // Strategy 1: JSON-LD structured data
  try {
    const jsonLdResult = parseJsonLd(html);
    if (Object.keys(jsonLdResult.recipe).length > 0) {
      recipe = { ...recipe, ...jsonLdResult.recipe };
      allStatus.push(...jsonLdResult.status);
    }
  } catch (error) {
    console.warn('JSON-LD parsing failed:', error);
    errors.push('JSON-LD parsing failed');
  }

  // Strategy 2: Generic HTML parsing (fallback)
  if (Object.keys(recipe).length === 0 || !recipe.title || !recipe.ingredients || !recipe.instructions) {
    try {
      const htmlResult = parseGenericHtml(html);
      
      // Fill in missing fields with HTML parsing results
      Object.entries(htmlResult.recipe).forEach(([key, value]) => {
        if (!(key in recipe) || !recipe[key as keyof ImportedRecipe]) {
          (recipe as any)[key] = value;
        }
      });

      // Add status for fields that weren't filled by JSON-LD
      htmlResult.status.forEach(status => {
        if (!allStatus.find(s => s.field === status.field && s.success)) {
          allStatus.push(status);
        }
      });
    } catch (error) {
      console.warn('HTML parsing failed:', error);
      errors.push('HTML parsing failed');
    }
  }

  // Add manual flags for missing required fields
  const requiredFields = ['title', 'ingredients', 'instructions'];
  requiredFields.forEach(field => {
    if (!allStatus.find(s => s.field === field && s.success)) {
      allStatus.push({
        field,
        success: false,
        confidence: 'low',
        source: 'manual-required',
        error: `${field} could not be automatically extracted`,
      });
    }
  });

  // Validate the parsed recipe
  const validation = validateImportedRecipe(recipe);
  
  if (!validation.isValid) {
    // If validation fails, mark as draft
    return {
      success: false,
      recipe: recipe as ImportedRecipe,
      status: allStatus,
      source: url,
      errors: [...errors, ...validation.errors],
    };
  }

  return {
    success: true,
    recipe: validation.recipe!,
    status: allStatus,
    source: url,
    errors,
  };
}

export function getImportConfidenceScore(status: ImportStatus[]): {
  overall: 'high' | 'medium' | 'low';
  requiredFieldsComplete: boolean;
  fieldsNeedingReview: string[];
} {
  const requiredFields = ['title', 'ingredients', 'instructions'];
  const requiredFieldsComplete = requiredFields.every(field =>
    status.find(s => s.field === field && s.success)
  );

  const fieldsNeedingReview = status
    .filter(s => s.confidence === 'low' || !s.success)
    .map(s => s.field);

  const successfulHighConfidenceFields = status.filter(
    s => s.success && s.confidence === 'high'
  ).length;

  const totalImportantFields = requiredFields.length + 3; // prep time, cook time, servings
  
  let overall: 'high' | 'medium' | 'low';
  if (requiredFieldsComplete && successfulHighConfidenceFields >= totalImportantFields * 0.8) {
    overall = 'high';
  } else if (requiredFieldsComplete && successfulHighConfidenceFields >= totalImportantFields * 0.5) {
    overall = 'medium';
  } else {
    overall = 'low';
  }

  return {
    overall,
    requiredFieldsComplete,
    fieldsNeedingReview,
  };
}