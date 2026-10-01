import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Body,
  Button,
  Card,
  EmptyState,
  Input,
  Muted,
  Screen,
  Subtitle,
  Title,
  useTheme,
} from '@/components/ui';
import { useColorScheme } from '@/components/useColorScheme';
import { SetEditor } from '@/components/workout-sets';
import { Radius } from '@/constants/Colors';
import { useSettings } from '@/context/SettingsContext';
import { useWorkouts } from '@/context/WorkoutContext';
import { useElapsedClock } from '@/hooks/useElapsedClock';
import {
  allSetsComplete,
  formatExercisePlan,
  isEmptyDraftWorkout,
  pendingSetsAreReady,
  usesWeight,
  workoutPhase,
} from '@/lib/workout-plan';
import type { WorkoutExercise } from '@/types/workout';

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { timerEnabled } = useSettings();
  const {
    activeWorkout,
    renameActiveWorkout,
    commitPendingExercise,
    cancelPendingExercise,
    updatePendingSet,
    addPendingSet,
    removePendingSet,
    editCommittedExercise,
    removeExerciseFromActive,
    updateSet,
    saveWorkout,
    reopenBuilder,
    finishWorkout,
    discardActiveWorkout,
    exercises,
  } = useWorkouts();

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [commitHint, setCommitHint] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const activeRef = useRef(activeWorkout);
  activeRef.current = activeWorkout;

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', () => {
      if (discarding || finishing) return;
      if (isEmptyDraftWorkout(activeRef.current)) {
        void discardActiveWorkout();
      }
    });
    return unsub;
  }, [navigation, discardActiveWorkout, discarding, finishing]);

  const showTimer = timerEnabled && !!activeWorkout && !isEmptyDraftWorkout(activeWorkout);
  const elapsed = useElapsedClock(activeWorkout?.startedAt, showTimer);

  const onDiscard = () => setConfirmDiscard(true);

  const confirmDiscardWorkout = async () => {
    if (discarding) return;
    setDiscarding(true);
    try {
      await discardActiveWorkout();
      setConfirmDiscard(false);
      router.replace('/');
    } finally {
      setDiscarding(false);
    }
  };

  const discardPopup = (
    <Modal
      visible={confirmDiscard}
      animationType="fade"
      transparent
      onRequestClose={() => {
        if (!discarding) setConfirmDiscard(false);
      }}>
      <View style={styles.popupBackdrop}>
        <View
          style={[
            styles.popupCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}>
          <Title style={{ fontSize: 22 }}>Delete this workout?</Title>
          <Subtitle>
            Are you sure you want to delete this workout? It will not be saved.
          </Subtitle>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label="No"
              variant="secondary"
              disabled={discarding}
              onPress={() => setConfirmDiscard(false)}
              style={{ flex: 1 }}
            />
            <Button
              label="Yes"
              variant="danger"
              loading={discarding}
              onPress={() => void confirmDiscardWorkout()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!activeWorkout) {
    return (
      <Screen style={styles.centered}>
        {discarding ? null : (
          <EmptyState
            title="No active workout"
            message="Start a session from the Home tab."
            actionLabel="Go home"
            onAction={() => router.replace('/')}
          />
        )}
        {discardPopup}
      </Screen>
    );
  }

  const phase = workoutPhase(activeWorkout);
  const pending = activeWorkout.pendingExercise ?? null;
  const catalogById = new Map(exercises.map((e) => [e.id, e]));

  const onAddToWorkout = async () => {
    const ok = await commitPendingExercise();
    setCommitHint(!ok);
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const ok = await saveWorkout();
      if (!ok) setCommitHint(true);
    } finally {
      setSaving(false);
    }
  };

  const onFinish = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      const finished = await finishWorkout();
      if (finished) {
        router.replace(`/workout/${finished.id}`);
      }
    } finally {
      setFinishing(false);
    }
  };

  const onEditRow = async (exercise: WorkoutExercise) => {
    if (pending && !pendingSetsAreReady(pending)) {
      setCommitHint(true);
      return;
    }
    await editCommittedExercise(exercise.id);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: activeWorkout.name,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit workout"
              onPress={() => setEditOpen(true)}
              hitSlop={8}
              style={styles.headerEdit}>
              <Ionicons name="pencil" size={18} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {showTimer && elapsed ? (
          <Card style={{ alignItems: 'center', paddingVertical: 20, gap: 4 }}>
            <Muted>Elapsed</Muted>
            <Title
              style={{
                fontSize: 44,
                lineHeight: 50,
                letterSpacing: -1,
                fontVariant: ['tabular-nums'],
              }}>
              {elapsed}
            </Title>
          </Card>
        ) : null}

        {phase === 'review' ? (
          <>
            {activeWorkout.exercises.map((exercise) => (
              <ReviewExerciseCard
                key={exercise.id}
                exercise={exercise}
                equipment={
                  exercise.equipment ?? catalogById.get(exercise.exerciseId)?.equipment
                }
                onToggleSet={(setId, completed) =>
                  void updateSet(exercise.id, setId, { completed })
                }
              />
            ))}
            <View style={{ gap: 10, marginTop: 8 }}>
              <Button
                label="Finish workout"
                loading={finishing}
                onPress={() => void onFinish()}
              />
              <Button label="Discard workout" variant="ghost" onPress={onDiscard} />
            </View>
          </>
        ) : (
          <>
            {activeWorkout.exercises.map((exercise) => (
              <View
                key={exercise.id}
                style={[
                  styles.compactRow,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Body style={{ fontWeight: '700' }}>{exercise.exerciseName}</Body>
                  <Muted>{formatExercisePlan(exercise)}</Muted>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <Pressable onPress={() => void onEditRow(exercise)}>
                    <Muted style={{ color: theme.tint, fontWeight: '600' }}>Edit</Muted>
                  </Pressable>
                  <Pressable
                    onPress={() => void removeExerciseFromActive(exercise.id)}>
                    <Muted style={{ color: theme.danger }}>Remove</Muted>
                  </Pressable>
                </View>
              </View>
            ))}

            {pending ? (
              <Card style={{ gap: 12 }}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Badge label="Now adding" />
                    <Body style={{ fontWeight: '700', fontSize: 17 }}>
                      {pending.exerciseName}
                    </Body>
                    <Muted>
                      {pending.muscleGroup}
                      {pending.equipment ? ` · ${pending.equipment}` : ''}
                    </Muted>
                  </View>
                  <Pressable onPress={() => void cancelPendingExercise()}>
                    <Muted style={{ color: theme.danger }}>Cancel</Muted>
                  </Pressable>
                </View>
                <Subtitle>
                  Fill in sets and reps
                  {usesWeight(pending.equipment, pending.muscleGroup)
                    ? ', and weight if you use load'
                    : '' }
                  . Then add this exercise to the workout.
                </Subtitle>
                <SetEditor
                  sets={pending.sets}
                  showWeight={usesWeight(pending.equipment, pending.muscleGroup)}
                  onChangeSet={(setId, patch) => void updatePendingSet(setId, patch)}
                  onAddSet={() => void addPendingSet()}
                  onRemoveSet={(setId) => void removePendingSet(setId)}
                />
                {commitHint && !pendingSetsAreReady(pending) ? (
                  <Muted style={{ color: theme.danger }}>
                    Enter reps for every set before adding this exercise.
                  </Muted>
                ) : null}
                <Button label="Add to workout" onPress={() => void onAddToWorkout()} />
              </Card>
            ) : (
              <Card style={{ gap: 12 }}>
                {activeWorkout.exercises.length === 0 ? (
                  <>
                    <Body style={{ fontWeight: '700', fontSize: 18 }}>
                      Add your first exercise
                    </Body>
                    <Subtitle>
                      Pick an exercise, fill in sets, reps, and weight, then add it
                      to this workout. Repeat for the next one.
                    </Subtitle>
                  </>
                ) : (
                  <>
                    <Body style={{ fontWeight: '700', fontSize: 18 }}>
                      Next exercise
                    </Body>
                    <Subtitle>
                      This one is in the list. Add another exercise the same way.
                    </Subtitle>
                  </>
                )}
                <Button
                  label="Add exercise"
                  onPress={() => router.push('/workout/add-exercise')}
                />
              </Card>
            )}

            <View style={{ gap: 10, marginTop: 8 }}>
              <Button
                label="Save workout"
                loading={saving}
                disabled={
                  activeWorkout.exercises.length === 0 &&
                  !pendingSetsAreReady(pending)
                }
                onPress={() => void onSave()}
              />
              <Button label="Discard workout" variant="ghost" onPress={onDiscard} />
            </View>
          </>
        )}
      </ScrollView>

      {discardPopup}

      <Modal
        visible={editOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setEditOpen(false)}>
        <View style={styles.popupBackdrop}>
          <View
            style={[
              styles.popupCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}>
            <Title style={{ fontSize: 22 }}>Edit workout</Title>
            <Muted>Workout name</Muted>
            <Input
              value={activeWorkout.name}
              onChangeText={(name) => void renameActiveWorkout(name)}
              placeholder="Workout name"
            />
            {phase === 'review' ? (
              <Button
                label="Edit exercises"
                variant="secondary"
                onPress={() => {
                  setEditOpen(false);
                  void reopenBuilder();
                }}
              />
            ) : (
              <Subtitle>
                Change exercises on this page — add, edit, or remove them, then save.
              </Subtitle>
            )}
            <Button label="Done" onPress={() => setEditOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ReviewExerciseCard({
  exercise,
  equipment,
  onToggleSet,
}: {
  exercise: WorkoutExercise;
  equipment?: WorkoutExercise['equipment'];
  onToggleSet: (setId: string, completed: boolean) => void;
}) {
  const theme = useTheme();
  const showWeight = usesWeight(equipment ?? exercise.equipment, exercise.muscleGroup);
  const done = allSetsComplete(exercise);
  const [expanded, setExpanded] = useState(!done);

  useEffect(() => {
    if (done) setExpanded(false);
    else setExpanded(true);
  }, [done]);

  if (done && !expanded) {
    return (
      <Pressable
        onPress={() => setExpanded(true)}
        style={({ pressed }) => [
          styles.compactRow,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: pressed ? 0.88 : 1,
          },
        ]}>
        <View
          style={[
            styles.doneTick,
            { backgroundColor: theme.success },
          ]}>
          <Ionicons name="checkmark" size={16} color="#FCFBF8" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Body style={{ fontWeight: '700' }}>{exercise.exerciseName}</Body>
          <Muted>{formatExercisePlan(exercise)}</Muted>
        </View>
      </Pressable>
    );
  }

  return (
    <Card style={{ gap: 10 }}>
      <Pressable
        onPress={() => {
          if (done) setExpanded(false);
        }}
        style={styles.rowBetween}>
        <View style={{ flex: 1, gap: 4 }}>
          <Body style={{ fontWeight: '700', fontSize: 17 }}>{exercise.exerciseName}</Body>
          <Muted>
            {exercise.muscleGroup}
            {equipment ? ` · ${equipment}` : ''}
          </Muted>
        </View>
        {done ? (
          <View style={[styles.doneTick, { backgroundColor: theme.success }]}>
            <Ionicons name="checkmark" size={16} color="#FCFBF8" />
          </View>
        ) : null}
      </Pressable>
      {exercise.sets.map((set, index) => (
        <View
          key={set.id}
          style={[
            styles.reviewSet,
            {
              backgroundColor: set.completed ? theme.tintMuted : theme.muted,
              borderColor: set.completed ? theme.success : theme.border,
            },
          ]}>
          <Muted style={{ width: 52 }}>Set {index + 1}</Muted>
          <Body style={{ flex: 1, fontWeight: '600' }}>
            {showWeight ? `${set.weight} kg × ${set.reps} reps` : `${set.reps} reps`}
          </Body>
          <CompleteBox
            checked={set.completed}
            onPress={() => onToggleSet(set.id, !set.completed)}
          />
        </View>
      ))}
    </Card>
  );
}

function CompleteBox({
  checked,
  onPress,
}: {
  checked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const dark = (useColorScheme() ?? 'light') === 'dark';
  const uncheckedBorder = dark ? theme.tint : theme.text;

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={checked ? 'Set complete' : 'Mark set complete'}
      onPress={onPress}
      hitSlop={8}
      style={[
        styles.completeBox,
        {
          borderColor: checked ? theme.success : uncheckedBorder,
          backgroundColor: checked ? theme.success : theme.card,
        },
      ]}>
      {checked ? <Ionicons name="checkmark" size={18} color="#FCFBF8" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerEdit: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  content: {
    padding: 20,
    gap: 14,
    paddingBottom: 48,
  },
  centered: {
    justifyContent: 'center',
    padding: 20,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  compactRow: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewSet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  completeBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,28,28,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  popupCard: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
