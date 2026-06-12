import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Calendar, QrCode, BarChart3, Users, Package } from 'lucide-react-native';
import { Platform, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { colors } from '@/constants/colors';
import EventsStack from '@/navigation/EventsStack';
import ScannerScreen from '@/screens/ScannerScreen';
import ReportsScreen from '@/screens/ReportsScreen';
import QRManagementScreen from '@/screens/QRManagementScreen';
import UsersScreen from '@/screens/UsersScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import CalendarScreen from '@/screens/CalendarScreen';
import GalleryScreen from '@/screens/GalleryScreen';
import CommunicationsScreen from '@/screens/CommunicationsScreen';

export type MainTabsParamList = {
  EventsTab: undefined;
  Scanner: undefined;
  Reports: undefined;
  QRCodes: undefined;
  Users: undefined;
  Dashboard: undefined;
  Calendar: undefined;
  Gallery: undefined;
  Communications: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Routes that are reachable through navigation but never shown in the tab bar.
const HIDDEN_TAB = { tabBarItemStyle: { display: 'none' as const } };

export default function MainTabs() {
  const { isAdmin } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray[500],
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="EventsTab"
        component={EventsStack}
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          title: 'Scanner',
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="QRCodes"
        component={QRManagementScreen}
        options={{
          ...(isAdmin ? {} : HIDDEN_TAB),
          title: 'QR Codes',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />

      <Tab.Screen
        name="Users"
        component={UsersScreen}
        options={{
          title: isAdmin ? 'Users' : 'Profile',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />

      <Tab.Screen name="Dashboard" component={DashboardScreen} options={HIDDEN_TAB} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={HIDDEN_TAB} />
      <Tab.Screen name="Gallery" component={GalleryScreen} options={HIDDEN_TAB} />
      <Tab.Screen name="Communications" component={CommunicationsScreen} options={HIDDEN_TAB} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
    height: Platform.OS === 'ios' ? 88 : 60,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
});
