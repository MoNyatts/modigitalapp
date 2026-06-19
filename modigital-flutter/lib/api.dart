import 'dart:async';
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
  static const _requestTimeout = Duration(seconds: 8);
  static const _tokenKey = 'auth_token';
  static const _nameKey = 'user_name';
  static const _emailKey = 'user_email';
  static const _roleKey = 'user_role';

  String? _token;
  String? userName;
  String? userEmail;
  String? userRole;

  bool get isAdmin => userRole == 'admin';

  Future<bool> loadSession() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
    userName = prefs.getString(_nameKey);
    userEmail = prefs.getString(_emailKey);
    userRole = prefs.getString(_roleKey);

    if (_token != null && userRole == null) {
      try {
        final res = await http
            .get(Uri.parse('$apiBase/me'), headers: _headers)
            .timeout(const Duration(seconds: 2));
        if (res.statusCode == 200) {
          final body = jsonDecode(res.body) as Map<String, dynamic>;
          await _storeUser(body);
        } else {
          await _storeUser({'name': userName ?? 'Scanner', 'role': 'staff'});
        }
      } catch (_) {
        await _storeUser({'name': userName ?? 'Scanner', 'role': 'staff'});
      }
    }

    return _token != null;
  }

  Map<String, String> get _headers => {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  Future<http.Response> _send(Future<http.Response> request) async {
    try {
      return await request.timeout(_requestTimeout);
    } on TimeoutException {
      throw ApiException(
        'Connection timed out. Check the API server and try again.',
      );
    } on http.ClientException catch (e) {
      throw ApiException('Could not reach server: ${e.message}');
    }
  }

  Future<void> login(String email, String password) async {
    final res = await _send(
      http.post(
        Uri.parse('$apiBase/login'),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'email': email, 'password': password}),
      ),
    );

    final body = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw ApiException(body['message'] as String? ?? 'Login failed');
    }

    _token = body['token'] as String;
    await _storeUser(body['user'] as Map<String, dynamic>);
  }

  Future<void> logout() async {
    try {
      await _send(http.post(Uri.parse('$apiBase/logout'), headers: _headers));
    } catch (_) {
      // Token is being discarded anyway.
    }
    _token = null;
    userName = null;
    userEmail = null;
    userRole = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_nameKey);
    await prefs.remove(_emailKey);
    await prefs.remove(_roleKey);
  }

  Future<List<Event>> events() async {
    final res = await _send(
      http.get(Uri.parse('$apiBase/events'), headers: _headers),
    );
    _ensureOk(res);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return (body['events'] as List<dynamic>)
        .map((e) => Event.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Event> createEvent(Map<String, dynamic> payload) async {
    final res = await _send(
      http.post(
        Uri.parse('$apiBase/events'),
        headers: _headers,
        body: jsonEncode(payload),
      ),
    );
    _ensureOk(res);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return Event.fromJson(body['event'] as Map<String, dynamic>);
  }

  Future<void> deleteEvent(int eventId) async {
    final res = await _send(
      http.delete(Uri.parse('$apiBase/events/$eventId'), headers: _headers),
    );
    _ensureOk(res);
  }

  Future<List<AppUser>> users() async {
    final res = await _send(
      http.get(Uri.parse('$apiBase/users'), headers: _headers),
    );
    _ensureOk(res);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return (body['users'] as List<dynamic>)
        .map((u) => AppUser.fromJson(u as Map<String, dynamic>))
        .toList();
  }

  Future<AppUser> createUser(Map<String, dynamic> payload) async {
    final res = await _send(
      http.post(
        Uri.parse('$apiBase/users'),
        headers: _headers,
        body: jsonEncode(payload),
      ),
    );
    _ensureOk(res);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return AppUser.fromJson(body['user'] as Map<String, dynamic>);
  }

  Future<AppUser> updateUser(int userId, Map<String, dynamic> payload) async {
    final res = await _send(
      http.put(
        Uri.parse('$apiBase/users/$userId'),
        headers: _headers,
        body: jsonEncode(payload),
      ),
    );
    _ensureOk(res);
    final body = jsonDecode(res.body) as Map<String, dynamic>;
    return AppUser.fromJson(body['user'] as Map<String, dynamic>);
  }

  Future<void> deleteUser(int userId) async {
    final res = await _send(
      http.delete(Uri.parse('$apiBase/users/$userId'), headers: _headers),
    );
    _ensureOk(res);
  }

  Future<ScanResult> scan(
    String qrData,
    int activityId, {
    int admissionCount = 1,
  }) async {
    final res = await _send(
      http.post(
        Uri.parse('$apiBase/scan'),
        headers: _headers,
        body: jsonEncode({
          'qr_data': qrData,
          'activity_id': activityId,
          'admission_count': admissionCount,
        }),
      ),
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
    final res = await _send(
      http.get(
        Uri.parse('$apiBase/activities/$activityId/feed'),
        headers: _headers,
      ),
    );
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

  Future<void> _storeUser(Map<String, dynamic> user) async {
    userName = user['name'] as String? ?? 'Scanner';
    userEmail = user['email'] as String? ?? '';
    userRole = user['role'] as String? ?? 'staff';

    final prefs = await SharedPreferences.getInstance();
    if (_token != null) await prefs.setString(_tokenKey, _token!);
    await prefs.setString(_nameKey, userName!);
    await prefs.setString(_emailKey, userEmail!);
    await prefs.setString(_roleKey, userRole!);
  }
}

/// Single shared client instance.
final api = ApiClient();
