import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { useTheme } from '@/components/ui';
import { NATIVE_DRIVER } from '@/lib/native-driver';

type Particle = {
  left: `${number}%`;
  top: `${number}%`;
  size: number;
  color: string;
};

const shimmerClock = new Animated.Value(0);
let shimmerLoop: Animated.CompositeAnimation | null = null;
let shimmerUsers = 0;

function startSharedShimmer() {
  if (shimmerLoop) return;
  shimmerClock.setValue(0);
  shimmerLoop = Animated.loop(
    Animated.timing(shimmerClock, {
      toValue: 1,
      duration: 4200,
      easing: Easing.linear,
      useNativeDriver: NATIVE_DRIVER,
    })
  );
  shimmerLoop.start();
}

function stopSharedShimmer() {
  shimmerLoop?.stop();
  shimmerLoop = null;
  shimmerClock.setValue(0);
}

function retainShimmer() {
  shimmerUsers += 1;
  if (shimmerUsers === 1 && AppState.currentState === 'active') {
    startSharedShimmer();
  }
}

function releaseShimmer() {
  shimmerUsers = Math.max(0, shimmerUsers - 1);
  if (shimmerUsers === 0) {
    stopSharedShimmer();
  }
}

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    if (shimmerUsers > 0) startSharedShimmer();
    return;
  }
  stopSharedShimmer();
});

function useSharedShimmer(active: boolean) {
  useEffect(() => {
    if (!active) return;
    retainShimmer();
    return () => releaseShimmer();
  }, [active]);
  return shimmerClock;
}

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeParticles(seed: string, count: number): Particle[] {
  const rand = mulberry(hashSeed(seed));
  const colors = [
    'rgba(255,255,255,0.9)',
    'rgba(255,244,220,0.82)',
    'rgba(255,210,150,0.75)',
  ];
  return Array.from({ length: count }, () => ({
    left: `${8 + rand() * 78}%` as `${number}%`,
    top: `${14 + rand() * 58}%` as `${number}%`,
    size: 2 + rand() * 2.8,
    color: colors[Math.floor(rand() * colors.length)],
  }));
}

function fillGlow(clamped: number, ready?: boolean) {
  const radius = 8 + clamped * 18 + (ready ? 8 : 0);
  const alpha = 0.28 + clamped * 0.52;
  if (Platform.OS === 'web') {
    return {
      boxShadow: `0 0 ${radius}px rgba(229, 106, 18, ${alpha})`,
    };
  }
  return {
    shadowColor: '#E56A12',
    shadowOpacity: alpha,
    shadowRadius: radius / 2,
    shadowOffset: { width: 0, height: 0 },
  };
}

export function GrowthProgressBar({
  ratio,
  seed,
  ready,
  current,
  goal,
}: {
  ratio: number;
  seed: string;
  ready?: boolean;
  current?: number;
  goal?: number;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, ratio));
  const particleCount =
    clamped <= 0 ? 0 : Math.min(7, 2 + Math.round(clamped * 5));
  const particles = useMemo(
    () => makeParticles(seed, particleCount),
    [seed, particleCount]
  );
  const fillAnim = useRef(new Animated.Value(0)).current;
  const shimmer = useSharedShimmer(clamped > 0);

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: clamped,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, fillAnim]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  const sweep = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 360],
  });
  const sweepSoft = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 280],
  });
  const shardOpacity = 0.1 + clamped * 0.34;
  const percent = Math.round(clamped * 100);
  const label =
    ready
      ? 'Growth tip ready'
      : current != null && goal != null
        ? `${current} of ${goal} sessions toward a growth tip`
        : `Growth progress ${percent} percent`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessibilityLabel={label}
      style={styles.wrap}>
      {clamped > 0 ? (
        <Animated.View
          style={[
            styles.glow,
            {
              width: fillWidth,
              backgroundColor: theme.tint,
              opacity: 0.22 + clamped * 0.4,
              ...fillGlow(clamped, ready),
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.muted,
            borderColor: theme.border,
          },
        ]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: fillWidth,
              backgroundColor: theme.tint,
            },
          ]}>
          <View style={styles.core} />
          <View style={[styles.facetTop, { opacity: 0.28 + clamped * 0.4 }]} />
          <View style={styles.facetEdge} />
          <View style={[styles.shardA, { opacity: shardOpacity }]} />
          <View style={[styles.shardB, { opacity: shardOpacity * 0.85 }]} />
          {clamped > 0.35 ? (
            <View style={[styles.shardC, { opacity: shardOpacity }]} />
          ) : null}
          {clamped > 0.7 ? (
            <View style={[styles.shardD, { opacity: shardOpacity * 0.9 }]} />
          ) : null}
          {clamped > 0 ? (
            <>
              <Animated.View
                style={[
                  styles.shimmer,
                  {
                    opacity: 0.1 + clamped * 0.14,
                    transform: [{ translateX: sweepSoft }, { rotate: '22deg' }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.shimmer,
                  styles.shimmerBright,
                  {
                    opacity: 0.14 + clamped * 0.18 + (ready ? 0.08 : 0),
                    transform: [{ translateX: sweep }, { rotate: '18deg' }],
                  },
                ]}
              />
            </>
          ) : null}
          {particles.map((spec, index) => (
            <View
              key={`${seed}-${index}`}
              style={[
                styles.particle,
                {
                  left: spec.left,
                  top: spec.top,
                  width: spec.size,
                  height: spec.size,
                  backgroundColor: spec.color,
                },
              ]}
            />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 22,
    width: '100%',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    left: 0,
    top: 4,
    height: 14,
    borderRadius: 999,
    pointerEvents: 'none',
  },
  track: {
    height: 16,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
    borderRadius: 999,
  },
  core: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 4,
    right: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 168, 72, 0.38)',
    pointerEvents: 'none',
  },
  facetTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255, 236, 210, 0.42)',
    pointerEvents: 'none',
  },
  facetEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    pointerEvents: 'none',
  },
  shardA: {
    position: 'absolute',
    width: 10,
    height: 36,
    left: '18%',
    top: -10,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    transform: [{ rotate: '28deg' }],
    pointerEvents: 'none',
  },
  shardB: {
    position: 'absolute',
    width: 7,
    height: 34,
    left: '52%',
    top: -8,
    backgroundColor: 'rgba(255, 214, 170, 0.42)',
    transform: [{ rotate: '-22deg' }],
    pointerEvents: 'none',
  },
  shardC: {
    position: 'absolute',
    width: 6,
    height: 30,
    left: '72%',
    top: -6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ rotate: '16deg' }],
    pointerEvents: 'none',
  },
  shardD: {
    position: 'absolute',
    width: 5,
    height: 28,
    left: '34%',
    top: -8,
    backgroundColor: 'rgba(255, 248, 230, 0.36)',
    transform: [{ rotate: '-18deg' }],
    pointerEvents: 'none',
  },
  shimmer: {
    position: 'absolute',
    top: -10,
    bottom: -10,
    width: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    pointerEvents: 'none',
  },
  shimmerBright: {
    width: 16,
    backgroundColor: 'rgba(255, 248, 230, 0.55)',
  },
  particle: {
    position: 'absolute',
    borderRadius: 1,
    pointerEvents: 'none',
    transform: [{ rotate: '45deg' }],
  },
});
