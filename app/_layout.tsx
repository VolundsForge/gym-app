import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { WorkoutProvider } from '@/context/WorkoutContext';
import Colors from '@/constants/Colors';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <WorkoutProvider>
      <RootLayoutNav />
    </WorkoutProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];

  const navTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: palette.tint,
      background: palette.background,
      card: palette.card,
      text: palette.text,
      border: palette.border,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout/active"
          options={{ title: 'Active Workout', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="workout/[id]"
          options={{ title: 'Workout', headerBackTitle: 'Back' }}
        />
        <Stack.Screen
          name="workout/add-exercise"
          options={{
            title: 'Add Exercise',
            presentation: 'modal',
            headerBackTitle: 'Close',
          }}
        />
        <Stack.Screen
          name="exercise/[id]"
          options={{ title: 'Exercise', headerBackTitle: 'Back' }}
        />
      </Stack>
    </ThemeProvider>
  );
}
