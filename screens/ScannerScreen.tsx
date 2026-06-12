import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QrCode, Scan, AlertCircle, X, CheckCircle, Plus, Minus } from 'lucide-react-native';
import { CameraView, Camera } from '@/lib/camera';
import { useAuth } from '@/hooks/useAuth';
import { useFilteredEvents, useEventActivity } from '@/hooks/useEvents';
import type { Event, Activity } from '@/types';
import { colors } from '@/constants/colors';

export default function ScannerScreen() {
  const { user, canUseScanner } = useAuth();
  const { events, qrCodes, scanQRCode, checkQRCodeNetworkStatus, getQRCodeStatus, isOnline, syncStatus, refetchData, extractQRCodePrefix } = useFilteredEvents();

  // ── Real-time sync: poll server every 5 s so this device sees other scanners ──
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const { liveScans, report: liveReport } = useEventActivity(
    selectedEvent?.id || '',
    selectedActivity?.id
  );
  const insets = useSafeAreaInsets();
  
  const [cameraPermission, setCameraPermission] = useState<{ granted: boolean } | null>(null);
  
  const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
  const cameraAvailable = isNativePlatform;
  
  const requestCameraPermission = useCallback(async () => {
    if (!isNativePlatform) {
      return { granted: false };
    }
    try {
      const result = await Camera.requestCameraPermissionsAsync();
      setCameraPermission({ granted: result.status === 'granted' });
      return { granted: result.status === 'granted' };
    } catch (error) {
      console.log('[Scanner] Permission request error:', error);
      return { granted: false };
    }
  }, [isNativePlatform]);
  
  const permission = cameraPermission;
  
  const [showEventModal, setShowEventModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [admissionCount, setAdmissionCount] = useState('1');
  const [maxAdmissionCount, setMaxAdmissionCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [scanMessageType] = useState<'success' | 'warning' | 'error'>('success');
  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [pendingAdmission, setPendingAdmission] = useState<{
    code: string;
    message: string;
    messageType: 'success' | 'warning' | 'error';
    canAdmit: boolean;
  } | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupEventName, setPopupEventName] = useState('');
  const [popupGuestName, setPopupGuestName] = useState('');

  // Helper function to check if an activity is available for scanning today
  const isActivityAvailableToday = (event: Event, activity: Activity): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    if (event.isMultiDay && activity.day) {
      // For multi-day events, calculate the actual date for this activity's day
      const eventStartDate = new Date(event.startDate);
      eventStartDate.setHours(0, 0, 0, 0);
      
      const activityDate = new Date(eventStartDate);
      activityDate.setDate(eventStartDate.getDate() + (activity.day - 1));
      
      // Activity is available only on its specific day
      return activityDate.getTime() === today.getTime();
    } else {
      // For single-day events, check if today matches the event date
      const eventDate = new Date(event.date || event.startDate);
      eventDate.setHours(0, 0, 0, 0);
      
      return eventDate.getTime() === today.getTime();
    }
  };

  // Filter events to only show those with activities available today
  const activeEvents = events.filter(event => 
    event.activities.length > 0 && 
    event.activities.some(activity => isActivityAvailableToday(event, activity))
  );

  /**
   * checkQRCodeAndPrepareAdmission — NETWORKED VERSION
   *
   * Queries the server for the real-time status of this QR code.
   * This ensures Scanner A and Scanner B always see the same state —
   * no local cache is used for the admission decision.
   */
  const checkQRCodeAndPrepareAdmission = async (scannedCode: string) => {
    if (!selectedEvent || !selectedActivity || !user) {
      Alert.alert('Error', 'Please select event and activity first');
      return;
    }

    const codeToScan = scannedCode.trim();
    if (!codeToScan) {
      Alert.alert('Error', 'Please enter or scan a QR code');
      return;
    }

    // Validate format locally (S/D/M prefix)
    const type = codeToScan.charAt(0).toUpperCase();
    const codePrefix = extractQRCodePrefix(codeToScan);
    if (!['S', 'D', 'M'].includes(type)) {
      setPendingAdmission({
        code: codeToScan,
        message: 'Invalid QR code format! Code must start with S, D, or M.',
        messageType: 'error',
        canAdmit: false,
      });
      setMaxAdmissionCount(0);
      setAdmissionCount('0');
      setShowAdmissionModal(true);
      return;
    }

    // ── Server check: get LIVE status from server (multi-device safe) ────────
    let remainingAdmissions: number;
    let message: string;
    let messageType: 'success' | 'warning' | 'error' = 'success';
    let canAdmit = true;

    try {
      const serverStatus = await checkQRCodeNetworkStatus(
        codeToScan,
        selectedEvent.id,
        selectedActivity.id
      );

      if (serverStatus.isScanned) {
        // QR code is fully used — reject immediately
        setPopupMessage(`Sorry, this code ${codePrefix} is used up! (${serverStatus.totalAdmissions}/${serverStatus.maxAdmissions} admissions used)`);
        setShowErrorPopup(true);
        return;
      }

      remainingAdmissions = serverStatus.remainingAdmissions;
      const used = serverStatus.totalAdmissions;
      const max = serverStatus.maxAdmissions;

      if (type === 'S') {
        message = 'Single admission QR code — ready to admit 1 person.';
        messageType = 'success';
      } else if (type === 'D') {
        if (used === 0) {
          message = 'Double admission QR code — first person. One more admission will remain after this.';
          messageType = 'success';
        } else {
          message = `Double admission QR code — second (final) person. Used: ${used}/${max}.`;
          messageType = 'warning';
        }
      } else {
        // M-type
        message = `Multiple admission QR code — Used: ${used}/${max}. Remaining: ${remainingAdmissions}.`;
        messageType = remainingAdmissions === 1 ? 'warning' : 'success';
      }
    } catch {
      // Network error — use local type parsing as fallback
      if (type === 'S') { remainingAdmissions = 1; message = 'Single admission (offline mode).'; }
      else if (type === 'D') { remainingAdmissions = 2; message = 'Double admission (offline mode).'; }
      else {
        const num = parseInt(codePrefix.slice(1));
        if (isNaN(num) || num <= 0) {
          setPendingAdmission({ code: codeToScan, message: 'Invalid M-prefix QR code.', messageType: 'error', canAdmit: false });
          setMaxAdmissionCount(0);
          setAdmissionCount('0');
          setShowAdmissionModal(true);
          return;
        }
        remainingAdmissions = num;
        message = `Multiple admission (offline mode) — up to ${num} people.`;
      }
      messageType = 'warning';
    }

    setMaxAdmissionCount(remainingAdmissions);
    setAdmissionCount(remainingAdmissions.toString());
    setPendingAdmission({ code: codeToScan, message, messageType, canAdmit });
    setShowAdmissionModal(true);
  };

  // Helper function to extract guest name from QR code
  const extractGuestName = (qrCode: string): string => {
    // Look for pattern with " - " and extract everything after it
    const dashIndex = qrCode.indexOf(' - ');
    if (dashIndex !== -1 && dashIndex < qrCode.length - 3) {
      return qrCode.substring(dashIndex + 3).trim();
    }
    return 'Guest';
  };

  // Rejected scans are now recorded server-side by the atomic scan procedure.

  const handleAdmit = async () => {
    if (!pendingAdmission || !selectedEvent || !selectedActivity || !user) {
      return;
    }

    const admissions = parseInt(admissionCount) || 1;
    if (admissions < 1) {
      Alert.alert('Error', 'Admission count must be at least 1');
      return;
    }

    setIsScanning(true);
    try {
      await scanQRCode(
        pendingAdmission.code,
        selectedEvent.id,
        selectedActivity.id,
        user.id,
        admissions,
        notes.trim() || undefined
      );

      console.log(`Successfully admitted ${admissions} person(s) with QR code: ${pendingAdmission.code}`);
      
      const guestName = extractGuestName(pendingAdmission.code);
      setPopupEventName(selectedEvent.name);
      setPopupGuestName(guestName);
      
      // Send welcome message if enabled
      if (selectedActivity.sendWelcomeMessage && selectedActivity.welcomeMessage) {
        const qrCodeData = qrCodes.find(qr => extractQRCodePrefix(qr.code) === extractQRCodePrefix(pendingAdmission.code));
        if (qrCodeData?.phoneNumber) {
          const personalizedMessage = selectedActivity.welcomeMessage
            .replace(/{guestName}/g, guestName)
            .replace(/{eventName}/g, selectedEvent.name)
            .replace(/{location}/g, selectedEvent.locationDetails?.formattedAddress || selectedEvent.location);
          
          console.log('[Scanner] Sending welcome message to:', qrCodeData.phoneNumber);
          console.log('[Scanner] Message:', personalizedMessage);
          
          // TODO: Add actual SMS/WhatsApp sending logic here
          // For now, just log it
        }
      }
      
      setQrCodeInput('');
      setAdmissionCount('1');
      setNotes('');
      setScanResult(null);
      setScanMessage('');
      setPendingAdmission(null);
      setShowAdmissionModal(false);
      setShowScanModal(false);
      setShowCamera(false);
      setCameraKey(prev => prev + 1);
      
      setShowSuccessPopup(true);
      
    } catch (error) {
      console.error('Admission failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to admit person(s)';
      
      if (errorMessage.includes('already been used')) {
        setPopupMessage(`Sorry, this code ${pendingAdmission.code} is used up!`);
        setShowErrorPopup(true);
      } else {
        Alert.alert('Admission Failed', errorMessage);
      }
    } finally {
      setIsScanning(false);
    }
  };



  useEffect(() => {
    console.log('[Scanner] ========== PLATFORM INFO ==========');
    console.log('[Scanner] Platform.OS:', Platform.OS);
    console.log('[Scanner] isNativePlatform:', isNativePlatform);
    console.log('[Scanner] ========================================');
  }, [isNativePlatform]);

  const isCameraAvailable = useCallback((): boolean => {
    return isNativePlatform && cameraAvailable;
  }, [isNativePlatform, cameraAvailable]);

  const openCamera = async () => {
    console.log('[Scanner] ========== OPENING CAMERA ==========');
    console.log('[Scanner] Platform.OS:', Platform.OS);
    console.log('[Scanner] isNativePlatform:', isNativePlatform);
    
    // Check if camera is available (only on native platforms)
    if (!isCameraAvailable()) {
      console.log('[Scanner] Camera not available - not a native platform');
      Alert.alert(
        'Camera Not Available',
        'Camera scanning is only available on iOS and Android devices. Please use the manual QR code entry option.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    console.log('[Scanner] Native platform confirmed, camera available');
    
    try {
      console.log('[Scanner] Checking permissions...');
      console.log('[Scanner] Current permission object:', JSON.stringify(permission));
      
      if (!permission?.granted) {
        console.log('[Scanner] Requesting camera permission...');
        const result = await requestCameraPermission();
        console.log('[Scanner] Permission result:', JSON.stringify(result || {}));
        
        if (!result?.granted) {
          console.log('[Scanner] Camera permission denied');
          Alert.alert(
            'Permission Required', 
            'Camera permission is required to scan QR codes. Please enable camera access in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Try Again', onPress: openCamera }
            ]
          );
          return;
        }
      }

      console.log('[Scanner] Camera permission granted, opening camera modal...');
      
      setScanResult(null);
      setScanMessage('');
      setCameraKey(prev => prev + 1);
      setShowScanModal(false);
      
      // Open camera immediately on native
      setShowCamera(true);
      console.log('[Scanner] Camera modal should now be visible');
      
    } catch (error) {
      console.error('[Scanner] Error opening camera:', error);
      Alert.alert('Camera Error', `Failed to open camera: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanResult) {
      console.log('Scan already in progress, ignoring:', data);
      return; // Prevent multiple scans
    }
    
    console.log('QR Code scanned:', data);
    setScanResult(data);
    setQrCodeInput(data);
    
    // Close camera immediately
    setShowCamera(false);
    
    // Small delay to ensure camera is closed before showing admission modal
    setTimeout(async () => {
      await checkQRCodeAndPrepareAdmission(data);
    }, 300);
  };

  const getQRCodeTypeInfo = (code: string) => {
    const type = code.charAt(0).toUpperCase();
    switch (type) {
      case 'S':
        return { type: 'Single', maxAdmissions: 1, color: '#10b981' };
      case 'D':
        return { type: 'Double', maxAdmissions: 2, color: '#f59e0b' };
      case 'M': {
        // Extract number from M-prefix code (e.g., M30 = 30 admissions)
        const numberPart = code.slice(1);
        const maxAdmissions = parseInt(numberPart);
        if (isNaN(maxAdmissions) || maxAdmissions <= 0) {
          return { type: 'Invalid M-code', maxAdmissions: 0, color: '#ef4444' };
        }
        return { type: `Multiple (${maxAdmissions})`, maxAdmissions, color: '#8b5cf6' };
      }
      default:
        return { type: 'Unknown', maxAdmissions: 0, color: '#ef4444' };
    }
  };

  const getQRCodeStatusByCode = (code: string, activityId: string) => {
    const codePrefix = extractQRCodePrefix(code);
    const qrCode = qrCodes.find(qr => extractQRCodePrefix(qr.code) === codePrefix);
    if (!qrCode) return null;
    return getQRCodeStatus(qrCode.id, activityId);
  };

  const renderQRCodePreview = () => {
    if (!qrCodeInput.trim() || !selectedActivity) return null;

    const typeInfo = getQRCodeTypeInfo(qrCodeInput);
    const status = getQRCodeStatusByCode(qrCodeInput, selectedActivity.id);

    return (
      <View style={styles.qrPreview}>
        <View style={styles.qrPreviewHeader}>
          <View style={[styles.typeIndicator, { backgroundColor: typeInfo.color }]}>
            <Text style={styles.typeText}>{typeInfo.type}</Text>
          </View>
          <Text style={styles.qrCodeText}>{qrCodeInput}</Text>
        </View>
        
        {status && (
          <View style={styles.statusInfo}>
            <Text style={styles.statusText}>
              Used: {status.totalAdmissions}/{status.qrCode.maxAdmissions}
            </Text>
            {status.isFullyUsed && (
              <View style={styles.warningBadge}>
                <AlertCircle size={16} color="#ef4444" />
                <Text style={styles.warningText}>Fully Used</Text>
              </View>
            )}
          </View>
        )}
        
        {scanMessage && (
          <View style={[
            styles.scanMessageContainer,
            scanMessageType === 'success' && styles.successMessage,
            scanMessageType === 'warning' && styles.warningMessage,
            scanMessageType === 'error' && styles.errorMessage,
          ]}>
            <Text style={[
              styles.scanMessageText,
              scanMessageType === 'success' && styles.successText,
              scanMessageType === 'warning' && styles.warningText,
              scanMessageType === 'error' && styles.errorText,
            ]}>
              {scanMessage}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>QR Scanner</Text>
          <View style={styles.networkStatus}>
            <View style={[
              styles.networkIndicator,
              { backgroundColor: isOnline ? '#10b981' : '#ef4444' }
            ]} />
            <Text style={styles.networkText}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
            {(syncStatus.scans || syncStatus.qrCodes) && (
              <Text style={styles.syncText}>Syncing...</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={refetchData} style={styles.refreshButton}>
          <QrCode size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.selectionSection}>
          <TouchableOpacity
            style={styles.selectionCard}
            onPress={() => setShowEventModal(true)}
          >
            <Text style={styles.selectionLabel}>Selected Event</Text>
            <Text style={styles.selectionValue}>
              {selectedEvent ? selectedEvent.name : 'Select Event'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectionCard, !selectedEvent && styles.disabledCard]}
            onPress={() => selectedEvent && setShowActivityModal(true)}
            disabled={!selectedEvent}
          >
            <Text style={styles.selectionLabel}>Selected Activity</Text>
            <Text style={styles.selectionValue}>
              {selectedActivity ? selectedActivity.name : 'Select Activity'}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedEvent && selectedActivity && (
          <View style={styles.scanSection}>
            {!canUseScanner ? (
              <>
                <View style={[styles.scanButton, styles.disabledScanButton]}>
                  <AlertCircle size={32} color="#ef4444" />
                  <Text style={[styles.scanButtonText, styles.disabledScanButtonText]}>Scanner Disabled</Text>
                </View>
                <Text style={styles.scanHint}>
                  Scanner access has been disabled by an administrator. Contact admin to enable scanner functionality.
                </Text>
              </>
            ) : isActivityAvailableToday(selectedEvent, selectedActivity) ? (
              <>
                <TouchableOpacity
                  style={styles.scanButton}
                  onPress={() => setShowScanModal(true)}
                >
                  <Scan size={32} color="#ffffff" />
                  <Text style={styles.scanButtonText}>Scan QR Code</Text>
                </TouchableOpacity>
                <Text style={styles.scanHint}>
                  Tap to manually enter QR codes for {selectedActivity.name}
                </Text>
              </>
            ) : (
              <>
                <View style={[styles.scanButton, styles.disabledScanButton]}>
                  <Scan size={32} color="#9ca3af" />
                  <Text style={[styles.scanButtonText, styles.disabledScanButtonText]}>Not Available Today</Text>
                </View>
                <Text style={styles.scanHint}>
                  This activity is not available for scanning today. Please select an activity scheduled for today.
                </Text>
              </>
            )}
          </View>
        )}

        {!selectedEvent && (
          <View style={styles.emptyState}>
            {!canUseScanner ? (
              <>
                <AlertCircle size={64} color="#ef4444" />
                <Text style={styles.emptyTitle}>Scanner Disabled</Text>
                <Text style={styles.emptyDescription}>
                  Scanner access has been disabled by an administrator. Contact admin to enable scanner functionality.
                </Text>
              </>
            ) : (
              <>
                <QrCode size={64} color="#d1d5db" />
                <Text style={styles.emptyTitle}>Ready to Scan</Text>
                <Text style={styles.emptyDescription}>
                  Select an event and activity to start scanning QR codes
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Event Selection Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEventModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Event</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {activeEvents.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.modalItem,
                  selectedEvent?.id === event.id && styles.selectedModalItem
                ]}
                onPress={() => {
                  if (event?.id && event?.name) {
                    setSelectedEvent(event);
                    setSelectedActivity(null);
                    setShowEventModal(false);
                  }
                }}
              >
                <Text style={styles.modalItemTitle}>{event.name}</Text>
                <Text style={styles.modalItemSubtitle}>
                  {event.activities.length} activities • {new Date(event.date || event.startDate).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Activity Selection Modal */}
      <Modal
        visible={showActivityModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowActivityModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Activity</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedEvent?.activities.map((activity) => {
              // Helper function to format activity date/day info
              const getActivityDateInfo = () => {
                if (!selectedEvent.isMultiDay || !activity.day) {
                  return null;
                }
                
                // Calculate the actual date for this day
                const startDate = new Date(selectedEvent.startDate);
                const activityDate = new Date(startDate);
                activityDate.setDate(startDate.getDate() + (activity.day - 1));
                
                const dateStr = activityDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                
                return `Day ${activity.day}, ${dateStr}`;
              };
              
              const dateInfo = getActivityDateInfo();
              const isAvailableToday = isActivityAvailableToday(selectedEvent, activity);
              
              return (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.modalItem,
                    selectedActivity?.id === activity.id && styles.selectedModalItem,
                    !isAvailableToday && styles.disabledModalItem
                  ]}
                  onPress={() => {
                    if (activity?.id && activity?.name && isAvailableToday) {
                      setSelectedActivity(activity);
                      setShowActivityModal(false);
                    } else if (!isAvailableToday) {
                      Alert.alert(
                        'Activity Not Available',
                        'This activity is not available for scanning today. You can only scan activities that are scheduled for today.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                  disabled={!isAvailableToday}
                >
                  <View style={styles.activityHeader}>
                    <Text style={[
                      styles.modalItemTitle,
                      !isAvailableToday && styles.disabledText
                    ]}>
                      {activity.name}
                    </Text>
                    {!isAvailableToday && (
                      <View style={styles.unavailableBadge}>
                        <Text style={styles.unavailableText}>Not Today</Text>
                      </View>
                    )}
                  </View>
                  <View>
                    <Text style={[
                      styles.modalItemSubtitle,
                      !isAvailableToday && styles.disabledText
                    ]}>
                      {activity.startTime}
                      {activity.endTime && ` - ${activity.endTime}`}
                    </Text>
                    {dateInfo && (
                      <Text style={[
                        styles.activityDateInfo,
                        !isAvailableToday && styles.disabledText
                      ]}>
                        {dateInfo}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Scan Modal */}
      <Modal
        visible={showScanModal && canUseScanner}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalSpacer} />
            <Text style={styles.modalTitle}>Scan QR Code</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.scanForm}>
              <View style={styles.cameraSection}>
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={openCamera}
                >
                  <Scan size={24} color="#ffffff" />
                  <Text style={styles.cameraButtonText}>Open Camera</Text>
                </TouchableOpacity>
                <Text style={styles.orText}>or enter manually</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>QR Code *</Text>
                <TextInput
                  style={styles.input}
                  value={qrCodeInput}
                  onChangeText={setQrCodeInput}
                  placeholder="Enter QR code (S123, D456, M30)"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                />
              </View>

              {renderQRCodePreview()}

              <View style={styles.field}>
                <Text style={styles.label}>Admission Count</Text>
                <View style={styles.counterContainer}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => {
                      const current = parseInt(admissionCount) || 1;
                      if (current > 1) {
                        setAdmissionCount((current - 1).toString());
                      }
                    }}
                    disabled={parseInt(admissionCount) <= 1}
                  >
                    <Minus size={20} color={parseInt(admissionCount) <= 1 ? '#9ca3af' : '#374151'} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.counterInput}
                    value={admissionCount}
                    onChangeText={setAdmissionCount}
                    placeholder="1"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    textAlign="center"
                  />
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => {
                      const current = parseInt(admissionCount) || 1;
                      if (current < maxAdmissionCount) {
                        setAdmissionCount((current + 1).toString());
                      }
                    }}
                    disabled={parseInt(admissionCount) >= maxAdmissionCount}
                  >
                    <Plus size={20} color={parseInt(admissionCount) >= maxAdmissionCount ? '#9ca3af' : '#374151'} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.qrTypeInfo}>
                <Text style={styles.qrTypeTitle}>QR Code Types:</Text>
                <Text style={styles.qrTypeItem}>• S = Single person (1 admission)</Text>
                <Text style={styles.qrTypeItem}>• D = Double person (2 admissions)</Text>
                <Text style={styles.qrTypeItem}>• M = Multiple people (M30 = 30 people, etc.)</Text>
              </View>

              <View style={styles.scanModalButtons}>
                <TouchableOpacity
                  style={styles.scanModalCancelButton}
                  onPress={() => setShowScanModal(false)}
                >
                  <Text style={styles.scanModalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.scanModalCheckButton,
                    (isScanning || !qrCodeInput.trim()) && styles.disabledButton
                  ]}
                  onPress={() => {
                    if (qrCodeInput.trim()) {
                      setShowScanModal(false);
                      setTimeout(async () => {
                        await checkQRCodeAndPrepareAdmission(qrCodeInput.trim());
                      }, 100);
                    } else {
                      Alert.alert('Error', 'Please enter a QR code');
                    }
                  }}
                  disabled={isScanning || !qrCodeInput.trim()}
                >
                  <Text style={[
                    styles.scanModalCheckButtonText,
                    (isScanning || !qrCodeInput.trim()) && styles.disabledButtonText
                  ]}>
                    {isScanning ? 'Checking...' : 'Check'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Camera Modal - Only render on native platforms with camera available */}
      {isNativePlatform && cameraAvailable && (
        <Modal
          visible={showCamera && canUseScanner}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            console.log('[Scanner] Camera modal close requested');
            setShowCamera(false);
            setScanResult(null);
          }}
        >
          <View style={styles.cameraContainer}>
            <CameraView
              key={cameraKey}
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanResult ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            >
              <View style={styles.cameraOverlay}>
                <View style={styles.cameraHeader}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      console.log('[Scanner] Closing camera manually');
                      setShowCamera(false);
                      setScanResult(null);
                      setScanMessage('');
                      setCameraKey(prev => prev + 1);
                      setTimeout(() => {
                        setShowScanModal(true);
                      }, 100);
                    }}
                  >
                    <X size={24} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={styles.cameraTitle}>Scan QR Code</Text>
                  <View style={styles.cameraSpacer} />
                </View>
                
                <View style={styles.scanArea}>
                  <View style={styles.scanFrame} />
                  <Text style={styles.scanInstruction}>
                    Position the QR code within the frame
                  </Text>
                </View>
              </View>
            </CameraView>
          </View>
        </Modal>
      )}

      {/* Admission Confirmation Modal */}
      <Modal
        visible={showAdmissionModal && canUseScanner}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAdmissionModal(false);
              setPendingAdmission(null);
              setScanResult(null);
              setScanMessage('');
              setCameraKey(prev => prev + 1);
            }}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Confirm Admission</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {pendingAdmission && (
              <View style={styles.admissionContainer}>
                <View style={styles.qrCodeDisplay}>
                  <Text style={styles.qrCodeLabel}>QR Code:</Text>
                  <Text style={styles.qrCodeValue}>{pendingAdmission.code}</Text>
                </View>

                <View style={[
                  styles.admissionMessage,
                  pendingAdmission.messageType === 'success' && styles.successMessage,
                  pendingAdmission.messageType === 'warning' && styles.warningMessage,
                  pendingAdmission.messageType === 'error' && styles.errorMessage,
                ]}>
                  <Text style={[
                    styles.admissionMessageText,
                    pendingAdmission.messageType === 'success' && styles.successText,
                    pendingAdmission.messageType === 'warning' && styles.warningText,
                    pendingAdmission.messageType === 'error' && styles.errorText,
                  ]}>
                    {pendingAdmission.message}
                  </Text>
                </View>

                {selectedEvent && selectedActivity && (
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventInfoLabel}>Event:</Text>
                    <Text style={styles.eventInfoValue}>{selectedEvent.name}</Text>
                    <Text style={styles.eventInfoLabel}>Activity:</Text>
                    <Text style={styles.eventInfoValue}>{selectedActivity.name}</Text>
                  </View>
                )}

                <View style={styles.admissionControls}>
                  <View style={styles.field}>
                    <Text style={styles.label}>Number of People to Admit</Text>
                    <View style={styles.counterContainer}>
                      <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() => {
                          const current = parseInt(admissionCount) || 1;
                          if (current > 1) {
                            setAdmissionCount((current - 1).toString());
                          }
                        }}
                        disabled={parseInt(admissionCount) <= 1}
                      >
                        <Minus size={20} color={parseInt(admissionCount) <= 1 ? '#9ca3af' : '#374151'} />
                      </TouchableOpacity>
                      <TextInput
                        style={styles.counterInput}
                        value={admissionCount}
                        onChangeText={setAdmissionCount}
                        placeholder="1"
                        placeholderTextColor="#9ca3af"
                        keyboardType="numeric"
                        textAlign="center"
                      />
                      <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() => {
                          const current = parseInt(admissionCount) || 1;
                          if (current < maxAdmissionCount) {
                            setAdmissionCount((current + 1).toString());
                          }
                        }}
                        disabled={parseInt(admissionCount) >= maxAdmissionCount}
                      >
                        <Plus size={20} color={parseInt(admissionCount) >= maxAdmissionCount ? '#9ca3af' : '#374151'} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Notes (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Optional notes"
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>

                <View style={styles.admissionButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowAdmissionModal(false);
                      setPendingAdmission(null);
                      setScanResult(null);
                      setScanMessage('');
                      setCameraKey(prev => prev + 1);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.admitButton,
                      (!pendingAdmission.canAdmit || isScanning) && styles.disabledButton
                    ]}
                    onPress={handleAdmit}
                    disabled={!pendingAdmission.canAdmit || isScanning}
                  >
                    <Text style={[
                      styles.admitButtonText,
                      (!pendingAdmission.canAdmit || isScanning) && styles.disabledButtonText
                    ]}>
                      {isScanning ? 'Admitting...' : 'Admit'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Success Popup Modal */}
      <Modal
        visible={showSuccessPopup}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSuccessPopup(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.successPopup}>
            <View style={styles.successIcon}>
              <CheckCircle size={48} color="#10b981" />
            </View>
            <Text style={styles.successPopupTitle}>
              Welcome to {popupEventName}, {popupGuestName}!
            </Text>
            <TouchableOpacity
              style={styles.popupButton}
              onPress={() => {
                setShowSuccessPopup(false);
                // Ask if they want to scan another
                setTimeout(() => {
                  Alert.alert(
                    'Success',
                    'Would you like to scan another QR code?',
                    [
                      { text: 'Done', style: 'cancel' },
                      {
                        text: 'Scan Another',
                        onPress: () => {
                          setQrCodeInput('');
                          setAdmissionCount('1');
                          setNotes('');
                          setTimeout(() => {
                            setShowScanModal(true);
                          }, 100);
                        }
                      }
                    ]
                  );
                }, 300);
              }}
            >
              <Text style={styles.popupButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Error Popup Modal */}
      <Modal
        visible={showErrorPopup}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowErrorPopup(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.errorPopup}>
            <View style={styles.errorIcon}>
              <X size={48} color="#ef4444" />
            </View>
            <Text style={styles.errorPopupTitle}>
              {popupMessage}
            </Text>
            <TouchableOpacity
              style={styles.errorPopupButton}
              onPress={() => setShowErrorPopup(false)}
            >
              <Text style={styles.errorPopupButtonText}>OK</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.secondary,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  networkText: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  syncText: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
  },
  selectionSection: {
    padding: 20,
    gap: 16,
  },
  selectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledCard: {
    opacity: 0.5,
  },
  selectionLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  selectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  scanSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  scanButton: {
    backgroundColor: '#10b981',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },

  scanHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
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
    color: colors.secondary,
    fontWeight: '600',
  },
  modalSpacer: {
    width: 60,
  },
  disabledText: {
    color: '#9ca3af',
  },
  modalContent: {
    flex: 1,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedModalItem: {
    backgroundColor: colors.secondary + '20',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scanForm: {
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
  qrPreview: {
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  qrPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  typeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  qrCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 4,
  },
  scanMessageContainer: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
    borderWidth: 1,
  },
  warningMessage: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  scanMessageText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successText: {
    color: '#065f46',
  },
  errorText: {
    color: '#991b1b',
  },
  qrTypeInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  qrTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  qrTypeItem: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 12,
    borderRadius: 20,
  },
  cameraTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  cameraSpacer: {
    width: 48,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  webCameraFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 40,
  },
  webCameraText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  webCameraSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  webCloseButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  webCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButtonText: {
    color: '#1e40af',
    fontSize: 16,
    fontWeight: '600',
  },
  admissionContainer: {
    padding: 20,
  },
  qrCodeDisplay: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  qrCodeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  qrCodeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  admissionMessage: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  admissionMessageText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  eventInfo: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  eventInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  eventInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  admissionControls: {
    marginBottom: 30,
  },
  admissionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  admitButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  admitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  cameraSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  cameraButton: {
    backgroundColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cameraButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  orText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  activityDateInfo: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  disabledModalItem: {
    opacity: 0.6,
    backgroundColor: '#f9fafb',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  unavailableBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  unavailableText: {
    fontSize: 10,
    color: '#dc2626',
    fontWeight: '600',
  },
  disabledScanButton: {
    backgroundColor: '#e5e7eb',
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledScanButtonText: {
    color: '#9ca3af',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  successPopup: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 280,
  },
  errorPopup: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 280,
  },
  successIcon: {
    backgroundColor: '#d1fae5',
    borderRadius: 40,
    padding: 16,
    marginBottom: 20,
  },
  errorIcon: {
    backgroundColor: '#fee2e2',
    borderRadius: 40,
    padding: 16,
    marginBottom: 20,
  },
  successPopupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  errorPopupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
  },
  popupButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
  },
  errorPopupButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
  },
  popupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorPopupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  counterButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
  },
  counterInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
    minWidth: 60,
  },
  scanModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingBottom: 40,
  },
  scanModalCancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanModalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6b7280',
  },
  scanModalCheckButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanModalCheckButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ffffff',
  },
});