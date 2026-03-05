import { ImportedRecipe, ImportStatus } from './validation';

export function parseJsonLd(html: string): { recipe: Partial<ImportedRecipe>; status: ImportStatus[] } {
  const status: ImportStatus[] = [];
  const recipe: Partial<ImportedRecipe> = {};

  try {
    // Find all script tags with type="application/ld+json"
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    
    if (!jsonLdMatches) {
      return { recipe, status };
    }

    for (const match of jsonLdMatches) {
      const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
      
      try {
        const data = JSON.parse(jsonContent);
        const recipeData = findRecipeInJsonLd(data);
        
        if (recipeData) {
          parseRecipeFromJsonLd(recipeData, recipe, status);
          break; // Use the first valid recipe found
        }
      } catch (e) {
        console.warn('Failed to parse JSON-LD:', e);
      }
    }
  } catch (error) {
    console.error('Error parsing JSON-LD:', error);
  }

  return { recipe, status };
}

function findRecipeInJsonLd(data: any): any | null {
  if (!data) return null;

  // Check if data itself is a Recipe
  if (data['@type'] === 'Recipe') {
    return data;
  }

  // Check if data is an array and find Recipe in it
  if (Array.isArray(data)) {
    for (const item of data) {
      const recipe = findRecipeInJsonLd(item);
      if (recipe) return recipe;
    }
  }

  // Check if data has @graph property
  if (data['@graph']) {
    return findRecipeInJsonLd(data['@graph']);
  }

  return null;
}

function parseRecipeFromJsonLd(data: any, recipe: Partial<ImportedRecipe>, status: ImportStatus[]) {
  // Title
  if (data.name) {
    recipe.title = data.name;
    status.push({
      field: 'title',
      success: true,
      confidence: 'high',
      source: 'json-ld',
      value: data.name,
    });
  }

  // Description
  if (data.description) {
    recipe.description = data.description;
    status.push({
      field: 'description',
      success: true,
      confidence: 'high',
      source: 'json-ld',
      value: data.description,
    });
  }

  // Instructions
  if (data.recipeInstructions) {
    const instructions = parseInstructions(data.recipeInstructions);
    if (instructions.length > 0) {
      recipe.instructions = instructions;
      status.push({
        field: 'instructions',
        success: true,
        confidence: 'high',
        source: 'json-ld',
        value: instructions,
      });
    }
  }

  // Ingredients
  if (data.recipeIngredient) {
    const ingredients = parseIngredients(data.recipeIngredient);
    if (ingredients.length > 0) {
      recipe.ingredients = ingredients;
      status.push({
        field: 'ingredients',
        success: true,
        confidence: 'high',
        source: 'json-ld',
        value: ingredients,
      });
    }
  }

  // Cooking times
  if (data.prepTime) {
    const prepTime = parseDuration(data.prepTime);
    if (prepTime) {
      recipe.prepTimeMinutes = prepTime;
      status.push({
        field: 'prepTimeMinutes',
        success: true,
        confidence: 'high',
        source: 'json-ld',
        value: prepTime,
      });
    }
  }

  if (data.cookTime) {
    const cookTime = parseDuration(data.cookTime);
    if (cookTime) {
      recipe.cookTimeMinutes = cookTime;
      status.push({
        field: 'cookTimeMinutes',
        success: true,
        confidence: 'high',
        source: 'json-ld',
        value: cookTime,
      });
    }
  }

  // Servings/Yield
  if (data.recipeYield) {
    const servings = parseServings(data.recipeYield);
    if (servings) {
      recipe.servings = servings;
      status.push({
        field: 'servings',
        success: true,
        confidence: 'high',
        source: 'json-ld',
        value: servings,
      });
    }
  }

  // Cuisine
  if (data.recipeCuisine) {
    recipe.cuisineType = Array.isArray(data.recipeCuisine) 
      ? data.recipeCuisine[0] 
      : data.recipeCuisine;
    status.push({
      field: 'cuisineType',
      success: true,
      confidence: 'high',
      source: 'json-ld',
      value: recipe.cuisineType,
    });
  }

  // Image
  if (data.image) {
    const imageUrl = parseImageUrl(data.image);
    if (imageUrl) {
      recipe.imageUrl = imageUrl;
      status.push({
        field: 'imageUrl',
        success: true,
        confidence: 'high',
        source: 'json-ld',
        value: imageUrl,
      });
    }
  }
}

function parseInstructions(instructions: any): string[] {
  if (!instructions) return [];

  const result: string[] = [];

  if (Array.isArray(instructions)) {
    for (const instruction of instructions) {
      if (typeof instruction === 'string') {
        result.push(instruction);
      } else if (instruction.text) {
        result.push(instruction.text);
      } else if (instruction.name) {
        result.push(instruction.name);
      }
    }
  } else if (typeof instructions === 'string') {
    result.push(instructions);
  } else if (instructions.text) {
    result.push(instructions.text);
  }

  return result.filter(instruction => instruction.trim().length > 0);
}

function parseIngredients(ingredients: any): Array<{ name: string; quantity?: number; unit?: string }> {
  if (!ingredients || !Array.isArray(ingredients)) return [];

  return ingredients.map(ingredient => {
    if (typeof ingredient === 'string') {
      return parseIngredientString(ingredient);
    }
    
    if (ingredient.name) {
      return { name: ingredient.name };
    }
    
    return { name: ingredient.toString() };
  }).filter(ingredient => ingredient.name.trim().length > 0);
}

function parseIngredientString(ingredient: string): { name: string; quantity?: number; unit?: string } {
  // Clean up the ingredient string
  let cleaned = ingredient.trim();
  
  // Remove common prefixes and suffixes
  cleaned = cleaned.replace(/^(\d+\.)\s*/, ''); // Remove numbering like "1. "
  
  // First check for compound measurements before trying regular patterns
  const compoundResult = parseCompoundMeasurement(cleaned);
  if (compoundResult) {
    return compoundResult;
  }
  
  // Try to match various patterns for quantity, unit, and ingredient name
  const patterns = [
    // Pattern: "1/2 cup (8 Tbsp; 113g) unsalted butter"
    /^([\d\/\.\s]+)\s*([a-zA-Z]+)\s*(?:\([^)]+\))?\s*(.+)$/,
    // Pattern: "1 cup (100g) granulated sugar"
    /^([\d\/\.\s]+)\s*([a-zA-Z]+)?\s*(?:\([^)]+\))?\s*(.+)$/,
    // Pattern: "2 large eggs, at room temperature"
    /^([\d\/\.\s]+)\s*([a-zA-Z]*)?\s*(.+)$/,
    // Pattern: "pure vanilla extract" (no quantity)
    /^(.+)$/
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      if (match.length === 4 && match[3]?.trim()) {
        // Has quantity and possibly unit
        const [, quantityStr, unit, name] = match;
        const quantity = parseQuantity(quantityStr?.trim());
        
        if (quantity !== null && name?.trim()) {
          return {
            name: name.trim(),
            quantity,
            unit: unit?.trim() || undefined,
          };
        }
      } else if (match.length === 2) {
        // Just the ingredient name
        return { name: match[1].trim() };
      }
    }
  }

  return { name: cleaned };
}

function parseCompoundMeasurement(ingredient: string): { name: string; quantity?: number; unit?: string } | null {
  // Pattern: "1/2 cup + 2 Tablespoons (51g) unsweetened butter"
  const compoundMatch = ingredient.match(/^([\d\/\.\s]+)\s*([a-zA-Z]+)\s*\+\s*([\d\/\.\s]+)\s*([a-zA-Z]+)\s*(?:\([^)]+\))?\s*(.+)$/);
  
  if (compoundMatch) {
    const [, qty1Str, unit1, qty2Str, unit2, name] = compoundMatch;
    const qty1 = parseQuantity(qty1Str?.trim());
    const qty2 = parseQuantity(qty2Str?.trim());
    
    if (qty1 !== null && qty2 !== null && name?.trim()) {
      // Convert to common unit if possible, otherwise use the first unit
      let totalQuantity = qty1;
      let primaryUnit = unit1?.trim();
      
      // Simple conversion for common cases
      if (unit1?.toLowerCase().includes('cup') && unit2?.toLowerCase().includes('tablespoon')) {
        // 1 cup = 16 tablespoons
        totalQuantity = qty1 + (qty2 / 16);
        primaryUnit = unit1;
      } else if (unit1?.toLowerCase().includes('tablespoon') && unit2?.toLowerCase().includes('teaspoon')) {
        // 1 tablespoon = 3 teaspoons
        totalQuantity = qty1 + (qty2 / 3);
        primaryUnit = unit1;
      } else {
        // Can't convert, just use the first measurement
        totalQuantity = qty1;
        primaryUnit = unit1;
      }
      
      return {
        name: name.trim(),
        quantity: totalQuantity,
        unit: primaryUnit,
      };
    }
  }
  
  return null;
}

function parseQuantity(quantityStr: string): number | null {
  if (!quantityStr) return null;
  
  // Clean up the string
  const cleaned = quantityStr.trim();
  
  // Handle mixed numbers like "1 1/2"
  const mixedMatch = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const [, whole, numerator, denominator] = mixedMatch;
    const wholeNum = parseInt(whole);
    const fraction = parseInt(numerator) / parseInt(denominator);
    return wholeNum + fraction;
  }
  
  // Handle simple fractions like "1/2"
  const fractionMatch = cleaned.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const [, numerator, denominator] = fractionMatch;
    return parseInt(numerator) / parseInt(denominator);
  }
  
  // Handle decimals and whole numbers
  const decimal = parseFloat(cleaned);
  return isNaN(decimal) ? null : decimal;
}

function parseDuration(duration: string): number | null {
  if (!duration) return null;

  // Parse ISO 8601 duration (PT15M) or simple formats
  if (duration.startsWith('PT')) {
    const minutes = duration.match(/(\d+)M/);
    const hours = duration.match(/(\d+)H/);
    
    let totalMinutes = 0;
    if (hours) totalMinutes += parseInt(hours[1]) * 60;
    if (minutes) totalMinutes += parseInt(minutes[1]);
    
    return totalMinutes > 0 ? totalMinutes : null;
  }

  // Try to parse common formats like "15 minutes", "1 hour 30 minutes"
  const minuteMatch = duration.match(/(\d+)\s*(?:min|minute|minutes)/i);
  const hourMatch = duration.match(/(\d+)\s*(?:hour|hours|hr|hrs)/i);

  let totalMinutes = 0;
  if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
  if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);

  return totalMinutes > 0 ? totalMinutes : null;
}

function parseServings(servings: any): number | null {
  if (typeof servings === 'number') return servings;
  if (typeof servings === 'string') {
    const match = servings.match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
  }
  if (Array.isArray(servings) && servings.length > 0) {
    return parseServings(servings[0]);
  }
  return null;
}

function parseImageUrl(image: any): string | null {
  if (typeof image === 'string') return image;
  if (image?.url) return image.url;
  if (Array.isArray(image) && image.length > 0) {
    return parseImageUrl(image[0]);
  }
  return null;
}