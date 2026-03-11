import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate the greatest common divisor using Euclidean algorithm
 */
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  
  while (b !== 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  
  return a;
}

/**
 * Convert a decimal quantity to a fraction string for display
 * Examples: 0.5 → "1/2", 2.75 → "2 3/4", 0.333 → "1/3"
 */
export function formatQuantityAsFraction(quantity: number): string {
  // Handle zero
  if (quantity === 0) return '0';
  
  // Separate whole and fractional parts
  const wholePart = Math.floor(quantity);
  const fractionalPart = quantity - wholePart;
  
  // If it's a whole number, return as integer
  if (fractionalPart < 0.001) {
    return wholePart.toString();
  }
  
  // Common cooking fractions in order of frequency/preference
  // Only includes fractions that are standard in recipes
  const commonFractions = [
    { num: 1, den: 2, value: 0.5 },    // 1/2
    { num: 1, den: 3, value: 1 / 3 },  // 1/3
    { num: 2, den: 3, value: 2 / 3 },  // 2/3
    { num: 1, den: 4, value: 0.25 },   // 1/4
    { num: 3, den: 4, value: 0.75 },   // 3/4
    { num: 1, den: 8, value: 0.125 },  // 1/8
    { num: 3, den: 8, value: 0.375 },  // 3/8
  ];
  
  // Find closest common fraction with tolerance for thirds
  let bestFraction = commonFractions[0]; // Default to 1/2
  let bestDifference = Math.abs(fractionalPart - bestFraction.value);
  const tolerance = 0.01; // Tolerance for thirds
  
  for (const frac of commonFractions) {
    const difference = Math.abs(fractionalPart - frac.value);
    
    if (difference < bestDifference) {
      bestDifference = difference;
      bestFraction = frac;
    }
  }
  
  // FIRST: Check if fractionalPart is already an exact match to a common fraction
  // This prevents simple fractions (0.5, 0.25, 0.75) from being converted to compounds
  for (const frac of commonFractions) {
    if (Math.abs(fractionalPart - frac.value) < 0.001) {
      // Exact match - use simple fraction, no compound needed
      const fractionString = `${frac.num}/${frac.den}`;
      if (wholePart > 0) {
        return `${wholePart} ${fractionString}`;
      }
      return fractionString;
    }
  }
  
  // SECOND: Check for exact compound measurement (fraction + tablespoons)
  // Only reach here if no exact simple fraction match exists
  // Example: 0.625 = 1/2 (0.5) + 2 Tbsp (2 × 0.0625) exactly
  for (const frac of commonFractions) {
    const remainder = fractionalPart - frac.value;
    
    // Only consider positive remainders in the 1-3 Tbsp range
    // 1 Tbsp = 0.0625 cups (1/16), 4 Tbsp = 0.25 cups (1/4)
    if (remainder >= 0.055 && remainder <= 0.195) {
      const tbsp = Math.round(remainder / 0.0625);
      const expectedRemainder = tbsp * 0.0625;
      
      // If match is exact (within 0.01 tolerance), use compound
      if (Math.abs(remainder - expectedRemainder) < 0.01 && tbsp >= 1 && tbsp <= 3) {
        const fractionString = `${frac.num}/${frac.den}`;
        const tbspString = `${tbsp} Tbsp`;
        
        if (wholePart > 0) {
          return `${wholePart} ${fractionString} cup and ${tbspString}`;
        }
        return `${fractionString} cup and ${tbspString}`;
      }
    }
  }

  // Format as mixed number or simple fraction
  const fractionString = `${bestFraction.num}/${bestFraction.den}`;
  
  if (wholePart > 0) {
    return `${wholePart} ${fractionString}`;
  }
  
  return fractionString;
}