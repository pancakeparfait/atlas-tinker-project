'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IngredientList } from './ingredient-list';
import { InstructionSteps } from './instruction-steps';
import { RecipeSchema, MEAL_CATEGORIES, DIFFICULTY_LEVELS, type RecipeFormData } from './recipe-form-schema';
import { useImportRecipe, type ImportResult } from '@/lib/queries/import-queries';
import { useCreateRecipe, useUpdateRecipe, type Recipe } from '@/lib/queries/recipe-queries';
import { ImportReview } from './import-review';
import { Download, Save } from 'lucide-react';

interface RecipeFormProps {
  recipe?: Recipe;
  onSuccess?: (recipe: Recipe) => void;
  onCancel?: () => void;
}

export function RecipeForm({ recipe, onSuccess, onCancel }: RecipeFormProps) {
  const [importUrl, setImportUrl] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const importMutation = useImportRecipe();
  const createMutation = useCreateRecipe();
  const updateMutation = useUpdateRecipe();

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(RecipeSchema),
    defaultValues: recipe ? {
      title: recipe.title,
      description: recipe.description || '',
      cuisineType: recipe.cuisineType || '',
      mealCategory: recipe.mealCategory,
      prepTimeMinutes: recipe.prepTimeMinutes || undefined,
      cookTimeMinutes: recipe.cookTimeMinutes || undefined,
      servings: recipe.servings,
      difficultyLevel: recipe.difficultyLevel,
      instructions: recipe.instructions,
      source: recipe.source || '',
      sourceUrl: recipe.sourceUrl || '',
      personalRating: recipe.personalRating || undefined,
      tags: recipe.tags,
      isDraft: recipe.isDraft,
      ingredients: recipe.ingredients.map(ri => ({
        name: ri.ingredient.name,
        quantity: ri.quantity,
        unit: ri.unit,
        preparationNote: ri.preparationNote || '',
        isOptional: ri.isOptional,
      })),
    } : {
      title: '',
      description: '',
      cuisineType: '',
      mealCategory: 'DINNER' as const,
      servings: 4,
      difficultyLevel: 'MEDIUM' as const,
      instructions: [''],
      tags: [],
      isDraft: false,
      ingredients: [{
        name: '',
        quantity: 1,
        unit: 'cup',
        preparationNote: '',
        isOptional: false,
      }],
    },
  });

  const handleImport = async () => {
    if (!importUrl) return;
    
    setIsImporting(true);
    try {
      const result = await importMutation.mutateAsync(importUrl);
      setImportResult(result);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportAccept = (reviewedData: RecipeFormData) => {
    form.reset(reviewedData);
    setImportResult(null);
  };

  const onSubmit = async (data: RecipeFormData) => {
    try {
      if (recipe) {
        const updated = await updateMutation.mutateAsync({ id: recipe.id, data });
        onSuccess?.(updated);
      } else {
        const created = await createMutation.mutateAsync(data);
        onSuccess?.(created);
      }
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  if (importResult) {
    return (
      <ImportReview
        importResult={importResult}
        onAccept={handleImportAccept}
        onCancel={() => setImportResult(null)}
      />
    );
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Import Section */}
        {!recipe && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <Label className="text-lg font-semibold mb-2 block">Import from URL</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Paste recipe URL here..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleImport}
                disabled={!importUrl || isImporting}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="title">Recipe Title *</Label>
            <Input
              id="title"
              placeholder="Enter recipe title"
              {...form.register('title')}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cuisineType">Cuisine Type</Label>
            <Input
              id="cuisineType"
              placeholder="e.g., Italian, Mexican, Asian"
              {...form.register('cuisineType')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mealCategory">Meal Category *</Label>
            <Select
              value={form.watch('mealCategory')}
              onValueChange={(value) => form.setValue('mealCategory', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {MEAL_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficultyLevel">Difficulty Level *</Label>
            <Select
              value={form.watch('difficultyLevel')}
              onValueChange={(value) => form.setValue('difficultyLevel', value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="servings">Servings *</Label>
            <Input
              id="servings"
              type="number"
              min="1"
              {...form.register('servings', { valueAsNumber: true })}
            />
            {form.formState.errors.servings && (
              <p className="text-sm text-red-500">{form.formState.errors.servings.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="personalRating">Personal Rating</Label>
            <Select
              value={form.watch('personalRating')?.toString()}
              onValueChange={(value) => form.setValue('personalRating', value ? parseInt(value) : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rate this recipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">⭐ 1 star</SelectItem>
                <SelectItem value="2">⭐⭐ 2 stars</SelectItem>
                <SelectItem value="3">⭐⭐⭐ 3 stars</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ 4 stars</SelectItem>
                <SelectItem value="5">⭐⭐⭐⭐⭐ 5 stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Brief description of the recipe..."
            className="min-h-[100px]"
            {...form.register('description')}
          />
        </div>

        {/* Timing and Source */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="prepTimeMinutes">Prep Time (minutes)</Label>
            <Input
              id="prepTimeMinutes"
              type="number"
              min="0"
              {...form.register('prepTimeMinutes', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cookTimeMinutes">Cook Time (minutes)</Label>
            <Input
              id="cookTimeMinutes"
              type="number"
              min="0"
              {...form.register('cookTimeMinutes', { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              placeholder="Cookbook, website, etc."
              {...form.register('source')}
            />
          </div>
        </div>

        {/* Source URL */}
        <div className="space-y-2">
          <Label htmlFor="sourceUrl">Source URL</Label>
          <Input
            id="sourceUrl"
            type="url"
            placeholder="https://..."
            {...form.register('sourceUrl')}
          />
          {form.formState.errors.sourceUrl && (
            <p className="text-sm text-red-500">{form.formState.errors.sourceUrl.message}</p>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            placeholder="vegetarian, quick, comfort-food"
            value={form.watch('tags')?.join(', ')}
            onChange={(e) => {
              const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
              form.setValue('tags', tags);
            }}
          />
        </div>

        {/* Ingredients */}
        <IngredientList />

        {/* Instructions */}
        <InstructionSteps />

        {/* Draft checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isDraft"
            {...form.register('isDraft')}
            className="rounded"
          />
          <Label htmlFor="isDraft">Save as draft</Label>
        </div>

        {/* Form Actions */}
        <div className="flex gap-4 pt-6">
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 md:flex-none"
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Saving...' : recipe ? 'Update Recipe' : 'Save Recipe'}
          </Button>
          
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  );
}