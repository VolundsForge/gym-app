import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, View, type TextStyle } from 'react-native';
import { enableScreens } from 'react-native-screens';
import 'react-native-reanimated';

import { AmbientBackground } from '@/components/AmbientBackground';
import { HeaderMenuButton } from '@/components/HeaderMenu';
import { WorkoutTimerHost } from '@/components/WorkoutTimerHost';
import { useColorScheme } from '@/components/useColorScheme';
import { SettingsProvider } from '@/context/SettingsContext';
import { AppThemeProvider } from '@/context/ThemeContext';
import { WorkoutProvider } from '@/context/WorkoutContext';
import Colors, { Typeface } from '@/constants/Colors';

enableScreens(true);

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync();
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && Platform.OS !== 'web') {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded && Platform.OS !== 'web') {
    return null;
  }

  return (
    <AppThemeProvider>
      <SettingsProvider>
        <WorkoutProvider>
          <WorkoutTimerHost />
          <RootLayoutNav />
        </WorkoutProvider>
      </SettingsProvider>
    </AppThemeProvider>
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
      background: 'transparent',
      card: palette.card,
      text: palette.text,
      border: palette.border,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <AmbientBackground />
        <Stack
          screenOptions={{
            headerRight: () => <HeaderMenuButton />,
            headerStyle: { backgroundColor: palette.background },
            headerShadowVisible: false,
            headerTintColor: palette.text,
            headerTitleStyle: {
              fontWeight: '600',
              letterSpacing: -0.3,
              color: palette.text,
              ...(Platform.OS === 'web' ? { fontFamily: Typeface.web } : null),
            } as TextStyle,
            contentStyle: { backgroundColor: 'transparent' },
          }}>
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
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        </Stack>
      </View>
    </ThemeProvider>
  );
}
