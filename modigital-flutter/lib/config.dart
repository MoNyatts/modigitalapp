import 'package:flutter/foundation.dart';

/// Backend configuration.
///
/// Android emulators reach the host machine through 10.0.2.2. Desktop, web,
/// and iOS simulator builds can use localhost directly.
const _apiBaseOverride = String.fromEnvironment('API_BASE');

String get apiBase {
  if (_apiBaseOverride.isNotEmpty) {
    return _apiBaseOverride;
  }

  return switch (defaultTargetPlatform) {
    TargetPlatform.android => 'http://10.0.2.2:8000/api',
    _ => 'http://127.0.0.1:8000/api',
  };
}
