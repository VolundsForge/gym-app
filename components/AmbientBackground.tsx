import { Accelerometer, Gyroscope } from 'expo-sensors';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { Canvas } from '@/constants/Colors';
import { NATIVE_DRIVER } from '@/lib/native-driver';

type Edge = 0 | 1 | 2 | 3;

type BubbleSpec = {
  id: number;
  size: number;
  color: string;
  delay: number;
};

const LIGHT_BUBBLES = [
  'rgba(229, 106, 18, 0.5)',
  'rgba(107, 143, 113, 0.44)',
  'rgba(212, 160, 84, 0.46)',
  'rgba(196, 92, 74, 0.42)',
  'rgba(176, 122, 96, 0.4)',
];

const DARK_BUBBLES = [
  'rgba(255, 139, 61, 0.46)',
  'rgba(123, 175, 138, 0.4)',
  'rgba(232, 184, 109, 0.42)',
  'rgba(224, 122, 95, 0.4)',
  'rgba(255, 196, 140, 0.36)',
];

const EDGE_PAD = Platform.OS === 'web' ? 48 : 28;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeBubbles(dark: boolean): BubbleSpec[] {
  const colors = dark ? DARK_BUBBLES : LIGHT_BUBBLES;
  return [
    { id: 0, size: 180, color: colors[0], delay: 0 },
    { id: 1, size: 220, color: colors[1], delay: 2800 },
    { id: 2, size: 160, color: colors[2], delay: 5600 },
    { id: 3, size: 200, color: colors[3], delay: 8400 },
    { id: 4, size: 150, color: colors[4], delay: 11200 },
  ];
}

function pointOutside(
  edge: Edge,
  width: number,
  height: number,
  size: number
): { x: number; y: number } {
  const alongX = rand(0, Math.max(1, width - size));
  const alongY = rand(0, Math.max(1, height - size));
  switch (edge) {
    case 0:
      return { x: alongX, y: -size - EDGE_PAD };
    case 1:
      return { x: width + EDGE_PAD, y: alongY };
    case 2:
      return { x: alongX, y: height + EDGE_PAD };
    default:
      return { x: -size - EDGE_PAD, y: alongY };
  }
}

function Bubble({
  spec,
  width,
  height,
}: {
  spec: BubbleSpec;
  width: number;
  height: number;
}) {
  const x = useRef(new Animated.Value(-4000)).current;
  const y = useRef(new Animated.Value(-4000)).current;

  useEffect(() => {
    if (width < 8 || height < 8) return;

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let motion: Animated.CompositeAnimation | undefined;

    const trip = () => {
      if (!alive) return;
      const startEdge = Math.floor(Math.random() * 4) as Edge;
      const endEdge = ((startEdge + 2) % 4) as Edge;
      const start = pointOutside(startEdge, width, height, spec.size);
      const end = pointOutside(endEdge, width, height, spec.size);
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      const duration = Math.max(22000, (dist / rand(8, 12)) * 1000);

      x.setValue(start.x);
      y.setValue(start.y);
      motion = Animated.parallel([
        Animated.timing(x, {
          toValue: end.x,
          duration,
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(y, {
          toValue: end.y,
          duration,
          easing: Easing.linear,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]);
      motion.start(({ finished }) => {
        if (finished && alive) {
          timer = setTimeout(trip, rand(800, 2400));
        }
      });
    };

    timer = setTimeout(trip, spec.delay);

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      motion?.stop();
    };
  }, [height, spec.delay, spec.size, width, x, y]);

  const webSoft: ViewStyle =
    Platform.OS === 'web' ? ({ filter: 'blur(22px)' } as ViewStyle) : {};

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
          backgroundColor: spec.color,
        },
        webSoft,
        { transform: [{ translateX: x }, { translateY: y }] },
      ]}
    />
  );
}

export function AmbientBackground() {
  const scheme = useColorScheme() ?? 'light';
  const dark = scheme === 'dark';
  const [box, setBox] = useState({ width: 0, height: 0 });
  const bubbles = useMemo(() => makeBubbles(dark), [dark]);
  const tiltX = useRef(new Animated.Value(0)).current;
  const tiltY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS === 'web') return;

    let accelSub: { remove: () => void } | undefined;
    let gyroSub: { remove: () => void } | undefined;
    let accelX = 0;
    let accelY = 0;
    let gyroX = 0;
    let gyroY = 0;
    let cancelled = false;
    let hasAccel = false;
    let hasGyro = false;

    const applyTilt = () => {
      Animated.timing(tiltX, {
        toValue: accelX * 16 + gyroY * 5,
        duration: 220,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
      Animated.timing(tiltY, {
        toValue: -accelY * 16 + gyroX * 5,
        duration: 220,
        useNativeDriver: NATIVE_DRIVER,
      }).start();
    };

    const stopSensors = () => {
      accelSub?.remove();
      gyroSub?.remove();
      accelSub = undefined;
      gyroSub = undefined;
    };

    const startSensors = () => {
      if (hasAccel && !accelSub) {
        Accelerometer.setUpdateInterval(120);
        accelSub = Accelerometer.addListener(({ x: ax, y: ay }) => {
          accelX = ax;
          accelY = ay;
          applyTilt();
        });
      }
      if (hasGyro && !gyroSub) {
        Gyroscope.setUpdateInterval(120);
        gyroSub = Gyroscope.addListener(({ x: gx, y: gy }) => {
          gyroX = gx;
          gyroY = gy;
          applyTilt();
        });
      }
    };

    void (async () => {
      const [accel, gyro] = await Promise.all([
        Accelerometer.isAvailableAsync().catch(() => false),
        Gyroscope.isAvailableAsync().catch(() => false),
      ]);
      if (cancelled) return;
      hasAccel = accel;
      hasGyro = gyro;
      if (AppState.currentState === 'active') startSensors();
    })();

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        startSensors();
        return;
      }
      stopSensors();
      Animated.timing(tiltX, { toValue: 0, duration: 400, useNativeDriver: NATIVE_DRIVER }).start();
      Animated.timing(tiltY, { toValue: 0, duration: 400, useNativeDriver: NATIVE_DRIVER }).start();
    });

    return () => {
      cancelled = true;
      stopSensors();
      appSub.remove();
    };
  }, [tiltX, tiltY]);

  const frost = dark ? 'rgba(18, 18, 17, 0.2)' : 'rgba(247, 244, 237, 0.16)';

  return (
    <View
      style={styles.root}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setBox({ width, height });
      }}>
      <View style={[styles.fill, { backgroundColor: dark ? Canvas.dark : Canvas.light }]} />
      <Animated.View
        style={[styles.fill, { transform: [{ translateX: tiltX }, { translateY: tiltY }] }]}>
        {box.width > 8
          ? bubbles.map((spec) => (
              <Bubble
                key={`${scheme}-${spec.id}`}
                spec={spec}
                width={box.width}
                height={box.height}
              />
            ))
          : null}
      </Animated.View>
      <View style={[styles.fill, { backgroundColor: frost }]} />
    </View>
  );
}

const fill = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const styles = StyleSheet.create({
  root: {
    ...fill,
    overflow: 'hidden',
    zIndex: 0,
    pointerEvents: 'none',
  },
  fill,
});
