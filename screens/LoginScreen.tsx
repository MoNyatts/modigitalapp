import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router } from '@/navigation/router';
import { Mail, Lock, LogIn } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setError('');
    setIsLoading(true);
    console.log('[LOGIN] Starting login process for:', email.trim().toLowerCase());
    
    try {
      const user = await login(email.trim().toLowerCase(), password);
      console.log('[LOGIN] Login successful, user role:', user?.role);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('[LOGIN] Navigating to events page...');
      router.replace('/(tabs)/events');
      console.log('[LOGIN] Navigation complete');
    } catch (error) {
      console.error('[LOGIN] Login failed:', error);
      setError(error instanceof Error ? error.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (role: 'admin' | 'guest') => {
    if (role === 'admin') {
      setEmail('admin@test.com');
      setPassword('admin123');
    } else {
      setEmail('guest@test.com');
      setPassword('guest123');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.content} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {!logoError ? (
              <Image
                source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/lq5bjfjo3cx8cv8a6dnex' }}
                style={styles.logoImage}
                resizeMode="contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <View style={styles.logoFallback}>
                <Text style={styles.logoFallbackText}>MD</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>Mo&apos; Digital Events</Text>
          <Text style={styles.subtitle}>Smart Event Management</Text>
          <Text style={[styles.subtitle, styles.subtitleItalic]}>For Your Peace of Mind</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Mail size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <LogIn size={20} color="#ffffff" />
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Demo Accounts</Text>
          <Text style={styles.demoDescription}>
            Try the app with these demo credentials:
          </Text>
          
          <View style={styles.demoButtons}>
            <TouchableOpacity
              style={[styles.demoButton, styles.adminButton]}
              onPress={() => fillDemoCredentials('admin')}
            >
              <Text style={styles.demoButtonText}>Admin Demo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoButton, styles.guestButton]}
              onPress={() => fillDemoCredentials('guest')}
            >
              <Text style={styles.demoButtonText}>Guest Demo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.roleInfo}>
            <Text style={styles.roleInfoTitle}>Role Differences:</Text>
            <Text style={styles.roleInfoItem}>• Admin: Create events, manage users, scan QR codes</Text>
            <Text style={styles.roleInfoItem}>• Guest: View assigned events and reports only</Text>
          </View>
          
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>📝 For New Users:</Text>
            <Text style={styles.instructionsText}>
              New guest users must be created by an admin in the Users tab. 
              Each guest user will receive login credentials and can be assigned to specific events.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 60,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: colors.white,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  logoFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  logoFallbackText: {
    fontSize: 48,
    fontWeight: 'bold' as const,
    color: colors.white,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center' as const,
  },
  form: {
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  loginButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: colors.gray[400],
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600' as const,
    marginLeft: 8,
  },
  demoSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  demoTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 8,
  },
  demoDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  demoButtons: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 20,
  },
  demoButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: 8,
    paddingVertical: 12,
  },
  adminButton: {
    backgroundColor: colors.secondary,
  },
  guestButton: {
    backgroundColor: colors.accent,
  },
  demoButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.inverse,
  },
  roleInfo: {
    backgroundColor: colors.gray[50],
    borderRadius: 8,
    padding: 16,
  },
  roleInfoTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.gray[700],
    marginBottom: 8,
  },
  roleInfoItem: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  instructionsBox: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.secondaryDark,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: colors.secondaryDark,
    lineHeight: 18,
  },
  subtitleItalic: {
    fontStyle: 'italic' as const,
  },

});