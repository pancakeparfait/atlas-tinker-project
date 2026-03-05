'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Clock, Users, Star } from 'lucide-react';
import { useRecipes, type Recipe } from '@/lib/queries/recipe-queries';
import { MEAL_CATEGORIES } from '@/components/recipes/recipe-form-schema';

export default function RecipesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);

  const { data: recipes, isLoading, error } = useRecipes();

  const filteredRecipes = recipes?.recipes?.filter((recipe: Recipe) => {
    const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || recipe.mealCategory === selectedCategory;
    const matchesDraftFilter = !showDraftsOnly || recipe.isDraft;
    
    return matchesSearch && matchesCategory && matchesDraftFilter;
  }) || [];

  const handleCreateNew = () => {
    router.push('/recipes/new');
  };

  const handleRecipeClick = (recipe: Recipe) => {
    router.push(`/recipes/${recipe.id}` as any);
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading recipes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-red-500">Error loading recipes</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Recipes</h1>
        <Button onClick={handleCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Recipe
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search recipes, ingredients, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {MEAL_CATEGORIES.map((category: any) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showDraftsOnly}
              onChange={(e) => setShowDraftsOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Show drafts only</span>
          </label>
          
          <div className="text-sm text-gray-600">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </div>
        </div>
      </div>

      {/* Recipes Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {recipes?.recipes?.length === 0 ? 'No recipes yet' : 'No recipes match your filters'}
          </div>
          {recipes?.recipes?.length === 0 && (
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Recipe
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe: Recipe) => (
            <Card
              key={recipe.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleRecipeClick(recipe)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg line-clamp-2">{recipe.title}</CardTitle>
                  {recipe.isDraft && (
                    <Badge variant="outline" className="ml-2">Draft</Badge>
                  )}
                </div>
                {recipe.personalRating && (
                  <div className="flex items-center">
                    {renderStars(recipe.personalRating)}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {recipe.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {recipe.servings} servings
                  </div>
                  
                  {(recipe.prepTimeMinutes || recipe.cookTimeMinutes) && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatTime((recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{MEAL_CATEGORIES.find((c: any) => c.value === recipe.mealCategory)?.label}</Badge>
                  {recipe.cuisineType && (
                    <Badge variant="outline">{recipe.cuisineType}</Badge>
                  )}
                </div>

                {recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {recipe.tags.slice(0, 3).map((tag: string) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {recipe.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{recipe.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}