import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'config.dart';
import 'models.dart';

class ApiException implements Exception {
  final String message;
  ApiException(this.message);

  @override
  String toString() => message;
}

class ApiClient {
  static const _tokenKey = 'auth_token';
  static const _nameKey = 'user_name';

  String? _token;
  String? userName;

  Future<bool> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
    userName = prefs.getString(_nameKey);
    return _token != null;
  }

  Map<String, String> get _headers => {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<void> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$apiBase/login'),
      headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(body['message'] as String? ?? 'Login failed');
    }

    _token = body['token'] as String;
    userName = (body['user'] as Map<String, dynamic>)['name'] as String;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, _token!);
    await prefs.setString(_nameKey, userName!);
  }

  Future<void> logout() async {
    try {
      await http.post(Uri.parse('$apiBase/logout'), headers: _headers);
    } catch (_) {
      // Token is being discarded anyway.
    }
    _token = null;
    userName = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_nameKey);
  }

  Future<List<Event>> events() async {
    final res = await http.get(Uri.parse('$apiBase/events'), headers: _headers);
    _ensureOk(res);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return (body['events'] as List<dynamic>)
        .map((e) => Event.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ScanResult> scan(String qrData, int activityId, {int admissionCount = 1}) async {
    final res = await http.post(
      Uri.parse('$apiBase/scan'),
      headers: _headers,
      body: jsonEncode({
        'qr_data': qrData,
        'activity_id': activityId,
        'admission_count': admissionCount,
      }),
    );

    if (res.statusCode == 200 || res.statusCode == 422) {
      final body = jsonDecode(res.body) as Map<String, dynamic>;
      if (body.containsKey('success')) {
        return ScanResult.fromJson(body);
      }
      throw ApiException(body['message'] as String? ?? 'Scan failed');
    }

    _ensureOk(res);
    throw ApiException('Unexpected response');
  }

  Future<Feed> feed(int activityId) async {
    final res = await http.get(Uri.parse('$apiBase/activities/$activityId/feed'), headers: _headers);
    _ensureOk(res);
    return Feed.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }

  void _ensureOk(http.Response res) {
    if (res.statusCode == 401) {
      throw ApiException('Session expired — please sign in again');
    }
    if (res.statusCode >= 400) {
      String message = 'Request failed (${res.statusCode})';
      try {
        final body = jsonDecode(res.body) as Map<String, dynamic>;
        message = body['message'] as String? ?? message;
      } catch (_) {}
      throw ApiException(message);
    }
  }
}

/// Single shared client instance.
final api = ApiClient();
