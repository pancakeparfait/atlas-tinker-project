'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface WeekNavigationProps {
  onPrevious: () => void
  onNext: () => void
  onToday: () => void
}

export function WeekNavigation({
  onPrevious,
  onNext,
  onToday,
}: WeekNavigationProps): React.JSX.Element {
  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Week navigation"
    >
      <Button type="button" variant="outline" onClick={onPrevious}>
        <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
        Prev
      </Button>
      <Button type="button" variant="outline" onClick={onToday}>
        Today
      </Button>
      <Button type="button" variant="outline" onClick={onNext}>
        Next
        <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
      </Button>
    </div>
  )
}
