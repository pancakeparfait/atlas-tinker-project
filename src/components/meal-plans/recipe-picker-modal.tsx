'use client'

import React, { useState } from 'react'
import type { MealCategory, MealType } from '@prisma/client'
import { format, parse } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MEAL_CATEGORIES } from '@/components/recipes/recipe-form-schema'
import { MEAL_TYPE_LABELS } from '@/components/meal-plans/meal-constants'
import { cn } from '@/lib/utils'
import {
  useRecipes,
  type RecipeListItem,
} from '@/lib/queries/recipe-queries'
import { Search } from 'lucide-react'

export interface RecipePickerSelection {
  recipeIds: string[]
  note: string
}

export interface RecipePickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mealDate: string
  mealType: MealType
  existingNote?: string
  assignedRecipeIds?: string[]
  onSubmit: (selection: RecipePickerSelection) => void | Promise<void>
  isSaving?: boolean
}

export function RecipePickerModal({
  open,
  onOpenChange,
  mealDate,
  mealType,
  existingNote = '',
  assignedRecipeIds = [],
  onSubmit,
  isSaving = false,
}: RecipePickerModalProps): React.JSX.Element {
  const existingRecipeIds = new Set(assignedRecipeIds)

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [note, setNote] = useState(existingNote)

  const recipesQuery = useRecipes({
    q: search.trim() || undefined,
    category: category === 'all' ? undefined : (category as MealCategory),
    limit: 50,
  })

  const recipes = recipesQuery.data?.recipes ?? []
  const trimmedNote = note.trim()
  const noteChanged = trimmedNote !== existingNote.trim()
  const canSubmit =
    !isSaving && (selectedIds.length > 0 || noteChanged)

  const toggleRecipe = (recipeId: string) => {
    setSelectedIds((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    )
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({ recipeIds: selectedIds, note: trimmedNote })
  }

  const formattedDate = format(
    parse(mealDate, 'yyyy-MM-dd', new Date()),
    'EEEE, MMM d'
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add to {MEAL_TYPE_LABELS[mealType]}
          </DialogTitle>
          <DialogDescription>
            {formattedDate} · Select one or more recipes or add a note.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <Input
                aria-label="Search recipes"
                placeholder="Search recipes or tags..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                aria-label="Filter by category"
                className="w-full sm:w-44"
              >
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {MEAL_CATEGORIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="max-h-64 overflow-y-auto rounded-md border"
            aria-live="polite"
          >
            {recipesQuery.isLoading && (
              <p className="p-4 text-sm text-muted-foreground">
                Loading recipes...
              </p>
            )}
            {recipesQuery.error && (
              <p role="alert" className="p-4 text-sm text-red-500">
                Could not load recipes.
              </p>
            )}
            {!recipesQuery.isLoading && !recipesQuery.error && (
              <ul className="divide-y">
                {recipes.length === 0 && (
                  <li className="p-4 text-sm text-muted-foreground">
                    No recipes found.
                  </li>
                )}
                {recipes.map((recipe: RecipeListItem) => {
                  const alreadyAdded = existingRecipeIds.has(recipe.id)
                  const checked =
                    alreadyAdded || selectedIds.includes(recipe.id)
                  return (
                    <li key={recipe.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-3 py-2 text-sm',
                          alreadyAdded && 'cursor-not-allowed opacity-60'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={alreadyAdded}
                          onChange={() => toggleRecipe(recipe.id)}
                        />
                        <span className="flex-1">{recipe.title}</span>
                        {alreadyAdded && (
                          <span className="text-xs text-muted-foreground">
                            Added
                          </span>
                        )}
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="recipe-picker-note"
              className="text-sm font-medium"
            >
              Note
            </label>
            <Textarea
              id="recipe-picker-note"
              placeholder="Optional note, e.g. leftovers or takeout"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSaving ? 'Saving...' : 'Add to meal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
