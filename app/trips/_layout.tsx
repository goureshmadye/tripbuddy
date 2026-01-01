import LoadingScreen from '@/components/loading-screen';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Redirect, Stack } from 'expo-router';

export default function TripsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  
  // Auth guard - redirect unauthenticated users to auth
  const { firebaseUser, loading, isGuestMode, isWalkthroughComplete } = useAuth();

  // Show loading while checking auth state
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  // If user is not authenticated and not in guest mode, redirect to auth
  if (!firebaseUser && !isGuestMode) {
    // If walkthrough not complete, go to walkthrough first
    if (!isWalkthroughComplete) {
      return <Redirect href="/auth/walkthrough" />;
    }
    // Otherwise go to auth landing page
    return <Redirect href="/auth" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="create" 
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/itinerary" />
      <Stack.Screen name="[id]/map" />
      <Stack.Screen name="[id]/expenses" />
      <Stack.Screen name="[id]/documents" />
      <Stack.Screen name="[id]/collaborators" />
    </Stack>
  );
}
