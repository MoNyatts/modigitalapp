import React, { useState } from 'react';
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
import { useRoute } from '@react-navigation/native';
import { Plus, Calendar, MapPin, Clock, Users, Activity, Trash2, MoreVertical, ChevronDown, X, Edit3, Copy } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { useFilteredEvents } from '@/hooks/useEvents';
import type { Activity as ActivityType } from '@/types';
import { colors } from '@/constants/colors';

export default function EventDetailsScreen() {
  const { eventId } = (useRoute().params ?? {}) as { eventId: string };
  const { isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  const { events, addActivity, updateEvent, updateActivity, getAttendanceReport, deleteActivity } = useFilteredEvents();
  const [showDeleteButtons, setShowDeleteButtons] = useState<{ [key: string]: boolean }>({});
  
  // Edit event modal states
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventForm, setEditEventForm] = useState({
    name: '',
    description: '',
    location: '',
    invitedGuests: '',
  });
  
  // Edit activity modal states
  const [showEditActivityModal, setShowEditActivityModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityType | null>(null);
  const [editActivityForm, setEditActivityForm] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    day: 1,
  });
  
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({
    name: '',
    description: '',
    startTime: '',
    endTime: '',
    day: 1,
    sendWelcomeMessage: false,
    welcomeMessage: '',
  });
  
  // Duplicate activities modal states
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [sourceDayForDuplication, setSourceDayForDuplication] = useState<number>(1);
  const [selectedDaysForDuplication, setSelectedDaysForDuplication] = useState<number[]>([]);
  
  // Time picker states
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [startHour, setStartHour] = useState<number>(9);
  const [startMinute, setStartMinute] = useState<number>(0);
  const [endHour, setEndHour] = useState<number>(17);
  const [endMinute, setEndMinute] = useState<number>(0);

  const event = events.find(e => e.id === eventId);

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </View>
    );
  }

  const handleAddActivity = async () => {
    if (!activityForm.name.trim() || !activityForm.startTime.trim()) {
      console.error('Please fill in required fields');
      return;
    }

    try {
      await addActivity(eventId!, {
        name: activityForm.name.trim(),
        description: activityForm.description.trim(),
        startTime: activityForm.startTime.trim(),
        endTime: activityForm.endTime.trim(),
        isActive: true,
        day: event.isMultiDay ? activityForm.day : undefined,
        sendWelcomeMessage: activityForm.sendWelcomeMessage,
        welcomeMessage: activityForm.sendWelcomeMessage ? activityForm.welcomeMessage.trim() : undefined,
      });

      setActivityForm({ name: '', description: '', startTime: '', endTime: '', day: 1, sendWelcomeMessage: false, welcomeMessage: '' });
      setStartHour(9);
      setStartMinute(0);
      setEndHour(17);
      setEndMinute(0);
      setShowActivityModal(false);
      console.log('Activity added successfully');
    } catch (error) {
      console.error('Failed to add activity:', error);
    }
  };

  const handleEditEvent = () => {
    if (!event) return;
    setEditEventForm({
      name: event.name,
      description: event.description,
      location: event.location,
      invitedGuests: event.invitedGuests?.toString() || '',
    });
    setShowEditEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!event || !editEventForm.name.trim()) {
      Alert.alert('Error', 'Event name is required');
      return;
    }

    try {
      await updateEvent(eventId!, {
        name: editEventForm.name.trim(),
        description: editEventForm.description.trim(),
        location: editEventForm.location.trim(),
        invitedGuests: editEventForm.invitedGuests.trim() ? parseInt(editEventForm.invitedGuests.trim()) : undefined,
      });
      setShowEditEventModal(false);
      console.log('Event updated successfully');
    } catch (error) {
      console.error('Failed to update event:', error);
      Alert.alert('Error', 'Failed to update event');
    }
  };

  const handleEditActivity = (activity: ActivityType) => {
    setEditingActivity(activity);
    setEditActivityForm({
      name: activity.name,
      description: activity.description,
      startTime: activity.startTime,
      endTime: activity.endTime,
      day: activity.day || 1,
    });
    setShowEditActivityModal(true);
  };

  const handleSaveActivity = async () => {
    if (!editingActivity || !editActivityForm.name.trim() || !editActivityForm.startTime.trim()) {
      Alert.alert('Error', 'Activity name and start time are required');
      return;
    }

    try {
      await updateActivity(eventId!, editingActivity.id, {
        name: editActivityForm.name.trim(),
        description: editActivityForm.description.trim(),
        startTime: editActivityForm.startTime.trim(),
        endTime: editActivityForm.endTime.trim(),
        day: event?.isMultiDay ? editActivityForm.day : undefined,
      });
      setShowEditActivityModal(false);
      setEditingActivity(null);
      console.log('Activity updated successfully');
    } catch (error) {
      console.error('Failed to update activity:', error);
      Alert.alert('Error', 'Failed to update activity');
    }
  };

  const handleDeleteActivity = (activity: ActivityType) => {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to delete "${activity.name}"? This will also delete all scan data for this activity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteActivity(eventId!, activity.id);
              console.log('Activity deleted successfully');
            } catch (error) {
              console.error('Failed to delete activity:', error);
              Alert.alert('Error', 'Failed to delete activity');
            }
          },
        },
      ]
    );
  };

  const toggleDeleteButton = (activityId: string) => {
    setShowDeleteButtons(prev => ({
      ...prev,
      [activityId]: !prev[activityId],
    }));
  };

  const getDayCount = () => {
    if (!event.isMultiDay || !event.startDate || !event.endDate) return 1;
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const duplicateActivitiesToDays = async () => {
    if (selectedDaysForDuplication.length === 0) {
      Alert.alert('Error', 'Please select at least one day to duplicate activities to');
      return;
    }

    try {
      const sourceDayActivities = event.activities.filter(activity => activity.day === sourceDayForDuplication);
      
      if (sourceDayActivities.length === 0) {
        Alert.alert('Error', `No activities found for Day ${sourceDayForDuplication}`);
        return;
      }

      // Create duplicated activities for each selected day
      for (const targetDay of selectedDaysForDuplication) {
        for (const activity of sourceDayActivities) {
          await addActivity(eventId!, {
            name: activity.name,
            description: activity.description,
            startTime: activity.startTime,
            endTime: activity.endTime,
            isActive: activity.isActive,
            day: targetDay,
          });
        }
      }

      setShowDuplicateModal(false);
      setSelectedDaysForDuplication([]);
      Alert.alert('Success', `Successfully duplicated ${sourceDayActivities.length} activities to ${selectedDaysForDuplication.length} day(s)`);
    } catch (error) {
      console.error('Failed to duplicate activities:', error);
      Alert.alert('Error', 'Failed to duplicate activities');
    }
  };
  
  // Generate hours (0-23)
  const getHours = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };
  
  // Generate minutes (0, 15, 30, 45)
  const getMinutes = () => {
    return [0, 15, 30, 45];
  };
  
  // Format time for display
  const formatTime = (hour: number, minute: number) => {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    return `${formattedHour}:${formattedMinute}`;
  };
  
  // Handle time selection
  const handleStartTimeChange = (hour: number, minute: number) => {
    setStartHour(hour);
    setStartMinute(minute);
    const timeString = formatTime(hour, minute);
    setActivityForm(prev => ({ ...prev, startTime: timeString }));
  };
  
  const handleEndTimeChange = (hour: number, minute: number) => {
    setEndHour(hour);
    setEndMinute(minute);
    const timeString = formatTime(hour, minute);
    setActivityForm(prev => ({ ...prev, endTime: timeString }));
  };

  const renderActivity = (activity: ActivityType) => {
    const report = getAttendanceReport(eventId!, activity.id);
    
    return (
      <View key={activity.id} style={styles.activityCard}>
        <View style={styles.activityContent}>
          <View style={styles.activityHeader}>
            <View style={styles.activityTitleContainer}>
              <Text style={styles.activityName}>{activity.name}</Text>
              {event.isMultiDay && activity.day && (
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>Day {activity.day}</Text>
                </View>
              )}
            </View>
            <View style={styles.activityActions}>
              <View style={styles.attendanceBadge}>
                <Users size={14} color="#10b981" />
                <Text style={styles.attendanceText}>{report.totalAdmissions}</Text>
              </View>
              {isAdmin && (
                <View style={styles.activityButtonsContainer}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditActivity(activity)}
                  >
                    <Edit3 size={14} color="#1e40af" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.moreButton}
                    onPress={() => toggleDeleteButton(activity.id)}
                  >
                    <MoreVertical size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          {activity.description && (
            <Text style={styles.activityDescription}>{activity.description}</Text>
          )}
          
          <View style={styles.activityDetails}>
            <View style={styles.activityDetail}>
              <Clock size={16} color="#6b7280" />
              <Text style={styles.activityDetailText}>
                {activity.startTime}
                {activity.endTime && ` - ${activity.endTime}`}
              </Text>
            </View>
            
            <View style={styles.activityStats}>
              <Text style={styles.statText}>
                {report.totalScans} scans • {report.uniqueQRCodes} unique codes
              </Text>
            </View>
          </View>
        </View>
        
        {isAdmin && showDeleteButtons[activity.id] && (
          <TouchableOpacity
            style={styles.deleteActivityButton}
            onPress={() => handleDeleteActivity(activity)}
          >
            <Trash2 size={14} color="#ef4444" />
            <Text style={styles.deleteActivityButtonText}>Delete Activity</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.eventHeader}>
          <View style={styles.eventHeaderTop}>
            <View style={styles.eventTitleContainer}>
              <Text style={styles.eventName}>{event.name}</Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.editEventButton}
                  onPress={handleEditEvent}
                >
                  <Edit3 size={20} color={colors.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={styles.eventDescription}>{event.description}</Text>
          
          <View style={styles.eventDetails}>
            <View style={styles.eventDetail}>
              <Calendar size={20} color={colors.white} />
              <Text style={styles.eventDetailText}>
                {event.isMultiDay && event.endDate 
                  ? `${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`
                  : new Date(event.startDate || event.date || '').toLocaleDateString()
                }
              </Text>
            </View>
            
            <View style={styles.eventDetail}>
              <MapPin size={20} color={colors.white} />
              <Text style={styles.eventDetailText}>
                {event.locationDetails?.formattedAddress || event.location}
              </Text>
            </View>
            
            {event.invitedGuests && (
              <View style={styles.eventDetail}>
                <Users size={20} color={colors.white} />
                <Text style={styles.eventDetailText}>
                  {event.invitedGuests} invited guests
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activities</Text>
            {isAdmin && (
              <View style={styles.sectionHeaderButtons}>
                {event.isMultiDay && event.activities.length > 0 && (
                  <TouchableOpacity
                    style={styles.duplicateButton}
                    onPress={() => {
                      setSourceDayForDuplication(1);
                      setSelectedDaysForDuplication([]);
                      setShowDuplicateModal(true);
                    }}
                  >
                    <Copy size={18} color="#7c3aed" />
                    <Text style={styles.duplicateButtonText}>Duplicate</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.addActivityButton}
                  onPress={() => setShowActivityModal(true)}
                >
                  <Plus size={20} color="#1e40af" />
                  <Text style={styles.addActivityText}>Add Activity</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {event.activities.length === 0 ? (
            <View style={styles.emptyActivities}>
              <Activity size={48} color="#d1d5db" />
              <Text style={styles.emptyActivitiesText}>No activities yet</Text>
              {isAdmin && (
                <Text style={styles.emptyActivitiesSubtext}>
                  Add activities like admission, lunch, or tea breaks
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.activitiesList}>
              {event.activities.map(renderActivity)}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showActivityModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeaderSimple, { paddingTop: Math.max(insets.top, 16) }]}>
            <Text style={styles.modalTitle}>Add Activity</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalForm}>
              <View style={styles.field}>
                <Text style={styles.label}>Activity Name *</Text>
                <TextInput
                  style={styles.input}
                  value={activityForm.name}
                  onChangeText={(text) => setActivityForm(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Admission, Lunch, Tea Break"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={activityForm.description}
                  onChangeText={(text) => setActivityForm(prev => ({ ...prev, description: text }))}
                  placeholder="Activity description"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Start Time *</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Clock size={20} color="#6b7280" style={styles.timeIcon} />
                  <Text style={[styles.timeText, !activityForm.startTime && styles.timeTextPlaceholder]}>
                    {activityForm.startTime || 'Select start time'}
                  </Text>
                  <ChevronDown size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>End Time</Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Clock size={20} color="#6b7280" style={styles.timeIcon} />
                  <Text style={[styles.timeText, !activityForm.endTime && styles.timeTextPlaceholder]}>
                    {activityForm.endTime || 'Select end time'}
                  </Text>
                  <ChevronDown size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {event.isMultiDay && (
                <View style={styles.field}>
                  <Text style={styles.label}>Day *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                    {Array.from({ length: getDayCount() }, (_, i) => i + 1).map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayOption,
                          activityForm.day === day && styles.dayOptionSelected
                        ]}
                        onPress={() => setActivityForm(prev => ({ ...prev, day }))}
                      >
                        <Text style={[
                          styles.dayOptionText,
                          activityForm.day === day && styles.dayOptionTextSelected
                        ]}>
                          Day {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.field}>
                <View style={styles.toggleContainer}>
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.label}>Send Welcome Message</Text>
                    <Text style={styles.helperText}>
                      Automatically send a welcome message to guests when they scan their QR code
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      activityForm.sendWelcomeMessage && styles.toggleActive
                    ]}
                    onPress={() => setActivityForm(prev => ({ ...prev, sendWelcomeMessage: !prev.sendWelcomeMessage }))}
                  >
                    <View style={[
                      styles.toggleThumb,
                      activityForm.sendWelcomeMessage && styles.toggleThumbActive
                    ]} />
                  </TouchableOpacity>
                </View>
              </View>

              {activityForm.sendWelcomeMessage && (
                <View style={styles.field}>
                  <Text style={styles.label}>Welcome Message *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={activityForm.welcomeMessage}
                    onChangeText={(text) => setActivityForm(prev => ({ ...prev, welcomeMessage: text }))}
                    placeholder="Enter a custom welcome message for guests...\ne.g., Welcome to our event! Please proceed to the registration desk."
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={styles.placeholderHint}>
                    <Text style={styles.placeholderHintTitle}>Available Placeholders:</Text>
                    <Text style={styles.placeholderHintItem}>• {'{guestName}'} - Guest&apos;s name from QR code</Text>
                    <Text style={styles.placeholderHintItem}>• {'{eventName}'} - Event name</Text>
                    <Text style={styles.placeholderHintItem}>• {'{location}'} - Event location</Text>
                    <Text style={styles.placeholderHintExample}>Example: &quot;Welcome to {'{eventName}'}, {'{guestName}'}! The event is at {'{location}'}&quot;</Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowActivityModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleAddActivity}
            >
              <Text style={styles.modalSaveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Start Time Picker Modal */}
        {showStartTimePicker && (
          <View style={styles.timePickerOverlay}>
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerHeader}>
                <Text style={styles.timePickerTitle}>Select Start Time</Text>
                <TouchableOpacity
                  style={styles.timePickerClose}
                  onPress={() => setShowStartTimePicker(false)}
                >
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.timePickerContent}>
                <View style={styles.timePickerRow}>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Hour</Text>
                    <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                      {getHours().map(hour => (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.timePickerOption,
                            startHour === hour && styles.timePickerOptionSelected
                          ]}
                          onPress={() => setStartHour(hour)}
                        >
                          <Text style={[
                            styles.timePickerOptionText,
                            startHour === hour && styles.timePickerOptionTextSelected
                          ]}>
                            {hour.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Minute</Text>
                    <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                      {getMinutes().map(minute => (
                        <TouchableOpacity
                          key={minute}
                          style={[
                            styles.timePickerOption,
                            startMinute === minute && styles.timePickerOptionSelected
                          ]}
                          onPress={() => setStartMinute(minute)}
                        >
                          <Text style={[
                            styles.timePickerOptionText,
                            startMinute === minute && styles.timePickerOptionTextSelected
                          ]}>
                            {minute.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
              
              <View style={styles.timePickerFooter}>
                <TouchableOpacity
                  style={styles.timePickerCancelButton}
                  onPress={() => setShowStartTimePicker(false)}
                >
                  <Text style={styles.timePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timePickerConfirmButton}
                  onPress={() => {
                    handleStartTimeChange(startHour, startMinute);
                    setShowStartTimePicker(false);
                  }}
                >
                  <Text style={styles.timePickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        
        {/* End Time Picker Modal */}
        {showEndTimePicker && (
          <View style={styles.timePickerOverlay}>
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerHeader}>
                <Text style={styles.timePickerTitle}>Select End Time</Text>
                <TouchableOpacity
                  style={styles.timePickerClose}
                  onPress={() => setShowEndTimePicker(false)}
                >
                  <X size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.timePickerContent}>
                <View style={styles.timePickerRow}>
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Hour</Text>
                    <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                      {getHours().map(hour => (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.timePickerOption,
                            endHour === hour && styles.timePickerOptionSelected
                          ]}
                          onPress={() => setEndHour(hour)}
                        >
                          <Text style={[
                            styles.timePickerOptionText,
                            endHour === hour && styles.timePickerOptionTextSelected
                          ]}>
                            {hour.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.timePickerColumn}>
                    <Text style={styles.timePickerLabel}>Minute</Text>
                    <ScrollView style={styles.timePickerScroll} showsVerticalScrollIndicator={false}>
                      {getMinutes().map(minute => (
                        <TouchableOpacity
                          key={minute}
                          style={[
                            styles.timePickerOption,
                            endMinute === minute && styles.timePickerOptionSelected
                          ]}
                          onPress={() => setEndMinute(minute)}
                        >
                          <Text style={[
                            styles.timePickerOptionText,
                            endMinute === minute && styles.timePickerOptionTextSelected
                          ]}>
                            {minute.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              </View>
              
              <View style={styles.timePickerFooter}>
                <TouchableOpacity
                  style={styles.timePickerCancelButton}
                  onPress={() => setShowEndTimePicker(false)}
                >
                  <Text style={styles.timePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timePickerConfirmButton}
                  onPress={() => {
                    handleEndTimeChange(endHour, endMinute);
                    setShowEndTimePicker(false);
                  }}
                >
                  <Text style={styles.timePickerConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>

      {/* Edit Event Modal */}
      <Modal
        visible={showEditEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeaderSimple, { paddingTop: Math.max(insets.top, 16) }]}>
            <Text style={styles.modalTitle}>Edit Event</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalForm}>
              <View style={styles.field}>
                <Text style={styles.label}>Event Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editEventForm.name}
                  onChangeText={(text) => setEditEventForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter event name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editEventForm.description}
                  onChangeText={(text) => setEditEventForm(prev => ({ ...prev, description: text }))}
                  placeholder="Event description"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Location *</Text>
                <TextInput
                  style={styles.input}
                  value={editEventForm.location}
                  onChangeText={(text) => setEditEventForm(prev => ({ ...prev, location: text }))}
                  placeholder="Enter location"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Invited Guests</Text>
                <TextInput
                  style={styles.input}
                  value={editEventForm.invitedGuests}
                  onChangeText={(text) => setEditEventForm(prev => ({ ...prev, invitedGuests: text }))}
                  placeholder="Enter number of invited guests"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowEditEventModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveEvent}
            >
              <Text style={styles.modalSaveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Duplicate Activities Modal */}
      <Modal
        visible={showDuplicateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeaderSimple, { paddingTop: Math.max(insets.top, 16) }]}>
            <Text style={styles.modalTitle}>Duplicate Activities</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalForm}>
              <View style={styles.field}>
                <Text style={styles.label}>Copy activities from</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                  {Array.from({ length: getDayCount() }, (_, i) => i + 1).map((day) => {
                    const dayActivities = event.activities.filter(a => a.day === day);
                    const hasActivities = dayActivities.length > 0;
                    
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayOption,
                          sourceDayForDuplication === day && styles.dayOptionSelected,
                          !hasActivities && styles.dayOptionDisabled,
                        ]}
                        onPress={() => hasActivities && setSourceDayForDuplication(day)}
                        disabled={!hasActivities}
                      >
                        <Text style={[
                          styles.dayOptionText,
                          sourceDayForDuplication === day && styles.dayOptionTextSelected,
                          !hasActivities && styles.dayOptionTextDisabled,
                        ]}>
                          Day {day} ({dayActivities.length})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>To following days</Text>
                <Text style={styles.helperText}>
                  Select one or more days to duplicate activities to
                </Text>
                <View style={styles.daysGrid}>
                  {Array.from({ length: getDayCount() }, (_, i) => i + 1)
                    .filter(day => day !== sourceDayForDuplication)
                    .map((day) => {
                      const isSelected = selectedDaysForDuplication.includes(day);
                      
                      return (
                        <TouchableOpacity
                          key={day}
                          style={[
                            styles.dayCheckbox,
                            isSelected && styles.dayCheckboxSelected,
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSelectedDaysForDuplication(prev => prev.filter(d => d !== day));
                            } else {
                              setSelectedDaysForDuplication(prev => [...prev, day]);
                            }
                          }}
                        >
                          <Text style={[
                            styles.dayCheckboxText,
                            isSelected && styles.dayCheckboxTextSelected,
                          ]}>
                            Day {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </View>

              {sourceDayForDuplication && (
                <View style={styles.previewSection}>
                  <Text style={styles.previewTitle}>
                    Activities to be duplicated from Day {sourceDayForDuplication}:
                  </Text>
                  {event.activities
                    .filter(activity => activity.day === sourceDayForDuplication)
                    .map((activity) => (
                      <View key={activity.id} style={styles.previewActivityCard}>
                        <Text style={styles.previewActivityName}>{activity.name}</Text>
                        <Text style={styles.previewActivityTime}>
                          {activity.startTime}{activity.endTime && ` - ${activity.endTime}`}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowDuplicateModal(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={duplicateActivitiesToDays}
            >
              <Text style={styles.modalSaveButtonText}>Duplicate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Activity Modal */}
      <Modal
        visible={showEditActivityModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeaderSimple, { paddingTop: Math.max(insets.top, 16) }]}>
            <Text style={styles.modalTitle}>Edit Activity</Text>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modalForm}>
              <View style={styles.field}>
                <Text style={styles.label}>Activity Name *</Text>
                <TextInput
                  style={styles.input}
                  value={editActivityForm.name}
                  onChangeText={(text) => setEditActivityForm(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Admission, Lunch, Tea Break"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editActivityForm.description}
                  onChangeText={(text) => setEditActivityForm(prev => ({ ...prev, description: text }))}
                  placeholder="Activity description"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Start Time *</Text>
                <TextInput
                  style={styles.input}
                  value={editActivityForm.startTime}
                  onChangeText={(text) => setEditActivityForm(prev => ({ ...prev, startTime: text }))}
                  placeholder="e.g., 09:00"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  value={editActivityForm.endTime}
                  onChangeText={(text) => setEditActivityForm(prev => ({ ...prev, endTime: text }))}
                  placeholder="e.g., 17:00"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {event?.isMultiDay && (
                <View style={styles.field}>
                  <Text style={styles.label}>Day *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector}>
                    {Array.from({ length: getDayCount() }, (_, i) => i + 1).map((day) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayOption,
                          editActivityForm.day === day && styles.dayOptionSelected
                        ]}
                        onPress={() => setEditActivityForm(prev => ({ ...prev, day }))}
                      >
                        <Text style={[
                          styles.dayOptionText,
                          editActivityForm.day === day && styles.dayOptionTextSelected
                        ]}>
                          Day {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setShowEditActivityModal(false);
                setEditingActivity(null);
              }}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveActivity}
            >
              <Text style={styles.modalSaveButtonText}>Save</Text>
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
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
  },
  eventHeader: {
    backgroundColor: colors.primary,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryDark,
  },
  eventName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
    marginBottom: 16,
  },
  eventDetails: {
    gap: 12,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDetailText: {
    fontSize: 16,
    color: colors.white,
    marginLeft: 12,
  },
  section: {
    backgroundColor: '#ffffff',
    marginTop: 8,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  addActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addActivityText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyActivities: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyActivitiesText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
  },
  emptyActivitiesSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityContent: {
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  activityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attendanceText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  activityDetails: {
    gap: 8,
  },
  activityDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityDetailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  activityStats: {
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalHeaderSimple: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalSaveText: {
    fontSize: 16,
    color: '#1e40af',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalContent: {
    flex: 1,
  },
  modalForm: {
    padding: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  eventHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editEventButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  activityButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
  },
  moreButton: {
    padding: 4,
  },
  deleteActivityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    gap: 6,
  },
  deleteActivityButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
  activityTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  dayBadgeText: {
    fontSize: 10,
    color: '#1e40af',
    fontWeight: '600',
  },
  daySelector: {
    flexDirection: 'row',
  },
  dayOption: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  dayOptionSelected: {
    backgroundColor: '#1e40af',
    borderColor: '#1e40af',
  },
  dayOptionText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  dayOptionTextSelected: {
    color: '#ffffff',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  timeIcon: {
    marginRight: 12,
  },
  timeText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  timeTextPlaceholder: {
    color: '#9ca3af',
  },
  timePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  timePickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 20,
    maxWidth: 300,
    width: '80%',
    height: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10000,
    flexDirection: 'column',
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  timePickerClose: {
    padding: 4,
  },
  timePickerContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 10,
    minHeight: 0,
    overflow: 'hidden',
  },
  timePickerRow: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
    minHeight: 220,
  },
  timePickerColumn: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  timePickerScroll: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 220,
  },
  timePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  timePickerOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  timePickerOptionText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  timePickerOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  timePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    flexShrink: 0,
    minHeight: 60,
    position: 'relative',
    zIndex: 1,
  },
  timePickerCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  timePickerConfirmButton: {
    flex: 1,
    backgroundColor: '#1e40af',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  duplicateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  duplicateButtonText: {
    fontSize: 14,
    color: '#7c3aed',
    fontWeight: '500',
    marginLeft: 4,
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    marginTop: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCheckbox: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    minWidth: 80,
    alignItems: 'center',
  },
  dayCheckboxSelected: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  dayCheckboxText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  dayCheckboxTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dayOptionDisabled: {
    opacity: 0.4,
  },
  dayOptionTextDisabled: {
    color: '#9ca3af',
  },
  previewSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  previewActivityCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  previewActivityName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  previewActivityTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d1d5db',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#10b981',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  placeholderHint: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  placeholderHintTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  placeholderHintItem: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 18,
  },
  placeholderHintExample: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 18,
  },
});