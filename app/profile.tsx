import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  Body,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Muted,
  Screen,
  Subtitle,
  Title,
} from '@/components/ui';
import { useSettings } from '@/context/SettingsContext';
import { useWorkouts } from '@/context/WorkoutContext';
import {
  backupSummary,
  buildGymBackup,
  parseGymBackup,
  type GymBackup,
} from '@/lib/backup';
import { pickGymBackupJson, shareGymBackup } from '@/lib/backup-share';

export default function ProfileScreen() {
  const { displayName, setDisplayName, restoreFromBackup } = useSettings();
  const { restoreSnapshot } = useWorkouts();
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [pendingBackup, setPendingBackup] = useState<GymBackup | null>(null);

  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  const onSave = async () => {
    setSaving(true);
    try {
      setDisplayName(name);
      Alert.alert('Saved', 'Your profile is stored on this device.');
    } finally {
      setSaving(false);
    }
  };

  const onExport = async () => {
    setBusy(true);
    setStatus('');
    try {
      const backup = await buildGymBackup();
      await shareGymBackup(backup);
      setStatus(
        `Snapshot ready: ${backup.workouts.length} workouts from ${backup.appVersion}.`
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not save the snapshot.'
      );
    } finally {
      setBusy(false);
    }
  };

  const onPickRestore = async () => {
    setBusy(true);
    setStatus('');
    try {
      const raw = await pickGymBackupJson();
      if (!raw) {
        setBusy(false);
        return;
      }
      setPendingBackup(parseGymBackup(raw));
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not read that snapshot.'
      );
    } finally {
      setBusy(false);
    }
  };

  const onConfirmRestore = async () => {
    if (!pendingBackup) return;
    setBusy(true);
    try {
      await restoreSnapshot(pendingBackup);
      await restoreFromBackup(pendingBackup);
      setName(pendingBackup.profile.name);
      setStatus(`Restored ${backupSummary(pendingBackup)}`);
      setPendingBackup(null);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not restore that snapshot.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 6 }}>
          <Title style={{ fontSize: 26 }}>Profile</Title>
          <Subtitle>
            No account needed. This name stays on your phone with your workouts.
          </Subtitle>
        </View>

        <Card style={{ gap: 10 }}>
          <Muted>Display name</Muted>
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoCorrect={false}
          />
          <Button
            label="Save"
            onPress={() => void onSave()}
            loading={saving}
          />
        </Card>

        <Card style={{ gap: 10 }}>
          <Body style={{ fontWeight: '700' }}>Test snapshot</Body>
          <Muted>
            Save a compact copy of your history, workouts, and settings. Restore it
            on a later test build to keep the same data across versions.
          </Muted>
          <Button
            label="Export snapshot"
            variant="secondary"
            onPress={() => void onExport()}
            loading={busy && !pendingBackup}
            disabled={busy}
          />
          <Button
            label="Restore snapshot"
            variant="secondary"
            onPress={() => void onPickRestore()}
            disabled={busy}
          />
          {status ? <Muted>{status}</Muted> : null}
        </Card>

        <Body style={{ lineHeight: 22 }}>
          Training data stays on this device. Updating the app keeps it; uninstalling
          does not. A snapshot is the way to carry history onto a new test install.
        </Body>
      </ScrollView>

      <ConfirmDialog
        visible={!!pendingBackup}
        title="Replace data on this device?"
        message={
          pendingBackup
            ? `This overwrites history, My Workouts, exercises, and settings with: ${backupSummary(pendingBackup)}`
            : ''
        }
        confirmLabel="Restore"
        danger
        loading={busy}
        onCancel={() => {
          if (!busy) setPendingBackup(null);
        }}
        onConfirm={() => void onConfirmRestore()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 20,
    gap: 16,
    paddingBottom: 40,
  },
});
