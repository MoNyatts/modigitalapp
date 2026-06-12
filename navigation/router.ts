import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

/**
 * Imperative navigation that mirrors the path-based API the screens use.
 *
 * Screens call router.push('/(tabs)/events'), router.replace('/login'), etc.
 * This module translates those paths into React Navigation actions so the
 * screen code stays clean and declarative.
 */

export type RootStackParamList = {
  Index: undefined;
  Login: undefined;
  Main: { screen?: string; params?: object } | undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const TAB_FOR_SEGMENT: Record<string, string> = {
  events: 'EventsTab',
  scanner: 'Scanner',
  reports: 'Reports',
  'qr-management': 'QRCodes',
  users: 'Users',
  dashboard: 'Dashboard',
  calendar: 'Calendar',
  gallery: 'Gallery',
  communications: 'Communications',
};

type Target = { name: keyof RootStackParamList; params?: object };

function parsePath(path: string): Target | null {
  if (path === '/login') {
    return { name: 'Login' };
  }
  if (path === '/' || path === '/index') {
    return { name: 'Index' };
  }

  const match = path.match(/^\/\(tabs\)\/([^/]+)(?:\/(.+))?$/);
  if (!match) {
    return null;
  }

  const [, segment, rest] = match;
  const tab = TAB_FOR_SEGMENT[segment];
  if (!tab) {
    return null;
  }

  if (segment === 'events' && rest) {
    if (rest === 'create') {
      return { name: 'Main', params: { screen: 'EventsTab', params: { screen: 'CreateEvent' } } };
    }
    return {
      name: 'Main',
      params: {
        screen: 'EventsTab',
        params: { screen: 'EventDetails', params: { eventId: decodeURIComponent(rest) } },
      },
    };
  }

  return { name: 'Main', params: { screen: tab } };
}

export const router = {
  push(path: string) {
    const target = parsePath(path);
    if (!target || !navigationRef.isReady()) {
      return;
    }
    navigationRef.dispatch(
      CommonActions.navigate({ name: target.name, params: target.params }),
    );
  },

  replace(path: string) {
    const target = parsePath(path);
    if (!target || !navigationRef.isReady()) {
      return;
    }
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: target.name, params: target.params }],
      }),
    );
  },

  back() {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    }
  },
};
