import { ImportedRecipe, ImportStatus } from './validation';
import * as cheerio from 'cheerio';

export function parseGenericHtml(html: string): { recipe: Partial<ImportedRecipe>; status: ImportStatus[] } {
  const status: ImportStatus[] = [];
  const recipe: Partial<ImportedRecipe> = {};

  let $: cheerio.CheerioAPI;

  try {
    $ = cheerio.load(html);
  } catch (error) {
    console.error('Failed to parse HTML:', error);
    return { recipe, status };
  }

  // Parse title
  const title = parseTitle($);
  if (title) {
    recipe.title = title.value;
    status.push(title.status);
  }

  // Parse description
  const description = parseDescription($);
  if (description) {
    recipe.description = description.value;
    status.push(description.status);
  }

  // Parse ingredients
  const ingredients = parseIngredients($);
  if (ingredients.value.length > 0) {
    recipe.ingredients = ingredients.value;
    status.push(ingredients.status);
  }

  // Parse instructions
  const instructions = parseInstructions($);
  if (instructions.value.length > 0) {
    recipe.instructions = instructions.value;
    status.push(instructions.status);
  }

  // Parse cooking times
  const prepTime = parsePrepTime($);
  if (prepTime) {
    recipe.prepTimeMinutes = prepTime.value;
    status.push(prepTime.status);
  }

  const cookTime = parseCookTime($);
  if (cookTime) {
    recipe.cookTimeMinutes = cookTime.value;
    status.push(cookTime.status);
  }

  // Parse servings
  const servings = parseServings($);
  if (servings) {
    recipe.servings = servings.value;
    status.push(servings.status);
  }

  // Parse image
  const image = parseImage($);
  if (image) {
    recipe.imageUrl = image.value;
    status.push(image.status);
  }

  return { recipe, status };
}

function parseTitle($: cheerio.CheerioAPI): { value: string; status: ImportStatus } | null {
  const selectors = [
    '[itemprop="name"]',
    '.recipe-title',
    '.recipe-name',
    '.entry-title',
    'h1'
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.text()?.trim()) {
      return {
        value: element.text().trim(),
        status: {
          field: 'title',
          success: true,
          confidence: selector.includes('itemprop') ? 'high' : 'medium',
          source: 'html-heuristic',
          value: element.text().trim(),
        }
      };
    }
  }

  return null;
}

function parseDescription($: cheerio.CheerioAPI): { value: string; status: ImportStatus } | null {
  const selectors = [
    '[itemprop="description"]',
    '.recipe-description',
    '.recipe-summary',
    '.entry-summary'
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.text()?.trim()) {
      return {
        value: element.text().trim(),
        status: {
          field: 'description',
          success: true,
          confidence: selector.includes('itemprop') ? 'high' : 'medium',
          source: 'html-heuristic',
          value: element.text().trim(),
        }
      };
    }
  }

  return null;
}

function parseIngredients($: cheerio.CheerioAPI): { value: Array<{ name: string; quantity?: number; unit?: string }>; status: ImportStatus } {
  const ingredients: Array<{ name: string; quantity?: number; unit?: string }> = [];
  
  const selectors = [
    '[itemprop="recipeIngredient"]',
    '.recipe-ingredient',
    '.ingredient',
    '.ingredients li'
  ];

  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      elements.each((_, element) => {
        const text = $(element).text()?.trim();
        if (text) {
          const parsed = parseIngredientString(text);
          ingredients.push(parsed);
        }
      });

      if (ingredients.length > 0) {
        return {
          value: ingredients,
          status: {
            field: 'ingredients',
            success: true,
            confidence: selector.includes('itemprop') ? 'high' : 'medium',
            source: 'html-heuristic',
            value: ingredients,
          }
        };
      }
    }
  }

  return {
    value: [],
    status: {
      field: 'ingredients',
      success: false,
      confidence: 'low',
      source: 'manual-required',
      error: 'No ingredients found in HTML',
    }
  };
}

function parseInstructions($: cheerio.CheerioAPI): { value: string[]; status: ImportStatus } {
  const instructions: string[] = [];
  
  const selectors = [
    '[itemprop="recipeInstructions"]',
    '.recipe-instruction',
    '.instruction',
    '.instructions li',
    '.directions li'
  ];

  for (const selector of selectors) {
    const elements = $(selector);
    if (elements.length > 0) {
      elements.each((_, element) => {
        const text = $(element).text()?.trim();
        if (text) {
          instructions.push(text);
        }
      });

      if (instructions.length > 0) {
        return {
          value: instructions,
          status: {
            field: 'instructions',
            success: true,
            confidence: selector.includes('itemprop') ? 'high' : 'medium',
            source: 'html-heuristic',
            value: instructions,
          }
        };
      }
    }
  }

  return {
    value: [],
    status: {
      field: 'instructions',
      success: false,
      confidence: 'low',
      source: 'manual-required',
      error: 'No instructions found in HTML',
    }
  };
}

function parsePrepTime($: cheerio.CheerioAPI): { value: number; status: ImportStatus } | null {
  const selectors = [
    '[itemprop="prepTime"]',
    '.prep-time',
    '.recipe-prep-time'
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.text()) {
      const minutes = extractMinutes(element.text());
      if (minutes) {
        return {
          value: minutes,
          status: {
            field: 'prepTimeMinutes',
            success: true,
            confidence: selector.includes('itemprop') ? 'high' : 'medium',
            source: 'html-heuristic',
            value: minutes,
          }
        };
      }
    }
  }

  return null;
}

function parseCookTime($: cheerio.CheerioAPI): { value: number; status: ImportStatus } | null {
  const selectors = [
    '[itemprop="cookTime"]',
    '.cook-time',
    '.recipe-cook-time'
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.text()) {
      const minutes = extractMinutes(element.text());
      if (minutes) {
        return {
          value: minutes,
          status: {
            field: 'cookTimeMinutes',
            success: true,
            confidence: selector.includes('itemprop') ? 'high' : 'medium',
            source: 'html-heuristic',
            value: minutes,
          }
        };
      }
    }
  }

  return null;
}

function parseServings($: cheerio.CheerioAPI): { value: number; status: ImportStatus } | null {
  const selectors = [
    '[itemprop="recipeYield"]',
    '.servings',
    '.recipe-servings',
    '.yield'
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.text()) {
      const servings = extractNumber(element.text());
      if (servings) {
        return {
          value: servings,
          status: {
            field: 'servings',
            success: true,
            confidence: selector.includes('itemprop') ? 'high' : 'medium',
            source: 'html-heuristic',
            value: servings,
          }
        };
      }
    }
  }

  return null;
}

function parseImage($: cheerio.CheerioAPI): { value: string; status: ImportStatus } | null {
  const selectors = [
    '[itemprop="image"]',
    '.recipe-image img',
    '.recipe-photo img',
    '.featured-image img'
  ];

  for (const selector of selectors) {
    const element = $(selector).first();
    if (element.length > 0) {
      const src = element.attr('src');
      if (src && src.startsWith('http')) {
        return {
          value: src,
          status: {
            field: 'imageUrl',
            success: true,
            confidence: selector.includes('itemprop') ? 'high' : 'medium',
            source: 'html-heuristic',
            value: src,
          }
        };
      }
    }
  }

  return null;
}

function extractMinutes(text: string): number | null {
  const minuteMatch = text.match(/(\d+)\s*(?:min|minute|minutes)/i);
  const hourMatch = text.match(/(\d+)\s*(?:hour|hours|hr|hrs)/i);

  let totalMinutes = 0;
  if (hourMatch) totalMinutes += parseInt(hourMatch[1]) * 60;
  if (minuteMatch) totalMinutes += parseInt(minuteMatch[1]);

  return totalMinutes > 0 ? totalMinutes : null;
}

function extractNumber(text: string): number | null {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
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