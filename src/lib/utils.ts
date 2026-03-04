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
  
  // Format as mixed number or simple fraction
  const fractionString = `${bestFraction.num}/${bestFraction.den}`;
  
  if (wholePart > 0) {
    return `${wholePart} ${fractionString}`;
  }
  
  return fractionString;
}