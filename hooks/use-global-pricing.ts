import { useAuth } from '@/hooks/use-auth';
import { PricingService } from '@/services/pricing';
import { useMemo } from 'react';

/**
 * Hook to automatically convert a USD base price to the user's preferred currency
 * @param basePriceUsd Amount in USD (Main unit, e.g., 10 for $10)
 */
export function useGlobalPricing(basePriceUsd: number) {
  const { user } = useAuth();
  
  // Default to USD if no user or no preference
  const currency = user?.defaultCurrency || 'USD';
  
  const price = useMemo(() => {
    // Convert logic works with Cents, so multiply by 100
    return PricingService.calculateLocalPrice(basePriceUsd * 100, currency);
  }, [basePriceUsd, currency]);

  return {
    ...price,
    rateUsed: currency === 'USD' ? 1 : (price.amount / 100) / basePriceUsd, // Approximate effective rate
  };
}
