import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ExpandableNotes, NotesIconButton } from '@/components/expandable-notes';
import {
  Badge,
  Body,
  Button,
  Chip,
  FilterChips,
  Input,
  Muted,
  Screen,
  Subtitle,
  Title,
  useScreenGutter,
  useTheme,
} from '@/components/ui';
import { Radius } from '@/constants/Colors';
import { useWorkouts } from '@/context/WorkoutContext';
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  SECONDARY_MUSCLE_GROUPS,
  exerciseListRows,
  filterExerciseCatalog,
  normalizeEquipment,
  unusedEquipmentForMuscle,
} from '@/lib/exercises';
import type { Equipment, MuscleGroup } from '@/types/workout';

export default function ExercisesScreen() {
  const theme = useTheme();
  const gutter = useScreenGutter();
  const { exercises, addCustomExercise, deleteCustomExercise } = useWorkouts();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup>('Chest');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | 'All'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('Full Body');
  const [equipment, setEquipment] = useState<Equipment>('Barbell / Dumbbell');
  const [secondaryMuscleGroups, setSecondaryMuscleGroups] = useState<
    MuscleGroup[]
  >([]);
  const [notes, setNotes] = useState('');

  const filtered = useMemo(
    () => filterExerciseCatalog(exercises, query, filter, equipmentFilter),
    [exercises, query, filter, equipmentFilter]
  );

  const rows = useMemo(
    () => exerciseListRows(filtered, equipmentFilter === 'All'),
    [filtered, equipmentFilter]
  );
  const unusedForFilter = useMemo(
    () => unusedEquipmentForMuscle(exercises, filter),
    [exercises, filter]
  );
  const unusedForModal = useMemo(
    () => unusedEquipmentForMuscle(exercises, muscleGroup),
    [exercises, muscleGroup]
  );

  const resetForm = () => {
    setName('');
    setMuscleGroup('Full Body');
    setEquipment('Barbell / Dumbbell');
    setSecondaryMuscleGroups([]);
    setNotes('');
  };

  const onAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter an exercise name.');
      return;
    }
    await addCustomExercise(
      name,
      muscleGroup,
      secondaryMuscleGroups,
      equipment,
      notes
    );
    resetForm();
    setModalOpen(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const toggleSecondary = (group: MuscleGroup) => {
    setSecondaryMuscleGroups((current) =>
      current.includes(group)
        ? current.filter((g) => g !== group)
        : [...current, group]
    );
  };

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <Subtitle>
              Filter by muscle or equipment — useful on the road when you only have
              bodyweight, or at a gym with machines.
            </Subtitle>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises..."
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <Muted>Muscle</Muted>
            <FilterChips
              options={MUSCLE_GROUPS}
              value={filter}
              onChange={setFilter}
            />
            <Muted>Equipment</Muted>
            <FilterChips
              options={['All', ...EQUIPMENT_TYPES] as const}
              value={equipmentFilter}
              onChange={setEquipmentFilter}
              inactiveOptions={unusedForFilter}
            />
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <Muted style={{ marginTop: 8, marginBottom: 6, fontWeight: '700' }}>
                {item.title}
              </Muted>
            );
          }

          const exercise = item.exercise;
          return (
            <Pressable
              onPress={() => router.push(`/exercise/${exercise.id}`)}
              onLongPress={() => {
                if (!exercise.isCustom) return;
                Alert.alert('Delete exercise?', `Remove "${exercise.name}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => void deleteCustomExercise(exercise.id),
                  },
                ]);
              }}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <View style={styles.rowBetween}>
                <Body style={{ fontWeight: '700', flex: 1 }}>{exercise.name}</Body>
                <NotesIconButton
                  compact
                  hasContent={!!exercise.notes?.trim()}
                  onPress={() => router.push(`/exercise/${exercise.id}`)}
                />
                {exercise.isCustom ? <Badge label="Custom" /> : null}
              </View>
              <Muted style={{ marginTop: 6 }}>
                {exercise.muscleGroup} · {normalizeEquipment(exercise.equipment)}
              </Muted>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Muted style={{ textAlign: 'center', marginTop: 24 }}>No exercises found.</Muted>
        }
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 14, paddingBottom: 8 }}>
            <Title style={{ fontSize: 22 }}>New exercise</Title>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Exercise name"
              autoFocus
            />
            <Muted>Equipment</Muted>
            <Subtitle>
              Machine, free weights, or bodyweight — so you can filter later when
              traveling.
            </Subtitle>
            <View style={styles.chips}>
              {EQUIPMENT_TYPES.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  selected={equipment === item}
                  inactive={unusedForModal.includes(item)}
                  onPress={() => setEquipment(item)}
                />
              ))}
            </View>
            <Muted>Primary muscle</Muted>
            <Subtitle>
              The main body part this exercise is for — used for categories and
              alternatives.
            </Subtitle>
            <View style={styles.chips}>
              {MUSCLE_GROUPS.map((group) => (
                <Chip
                  key={group}
                  label={group}
                  selected={muscleGroup === group}
                  onPress={() => {
                    setMuscleGroup(group);
                    setSecondaryMuscleGroups((current) =>
                      current.filter((g) => g !== group)
                    );
                  }}
                />
              ))}
            </View>
            <Muted>Secondary (optional)</Muted>
            <Subtitle>
              Other muscles this hits along the way. Skip if it is an isolation
              move.
            </Subtitle>
            <View style={styles.chips}>
              {SECONDARY_MUSCLE_GROUPS.filter((group) => group !== muscleGroup).map(
                (group) => (
                  <Chip
                    key={group}
                    label={group}
                    selected={secondaryMuscleGroups.includes(group)}
                    onPress={() => toggleSecondary(group)}
                  />
                )
              )}
            </View>
            <ExpandableNotes value={notes} onChange={setNotes} />
            {muscleGroup === 'Cardio' ? (
              <Subtitle>
                Cardio is timed in the workout. Notes can hold machine program,
                incline, or pace.
              </Subtitle>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={closeModal}
                style={{ flex: 1 }}
              />
              <Button label="Save" onPress={() => void onAdd()} style={{ flex: 1 }} />
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add exercise"
        onPress={() => setModalOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          {
            right: gutter,
            backgroundColor: theme.tint,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Ionicons name="add" size={32} color={theme.onTint} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 20,
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    right: 0,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    boxShadow: '0 8px 20px rgba(229,106,18,0.32)',
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,28,28,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
