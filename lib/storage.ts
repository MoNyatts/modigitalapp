import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

const universalStorage: StorageAdapter = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('[Storage] setItem failed:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('[Storage] removeItem failed:', error);
    }
  },
};

export const getStorage = (): StorageAdapter => universalStorage;

export const safeParseJSON = <T>(data: string | null, fallback: T): T => {
  if (!data || data.trim() === '' || data === 'undefined' || data === 'null') {
    return fallback;
  }
  try {
    const trimmed = data.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      return fallback;
    }
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
};

export const STORAGE_KEYS = {
  USER: 'event_app_user',
  USERS: 'event_app_users',
  EVENTS: 'event_app_events',
  QRCODES: 'event_app_qrcodes',
  SCANS: 'event_app_scans',
  REJECTED_SCANS: 'event_app_rejected_scans',
  ARCHIVED_REPORTS: 'event_app_archived_reports',
} as const;
