import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Body, useTheme } from '@/components/ui';
import { useAppTheme } from '@/context/ThemeContext';

export function HeaderMenuButton() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { colorScheme, setColorScheme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const dark = colorScheme === 'dark';

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={styles.iconButton}>
        <Ionicons name="menu" size={26} color={theme.text} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View
            style={[
              styles.menu,
              {
                top: insets.top + 48,
                right: 12,
                backgroundColor: theme.card,
                borderColor: theme.border,
              },
            ]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPress={() => {
                setOpen(false);
                router.push('/profile');
              }}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: pressed ? theme.muted : 'transparent' },
              ]}>
              <Ionicons name="person-circle-outline" size={22} color={theme.text} />
              <Body style={{ fontWeight: '600', flex: 1 }}>Profile</Body>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </Pressable>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <View style={styles.row}>
              <Ionicons
                name={dark ? 'moon' : 'sunny-outline'}
                size={22}
                color={theme.text}
              />
              <Body style={{ fontWeight: '600', flex: 1 }}>Dark mode</Body>
              <Switch
                value={dark}
                onValueChange={(value) => setColorScheme(value ? 'dark' : 'light')}
                trackColor={{ false: theme.border, true: theme.tint }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={theme.border}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  overlay: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    minWidth: 240,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
});
