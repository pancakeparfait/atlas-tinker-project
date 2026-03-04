'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Clock, Users, Star, ChefHat, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRecipe, useDeleteRecipe } from '@/lib/queries/recipe-queries';
import { MEAL_CATEGORIES, DIFFICULTY_LEVELS } from '@/components/recipes/recipe-form-schema';
import { formatQuantityAsFraction } from '@/lib/utils';
import Image from 'next/image';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const recipeId = params.id as string;

  const { data: recipe, isLoading, error } = useRecipe(recipeId);
  const deleteRecipe = useDeleteRecipe();

  const handleBack = () => {
    router.push('/recipes');
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this recipe? This action cannot be undone.')) {
      try {
        await deleteRecipe.mutateAsync(recipeId);
        router.push('/recipes');
      } catch (error) {
        console.error('Failed to delete recipe:', error);
        alert('Failed to delete recipe. Please try again.');
      }
    }
  };

  // Decode HTML entities in text content
  const decodeHtmlEntities = (text: string | undefined | null): string => {
    if (!text) return '';
    if (typeof document === 'undefined') return text; // SSR fallback
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            data-testid={`star-${i + 1}`}
            className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        {/* Sticky toolbar skeleton */}
        <div className="sticky top-0 z-10 bg-white border-b backdrop-blur-sm bg-white/95">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          <div className="text-center py-12">
            <div className="text-lg">Loading recipe...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-10 bg-white border-b backdrop-blur-sm bg-white/95">
          <div className="container mx-auto px-6 py-4">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Recipes
            </Button>
          </div>
        </div>

        <div className="container mx-auto px-6 py-6">
          <div className="text-center py-12">
            <div className="text-lg text-red-500">
              {error ? 'Error loading recipe' : 'Recipe not found'}
            </div>
            <Button onClick={handleBack} className="mt-4">
              Return to Recipes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalTime = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);
  const categoryLabel = MEAL_CATEGORIES.find((c) => c.value === recipe.mealCategory)?.label;
  const difficultyLabel = DIFFICULTY_LEVELS.find((d) => d.value === recipe.difficultyLevel)?.label;

  return (
    <div className="min-h-screen pb-12">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b backdrop-blur-sm bg-white/95 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Recipes
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/recipes/${recipeId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteRecipe.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-6">
        {recipe.imageUrl && (
          <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-6">
            <Image
              src={`/api/recipes/${recipe.id}/image`}
              alt={recipe.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Title and Metadata */}
        <div className="mb-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{decodeHtmlEntities(recipe.title)}</h1>
              {recipe.personalRating && renderStars(recipe.personalRating)}
            </div>
            {recipe.isDraft && (
              <Badge variant="outline" className="ml-4">
                Draft
              </Badge>
            )}
          </div>

          {recipe.description && (
            <p className="text-lg text-gray-600">{decodeHtmlEntities(recipe.description)}</p>
          )}

          {/* Metadata Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <span className="font-medium">{recipe.servings}</span>
              <span className="text-gray-500">servings</span>
            </div>

            {recipe.prepTimeMinutes && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <span className="text-gray-500">Prep:</span>
                <span className="font-medium">{formatTime(recipe.prepTimeMinutes)}</span>
              </div>
            )}

            {recipe.cookTimeMinutes && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <span className="text-gray-500">Cook:</span>
                <span className="font-medium">{formatTime(recipe.cookTimeMinutes)}</span>
              </div>
            )}

            {totalTime > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <span className="text-gray-500">Total:</span>
                <span className="font-medium">{formatTime(totalTime)}</span>
              </div>
            )}

            {difficultyLabel && (
              <div className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-gray-500" />
                <span className="font-medium">{difficultyLabel}</span>
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {categoryLabel && (
              <Badge variant="secondary" className="text-sm">
                {categoryLabel}
              </Badge>
            )}
            {recipe.cuisineType && (
              <Badge variant="outline" className="text-sm">
                {decodeHtmlEntities(recipe.cuisineType)}
              </Badge>
            )}
          </div>
        </div>

        {/* Main Content Grid - Ingredients and Instructions */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 mb-6">
          {/* Ingredients Section */}
          <Card>
            <CardHeader>
              <CardTitle>Ingredients</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <ul className="space-y-3">
                  {recipe.ingredients.map((item, index) => (
                    <li key={item.id || index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                      <div className="flex-1">
                        <div className="font-medium">
                          {item.quantity > 0 && (
                            <>{formatQuantityAsFraction(item.quantity)} </>
                          )}
                          {item.unit} {decodeHtmlEntities(item.ingredient.name)}
                          {item.isOptional && (
                            <span className="text-sm text-gray-500 ml-2">(optional)</span>
                          )}
                        </div>
                        {item.preparationNote && (
                          <div className="text-sm text-gray-600 mt-1">
                            {decodeHtmlEntities(item.preparationNote)}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">No ingredients listed</p>
              )}
            </CardContent>
          </Card>

          {/* Instructions Section */}
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              {recipe.instructions && recipe.instructions.length > 0 ? (
                <ol className="space-y-4">
                  {recipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-gray-700 leading-relaxed">{decodeHtmlEntities(instruction)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-gray-500 text-center py-4">No instructions provided</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer Section - Tags, Source, etc. */}
        <div className="space-y-4">
          {recipe.tags && recipe.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recipe.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {decodeHtmlEntities(tag)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(recipe.source || recipe.sourceUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Source</CardTitle>
              </CardHeader>
              <CardContent>
                {recipe.sourceUrl ? (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    {decodeHtmlEntities(recipe.source) || recipe.sourceUrl}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <p>{decodeHtmlEntities(recipe.source)}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
