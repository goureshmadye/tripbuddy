// Re-export the app-aware color scheme hook as useColorScheme
// This ensures all components using this hook respect the user's theme preference
export { useAppColorScheme as useColorScheme } from './use-theme';
