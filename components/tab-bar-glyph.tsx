import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  AppState,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type ColorValue,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { NATIVE_DRIVER } from '@/lib/native-driver';

const sunburst = require('../assets/images/tab-sunburst.png');

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type TabBarButtonProps = {
  children?: React.ReactNode;
  onPress?: ((event: GestureResponderEvent) => void) | null;
  onLongPress?: ((event: GestureResponderEvent) => void) | null;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  href?: string;
  'aria-selected'?: boolean;
  'aria-label'?: string;
};

export function TabBarButton({
  children,
  onPress,
  onLongPress,
  style,
  testID,
  accessibilityLabel,
  'aria-selected': ariaSelected,
  'aria-label': ariaLabel,
}: TabBarButtonProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: ariaSelected === true }}
      accessibilityLabel={accessibilityLabel ?? ariaLabel}
      testID={testID}
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      android_ripple={{ color: 'transparent', borderless: false }}
      style={({ pressed }) => [
        style,
        styles.tabButton,
        pressed ? styles.pressed : null,
      ]}>
      {children}
    </Pressable>
  );
}

export function TabBarGlyph({
  name,
  color,
  focused,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!focused) {
      spin.stopAnimation();
      pulse.stopAnimation();
      spin.setValue(0);
      pulse.setValue(0);
      return;
    }

    let spinLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;
    const start = () => {
      spin.setValue(0);
      pulse.setValue(0);
      spinLoop = Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 18000,
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        })
      );
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 2400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE_DRIVER,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 2400,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: NATIVE_DRIVER,
          }),
        ])
      );
      spinLoop.start();
      pulseLoop.start();
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        start();
        return;
      }
      spinLoop?.stop();
      pulseLoop?.stop();
    });
    if (AppState.currentState === 'active') start();

    return () => {
      sub.remove();
      spinLoop?.stop();
      pulseLoop?.stop();
      spin.setValue(0);
      pulse.setValue(0);
    };
  }, [focused, spin, pulse]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const burstOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0.62],
  });

  return (
    <View style={styles.wrap}>
      {focused ? (
        <Animated.Image
          source={sunburst}
          resizeMode="contain"
          style={[
            styles.sunburst,
            {
              tintColor: color,
              opacity: burstOpacity,
              transform: [{ rotate }],
            },
          ]}
        />
      ) : null}
      <Ionicons name={name} size={28} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    justifyContent: 'center',
    overflow: 'visible',
  },
  pressed: {
    opacity: 0.72,
  },
  wrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  sunburst: {
    position: 'absolute',
    width: 64,
    height: 64,
    left: -17,
    top: -17,
  },
});
