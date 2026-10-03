import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Body,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Muted,
  Screen,
  Subtitle,
  useTheme,
} from '@/components/ui';
import { Radius } from '@/constants/Colors';
import { useWorkouts } from '@/context/WorkoutContext';
import { formatDate, formatDuration } from '@/lib/stats';
import { isEmptyDraftWorkout, isLoggedWorkout, workoutPhase } from '@/lib/workout-plan';
import type { WorkoutTemplate } from '@/types/workout';

export default function HomeScreen() {
  const theme = useTheme();
  const {
    ready,
    workouts,
    activeWorkout,
    startWorkout,
    startFromTemplate,
    templates,
    progressiveSuggestions,
    dismissSuggestion,
  } = useWorkouts();
  const [pendingTemplate, setPendingTemplate] = useState<WorkoutTemplate | null>(
    null
  );

  if (!ready) {
    return (
      <Screen style={styles.centered}>
        <ActivityIndicator color={theme.tint} size="large" />
      </Screen>
    );
  }

  const logged = workouts.filter(isLoggedWorkout);
  const recent = logged.slice(0, 3);
  const tip = progressiveSuggestions[0];

  const inProgress =
    !!activeWorkout && !isEmptyDraftWorkout(activeWorkout);

  const onStart = () => {
    if (inProgress) {
      router.push('/workout/active');
      return;
    }
    if (!activeWorkout) startWorkout();
    router.push('/workout/active');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Subtitle>
            Log sets and reps. Watch your growth. Get a nudge when you’re ready for a
            little more.
          </Subtitle>
        </View>

        {templates.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Body style={{ fontWeight: '700', fontSize: 18 }}>My Workouts</Body>
            </View>
            {inProgress ? (
              <Muted>
                Finish or discard the current workout to start one of these.
              </Muted>
            ) : null}
            <View style={{ gap: 8 }}>
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  disabled={inProgress}
                  onStart={() => setPendingTemplate(template)}
                />
              ))}
            </View>
          </>
        ) : null}

        {inProgress ? (
          <Card
            style={{
              gap: 12,
              borderColor: theme.tint,
              borderWidth: 1,
              backgroundColor: theme.tintMuted,
            }}>
            <Badge label="In progress" />
            <Body style={{ fontWeight: '700', fontSize: 18 }}>{activeWorkout.name}</Body>
            <Muted>
              Started {formatDate(activeWorkout.startedAt)} ·{' '}
              {activeWorkout.exercises.length} exercise
              {activeWorkout.exercises.length === 1 ? '' : 's'}
              {workoutPhase(activeWorkout) === 'review' ? ' · ready to finish' : ''}
            </Muted>
            <Button
              label={
                workoutPhase(activeWorkout) === 'review'
                  ? 'Review & finish'
                  : 'Continue workout'
              }
              onPress={() => router.push('/workout/active')}
            />
          </Card>
        ) : (
          <Card style={{ gap: 12 }}>
            <Body style={{ fontWeight: '700', fontSize: 18 }}>Ready to train?</Body>
            <Subtitle>
              Create your session, log sets and reps, and save progress that motivates
              you over time.
            </Subtitle>
            <Button label="Create new workout" onPress={onStart} />
          </Card>
        )}

        {tip ? (
          <Card
            style={{
              gap: 10,
              borderColor: theme.tint,
              borderWidth: 1,
              backgroundColor: theme.tintMuted,
            }}>
            <Badge label="Strive for more" />
            <Body style={{ fontWeight: '700', fontSize: 18 }}>{tip.title}</Body>
            <Subtitle>{tip.message}</Subtitle>
            <View style={styles.rowBetween}>
              <Muted>Recent: {tip.currentLabel}</Muted>
              <Body style={{ fontWeight: '700', color: theme.tint }}>
                Try: {tip.targetLabel}
              </Body>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="View exercise"
                variant="secondary"
                onPress={() => router.push(`/exercise/${tip.exerciseId}`)}
                style={{ flex: 1 }}
              />
              <Button
                label="Dismiss"
                variant="ghost"
                onPress={() => void dismissSuggestion(tip.id)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        ) : null}

        <View style={styles.sectionHeader}>
          <Body style={{ fontWeight: '700', fontSize: 18 }}>Recent workouts</Body>
        </View>

        {recent.length === 0 ? (
          <EmptyState
            title="No workouts yet"
            message="Finish a session and your history becomes the fuel for growth charts and smart tips."
            actionLabel={inProgress ? 'Continue workout' : 'Start first workout'}
            onAction={onStart}
          />
        ) : (
          <>
            {recent.map((workout) => {
              const sets = workout.exercises.reduce(
                (n, ex) => n + ex.sets.filter((s) => s.completed).length,
                0
              );
              return (
                <Card key={workout.id} style={{ gap: 6 }}>
                  <View style={styles.rowBetween}>
                    <Body style={{ fontWeight: '700', flex: 1 }}>{workout.name}</Body>
                    <Muted>{formatDate(workout.finishedAt ?? workout.startedAt)}</Muted>
                  </View>
                  <Muted>
                    {workout.exercises.length} exercises · {sets} sets ·{' '}
                    {formatDuration(workout.startedAt, workout.finishedAt)}
                  </Muted>
                  <Button
                    label="View details"
                    variant="secondary"
                    onPress={() => router.push(`/workout/${workout.id}`)}
                    style={{ marginTop: 8 }}
                  />
                </Card>
              );
            })}
            <Pressable
              onPress={() => router.push('/history')}
              hitSlop={6}
              style={{ paddingVertical: 4 }}>
              <Muted style={{ color: theme.tint, fontWeight: '600' }}>
                {logged.length > 3
                  ? 'See all workouts in History'
                  : 'Open History'}
              </Muted>
            </Pressable>
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={!!pendingTemplate}
        title="Start this workout?"
        message={
          pendingTemplate
            ? `Are you sure you want to start ${pendingTemplate.name}?`
            : ''
        }
        onCancel={() => setPendingTemplate(null)}
        onConfirm={() => {
          if (!pendingTemplate) return;
          const template = pendingTemplate;
          setPendingTemplate(null);
          startFromTemplate(template);
          router.push('/workout/active');
        }}
      />
    </Screen>
  );
}

function TemplateCard({
  template,
  disabled,
  onStart,
}: {
  template: WorkoutTemplate;
  disabled: boolean;
  onStart: () => void;
}) {
  const theme = useTheme();
  const preview = template.exercises
    .slice(0, 3)
    .map((ex) => ex.exerciseName)
    .join(' · ');
  const extra =
    template.exercises.length > 3 ? ` +${template.exercises.length - 3}` : '';

  return (
    <View
      style={[
        styles.templateRow,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: disabled ? 0.55 : 1,
        },
      ]}>
      <View style={{ flex: 1, gap: 2, paddingRight: 8 }}>
        <Body style={{ fontWeight: '700' }}>{template.name}</Body>
        <Muted numberOfLines={1}>
          {template.exercises.length} exercise
          {template.exercises.length === 1 ? '' : 's'}
          {preview ? ` · ${preview}${extra}` : ''}
        </Muted>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start ${template.name}`}
        disabled={disabled}
        onPress={onStart}
        hitSlop={6}
        style={({ pressed }) => [
          styles.playButton,
          {
            backgroundColor: theme.primary,
            opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}>
        <Ionicons
          name="play"
          size={18}
          color={theme.onPrimary}
          style={{ marginLeft: 2 }}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  header: {
    gap: 6,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
