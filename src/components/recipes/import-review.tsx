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
import { type ImportResult } from '@/lib/queries/import-queries';
import { CheckCircle, AlertCircle, XCircle, Edit, Check, X } from 'lucide-react';
import { formatQuantityAsFraction } from '@/lib/utils';
import { MealCategory, DifficultyLevel } from '@prisma/client';

interface ImportReviewProps {
  importResult: ImportResult;
  onAccept: (data: RecipeFormData) => void;
  onCancel: () => void;
}

function getConfidenceIcon(confidence: 'high' | 'medium' | 'low', success: boolean) {
  if (!success) return <XCircle className="h-4 w-4 text-red-500" />;
  
  switch (confidence) {
    case 'high':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'medium':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'low':
      return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function getConfidenceColor(confidence: 'high' | 'medium' | 'low', success: boolean) {
  if (!success) return 'border-red-200 bg-red-50';
  
  switch (confidence) {
    case 'high':
      return 'border-green-200 bg-green-50';
    case 'medium':
      return 'border-yellow-200 bg-yellow-50';
    case 'low':
      return 'border-red-200 bg-red-50';
  }
}

export function ImportReview({ importResult, onAccept, onCancel }: ImportReviewProps) {
  const [editingFields, setEditingFields] = useState<Set<string>>(new Set());
  
  const form = useForm<RecipeFormData>({
    resolver: zodResolver(RecipeSchema),
    defaultValues: {
      title: importResult.importedRecipe?.title || '',
      description: importResult.importedRecipe?.description || '',
      cuisineType: importResult.importedRecipe?.cuisineType || '',
      mealCategory: importResult.suggestions?.mealCategory || ('DINNER' as MealCategory),
      prepTimeMinutes: importResult.importedRecipe?.prepTimeMinutes || importResult.suggestions?.prepTimeMinutes,
      cookTimeMinutes: importResult.importedRecipe?.cookTimeMinutes || importResult.suggestions?.cookTimeMinutes,
      servings: importResult.importedRecipe?.servings || importResult.suggestions?.servings || 4,
      difficultyLevel: importResult.suggestions?.difficultyLevel || ('MEDIUM' as DifficultyLevel),
      instructions: importResult.importedRecipe?.instructions || [],
      source: importResult.source,
      sourceUrl: importResult.source,
      personalRating: undefined,
      tags: [],
      isDraft: !importResult.confidence.requiredFieldsComplete,
      ingredients: (importResult.importedRecipe?.ingredients || []).map((ing: any) => ({
        name: ing.name,
        quantity: ing.quantity || 1,
        unit: ing.unit || 'cup',
        preparationNote: '',
        isOptional: false,
      })),
    },
  });

  const toggleEdit = (field: string) => {
    const newEditing = new Set(editingFields);
    if (newEditing.has(field)) {
      newEditing.delete(field);
    } else {
      newEditing.add(field);
    }
    setEditingFields(newEditing);
  };

  const getFieldStatus = (field: string) => {
    return importResult.importStatus.find(s => s.field === field);
  };

  const handleAccept = () => {
    const data = form.getValues();
    onAccept(data);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-2">Review Imported Recipe</h2>
        <p className="text-sm text-gray-600 mb-4">
          Recipe imported from: <span className="font-medium">{importResult.source}</span>
        </p>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Confidence:</span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              importResult.confidence.overall === 'high' ? 'bg-green-100 text-green-800' :
              importResult.confidence.overall === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {importResult.confidence.overall.toUpperCase()}
            </span>
          </div>
          
          {importResult.confidence.fieldsNeedingReview.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-700">
                {importResult.confidence.fieldsNeedingReview.length} fields need review
              </span>
            </div>
          )}
        </div>
      </div>

      <FormProvider {...form}>
        <div className="space-y-6">
          {/* Title */}
          <div className={`p-4 rounded-lg border-2 ${getConfidenceColor(
            getFieldStatus('title')?.confidence || 'low',
            getFieldStatus('title')?.success || false
          )}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Label className="font-medium">Title</Label>
                {getConfidenceIcon(
                  getFieldStatus('title')?.confidence || 'low',
                  getFieldStatus('title')?.success || false
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleEdit('title')}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            
            {editingFields.has('title') ? (
              <Input {...form.register('title')} />
            ) : (
              <p className="text-gray-900">{form.watch('title') || 'No title found'}</p>
            )}
          </div>

          {/* Description */}
          <div className={`p-4 rounded-lg border-2 ${getConfidenceColor(
            getFieldStatus('description')?.confidence || 'low',
            getFieldStatus('description')?.success || false
          )}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Label className="font-medium">Description</Label>
                {getConfidenceIcon(
                  getFieldStatus('description')?.confidence || 'low',
                  getFieldStatus('description')?.success || false
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleEdit('description')}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            
            {editingFields.has('description') ? (
              <Textarea {...form.register('description')} className="min-h-[100px]" />
            ) : (
              <p className="text-gray-900">{form.watch('description') || 'No description found'}</p>
            )}
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Servings</Label>
              <Input
                type="number"
                min="1"
                {...form.register('servings', { valueAsNumber: true })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Prep Time (min)</Label>
              <Input
                type="number"
                min="0"
                {...form.register('prepTimeMinutes', { valueAsNumber: true })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Cook Time (min)</Label>
              <Input
                type="number"
                min="0"
                {...form.register('cookTimeMinutes', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Category and Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Meal Category</Label>
              <Select
                value={form.watch('mealCategory')}
                onValueChange={(value) => form.setValue('mealCategory', value as MealCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
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
              <Label>Difficulty Level</Label>
              <Select
                value={form.watch('difficultyLevel')}
                onValueChange={(value) => form.setValue('difficultyLevel', value as DifficultyLevel)}
              >
                <SelectTrigger>
                  <SelectValue />
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
          </div>

          {/* Ingredients */}
          <div className={`p-4 rounded-lg border-2 ${getConfidenceColor(
            getFieldStatus('ingredients')?.confidence || 'low',
            getFieldStatus('ingredients')?.success || false
          )}`}>
            <div className="flex items-center gap-2 mb-4">
              <Label className="font-medium text-lg">Ingredients</Label>
              {getConfidenceIcon(
                getFieldStatus('ingredients')?.confidence || 'low',
                getFieldStatus('ingredients')?.success || false
              )}
            </div>
            
            {/* Preview of imported ingredients with fractions */}
            {importResult.importedRecipe?.ingredients && importResult.importedRecipe.ingredients.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Imported ingredients:</p>
                <ul className="text-sm space-y-1">
                  {importResult.importedRecipe.ingredients.map((ing: any, idx: number) => (
                    <li key={idx} className="text-gray-700">
                      <span className="font-medium">{formatQuantityAsFraction(parseFloat(ing.quantity) || 1)}</span> {ing.unit || 'unit'} {ing.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <IngredientList />
            <IngredientList />
          </div>

          {/* Instructions */}
          <div className={`p-4 rounded-lg border-2 ${getConfidenceColor(
            getFieldStatus('instructions')?.confidence || 'low',
            getFieldStatus('instructions')?.success || false
          )}`}>
            <div className="flex items-center gap-2 mb-4">
              <Label className="font-medium text-lg">Instructions</Label>
              {getConfidenceIcon(
                getFieldStatus('instructions')?.confidence || 'low',
                getFieldStatus('instructions')?.success || false
              )}
            </div>
            <InstructionSteps />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <Button onClick={handleAccept} className="flex-1">
              <Check className="h-4 w-4 mr-2" />
              Accept & Continue Editing
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel Import
            </Button>
          </div>
        </div>
      </FormProvider>
    </div>
  );
}