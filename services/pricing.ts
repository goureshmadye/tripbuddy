
// Simulated "Redis" cache of exchange rates (Base: USD)
// In production, this would be fetched from your backend API
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.50,
  JPY: 151.2,
  CAD: 1.36,
  AUD: 1.52,
  // Add fallback for others
};

export interface Price {
  currency: string;
  amount: number;      // Integer (cents/lowest unit)
  displayAmount: string; // Formatted string (e.g., "$10.00", "₹899")
}

export const PricingService = {
  /**
   * Calculate the local price based on a user's currency preference
   * @param basePriceUndInCents Price in USD Cents (e.g., 1000 for $10.00)
   * @param userCurrency User's preferred currency code (e.g., 'INR')
   */
  calculateLocalPrice(basePriceUsdInCents: number, userCurrency: string): Price {
    const rate = EXCHANGE_RATES[userCurrency] || 1; // Default to 1 (USD) if not found
    
    // 1. Direct Conversion
    const rawPrice = (basePriceUsdInCents / 100) * rate; // Convert to main unit (e.g., Dollars, Rupees)
    
    // 2. Smart Rounding (Psychological Pricing)
    const roundedPrice = this.applySmartRounding(rawPrice, userCurrency);
    
    // 3. Formatting
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: userCurrency,
      minimumFractionDigits: this.getFractionDigits(userCurrency),
      maximumFractionDigits: this.getFractionDigits(userCurrency),
    });

    return {
      currency: userCurrency,
      amount: Math.round(roundedPrice * 100), // Store as lowest unit again
      displayAmount: formatter.format(roundedPrice),
    };
  },

  /**
   * Apply "Pretty Price" rounding rules to avoid ugly numbers like 835.23
   */
  applySmartRounding(amount: number, currency: string): number {
    if (currency === 'USD' || currency === 'EUR' || currency === 'GBP') {
        // Western currencies: typically 9.99, 19.00
        return amount; // Keep exact for now, or round to .99 if desired
    }

    if (amount > 1000) {
      // High value: Round to nearest 100, minus 1 (e.g., 1234 -> 1200 -> 1199? Or just 1200)
      // Strategy: Round to nearest 50 or 100
      return Math.round(amount / 50) * 50; 
    }
    
    if (amount > 100) {
      // Mid value: Round to nearest 10 or 5 (e.g., 835.23 -> 835 or 839)
      // Strategy: 839 looks better than 835.23
      return Math.floor(amount / 10) * 10 + 9;
    }

    // Low value: Round to nearest integer
    return Math.round(amount);
  },

  /**
   * Helper to determine decimal places (JPY uses 0, others 2)
   */
  getFractionDigits(currency: string): number {
    return ['JPY', 'KRW', 'VND'].includes(currency) ? 0 : 2;
  }
};
