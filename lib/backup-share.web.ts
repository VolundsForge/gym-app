import {
  backupFileName,
  type GymBackup,
  serializeGymBackup,
} from '@/lib/backup';

export async function shareGymBackup(backup: GymBackup): Promise<void> {
  const json = serializeGymBackup(backup);
  const name = backupFileName(backup);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function pickGymBackupJson(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      void file.text().then(resolve).catch(reject);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
