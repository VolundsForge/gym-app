import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Muted, useTheme } from '@/components/ui';
import { Radius } from '@/constants/Colors';
import { useSettings } from '@/context/SettingsContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  PROGRESSION_THRESHOLD_MAX,
  PROGRESSION_THRESHOLD_MIN,
} from '@/lib/suggestions';

export function HeaderPageTitle({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <Body
      style={{
        fontWeight: '600',
        fontSize: 17,
        letterSpacing: -0.3,
        color: theme.text,
        marginLeft: 16,
      }}>
      {label}
    </Body>
  );
}

export function HeaderMenuButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { colorScheme, setColorScheme } = useAppTheme();
  const {
    timerEnabled,
    setTimerEnabled,
    weightUnit,
    setWeightUnit,
    progressionNudgesEnabled,
    setProgressionNudgesEnabled,
    progressionSessionThreshold,
    setProgressionSessionThreshold,
  } = useSettings();
  const [open, setOpen] = useState(false);
  const dark = colorScheme === 'dark';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        onPress={() => setOpen(true)}
        hitSlop={12}
        style={styles.iconButton}>
        <Ionicons name="menu" size={32} color={theme.text} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.menu,
              {
                top: insets.top + 48,
                right: 12,
                maxHeight: Math.max(280, windowHeight - insets.top - 72),
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPress={() => {
                setOpen(false);
                router.push('/profile');
              }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? theme.muted : 'transparent' },
              ]}>
              <Ionicons name="person-circle-outline" size={22} color={theme.text} />
              <Body style={{ fontWeight: '600', flex: 1 }}>Profile</Body>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <View style={styles.row}>
              <Ionicons
                name={dark ? 'moon' : 'sunny-outline'}
                size={22}
                color={theme.text}
              />
              <Body style={{ fontWeight: '600', flex: 1 }}>Dark mode</Body>
              <Switch
                value={dark}
                onValueChange={(value) => setColorScheme(value ? 'dark' : 'light')}
                trackColor={{ false: theme.muted, true: theme.tint }}
                thumbColor="#FCFBF8"
                ios_backgroundColor={theme.muted}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <View style={styles.row}>
              <Ionicons name="timer-outline" size={22} color={theme.text} />
              <Body style={{ fontWeight: '600', flex: 1 }}>Timer on workouts</Body>
              <Switch
                value={timerEnabled}
                onValueChange={setTimerEnabled}
                trackColor={{ false: theme.muted, true: theme.tint }}
                thumbColor="#FCFBF8"
                ios_backgroundColor={theme.muted}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <View style={styles.row}>
              <Ionicons name="barbell-outline" size={22} color={theme.text} />
              <Body style={{ fontWeight: '600', flex: 1 }}>Weight</Body>
              <View
                style={[
                  styles.unitSwitch,
                  { backgroundColor: theme.muted, borderColor: theme.border },
                ]}>
                {(['kg', 'lbs'] as const).map((unit) => {
                  const selected = weightUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={unit === 'kg' ? 'Kilograms' : 'Pounds'}
                      onPress={() => setWeightUnit(unit)}
                      style={[
                        styles.unitOption,
                        selected
                          ? { backgroundColor: theme.tint }
                          : { backgroundColor: 'transparent' },
                      ]}>
                      <Body
                        style={{
                          fontWeight: '700',
                          fontSize: 13,
                          color: selected ? theme.onTint : theme.textSecondary,
                        }}>
                        {unit}
                      </Body>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <View style={styles.row}>
              <Ionicons name="trending-up-outline" size={22} color={theme.text} />
              <Body style={{ fontWeight: '600', flex: 1 }}>Growth tips</Body>
              <Switch
                value={progressionNudgesEnabled}
                onValueChange={setProgressionNudgesEnabled}
                trackColor={{ false: theme.muted, true: theme.tint }}
                thumbColor="#FCFBF8"
                ios_backgroundColor={theme.muted}
              />
            </View>
            {progressionNudgesEnabled ? (
              <View style={styles.nudgeBlock}>
                <Muted>Same combo before a nudge</Muted>
                <View style={styles.stepperRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fewer repeats"
                    disabled={progressionSessionThreshold <= PROGRESSION_THRESHOLD_MIN}
                    onPress={() =>
                      setProgressionSessionThreshold(progressionSessionThreshold - 1)
                    }
                    style={({ pressed }) => [
                      styles.stepperButton,
                      {
                        backgroundColor: theme.muted,
                        borderColor: theme.border,
                        opacity:
                          progressionSessionThreshold <= PROGRESSION_THRESHOLD_MIN
                            ? 0.4
                            : pressed
                              ? 0.8
                              : 1,
                      },
                    ]}>
                    <Ionicons name="remove" size={18} color={theme.text} />
                  </Pressable>
                  <Body style={{ fontWeight: '800', fontSize: 18, minWidth: 28, textAlign: 'center' }}>
                    {progressionSessionThreshold}
                  </Body>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="More repeats"
                    disabled={progressionSessionThreshold >= PROGRESSION_THRESHOLD_MAX}
                    onPress={() =>
                      setProgressionSessionThreshold(progressionSessionThreshold + 1)
                    }
                    style={({ pressed }) => [
                      styles.stepperButton,
                      {
                        backgroundColor: theme.muted,
                        borderColor: theme.border,
                        opacity:
                          progressionSessionThreshold >= PROGRESSION_THRESHOLD_MAX
                            ? 0.4
                            : pressed
                              ? 0.8
                              : 1,
                      },
                    ]}>
                    <Ionicons name="add" size={18} color={theme.text} />
                  </Pressable>
                </View>
                <Muted>
                  How many times at the same sets, reps, and weight before a
                  suggestion to add a little more.
                </Muted>
              </View>
            ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 6,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    minWidth: 280,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    elevation: 8,
    boxShadow: '0 8px 28px rgba(28,28,28,0.16)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  unitSwitch: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    minWidth: 44,
    alignItems: 'center',
  },
  nudgeBlock: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
