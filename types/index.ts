export type UserRole = 'admin' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  assignedEventIds?: string[]; // For guest users - restricts access to specific events
  scannerEnabled?: boolean; // For guest users - controls scanner access (default: true)
  createdAt: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  isMultiDay: boolean;
  startDate: string;
  endDate?: string; // Only for multi-day events
  location: string;
  locationDetails?: {
    placeId?: string;
    formattedAddress?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  invitedGuests?: number; // Number of invited guests
  createdBy: string;
  activities: Activity[];
  createdAt: string;
  // Legacy field for backward compatibility
  date?: string;
}

export interface Activity {
  id: string;
  eventId: string;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  day?: number; // For multi-day events: 1, 2, 3, etc.
  sendWelcomeMessage?: boolean; // Send welcome message after scanning
  welcomeMessage?: string; // Custom welcome message
}

export type AdmissionType = 'S' | 'D' | 'M';

export interface QRCode {
  id: string;
  code: string;
  type: AdmissionType;
  eventId: string;
  maxAdmissions: number;
  guestName?: string;
  phoneNumber?: string;
  qrHash?: string;
  isValid?: boolean;
  createdAt: string;
}

export interface QRCodeBulkUpload {
  id: string;
  eventId: string;
  fileName: string;
  totalCodes: number;
  uploadedBy: string;
  uploadedAt: string;
  codes: QRCodeBulkEntry[];
}

export interface QRCodeBulkEntry {
  codeNo: string;
  name: string;
  qrHash: string;
  phoneNumber?: string;
  additionalData?: Record<string, string>;
}

export interface Scan {
  id: string;
  qrCodeId: string;
  eventId: string;
  activityId: string;
  scannedBy: string;
  scannedAt: string;
  admissionCount: number;
  notes?: string;
}

export interface RejectedScan {
  id: string;
  qrCodeId: string;
  qrCode: string; // The actual QR code string for display
  eventId: string;
  activityId: string;
  scannedBy: string;
  scannedAt: string;
  attemptedAdmissionCount: number;
  reason: string; // Why it was rejected (e.g., "Code already used up")
  notes?: string;
}

export interface AttendanceReport {
  eventId: string;
  activityId: string;
  totalScans: number;
  totalAdmissions: number;
  uniqueQRCodes: number;
  scans: Scan[];
}

export interface ArchivedReport {
  id: string;
  eventId: string;
  eventName: string;
  eventLocation: string;
  eventStartDate: string;
  eventEndDate?: string;
  isMultiDay: boolean;
  invitedGuests?: number;
  totalScans: number;
  totalAdmissions: number;
  uniqueQRCodes: number;
  activityReports: {
    activityId: string;
    activityName: string;
    activityDay?: number;
    totalScans: number;
    totalAdmissions: number;
    uniqueQRCodes: number;
    singleQRCount: number;
    doubleQRCount: number;
    multipleQRCount: number;
    admissions: {
      qrCode: string;
      guestName: string;
      type: string;
      totalAdmissions: number;
      scans: {
        scannedAt: string;
        admissionCount: number;
        scannedBy: string;
      }[];
    }[];
    rejectedScans: {
      qrCode: string;
      guestName: string;
      attemptedAdmissionCount: number;
      reason: string;
      scannedAt: string;
    }[];
  }[];
  archivedAt: string;
  archivedBy: string;
}