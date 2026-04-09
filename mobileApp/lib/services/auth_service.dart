import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

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

Future<String?> register(String firstName, String lastName, String login, String email, String password) async {
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

  final token = decodedBody['token'] ??
      decodedBody['accessToken'] ??
      decodedBody['access_token'];

  if (token is! String || token.isEmpty) {
    throw Exception('Register response did not include a token');
  }

  return token;
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