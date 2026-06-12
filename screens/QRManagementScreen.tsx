import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Upload, Download, FileText, CheckCircle, Package } from 'lucide-react-native';
import * as DocumentPicker from '@/lib/documentPicker';
import { FileSystem } from '@/lib/files';
import * as XLSX from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import { useFilteredEvents } from '@/hooks/useEvents';
import { trpc } from '@/lib/trpc';
import type { Event, QRCodeBulkEntry } from '@/types';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { colors } from '@/constants/colors';

export default function QRCodeManagementScreen() {
  const { user } = useAuth();
  const { events } = useFilteredEvents();
  const insets = useSafeAreaInsets();
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [lastUploadData, setLastUploadData] = useState<QRCodeBulkEntry[] | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const bulkUploadMutation = trpc.qr.bulkUpload.useMutation();

  const handleFileUpload = async () => {
    if (!selectedEvent) {
      Alert.alert('Error', 'Please select an event first');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('User cancelled file picker');
        return;
      }

      const file = result.assets[0];
      console.log('Selected file:', file.name);

      setIsUploading(true);
      setUploadStatus('Reading Excel file...');

      let fileData: string;
      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        fileData = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
      } else {
        fileData = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64' as any,
        });
      }

      const workbook = XLSX.read(fileData, { type: 'base64' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

      console.log('Excel data:', jsonData);

      if (jsonData.length < 2) {
        Alert.alert('Error', 'Excel file must have at least a header row and one data row');
        setIsUploading(false);
        return;
      }

      const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
      const codeNoIndex = headers.findIndex(h => h.includes('code') || h.includes('no'));
      const nameIndex = headers.findIndex(h => h.includes('name'));

      if (codeNoIndex === -1 || nameIndex === -1) {
        Alert.alert(
          'Invalid Format',
          'Excel file must have columns for "CODE NO" and "NAME"'
        );
        setIsUploading(false);
        return;
      }

      setUploadStatus(`Processing ${jsonData.length - 1} entries...`);

      const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('tel'));

      const entries = jsonData.slice(1).map(row => {
        const additionalData: Record<string, string> = {};
        headers.forEach((header, index) => {
          if (index !== codeNoIndex && index !== nameIndex && index !== phoneIndex && row[index]) {
            additionalData[header] = String(row[index]);
          }
        });

        return {
          codeNo: String(row[codeNoIndex] || '').trim(),
          name: String(row[nameIndex] || '').trim(),
          phoneNumber: phoneIndex !== -1 ? String(row[phoneIndex] || '').trim() : undefined,
          additionalData: Object.keys(additionalData).length > 0 ? additionalData : undefined,
        };
      }).filter(entry => entry.codeNo && entry.name);

      console.log(`Uploading ${entries.length} entries to backend...`);
      setUploadStatus('Generating QR codes...');

      const result_backend = await bulkUploadMutation.mutateAsync({
        eventId: selectedEvent.id,
        fileName: file.name,
        uploadedBy: user?.id || 'admin',
        entries,
      });

      console.log('Backend response:', result_backend);

      setUploadStatus('');
      setIsUploading(false);

      setLastUploadData(result_backend.bulkUpload.codes);

      Alert.alert(
        'Success',
        `Successfully uploaded ${result_backend.qrCodes.length} QR codes to "${selectedEvent.name}"!\n\n` +
        `Each code has been assigned a unique 8-character hash for scanning.\n\n` +
        `You can upload additional guests to this event at any time.\n\n` +
        `Download the QR codes as PNG files below.`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setIsUploading(false);
      setUploadStatus('');
      
      let errorMessage = 'Failed to upload Excel file';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      Alert.alert(
        'Upload Failed',
        errorMessage
      );
    }
  };

  const downloadSampleTemplate = () => {
    Alert.alert(
      'Sample Template',
      'A sample Excel template should have:\n\n' +
      '• Column 1: CODE NO (e.g., D001, S002, M030)\n' +
      '• Column 2: NAME (e.g., MR & MRS MOSES)\n' +
      '• Column 3: PHONE NUMBER (optional)\n' +
      '• Additional columns for extra guest data (optional)\n\n' +
      'The app will generate random 8-character codes for each entry.\n\n' +
      'Note: You can upload multiple files to the same event to add more guests.'
    );
  };

  const handleDownloadQRCodes = async () => {
    if (!lastUploadData || !selectedEvent) {
      Alert.alert('Error', 'No QR codes available to download');
      return;
    }

    try {
      setIsDownloading(true);
      setUploadStatus('Generating QR code images...');

      const zip = new JSZip();
      const qrFolder = zip.folder('QRCodes');

      if (!qrFolder) {
        throw new Error('Failed to create ZIP folder');
      }

      for (let i = 0; i < lastUploadData.length; i++) {
        const entry = lastUploadData[i];
        setUploadStatus(`Generating QR ${i + 1} of ${lastUploadData.length}...`);

        const qrDataUrl = await QRCode.toDataURL(entry.qrHash, {
          width: 512,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });

        const base64Data = qrDataUrl.split(',')[1];
        const fileName = `${entry.codeNo} - ${entry.name}.png`;
        qrFolder.file(fileName, base64Data, { base64: true });
      }

      setUploadStatus('Creating ZIP file...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedEvent.name}-QRCodes.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(zipBlob);
        });

        const fileUri = FileSystem.documentDirectory + `${selectedEvent.name}-QRCodes.zip`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: 'base64' as any,
        });

        Alert.alert(
          'Download Complete',
          `QR codes saved to: ${fileUri}`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  FileSystem.getContentUriAsync(fileUri).then((contentUri) => {
                    console.log('Share file from:', contentUri);
                  });
                }
              },
            },
          ]
        );
      }

      setUploadStatus('');
      setIsDownloading(false);

      if (Platform.OS === 'web') {
        Alert.alert(
          'Download Complete',
          `${lastUploadData.length} QR codes have been downloaded as PNG files in a ZIP archive.`
        );
      }
    } catch (error) {
      console.error('Download error:', error);
      setIsDownloading(false);
      setUploadStatus('');
      Alert.alert(
        'Download Failed',
        error instanceof Error ? error.message : 'Failed to generate QR codes'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>QR Code Management</Text>
        <Text style={styles.subtitle}>Upload bulk QR codes from Excel</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 1: Select Event</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventsScroll}>
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[
                  styles.eventCard,
                  selectedEvent?.id === event.id && styles.selectedEventCard
                ]}
                onPress={() => setSelectedEvent(event)}
              >
                <Text style={[
                  styles.eventName,
                  selectedEvent?.id === event.id && styles.selectedEventName
                ]}>
                  {event.name}
                </Text>
                <Text style={[
                  styles.eventDate,
                  selectedEvent?.id === event.id && styles.selectedEventDate
                ]}>
                  {new Date(event.date || event.startDate).toLocaleDateString()}
                </Text>
                {selectedEvent?.id === event.id && (
                  <View style={styles.checkIcon}>
                    <CheckCircle size={20} color="#10b981" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 2: Prepare Excel File</Text>
          <View style={styles.infoBox}>
            <FileText size={24} color="#3b82f6" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Excel Format Requirements:</Text>
              <Text style={styles.infoText}>• CODE NO column (e.g., D001, S050)</Text>
              <Text style={styles.infoText}>• NAME column (e.g., MR & MRS MOSES)</Text>
              <Text style={styles.infoText}>• PHONE NUMBER column (optional)</Text>
              <Text style={styles.infoText}>• Additional columns (optional)</Text>
              <Text style={styles.infoText}>• First row must be headers</Text>
              <Text style={styles.infoText}>• Multiple uploads per event allowed</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={downloadSampleTemplate}>
            <Download size={20} color="#3b82f6" />
            <Text style={styles.secondaryButtonText}>View Sample Format</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Step 3: Upload Excel File</Text>
          {lastUploadData && (
            <View style={styles.successBanner}>
              <CheckCircle size={20} color="#10b981" />
              <Text style={styles.successText}>
                {lastUploadData.length} QR codes ready to download
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.uploadButton, (!selectedEvent || isUploading) && styles.disabledButton]}
            onPress={handleFileUpload}
            disabled={!selectedEvent || isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Upload size={24} color="#ffffff" />
            )}
            <Text style={styles.uploadButtonText}>
              {isUploading ? 'Uploading...' : 'Upload Excel File'}
            </Text>
          </TouchableOpacity>
          
          {uploadStatus ? (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={styles.statusText}>{uploadStatus}</Text>
            </View>
          ) : null}
        </View>

        {lastUploadData && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 4: Download QR Codes</Text>
            <TouchableOpacity
              style={[styles.downloadButton, isDownloading && styles.disabledButton]}
              onPress={handleDownloadQRCodes}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Package size={24} color="#ffffff" />
              )}
              <Text style={styles.downloadButtonText}>
                {isDownloading ? 'Generating...' : `Download ${lastUploadData.length} QR Codes (ZIP)`}
              </Text>
            </TouchableOpacity>
            <View style={styles.downloadInfo}>
              <Text style={styles.downloadInfoText}>
                • Each QR code will be saved as a PNG file
              </Text>
              <Text style={styles.downloadInfoText}>
                • Files named as: CODE NO - NAME.png
              </Text>
              <Text style={styles.downloadInfoText}>
                • All files packaged in a single ZIP folder
              </Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Upload your Excel file with CODE NO and NAME columns
            </Text>
          </View>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              System generates random 8-character codes for each entry
            </Text>
          </View>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              QR codes are validated against backend during scanning
            </Text>
          </View>
          <View style={styles.stepContainer}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>
              Scanner shows full guest name whether manual entry or QR scan
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.secondary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  eventsScroll: {
    flexDirection: 'row',
  },
  eventCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 180,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedEventCard: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  selectedEventName: {
    color: '#047857',
  },
  eventDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  selectedEventDate: {
    color: '#059669',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#3b82f6',
    marginBottom: 4,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    marginLeft: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#3b82f6',
    marginLeft: 12,
    fontWeight: '500',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginTop: 4,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginLeft: 8,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  downloadInfo: {
    marginTop: 16,
    backgroundColor: '#faf5ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  downloadInfoText: {
    fontSize: 13,
    color: '#7c3aed',
    marginBottom: 4,
  },
});
