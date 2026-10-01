import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Body, Button, Muted, useTheme } from '@/components/ui';
import { Radius } from '@/constants/Colors';
import type { SetEntry } from '@/types/workout';

export function SetEditor({
  sets,
  showWeight,
  onChangeSet,
  onAddSet,
  onRemoveSet,
}: {
  sets: SetEntry[];
  showWeight: boolean;
  onChangeSet: (setId: string, patch: Partial<Pick<SetEntry, 'reps' | 'weight'>>) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.setHeader}>
        <Muted style={styles.colSet}>SET</Muted>
        {showWeight ? <Muted style={styles.colNum}>KG</Muted> : null}
        <Muted style={styles.colNum}>REPS</Muted>
        <Muted style={styles.colDone}> </Muted>
      </View>

      {sets.map((set, index) => (
        <View key={set.id} style={styles.setRow}>
          <Body style={[styles.colSet, { fontWeight: '700' }]}>{index + 1}</Body>
          {showWeight ? (
            <NumberField
              value={set.weight}
              onChange={(weight) => onChangeSet(set.id, { weight })}
              style={styles.colNum}
            />
          ) : null}
          <NumberField
            value={set.reps}
            onChange={(reps) => onChangeSet(set.id, { reps })}
            style={styles.colNum}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove set"
            disabled={sets.length <= 1}
            onPress={() => onRemoveSet(set.id)}
            style={[
              styles.removeSet,
              {
                backgroundColor: theme.muted,
                borderColor: theme.border,
                opacity: sets.length <= 1 ? 0.4 : 1,
              },
            ]}>
            <Muted style={{ fontWeight: '700' }}>–</Muted>
          </Pressable>
        </View>
      ))}

      <Button label="+ Add set" variant="secondary" onPress={onAddSet} />
    </View>
  );
}

function NumberField({
  value,
  onChange,
  style,
}: {
  value: number;
  onChange: (n: number) => void;
  style?: object;
}) {
  const theme = useTheme();
  return (
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
      style={[
        {
          backgroundColor: theme.muted,
          color: theme.text,
          borderRadius: Radius.sm,
          paddingVertical: 8,
          paddingHorizontal: 8,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: '600',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colSet: {
    width: 36,
    textAlign: 'center',
  },
  colNum: {
    flex: 1,
  },
  colDone: {
    width: 40,
  },
  removeSet: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
