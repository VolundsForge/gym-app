import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, Button, Muted, Subtitle, Title, useTheme } from '@/components/ui';
import { Radius } from '@/constants/Colors';
import { useSettings } from '@/context/SettingsContext';
import { indexById } from '@/lib/id';
import type { ProgressiveSuggestion } from '@/lib/suggestions';
import { displayToKg, kgToDisplay, unitLabel } from '@/lib/weight';
import { usesWeight } from '@/lib/workout-plan';
import type { Exercise, ExerciseNextPlan } from '@/types/workout';

const DELAY_MIN = 1;
const DELAY_MAX = 10;

export function GrowthTipsReview({
  visible,
  suggestions,
  catalog,
  onDelay,
  onApply,
}: {
  visible: boolean;
  suggestions: ProgressiveSuggestion[];
  catalog: Exercise[];
  onDelay: (extraSessions: number) => void;
  onApply: (plans: ExerciseNextPlan[]) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { weightUnit } = useSettings();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const dialogWidth = Math.min(420, Math.max(280, windowWidth - 40));
  const [delayExtra, setDelayExtra] = useState(3);
  const [drafts, setDrafts] = useState<Record<string, ExerciseNextPlan>>({});

  const catalogById = useMemo(() => indexById(catalog), [catalog]);

  useEffect(() => {
    if (!visible) return;
    setDelayExtra(3);
    const next: Record<string, ExerciseNextPlan> = {};
    for (const tip of suggestions) {
      next[tip.exerciseId] = {
        exerciseId: tip.exerciseId,
        sets: tip.target.sets,
        reps: tip.target.reps,
        weight: tip.target.weight,
      };
    }
    setDrafts(next);
  }, [visible, suggestions]);

  const patchDraft = (
    exerciseId: string,
    patch: Partial<Omit<ExerciseNextPlan, 'exerciseId'>>
  ) => {
    setDrafts((current) => {
      const existing = current[exerciseId];
      if (!existing) return current;
      return {
        ...current,
        [exerciseId]: { ...existing, ...patch },
      };
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={() => onDelay(delayExtra)}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              width: dialogWidth,
              maxHeight: Math.max(320, windowHeight - insets.top - insets.bottom - 48),
            },
          ]}>
          <Title style={{ fontSize: 22 }}>Ready to push</Title>
          <Subtitle>
            These exercises hit your growth-tip limit. Adjust the next sets, reps,
            and load, or delay the reminder.
          </Subtitle>

          <ScrollView
            style={{ maxHeight: Math.max(160, windowHeight * 0.42) }}
            contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
            keyboardShouldPersistTaps="handled">
            {suggestions.map((tip) => {
              const draft = drafts[tip.exerciseId];
              if (!draft) return null;
              const equipment = catalogById.get(tip.exerciseId)?.equipment;
              const showWeight = usesWeight(equipment, tip.muscleGroup);
              return (
                <View
                  key={tip.id}
                  style={[
                    styles.rowCard,
                    { backgroundColor: theme.muted, borderColor: theme.border },
                  ]}>
                  <Body style={{ fontWeight: '700' }}>{tip.exerciseName}</Body>
                  <Muted>Now {tip.currentLabel}</Muted>
                  <View style={styles.fields}>
                    <PlanField
                      label="Sets"
                      value={draft.sets}
                      onChange={(sets) =>
                        patchDraft(tip.exerciseId, {
                          sets: Math.max(1, Math.round(sets)),
                        })
                      }
                    />
                    <PlanField
                      label="Reps"
                      value={draft.reps}
                      onChange={(reps) =>
                        patchDraft(tip.exerciseId, {
                          reps: Math.max(1, Math.round(reps)),
                        })
                      }
                    />
                    {showWeight ? (
                      <PlanField
                        label={unitLabel(weightUnit).toUpperCase()}
                        value={kgToDisplay(draft.weight, weightUnit)}
                        onChange={(weight) =>
                          patchDraft(tip.exerciseId, {
                            weight: displayToKg(weight, weightUnit),
                          })
                        }
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.delayBlock}>
            <Muted>Remind after this many more sessions</Muted>
            <View style={styles.stepperRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fewer sessions"
                disabled={delayExtra <= DELAY_MIN}
                onPress={() => setDelayExtra((n) => Math.max(DELAY_MIN, n - 1))}
                style={({ pressed }) => [
                  styles.stepperButton,
                  {
                    backgroundColor: theme.muted,
                    borderColor: theme.border,
                    opacity: delayExtra <= DELAY_MIN ? 0.4 : pressed ? 0.8 : 1,
                  },
                ]}>
                <Ionicons name="remove" size={18} color={theme.text} />
              </Pressable>
              <Body style={{ fontWeight: '800', fontSize: 18, minWidth: 28, textAlign: 'center' }}>
                {delayExtra}
              </Body>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More sessions"
                disabled={delayExtra >= DELAY_MAX}
                onPress={() => setDelayExtra((n) => Math.min(DELAY_MAX, n + 1))}
                style={({ pressed }) => [
                  styles.stepperButton,
                  {
                    backgroundColor: theme.muted,
                    borderColor: theme.border,
                    opacity: delayExtra >= DELAY_MAX ? 0.4 : pressed ? 0.8 : 1,
                  },
                ]}>
                <Ionicons name="add" size={18} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <Button
            label={`Remind after ${delayExtra} more`}
            variant="secondary"
            onPress={() => onDelay(delayExtra)}
          />
          <Button
            label="Use these next time"
            onPress={() => onApply(suggestions.map((tip) => drafts[tip.exerciseId]).filter(Boolean))}
          />
        </View>
      </View>
    </Modal>
  );
}

function PlanField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Muted style={{ textAlign: 'center' }}>{label}</Muted>
      <TextInput
        value={String(value)}
        keyboardType="decimal-pad"
        onChangeText={(text) => {
          const cleaned = text.replace(',', '.').replace(/[^0-9.]/g, '');
          if (cleaned === '' || cleaned === '.') {
            onChange(0);
            return;
          }
          const n = Number(cleaned);
          if (!Number.isNaN(n)) onChange(n);
        }}
        style={{
          backgroundColor: theme.card,
          color: theme.text,
          borderRadius: Radius.sm,
          paddingVertical: 8,
          paddingHorizontal: 6,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '600',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,28,28,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    gap: 12,
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  fields: {
    flexDirection: 'row',
    gap: 8,
  },
  delayBlock: {
    gap: 8,
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
