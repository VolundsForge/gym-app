import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderMenuButton, HeaderPageTitle } from '@/components/HeaderMenu';
import Colors, { Typeface } from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const headerShown = useClientOnlyValue(false, true);
  const palette = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const tabBarBody = Platform.OS === 'ios' ? 64 : 74;

  return (
    <Tabs
      detachInactiveScreens
      screenOptions={({ route, navigation }) => {
        const state = navigation.getState();
        const focused = state.routes[state.index]?.key === route.key;
        return {
          tabBarActiveTintColor: palette.tint,
          tabBarInactiveTintColor: palette.tabIconDefault,
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '600',
            ...(Platform.OS === 'web' ? { fontFamily: Typeface.web } : null),
          },
          tabBarIconStyle: {
            width: 30,
            height: 30,
          },
          tabBarStyle: {
            backgroundColor: palette.background,
            borderTopColor: palette.border,
            height: tabBarBody + insets.bottom,
            paddingTop: 8,
            paddingBottom: insets.bottom,
          },
          sceneStyle: {
            backgroundColor: 'transparent',
            display: focused ? 'flex' : 'none',
            pointerEvents: focused ? 'auto' : 'none',
          },
          headerStyle: {
            backgroundColor: palette.background,
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '600',
            letterSpacing: -0.3,
            ...(Platform.OS === 'web' ? { fontFamily: Typeface.web } : null),
          },
          headerTintColor: palette.text,
          headerShown,
          headerTitle: () => null,
          headerRight: () => <HeaderMenuButton />,
        };
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerLeft: () => <HeaderPageTitle label="Gym Tracker" />,
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          headerLeft: () => <HeaderPageTitle label="Your growth" />,
          tabBarIcon: ({ color }) => (
            <Ionicons name="trending-up" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          headerLeft: () => <HeaderPageTitle label="Exercises" />,
          tabBarIcon: ({ color }) => (
            <Ionicons name="barbell" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          headerLeft: () => <HeaderPageTitle label="History" />,
          tabBarIcon: ({ color }) => (
            <Ionicons name="time" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
