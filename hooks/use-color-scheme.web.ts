import { useEffect, useState } from 'react';
import { useAppColorScheme } from './use-theme';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 * Now uses the app-aware theme hook to respect user preferences
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useAppColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
