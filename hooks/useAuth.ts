import { useEffect, useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { getStorage, safeParseJSON, STORAGE_KEYS } from '@/lib/storage';
import { trpc } from '@/lib/trpc';
import type { User } from '@/types';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storage = useMemo(() => getStorage(), []);

  // tRPC mutations
  const authenticateMutation = trpc.users.authenticate.useMutation();
  const createUserMutation = trpc.users.create.useMutation();
  const updateUserMutation = trpc.users.update.useMutation();
  const deleteUserMutation = trpc.users.delete.useMutation();

  // Load cached user on app start (avoids login on every restart)
  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await storage.getItem(STORAGE_KEYS.USER);
        const parsed = safeParseJSON<User | null>(stored, null);
        if (parsed?.id && parsed?.email) {
          setUser(parsed);
        } else if (stored) {
          await storage.removeItem(STORAGE_KEYS.USER);
        }
      } catch (error) {
        console.error('[AUTH] Failed to load cached user:', error);
        await storage.removeItem(STORAGE_KEYS.USER);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [storage]);

  /**
   * Login — authenticates against the server database.
   * Caches the user locally so subsequent app launches don't require re-login.
   */
  const login = useCallback(async (email: string, password: string): Promise<User> => {
    if (!email?.trim() || !password?.trim()) {
      throw new Error('Email and password are required');
    }

    const result = await authenticateMutation.mutateAsync({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    if (!result.success || !result.user) {
      throw new Error(result.message || 'Invalid email or password');
    }

    const loggedInUser = result.user as User;
    await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  }, [authenticateMutation, storage]);

  const logout = useCallback(async () => {
    try {
      await storage.removeItem(STORAGE_KEYS.USER);
    } finally {
      setUser(null);
    }
  }, [storage]);

  /**
   * Clears local cached data (does not delete server data).
   */
  const clearAllData = useCallback(async () => {
    try {
      const keysToRemove = [
        STORAGE_KEYS.EVENTS,
        STORAGE_KEYS.QRCODES,
        STORAGE_KEYS.SCANS,
        STORAGE_KEYS.REJECTED_SCANS,
        STORAGE_KEYS.ARCHIVED_REPORTS,
      ];
      for (const key of keysToRemove) {
        await storage.removeItem(key);
      }
      if (user?.role !== 'admin') {
        await storage.removeItem(STORAGE_KEYS.USER);
        setUser(null);
      }
    } catch (error) {
      console.error('[AUTH] Failed to clear local data:', error);
    }
  }, [storage, user]);

  /**
   * Create a new user account on the server.
   * Only admins should call this.
   */
  const createUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
    const id = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const result = await createUserMutation.mutateAsync({
      id,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role as 'admin' | 'guest',
      assignedEventIds: userData.assignedEventIds || [],
      scannerEnabled: userData.scannerEnabled !== false,
    });
    return result as User;
  }, [createUserMutation]);

  /**
   * Update an existing user on the server.
   */
  const updateUser = useCallback(async (userId: string, userData: Partial<User>): Promise<User> => {
    const result = await updateUserMutation.mutateAsync({
      id: userId,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role as 'admin' | 'guest' | undefined,
      assignedEventIds: userData.assignedEventIds,
      scannerEnabled: userData.scannerEnabled,
    });

    // If the updated user is the currently logged-in user, refresh local cache
    if (user?.id === userId) {
      const updatedUser = result as User;
      await storage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      setUser(updatedUser);
    }

    return result as User;
  }, [updateUserMutation, user, storage]);

  /**
   * Delete a user from the server.
   */
  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    await deleteUserMutation.mutateAsync({ id: userId });
  }, [deleteUserMutation]);

  return useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    clearAllData,
    createUser,
    updateUser,
    deleteUser,
    isAdmin: user?.role === 'admin',
    isGuest: user?.role === 'guest',
    canUseScanner: user?.role === 'admin' || (user?.role === 'guest' && user?.scannerEnabled !== false),
  }), [user, isLoading, login, logout, clearAllData, createUser, updateUser, deleteUser]);
});
