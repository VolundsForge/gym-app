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

import {
  Badge,
  Body,
  Button,
  FilterChips,
  Input,
  Muted,
  Screen,
  Subtitle,
  Title,
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  SECONDARY_MUSCLE_GROUPS,
  exerciseListRows,
  normalizeEquipment,
} from '@/lib/exercises';
import type { Equipment, MuscleGroup } from '@/types/workout';

export default function ExercisesScreen() {
  const theme = useTheme();
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesQuery = !q || ex.name.toLowerCase().includes(q);
      const matchesGroup = ex.muscleGroup === filter;
      const matchesEquipment =
        equipmentFilter === 'All' ||
        normalizeEquipment(ex.equipment) === equipmentFilter;
      return matchesQuery && matchesGroup && matchesEquipment;
    });
  }, [exercises, query, filter, equipmentFilter]);

  const rows = useMemo(
    () => exerciseListRows(filtered, equipmentFilter === 'All'),
    [filtered, equipmentFilter]
  );

  const onAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter an exercise name.');
      return;
    }
    await addCustomExercise(name, muscleGroup, secondaryMuscleGroups, equipment);
    setName('');
    setMuscleGroup('Full Body');
    setEquipment('Barbell / Dumbbell');
    setSecondaryMuscleGroups([]);
    setModalOpen(false);
  };

  const closeModal = () => {
    setModalOpen(false);
    setName('');
    setMuscleGroup('Full Body');
    setEquipment('Barbell / Dumbbell');
    setSecondaryMuscleGroups([]);
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
            <Title>Exercises</Title>
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
              {EQUIPMENT_TYPES.map((item) => {
                const selected = equipment === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setEquipment(item)}
                    style={{
                      backgroundColor: selected ? theme.tint : theme.muted,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                    }}>
                    <Body
                      style={{
                        color: selected ? '#fff' : theme.text,
                        fontSize: 13,
                        fontWeight: '600',
                      }}>
                      {item}
                    </Body>
                  </Pressable>
                );
              })}
            </View>
            <Muted>Primary muscle</Muted>
            <Subtitle>
              The main body part this exercise is for — used for categories and
              alternatives.
            </Subtitle>
            <View style={styles.chips}>
              {MUSCLE_GROUPS.map((group) => {
                const selected = muscleGroup === group;
                return (
                  <Pressable
                    key={group}
                    onPress={() => {
                      setMuscleGroup(group);
                      setSecondaryMuscleGroups((current) =>
                        current.filter((g) => g !== group)
                      );
                    }}
                    style={{
                      backgroundColor: selected ? theme.tint : theme.muted,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 999,
                    }}>
                    <Body
                      style={{
                        color: selected ? '#fff' : theme.text,
                        fontSize: 13,
                        fontWeight: '600',
                      }}>
                      {group}
                    </Body>
                  </Pressable>
                );
              })}
            </View>
            <Muted>Also trained (optional)</Muted>
            <Subtitle>
              Other muscles this hits along the way. Skip if it is an isolation
              move.
            </Subtitle>
            <View style={styles.chips}>
              {SECONDARY_MUSCLE_GROUPS.filter((group) => group !== muscleGroup).map(
                (group) => {
                  const selected = secondaryMuscleGroups.includes(group);
                  return (
                    <Pressable
                      key={group}
                      onPress={() => toggleSecondary(group)}
                      style={{
                        backgroundColor: selected ? theme.tint : theme.muted,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 999,
                        opacity: selected ? 1 : 0.9,
                      }}>
                      <Body
                        style={{
                          color: selected ? '#fff' : theme.text,
                          fontSize: 13,
                          fontWeight: '600',
                        }}>
                        {group}
                      </Body>
                    </Pressable>
                  );
                }
              )}
            </View>
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
          { backgroundColor: theme.tint, opacity: pressed ? 0.85 : 1 },
        ]}>
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
