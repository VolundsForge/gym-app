import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import {
  Body,
  Button,
  Card,
  Input,
  Muted,
  Screen,
  Subtitle,
  Title,
} from '@/components/ui';
import { loadProfile, saveProfile } from '@/lib/storage';

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await loadProfile();
      if (cancelled) return;
      setName(profile.name);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      await saveProfile({ name: name.trim() });
      Alert.alert('Saved', 'Your profile is stored on this device.');
    } finally {
      setSaving(false);
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
            editable={loaded}
          />
          <Button
            label="Save"
            onPress={() => void onSave()}
            loading={saving}
            disabled={!loaded}
          />
        </Card>

        <Body style={{ lineHeight: 22 }}>
          More profile options can land here later. Training data is still local-first.
        </Body>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
});
