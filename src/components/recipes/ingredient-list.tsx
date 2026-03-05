'use client';

import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { COMMON_UNITS, type RecipeFormData } from './recipe-form-schema';

export function IngredientList() {
  const { control, register, formState: { errors }, setValue, watch } = useFormContext<RecipeFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ingredients',
  });

  const addIngredient = () => {
    append({
      name: '',
      quantity: 1,
      unit: 'cup',
      preparationNote: '',
      isOptional: false,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Ingredients</Label>
        <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
          <Plus className="h-4 w-4 mr-2" />
          Add Ingredient
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
            <div className="col-span-2">
              <Input
                placeholder="Amount"
                type="number"
                step="0.001"
                min="0"
                {...register(`ingredients.${index}.quantity`, {
                  valueAsNumber: true,
                })}
              />
              {errors.ingredients?.[index]?.quantity && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.ingredients[index]?.quantity?.message}
                </p>
              )}
            </div>

            <div className="col-span-2">
              <Select
                value={watch(`ingredients.${index}.unit`)}
                onValueChange={(value) => setValue(`ingredients.${index}.unit`, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.ingredients?.[index]?.unit && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.ingredients[index]?.unit?.message}
                </p>
              )}
            </div>

            <div className="col-span-4">
              <Input
                placeholder="Ingredient name"
                {...register(`ingredients.${index}.name`)}
              />
              {errors.ingredients?.[index]?.name && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.ingredients[index]?.name?.message}
                </p>
              )}
            </div>

            <div className="col-span-3">
              <Input
                placeholder="Preparation (optional)"
                {...register(`ingredients.${index}.preparationNote`)}
              />
            </div>

            <div className="col-span-1 flex items-center justify-center">
              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  {...register(`ingredients.${index}.isOptional`)}
                  className="rounded"
                />
                <span className="text-xs">Opt.</span>
              </label>
            </div>

            {fields.length > 1 && (
              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {errors.ingredients?.message && (
        <p className="text-sm text-red-500">{errors.ingredients.message}</p>
      )}
    </div>
  );
}