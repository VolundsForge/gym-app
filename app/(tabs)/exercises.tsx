import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  Badge,
  Body,
  Button,
  Input,
  Muted,
  Screen,
  Subtitle,
  Title,
  useTheme,
} from '@/components/ui';
import { useWorkouts } from '@/context/WorkoutContext';
import { MUSCLE_GROUPS } from '@/lib/exercises';
import type { MuscleGroup } from '@/types/workout';

export default function ExercisesScreen() {
  const theme = useTheme();
  const { exercises, addCustomExercise, deleteCustomExercise } = useWorkouts();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleGroup | 'All'>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('Full Body');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesQuery = !q || ex.name.toLowerCase().includes(q);
      const matchesGroup = filter === 'All' || ex.muscleGroup === filter;
      return matchesQuery && matchesGroup;
    });
  }, [exercises, query, filter]);

  const onAdd = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Enter an exercise name.');
      return;
    }
    await addCustomExercise(name, muscleGroup);
    setName('');
    setModalOpen(false);
  };

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 8 }}>
            <View style={styles.rowBetween}>
              <Title>Exercises</Title>
              <Button
                label="Add"
                onPress={() => setModalOpen(true)}
                style={{ paddingVertical: 10, paddingHorizontal: 16 }}
              />
            </View>
            <Subtitle>
              Create exercises, open one to see growth over time, or get same-muscle
              alternatives.
            </Subtitle>
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search exercises..."
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <FlatList
              horizontal
              data={['All', ...MUSCLE_GROUPS] as const}
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const selected = filter === item;
                return (
                  <Pressable
                    onPress={() => setFilter(item)}
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
              }}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/exercise/${item.id}`)}
            onLongPress={() => {
              if (!item.isCustom) return;
              Alert.alert('Delete exercise?', `Remove "${item.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => void deleteCustomExercise(item.id),
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
              <Body style={{ fontWeight: '700', flex: 1 }}>{item.name}</Body>
              {item.isCustom ? <Badge label="Custom" /> : null}
            </View>
            <Muted style={{ marginTop: 6 }}>{item.muscleGroup} · tap for progress</Muted>
          </Pressable>
        )}
        ListEmptyComponent={
          <Muted style={{ textAlign: 'center', marginTop: 24 }}>No exercises found.</Muted>
        }
      />

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Title style={{ fontSize: 22 }}>New exercise</Title>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Exercise name"
              autoFocus
            />
            <Muted>Muscle group</Muted>
            <View style={styles.chips}>
              {MUSCLE_GROUPS.map((group) => {
                const selected = muscleGroup === group;
                return (
                  <Pressable
                    key={group}
                    onPress={() => setMuscleGroup(group)}
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
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setModalOpen(false)}
                style={{ flex: 1 }}
              />
              <Button label="Save" onPress={() => void onAdd()} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
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
    gap: 14,
    paddingBottom: 36,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
