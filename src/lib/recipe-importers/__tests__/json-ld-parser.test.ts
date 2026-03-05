import { parseJsonLd } from '../json-ld-parser';

describe('Recipe Ingredient Parsing', () => {
  describe('Compound Measurements', () => {
    it('should parse compound measurements like "1/2 cup + 2 Tablespoons" correctly', () => {
      // Simulate HTML with JSON-LD containing a compound measurement ingredient
      const htmlWithJsonLd = `
        <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Test Recipe",
          "recipeIngredient": [
            "1/2 cup + 2 Tablespoons (51g) unsweetened butter, softened"
          ]
        }
        </script>
      `;

      const result = parseJsonLd(htmlWithJsonLd);
      
      // The ingredient should be parsed correctly
      expect(result.recipe.ingredients).toBeDefined();
      expect(result.recipe.ingredients).toHaveLength(1);
      
      const ingredient = result.recipe.ingredients![0];
      
      // Should extract the full ingredient name correctly
      expect(ingredient.name).toBe('unsweetened butter, softened');
      
      // Should parse the compound quantity correctly
      // 1/2 cup + 2 tablespoons = 0.5 + (2/16) = 0.625 cups
      expect(ingredient.quantity).toBeCloseTo(0.625, 3);
      
      // Should use the primary unit (cup)
      expect(ingredient.unit).toBe('cup');
    });

    it('should handle simple measurements without compound units', () => {
      const htmlWithJsonLd = `
        <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Test Recipe",
          "recipeIngredient": [
            "1 cup granulated sugar"
          ]
        }
        </script>
      `;

      const result = parseJsonLd(htmlWithJsonLd);
      
      expect(result.recipe.ingredients).toBeDefined();
      expect(result.recipe.ingredients).toHaveLength(1);
      
      const ingredient = result.recipe.ingredients![0];
      expect(ingredient.name).toBe('granulated sugar');
      expect(ingredient.quantity).toBe(1);
      expect(ingredient.unit).toBe('cup');
    });

    it('should handle ingredients with no quantity', () => {
      const htmlWithJsonLd = `
        <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Test Recipe",
          "recipeIngredient": [
            "pure vanilla extract"
          ]
        }
        </script>
      `;

      const result = parseJsonLd(htmlWithJsonLd);
      
      expect(result.recipe.ingredients).toBeDefined();
      expect(result.recipe.ingredients).toHaveLength(1);
      
      const ingredient = result.recipe.ingredients![0];
      expect(ingredient.name).toBe('pure vanilla extract');
      expect(ingredient.quantity).toBeUndefined();
      expect(ingredient.unit).toBeUndefined();
    });
  });
});