import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MealType } from '@prisma/client'

export interface MealPlan {
  id: string
  name: string
  startDate: string
  endDate: string
  budgetLimit: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface RecipeSummary {
  id: string
  title: string
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  difficultyLevel: string
}

export interface PlannedMeal {
  id: string
  mealPlanId: string
  recipeId: string | null
  mealDate: string
  mealType: MealType
  servingsPlanned: number
  notes: string | null
}

export interface PlannedMealWithRecipe extends PlannedMeal {
  recipe: RecipeSummary | null
}

export interface CreateMealPlanInput {
  name: string
  startDate: string
  endDate: string
  notes?: string
  budgetLimit?: number
}

export interface UpdateMealPlanInput {
  name?: string
  notes?: string | null
  budgetLimit?: number | null
}

export interface CreatePlannedMealInput {
  mealPlanId: string
  recipeId: string | null
  mealDate: string
  mealType: MealType
  servingsPlanned: number
  notes?: string
}

// Query keys — distinct prefixes for plans vs. meal-range queries
export const mealPlanKeys = {
  all: ['mealPlans'] as const,
  list: () => [...mealPlanKeys.all, 'list'] as const,
  detail: (id: string) => [...mealPlanKeys.all, 'detail', id] as const,
  // Meal-range queries keyed by plan id; invalidate the whole prefix after
  // planned-meal mutations so any date window is refreshed.
  meals: (planId: string) => [...mealPlanKeys.all, 'meals', planId] as const,
  mealsRange: (planId: string, start: string, end: string) =>
    [...mealPlanKeys.meals(planId), start, end] as const,
}

const API_BASE = '/api/meal-plans'

async function fetchMealPlans(): Promise<MealPlan[]> {
  const response = await fetch(API_BASE)
  if (!response.ok) {
    throw new Error('Failed to fetch meal plans')
  }
  return response.json()
}

async function fetchMealPlan(id: string): Promise<MealPlan> {
  const response = await fetch(`${API_BASE}/${id}`)
  if (!response.ok) {
    throw new Error('Failed to fetch meal plan')
  }
  return response.json()
}

async function fetchPlannedMeals(
  planId: string,
  start: string,
  end: string,
): Promise<PlannedMealWithRecipe[]> {
  const params = new URLSearchParams({ start, end })
  const response = await fetch(`${API_BASE}/${planId}/meals?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch planned meals')
  }
  return response.json()
}

async function createMealPlan(data: CreateMealPlanInput): Promise<MealPlan> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error('Failed to create meal plan')
  }
  return response.json()
}

async function updateMealPlan(
  id: string,
  data: UpdateMealPlanInput,
): Promise<MealPlan> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error('Failed to update meal plan')
  }
  return response.json()
}

async function deleteMealPlan(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Failed to delete meal plan')
  }
}

async function createPlannedMeal(
  data: CreatePlannedMealInput,
): Promise<PlannedMealWithRecipe> {
  const response = await fetch('/api/planned-meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error('Failed to create planned meal')
  }
  return response.json()
}

async function deletePlannedMeal(id: string): Promise<void> {
  const response = await fetch(`/api/planned-meals/${id}`, { method: 'DELETE' })
  if (!response.ok) {
    throw new Error('Failed to delete planned meal')
  }
}
// Hooks
export function useMealPlans() {
  return useQuery({
    queryKey: mealPlanKeys.list(),
    queryFn: fetchMealPlans,
  })
}

export function useMealPlan(id: string) {
  return useQuery({
    queryKey: mealPlanKeys.detail(id),
    queryFn: () => fetchMealPlan(id),
    enabled: !!id,
  })
}

export function usePlannedMeals(planId: string, start: string, end: string) {
  const enabled = !!planId && !!start && !!end
  return useQuery({
    queryKey: mealPlanKeys.mealsRange(planId, start, end),
    queryFn: () => fetchPlannedMeals(planId, start, end),
    enabled,
  })
}

export function useCreateMealPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createMealPlan,
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.list() })
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.detail(plan.id) })
    },
  })
}

export function useUpdateMealPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMealPlanInput }) =>
      updateMealPlan(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.list() })
    },
  })
}

export function useDeleteMealPlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMealPlan,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.list() })
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: mealPlanKeys.meals(id) })
    },
  })
}

export function useCreatePlannedMeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPlannedMeal,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: mealPlanKeys.meals(variables.mealPlanId),
      })
    },
  })
}

export function useDeletePlannedMeal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, mealPlanId }: { id: string; mealPlanId: string }) =>
      deletePlannedMeal(id),
    onSuccess: (_, { mealPlanId }) => {
      queryClient.invalidateQueries({
        queryKey: mealPlanKeys.meals(mealPlanId),
      })
    },
  })
}
