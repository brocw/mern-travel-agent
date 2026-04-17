import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

const String _authTokenKey = 'auth_token';
const String _authUserIdKey = 'auth_user_id';
const String _authFirstNameKey = 'auth_first_name';
const String _authLastNameKey = 'auth_last_name';

const String _apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://cop-4331-22.com:5000',
);

// Helper function to construct API URIs
Uri _apiUri(String endpoint) {
  final String trimmedBase = _apiBaseUrl.endsWith('/')
      ? _apiBaseUrl.substring(0, _apiBaseUrl.length - 1)
      : _apiBaseUrl;
  final String normalizedEndpoint = endpoint.startsWith('/')
      ? endpoint.substring(1)
      : endpoint;
  return Uri.parse('$trimmedBase/api/$normalizedEndpoint');
}

class AuthExpiredException implements Exception {
  final String message;

  AuthExpiredException([this.message = 'Your session expired. Please log in again.']);

  @override
  String toString() => message;
}

bool _isJwtExpiredError(String error) {
  final normalized = error.toLowerCase();
  return normalized.contains('jwt') &&
      (normalized.contains('not longer valid') || normalized.contains('no longer valid'));
}

Map<String, dynamic>? _decodeJwtPayload(String token) {
  final List<String> parts = token.split('.');
  if (parts.length != 3) {
    return null;
  }

  final String payload = parts[1];
  final String normalized = base64Url.normalize(payload);
  try {
    final String decoded = utf8.decode(base64Url.decode(normalized));
    final dynamic parsed = jsonDecode(decoded);
    if (parsed is Map<String, dynamic>) {
      return parsed;
    }
  } catch (_) {
    return null;
  }

  return null;
}

Future<void> _persistIdentityFromToken(
  SharedPreferences prefs,
  String token,
) async {
  final Map<String, dynamic>? payload = _decodeJwtPayload(token);
  final dynamic rawUserId = payload?['userId'];
  final int? userId = rawUserId is int
      ? rawUserId
      : int.tryParse(rawUserId?.toString() ?? '');

  if (userId == null) {
    throw Exception('Token missing userId claim.');
  }

  final String firstName = payload?['firstName']?.toString() ?? '';
  final String lastName = payload?['lastName']?.toString() ?? '';

  // Temporary verification log for Step 3: confirms JWT claim decoding on device.
  debugPrint(
    'JWT identity decoded -> userId: $userId, firstName: $firstName, lastName: $lastName',
  );

  await prefs.setInt(_authUserIdKey, userId);
  if (firstName.isNotEmpty) {
    await prefs.setString(_authFirstNameKey, firstName);
  } else {
    await prefs.remove(_authFirstNameKey);
  }

  if (lastName.isNotEmpty) {
    await prefs.setString(_authLastNameKey, lastName);
  } else {
    await prefs.remove(_authLastNameKey);
  }
}

Future<String?> login(String email, String password) async {
  final response = await http.post(
    _apiUri('login'),
    headers: <String, String>{
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json',
    },
    body: jsonEncode(<String, String>{
      'login': email.trim(),
      'password': password,
    }),
  );

  if (response.statusCode != 200 && response.statusCode != 201) {
    throw Exception('Failed to login: ${response.statusCode}');
  }

  final decodedBody = jsonDecode(response.body);
  if (decodedBody is! Map<String, dynamic>) {
    throw Exception('Unexpected login response format');
  }

  final String? backendError = decodedBody['error'] as String?;
  if (backendError != null && backendError.isNotEmpty) {
    throw Exception(backendError);
  }

  final token = decodedBody['token'] ??
      decodedBody['accessToken'] ??
      decodedBody['access_token'];

  if (token is! String || token.isEmpty) {
    throw Exception('Login response did not include a token');
  }

  return token;

}

Future<void> register(String firstName, String lastName, String login, String email, String password) async {
  final response = await http.post(
    _apiUri('register'),
    headers: <String, String>{
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json',
    },
    body: jsonEncode(<String, String>{
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'login': login.trim(),
      'email': email.trim(),
      'password': password,
    }),
  );

  if (response.statusCode != 200 && response.statusCode != 201) {
    throw Exception('Failed to register: ${response.statusCode}');
  }

  final decodedBody = jsonDecode(response.body);
  if (decodedBody is! Map<String, dynamic>) {
    throw Exception('Unexpected register response format');
  }

  final String? backendError = decodedBody['error'] as String?;
  if (backendError != null && backendError.isNotEmpty) {
    throw Exception(backendError);
  }
}

Future<void> saveToken(String token) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_authTokenKey, token);
  await _persistIdentityFromToken(prefs, token);
}

Future<String?> getToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_authTokenKey);
}

Future<String?> getCurrentUserId() async {
  final prefs = await SharedPreferences.getInstance();
  final int? userId = prefs.getInt(_authUserIdKey);
  return userId?.toString();
}

Future<String?> getCurrentFirstName() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_authFirstNameKey);
}

Future<String?> getCurrentLastName() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_authLastNameKey);
}

Future<void> logout() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove(_authTokenKey);
  await prefs.remove(_authUserIdKey);
  await prefs.remove(_authFirstNameKey);
  await prefs.remove(_authLastNameKey);
}

// Helper function to post to protected endpoints and refresh the token if needed
Future<Map<String, dynamic>> postProtectedAndRefreshToken(String endpoint, Map<String, dynamic> body) async{
  final token = await getToken();
  if (token == null) {
    throw Exception('No auth token found, please log in again.');
  }
  
  final payload = <String, dynamic>{
    ...body,
    'jwtToken': token,
  };

  final response = await http.post(
    _apiUri(endpoint),
    headers: <String, String>{
      'Content-Type': 'application/json; charset=UTF-8',
      'Accept': 'application/json',
    },
    body: jsonEncode(payload),
  );

  if (response.statusCode != 200 && response.statusCode != 201) {
    throw Exception('Failed to post to $endpoint: ${response.statusCode}');
  }
  
  final decodedBody = jsonDecode(response.body) as Map<String, dynamic>;
  final refreshed = decodedBody['jwtToken'];
  if (refreshed is String && refreshed.isNotEmpty) {
    await saveToken(refreshed);
  }

  final err = decodedBody['error'];
  if (err is String && err.isNotEmpty) {
    if (_isJwtExpiredError(err)) {
      throw AuthExpiredException(err);
    }
    throw Exception(err);
  }

  return decodedBody;
}

Future<Map<String, dynamic>> searchLocation(String query) async {
  return await postProtectedAndRefreshToken(
    'searchLocation',
    {'search': query.trim()},
  );
}

Future<Map<String, dynamic>> getPlaces(double lat, double lng, {String type = 'all'}) async {
  return await postProtectedAndRefreshToken('getPlaces', {'lat': lat,'lng': lng,'type': type});
}

Future<Map<String, dynamic>> getEvents(String location, String startDate, String endDate) async {
  return await postProtectedAndRefreshToken('getEvents',{'location': location.trim(), 'startDate': startDate, 'endDate': endDate});
}

Future<Map<String, dynamic>> createTrip(int userId, String location) async {
  return await postProtectedAndRefreshToken('createTrip', {'userId': userId, 'location': location.trim()});
}

Future<Map<String, dynamic>> getTrips(int userId) async {
  return await postProtectedAndRefreshToken('getTrips', {'userId': userId});
}

Future<Map<String, dynamic>> addToTrip(
  int userId,
  String tripId,
  Map<String, dynamic> item,
) async {
  return await postProtectedAndRefreshToken('addToTrip', {
    'userId': userId,
    'tripId': tripId.trim(),
    'item': item,
  });
}

Future<Map<String, dynamic>> removeFromTrip(int userId, String tripId, int itemIndex) async {
  return await postProtectedAndRefreshToken('removeFromTrip', {'userId': userId, 'tripId': tripId.trim(), 'itemIndex': itemIndex});
}

Future<Map<String, dynamic>> deleteTrip(int userId, String tripId) async {
  return await postProtectedAndRefreshToken('deleteTrip', {'userId': userId, 'tripId': tripId.trim()});
}

Future<Map<String, dynamic>> searchFlights(String departureId,String arrivalId,String outboundDate, {String returnDate = '', String tripType = '1', int adults = 1, String travelClass = '1', String departureToken = '', String bookingToken = ''}) async {
  final payload = <String, dynamic>{'departureId': departureId.trim(), 'arrivalId': arrivalId.trim(), 'outboundDate': outboundDate.trim(), 'tripType': tripType, 'adults': adults, 'travelClass': travelClass};

  if (returnDate.trim().isNotEmpty) {
    payload['returnDate'] = returnDate.trim();
  }
  if (departureToken.trim().isNotEmpty) {
    payload['departureToken'] = departureToken.trim();
  }
  if (bookingToken.trim().isNotEmpty) {
    payload['bookingToken'] = bookingToken.trim();
  }

  return await postProtectedAndRefreshToken('searchFlights', payload);
}