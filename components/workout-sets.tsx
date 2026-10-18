import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Body, Button, Muted, useTheme } from '@/components/ui';
import { Radius } from '@/constants/Colors';
import { useSettings } from '@/context/SettingsContext';
import { displayToKg, kgToDisplay, unitLabel } from '@/lib/weight';
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
  const { weightUnit } = useSettings();

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.setHeader}>
        <Muted style={styles.colSet}>SET</Muted>
        <Muted style={[styles.colNum, styles.colLabel]}>REPS</Muted>
        {showWeight ? (
          <Muted style={[styles.colNum, styles.colLabel]}>
            {unitLabel(weightUnit).toUpperCase()}
          </Muted>
        ) : null}
        <Muted style={styles.colDone}> </Muted>
      </View>

      {sets.map((set, index) => (
        <View key={set.id} style={styles.setRow}>
          <Body style={[styles.colSet, { fontWeight: '700' }]}>{index + 1}</Body>
          <View style={styles.colNum}>
            <NumberField
              value={set.reps}
              onChange={(reps) => onChangeSet(set.id, { reps })}
            />
          </View>
          {showWeight ? (
            <View style={styles.colNum}>
              <NumberField
                value={kgToDisplay(set.weight, weightUnit)}
                onChange={(weight) =>
                  onChangeSet(set.id, { weight: displayToKg(weight, weightUnit) })
                }
              />
            </View>
          ) : null}
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
}: {
  value: number;
  onChange: (n: number) => void;
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
      style={{
        width: '100%',
        minWidth: 0,
        backgroundColor: theme.muted,
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
  );
}

const styles = StyleSheet.create({
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  colSet: {
    width: 32,
    flexShrink: 0,
    textAlign: 'center',
  },
  colNum: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  colLabel: {
    textAlign: 'center',
  },
  colDone: {
    width: 36,
    flexShrink: 0,
  },
  removeSet: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
