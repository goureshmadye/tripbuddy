import { NotificationListener } from '@/components/notifications/notification-listener';
import { OfflineStatusBanner } from '@/components/offline';
import { ToastProvider } from '@/components/ui/toast';
import { AuthProvider } from '@/hooks/use-auth';
import { SettingsProvider } from '@/hooks/use-settings';
import { SubscriptionProvider } from '@/hooks/use-subscription';
import { ThemeProvider, useAppColorScheme } from '@/hooks/use-theme';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const unstable_settings = {
  // Start at auth to properly check authentication before accessing tabs
  initialRouteName: 'auth',
};

// Smooth screen transition animation config
const screenOptions = {
  headerShown: false,
  animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
  animationDuration: 250,
  gestureEnabled: true,
  fullScreenGestureEnabled: Platform.OS === 'ios',
} as const;

function RootLayoutNav() {
  const colorScheme = useAppColorScheme();

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <ToastProvider>
          <OfflineStatusBanner />
          <Stack screenOptions={screenOptions}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="auth" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="subscription" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
            <Stack.Screen name="trips" options={{ headerShown: false }} />
            <Stack.Screen 
              name="modal" 
              options={{ 
                presentation: 'modal', 
                title: 'Modal',
                animation: 'slide_from_bottom',
              }} 
            />
          </Stack>
          <NotificationListener />
          <StatusBar style="auto" />
        </ToastProvider>
      </SafeAreaProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SettingsProvider>
          <SubscriptionProvider>
            <RootLayoutNav />
          </SubscriptionProvider>
        </SettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
