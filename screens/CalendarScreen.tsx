import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Clock, MapPin, Users, Plus, Edit3, Trash2, X, CheckCircle } from 'lucide-react-native';
import { colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { getStorage } from '@/lib/storage';

type BookingStatus = 'available' | 'partially-booked' | 'fully-booked';

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface CalendarBooking {
  id: string;
  date: string;
  teamMembers: string[];
  location: string;
  eventName?: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
}

const STORAGE_KEY = 'event_app_calendar_bookings';

const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'John Doe', role: 'Event Manager' },
  { id: '2', name: 'Jane Smith', role: 'Technical Lead' },
  { id: '3', name: 'Mike Johnson', role: 'Setup Crew' },
  { id: '4', name: 'Sarah Williams', role: 'Registration Desk' },
];

export default function CalendarScreen() {
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<CalendarBooking | null>(null);
  const storage = getStorage();

  const loadBookings = useCallback(async () => {
    try {
      const stored = await storage.getItem(STORAGE_KEY);
      if (stored) {
        setBookings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  }, [storage]);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    eventName: '',
    location: '',
    startTime: '09:00',
    endTime: '17:00',
    teamMembers: [] as string[],
    status: 'available' as BookingStatus,
    notes: '',
  });

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const saveBookings = async (updatedBookings: CalendarBooking[]) => {
    try {
      await storage.setItem(STORAGE_KEY, JSON.stringify(updatedBookings));
      setBookings(updatedBookings);
    } catch (error) {
      console.error('Failed to save bookings:', error);
      Alert.alert('Error', 'Failed to save booking data');
    }
  };

  const handleAddBooking = async () => {
    if (!formData.eventName.trim() || !formData.location.trim()) {
      Alert.alert('Error', 'Please fill in event name and location');
      return;
    }

    const newBooking: CalendarBooking = {
      id: Date.now().toString(),
      date: formData.date,
      eventName: formData.eventName.trim(),
      location: formData.location.trim(),
      startTime: formData.startTime,
      endTime: formData.endTime,
      teamMembers: formData.teamMembers,
      status: formData.status,
      notes: formData.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    await saveBookings([...bookings, newBooking]);
    closeModal();
    Alert.alert('Success', 'Booking added successfully');
  };

  const handleEditBooking = async () => {
    if (!editingBooking) return;

    const updatedBookings = bookings.map(b =>
      b.id === editingBooking.id
        ? {
            ...b,
            date: formData.date,
            eventName: formData.eventName.trim(),
            location: formData.location.trim(),
            startTime: formData.startTime,
            endTime: formData.endTime,
            teamMembers: formData.teamMembers,
            status: formData.status,
            notes: formData.notes.trim(),
          }
        : b
    );

    await saveBookings(updatedBookings);
    closeModal();
    Alert.alert('Success', 'Booking updated successfully');
  };

  const handleDeleteBooking = (booking: CalendarBooking) => {
    Alert.alert(
      'Delete Booking',
      `Are you sure you want to delete the booking for "${booking.eventName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedBookings = bookings.filter(b => b.id !== booking.id);
            await saveBookings(updatedBookings);
            Alert.alert('Success', 'Booking deleted successfully');
          },
        },
      ]
    );
  };

  const openEditModal = (booking: CalendarBooking) => {
    setEditingBooking(booking);
    setFormData({
      date: booking.date,
      eventName: booking.eventName || '',
      location: booking.location,
      startTime: booking.startTime,
      endTime: booking.endTime,
      teamMembers: booking.teamMembers,
      status: booking.status,
      notes: booking.notes || '',
    });
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingBooking(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      eventName: '',
      location: '',
      startTime: '09:00',
      endTime: '17:00',
      teamMembers: [],
      status: 'available',
      notes: '',
    });
  };

  const toggleTeamMember = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.includes(memberId)
        ? prev.teamMembers.filter(id => id !== memberId)
        : [...prev.teamMembers, memberId],
    }));
  };

  const getMonthBookings = (year: number, month: number) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate.getFullYear() === year && bookingDate.getMonth() === month;
    });
  };

  const getDayBookings = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => booking.date === dateStr);
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'fully-booked':
        return colors.error;
      case 'partially-booked':
        return colors.warning;
      case 'available':
        return colors.success;
      default:
        return colors.gray[400];
    }
  };

  const currentMonthBookings = getMonthBookings(
    selectedDate.getFullYear(),
    selectedDate.getMonth()
  );

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days: React.ReactNode[] = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayBookings = bookings.filter(b => b.date === dateStr);
      const hasBookings = dayBookings.length > 0;
      const fullyBooked = dayBookings.some(b => b.status === 'fully-booked');
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            hasBookings && styles.calendarDayWithBooking,
            fullyBooked && styles.calendarDayFullyBooked,
          ]}
          onPress={() => setSelectedDate(date)}
        >
          <Text style={[
            styles.calendarDayText,
            hasBookings && styles.calendarDayTextWithBooking,
          ]}>
            {day}
          </Text>
          {hasBookings && (
            <View style={[
              styles.bookingIndicator,
              { backgroundColor: fullyBooked ? colors.error : colors.warning }
            ]} />
          )}
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  const selectedDayBookings = getDayBookings(selectedDate);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Calendar Management</Text>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Plus size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedDate(newDate);
              }}
            >
              <Text style={styles.calendarNavButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.calendarMonth}>
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedDate(newDate);
              }}
            >
              <Text style={styles.calendarNavButton}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.calendarWeekDays}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Text key={day} style={styles.weekDayText}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {renderCalendarDays()}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{currentMonthBookings.length}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {currentMonthBookings.filter(b => b.status === 'available').length}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNumber, { color: colors.error }]}>
              {currentMonthBookings.filter(b => b.status === 'fully-booked').length}
            </Text>
            <Text style={styles.statLabel}>Fully Booked</Text>
          </View>
        </View>

        <View style={styles.bookingsSection}>
          <Text style={styles.sectionTitle}>
            Bookings for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>

          {selectedDayBookings.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarIcon size={48} color={colors.gray[300]} />
              <Text style={styles.emptyStateText}>No bookings for this day</Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.addBookingButton}
                  onPress={() => {
                    setFormData(prev => ({
                      ...prev,
                      date: selectedDate.toISOString().split('T')[0],
                    }));
                    setShowAddModal(true);
                  }}
                >
                  <Text style={styles.addBookingButtonText}>Add Booking</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            selectedDayBookings.map(booking => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingEventName}>{booking.eventName}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                        {booking.status.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  {isAdmin && (
                    <View style={styles.bookingActions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => openEditModal(booking)}
                      >
                        <Edit3 size={16} color={colors.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteBooking(booking)}
                      >
                        <Trash2 size={16} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View style={styles.bookingDetails}>
                  <View style={styles.detailRow}>
                    <Clock size={16} color={colors.gray[600]} />
                    <Text style={styles.detailText}>{booking.startTime} - {booking.endTime}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={colors.gray[600]} />
                    <Text style={styles.detailText}>{booking.location}</Text>
                  </View>
                  {booking.teamMembers.length > 0 && (
                    <View style={styles.detailRow}>
                      <Users size={16} color={colors.gray[600]} />
                      <Text style={styles.detailText}>
                        {booking.teamMembers.length} team member(s)
                      </Text>
                    </View>
                  )}
                  {booking.notes && (
                    <Text style={styles.bookingNotes}>{booking.notes}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showAddModal || editingBooking !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingBooking ? 'Edit Booking' : 'Add Booking'}
            </Text>
            <TouchableOpacity onPress={closeModal}>
              <X size={24} color={colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={formData.date}
                onChangeText={(text) => setFormData(prev => ({ ...prev, date: text }))}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Name</Text>
              <TextInput
                style={styles.input}
                value={formData.eventName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, eventName: text }))}
                placeholder="Enter event name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
                placeholder="Enter location"
              />
            </View>

            <View style={styles.timeRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={formData.startTime}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, startTime: text }))}
                  placeholder="09:00"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={formData.endTime}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, endTime: text }))}
                  placeholder="17:00"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusSelector}>
                {(['available', 'partially-booked', 'fully-booked'] as BookingStatus[]).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      formData.status === status && styles.statusOptionSelected,
                      { borderColor: getStatusColor(status) }
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, status }))}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      formData.status === status && { color: getStatusColor(status) }
                    ]}>
                      {status.replace('-', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Team Members</Text>
              {TEAM_MEMBERS.map(member => (
                <TouchableOpacity
                  key={member.id}
                  style={styles.teamMemberOption}
                  onPress={() => toggleTeamMember(member.id)}
                >
                  <View style={styles.teamMemberInfo}>
                    <Text style={styles.teamMemberName}>{member.name}</Text>
                    <Text style={styles.teamMemberRole}>{member.role}</Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    formData.teamMembers.includes(member.id) && styles.checkboxSelected
                  ]}>
                    {formData.teamMembers.includes(member.id) && (
                      <CheckCircle size={20} color={colors.success} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                placeholder="Add any additional notes..."
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={editingBooking ? handleEditBooking : handleAddBooking}
            >
              <Text style={styles.saveButtonText}>
                {editingBooking ? 'Update' : 'Add'} Booking
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: colors.white,
    margin: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarMonth: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  calendarNavButton: {
    fontSize: 24,
    color: colors.secondary,
    paddingHorizontal: 12,
  },
  calendarWeekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray[600],
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  calendarDayWithBooking: {
    backgroundColor: colors.gray[100],
  },
  calendarDayFullyBooked: {
    backgroundColor: colors.error + '20',
  },
  calendarDayText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  calendarDayTextWithBooking: {
    fontWeight: '600',
  },
  bookingIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray[600],
    textAlign: 'center',
  },
  bookingsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.gray[600],
    marginTop: 16,
    marginBottom: 16,
  },
  addBookingButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addBookingButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bookingCard: {
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
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingEventName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    padding: 8,
  },
  deleteButton: {
    backgroundColor: colors.error + '20',
    borderRadius: 8,
    padding: 8,
  },
  bookingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.gray[700],
  },
  bookingNotes: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: 8,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
  },
  statusSelector: {
    gap: 8,
  },
  statusOption: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statusOptionSelected: {
    backgroundColor: colors.gray[50],
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
    textTransform: 'capitalize',
  },
  teamMemberOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 8,
    marginBottom: 8,
  },
  teamMemberInfo: {
    flex: 1,
  },
  teamMemberName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  teamMemberRole: {
    fontSize: 12,
    color: colors.gray[600],
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.gray[300],
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: colors.success,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.gray[200],
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[700],
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
});
