import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar,
  Users,
  QrCode,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Clock,
} from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useFilteredEvents } from '@/hooks/useEvents';
import { router } from '@/navigation/router';
import type { Scan, QRCode as QRCodeType } from '@/types';
import { getStorage, safeParseJSON, STORAGE_KEYS } from '@/lib/storage';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const cardWidth = isWeb && width > 768 ? (width - 80) / 3 : (width - 60) / 2;

export default function DashboardScreen() {
  const { isAdmin, user } = useAuth();
  const { events } = useFilteredEvents();
  const insets = useSafeAreaInsets();
  const [scans, setScans] = useState<Scan[]>([]);
  const [qrCodes, setQRCodes] = useState<QRCodeType[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const storage = getStorage();
      const [scansData, qrData, usersData] = await Promise.all([
        storage.getItem(STORAGE_KEYS.SCANS),
        storage.getItem(STORAGE_KEYS.QRCODES),
        storage.getItem(STORAGE_KEYS.USERS),
      ]);

      setScans(safeParseJSON<Scan[]>(scansData, []));
      setQRCodes(safeParseJSON<QRCodeType[]>(qrData, []));
      setUsers(safeParseJSON<any[]>(usersData, []));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.startDate || event.date || '');
    return eventDate >= today;
  }).sort((a, b) => {
    const dateA = new Date(a.startDate || a.date || '');
    const dateB = new Date(b.startDate || b.date || '');
    return dateA.getTime() - dateB.getTime();
  });

  const pastEvents = events.filter(event => {
    const eventDate = new Date(event.startDate || event.date || '');
    return eventDate < today;
  });

  const todayScans = scans.filter(scan => {
    const scanDate = new Date(scan.scannedAt);
    return scanDate.toDateString() === today.toDateString();
  });

  const totalAdmissions = scans.reduce((sum, scan) => sum + (scan.admissionCount || 1), 0);
  const totalGuests = qrCodes.length;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const guestUsers = users.filter(u => u.role === 'guest').length;

  const recentScans = scans
    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
    .slice(0, 5);

  const StatCard = ({
    icon: Icon,
    title,
    value,
    color,
    subtitle,
    onPress,
  }: {
    icon: any;
    title: string;
    value: string | number;
    color: string;
    subtitle?: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.statCard, { width: cardWidth }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color={colors.error} />
          <Text style={styles.errorTitle}>Access Denied</Text>
          <Text style={styles.errorDescription}>
            Dashboard is only available for administrators
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Welcome back, {user?.name}</Text>
        </View>
        <Activity size={28} color={colors.white} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <StatCard
            icon={Calendar}
            title="Total Events"
            value={events.length}
            color={colors.secondary}
            subtitle={`${upcomingEvents.length} upcoming`}
            onPress={() => router.push('/(tabs)/events')}
          />
          <StatCard
            icon={CheckCircle}
            title="Total Scans"
            value={scans.length}
            color={colors.success}
            subtitle={`${todayScans.length} today`}
            onPress={() => router.push('/(tabs)/reports')}
          />
          <StatCard
            icon={QrCode}
            title="QR Codes"
            value={totalGuests}
            color={colors.accent}
            subtitle="Total registered"
            onPress={() => router.push('/(tabs)/qr-management')}
          />
          <StatCard
            icon={TrendingUp}
            title="Admissions"
            value={totalAdmissions}
            color={colors.primary}
            subtitle="All time"
          />
          <StatCard
            icon={Users}
            title="Admin Users"
            value={adminUsers}
            color={colors.secondary}
            onPress={() => router.push('/(tabs)/users')}
          />
          <StatCard
            icon={Users}
            title="Guest Users"
            value={guestUsers}
            color={colors.warning}
            onPress={() => router.push('/(tabs)/users')}
          />
        </View>

        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {upcomingEvents.slice(0, 3).map(event => (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={() => router.push(`/(tabs)/events/${event.id}`)}
              >
                <View style={styles.eventHeader}>
                  <View style={styles.eventIconContainer}>
                    <Calendar size={20} color={colors.primary} />
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <View style={styles.eventMeta}>
                      <Clock size={14} color={colors.gray[600]} />
                      <Text style={styles.eventDate}>
                        {new Date(event.startDate || event.date || '').toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.eventActivities}>
                      {event.activities.length} activities
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            {upcomingEvents.length > 3 && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() => router.push('/(tabs)/events')}
              >
                <Text style={styles.seeMoreText}>
                  See all {upcomingEvents.length} upcoming events
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {recentScans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentScans.map(scan => {
              const event = events.find(e => e.id === scan.eventId);
              const qrCode = qrCodes.find(q => q.id === scan.qrCodeId);
              return (
                <View key={scan.id} style={styles.activityCard}>
                  <View style={[styles.activityDot, { backgroundColor: colors.success }]} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>
                      Scan recorded - {qrCode?.guestName || 'Guest'}
                    </Text>
                    <Text style={styles.activityEvent}>{event?.name || 'Unknown Event'}</Text>
                    <Text style={styles.activityTime}>
                      {new Date(scan.scannedAt).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.activityBadge}>
                    <CheckCircle size={16} color={colors.success} />
                  </View>
                </View>
              );
            })}
            <TouchableOpacity
              style={styles.seeMoreButton}
              onPress={() => router.push('/(tabs)/reports')}
            >
              <Text style={styles.seeMoreText}>View all activity</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/events/create')}
            >
              <Calendar size={32} color={colors.primary} />
              <Text style={styles.quickActionText}>Create Event</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/qr-management')}
            >
              <QrCode size={32} color={colors.secondary} />
              <Text style={styles.quickActionText}>Manage QR Codes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/reports')}
            >
              <BarChart3 size={32} color={colors.accent} />
              <Text style={styles.quickActionText}>View Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push('/(tabs)/users')}
            >
              <Users size={32} color={colors.success} />
              <Text style={styles.quickActionText}>Manage Users</Text>
            </TouchableOpacity>
          </View>
        </View>

        {pastEvents.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Completed Events:</Text>
                <Text style={styles.summaryValue}>{pastEvents.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Active Users:</Text>
                <Text style={styles.summaryValue}>{users.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Activities:</Text>
                <Text style={styles.summaryValue}>
                  {events.reduce((sum, e) => sum + e.activities.length, 0)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.secondary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[700],
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.gray[600],
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: colors.gray[600],
  },
  eventActivities: {
    fontSize: 12,
    color: colors.gray[600],
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  activityEvent: {
    fontSize: 13,
    color: colors.gray[700],
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.gray[600],
  },
  activityBadge: {
    marginLeft: 8,
  },
  seeMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: 12,
    textAlign: 'center',
  },
  summarySection: {
    padding: 20,
    paddingTop: 0,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.gray[700],
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 24,
  },
});
