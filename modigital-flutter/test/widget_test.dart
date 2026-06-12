import 'package:flutter_test/flutter_test.dart';

import 'package:modigital_scanner/models.dart';

void main() {
  test('QR scan result parses success payload', () {
    final result = ScanResult.fromJson({
      'success': true,
      'message': 'Admitted 1 guest(s)',
      'guest_name': 'John Doe',
      'remaining': 0,
      'max_admissions': 1,
    });

    expect(result.success, isTrue);
    expect(result.guestName, 'John Doe');
    expect(result.remaining, 0);
  });

  test('Event parses with nested activities', () {
    final event = Event.fromJson({
      'id': 1,
      'name': 'Demo Gala',
      'location': 'Test Hall',
      'start_date': '2026-06-12',
      'activities': [
        {'id': 1, 'name': 'Main Entrance', 'day': null, 'start_time': null, 'end_time': null, 'is_active': true},
      ],
    });

    expect(event.activities, hasLength(1));
    expect(event.activities.first.name, 'Main Entrance');
  });
}
