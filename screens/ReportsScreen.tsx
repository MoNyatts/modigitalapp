import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart3, Users, QrCode, Activity as ActivityIcon, Calendar, TrendingUp, FileText, X, Download, CalendarDays, AlertCircle, Archive, Trash2, Eye } from 'lucide-react-native';
import { useFilteredEvents } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import type { Event, Activity, Scan, QRCode, RejectedScan, ArchivedReport } from '@/types';
import * as XLSX from 'xlsx';
import { colors } from '@/constants/colors';
import { FileSystem } from '@/lib/files';
import { Sharing } from '@/lib/files';

export default function ReportsScreen() {
  const { events, scans, qrCodes, rejectedScans, archivedReports, archiveEventReport, deleteArchivedReport } = useFilteredEvents();
  const { user, isAdmin } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAdmissionsModal, setShowAdmissionsModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'full'>('full');
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState<ArchivedReport | null>(null);
  const [showArchiveDetailModal, setShowArchiveDetailModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const activeEvents = events.filter(event => {
    const hasActivities = event.activities && event.activities.length > 0;
    return hasActivities;
  });

  const getOverallStats = () => {
    const totalEvents = events.length;
    const totalActivities = events.reduce((sum, event) => sum + event.activities.length, 0);
    const totalScans = scans.length;
    const totalAdmissions = scans.reduce((sum, scan) => sum + scan.admissionCount, 0);
    const uniqueQRCodes = new Set(scans.map(scan => scan.qrCodeId)).size;

    return {
      totalEvents,
      totalActivities,
      totalScans,
      totalAdmissions,
      uniqueQRCodes,
    };
  };

  const getEventReport = (event: Event, filterDate?: string) => {
    let eventScans = scans.filter(scan => scan.eventId === event.id);
    
    // Filter by date if specified (for daily reports)
    if (filterDate) {
      eventScans = eventScans.filter(scan => {
        const scanDate = new Date(scan.scannedAt).toDateString();
        const targetDate = new Date(filterDate).toDateString();
        return scanDate === targetDate;
      });
    }
    
    const totalAdmissions = eventScans.reduce((sum, scan) => sum + scan.admissionCount, 0);
    const uniqueQRCodes = new Set(eventScans.map(scan => scan.qrCodeId)).size;

    // Filter activities for daily reports if date is selected
    let activitiesToShow = event.activities;
    if (filterDate && event.isMultiDay) {
      // Calculate which day the selected date corresponds to
      const eventStartDate = new Date(event.startDate);
      const selectedDate = new Date(filterDate);
      const dayNumber = Math.floor((selectedDate.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      // Filter activities for the selected day
      activitiesToShow = event.activities.filter(activity => 
        activity.day === dayNumber || !activity.day // Include activities without day specified
      );
    }

    const activityReports = activitiesToShow.map(activity => {
      const activityScans = eventScans.filter(scan => scan.activityId === activity.id);
      const activityAdmissions = activityScans.reduce((sum, scan) => sum + scan.admissionCount, 0);
      const activityUniqueQR = new Set(activityScans.map(scan => scan.qrCodeId)).size;
      
      // Get rejected scans for this activity
      let activityRejectedScans = rejectedScans.filter(scan => scan.activityId === activity.id);
      
      // Filter by date if specified (for daily reports)
      if (filterDate) {
        activityRejectedScans = activityRejectedScans.filter(scan => {
          const scanDate = new Date(scan.scannedAt).toDateString();
          const targetDate = new Date(filterDate).toDateString();
          return scanDate === targetDate;
        });
      }
      
      // Count QR codes by type for this activity
      const uniqueQRTypes = [...new Set(activityScans.map(scan => scan.qrCodeId))]
        .map(qrId => qrCodes.find(qr => qr.id === qrId)?.type)
        .filter(Boolean);
      
      const singleQRCount = uniqueQRTypes.filter(type => type === 'S').length;
      const doubleQRCount = uniqueQRTypes.filter(type => type === 'D').length;
      const multipleQRCount = uniqueQRTypes.filter(type => type === 'M').length;
      
      return {
        activity,
        totalScans: activityScans.length,
        totalAdmissions: activityAdmissions,
        uniqueQRCodes: activityUniqueQR,
        singleQRCount,
        doubleQRCount,
        multipleQRCount,
        scans: activityScans,
        rejectedScans: activityRejectedScans,
        totalRejectedScans: activityRejectedScans.length,
      };
    });

    return {
      event,
      totalScans: eventScans.length,
      totalAdmissions,
      uniqueQRCodes,
      activityReports,
      filterDate,
    };
  };

  const overallStats = getOverallStats();
  const eventReport = selectedEvent ? getEventReport(selectedEvent, selectedDate || undefined) : null;
  
  // Generate date range for multi-day events
  const getEventDates = (event: Event): string[] => {
    if (!event.isMultiDay || !event.endDate) {
      return [event.startDate];
    }
    
    const dates: string[] = [];
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    
    return dates;
  };
  
  const eventDates = selectedEvent ? getEventDates(selectedEvent) : [];

  // Extract guest name from QR code (text after "- ")
  const getGuestNameFromQRCode = (qrCode: string): string => {
    const dashIndex = qrCode.indexOf('- ');
    if (dashIndex !== -1 && dashIndex < qrCode.length - 2) {
      return qrCode.substring(dashIndex + 2).trim();
    }
    return `Guest ${qrCode.slice(-4)}`;
  };

  // Update QR codes with guest names if not present
  React.useEffect(() => {
    qrCodes.forEach(qr => {
      if (!qr.guestName) {
        qr.guestName = getGuestNameFromQRCode(qr.code);
      }
    });
  }, [qrCodes]);

  const renderStatCard = (title: string, value: number, icon: React.ReactNode, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      </View>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const getAdmissionsData = (eventId: string, activityId: string, filterDate?: string) => {
    let activityScans = scans.filter(
      scan => scan.eventId === eventId && scan.activityId === activityId
    );
    
    // Filter by date if specified
    if (filterDate) {
      activityScans = activityScans.filter(scan => {
        const scanDate = new Date(scan.scannedAt).toDateString();
        const targetDate = new Date(filterDate).toDateString();
        return scanDate === targetDate;
      });
    }

    // Group scans by QR code
    const qrCodeGroups = activityScans.reduce((groups, scan) => {
      const qrCode = qrCodes.find(qr => qr.id === scan.qrCodeId);
      if (!qrCode) return groups;

      if (!groups[scan.qrCodeId]) {
        groups[scan.qrCodeId] = {
          qrCode: {
            ...qrCode,
            guestName: qrCode.guestName || getGuestNameFromQRCode(qrCode.code)
          },
          scans: [],
          totalAdmissions: 0,
        };
      }
      groups[scan.qrCodeId].scans.push(scan);
      groups[scan.qrCodeId].totalAdmissions += scan.admissionCount;
      return groups;
    }, {} as Record<string, { qrCode: QRCode; scans: Scan[]; totalAdmissions: number }>);

    return Object.values(qrCodeGroups).sort((a, b) => 
      new Date(b.scans[0].scannedAt).getTime() - new Date(a.scans[0].scannedAt).getTime()
    );
  };

  const getRejectedScansData = (eventId: string, activityId: string, filterDate?: string) => {
    let activityRejectedScans = rejectedScans.filter(
      scan => scan.eventId === eventId && scan.activityId === activityId
    );
    
    // Filter by date if specified
    if (filterDate) {
      activityRejectedScans = activityRejectedScans.filter(scan => {
        const scanDate = new Date(scan.scannedAt).toDateString();
        const targetDate = new Date(filterDate).toDateString();
        return scanDate === targetDate;
      });
    }

    // Group rejected scans by QR code
    const rejectedGroups = activityRejectedScans.reduce((groups, rejectedScan) => {
      const qrCodeKey = rejectedScan.qrCode; // Use the actual QR code string as key
      
      if (!groups[qrCodeKey]) {
        groups[qrCodeKey] = {
          qrCode: rejectedScan.qrCode,
          guestName: getGuestNameFromQRCode(rejectedScan.qrCode),
          rejectedScans: [],
          totalRejectedAttempts: 0,
        };
      }
      groups[qrCodeKey].rejectedScans.push(rejectedScan);
      groups[qrCodeKey].totalRejectedAttempts += rejectedScan.attemptedAdmissionCount;
      return groups;
    }, {} as Record<string, { qrCode: string; guestName: string; rejectedScans: RejectedScan[]; totalRejectedAttempts: number }>);

    return Object.values(rejectedGroups).sort((a, b) => 
      new Date(b.rejectedScans[0].scannedAt).getTime() - new Date(a.rejectedScans[0].scannedAt).getTime()
    );
  };

  const downloadExcelReport = async (eventId: string, activityId: string, filterDate?: string) => {
    const event = events.find(e => e.id === eventId);
    const activity = event?.activities.find(a => a.id === activityId);
    
    if (!event || !activity) {
      Alert.alert('Error', 'Event or activity not found');
      return;
    }

    const admissionsData = getAdmissionsData(eventId, activityId, filterDate);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Helper function to extract QR code text before "-"
    const extractQRCode = (fullCode: string): string => {
      const dashIndex = fullCode.indexOf(' -');
      if (dashIndex !== -1) {
        return fullCode.substring(0, dashIndex).trim();
      }
      return fullCode;
    };
    
    // Helper function to determine QR code type
    const getQRCodeType = (code: string): string => {
      const extractedCode = extractQRCode(code);
      if (extractedCode.startsWith('S')) {
        return 'Single';
      } else if (extractedCode.startsWith('D')) {
        return 'Double';
      } else if (extractedCode.startsWith('M')) {
        return 'Multiple';
      }
      return 'Unknown';
    };

    // Create header data
    const dateDisplay = filterDate 
      ? new Date(filterDate).toLocaleDateString()
      : event.isMultiDay && event.endDate
        ? `${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}`
        : new Date(event.startDate).toLocaleDateString();
    
    const headerData = [
      ['Event Name', event.name],
      ['Activity', activity.name],
      ['Location', event.location],
      ['Date', dateDisplay],
      ...(event.invitedGuests ? [['Invited Guests', event.invitedGuests.toString()]] : []),
      filterDate ? ['Report Type', 'Daily Report'] : ['Report Type', 'Full Event Report'],
      [''], // Empty row
      ['QR Code', 'Guest Name', 'Type', 'Guests Admitted']
    ];
    
    // Add admission data
    const reportData = admissionsData.map(item => [
      extractQRCode(item.qrCode.code),
      item.qrCode.guestName || getGuestNameFromQRCode(item.qrCode.code),
      getQRCodeType(item.qrCode.code),
      item.totalAdmissions
    ]);
    
    // Combine header and data
    const allData = [...headerData, ...reportData];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(allData);
    
    // Style the header rows (make them bold)
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= 1; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true }
          };
        }
      }
    }
    
    // Style the column headers
    for (let col = 0; col <= 3; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 6, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: "CCCCCC" } }
        };
      }
    }
    
    // Set column widths
    ws['!cols'] = [
      { width: 15 }, // QR Code
      { width: 25 }, // Guest Name
      { width: 12 }, // Type
      { width: 15 }  // Guests Admitted
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    // Generate filename
    const reportSuffix = filterDate ? `Daily_${filterDate}` : 'Full';
    const filename = `${event.name}_${activity.name}_${reportSuffix}_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    if (Platform.OS === 'web') {
      // For web, trigger download
      XLSX.writeFile(wb, filename);
      Alert.alert('Export Complete', `Report downloaded: ${filename}`);
    } else {
      // For mobile, save to device and share
      try {
        // Generate the Excel file as base64
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        
        // Create file URI
        const fileUri = FileSystem.documentDirectory + filename;
        
        // Write the file
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          // Share the file
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Export Excel Report',
            UTI: 'com.microsoft.excel.xlsx'
          });
        } else {
          Alert.alert(
            'Export Complete', 
            `Report saved to: ${fileUri}\n\nYou can find it in your device's Documents folder.`
          );
        }
      } catch (error) {
        console.error('Error exporting Excel file:', error);
        Alert.alert('Export Error', 'Failed to export the report. Please try again.');
      }
    }
  };

  const renderAdmissionItem = ({ item }: { item: { qrCode: QRCode; scans: Scan[]; totalAdmissions: number } }) => (
    <View style={styles.admissionItem}>
      <View style={styles.admissionHeader}>
        <View style={styles.qrCodeInfo}>
          <View style={[styles.qrTypeBadge, { backgroundColor: getQRTypeColor(item.qrCode.type) }]}>
            <Text style={styles.qrTypeText}>{item.qrCode.type}</Text>
          </View>
          <View style={styles.qrCodeDetails}>
            <Text style={styles.qrCodeNumber}>{item.qrCode.code}</Text>
            {item.qrCode.guestName && (
              <Text style={styles.guestName}>{item.qrCode.guestName}</Text>
            )}
          </View>
        </View>
        <View style={styles.admissionCount}>
          <Text style={styles.admissionCountNumber}>{item.totalAdmissions}</Text>
          <Text style={styles.admissionCountLabel}>admitted</Text>
        </View>
      </View>
      
      <View style={styles.scanDetails}>
        <Text style={styles.scanDetailsLabel}>Scan History:</Text>
        {item.scans.map((scan, index) => (
          <View key={scan.id} style={styles.scanEntry}>
            <Text style={styles.scanTime}>
              {new Date(scan.scannedAt).toLocaleString()}
            </Text>
            <Text style={styles.scanCount}>+{scan.admissionCount}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderRejectedItem = ({ item }: { item: { qrCode: string; guestName: string; rejectedScans: RejectedScan[]; totalRejectedAttempts: number } }) => (
    <View style={styles.admissionItem}>
      <View style={styles.admissionHeader}>
        <View style={styles.qrCodeInfo}>
          <View style={[styles.qrTypeBadge, { backgroundColor: '#fee2e2' }]}>
            <AlertCircle size={16} color="#ef4444" />
          </View>
          <View style={styles.qrCodeDetails}>
            <Text style={styles.qrCodeNumber}>{item.qrCode}</Text>
            <Text style={styles.guestName}>{item.guestName}</Text>
          </View>
        </View>
        <View style={styles.admissionCount}>
          <Text style={[styles.admissionCountNumber, { color: '#ef4444' }]}>{item.totalRejectedAttempts}</Text>
          <Text style={styles.admissionCountLabel}>rejected</Text>
        </View>
      </View>
      
      <View style={styles.scanDetails}>
        <Text style={styles.scanDetailsLabel}>Rejection History:</Text>
        {item.rejectedScans.map((rejectedScan, index) => (
          <View key={rejectedScan.id} style={styles.scanEntry}>
            <View style={styles.rejectedScanInfo}>
              <Text style={styles.scanTime}>
                {new Date(rejectedScan.scannedAt).toLocaleString()}
              </Text>
              <Text style={styles.rejectedReason}>{rejectedScan.reason}</Text>
            </View>
            <Text style={[styles.scanCount, { color: '#ef4444' }]}>-{rejectedScan.attemptedAdmissionCount}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const getQRTypeColor = (type: string) => {
    switch (type) {
      case 'S': return '#dbeafe'; // Single - blue
      case 'D': return '#fef3c7'; // Double - yellow
      case 'M': return '#d1fae5'; // Multiple - green
      default: return '#f3f4f6';
    }
  };

  // Helper function to get activity display name with day info
  const getActivityDisplayName = (activity: Activity, event: Event) => {
    if (!event.isMultiDay || !activity.day) {
      return activity.name;
    }
    
    // Calculate the date for this day
    const eventStartDate = new Date(event.startDate);
    const activityDate = new Date(eventStartDate);
    activityDate.setDate(eventStartDate.getDate() + (activity.day - 1));
    
    const dateString = activityDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    
    return `${activity.name} - Day ${activity.day} (${dateString})`;
  };

  const handleArchiveEvent = async () => {
    if (!selectedEvent || !user) return;
    
    Alert.alert(
      'Archive Report',
      `Are you sure you want to archive the report for "${selectedEvent.name}"? This will create a permanent snapshot of the current data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              setIsArchiving(true);
              await archiveEventReport(selectedEvent.id, user.id);
              Alert.alert('Success', 'Event report archived successfully!');
            } catch (error) {
              console.error('Archive error:', error);
              Alert.alert('Error', 'Failed to archive report. Please try again.');
            } finally {
              setIsArchiving(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteArchive = async (archiveId: string, eventName: string) => {
    Alert.alert(
      'Delete Archive',
      `Are you sure you want to delete the archived report for "${eventName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteArchivedReport(archiveId);
              if (selectedArchive?.id === archiveId) {
                setSelectedArchive(null);
                setShowArchiveDetailModal(false);
              }
              Alert.alert('Success', 'Archive deleted successfully');
            } catch (error) {
              console.error('Delete archive error:', error);
              Alert.alert('Error', 'Failed to delete archive. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderActivityReport = (activityReport: any) => (
    <View key={activityReport.activity.id} style={styles.activityReportCard}>
      <View style={styles.activityReportHeader}>
        <Text style={styles.activityReportName}>
          {getActivityDisplayName(activityReport.activity, selectedEvent!)}
        </Text>
        <View style={styles.activityReportBadge}>
          <Users size={14} color="#10b981" />
          <Text style={styles.activityReportBadgeText}>{activityReport.totalAdmissions}</Text>
        </View>
      </View>
      
      <View style={styles.activityReportStats}>
        <View style={styles.activityReportStat}>
          <Text style={styles.activityReportStatLabel}>Scans</Text>
          <Text style={styles.activityReportStatValue}>{activityReport.totalScans}</Text>
        </View>
        <View style={styles.activityReportStat}>
          <Text style={styles.activityReportStatLabel}>Unique QR</Text>
          <Text style={styles.activityReportStatValue}>{activityReport.uniqueQRCodes}</Text>
        </View>
        <View style={styles.activityReportStat}>
          <Text style={styles.activityReportStatLabel}>Guests</Text>
          <TouchableOpacity 
            style={styles.admissionsButton}
            onPress={() => {
              setSelectedActivityId(activityReport.activity.id);
              setShowAdmissionsModal(true);
            }}
          >
            <Text style={styles.activityReportStatValue}>{activityReport.totalAdmissions}</Text>
            <FileText size={12} color="#1e40af" style={styles.admissionsButtonIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.activityReportStat}>
          <Text style={styles.activityReportStatLabel}>Rejected</Text>
          <TouchableOpacity 
            style={styles.rejectedButton}
            onPress={() => {
              setSelectedActivityId(activityReport.activity.id);
              setShowRejectedModal(true);
            }}
          >
            <Text style={styles.activityReportStatValue}>{activityReport.totalRejectedScans}</Text>
            <FileText size={12} color="#ef4444" style={styles.admissionsButtonIcon} />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* QR Type Breakdown */}
      <View style={styles.qrTypeBreakdown}>
        <Text style={styles.qrTypeBreakdownTitle}>Cards:</Text>
        <View style={styles.qrTypeStats}>
          <View style={styles.qrTypeStat}>
            <View style={[styles.qrTypeIndicator, { backgroundColor: '#dbeafe' }]} />
            <Text style={styles.qrTypeLabel}>Single: {activityReport.singleQRCount}</Text>
          </View>
          <View style={styles.qrTypeStat}>
            <View style={[styles.qrTypeIndicator, { backgroundColor: '#fef3c7' }]} />
            <Text style={styles.qrTypeLabel}>Double: {activityReport.doubleQRCount}</Text>
          </View>
          <View style={styles.qrTypeStat}>
            <View style={[styles.qrTypeIndicator, { backgroundColor: '#d1fae5' }]} />
            <Text style={styles.qrTypeLabel}>Multiple: {activityReport.multipleQRCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Reports</Text>
        <BarChart3 size={28} color="#ffffff" />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Statistics</Text>
            <View style={styles.statsGrid}>
              {renderStatCard('Events', overallStats.totalEvents, <Calendar size={20} color="#1e40af" />, '#1e40af')}
              {renderStatCard('Activities', overallStats.totalActivities, <ActivityIcon size={20} color="#10b981" />, '#10b981')}
              {renderStatCard('Total Scans', overallStats.totalScans, <QrCode size={20} color="#f59e0b" />, '#f59e0b')}
              {renderStatCard('Guests', overallStats.totalAdmissions, <Users size={20} color="#8b5cf6" />, '#8b5cf6')}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Event Reports</Text>
            <View style={styles.headerButtons}>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.archiveButton}
                  onPress={() => setShowArchiveModal(true)}
                >
                  <Archive size={16} color="#6b7280" />
                  <Text style={styles.archiveButtonText}>Archive</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.selectEventButton}
                onPress={() => setShowEventModal(true)}
              >
                <Text style={styles.selectEventText}>
                  {selectedEvent ? selectedEvent.name : 'Select Event'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {eventReport ? (
            <View style={styles.eventReport}>
              <View style={styles.eventReportHeader}>
                <Text style={styles.eventReportTitle}>{eventReport.event.name}</Text>
                <Text style={styles.eventReportDate}>
                  {eventReport.filterDate 
                    ? `Daily Report - ${new Date(eventReport.filterDate).toLocaleDateString()}`
                    : eventReport.event.isMultiDay && eventReport.event.endDate
                      ? `${new Date(eventReport.event.startDate).toLocaleDateString()} - ${new Date(eventReport.event.endDate).toLocaleDateString()}`
                      : new Date(eventReport.event.startDate).toLocaleDateString()}
                </Text>
                {eventReport.event.invitedGuests && (
                  <Text style={styles.eventReportInvitedGuests}>
                    {eventReport.event.invitedGuests} invited guests
                  </Text>
                )}
              </View>
              
              {/* Date selector for multi-day events */}
              {selectedEvent?.isMultiDay && eventDates.length > 1 && (
                <View style={styles.dateSelector}>
                  <TouchableOpacity
                    style={[styles.reportTypeButton, reportType === 'full' && styles.reportTypeButtonActive]}
                    onPress={() => {
                      setReportType('full');
                      setSelectedDate(null);
                    }}
                  >
                    <Text style={[styles.reportTypeButtonText, reportType === 'full' && styles.reportTypeButtonTextActive]}>
                      Full Event
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.reportTypeButton, reportType === 'daily' && styles.reportTypeButtonActive]}
                    onPress={() => {
                      setReportType('daily');
                      setShowDateModal(true);
                    }}
                  >
                    <CalendarDays size={16} color={reportType === 'daily' ? '#ffffff' : '#1e40af'} />
                    <Text style={[styles.reportTypeButtonText, reportType === 'daily' && styles.reportTypeButtonTextActive]}>
                      {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Daily Report'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.eventReportStats}>
                <View style={styles.eventReportStat}>
                  <Text style={styles.eventReportStatValue}>{eventReport.totalScans}</Text>
                  <Text style={styles.eventReportStatLabel}>Total Scans</Text>
                </View>
                <View style={styles.eventReportStat}>
                  <Text style={styles.eventReportStatValue}>{eventReport.totalAdmissions}</Text>
                  <Text style={styles.eventReportStatLabel}>Guests</Text>
                </View>
                <View style={styles.eventReportStat}>
                  <Text style={styles.eventReportStatValue}>{eventReport.uniqueQRCodes}</Text>
                  <Text style={styles.eventReportStatLabel}>Unique QR</Text>
                </View>
                {eventReport.event.invitedGuests && (
                  <View style={styles.eventReportStat}>
                    <Text style={styles.eventReportStatValue}>
                      {Math.round((eventReport.totalAdmissions / eventReport.event.invitedGuests) * 100)}%
                    </Text>
                    <Text style={styles.eventReportStatLabel}>Attendance</Text>
                  </View>
                )}
              </View>

              <Text style={styles.activitiesTitle}>Activity Breakdown</Text>
              <View style={styles.activitiesList}>
                {eventReport.activityReports.map(renderActivityReport)}
              </View>
              
              {isAdmin && (
                <TouchableOpacity
                  style={styles.archiveEventButton}
                  onPress={handleArchiveEvent}
                  disabled={isArchiving}
                >
                  <Archive size={20} color="#ffffff" />
                  <Text style={styles.archiveEventButtonText}>
                    {isArchiving ? 'Archiving...' : 'Archive This Report'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyEventReport}>
              <TrendingUp size={48} color="#d1d5db" />
              <Text style={styles.emptyEventReportText}>Select an event to view detailed reports</Text>
            </View>
          )}
        </View>
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
            {activeEvents.map((event) => {
              const report = getEventReport(event);
              return (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.modalItem,
                    selectedEvent?.id === event.id && styles.selectedModalItem
                  ]}
                  onPress={() => {
                    setSelectedEvent(event);
                    setShowEventModal(false);
                  }}
                >
                  <View style={styles.modalItemHeader}>
                    <Text style={styles.modalItemTitle}>{event.name}</Text>
                    <View style={styles.modalItemBadge}>
                      <Text style={styles.modalItemBadgeText}>{report.totalAdmissions}</Text>
                    </View>
                  </View>
                  <Text style={styles.modalItemSubtitle}>
                    {event.activities.length} activities • {report.totalScans} scans
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Admissions Detail Modal */}
      <Modal
        visible={showAdmissionsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAdmissionsModal(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Admission Details</Text>
            <View style={styles.modalSpacer} />
          </View>

          {selectedEvent && selectedActivityId && (
            <View style={styles.admissionsModalContent}>
              <View style={styles.admissionsHeader}>
                <View style={styles.admissionsHeaderContent}>
                  <View>
                    <Text style={styles.admissionsEventName}>{selectedEvent.name}</Text>
                    <Text style={styles.admissionsActivityName}>
                      {selectedEvent.activities.find(a => a.id === selectedActivityId)?.name}
                    </Text>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.downloadButton}
                      onPress={() => downloadExcelReport(selectedEvent.id, selectedActivityId!, selectedDate || undefined)}
                    >
                      <Download size={20} color="#ffffff" />
                      <Text style={styles.downloadButtonText}>Excel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <FlatList
                data={getAdmissionsData(selectedEvent.id, selectedActivityId, selectedDate || undefined)}
                renderItem={renderAdmissionItem}
                keyExtractor={(item) => item.qrCode.id}
                style={styles.admissionsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyAdmissions}>
                    <FileText size={48} color="#d1d5db" />
                    <Text style={styles.emptyAdmissionsText}>
                      {selectedDate ? 'No admissions recorded for this date' : 'No admissions recorded yet'}
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      </Modal>

      {/* Rejected Scans Detail Modal */}
      <Modal
        visible={showRejectedModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRejectedModal(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Rejected Admissions</Text>
            <View style={styles.modalSpacer} />
          </View>

          {selectedEvent && selectedActivityId && (
            <View style={styles.admissionsModalContent}>
              <View style={styles.admissionsHeader}>
                <View style={styles.admissionsHeaderContent}>
                  <View>
                    <Text style={styles.admissionsEventName}>{selectedEvent.name}</Text>
                    <Text style={styles.admissionsActivityName}>
                      {selectedEvent.activities.find(a => a.id === selectedActivityId)?.name}
                    </Text>
                  </View>
                </View>
              </View>

              <FlatList
                data={getRejectedScansData(selectedEvent.id, selectedActivityId, selectedDate || undefined)}
                renderItem={renderRejectedItem}
                keyExtractor={(item) => item.qrCode}
                style={styles.admissionsList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyAdmissions}>
                    <AlertCircle size={48} color="#d1d5db" />
                    <Text style={styles.emptyAdmissionsText}>
                      {selectedDate ? 'No rejected scans for this date' : 'No rejected scans yet'}
                    </Text>
                  </View>
                }
              />
            </View>
          )}
        </View>
      </Modal>
      
      {/* Date Selection Modal for Multi-day Events */}
      <Modal
        visible={showDateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDateModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Date</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {eventDates.map((date) => {
              const dateObj = new Date(date);
              const isSelected = selectedDate === date;
              
              return (
                <TouchableOpacity
                  key={date}
                  style={[
                    styles.modalItem,
                    isSelected && styles.selectedModalItem
                  ]}
                  onPress={() => {
                    setSelectedDate(date);
                    setReportType('daily');
                    setShowDateModal(false);
                  }}
                >
                  <View style={styles.modalItemHeader}>
                    <Text style={styles.modalItemTitle}>
                      {dateObj.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </Text>
                    {isSelected && (
                      <View style={styles.modalItemBadge}>
                        <Text style={styles.modalItemBadgeText}>Selected</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Archive List Modal */}
      <Modal
        visible={showArchiveModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowArchiveModal(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Archived Reports</Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.modalContent}>
            {archivedReports.length === 0 ? (
              <View style={styles.emptyArchive}>
                <Archive size={48} color="#d1d5db" />
                <Text style={styles.emptyArchiveText}>No archived reports yet</Text>
                <Text style={styles.emptyArchiveSubtext}>Archives are automatically deleted after 1 year</Text>
              </View>
            ) : (
              archivedReports
                .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime())
                .map((archive) => (
                  <View key={archive.id} style={styles.archiveItem}>
                    <View style={styles.archiveItemHeader}>
                      <View style={styles.archiveItemInfo}>
                        <Text style={styles.archiveItemTitle}>{archive.eventName}</Text>
                        <Text style={styles.archiveItemDate}>
                          {archive.isMultiDay && archive.eventEndDate
                            ? `${new Date(archive.eventStartDate).toLocaleDateString()} - ${new Date(archive.eventEndDate).toLocaleDateString()}`
                            : new Date(archive.eventStartDate).toLocaleDateString()}
                        </Text>
                        <Text style={styles.archiveItemMeta}>
                          Archived {new Date(archive.archivedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.archiveItemActions}>
                        <TouchableOpacity
                          style={styles.archiveActionButton}
                          onPress={() => {
                            setSelectedArchive(archive);
                            setShowArchiveDetailModal(true);
                          }}
                        >
                          <Eye size={20} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.archiveActionButton}
                          onPress={() => handleDeleteArchive(archive.id, archive.eventName)}
                        >
                          <Trash2 size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.archiveItemStats}>
                      <View style={styles.archiveItemStat}>
                        <Text style={styles.archiveItemStatValue}>{archive.totalAdmissions}</Text>
                        <Text style={styles.archiveItemStatLabel}>Guests</Text>
                      </View>
                      <View style={styles.archiveItemStat}>
                        <Text style={styles.archiveItemStatValue}>{archive.totalScans}</Text>
                        <Text style={styles.archiveItemStatLabel}>Scans</Text>
                      </View>
                      <View style={styles.archiveItemStat}>
                        <Text style={styles.archiveItemStatValue}>{archive.activityReports.length}</Text>
                        <Text style={styles.archiveItemStatLabel}>Activities</Text>
                      </View>
                    </View>
                  </View>
                ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Archive Detail Modal */}
      <Modal
        visible={showArchiveDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowArchiveDetailModal(false)}>
              <X size={24} color="#6b7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Archive Details</Text>
            <TouchableOpacity
              onPress={() => {
                if (selectedArchive) {
                  handleDeleteArchive(selectedArchive.id, selectedArchive.eventName);
                }
              }}
            >
              <Trash2 size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {selectedArchive && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.archiveDetailHeader}>
                <Text style={styles.archiveDetailTitle}>{selectedArchive.eventName}</Text>
                <Text style={styles.archiveDetailLocation}>{selectedArchive.eventLocation}</Text>
                <Text style={styles.archiveDetailDate}>
                  {selectedArchive.isMultiDay && selectedArchive.eventEndDate
                    ? `${new Date(selectedArchive.eventStartDate).toLocaleDateString()} - ${new Date(selectedArchive.eventEndDate).toLocaleDateString()}`
                    : new Date(selectedArchive.eventStartDate).toLocaleDateString()}
                </Text>
                <Text style={styles.archiveDetailMeta}>
                  Archived on {new Date(selectedArchive.archivedAt).toLocaleString()}
                </Text>
              </View>

              <View style={styles.archiveDetailStats}>
                <View style={styles.archiveDetailStat}>
                  <Text style={styles.archiveDetailStatValue}>{selectedArchive.totalScans}</Text>
                  <Text style={styles.archiveDetailStatLabel}>Total Scans</Text>
                </View>
                <View style={styles.archiveDetailStat}>
                  <Text style={styles.archiveDetailStatValue}>{selectedArchive.totalAdmissions}</Text>
                  <Text style={styles.archiveDetailStatLabel}>Guests</Text>
                </View>
                <View style={styles.archiveDetailStat}>
                  <Text style={styles.archiveDetailStatValue}>{selectedArchive.uniqueQRCodes}</Text>
                  <Text style={styles.archiveDetailStatLabel}>Unique QR</Text>
                </View>
                {selectedArchive.invitedGuests && (
                  <View style={styles.archiveDetailStat}>
                    <Text style={styles.archiveDetailStatValue}>
                      {Math.round((selectedArchive.totalAdmissions / selectedArchive.invitedGuests) * 100)}%
                    </Text>
                    <Text style={styles.archiveDetailStatLabel}>Attendance</Text>
                  </View>
                )}
              </View>

              <Text style={styles.archiveActivitiesTitle}>Activities</Text>
              {selectedArchive.activityReports.map((activityReport) => (
                <View key={activityReport.activityId} style={styles.archiveActivityCard}>
                  <Text style={styles.archiveActivityName}>
                    {activityReport.activityName}
                    {activityReport.activityDay ? ` - Day ${activityReport.activityDay}` : ''}
                  </Text>
                  <View style={styles.archiveActivityStats}>
                    <View style={styles.archiveActivityStat}>
                      <Text style={styles.archiveActivityStatValue}>{activityReport.totalAdmissions}</Text>
                      <Text style={styles.archiveActivityStatLabel}>Guests</Text>
                    </View>
                    <View style={styles.archiveActivityStat}>
                      <Text style={styles.archiveActivityStatValue}>{activityReport.totalScans}</Text>
                      <Text style={styles.archiveActivityStatLabel}>Scans</Text>
                    </View>
                    <View style={styles.archiveActivityStat}>
                      <Text style={styles.archiveActivityStatValue}>{activityReport.uniqueQRCodes}</Text>
                      <Text style={styles.archiveActivityStatLabel}>Unique QR</Text>
                    </View>
                  </View>
                  <View style={styles.archiveActivityBreakdown}>
                    <Text style={styles.archiveActivityBreakdownTitle}>Cards:</Text>
                    <Text style={styles.archiveActivityBreakdownText}>
                      Single: {activityReport.singleQRCount} • Double: {activityReport.doubleQRCount} • Multiple: {activityReport.multipleQRCount}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 8,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statTitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectEventButton: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectEventText: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '500',
  },
  eventReport: {
    marginTop: 16,
  },
  eventReportHeader: {
    marginBottom: 16,
  },
  eventReportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  eventReportDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  eventReportInvitedGuests: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
    marginTop: 4,
  },
  eventReportStats: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  eventReportStat: {
    flex: 1,
    alignItems: 'center',
  },
  eventReportStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  eventReportStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  activitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  activitiesList: {
    gap: 12,
  },
  activityReportCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityReportName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  activityReportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activityReportBadgeText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginLeft: 4,
  },
  activityReportStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  activityReportStat: {
    alignItems: 'center',
  },
  activityReportStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  activityReportStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyEventReport: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyEventReportText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
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
  modalSpacer: {
    width: 60,
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
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  modalItemBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalItemBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  modalItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  admissionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  admissionsButtonIcon: {
    marginLeft: 4,
  },
  admissionsModalContent: {
    flex: 1,
  },
  admissionsHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  admissionsHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  admissionsEventName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  admissionsActivityName: {
    fontSize: 14,
    color: '#6b7280',
  },
  admissionsList: {
    flex: 1,
  },
  admissionItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  admissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qrCodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  qrTypeBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  qrTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
  },
  qrCodeDetails: {
    flex: 1,
  },
  qrCodeNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  guestName: {
    fontSize: 14,
    color: '#6b7280',
  },
  admissionCount: {
    alignItems: 'center',
  },
  admissionCountNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  admissionCountLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  scanDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  scanDetailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  scanEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  scanTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  scanCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyAdmissions: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyAdmissionsText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
  },
  dateSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  reportTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
    gap: 6,
  },
  reportTypeButtonActive: {
    backgroundColor: colors.secondary,
  },
  reportTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  reportTypeButtonTextActive: {
    color: '#ffffff',
  },
  qrTypeBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  qrTypeBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  qrTypeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  qrTypeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '30%',
  },
  qrTypeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  qrTypeLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  rejectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  rejectedScanInfo: {
    flex: 1,
  },
  rejectedReason: {
    fontSize: 12,
    color: '#ef4444',
    fontStyle: 'italic',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  archiveButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  archiveEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  archiveEventButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyArchive: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyArchiveText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyArchiveSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  archiveItem: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  archiveItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  archiveItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  archiveItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  archiveItemDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  archiveItemMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  archiveItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  archiveActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  archiveItemStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  archiveItemStat: {
    alignItems: 'center',
  },
  archiveItemStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  archiveItemStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  archiveDetailHeader: {
    padding: 20,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  archiveDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  archiveDetailLocation: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  archiveDetailDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  archiveDetailMeta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  archiveDetailStats: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  archiveDetailStat: {
    flex: 1,
    alignItems: 'center',
  },
  archiveDetailStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  archiveDetailStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  archiveActivitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    padding: 20,
    paddingBottom: 12,
  },
  archiveActivityCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  archiveActivityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  archiveActivityStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  archiveActivityStat: {
    alignItems: 'center',
  },
  archiveActivityStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  archiveActivityStatLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  archiveActivityBreakdown: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  archiveActivityBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  archiveActivityBreakdownText: {
    fontSize: 12,
    color: '#6b7280',
  },
});