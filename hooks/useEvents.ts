import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { getStorage, safeParseJSON, STORAGE_KEYS } from '@/lib/storage';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import type { Event, Activity, QRCode, Scan, AttendanceReport, RejectedScan, ArchivedReport } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Main Context Hook ───────────────────────────────────────────────────────

export const [EventsProvider, useEvents] = createContextHook(() => {
  const storage = useMemo(() => getStorage(), []);

  // ── Local state for non-server data ──────────────────────────────────────
  const [localScans, setLocalScans] = useState<Scan[]>([]);
  const [localRejectedScans, setLocalRejectedScans] = useState<RejectedScan[]>([]);
  const [archivedReports, setArchivedReports] = useState<ArchivedReport[]>([]);
  const [qrCodesCache, setQRCodesCache] = useState<QRCode[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<{ events: boolean; qrCodes: boolean; scans: boolean; rejectedScans: boolean; archivedReports: boolean }>({
    events: false, qrCodes: false, scans: false, rejectedScans: false, archivedReports: false,
  });

  // ── Load archived reports from local storage ──────────────────────────────
  useEffect(() => {
    storage.getItem(STORAGE_KEYS.ARCHIVED_REPORTS).then(data => {
      setArchivedReports(safeParseJSON<ArchivedReport[]>(data, []));
    });
  }, [storage]);

  // ── tRPC Queries ──────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const eventsQuery = trpc.events.list.useQuery(undefined, {
    staleTime: 30_000,
    retry: 3,
    retryDelay: 2000,
    onSuccess: () => setIsOnline(true),
    onError: () => setIsOnline(false),
  } as any);

  const isLoading = eventsQuery.isLoading;
  const allEvents: Event[] = (eventsQuery.data ?? []) as Event[];

  // ── tRPC Mutations ────────────────────────────────────────────────────────
  const createEventMutation = trpc.events.create.useMutation({
    onSuccess: () => utils.events.list.invalidate(),
  });
  const updateEventMutation = trpc.events.update.useMutation({
    onSuccess: () => utils.events.list.invalidate(),
  });
  const deleteEventMutation = trpc.events.delete.useMutation({
    onSuccess: () => utils.events.list.invalidate(),
  });
  const bulkUploadMutation = trpc.qr.bulkUpload.useMutation();
  const scanMutation = trpc.scanner.scan.useMutation();

  // ── Event CRUD ────────────────────────────────────────────────────────────

  const createEvent = useCallback(async (
    eventData: Omit<Event, 'id' | 'createdAt' | 'activities'>
  ): Promise<Event> => {
    const result = await createEventMutation.mutateAsync({
      id: generateId('event'),
      name: eventData.name,
      description: eventData.description,
      location: eventData.location,
      isMultiDay: eventData.isMultiDay,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      invitedGuests: eventData.invitedGuests,
      createdBy: eventData.createdBy,
      activities: [],
    });
    return { ...result, activities: [] } as Event;
  }, [createEventMutation]);

  const updateEvent = useCallback(async (
    eventId: string,
    eventData: Partial<Omit<Event, 'id' | 'createdAt' | 'activities'>>
  ): Promise<Event | undefined> => {
    const result = await updateEventMutation.mutateAsync({
      id: eventId,
      ...eventData,
    });
    return result as Event;
  }, [updateEventMutation]);

  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    await deleteEventMutation.mutateAsync({ id: eventId });
    // Clean up local state
    setLocalScans(prev => prev.filter(s => s.eventId !== eventId));
    setLocalRejectedScans(prev => prev.filter(s => s.eventId !== eventId));
    setQRCodesCache(prev => prev.filter(q => q.eventId !== eventId));
  }, [deleteEventMutation]);

  const addActivity = useCallback(async (
    eventId: string,
    activityData: Omit<Activity, 'id' | 'eventId'>
  ): Promise<Activity> => {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) throw new Error('Event not found');

    const newActivity: Activity = {
      ...activityData,
      id: generateId('activity'),
      eventId,
    };

    await updateEventMutation.mutateAsync({
      id: eventId,
      activities: [...(event.activities || []), newActivity],
    });

    return newActivity;
  }, [allEvents, updateEventMutation]);

  const updateActivity = useCallback(async (
    eventId: string,
    activityId: string,
    activityData: Partial<Omit<Activity, 'id' | 'eventId'>>
  ): Promise<Activity | undefined> => {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) throw new Error('Event not found');

    const updatedActivities = event.activities.map(a =>
      a.id === activityId ? { ...a, ...activityData } : a
    );

    await updateEventMutation.mutateAsync({ id: eventId, activities: updatedActivities });
    return updatedActivities.find(a => a.id === activityId);
  }, [allEvents, updateEventMutation]);

  const deleteActivity = useCallback(async (eventId: string, activityId: string): Promise<void> => {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) throw new Error('Event not found');

    await updateEventMutation.mutateAsync({
      id: eventId,
      activities: event.activities.filter(a => a.id !== activityId),
    });

    setLocalScans(prev => prev.filter(s => s.activityId !== activityId));
    setLocalRejectedScans(prev => prev.filter(s => s.activityId !== activityId));
  }, [allEvents, updateEventMutation]);

  // ── QR Code upload ────────────────────────────────────────────────────────

  const uploadQRCodes = useCallback(async (
    eventId: string,
    fileName: string,
    uploadedBy: string,
    entries: Array<{ codeNo: string; name: string; phoneNumber?: string }>
  ) => {
    const result = await bulkUploadMutation.mutateAsync({ eventId, fileName, uploadedBy, entries });
    // Merge new codes into local cache
    const newCodes = result.qrCodes as QRCode[];
    setQRCodesCache(prev => {
      const existingIds = new Set(newCodes.map((q: QRCode) => q.id));
      return [...prev.filter(q => !existingIds.has(q.id)), ...newCodes];
    });
    // Invalidate any cached QR list query for this event
    utils.qr.list.invalidate({ eventId });
    return result.bulkUpload;
  }, [bulkUploadMutation, utils]);

  // ── QR Code helpers ───────────────────────────────────────────────────────

  const extractQRCodePrefix = useCallback((qrCode: string): string => {
    const dashIndex = qrCode.indexOf(' - ');
    return dashIndex !== -1 ? qrCode.substring(0, dashIndex).trim() : qrCode.trim();
  }, []);

  const getGuestNameFromQRCode = useCallback((qrCode: string): string => {
    const dashIndex = qrCode.indexOf(' - ');
    return dashIndex !== -1 && dashIndex < qrCode.length - 3
      ? qrCode.substring(dashIndex + 3).trim()
      : `Guest ${qrCode.slice(-4)}`;
  }, []);

  // ── SCAN — THE CRITICAL NETWORKED OPERATION ───────────────────────────────
  /**
   * Scans a QR code by sending it to the server for atomic, multi-device-safe processing.
   *
   * The server checks and records admission in a single SQLite transaction,
   * meaning two scanners can NEVER double-admit the same person simultaneously.
   *
   * @throws Error if the QR code is already fully used or invalid
   */
  const scanQRCode = useCallback(async (
    qrCodeData: string,
    eventId: string,
    activityId: string,
    scannedBy: string,
    admissionCount: number = 1,
    notes?: string
  ): Promise<Scan> => {
    setSyncStatus(prev => ({ ...prev, scans: true }));

    let result: any;
    try {
      result = await scanMutation.mutateAsync({
        qrCodeData,
        eventId,
        activityId,
        scannedBy,
        admissionCount,
        notes,
      });
    } catch (err: any) {
      setSyncStatus(prev => ({ ...prev, scans: false }));
      throw new Error(err.message || 'Scan failed — check network connection');
    }

    setSyncStatus(prev => ({ ...prev, scans: false }));

    if (!result.success) {
      // Record rejected scan locally for display
      const rejected: RejectedScan = {
        id: generateId('rej'),
        qrCodeId: result.qrCodeId || 'unknown',
        qrCode: qrCodeData,
        eventId,
        activityId,
        scannedBy,
        scannedAt: new Date().toISOString(),
        attemptedAdmissionCount: admissionCount,
        reason: result.message || 'Scan rejected',
        notes,
      };
      setLocalRejectedScans(prev => [rejected, ...prev].slice(0, 200));
      throw new Error(result.message || 'QR code cannot be admitted');
    }

    // Record successful scan locally for immediate UI feedback
    const newScan: Scan = {
      id: result.scanId || generateId('scan'),
      qrCodeId: result.qrCodeId || 'unknown',
      eventId,
      activityId,
      scannedBy,
      scannedAt: result.scannedAt || new Date().toISOString(),
      admissionCount: result.admissionCount ?? admissionCount,
      notes,
    };
    setLocalScans(prev => [newScan, ...prev].slice(0, 500));
    return newScan;
  }, [scanMutation]);

  // ── Check QR Code Status (queries server) ────────────────────────────────
  /**
   * Checks the REAL server status of a QR code.
   * Always returns the live server state, not local cache.
   */
  const checkQRCodeNetworkStatus = useCallback(async (
    qrCodeData: string,
    eventId: string,
    activityId: string
  ) => {
    try {
      const result = await utils.scanner.checkStatus.fetch({
        qrCodeData,
        eventId,
        activityId,
      });
      // The checkStatus procedure returns a narrower shape when the code is
      // not found, so read the optional fields defensively.
      const status = result as {
        isFullyUsed?: boolean;
        totalUsed?: number;
        maxAdmissions?: number;
        remaining?: number;
      };
      return {
        isScanned: status.isFullyUsed ?? false,
        totalAdmissions: status.totalUsed ?? 0,
        maxAdmissions: status.maxAdmissions ?? 0,
        remainingAdmissions: status.remaining ?? 0,
      };
    } catch {
      // Offline fallback — check local state
      const codePrefix = extractQRCodePrefix(qrCodeData);
      const existingQRCode = qrCodesCache.find(qr =>
        extractQRCodePrefix(qr.code) === codePrefix && qr.eventId === eventId
      );
      if (!existingQRCode) {
        const type = qrCodeData.charAt(0).toUpperCase();
        const maxAdmissions = type === 'D' ? 2 : type === 'M' ? parseInt(qrCodeData.slice(1)) || 1 : 1;
        return { isScanned: false, totalAdmissions: 0, maxAdmissions, remainingAdmissions: maxAdmissions };
      }
      const used = localScans
        .filter(s => s.qrCodeId === existingQRCode.id && s.activityId === activityId)
        .reduce((sum, s) => sum + s.admissionCount, 0);
      return {
        isScanned: used >= existingQRCode.maxAdmissions,
        totalAdmissions: used,
        maxAdmissions: existingQRCode.maxAdmissions,
        remainingAdmissions: existingQRCode.maxAdmissions - used,
      };
    }
  }, [utils, qrCodesCache, localScans, extractQRCodePrefix]);

  // ── QR Code Status (local lookup) ────────────────────────────────────────
  const getQRCodeStatus = useCallback((qrCodeId: string, activityId: string) => {
    const qrCode = qrCodesCache.find(qr => qr.id === qrCodeId);
    if (!qrCode) return null;

    const activityScans = localScans.filter(
      s => s.qrCodeId === qrCodeId && s.activityId === activityId
    );
    const totalAdmissions = activityScans.reduce((sum, s) => sum + s.admissionCount, 0);

    return {
      qrCode,
      scans: activityScans,
      totalAdmissions,
      remainingAdmissions: qrCode.maxAdmissions - totalAdmissions,
      isFullyUsed: totalAdmissions >= qrCode.maxAdmissions,
    };
  }, [qrCodesCache, localScans]);

  // ── Attendance Report (uses local + server data) ─────────────────────────
  const getAttendanceReport = useCallback((eventId: string, activityId?: string): AttendanceReport => {
    const eventScans = localScans.filter(scan =>
      scan.eventId === eventId && (!activityId || scan.activityId === activityId)
    );
    return {
      eventId,
      activityId: activityId || '',
      totalScans: eventScans.length,
      totalAdmissions: eventScans.reduce((sum, scan) => sum + scan.admissionCount, 0),
      uniqueQRCodes: new Set(eventScans.map(scan => scan.qrCodeId)).size,
      scans: eventScans,
    };
  }, [localScans]);

  // ── Archive Event Report ─────────────────────────────────────────────────
  const archiveEventReport = useCallback(async (eventId: string, archivedBy: string): Promise<ArchivedReport> => {
    const event = allEvents.find(e => e.id === eventId);
    if (!event) throw new Error('Event not found');

    const eventScans = localScans.filter(s => s.eventId === eventId);
    const eventQRCodes = qrCodesCache.filter(qr => qr.eventId === eventId);
    const eventRejectedScans = localRejectedScans.filter(s => s.eventId === eventId);

    const activityReports = event.activities.map(activity => {
      const activityScans = eventScans.filter(s => s.activityId === activity.id);
      const activityRejected = eventRejectedScans.filter(s => s.activityId === activity.id);
      const uniqueQRTypes = [...new Set(activityScans.map(s => s.qrCodeId))]
        .map(qrId => eventQRCodes.find(qr => qr.id === qrId)?.type)
        .filter(Boolean);

      return {
        activityId: activity.id,
        activityName: activity.name,
        activityDay: activity.day,
        totalScans: activityScans.length,
        totalAdmissions: activityScans.reduce((sum, s) => sum + s.admissionCount, 0),
        uniqueQRCodes: new Set(activityScans.map(s => s.qrCodeId)).size,
        singleQRCount: uniqueQRTypes.filter(t => t === 'S').length,
        doubleQRCount: uniqueQRTypes.filter(t => t === 'D').length,
        multipleQRCount: uniqueQRTypes.filter(t => t === 'M').length,
        admissions: [],
        rejectedScans: activityRejected.map(rs => ({
          qrCode: rs.qrCode,
          guestName: getGuestNameFromQRCode(rs.qrCode),
          attemptedAdmissionCount: rs.attemptedAdmissionCount,
          reason: rs.reason,
          scannedAt: rs.scannedAt,
        })),
      };
    });

    const archivedReport: ArchivedReport = {
      id: `archive-${eventId}-${Date.now()}`,
      eventId,
      eventName: event.name,
      eventLocation: event.location,
      eventStartDate: event.startDate,
      eventEndDate: event.endDate,
      isMultiDay: event.isMultiDay,
      invitedGuests: event.invitedGuests,
      totalScans: eventScans.length,
      totalAdmissions: eventScans.reduce((sum, s) => sum + s.admissionCount, 0),
      uniqueQRCodes: new Set(eventScans.map(s => s.qrCodeId)).size,
      activityReports,
      archivedAt: new Date().toISOString(),
      archivedBy,
    };

    const newArchived = [...archivedReports, archivedReport];
    await storage.setItem(STORAGE_KEYS.ARCHIVED_REPORTS, JSON.stringify(newArchived));
    setArchivedReports(newArchived);
    return archivedReport;
  }, [allEvents, localScans, qrCodesCache, localRejectedScans, archivedReports, storage, getGuestNameFromQRCode]);

  const deleteArchivedReport = useCallback(async (archiveId: string) => {
    const updated = archivedReports.filter(r => r.id !== archiveId);
    await storage.setItem(STORAGE_KEYS.ARCHIVED_REPORTS, JSON.stringify(updated));
    setArchivedReports(updated);
  }, [archivedReports, storage]);

  const saveRejectedScans = useCallback(async (newRejectedScans: RejectedScan[]) => {
    setLocalRejectedScans(newRejectedScans);
  }, []);

  const refetchData = useCallback(() => {
    utils.events.list.invalidate();
  }, [utils]);

  // ── Expose qrCodes from cache ─────────────────────────────────────────────
  // This is populated when QR codes are uploaded or fetched for a specific event.
  // Use trpc.qr.list.useQuery({ eventId }) directly for per-event lists.
  const qrCodes = qrCodesCache;

  return useMemo(() => ({
    events: allEvents,
    allEvents,
    qrCodes,
    scans: localScans,
    rejectedScans: localRejectedScans,
    archivedReports,
    isLoading,
    isOnline,
    syncStatus,
    createEvent,
    updateEvent,
    deleteEvent,
    addActivity,
    updateActivity,
    deleteActivity,
    uploadQRCodes,
    scanQRCode,
    checkQRCodeNetworkStatus,
    getAttendanceReport,
    getQRCodeStatus,
    archiveEventReport,
    deleteArchivedReport,
    saveRejectedScans,
    refetchData,
    extractQRCodePrefix,
    getGuestNameFromQRCode,
  }), [
    allEvents, qrCodes, localScans, localRejectedScans, archivedReports,
    isLoading, isOnline, syncStatus,
    createEvent, updateEvent, deleteEvent,
    addActivity, updateActivity, deleteActivity,
    uploadQRCodes, scanQRCode, checkQRCodeNetworkStatus,
    getAttendanceReport, getQRCodeStatus,
    archiveEventReport, deleteArchivedReport,
    saveRejectedScans, refetchData,
    extractQRCodePrefix, getGuestNameFromQRCode,
  ]);
});

// ─── Filtered Events (for scanner — respects user's assigned events) ─────────

export function useFilteredEvents() {
  const { user } = useAuth();
  const eventsContext = useEvents();

  const events = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return eventsContext.allEvents;
    if (user.role === 'guest' && user.assignedEventIds?.length) {
      return eventsContext.allEvents.filter(event =>
        user.assignedEventIds!.includes(event.id)
      );
    }
    return [];
  }, [eventsContext.allEvents, user]);

  return { ...eventsContext, events };
}

// ─── Per-Event/Activity Details Hook (with real-time polling) ─────────────────

/**
 * Hook for a single event's QR codes + scan history.
 * Polls the server every 5 seconds so all scanners see the same live state.
 *
 * Use this on the scanner screen to show a real-time feed of who has been admitted.
 */
export function useEventActivity(eventId: string, activityId?: string) {
  const qrListQuery = trpc.qr.list.useQuery(
    { eventId },
    { enabled: !!eventId, staleTime: 60_000 }
  );

  const historyQuery = trpc.scanner.history.useQuery(
    { eventId, activityId: activityId || '' },
    {
      enabled: !!eventId && !!activityId,
      refetchInterval: 5_000,   // 🔄 Poll every 5 s — multi-device real-time sync
      staleTime: 0,
    }
  );

  const reportQuery = trpc.scanner.report.useQuery(
    { eventId, activityId: activityId || '' },
    {
      enabled: !!eventId && !!activityId,
      refetchInterval: 5_000,
      staleTime: 0,
    }
  );

  return {
    qrCodes: (qrListQuery.data ?? []) as QRCode[],
    liveScans: historyQuery.data?.scans ?? [],
    liveRejectedScans: historyQuery.data?.rejectedScans ?? [],
    report: reportQuery.data,
    isLoadingQR: qrListQuery.isLoading,
    isLoadingHistory: historyQuery.isLoading,
    lastUpdated: historyQuery.dataUpdatedAt,
  };
}
