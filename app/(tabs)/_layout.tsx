import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderMenuButton, HeaderPageTitle } from '@/components/HeaderMenu';
import { TabBarButton, TabBarGlyph } from '@/components/tab-bar-glyph';
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
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarIconStyle: {
            width: 30,
            height: 30,
            overflow: 'visible',
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            overflow: 'visible',
          },
          tabBarStyle: {
            backgroundColor: palette.background,
            borderTopColor: palette.border,
            height: tabBarBody + insets.bottom,
            paddingTop: 0,
            paddingBottom: insets.bottom,
            overflow: 'hidden',
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
          tabBarIcon: ({ color, focused }) => (
            <TabBarGlyph name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          headerLeft: () => <HeaderPageTitle label="Your growth" />,
          tabBarIcon: ({ color, focused }) => (
            <TabBarGlyph name="trending-up" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          headerLeft: () => <HeaderPageTitle label="Exercises" />,
          tabBarIcon: ({ color, focused }) => (
            <TabBarGlyph name="barbell" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          headerLeft: () => <HeaderPageTitle label="History" />,
          tabBarIcon: ({ color, focused }) => (
            <TabBarGlyph name="time" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
