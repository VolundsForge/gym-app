import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Input, Muted, useTheme } from '@/components/ui';
import { Radius } from '@/constants/Colors';

export function ExpandableNotes({
  value,
  onChange,
  placeholder = 'Machine, program, incline, or anything else you want to remember…',
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(() => value.trim().length > 0);

  useEffect(() => {
    if (value.trim()) setOpen(true);
  }, [value]);

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add notes"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.expandButton,
          {
            backgroundColor: theme.muted,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Ionicons name="add" size={18} color={theme.text} />
        <Body style={{ fontWeight: '600' }}>Add notes</Body>
      </Pressable>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <Muted>Notes</Muted>
      <Input
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        multiline
        textAlignVertical="top"
        style={styles.field}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  expandButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  field: {
    minHeight: 88,
    paddingTop: 12,
  },
});
