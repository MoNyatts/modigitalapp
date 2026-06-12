import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from '@/navigation/router';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { Calendar, MapPin, Clock, X } from 'lucide-react-native';

interface LocationSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface LocationDetails {
  place_id: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export default function CreateEventScreen() {
  const { user } = useAuth();
  const { createEvent } = useEvents();
  const insets = useSafeAreaInsets();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isMultiDay: false,
    startDate: '',
    endDate: '',
    location: '',
    invitedGuests: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedLocationDetails, setSelectedLocationDetails] = useState<LocationDetails | null>(null);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Dropdown date picker states
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState<number>(new Date().getMonth());
  const [startDay, setStartDay] = useState<number>(new Date().getDate());
  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState<number>(new Date().getMonth());
  const [endDay, setEndDay] = useState<number>(new Date().getDate());

  const searchLocations = useCallback(async (query: string) => {
    const sanitizedQuery = query?.trim() || '';
    if (!sanitizedQuery || sanitizedQuery.length < 3 || sanitizedQuery.length > 100) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    setIsLoadingLocation(true);
    try {
      // Use Google Places API for both web and mobile
      const GOOGLE_PLACES_API_KEY = 'AIzaSyBvOkBwgGlbUiuS-oSLHrMiaPyBtXTlTBs'; // Replace with your actual API key
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(sanitizedQuery)}&key=${GOOGLE_PLACES_API_KEY}&types=establishment|geocode`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        const suggestions: LocationSuggestion[] = data.predictions.slice(0, 5).map((prediction: any) => ({
          place_id: prediction.place_id,
          description: prediction.description,
          structured_formatting: {
            main_text: prediction.structured_formatting?.main_text || prediction.description,
            secondary_text: prediction.structured_formatting?.secondary_text || ''
          }
        }));
        setLocationSuggestions(suggestions);
        setShowLocationSuggestions(true);
      } else {
        console.warn('Google Places API error:', data.status, data.error_message);
        // Fallback to simple suggestion
        const fallbackSuggestions: LocationSuggestion[] = [
          {
            place_id: `fallback_${sanitizedQuery}`,
            description: sanitizedQuery,
            structured_formatting: {
              main_text: sanitizedQuery,
              secondary_text: 'Custom Location'
            }
          }
        ];
        setLocationSuggestions(fallbackSuggestions);
        setShowLocationSuggestions(true);
      }
    } catch (error) {
      console.error('Failed to search locations:', error);
      // Always provide at least the typed location as an option
      const errorSuggestions: LocationSuggestion[] = [
        {
          place_id: `error_${sanitizedQuery}`,
          description: sanitizedQuery,
          structured_formatting: {
            main_text: sanitizedQuery,
            secondary_text: 'Use as entered'
          }
        }
      ];
      setLocationSuggestions(errorSuggestions);
      setShowLocationSuggestions(true);
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  const getLocationDetails = useCallback(async (placeId: string, description: string) => {
    try {
      // If it's a fallback/error place_id, create basic details
      if (placeId.startsWith('fallback_') || placeId.startsWith('error_')) {
        const basicDetails: LocationDetails = {
          place_id: placeId,
          formatted_address: description,
          geometry: {
            location: {
              lat: 0,
              lng: 0
            }
          }
        };
        setSelectedLocationDetails(basicDetails);
        return basicDetails;
      }
      
      // Use Google Places Details API for real place IDs
      const GOOGLE_PLACES_API_KEY = 'AIzaSyBvOkBwgGlbUiuS-oSLHrMiaPyBtXTlTBs'; // Replace with your actual API key
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&fields=place_id,formatted_address,geometry`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const details: LocationDetails = {
          place_id: data.result.place_id,
          formatted_address: data.result.formatted_address,
          geometry: {
            location: {
              lat: data.result.geometry?.location?.lat || 0,
              lng: data.result.geometry?.location?.lng || 0
            }
          }
        };
        setSelectedLocationDetails(details);
        return details;
      } else {
        console.warn('Google Places Details API error:', data.status, data.error_message);
        // Fallback to basic details
        const fallbackDetails: LocationDetails = {
          place_id: placeId,
          formatted_address: description,
          geometry: {
            location: {
              lat: 0,
              lng: 0
            }
          }
        };
        setSelectedLocationDetails(fallbackDetails);
        return fallbackDetails;
      }
    } catch (error) {
      console.error('Failed to get location details:', error);
      // Fallback to basic details
      const errorDetails: LocationDetails = {
        place_id: placeId,
        formatted_address: description,
        geometry: {
          location: {
            lat: 0,
            lng: 0
          }
        }
      };
      setSelectedLocationDetails(errorDetails);
      return errorDetails;
    }
  }, []);

  const handleLocationSelect = async (suggestion: LocationSuggestion) => {
    setFormData(prev => ({ ...prev, location: suggestion.description }));
    setShowLocationSuggestions(false);
    setLocationSuggestions([]);
    
    await getLocationDetails(suggestion.place_id, suggestion.description);
  };

  const handleStartDateChange = (year: number, month: number, day: number) => {
    // Create date in local timezone to avoid timezone offset issues
    const selectedDate = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      if (Platform.OS !== 'web') {
        Alert.alert('Invalid Date', 'Please select a date that is today or in the future.');
      } else {
        console.warn('Invalid date selected');
      }
      return;
    }
    
    setStartYear(year);
    setStartMonth(month);
    setStartDay(day);
    
    // Format date as YYYY-MM-DD in local timezone to avoid timezone issues
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log('Setting start date:', dateString, 'from', year, month + 1, day);
    setFormData(prev => ({ ...prev, startDate: dateString }));
    
    // If end date is before or equal to start date, update it to ensure minimum 2-day event (next day)
    if (formData.isMultiDay && formData.endDate) {
      const endDate = new Date(formData.endDate + 'T00:00:00');
      if (endDate <= selectedDate) {
        // Set end date to next day after start date (minimum 2-day event)
        const minEndDate = new Date(selectedDate);
        minEndDate.setDate(minEndDate.getDate() + 1);
        setEndYear(minEndDate.getFullYear());
        setEndMonth(minEndDate.getMonth());
        setEndDay(minEndDate.getDate());
        const minEndDateString = `${minEndDate.getFullYear()}-${String(minEndDate.getMonth() + 1).padStart(2, '0')}-${String(minEndDate.getDate()).padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, endDate: minEndDateString }));
      }
    }
  };

  const handleEndDateChange = (year: number, month: number, day: number) => {
    const selectedDate = new Date(year, month, day);
    
    // Ensure end date is after start date
    if (formData.startDate) {
      const startDate = new Date(formData.startDate + 'T00:00:00');
      if (selectedDate <= startDate) {
        if (Platform.OS !== 'web') {
          Alert.alert('Invalid Date', 'End date must be after the start date.');
        } else {
          console.warn('Invalid end date selected');
        }
        return;
      }
      
      // Calculate duration in days (end date - start date)
      const timeDiff = selectedDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      // Validate multi-day event duration (minimum 1 day difference = 2-day event, maximum 999 days)
      if (daysDiff < 1) {
        if (Platform.OS !== 'web') {
          Alert.alert('Invalid Duration', 'Multi-day events must span at least 2 days (end date must be at least the next day).');
        } else {
          console.warn('Multi-day events must span at least 2 days');
        }
        return;
      }
      
      if (daysDiff > 999) {
        if (Platform.OS !== 'web') {
          Alert.alert('Invalid Duration', 'Multi-day events cannot exceed 999 days.');
        } else {
          console.warn('Multi-day events cannot exceed 999 days');
        }
        return;
      }
    }
    
    setEndYear(year);
    setEndMonth(month);
    setEndDay(day);
    
    // Format date as YYYY-MM-DD in local timezone to avoid timezone issues
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    console.log('Setting end date:', dateString, 'from', year, month + 1, day);
    setFormData(prev => ({ ...prev, endDate: dateString }));
  };


  
  // Generate years (current year + 5 years)
  const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i <= 5; i++) {
      years.push(currentYear + i);
    }
    return years;
  };
  
  // Generate months
  const getMonths = () => {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  };
  
  // Generate days for selected month/year
  const getDays = (year: number, month: number) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };
  
  const handleSubmit = async () => {
    const requiredFields = [formData.name.trim(), formData.startDate.trim(), formData.location.trim()];
    if (formData.isMultiDay) {
      requiredFields.push(formData.endDate.trim());
    }
    
    if (requiredFields.some(field => !field)) {
      if (Platform.OS !== 'web') {
        Alert.alert('Missing Information', 'Please fill in all required fields.');
      } else {
        console.error('Missing required fields');
      }
      return;
    }

    if (!user) {
      if (Platform.OS !== 'web') {
        Alert.alert('Authentication Error', 'User not authenticated. Please log in again.');
      } else {
        console.error('User not authenticated');
      }
      return;
    }

    // Validate dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(formData.startDate + 'T00:00:00');
    
    if (startDate < today) {
      if (Platform.OS !== 'web') {
        Alert.alert('Invalid Date', 'Start date cannot be in the past.');
      } else {
        console.error('Start date cannot be in the past');
      }
      return;
    }
    
    if (formData.isMultiDay && formData.endDate) {
      const endDate = new Date(formData.endDate + 'T00:00:00');
      if (endDate <= startDate) {
        if (Platform.OS !== 'web') {
          Alert.alert('Invalid Date', 'End date must be after the start date.');
        } else {
          console.error('End date must be after the start date');
        }
        return;
      }
      
      // Calculate duration in days for multi-day events
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      // Validate multi-day event duration (minimum 1 day difference = 2-day event, maximum 999 days)
      if (daysDiff < 1) {
        if (Platform.OS !== 'web') {
          Alert.alert('Invalid Duration', 'Multi-day events must span at least 2 days (end date must be at least the next day).');
        } else {
          console.error('Multi-day events must span at least 2 days');
        }
        return;
      }
      
      if (daysDiff > 999) {
        if (Platform.OS !== 'web') {
          Alert.alert('Invalid Duration', 'Multi-day events cannot exceed 999 days.');
        } else {
          console.error('Multi-day events cannot exceed 999 days');
        }
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createEvent({
        name: formData.name.trim(),
        description: formData.description.trim(),
        isMultiDay: formData.isMultiDay,
        startDate: formData.startDate.trim(),
        endDate: formData.isMultiDay ? formData.endDate.trim() : undefined,
        location: formData.location.trim(),
        invitedGuests: formData.invitedGuests.trim() ? parseInt(formData.invitedGuests.trim()) : undefined,
        locationDetails: selectedLocationDetails ? {
          placeId: selectedLocationDetails.place_id,
          formattedAddress: selectedLocationDetails.formatted_address,
          coordinates: {
            lat: selectedLocationDetails.geometry.location.lat,
            lng: selectedLocationDetails.geometry.location.lng,
          },
        } : undefined,
        createdBy: user.id,
      });

      console.log('Event created successfully');
      if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Event created successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        router.back();
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to create event. Please try again.');
      } else {
        console.error('Failed to create event. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Event Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Enter event name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Enter event description"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Event Duration *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[styles.radioOption, !formData.isMultiDay && styles.radioOptionSelected]}
                onPress={() => setFormData(prev => ({ ...prev, isMultiDay: false, endDate: '' }))}
              >
                <View style={[styles.radioCircle, !formData.isMultiDay && styles.radioCircleSelected]}>
                  {!formData.isMultiDay && <View style={styles.radioInner} />}
                </View>
                <Calendar size={20} color={!formData.isMultiDay ? '#1e40af' : '#6b7280'} style={styles.radioIcon} />
                <Text style={[styles.radioText, !formData.isMultiDay && styles.radioTextSelected]}>Single Day</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.radioOption, formData.isMultiDay && styles.radioOptionSelected]}
                onPress={() => setFormData(prev => ({ ...prev, isMultiDay: true }))}
              >
                <View style={[styles.radioCircle, formData.isMultiDay && styles.radioCircleSelected]}>
                  {formData.isMultiDay && <View style={styles.radioInner} />}
                </View>
                <Clock size={20} color={formData.isMultiDay ? '#1e40af' : '#6b7280'} style={styles.radioIcon} />
                <View style={styles.radioTextContainer}>
                  <Text style={[styles.radioText, formData.isMultiDay && styles.radioTextSelected]}>Multi-Day</Text>
                  <Text style={[styles.radioSubtext, formData.isMultiDay && styles.radioSubtextSelected]}>(2-999 days)</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Start Date *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Calendar size={20} color="#6b7280" style={styles.dateIcon} />
              <Text style={[styles.dateText, !formData.startDate && styles.dateTextPlaceholder]}>
                {formData.startDate ? new Date(formData.startDate + 'T00:00:00').toLocaleDateString() : 'Select start date'}
              </Text>
            </TouchableOpacity>
          </View>

          {formData.isMultiDay && (
            <View style={styles.field}>
              <Text style={styles.label}>End Date *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Calendar size={20} color="#6b7280" style={styles.dateIcon} />
                <Text style={[styles.dateText, !formData.endDate && styles.dateTextPlaceholder]}>
                  {formData.endDate ? new Date(formData.endDate + 'T00:00:00').toLocaleDateString() : 'Select end date'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>Invited Guests</Text>
            <TextInput
              style={styles.input}
              value={formData.invitedGuests}
              onChangeText={(text) => setFormData(prev => ({ ...prev, invitedGuests: text }))}
              placeholder="Enter number of invited guests"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Location *</Text>
            <View style={styles.locationContainer}>
              <View style={styles.locationInputContainer}>
                <MapPin size={20} color="#6b7280" style={styles.locationIcon} />
                <TextInput
                  style={styles.locationInput}
                  value={formData.location}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, location: text }));
                    searchLocations(text);
                  }}
                  placeholder="Enter location name..."
                  placeholderTextColor="#9ca3af"
                  onFocus={() => {
                    if (formData.location.length >= 3) {
                      searchLocations(formData.location);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow selection
                    setTimeout(() => setShowLocationSuggestions(false), 200);
                  }}
                />
                {isLoadingLocation && (
                  <ActivityIndicator size="small" color="#1e40af" style={styles.loadingIcon} />
                )}
              </View>
              
              {showLocationSuggestions && locationSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <View style={styles.suggestionsList}>
                    {locationSuggestions.slice(0, 5).map((item) => (
                      <TouchableOpacity
                        key={item.place_id}
                        style={styles.suggestionItem}
                        onPress={() => handleLocationSelect(item)}
                      >
                        <MapPin size={16} color="#6b7280" style={styles.suggestionIcon} />
                        <View style={styles.suggestionText}>
                          <Text style={styles.suggestionMain}>{item.structured_formatting.main_text}</Text>
                          <Text style={styles.suggestionSecondary}>{item.structured_formatting.secondary_text}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating...' : 'Create Event'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showStartDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStartDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Start Date</Text>
              <TouchableOpacity
                style={styles.datePickerClose}
                onPress={() => setShowStartDatePicker(false)}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContent}>
              <View style={styles.datePickerRow}>
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>Year</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {getYears().map(year => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.datePickerOption,
                          startYear === year && styles.datePickerOptionSelected
                        ]}
                        onPress={() => {
                          setStartYear(year);
                          const newDays = getDays(year, startMonth);
                          if (startDay > newDays.length) {
                            setStartDay(newDays.length);
                          }
                        }}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          startYear === year && styles.datePickerOptionTextSelected
                        ]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>Month</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {getMonths().map((month, index) => (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.datePickerOption,
                          startMonth === index && styles.datePickerOptionSelected
                        ]}
                        onPress={() => {
                          setStartMonth(index);
                          const newDays = getDays(startYear, index);
                          if (startDay > newDays.length) {
                            setStartDay(newDays.length);
                          }
                        }}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          startMonth === index && styles.datePickerOptionTextSelected
                        ]}>
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>Day</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {getDays(startYear, startMonth).map(day => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.datePickerOption,
                          startDay === day && styles.datePickerOptionSelected
                        ]}
                        onPress={() => setStartDay(day)}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          startDay === day && styles.datePickerOptionTextSelected
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
            
            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowStartDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  handleStartDateChange(startYear, startMonth, startDay);
                  setShowStartDatePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <Modal
        visible={showEndDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select End Date</Text>
              <TouchableOpacity
                style={styles.datePickerClose}
                onPress={() => setShowEndDatePicker(false)}
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.datePickerContent}>
              <View style={styles.datePickerRow}>
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>Year</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {getYears().map(year => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.datePickerOption,
                          endYear === year && styles.datePickerOptionSelected
                        ]}
                        onPress={() => {
                          setEndYear(year);
                          const newDays = getDays(year, endMonth);
                          if (endDay > newDays.length) {
                            setEndDay(newDays.length);
                          }
                        }}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          endYear === year && styles.datePickerOptionTextSelected
                        ]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>Month</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {getMonths().map((month, index) => (
                      <TouchableOpacity
                        key={month}
                        style={[
                          styles.datePickerOption,
                          endMonth === index && styles.datePickerOptionSelected
                        ]}
                        onPress={() => {
                          setEndMonth(index);
                          const newDays = getDays(endYear, index);
                          if (endDay > newDays.length) {
                            setEndDay(newDays.length);
                          }
                        }}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          endMonth === index && styles.datePickerOptionTextSelected
                        ]}>
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.datePickerColumn}>
                  <Text style={styles.datePickerLabel}>Day</Text>
                  <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                    {getDays(endYear, endMonth).map(day => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.datePickerOption,
                          endDay === day && styles.datePickerOptionSelected
                        ]}
                        onPress={() => setEndDay(day)}
                      >
                        <Text style={[
                          styles.datePickerOptionText,
                          endDay === day && styles.datePickerOptionTextSelected
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>
            
            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowEndDatePicker(false)}
              >
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  handleEndDateChange(endYear, endMonth, endDay);
                  setShowEndDatePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
  form: {
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  radioOptionSelected: {
    borderColor: '#1e40af',
    backgroundColor: '#eff6ff',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioCircleSelected: {
    borderColor: '#1e40af',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1e40af',
  },
  radioIcon: {
    marginRight: 8,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  radioTextSelected: {
    color: '#1e40af',
  },
  radioTextContainer: {
    flexDirection: 'column',
  },
  radioSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  radioSubtextSelected: {
    color: '#1e40af',
  },
  locationContainer: {
    position: 'relative',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  suggestionSecondary: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateIcon: {
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  dateTextPlaceholder: {
    color: '#9ca3af',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    maxHeight: '85%',
    minHeight: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    flexDirection: 'column',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  datePickerClose: {
    padding: 4,
  },
  datePickerContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 10,
    minHeight: 0,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
    minHeight: 220,
  },
  datePickerColumn: {
    flex: 1,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  datePickerScroll: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 250,
  },
  datePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  datePickerOptionSelected: {
    backgroundColor: '#dbeafe',
  },
  datePickerOptionText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  datePickerOptionTextSelected: {
    color: '#1e40af',
    fontWeight: '600',
  },
  datePickerFooter: {
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
  },
  datePickerCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  datePickerConfirmButton: {
    flex: 1,
    backgroundColor: '#1e40af',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});