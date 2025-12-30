import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';

export default function TripsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

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
