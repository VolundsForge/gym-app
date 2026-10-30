import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { CardioTimer } from '@/components/cardio-timer';
import { HeaderNotes } from '@/components/expandable-notes';
import { GrowthTipsReview } from '@/components/growth-tips-review';
import { SetEditor } from '@/components/workout-sets';
import { Radius, Typeface } from '@/constants/Colors';
import { useSettings } from '@/context/SettingsContext';
import { formatWeight } from '@/lib/weight';
import { useWorkouts } from '@/context/WorkoutContext';
import { useElapsedClock } from '@/hooks/useElapsedClock';
import {
  allSetsComplete,
  formatExercisePlan,
  isComposingWorkout,
  isTimedExercise,
  isEmptyDraftWorkout,
  nextGenericWorkoutName,
  pendingSetsAreReady,
  exerciseUsesWeight,
  usesWeight,
  workoutAllSetsComplete,
  workoutHasCompletedSets,
  workoutPhase,
} from '@/lib/workout-plan';
import type { ProgressiveSuggestion } from '@/lib/suggestions';
import type { WorkoutExercise } from '@/types/workout';

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { timerEnabled, weightUnit } = useSettings();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const dialogWidth = Math.min(400, Math.max(280, windowWidth - 48));
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
    updateExerciseNotes,
    startCardioTimer,
    pauseCardioTimer,
    resetCardioTimer,
    setCardioComplete,
    saveWorkout,
    reopenBuilder,
    finishWorkout,
    suggestionsForWorkout,
    applyExerciseNextPlans,
    delayGrowthTips,
    cancelActiveWorkout,
    discardActiveWorkout,
    exercises,
    workouts,
    templates,
  } = useWorkouts();

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [cancelKeepsSets, setCancelKeepsSets] = useState(false);
  const [cancelIsCompose, setCancelIsCompose] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [finishAllDone, setFinishAllDone] = useState(false);
  const [finishKeepsSets, setFinishKeepsSets] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [growthTips, setGrowthTips] = useState<ProgressiveSuggestion[] | null>(
    null
  );
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

  const composing = isComposingWorkout(activeWorkout);
  const showTimer =
    timerEnabled &&
    !!activeWorkout &&
    !composing &&
    !isEmptyDraftWorkout(activeWorkout);
  const elapsed = useElapsedClock(activeWorkout?.startedAt, showTimer);

  const onCancelWorkout = () => {
    setEditOpen(false);
    setCancelKeepsSets(workoutHasCompletedSets(activeRef.current));
    setCancelIsCompose(isComposingWorkout(activeRef.current));
    setConfirmDiscard(true);
  };

  const confirmCancelWorkout = async () => {
    if (discarding) return;
    setDiscarding(true);
    try {
      await cancelActiveWorkout();
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
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              width: dialogWidth,
              maxWidth: dialogWidth,
            },
          ]}>
          <Title style={{ fontSize: 22 }}>
            {cancelIsCompose ? 'Discard this workout?' : 'Cancel this workout?'}
          </Title>
          <Subtitle>
            {cancelIsCompose
              ? 'It will not be added to My Workouts.'
              : cancelKeepsSets
                ? 'Work you have ticked off will be saved to your history. Everything else will be dropped.'
                : 'Nothing is ticked off, so this workout will not be saved.'}
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
              onPress={() => void confirmCancelWorkout()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const goHome = () => {
    setCelebrating(false);
    setGrowthTips(null);
    router.replace('/');
  };

  const onCelebrationContinue = () => {
    setCelebrating(false);
    if (growthTips && growthTips.length > 0) return;
    goHome();
  };

  const growthReview = (
    <GrowthTipsReview
      visible={!celebrating && !!growthTips && growthTips.length > 0}
      suggestions={growthTips ?? []}
      catalog={exercises}
      onDelay={(extra) => {
        if (growthTips) void delayGrowthTips(growthTips, extra);
        goHome();
      }}
      onApply={(plans) => {
        void applyExerciseNextPlans(plans);
        goHome();
      }}
    />
  );

  if (!activeWorkout) {
    return (
      <Screen style={styles.centered}>
        {discarding || saving || celebrating || growthTips ? null : (
          <EmptyState
            title="No active workout"
            message="Start a session from the Home tab."
            actionLabel="Go home"
            onAction={() => router.replace('/')}
          />
        )}
        {discardPopup}
        <WorkoutDoneCelebration
          visible={celebrating}
          continueLabel={growthTips?.length ? 'Continue' : 'Back to home'}
          onContinue={onCelebrationContinue}
        />
        {growthReview}
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
      const wasComposing = isComposingWorkout(activeRef.current);
      const ok = await saveWorkout();
      if (!ok) {
        setCommitHint(true);
        return;
      }
      if (wasComposing) {
        router.replace('/');
        return;
      }
    } finally {
      setSaving(false);
    }
  };

  const onFinish = () => {
    const current = activeRef.current;
    setFinishAllDone(workoutAllSetsComplete(current));
    setFinishKeepsSets(workoutHasCompletedSets(current));
    setConfirmFinish(true);
  };

  const confirmFinishWorkout = async () => {
    if (finishing) return;
    setFinishing(true);
    try {
      const finished = await finishWorkout();
      setConfirmFinish(false);
      if (finished) {
        const tips = suggestionsForWorkout(finished);
        setGrowthTips(tips.length > 0 ? tips : null);
        setCelebrating(true);
      } else {
        router.replace('/');
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
          title: composing ? 'New workout' : activeWorkout.name,
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {composing ? (
          <Card style={{ gap: 8 }}>
            <Muted>Name</Muted>
            <Input
              value={activeWorkout.name}
              onChangeText={(name) => void renameActiveWorkout(name)}
              placeholder={nextGenericWorkoutName([
                ...workouts.map((item) => item.name),
                ...templates.map((item) => item.name),
              ])}
              accessibilityLabel="Workout name"
              autoCapitalize="sentences"
            />
          </Card>
        ) : null}

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
                  catalogById.get(exercise.exerciseId)?.equipment ?? exercise.equipment
                }
                onToggleSet={(setId, completed) =>
                  void updateSet(exercise.id, setId, { completed })
                }
                onNotesChange={(notes) =>
                  void updateExerciseNotes(exercise.id, notes)
                }
                onStartTimer={() => void startCardioTimer(exercise.id)}
                onPauseTimer={() => void pauseCardioTimer(exercise.id)}
                onResetTimer={() => void resetCardioTimer(exercise.id)}
                onToggleCardio={(completed) =>
                  void setCardioComplete(exercise.id, completed)
                }
              />
            ))}
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
                  <Muted>{formatExercisePlan(exercise, weightUnit, exercises)}</Muted>
                  {exercise.notes ? (
                    <Muted numberOfLines={2}>{exercise.notes}</Muted>
                  ) : null}
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
                <HeaderNotes
                  key={pending.id}
                  value={pending.notes ?? ''}
                  onChange={(text) => void updateExerciseNotes(pending.id, text)}
                  title={
                    <>
                      <Badge label="Now adding" />
                      <Body style={{ fontWeight: '700', fontSize: 17 }}>
                        {pending.exerciseName}
                      </Body>
                      <Muted>
                        {pending.muscleGroup}
                        {pending.equipment ? ` · ${pending.equipment}` : ''}
                      </Muted>
                    </>
                  }
                />
                {isTimedExercise(pending) ? (
                  composing ? (
                    <Subtitle>
                      This one is timed when you perform the workout. Add it to the
                      list, then start the workout from Home when you are ready.
                    </Subtitle>
                  ) : (
                    <>
                      <Subtitle>
                        Time this exercise while you work. Notes can hold extra
                        details.
                      </Subtitle>
                      <CardioTimer
                        exercise={pending}
                        onStart={() => void startCardioTimer(pending.id)}
                        onPause={() => void pauseCardioTimer(pending.id)}
                        onReset={() => void resetCardioTimer(pending.id)}
                      />
                      <View style={styles.rowBetween}>
                        <Muted style={{ flex: 1 }}>Tick when you are done</Muted>
                        <CompleteBox
                          checked={!!pending.completed}
                          onPress={() =>
                            void setCardioComplete(pending.id, !pending.completed)
                          }
                        />
                      </View>
                    </>
                  )
                ) : (
                  <>
                    <Subtitle>
                      Fill in sets and reps
                      {exerciseUsesWeight(pending, catalogById)
                        ? ', and weight if you use load'
                        : ''}
                      . Then add this exercise to the workout.
                    </Subtitle>
                    <SetEditor
                      sets={pending.sets}
                      showWeight={exerciseUsesWeight(pending, catalogById)}
                      onChangeSet={(setId, patch) =>
                        void updatePendingSet(setId, patch)
                      }
                      onAddSet={() => void addPendingSet()}
                      onRemoveSet={(setId) => void removePendingSet(setId)}
                    />
                    {commitHint && !pendingSetsAreReady(pending) ? (
                      <Muted style={{ color: theme.danger }}>
                        Enter reps for every set before adding this exercise.
                      </Muted>
                    ) : null}
                  </>
                )}
                <Button label="Add to workout" onPress={() => void onAddToWorkout()} />
                <Button
                  label="Cancel"
                  variant="ghost"
                  onPress={() => void cancelPendingExercise()}
                />
              </Card>
            ) : (
              <>
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
                <View style={{ gap: 10, marginTop: 8 }}>
                  <Button
                    label={composing ? 'Save to My Workouts' : 'Save workout'}
                    loading={saving}
                    disabled={activeWorkout.exercises.length === 0}
                    onPress={() => void onSave()}
                  />
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {phase === 'review' ? (
        <View
          style={[
            styles.finishBar,
            { paddingBottom: Math.max(insets.bottom, 12) + 28 },
          ]}>
          <FinishWorkoutButton
            complete={workoutAllSetsComplete(activeWorkout)}
            loading={finishing}
            onPress={onFinish}
          />
        </View>
      ) : null}

      {discardPopup}
      <WorkoutDoneCelebration
        visible={celebrating}
        continueLabel={growthTips?.length ? 'Continue' : 'Back to home'}
        onContinue={onCelebrationContinue}
      />
      {growthReview}

      <Modal
        visible={confirmFinish}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!finishing) setConfirmFinish(false);
        }}>
        <View style={styles.popupBackdrop}>
          <View
            style={[
              styles.popupCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                width: dialogWidth,
                maxWidth: dialogWidth,
              },
            ]}>
            <Title style={{ fontSize: 22 }}>Finish this workout?</Title>
            <Subtitle>
              {finishAllDone
                ? 'Are you sure you want to finish and save your progress?'
                : finishKeepsSets
                  ? 'Are you sure you want to finish? Only work you have ticked off will be saved.'
                  : 'Nothing is ticked off, so this workout will not be saved.'}
            </Subtitle>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="No"
                variant="secondary"
                disabled={finishing}
                onPress={() => setConfirmFinish(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Yes"
                loading={finishing}
                onPress={() => void confirmFinishWorkout()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={editOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setEditOpen(false)}>
        <View style={styles.popupBackdrop}>
          <View
            style={[
              styles.popupCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                width: dialogWidth,
                maxWidth: dialogWidth,
              },
            ]}>
            <Title style={{ fontSize: 22 }}>Edit workout</Title>
            {composing ? null : (
              <>
                <Muted>Workout name</Muted>
                <Input
                  value={activeWorkout.name}
                  onChangeText={(name) => void renameActiveWorkout(name)}
                  placeholder="Workout name"
                />
              </>
            )}
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
                {composing
                  ? 'Add, edit, or remove exercises on this page, then save to My Workouts.'
                  : 'Change exercises on this page — add, edit, or remove them, then save.'}
              </Subtitle>
            )}
            <Button label="Done" onPress={() => setEditOpen(false)} />
            <Button
              label={composing ? 'Discard workout' : 'Cancel workout'}
              variant="ghost"
              onPress={onCancelWorkout}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const SPARK_ANGLES = [18, 62, 110, 158, 205, 248, 295, 338];

function WorkoutDoneCelebration({
  visible,
  continueLabel = 'Back to home',
  onContinue,
}: {
  visible: boolean;
  continueLabel?: string;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const dialogWidth = Math.min(400, Math.max(280, windowWidth - 48));
  const scale = useRef(new Animated.Value(0.5)).current;
  const burst = useRef(SPARK_ANGLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.5);
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
    burst.forEach((value, index) => {
      value.setValue(0);
      Animated.timing(value, {
        toValue: 1,
        duration: 720,
        delay: 40 * index,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [burst, scale, visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onContinue}>
      <View style={styles.popupBackdrop}>
        <View
          style={[
            styles.popupCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              width: dialogWidth,
              maxWidth: dialogWidth,
              alignItems: 'center',
            },
          ]}>
          <View style={styles.celebrateBurst}>
            {SPARK_ANGLES.map((angle, index) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <Animated.View
                  key={angle}
                  style={[
                    styles.celebrateSpark,
                    {
                      backgroundColor: index % 2 === 0 ? theme.tint : theme.success,
                      opacity: burst[index].interpolate({
                        inputRange: [0, 0.2, 1],
                        outputRange: [0, 1, 0],
                      }),
                      transform: [
                        {
                          translateX: burst[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.cos(rad) * 42],
                          }),
                        },
                        {
                          translateY: burst[index].interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.sin(rad) * 42],
                          }),
                        },
                        {
                          scale: burst[index].interpolate({
                            inputRange: [0, 0.3, 1],
                            outputRange: [0.4, 1, 0.2],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              );
            })}
            <Animated.View
              style={[
                styles.celebrateBadge,
                { backgroundColor: theme.success, transform: [{ scale }] },
              ]}>
              <Ionicons name="checkmark" size={36} color="#FCFBF8" />
            </Animated.View>
          </View>
          <Title style={{ fontSize: 24, textAlign: 'center' }}>Nice work</Title>
          <Subtitle style={{ textAlign: 'center' }}>
            Workout saved. Find the details in History whenever you want them.
          </Subtitle>
          <Button label={continueLabel} onPress={onContinue} />
        </View>
      </View>
    </Modal>
  );
}

function FinishWorkoutButton({
  complete,
  loading,
  onPress,
}: {
  complete: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const dark = (useColorScheme() ?? 'light') === 'dark';
  const finishGreen = dark ? '#3DB862' : '#2E9B4F';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Finish workout"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.finishButton,
        complete
          ? {
              backgroundColor: finishGreen,
              borderColor: dark ? '#8BE49A' : '#6FD484',
            }
          : {
              backgroundColor: theme.primary,
              borderColor: theme.primary,
            },
        { opacity: loading ? 0.7 : pressed ? 0.9 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={complete || dark ? '#FCFBF8' : theme.onPrimary} />
      ) : (
        <RNText
          style={{
            color: complete ? '#FCFBF8' : theme.onPrimary,
            fontSize: 20,
            fontWeight: '700',
            letterSpacing: -0.3,
            ...(Platform.OS === 'web' ? { fontFamily: Typeface.web } : null),
          }}>
          Finish workout
        </RNText>
      )}
    </Pressable>
  );
}

function ReviewExerciseCard({
  exercise,
  equipment,
  onToggleSet,
  onNotesChange,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onToggleCardio,
}: {
  exercise: WorkoutExercise;
  equipment?: WorkoutExercise['equipment'];
  onToggleSet: (setId: string, completed: boolean) => void;
  onNotesChange: (notes: string) => void;
  onStartTimer: () => void;
  onPauseTimer: () => void;
  onResetTimer: () => void;
  onToggleCardio: (completed: boolean) => void;
}) {
  const theme = useTheme();
  const { weightUnit } = useSettings();
  const resolvedEquipment = equipment ?? exercise.equipment;
  const showWeight = usesWeight(resolvedEquipment, exercise.muscleGroup);
  const cardio = isTimedExercise(exercise);
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
        <View style={{ flex: 1, gap: 2 }}>
          <Body style={{ fontWeight: '700' }}>{exercise.exerciseName}</Body>
          <Muted>
            {formatExercisePlan(
              { ...exercise, equipment: resolvedEquipment },
              weightUnit
            )}
          </Muted>
          {exercise.notes ? (
            <Muted numberOfLines={2}>{exercise.notes}</Muted>
          ) : null}
        </View>
        <View
          style={[
            styles.doneTick,
            { backgroundColor: theme.success },
          ]}>
          <Ionicons name="checkmark" size={16} color="#FCFBF8" />
        </View>
      </Pressable>
    );
  }

  return (
    <Card style={{ gap: 10 }}>
      <HeaderNotes
        value={exercise.notes ?? ''}
        onChange={onNotesChange}
        title={
          <Pressable
            onPress={() => {
              if (done) setExpanded(false);
            }}
            style={{ gap: 4 }}>
            <Body style={{ fontWeight: '700', fontSize: 17 }}>
              {exercise.exerciseName}
            </Body>
            <Muted>
              {exercise.muscleGroup}
              {equipment ? ` · ${equipment}` : ''}
            </Muted>
          </Pressable>
        }
        trailing={
          done ? (
            <Pressable onPress={() => setExpanded(false)}>
              <View style={[styles.doneTick, { backgroundColor: theme.success }]}>
                <Ionicons name="checkmark" size={16} color="#FCFBF8" />
              </View>
            </Pressable>
          ) : null
        }
      />
      {cardio ? (
        <>
          <CardioTimer
            exercise={exercise}
            onStart={onStartTimer}
            onPause={onPauseTimer}
            onReset={onResetTimer}
          />
          <View style={styles.rowBetween}>
            <Muted style={{ flex: 1 }}>Tick when you are done</Muted>
            <CompleteBox
              checked={!!exercise.completed}
              onPress={() => onToggleCardio(!exercise.completed)}
            />
          </View>
        </>
      ) : (
        exercise.sets.map((set, index) => (
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
              {showWeight
                ? `${formatWeight(set.weight, weightUnit)} × ${set.reps} reps`
                : `${set.reps} reps`}
            </Body>
            <CompleteBox
              checked={set.completed}
              onPress={() => onToggleSet(set.id, !set.completed)}
            />
          </View>
        ))
      )}
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
    paddingVertical: 20,
    gap: 14,
    paddingBottom: 48,
  },
  finishBar: {
    alignItems: 'center',
    paddingTop: 16,
  },
  finishButton: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
    elevation: 6,
  },
  celebrateBurst: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  celebrateSpark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  celebrateBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,28,28,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupCard: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'center',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
});
