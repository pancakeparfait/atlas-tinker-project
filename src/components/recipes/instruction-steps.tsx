'use client';

import React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { type RecipeFormData } from './recipe-form-schema';

export function InstructionSteps() {
  const { control, register, formState: { errors } } = useFormContext<RecipeFormData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'instructions' as any,
  });

  const addInstruction = () => {
    append('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Instructions</Label>
        <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
          <Plus className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </div>
            
            <div className="flex-1">
              <Textarea
                placeholder={`Step ${index + 1} instructions...`}
                className="min-h-[80px]"
                {...register(`instructions.${index}`)}
              />
              {errors.instructions?.[index] && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.instructions[index]?.message}
                </p>
              )}
            </div>

            {fields.length > 1 && (
              <div className="flex-shrink-0">
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

      {errors.instructions?.message && (
        <p className="text-sm text-red-500">{errors.instructions.message}</p>
      )}
    </div>
  );
}