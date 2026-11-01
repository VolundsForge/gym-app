import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  backupFileName,
  type GymBackup,
  serializeGymBackup,
} from '@/lib/backup';

export async function shareGymBackup(backup: GymBackup): Promise<void> {
  const json = serializeGymBackup(backup);
  const name = backupFileName(backup);
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(json);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Save gym snapshot',
    UTI: 'public.json',
  });
}

export async function pickGymBackupJson(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  const file = new File(result.assets[0].uri);
  return file.text();
}
