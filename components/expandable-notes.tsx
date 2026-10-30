import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Input, Muted, useTheme } from '@/components/ui';
import { Radius } from '@/constants/Colors';

const NOTES_PLACEHOLDER =
  'Machine, program, incline, or anything else you want to remember…';

export function NotesIconButton({
  hasContent,
  onPress,
}: {
  hasContent: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hasContent ? 'Exercise notes' : 'Add notes'}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.iconHit, { opacity: pressed ? 0.75 : 1 }]}>
      <Ionicons
        name="document-text-outline"
        size={22}
        color={hasContent ? theme.tint : '#FFFFFF'}
      />
    </Pressable>
  );
}

export function HeaderNotes({
  value,
  onChange,
  title,
  trailing,
  placeholder = NOTES_PLACEHOLDER,
}: {
  value: string;
  onChange: (text: string) => void;
  title: ReactNode;
  trailing?: ReactNode;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(() => value.trim().length > 0);

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, gap: 4 }}>{title}</View>
        <View style={styles.headerActions}>
          <NotesIconButton
            hasContent={value.trim().length > 0}
            onPress={() => setOpen((current) => !current)}
          />
          {trailing}
        </View>
      </View>
      {open ? (
        <Input
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          multiline
          textAlignVertical="top"
          style={styles.field}
        />
      ) : null}
    </View>
  );
}

export function ExpandableNotes({
  value,
  onChange,
  placeholder = NOTES_PLACEHOLDER,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  iconHit: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
