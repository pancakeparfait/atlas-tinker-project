'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RecipeForm } from '@/components/recipes/recipe-form';
import { useRecipe } from '@/lib/queries/recipe-queries';
import type { Recipe } from '@/lib/queries/recipe-queries';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as string;

  const { data: recipe, isLoading, error } = useRecipe(recipeId);

  const handleSuccess = (updatedRecipe: Recipe) => {
    router.push(`/recipes/${updatedRecipe.id}`);
  };

  const handleCancel = () => {
    router.push(`/recipes/${recipeId}`);
  };

  const handleBack = () => {
    router.push('/recipes');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={handleBack} disabled>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Recipes
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-6">Edit Recipe</h1>
          <div className="flex items-center justify-center py-12">
            <div className="text-lg text-gray-500">Loading recipe...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container mx-auto py-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Recipes
            </Button>
          </div>
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error ? 'Error Loading Recipe' : 'Recipe Not Found'}
            </h2>
            <p className="text-gray-600 mb-6">
              {error
                ? 'There was an error loading the recipe. Please try again.'
                : 'The recipe you are trying to edit could not be found.'}
            </p>
            <Button onClick={handleBack}>Return to Recipes</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Recipes
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-6">Edit Recipe</h1>
        <RecipeForm recipe={recipe} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}
