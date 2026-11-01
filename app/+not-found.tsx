import { router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Body, Button, Screen, Title } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen style={styles.container}>
        <Title style={styles.title}>This screen doesn’t exist.</Title>
        <Body style={styles.body}>Head back home and keep training.</Body>
        <Button label="Go home" onPress={() => router.replace('/')} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    marginBottom: 8,
  },
});
