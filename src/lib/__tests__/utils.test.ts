import { gcd, formatQuantityAsFraction } from '../utils';

describe('gcd', () => {
  it('should calculate GCD of 8 and 4', () => {
    expect(gcd(8, 4)).toBe(4);
  });

  it('should calculate GCD of 6 and 9', () => {
    expect(gcd(6, 9)).toBe(3);
  });

  it('should calculate GCD of 7 and 3', () => {
    expect(gcd(7, 3)).toBe(1);
  });

  it('should handle zero as one argument', () => {
    expect(gcd(0, 5)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(gcd(-8, 4)).toBe(4);
    expect(gcd(8, -4)).toBe(4);
    expect(gcd(-8, -4)).toBe(4);
  });
});

describe('formatQuantityAsFraction', () => {
  describe('whole numbers', () => {
    it('should format 1 as "1"', () => {
      expect(formatQuantityAsFraction(1)).toBe('1');
    });

    it('should format 2.0 as "2"', () => {
      expect(formatQuantityAsFraction(2.0)).toBe('2');
    });

    it('should format 10 as "10"', () => {
      expect(formatQuantityAsFraction(10)).toBe('10');
    });
  });

  describe('halves', () => {
    it('should format 0.5 as "1/2"', () => {
      expect(formatQuantityAsFraction(0.5)).toBe('1/2');
    });

    it('should format 1.5 as "1 1/2"', () => {
      expect(formatQuantityAsFraction(1.5)).toBe('1 1/2');
    });

    it('should format 2.5 as "2 1/2"', () => {
      expect(formatQuantityAsFraction(2.5)).toBe('2 1/2');
    });
  });

  describe('quarters', () => {
    it('should format 0.25 as "1/4"', () => {
      expect(formatQuantityAsFraction(0.25)).toBe('1/4');
    });

    it('should format 0.75 as "3/4"', () => {
      expect(formatQuantityAsFraction(0.75)).toBe('3/4');
    });

    it('should format 2.25 as "2 1/4"', () => {
      expect(formatQuantityAsFraction(2.25)).toBe('2 1/4');
    });

    it('should format 2.75 as "2 3/4"', () => {
      expect(formatQuantityAsFraction(2.75)).toBe('2 3/4');
    });
  });

  describe('eighths', () => {
    it('should format 0.125 as "1/8"', () => {
      expect(formatQuantityAsFraction(0.125)).toBe('1/8');
    });

    it('should format 0.375 as "3/8"', () => {
      expect(formatQuantityAsFraction(0.375)).toBe('3/8');
    });

    it('should format 0.625 as compound measurement "1/2 cup and 2 Tbsp"', () => {
      // 0.625 = 1/2 (0.5) + 2 Tbsp (2 × 0.0625) exactly
      // Compound measurement is more precise than approximating to 2/3
      expect(formatQuantityAsFraction(0.625)).toBe('1/2 cup and 2 Tbsp');
    });

    it('should format 0.875 as compound measurement "3/4 cup and 2 Tbsp"', () => {
      // 0.875 = 3/4 (0.75) + 2 Tbsp (2 × 0.0625) exactly
      // Compound measurement is exact
      expect(formatQuantityAsFraction(0.875)).toBe('3/4 cup and 2 Tbsp');
    });

    it('should format 2.625 as "2 1/2 cup and 2 Tbsp"', () => {
      // 2.625 = 2 + 1/2 (0.5) + 2 Tbsp (2 × 0.0625) exactly
      expect(formatQuantityAsFraction(2.625)).toBe('2 1/2 cup and 2 Tbsp');
    });
  });

  describe('thirds (tolerance-based)', () => {
    it('should format 0.333 as "1/3"', () => {
      expect(formatQuantityAsFraction(0.333)).toBe('1/3');
    });

    it('should format 0.3333333 as "1/3"', () => {
      expect(formatQuantityAsFraction(0.3333333)).toBe('1/3');
    });

    it('should format 0.667 as "2/3"', () => {
      expect(formatQuantityAsFraction(0.667)).toBe('2/3');
    });

    it('should format 0.6666667 as "2/3"', () => {
      expect(formatQuantityAsFraction(0.6666667)).toBe('2/3');
    });

    it('should format 1.333 as "1 1/3"', () => {
      expect(formatQuantityAsFraction(1.333)).toBe('1 1/3');
    });

    it('should format 1.667 as "1 2/3"', () => {
      expect(formatQuantityAsFraction(1.667)).toBe('1 2/3');
    });
  });

  describe('edge cases', () => {
    it('should format 0 as "0"', () => {
      expect(formatQuantityAsFraction(0)).toBe('0');
    });

    it('should format 15.5 as "15 1/2"', () => {
      expect(formatQuantityAsFraction(15.5)).toBe('15 1/2');
    });

    it('should format 100 as "100"', () => {
      expect(formatQuantityAsFraction(100)).toBe('100');
    });
  });

  describe('fraction reduction', () => {
    it('should reduce 0.5 to "1/2" not "4/8"', () => {
      // 0.5 should match exactly with 1/2, 2/4, 4/8
      // After reduction, should be "1/2"
      expect(formatQuantityAsFraction(0.5)).toBe('1/2');
    });

    it('should reduce 0.25 to "1/4" not "2/8"', () => {
      expect(formatQuantityAsFraction(0.25)).toBe('1/4');
    });

    it('should reduce 0.75 to "3/4" not "6/8"', () => {
      expect(formatQuantityAsFraction(0.75)).toBe('3/4');
    });
  });

  describe('combined fraction types', () => {
    it('should handle sixths by finding closest eighth', () => {
      // 1/6 ≈ 0.1667, closest is 1/8 (0.125)
      const result = formatQuantityAsFraction(0.1667);
      expect(result).toMatch(/1\/8|1\/6/); // Could be either depending on implementation
    });

    it('should handle 2/3 + 1 as "1 2/3"', () => {
      expect(formatQuantityAsFraction(1 + 2/3)).toBe('1 2/3');
    });
  });

  describe('compound measurements', () => {
    it('should format 0.625 cups as "1/2 cup and 2 Tbsp"', () => {
      // 0.625 cups = 1/2 cup (0.5) + 2 Tbsp (0.125)
      // More precise than rounding to 2/3 (0.667)
      expect(formatQuantityAsFraction(0.625)).toBe('1/2 cup and 2 Tbsp');
    });
  });
});
