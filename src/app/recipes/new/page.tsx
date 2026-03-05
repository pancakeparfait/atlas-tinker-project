'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { RecipeForm } from '@/components/recipes/recipe-form';
import type { Recipe } from '@/lib/queries/recipe-queries';

export default function NewRecipePage() {
  const router = useRouter();

  const handleSuccess = (recipe: Recipe) => {
    router.push(`/recipes/${recipe.id}` as any);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Create New Recipe</h1>
        <RecipeForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </div>
  );
}