import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from '@/navigation/router';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Calendar, MapPin, Trash2, MoreVertical, Users } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useFilteredEvents } from '@/hooks/useEvents';
import { colors } from '@/constants/colors';
import { getStorage, safeParseJSON, STORAGE_KEYS } from '@/lib/storage';
import type { Event, User } from '@/types';

export default function EventsScreen() {
  const { isAdmin } = useAuth();
  const { events, isLoading, deleteEvent } = useFilteredEvents();
  const [showDeleteButtons, setShowDeleteButtons] = useState<{ [key: string]: boolean }>({});
  const [users, setUsers] = useState<User[]>([]);
  const insets = useSafeAreaInsets();

  const handleDeleteEvent = (event: Event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.name}"? This will also delete all activities and scan data for this event.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEvent(event.id);
              console.log('Event deleted successfully');
            } catch (error) {
              console.error('Failed to delete event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      const storage = getStorage();
      const stored = await storage.getItem(STORAGE_KEYS.USERS);
      setUsers(safeParseJSON<User[]>(stored, []));
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    }
  }, [isAdmin]);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers])
  );



  // Get assigned guest users for an event
  const getAssignedGuestUsers = (eventId: string): User[] => {
    return users.filter(user => 
      user.role === 'guest' && 
      user.assignedEventIds && 
      user.assignedEventIds.includes(eventId)
    );
  };

  const toggleDeleteButton = (eventId: string) => {
    setShowDeleteButtons(prev => ({
      ...prev,
      [eventId]: !prev[eventId],
    }));
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <View style={styles.eventCard}>
      <TouchableOpacity
        style={styles.eventContent}
        onPress={() => router.push(`/(tabs)/events/${item.id}`)}
      >
        <View style={styles.eventHeader}>
          <Text style={styles.eventName}>{item.name}</Text>
          <View style={styles.eventActions}>
            <View style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>{item.activities.length} activities</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => toggleDeleteButton(item.id)}
              >
                <MoreVertical size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Show assigned guest users for admin */}
        {isAdmin && (() => {
          const assignedGuests = getAssignedGuestUsers(item.id);
          return assignedGuests.length > 0 ? (
            <View style={styles.assignedUsersSection}>
              <View style={styles.assignedUsersHeader}>
                <Users size={14} color="#10b981" />
                <Text style={styles.assignedUsersTitle}>
                  Assigned Guest Users ({assignedGuests.length})
                </Text>
              </View>
              <View style={styles.assignedUsersList}>
                {assignedGuests.map((user, index) => (
                  <Text key={user.id} style={styles.assignedUserName}>
                    {user.name}{index < assignedGuests.length - 1 ? ', ' : ''}
                  </Text>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.assignedUsersSection}>
              <View style={styles.assignedUsersHeader}>
                <Users size={14} color="#9ca3af" />
                <Text style={styles.noAssignedUsersText}>
                  No guest users assigned
                </Text>
              </View>
            </View>
          );
        })()}
        
        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.eventDetails}>
          <View style={styles.eventDetail}>
            <Calendar size={16} color="#6b7280" />
            <Text style={styles.eventDetailText}>
              {item.isMultiDay && item.endDate 
                ? `${new Date(item.startDate).toLocaleDateString()} - ${new Date(item.endDate).toLocaleDateString()}`
                : new Date(item.startDate || item.date || '').toLocaleDateString()
              }
            </Text>
          </View>
          
          <View style={styles.eventDetail}>
            <MapPin size={16} color="#6b7280" />
            <Text style={styles.eventDetailText} numberOfLines={1}>
              {item.locationDetails?.formattedAddress || item.location}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      
      {isAdmin && showDeleteButtons[item.id] && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteEvent(item)}
        >
          <Trash2 size={16} color="#ef4444" />
          <Text style={styles.deleteButtonText}>Delete Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Events</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            activeOpacity={0.7}
            onPress={() => {
              console.log('[EVENTS] Add button pressed - navigating to create');
              try {
                router.push('/(tabs)/events/create');
              } catch (error) {
                console.error('[EVENTS] Navigation error:', error);
              }
            }}
          >
            <Plus size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>


      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Events Yet</Text>
          <Text style={styles.emptyDescription}>
            {isAdmin 
              ? "Create your first event to get started"
              : "No events available at the moment"
            }
          </Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.createButton}
              activeOpacity={0.7}
              onPress={() => {
                console.log('[EVENTS] Create Event button pressed - navigating to create');
                try {
                  router.push('/(tabs)/events/create');
                } catch (error) {
                  console.error('[EVENTS] Navigation error:', error);
                }
              }}
            >
              <Text style={styles.createButtonText}>Create Event</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  addButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  listContainer: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  eventBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventBadgeText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventDetailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  moreButton: {
    padding: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  assignedUsersSection: {
    marginBottom: 8,
  },
  assignedUsersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignedUsersTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 4,
  },
  noAssignedUsersText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
    marginLeft: 4,
  },
  assignedUsersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 18,
  },
  assignedUserName: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
});