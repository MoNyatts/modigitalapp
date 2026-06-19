class Activity {
  final int id;
  final String name;
  final int? day;
  final String? startTime;
  final String? endTime;
  final bool isActive;
  final int totalAdmissions;
  final int totalScans;
  final int uniqueCodes;
  final int rejectedScans;

  Activity({
    required this.id,
    required this.name,
    this.day,
    this.startTime,
    this.endTime,
    this.isActive = true,
    this.totalAdmissions = 0,
    this.totalScans = 0,
    this.uniqueCodes = 0,
    this.rejectedScans = 0,
  });

  factory Activity.fromJson(Map<String, dynamic> json) => Activity(
    id: json['id'] as int,
    name: json['name'] as String,
    day: json['day'] as int?,
    startTime: json['start_time'] as String?,
    endTime: json['end_time'] as String?,
    isActive: json['is_active'] as bool? ?? true,
    totalAdmissions: json['total_admissions'] as int? ?? 0,
    totalScans: json['total_scans'] as int? ?? 0,
    uniqueCodes: json['unique_codes'] as int? ?? 0,
    rejectedScans: json['rejected_scans'] as int? ?? 0,
  );
}

class Event {
  final int id;
  final String name;
  final String location;
  final String startDate;
  final String? endDate;
  final bool isMultiDay;
  final int invitedGuests;
  final int qrCodesCount;
  final int totalAdmissions;
  final int totalScans;
  final int uniqueCodes;
  final int rejectedScans;
  final List<Activity> activities;

  Event({
    required this.id,
    required this.name,
    required this.location,
    required this.startDate,
    this.endDate,
    this.isMultiDay = false,
    this.invitedGuests = 0,
    this.qrCodesCount = 0,
    this.totalAdmissions = 0,
    this.totalScans = 0,
    this.uniqueCodes = 0,
    this.rejectedScans = 0,
    required this.activities,
  });

  factory Event.fromJson(Map<String, dynamic> json) => Event(
    id: json['id'] as int,
    name: json['name'] as String,
    location: json['location'] as String? ?? '',
    startDate: json['start_date'] as String,
    endDate: json['end_date'] as String?,
    isMultiDay: json['is_multi_day'] as bool? ?? false,
    invitedGuests: json['invited_guests'] as int? ?? 0,
    qrCodesCount: json['qr_codes_count'] as int? ?? 0,
    totalAdmissions: json['total_admissions'] as int? ?? 0,
    totalScans: json['total_scans'] as int? ?? 0,
    uniqueCodes: json['unique_codes'] as int? ?? 0,
    rejectedScans: json['rejected_scans'] as int? ?? 0,
    activities: (json['activities'] as List<dynamic>)
        .map((a) => Activity.fromJson(a as Map<String, dynamic>))
        .toList(),
  );
}

class AppUser {
  final int id;
  final String name;
  final String email;
  final String role;
  final bool scannerEnabled;
  final int? assignedEventsCount;
  final List<int> assignedEventIds;
  final String? profilePhotoUrl;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.scannerEnabled,
    required this.assignedEventsCount,
    required this.assignedEventIds,
    this.profilePhotoUrl,
  });

  bool get isAdmin => role == 'admin';

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id: json['id'] as int,
    name: json['name'] as String? ?? 'User',
    email: json['email'] as String? ?? '',
    role: json['role'] as String? ?? 'staff',
    scannerEnabled: json['scanner_enabled'] as bool? ?? true,
    assignedEventsCount: json['assigned_events_count'] as int?,
    assignedEventIds: (json['assigned_event_ids'] as List<dynamic>? ?? [])
        .map((id) => id as int)
        .toList(),
    profilePhotoUrl: json['profile_photo_url'] as String?,
  );
}

class ScanResult {
  final bool success;
  final String message;
  final String? guestName;
  final int remaining;
  final int maxAdmissions;

  ScanResult({
    required this.success,
    required this.message,
    this.guestName,
    required this.remaining,
    required this.maxAdmissions,
  });

  factory ScanResult.fromJson(Map<String, dynamic> json) => ScanResult(
    success: json['success'] as bool? ?? false,
    message: json['message'] as String? ?? 'Unknown response',
    guestName: json['guest_name'] as String?,
    remaining: json['remaining'] as int? ?? 0,
    maxAdmissions: json['max_admissions'] as int? ?? 0,
  );
}

class FeedScan {
  final String code;
  final String guestName;
  final int admissionCount;
  final String scannedBy;
  final DateTime scannedAt;

  FeedScan({
    required this.code,
    required this.guestName,
    required this.admissionCount,
    required this.scannedBy,
    required this.scannedAt,
  });

  factory FeedScan.fromJson(Map<String, dynamic> json) => FeedScan(
    code: json['code'] as String? ?? '?',
    guestName: json['guest_name'] as String? ?? '?',
    admissionCount: json['admission_count'] as int? ?? 1,
    scannedBy: json['scanned_by'] as String? ?? '?',
    scannedAt: DateTime.parse(json['scanned_at'] as String),
  );
}

class Feed {
  final int totalAdmissions;
  final int totalScans;
  final int uniqueCodes;
  final List<FeedScan> scans;

  Feed({
    required this.totalAdmissions,
    required this.totalScans,
    required this.uniqueCodes,
    required this.scans,
  });

  factory Feed.fromJson(Map<String, dynamic> json) => Feed(
    totalAdmissions: json['total_admissions'] as int? ?? 0,
    totalScans: json['total_scans'] as int? ?? 0,
    uniqueCodes: json['unique_codes'] as int? ?? 0,
    scans: (json['scans'] as List<dynamic>? ?? [])
        .map((s) => FeedScan.fromJson(s as Map<String, dynamic>))
        .toList(),
  );
}
