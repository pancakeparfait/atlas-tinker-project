import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ImportResult {
  importedRecipe: any;
  importStatus: Array<{
    field: string;
    success: boolean;
    confidence: 'high' | 'medium' | 'low';
    source: 'json-ld' | 'html-heuristic' | 'manual-required';
    value?: any;
    error?: string;
  }>;
  confidence: {
    overall: 'high' | 'medium' | 'low';
    requiredFieldsComplete: boolean;
    fieldsNeedingReview: string[];
  };
  source: string;
  errors: string[];
  suggestions: any;
}

async function importRecipeFromUrl(url: string): Promise<ImportResult> {
  const response = await fetch('/api/recipes/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error('Failed to import recipe');
  }

  return response.json();
}

export function useImportRecipe() {
  return useMutation({
    mutationFn: importRecipeFromUrl,
  });
}