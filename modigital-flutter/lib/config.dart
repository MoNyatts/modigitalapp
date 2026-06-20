/// Backend configuration.
///
/// Default production backend. Override with --dart-define=API_BASE=...
/// when testing against a local or staging server.
const _apiBaseOverride = String.fromEnvironment('API_BASE');
const _productionApiBase = 'https://modigitalevents.com/api';

String get apiBase {
  if (_apiBaseOverride.isNotEmpty) {
    return _apiBaseOverride;
  }

  return _productionApiBase;
}
