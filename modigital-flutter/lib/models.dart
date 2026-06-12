class Activity {
  final int id;
  final String name;
  final int? day;
  final String? startTime;
  final String? endTime;

  Activity({required this.id, required this.name, this.day, this.startTime, this.endTime});

  factory Activity.fromJson(Map<String, dynamic> json) => Activity(
        id: json['id'] as int,
        name: json['name'] as String,
        day: json['day'] as int?,
        startTime: json['start_time'] as String?,
        endTime: json['end_time'] as String?,
      );
}

class Event {
  final int id;
  final String name;
  final String location;
  final String startDate;
  final List<Activity> activities;

  Event({
    required this.id,
    required this.name,
    required this.location,
    required this.startDate,
    required this.activities,
  });

  factory Event.fromJson(Map<String, dynamic> json) => Event(
        id: json['id'] as int,
        name: json['name'] as String,
        location: json['location'] as String,
        startDate: json['start_date'] as String,
        activities: (json['activities'] as List<dynamic>)
            .map((a) => Activity.fromJson(a as Map<String, dynamic>))
            .toList(),
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
