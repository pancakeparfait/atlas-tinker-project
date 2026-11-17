/**
 * @jest-environment jsdom
 */
import React from 'react'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  mealPlanKeys,
  useMealPlans,
  useMealPlan,
  usePlannedMeals,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
  useCreatePlannedMeal,
  useUpdatePlannedMeal,
  useDeletePlannedMeal,
} from '../meal-plan-queries'

const fetchMock = jest.fn()
beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => [],
  })
  ;(global as any).fetch = fetchMock
})

function makeWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    )
  }
}

function freshClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
}

describe('meal-plan-queries', () => {
  describe('fetch URL + method', () => {
    it('useMealPlans GETs /api/meal-plans', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ id: 'p1' }]),
      })
      const qc = freshClient()
      const { result } = renderHook(() => useMealPlans(), {
        wrapper: makeWrapper(qc),
      })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/meal-plans')
      expect(['GET', undefined]).toContain(init?.method)
    })

    it('useMealPlan GETs /api/meal-plans/:id', async () => {
      const qc = freshClient()
      renderHook(() => useMealPlan('p1'), { wrapper: makeWrapper(qc) })
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      expect(fetchMock.mock.calls[0][0]).toBe('/api/meal-plans/p1')
    })

    it('usePlannedMeals GETs /api/meal-plans/:id/meals?start&end', async () => {
      const qc = freshClient()
      renderHook(() => usePlannedMeals('p1', '2026-09-01', '2026-09-07'), {
        wrapper: makeWrapper(qc),
      })
      await waitFor(() => expect(fetchMock).toHaveBeenCalled())
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(
        '/api/meal-plans/p1/meals?start=2026-09-01&end=2026-09-07',
      )
      expect(init?.method).toBeUndefined()
    })

    it('usePlannedMeals is disabled until both dates present', async () => {
      const qc = freshClient()
      const { result } = renderHook(
        () => usePlannedMeals('p1', '', '2026-09-07'),
        { wrapper: makeWrapper(qc) },
      )
      expect(result.current.isFetching).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('useCreateMealPlan POSTs JSON body to /api/meal-plans', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1' }) })
      const qc = freshClient()
      const { result } = renderHook(() => useCreateMealPlan(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({
          name: 'Weekly',
          startDate: '2026-09-01',
          endDate: '2026-09-07',
        })
      })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/meal-plans')
      expect(init.method).toBe('POST')
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(init.body).toBe(
        JSON.stringify({
          name: 'Weekly',
          startDate: '2026-09-01',
          endDate: '2026-09-07',
        }),
      )
    })

    it('useUpdateMealPlan PUTs to /api/meal-plans/:id', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1' }) })
      const qc = freshClient()
      const { result } = renderHook(() => useUpdateMealPlan(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({ id: 'p1', data: { name: 'X' } })
      })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/meal-plans/p1')
      expect(init.method).toBe('PUT')
      expect(init.body).toBe(JSON.stringify({ name: 'X' }))
    })

    it('useDeleteMealPlan DELETEs /api/meal-plans/:id', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const qc = freshClient()
      const { result } = renderHook(() => useDeleteMealPlan(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync('p1')
      })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/meal-plans/p1')
      expect(init.method).toBe('DELETE')
    })

    it('useCreatePlannedMeal POSTs to /api/planned-meals', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'pm1' }) })
      const qc = freshClient()
      const { result } = renderHook(() => useCreatePlannedMeal(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({
          mealPlanId: 'p1',
          recipeId: 'r1',
          mealDate: '2026-09-01',
          mealType: 'DINNER',
          servingsPlanned: 4,
        })
      })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/planned-meals')
      expect(init.method).toBe('POST')
      expect(init.body).toBe(
        JSON.stringify({
          mealPlanId: 'p1',
          recipeId: 'r1',
          mealDate: '2026-09-01',
          mealType: 'DINNER',
          servingsPlanned: 4,
        }),
      )
    })

    it('useUpdatePlannedMeal PUTs to /api/planned-meals/:id', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'pm1' }),
      })
      const qc = freshClient()
      const { result } = renderHook(() => useUpdatePlannedMeal(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({
          id: 'pm1',
          mealPlanId: 'p1',
          data: { notes: 'new note' },
        })
      })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/planned-meals/pm1')
      expect(init.method).toBe('PUT')
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(init.body).toBe(JSON.stringify({ notes: 'new note' }))
    })

    it('useDeletePlannedMeal DELETEs /api/planned-meals/:id', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const qc = freshClient()
      const { result } = renderHook(() => useDeletePlannedMeal(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({ id: 'pm1', mealPlanId: 'p1' })
      })
      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe('/api/planned-meals/pm1')
      expect(init.method).toBe('DELETE')
    })
  })

  describe('query invalidation', () => {
    it('useCreateMealPlan invalidates planList and the new plan detail', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'p1' }),
      })
      const qc = freshClient()
      const spy = jest.spyOn(qc, 'invalidateQueries')
      const { result } = renderHook(() => useCreateMealPlan(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({
          name: 'X',
          startDate: '2026-09-01',
          endDate: '2026-09-07',
        })
      })
      await waitFor(() => expect(spy).toHaveBeenCalled())
      const calls = spy.mock.calls.map((c) => c[0]?.queryKey)
      expect(calls).toContainEqual(mealPlanKeys.list())
      expect(calls).toContainEqual(mealPlanKeys.detail('p1'))
    })

    it('useDeleteMealPlan invalidates planList, planDetail, and the meal prefix', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const qc = freshClient()
      const spy = jest.spyOn(qc, 'invalidateQueries')
      const { result } = renderHook(() => useDeleteMealPlan(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync('p1')
      })
      await waitFor(() => spy.mock.calls.length >= 3)
      const calls = spy.mock.calls.map((c) => c[0]?.queryKey)
      expect(calls).toContainEqual(mealPlanKeys.list())
      expect(calls).toContainEqual(mealPlanKeys.detail('p1'))
      // deleting a plan orphans its ranges, so the meal prefix is refreshed too
      expect(calls).toContainEqual(mealPlanKeys.meals('p1'))
    })

    it('useUpdateMealPlan invalidates planDetail and planList', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'p1' }) })
      const qc = freshClient()
      const spy = jest.spyOn(qc, 'invalidateQueries')
      const { result } = renderHook(() => useUpdateMealPlan(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({ id: 'p1', data: { name: 'X' } })
      })
      await waitFor(() => spy.mock.calls.length >= 2)
      const calls = spy.mock.calls.map((c) => c[0]?.queryKey)
      expect(calls).toContainEqual(mealPlanKeys.detail('p1'))
      expect(calls).toContainEqual(mealPlanKeys.list())
    })

    it('useCreatePlannedMeal invalidates the meal-range prefix for the plan', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'pm1' }) })
      const qc = freshClient()
      const spy = jest.spyOn(qc, 'invalidateQueries')
      const { result } = renderHook(() => useCreatePlannedMeal(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({
          mealPlanId: 'p1',
          recipeId: 'r1',
          mealDate: '2026-09-01',
          mealType: 'DINNER',
          servingsPlanned: 4,
        })
      })
      await waitFor(() => expect(spy).toHaveBeenCalled())
      const calls = spy.mock.calls.map((c) => c[0]?.queryKey)
      // prefix key, not exact range key — any date window refreshes
      expect(calls).toContainEqual(mealPlanKeys.meals('p1'))
    })

    it('useUpdatePlannedMeal invalidates the meal-range prefix via mealPlanId variable', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'pm1' }),
      })
      const qc = freshClient()
      const spy = jest.spyOn(qc, 'invalidateQueries')
      const { result } = renderHook(() => useUpdatePlannedMeal(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({
          id: 'pm1',
          mealPlanId: 'p1',
          data: { notes: 'new note' },
        })
      })
      await waitFor(() => expect(spy).toHaveBeenCalled())
      const calls = spy.mock.calls.map((c) => c[0]?.queryKey)
      expect(calls).toContainEqual(mealPlanKeys.meals('p1'))
    })

    it('useDeletePlannedMeal invalidates the meal-range prefix via mealPlanId variable', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      const qc = freshClient()
      const spy = jest.spyOn(qc, 'invalidateQueries')
      const { result } = renderHook(() => useDeletePlannedMeal(), {
        wrapper: makeWrapper(qc),
      })
      await act(async () => {
        await result.current.mutateAsync({ id: 'pm1', mealPlanId: 'p1' })
      })
      await waitFor(() => expect(spy).toHaveBeenCalled())
      const calls = spy.mock.calls.map((c) => c[0]?.queryKey)
      expect(calls).toContainEqual(mealPlanKeys.meals('p1'))
    })
  })

  describe('non-OK responses reject with verb-specific errors', () => {
    it('useCreateMealPlan rejects with "Failed to create meal plan"', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })
      const qc = freshClient()
      const { result } = renderHook(() => useCreateMealPlan(), {
        wrapper: makeWrapper(qc),
      })
      await expect(
        result.current.mutateAsync({
          name: 'X',
          startDate: '2026-09-01',
          endDate: '2026-09-07',
        }),
      ).rejects.toThrow(/Failed to create meal plan/)
    })

    it('useCreatePlannedMeal rejects with "Failed to create planned meal"', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })
      const qc = freshClient()
      const { result } = renderHook(() => useCreatePlannedMeal(), {
        wrapper: makeWrapper(qc),
      })
      await expect(
        result.current.mutateAsync({
          mealPlanId: 'p1',
          recipeId: null,
          mealDate: '2026-09-01',
          mealType: 'DINNER',
          servingsPlanned: 0,
          notes: 'x',
        }),
      ).rejects.toThrow(/Failed to create planned meal/)
    })
  })

  describe('key factory', () => {
    it('uses distinct prefixes for plans vs meal-range and composes prefix/range', () => {
      expect(mealPlanKeys.list()).toEqual(['mealPlans', 'list'])
      expect(mealPlanKeys.detail('p1')).toEqual(['mealPlans', 'detail', 'p1'])
      expect(mealPlanKeys.meals('p1')).toEqual(['mealPlans', 'meals', 'p1'])
      expect(mealPlanKeys.mealsRange('p1', '2026-09-01', '2026-09-07')).toEqual([
        'mealPlans',
        'meals',
        'p1',
        '2026-09-01',
        '2026-09-07',
      ])
      // the range key is gated under the prefix key
      expect(mealPlanKeys.mealsRange('p1', 'a', 'b')[0]).toBe(
        mealPlanKeys.meals('p1')[0],
      )
    })
  })
})
