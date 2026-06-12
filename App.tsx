import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { EventsProvider } from '@/hooks/useEvents';
import { trpc, trpcClient } from '@/lib/trpc';
import RootNavigator from '@/navigation/RootNavigator';
import { navigationRef } from '@/navigation/router';

function AppProviders({ children }: { children: React.ReactNode }) {
  const queryClientRef = useRef<QueryClient | null>(null);

  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient({
      defaultOptions: {
        queries: {
          retry: 1,
          staleTime: 5000,
          gcTime: 10000,
        },
      },
    });
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <trpc.Provider client={trpcClient} queryClient={queryClientRef.current}>
        <AuthProvider>
          <EventsProvider>{children}</EventsProvider>
        </AuthProvider>
      </trpc.Provider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AppProviders>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
