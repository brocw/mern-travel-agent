import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

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

Future<String?> login(String email, String password) async {
  final response = await http.post(
    Uri.parse('http://cop-4331-22.com:5000/api/login'),
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
    Uri.parse('http://cop-4331-22.com:5000/api/register'),
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
  await prefs.setString('auth_token', token);
}

Future<String?> getToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString('auth_token');
}

Future<void> logout() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('auth_token');
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
    Uri.parse('http://cop-4331-22.com:5000/api/$endpoint'),
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

Future<Map<String, dynamic>> createTrip(String userId, String location) async {
  return await postProtectedAndRefreshToken('createTrip', {'userId': userId.trim(), 'location': location.trim()});
}

Future<Map<String, dynamic>> getTrips(String userId) async {
  return await postProtectedAndRefreshToken('getTrips', {'userId': userId.trim()});
}

Future<Map<String, dynamic>> addToTrip(
  String userId,
  String tripId,
  Map<String, dynamic> item,
) async {
  return await postProtectedAndRefreshToken('addToTrip', {
    'userId': userId.trim(),
    'tripId': tripId.trim(),
    'item': item,
  });
}

Future<Map<String, dynamic>> removeFromTrip(String userId, String tripId, int itemIndex) async {
  return await postProtectedAndRefreshToken('removeFromTrip', {'userId': userId.trim(), 'tripId': tripId.trim(), 'itemIndex': itemIndex});
}

Future<Map<String, dynamic>> deleteTrip(String userId, String tripId) async {
  return await postProtectedAndRefreshToken('deleteTrip', {'userId': userId.trim(), 'tripId': tripId.trim()});
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