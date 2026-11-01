import { Platform } from 'react-native';

/** RN Web has no RCTAnimation module; JS driver still runs these animations. */
export const NATIVE_DRIVER = Platform.OS !== 'web';
