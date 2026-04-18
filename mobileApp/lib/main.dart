import 'package:flutter/material.dart';
import './services/auth_service.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  final GlobalKey<NavigatorState> _appNavigatorKey =
      GlobalKey<NavigatorState>();

  // Global app palette used across the mobile UI.
  static const _beige = Color(0xFFF9F6F1);
  static const _oceanBlue = Color(0xFF2196A6);
  static const _sunsetOrange = Color(0xFFF4845F);

  // Local auth gate for switching between the login screen and the app shell.
  bool _isLoggedIn = false;
  bool _isAuthBootstrapping = true;
  int? _currentUserId;
  String? _registrationNotice;

  @override
  void initState() {
    super.initState();
    _bootstrapAuthState();
  }

  Future<void> _bootstrapAuthState() async {
    try {
      final String? token = await getToken();
      final String? userIdValue = await getCurrentUserId();
      final int? userId = userIdValue == null
          ? null
          : int.tryParse(userIdValue);
      if (!mounted) {
        return;
      }

      setState(() {
        _currentUserId = userId;
        _isLoggedIn = token != null && token.isNotEmpty && userId != null;
        _isAuthBootstrapping = false;
        if (!_isLoggedIn) {
          _trips.clear();
          _activeTripIndex = null;
        }
      });

      // Fetch trips from backend if user is logged in
      if (_isLoggedIn && userId != null) {
        await _fetchTripsFromBackend(userId);
      }
    } catch (_) {
      if (!mounted) {
        return;
      }

      setState(() {
        _isLoggedIn = false;
        _currentUserId = null;
        _isAuthBootstrapping = false;
        _trips.clear();
        _activeTripIndex = null;
      });
    }
  }

  Future<void> _fetchTripsFromBackend(int userId) async {
    try {
      final String? previouslySelectedTripId =
          (_activeTripIndex != null &&
              _activeTripIndex! >= 0 &&
              _activeTripIndex! < _trips.length)
          ? _trips[_activeTripIndex!].id
          : null;

      final response = await getTrips(userId);
      if (!mounted) {
        return;
      }

      // Check for errors in the response
      if (response['error'] != null &&
          response['error'].toString().isNotEmpty) {
        print('Error fetching trips: ${response['error']}');
        return;
      }

      // Parse trips array from response
      final List<dynamic> tripsData = response['trips'] ?? [];
      final List<Trip> fetchedTrips = <Trip>[];

      final List<Future<Trip?>> tripFutures = tripsData.map<Future<Trip?>>((
        dynamic tripData,
      ) async {
        try {
          final String tripLocation =
              tripData['Location']?.toString() ?? 'Unknown Location';

          // Web app stores trip items as Items[].{ type, data }, where data has name/address/etc.
          final List<dynamic> items = tripData['Items'] is List
              ? tripData['Items'] as List<dynamic>
              : <dynamic>[];
          final List<String> itemNames = <String>[];
          final String imageUrl = await _resolveTripPreviewImage(tripLocation);
          String flightInfo = '';
          String hotelAddress = '';

          for (final dynamic item in items) {
            if (item is! Map) {
              continue;
            }

            final String itemType = item['type']?.toString() ?? '';
            final dynamic data = item['data'];
            if (data is! Map) {
              continue;
            }

            final String? name = data['name']?.toString();
            if (name != null && name.isNotEmpty) {
              itemNames.add(name);
            }

            if (itemType == 'flight' &&
                flightInfo.isEmpty &&
                name != null &&
                name.isNotEmpty) {
              flightInfo = name;
            }

            if (itemType == 'hotel' && hotelAddress.isEmpty) {
              final String? address = data['address']?.toString();
              if (address != null && address.isNotEmpty) {
                hotelAddress = address;
              }
            }
          }

          String formattedDates = 'No dates set';
          final String? createdAt = tripData['CreatedAt']?.toString();
          if (createdAt != null && createdAt.isNotEmpty) {
            formattedDates = createdAt.contains('T')
                ? 'Created: ${createdAt.split('T').first}'
                : 'Created: $createdAt';
          }

          return Trip(
            id: tripData['_id']?.toString() ?? 'unknown',
            destination: tripLocation,
            location: tripLocation,
            dates: formattedDates,
            image: imageUrl,
            estimatedBudget: 0.0,
            flightInfo: flightInfo,
            hotelAddress: hotelAddress,
            reservations: itemNames.isNotEmpty
                ? itemNames
                : <String>['No items added yet'],
            backendItems: items,
          );
        } catch (e) {
          print('Error parsing trip: $e');
          return null;
        }
      }).toList();

      for (final Trip? trip in await Future.wait(tripFutures)) {
        if (trip != null) {
          fetchedTrips.add(trip);
        }
      }

      setState(() {
        _trips.clear();
        _trips.addAll(fetchedTrips);

        if (previouslySelectedTripId == null) {
          _activeTripIndex = null;
        } else {
          final int restoredIndex = _trips.indexWhere(
            (Trip trip) => trip.id == previouslySelectedTripId,
          );
          _activeTripIndex = restoredIndex == -1 ? null : restoredIndex;
        }
      });
      print('Loaded ${fetchedTrips.length} trips from backend');

      if (_activeTripIndex != null &&
          _activeTripIndex! >= 0 &&
          _activeTripIndex! < _trips.length) {
        await _loadExplorePlacesForLocation(_activeTrip.location);
      } else if (mounted) {
        setState(() {
          _exploreLoading = false;
          _exploreError = null;
          _exploreLocationLabel = null;
          _explorePlaces = <ExplorePlaceResult>[];
        });
      }
    } catch (e) {
      print('Exception fetching trips: $e');
    }
  }

  Future<String> _resolveTripPreviewImage(String location) async {
    final String cacheKey = location.trim().toLowerCase();
    final String? cachedImage = _tripPreviewImageCache[cacheKey];
    if (cachedImage != null && cachedImage.isNotEmpty) {
      return cachedImage;
    }

    try {
      final Map<String, dynamic> geocodedLocation = await searchLocation(
        location,
      );
      final double lat = (geocodedLocation['lat'] as num).toDouble();
      final double lng = (geocodedLocation['lng'] as num).toDouble();
      final Map<String, dynamic> placesResponse = await getPlaces(lat, lng);
      final List<dynamic> rawPlaces =
          (placesResponse['places'] as List<dynamic>?) ?? <dynamic>[];

      for (final dynamic rawPlace in rawPlaces) {
        if (rawPlace is! Map) {
          continue;
        }

        final dynamic rawImage = rawPlace['image'];
        final String image = rawImage?.toString() ?? '';
        if (image.isNotEmpty) {
          _tripPreviewImageCache[cacheKey] = image;
          return image;
        }
      }
    } catch (e) {
      debugPrint('Failed to resolve preview image for $location: $e');
    }

    return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
  }

  // Live explore state backed by the searchLocation/getPlaces/getEvents API flow.
  bool _exploreLoading = false;
  String? _exploreError;
  String? _exploreLocationLabel;
  List<ExplorePlaceResult> _explorePlaces = <ExplorePlaceResult>[];

  // Navigation and shared trip state for the entire app.
  int _selectedTab = 0;
  int? _activeTripIndex;
  String _landingQuery = '';
  String _selectedExploreCategory = 'places';
  final Set<String> _savedTrips = <String>{'trip-1', 'trip-3'};
  final Set<String> _addedDestinationIds = <String>{};

  // Trips are now loaded from backend via _fetchTripsFromBackend()
  final List<Trip> _trips = <Trip>[];
  final Map<String, String> _tripPreviewImageCache = <String, String>{};

  final List<ItineraryDay> _itinerary = <ItineraryDay>[
    ItineraryDay(
      id: 'day-1',
      label: 'Day 1 - Arrival',
      date: 'Mar 15',
      activities: <PlannedActivity>[
        PlannedActivity(
          id: 'a1',
          title: 'Flight to Male',
          time: '08:00',
          category: ActivityCategory.flight,
          cost: 850,
        ),
        PlannedActivity(
          id: 'a2',
          title: 'Hotel check-in',
          time: '22:30',
          category: ActivityCategory.hotel,
          cost: 120,
        ),
      ],
    ),
    ItineraryDay(
      id: 'day-2',
      label: 'Day 2 - Island Exploration',
      date: 'Mar 16',
      activities: <PlannedActivity>[
        PlannedActivity(
          id: 'b1',
          title: 'Sunrise beach yoga',
          time: '07:00',
          category: ActivityCategory.activity,
          cost: 0,
        ),
        PlannedActivity(
          id: 'b2',
          title: 'Coral reef snorkeling',
          time: '11:00',
          category: ActivityCategory.activity,
          cost: 120,
        ),
        PlannedActivity(
          id: 'b3',
          title: 'Sunset dinner cruise',
          time: '19:00',
          category: ActivityCategory.food,
          cost: 180,
        ),
      ],
    ),
    ItineraryDay(
      id: 'day-3',
      label: 'Day 3 - Relaxation',
      date: 'Mar 17',
      activities: <PlannedActivity>[
        PlannedActivity(
          id: 'c1',
          title: 'Spa session',
          time: '09:00',
          category: ActivityCategory.activity,
          cost: 200,
        ),
      ],
    ),
  ];

  Trip get _activeTrip {
    // Return a placeholder trip if no trips exist yet
    if (_trips.isEmpty ||
        _activeTripIndex == null ||
        _activeTripIndex! < 0 ||
        _activeTripIndex! >= _trips.length) {
      return Trip(
        id: 'placeholder',
        destination: 'No Trip Selected',
        location: 'Select a trip from Dashboard to start exploring',
        dates: 'No dates',
        image:
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
        estimatedBudget: 0,
        flightInfo: '',
        hotelAddress: '',
        reservations: const <String>[],
      );
    }
    return _trips[_activeTripIndex!];
  }

  void _goToTab(int index) {
    // Bottom navigation and CTA buttons route through this single tab switcher.
    setState(() {
      _selectedTab = index;
    });
  }

  void _showGlobalSnackBar(String message) {
    final BuildContext? currentContext = _appNavigatorKey.currentContext;
    if (currentContext == null) {
      debugPrint(
        'Unable to show snackbar: navigator context unavailable. Message: $message',
      );
      return;
    }

    final messenger = ScaffoldMessenger.maybeOf(currentContext);
    if (messenger == null) {
      debugPrint(
        'Unable to show snackbar: ScaffoldMessenger unavailable. Message: $message',
      );
      return;
    }

    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(SnackBar(content: Text(message)));
  }

  void _register(
    String firstName,
    String lastName,
    String login,
    String email,
    String password,
  ) async {
    try {
      await register(firstName, lastName, login, email, password);
      if (!mounted) return;
      setState(() {
        _registrationNotice =
            'Account created for $email. Check your email and click the verification button before logging in.';
      });
    } catch (e) {
      // IMPORTANT NOTE: In a production app, you should surface authentication errors to the user and not just print them.
      print('Authentication error: $e');
    }
  }

  void _signIn(String username, String password) async {
    try {
      String? token;

      token = await login(username, password);
      if (token == null || token.isEmpty) {
        throw Exception('Login did not return a valid auth token.');
      }

      await saveToken(token);
      final String? userIdValue = await getCurrentUserId();
      final int? userId = userIdValue == null
          ? null
          : int.tryParse(userIdValue);
      if (userId == null) {
        throw Exception('Token did not include a valid user identity.');
      }
      if (!mounted) return;

      setState(() {
        _currentUserId = userId;
        _isLoggedIn = true;
        _registrationNotice = null;
        _selectedTab = 0;
        _trips.clear();
        _activeTripIndex = null;
      });

      await _fetchTripsFromBackend(userId);
    } catch (e) {
      debugPrint('Sign in failed: $e');
      if (!mounted) return;
      _showGlobalSnackBar('Sign in failed: $e');
    }
  }

  Future<void> _signOut() async {
    await logout();
    setState(() {
      _isLoggedIn = false;
      _currentUserId = null;
      _selectedTab = 0;
      _trips.clear();
      _activeTripIndex = null;
    });
  }

  Future<bool> _handleSessionExpired(Object error) async {
    if (error is! AuthExpiredException) {
      return false;
    }

    await logout();
    if (!mounted) {
      return true;
    }

    setState(() {
      _isLoggedIn = false;
      _currentUserId = null;
      _selectedTab = 0;
      _exploreLoading = false;
      _exploreError = null;
      _explorePlaces = <ExplorePlaceResult>[];
      _exploreLocationLabel = null;
      _trips.clear();
      _activeTripIndex = null;
    });

    _showGlobalSnackBar('Session expired. Please log in again.');

    return true;
  }

  Future<void> _confirmSignOut() async {
    final BuildContext? dialogHostContext = _appNavigatorKey.currentContext;
    if (dialogHostContext == null) {
      return;
    }

    final bool? shouldSignOut = await showDialog<bool>(
      context: dialogHostContext,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Log Out'),
          content: const Text('Are you sure you want to log out?'),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Log Out'),
            ),
          ],
        );
      },
    );

    if (shouldSignOut == true) {
      await _signOut();
    }
  }

  // Explore uses a single active category tab to mirror the website UX.
  void _selectExploreCategory(String categoryId) {
    if (_selectedExploreCategory == categoryId) {
      return;
    }

    setState(() {
      _selectedExploreCategory = categoryId;
    });
  }

  void _toggleSaveTrip(String tripId) {
    // Toggles the saved bookmark state on dashboard cards.
    setState(() {
      if (_savedTrips.contains(tripId)) {
        _savedTrips.remove(tripId);
      } else {
        _savedTrips.add(tripId);
      }
    });
  }

  Future<void> _loadExplorePlacesForLocation(String searchTerm) async {
    final String normalizedLocation = searchTerm.trim();
    if (normalizedLocation.isEmpty) {
      setState(() {
        _exploreError = 'Enter a city or destination to load places.';
        _explorePlaces = <ExplorePlaceResult>[];
        _exploreLocationLabel = null;
      });
      return;
    }

    setState(() {
      _exploreLoading = true;
      _exploreError = null;
      _exploreLocationLabel = null;
    });

    try {
      final Map<String, dynamic> location = await searchLocation(
        normalizedLocation,
      );
      final double lat = (location['lat'] as num).toDouble();
      final double lng = (location['lng'] as num).toDouble();
      final String resolvedLocation =
          location['name']?.toString() ?? normalizedLocation;

      final List<dynamic> responses =
          await Future.wait<dynamic>(<Future<dynamic>>[
            getPlaces(lat, lng, type: 'all'),
            getPlaces(lat, lng, type: 'lodging'),
            getEvents(resolvedLocation, '', ''),
          ]);

      final Map<String, dynamic> allPlacesResponse =
          responses[0] as Map<String, dynamic>;
      final Map<String, dynamic> hotelsResponse =
          responses[1] as Map<String, dynamic>;
      final Map<String, dynamic> eventsResponse =
          responses[2] as Map<String, dynamic>;

      final List<dynamic> rawAllPlaces =
          (allPlacesResponse['places'] as List<dynamic>?) ?? <dynamic>[];
      final List<dynamic> rawHotels =
          (hotelsResponse['places'] as List<dynamic>?) ?? <dynamic>[];
      final List<dynamic> rawEvents =
          (eventsResponse['events'] as List<dynamic>?) ?? <dynamic>[];

      final Map<String, ExplorePlaceResult> mergedById =
          <String, ExplorePlaceResult>{};

      void addPlaceResult(dynamic raw, {String? forcedType}) {
        if (raw is! Map) {
          return;
        }

        final Map<String, dynamic> placeMap = Map<String, dynamic>.from(raw);
        final String generatedId =
            placeMap['placeId']?.toString() ??
            '${placeMap['name']?.toString() ?? 'place'}-${placeMap['address']?.toString() ?? resolvedLocation}-${forcedType ?? placeMap['type']?.toString() ?? 'place'}';
        if (generatedId.trim().isEmpty) {
          return;
        }

        mergedById[generatedId] = ExplorePlaceResult(
          id: generatedId,
          name: placeMap['name']?.toString() ?? 'Unknown place',
          location: placeMap['address']?.toString() ?? resolvedLocation,
          image: placeMap['image']?.toString() ?? '',
          rating: (placeMap['rating'] as num?)?.toDouble(),
          type: forcedType ?? placeMap['type']?.toString() ?? 'place',
          lat: (placeMap['lat'] as num?)?.toDouble(),
          lng: (placeMap['lng'] as num?)?.toDouble(),
          address: placeMap['address']?.toString(),
          date: placeMap['date']?.toString(),
          venue: placeMap['venue']?.toString(),
          ticketUrl: placeMap['ticketUrl']?.toString(),
        );
      }

      void addEventResult(dynamic raw) {
        if (raw is! Map) {
          return;
        }

        final Map<String, dynamic> eventMap = Map<String, dynamic>.from(raw);

        String resolveEventImage(Map<String, dynamic> source) {
          final dynamic directImage = source['image'];
          if (directImage is String && directImage.trim().isNotEmpty) {
            return directImage.trim();
          }
          if (directImage is Map) {
            final dynamic directImageUrl = directImage['url'];
            if (directImageUrl is String && directImageUrl.trim().isNotEmpty) {
              return directImageUrl.trim();
            }
          }

          final dynamic rawImages = source['images'];
          if (rawImages is List) {
            for (final dynamic rawImageEntry in rawImages) {
              if (rawImageEntry is String && rawImageEntry.trim().isNotEmpty) {
                return rawImageEntry.trim();
              }
              if (rawImageEntry is Map) {
                final dynamic candidateUrl =
                    rawImageEntry['url'] ?? rawImageEntry['image'];
                if (candidateUrl is String && candidateUrl.trim().isNotEmpty) {
                  return candidateUrl.trim();
                }
              }
            }
          }

          return '';
        }

        final String name = eventMap['name']?.toString() ?? 'Unknown event';
        final String date = eventMap['date']?.toString() ?? '';
        final String venue = eventMap['venue']?.toString() ?? resolvedLocation;
        final String generatedId =
            eventMap['id']?.toString() ?? '$name-$date-$venue-event';
        final String resolvedImage = resolveEventImage(eventMap);
        if (generatedId.trim().isEmpty) {
          return;
        }

        mergedById[generatedId] = ExplorePlaceResult(
          id: generatedId,
          name: name,
          location: venue,
          image: resolvedImage,
          type: 'event',
          date: date.isEmpty ? null : date,
          venue: venue,
          ticketUrl:
              eventMap['ticketUrl']?.toString() ?? eventMap['url']?.toString(),
        );
      }

      for (final dynamic rawPlace in rawAllPlaces) {
        addPlaceResult(rawPlace);
      }
      for (final dynamic rawHotel in rawHotels) {
        addPlaceResult(rawHotel, forcedType: 'lodging');
      }
      for (final dynamic rawEvent in rawEvents) {
        addEventResult(rawEvent);
      }

      final List<ExplorePlaceResult> places = mergedById.values.toList();

      final List<String> responseErrors = <String>[];
      final String? allPlacesError = allPlacesResponse['error']?.toString();
      final String? hotelsError = hotelsResponse['error']?.toString();
      final String? eventsError = eventsResponse['error']?.toString();
      if (allPlacesError != null && allPlacesError.trim().isNotEmpty) {
        responseErrors.add(allPlacesError);
      }
      if (hotelsError != null && hotelsError.trim().isNotEmpty) {
        responseErrors.add(hotelsError);
      }
      if (eventsError != null && eventsError.trim().isNotEmpty) {
        responseErrors.add(eventsError);
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _exploreLoading = false;
        _exploreLocationLabel = resolvedLocation;
        _explorePlaces = places;
        _exploreError = places.isEmpty
            ? (responseErrors.isNotEmpty
                  ? responseErrors.join(' | ')
                  : 'No places, hotels, or events found for this location.')
            : null;
      });
    } catch (e) {
      final bool handled = await _handleSessionExpired(e);
      if (handled) {
        return;
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _exploreLoading = false;
        _exploreError = e.toString();
        _explorePlaces = <ExplorePlaceResult>[];
        _exploreLocationLabel = null;
      });
    }
  }

  Future<String?> _promptForValidatedTripLocation() async {
    final BuildContext? dialogHostContext = _appNavigatorKey.currentContext;
    if (dialogHostContext == null) {
      return null;
    }

    String enteredLocation = '';
    String? dialogError;
    bool validating = false;

    final String? resolvedLocation = await showDialog<String>(
      context: dialogHostContext,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setDialogState) {
            Future<void> validateAndReturnLocation() async {
              final String normalizedLocation = enteredLocation.trim();
              if (normalizedLocation.isEmpty) {
                setDialogState(() {
                  dialogError = 'Enter a valid location.';
                });
                return;
              }

              setDialogState(() {
                dialogError = null;
                validating = true;
              });

              try {
                final Map<String, dynamic> location = await searchLocation(
                  normalizedLocation,
                );
                final String resolved =
                    location['name']?.toString() ?? normalizedLocation;
                if (resolved.trim().isEmpty) {
                  setDialogState(() {
                    dialogError = 'That location could not be verified.';
                    validating = false;
                  });
                  return;
                }

                if (!mounted) {
                  return;
                }

                Navigator.of(dialogContext).pop(resolved);
              } catch (e) {
                final bool handled = await _handleSessionExpired(e);
                if (handled) {
                  Navigator.of(dialogContext).pop();
                  return;
                }

                if (!mounted) {
                  return;
                }

                setDialogState(() {
                  dialogError = 'Enter a valid location.';
                  validating = false;
                });
              }
            }

            return AlertDialog(
              title: const Text('Create New Trip'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text('Enter a valid trip location to continue.'),
                  const SizedBox(height: 12),
                  TextField(
                    autofocus: true,
                    enabled: !validating,
                    decoration: InputDecoration(
                      hintText: 'Enter destination location',
                      border: const OutlineInputBorder(),
                      errorText: dialogError,
                    ),
                    onChanged: (String value) {
                      enteredLocation = value;
                    },
                    onSubmitted: (_) {
                      if (!validating) {
                        validateAndReturnLocation();
                      }
                    },
                  ),
                ],
              ),
              actions: <Widget>[
                TextButton(
                  onPressed: validating
                      ? null
                      : () => Navigator.pop(dialogContext),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: validating ? null : validateAndReturnLocation,
                  child: Text(validating ? 'Checking...' : 'Create'),
                ),
              ],
            );
          },
        );
      },
    );
    return resolvedLocation;
  }

  // Helper method to construct item structure for backend API from ExplorePlaceResult
  Map<String, dynamic> _buildItemStructure(ExplorePlaceResult place) {
    // Determine if this is a place or event based on available data
    final bool isEvent = place.venue != null || place.date != null;

    final Map<String, dynamic> data = <String, dynamic>{
      'name': place.name,
      'image': place.image,
    };

    if (isEvent) {
      // Event structure
      data['date'] = place.date ?? '';
      data['venue'] = place.venue ?? place.location;
      data['ticketUrl'] = place.ticketUrl ?? '#';
    } else {
      // Place structure
      data['address'] = place.address ?? place.location;
      if (place.rating != null) {
        data['rating'] = place.rating;
      }
      data['type'] = place.type;
      if (place.lat != null) {
        data['lat'] = place.lat;
      }
      if (place.lng != null) {
        data['lng'] = place.lng;
      }
      data['placeId'] = place.id;
    }

    return <String, dynamic>{'type': isEvent ? 'event' : 'place', 'data': data};
  }

  void _toggleAddDestination(ExplorePlaceResult destination) async {
    // Adding/removing a destination to/from the backend trip
    final int? userId = _currentUserId;
    final String tripId = _activeTrip.id;

    // Check if already added
    if (_addedDestinationIds.contains(destination.id)) {
      // Remove from backend
      if (userId == null || tripId == 'placeholder') {
        // Local placeholder trip, just update UI
        setState(() {
          _addedDestinationIds.remove(destination.id);
          _itinerary[1].activities.removeWhere(
            (PlannedActivity activity) =>
                activity.id == 'added-${destination.id}',
          );
        });
        return;
      }

      try {
        _showGlobalSnackBar('Removing destination from trip...');

        // Find the item index in the backend trip by matching placeId
        int itemIndex = -1;
        if (_activeTrip.backendItems != null) {
          for (int i = 0; i < _activeTrip.backendItems!.length; i++) {
            final dynamic item = _activeTrip.backendItems![i];
            if (item is Map) {
              final dynamic data = item['data'];
              if (data is Map) {
                // Check if this item matches by placeId (for places) or name (for events)
                final String? placeId = data['placeId']?.toString();
                if (placeId == destination.id) {
                  itemIndex = i;
                  break;
                }
              }
            }
          }
        }

        if (itemIndex == -1) {
          _showGlobalSnackBar('Could not find destination in trip');
          return;
        }

        // Call backend to remove the item
        final response = await removeFromTrip(userId, tripId, itemIndex);

        if (!mounted) {
          return;
        }

        // Check for errors in response
        if (response['error'] != null &&
            response['error'].toString().isNotEmpty) {
          _showGlobalSnackBar(
            'Error removing destination: ${response['error']}',
          );
          return;
        }

        // Update local state
        setState(() {
          _addedDestinationIds.remove(destination.id);
          _itinerary[1].activities.removeWhere(
            (PlannedActivity activity) =>
                activity.id == 'added-${destination.id}',
          );
        });

        // Refresh trip from backend to get latest state
        await _fetchTripsFromBackend(userId);
        _showGlobalSnackBar('Destination removed!');
      } catch (e) {
        final bool handled = await _handleSessionExpired(e);
        if (handled) {
          return;
        }
        _showGlobalSnackBar('Error removing destination: $e');
      }
      return;
    }

    // Add to backend
    if (userId == null) {
      _showGlobalSnackBar('Please log in before adding destinations.');
      return;
    }

    if (tripId == 'placeholder') {
      _showGlobalSnackBar('Please create a trip first.');
      return;
    }

    try {
      _showGlobalSnackBar('Adding destination to trip...');

      final Map<String, dynamic> item = _buildItemStructure(destination);
      final response = await addToTrip(userId, tripId, item);

      if (!mounted) {
        return;
      }

      // Check for errors in response
      if (response['error'] != null &&
          response['error'].toString().isNotEmpty) {
        _showGlobalSnackBar('Error adding destination: ${response['error']}');
        return;
      }

      // Update local state and itinerary
      setState(() {
        _addedDestinationIds.add(destination.id);
        _itinerary[1].activities.add(
          PlannedActivity(
            id: 'added-${destination.id}',
            title: destination.name,
            time: '13:30',
            category: ActivityCategory.activity,
            cost: 0,
          ),
        );
      });

      // Refresh trip from backend to stay in sync
      await _fetchTripsFromBackend(userId);
      _showGlobalSnackBar('Destination added successfully!');
    } catch (e) {
      final bool handled = await _handleSessionExpired(e);
      if (handled) {
        return;
      }

      if (!mounted) {
        return;
      }

      _showGlobalSnackBar('Failed to add destination: $e');
    }
  }

  Future<void> _createNewTrip() async {
    final BuildContext? dialogHostContext = _appNavigatorKey.currentContext;
    if (dialogHostContext == null) {
      return;
    }

    final int? userId = _currentUserId;
    if (userId == null) {
      _showGlobalSnackBar('Please log in before creating a trip.');
      return;
    }

    final String? location = await _promptForValidatedTripLocation();
    if (location == null || location.trim().isEmpty) {
      return; // User cancelled or entered empty location
    }

    try {
      // Call backend createTrip endpoint
      final response = await createTrip(userId, location.trim());

      if (!mounted) {
        return;
      }

      // Check for errors in response
      if (response['error'] != null &&
          response['error'].toString().isNotEmpty) {
        _showGlobalSnackBar('Error creating trip: ${response['error']}');
        return;
      }

      // Trip created successfully, reload the trips list from backend
      await _fetchTripsFromBackend(userId);

      if (!mounted) {
        return;
      }

      // Set the newly created trip as active
      setState(() {
        _selectedTab = 1;
      });

      _showGlobalSnackBar(
        'Trip created successfully! Select it from the dashboard to load explore results.',
      );
    } catch (e) {
      final bool handled = await _handleSessionExpired(e);
      if (handled) {
        return;
      }

      if (!mounted) {
        return;
      }

      _showGlobalSnackBar('Failed to create trip: $e');
    }
  }

  Future<void> _confirmDeleteTrip(Trip trip) async {
    final BuildContext? dialogHostContext = _appNavigatorKey.currentContext;
    if (dialogHostContext == null) {
      return;
    }

    final bool? shouldDelete = await showDialog<bool>(
      context: dialogHostContext,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Delete Trip'),
          content: Text(
            'Are you sure you want to delete "${trip.destination}"? This cannot be undone.',
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFFB3261E),
                foregroundColor: Colors.white,
              ),
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (shouldDelete != true) {
      return;
    }

    await _deleteTripFromDashboard(trip);
  }

  Future<void> _deleteTripFromDashboard(Trip trip) async {
    final int? userId = _currentUserId;
    if (userId == null) {
      _showGlobalSnackBar('Please log in before deleting a trip.');
      return;
    }

    if (trip.id == 'placeholder') {
      _showGlobalSnackBar('No trip selected to delete.');
      return;
    }

    try {
      _showGlobalSnackBar('Deleting trip...');
      final Map<String, dynamic> response = await deleteTrip(userId, trip.id);

      if (!mounted) {
        return;
      }

      if (response['error'] != null &&
          response['error'].toString().isNotEmpty) {
        _showGlobalSnackBar('Error deleting trip: ${response['error']}');
        return;
      }

      await _fetchTripsFromBackend(userId);

      if (!mounted) {
        return;
      }

      setState(() {
        if (_trips.isEmpty) {
          _activeTripIndex = null;
          return;
        }

        if (_activeTripIndex != null && _activeTripIndex! >= _trips.length) {
          _activeTripIndex = null;
        }
      });

      _showGlobalSnackBar('Trip deleted successfully.');
    } catch (e) {
      final bool handled = await _handleSessionExpired(e);
      if (handled) {
        return;
      }

      if (!mounted) {
        return;
      }

      _showGlobalSnackBar('Failed to delete trip: $e');
    }
  }

  void _selectTripFromDashboard(Trip trip) {
    // Dashboard selection should be explicit and visible before navigating elsewhere.
    final int selectedIndex = _trips.indexWhere((Trip t) => t.id == trip.id);
    if (selectedIndex == -1) {
      return;
    }

    setState(() {
      _activeTripIndex = selectedIndex;
      _selectedTab = 2;
      _exploreLoading = true;
      _exploreError = null;
    });

    _loadExplorePlacesForLocation(trip.location);
  }

  List<ItineraryDay> _buildBackendItinerary(Trip trip) {
    final List<dynamic> backendItems = trip.backendItems ?? <dynamic>[];
    if (backendItems.isEmpty) {
      return <ItineraryDay>[];
    }

    final List<PlannedActivity> places = <PlannedActivity>[];
    final List<PlannedActivity> events = <PlannedActivity>[];
    final List<PlannedActivity> travelDetails = <PlannedActivity>[];

    for (int index = 0; index < backendItems.length; index++) {
      final dynamic item = backendItems[index];
      if (item is! Map) {
        continue;
      }

      final String itemType = item['type']?.toString() ?? 'place';
      final dynamic rawData = item['data'];
      if (rawData is! Map) {
        continue;
      }

      final Map<String, dynamic> data = Map<String, dynamic>.from(
        rawData as Map,
      );
      final String title = data['name']?.toString() ?? 'Imported item';
      final String time = _backendItemTimeLabel(itemType, data);
      final String details = _backendItemDetailLabel(itemType, data);
      final ActivityCategory category = _backendActivityCategory(itemType);

      final PlannedActivity activity = PlannedActivity(
        id: 'backend-$index-${itemType}-${data['placeId']?.toString() ?? title}',
        title: title,
        time: time,
        category: category,
        cost: 0,
        details: details,
      );

      switch (itemType) {
        case 'event':
          events.add(activity);
          break;
        case 'flight':
        case 'hotel':
          travelDetails.add(activity);
          break;
        default:
          places.add(activity);
          break;
      }
    }

    final List<ItineraryDay> days = <ItineraryDay>[];
    if (places.isNotEmpty) {
      days.add(
        ItineraryDay(
          id: 'backend-places',
          label: 'Saved Places',
          date: 'From your trip items',
          activities: places,
        ),
      );
    }
    if (events.isNotEmpty) {
      days.add(
        ItineraryDay(
          id: 'backend-events',
          label: 'Events',
          date: 'From your trip items',
          activities: events,
        ),
      );
    }
    if (travelDetails.isNotEmpty) {
      days.add(
        ItineraryDay(
          id: 'backend-travel',
          label: 'Travel Details',
          date: 'From your trip items',
          activities: travelDetails,
        ),
      );
    }

    return days;
  }

  ActivityCategory _backendActivityCategory(String itemType) {
    switch (itemType) {
      case 'flight':
        return ActivityCategory.flight;
      case 'hotel':
        return ActivityCategory.hotel;
      case 'event':
        return ActivityCategory.activity;
      default:
        return ActivityCategory.activity;
    }
  }

  String _backendItemTimeLabel(String itemType, Map<String, dynamic> data) {
    switch (itemType) {
      case 'flight':
        final String departure = data['departure_time']?.toString() ?? '';
        final String arrival = data['arrival_time']?.toString() ?? '';
        if (departure.isNotEmpty && arrival.isNotEmpty) {
          return '$departure → $arrival';
        }
        if (departure.isNotEmpty) {
          return departure;
        }
        return data['date']?.toString() ?? 'Flight';
      case 'hotel':
        return data['checkIn']?.toString() ??
            data['address']?.toString() ??
            'Hotel stay';
      case 'event':
        return data['date']?.toString() ?? 'Event';
      default:
        return data['address']?.toString() ??
            data['type']?.toString() ??
            'Saved place';
    }
  }

  String _backendItemDetailLabel(String itemType, Map<String, dynamic> data) {
    switch (itemType) {
      case 'flight':
        final String airline = data['airline']?.toString() ?? '';
        final String duration = data['duration']?.toString() ?? '';
        final List<String> parts = <String>[];
        if (airline.isNotEmpty) parts.add(airline);
        if (duration.isNotEmpty) parts.add(duration);
        return parts.join(' • ');
      case 'hotel':
        return data['address']?.toString() ?? '';
      case 'event':
        final String venue = data['venue']?.toString() ?? '';
        final String ticketUrl = data['ticketUrl']?.toString() ?? '';
        if (venue.isNotEmpty && ticketUrl.isNotEmpty) {
          return '$venue • Tickets available';
        }
        return venue.isNotEmpty ? venue : ticketUrl;
      default:
        final String rating = data['rating']?.toString() ?? '';
        final String type = data['type']?.toString() ?? '';
        final List<String> parts = <String>[];
        if (type.isNotEmpty) parts.add(type);
        if (rating.isNotEmpty) parts.add('Rating $rating');
        return parts.join(' • ');
    }
  }

  void _toggleActivityDone(String dayId, String activityId) {
    // Checkbox state for itinerary items in the planner and travel-mode views.
    setState(() {
      final int dayIndex = _itinerary.indexWhere(
        (ItineraryDay d) => d.id == dayId,
      );
      if (dayIndex == -1) {
        return;
      }
      final ItineraryDay day = _itinerary[dayIndex];
      final int activityIndex = day.activities.indexWhere(
        (PlannedActivity a) => a.id == activityId,
      );
      if (activityIndex == -1) {
        return;
      }
      day.activities[activityIndex] = day.activities[activityIndex].copyWith(
        done: !day.activities[activityIndex].done,
      );
    });
  }

  Future<void> _showAddActivitySheet(String dayId) async {
    // Bottom sheet editor for adding itinerary items to a specific day.
    final TextEditingController titleController = TextEditingController();
    final TextEditingController timeController = TextEditingController(
      text: '09:00',
    );
    final TextEditingController costController = TextEditingController(
      text: '0',
    );
    ActivityCategory selectedCategory = ActivityCategory.activity;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext bottomSheetContext) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setBottomState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 20,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text(
                    'Add Activity',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: titleController,
                    decoration: _inputDecoration('Activity name'),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: <Widget>[
                      Expanded(
                        child: TextField(
                          controller: timeController,
                          decoration: _inputDecoration('Time (HH:MM)'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          keyboardType: TextInputType.number,
                          controller: costController,
                          decoration: _inputDecoration('Cost (\$)'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: ActivityCategory.values.map((
                      ActivityCategory cat,
                    ) {
                      final bool active = selectedCategory == cat;
                      return ChoiceChip(
                        label: Text(cat.label),
                        selected: active,
                        onSelected: (_) {
                          setBottomState(() {
                            selectedCategory = cat;
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        if (titleController.text.trim().isEmpty) {
                          return;
                        }
                        setState(() {
                          final ItineraryDay day = _itinerary.firstWhere(
                            (ItineraryDay d) => d.id == dayId,
                          );
                          day.activities.add(
                            PlannedActivity(
                              id: 'manual-${DateTime.now().microsecondsSinceEpoch}',
                              title: titleController.text.trim(),
                              time: timeController.text.trim().isEmpty
                                  ? '09:00'
                                  : timeController.text.trim(),
                              category: selectedCategory,
                              cost:
                                  double.tryParse(costController.text.trim()) ??
                                  0,
                            ),
                          );
                        });
                        Navigator.of(bottomSheetContext).pop();
                      },
                      style: FilledButton.styleFrom(
                        backgroundColor: _oceanBlue,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: const Text('Add to Day'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // The app is built as a single shell with shared state and a persistent bottom nav.
    final ThemeData theme = ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: _beige,
      colorScheme: ColorScheme.fromSeed(
        seedColor: _oceanBlue,
        primary: _oceanBlue,
        secondary: _sunsetOrange,
        surface: Colors.white,
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontWeight: FontWeight.w800),
        headlineMedium: TextStyle(fontWeight: FontWeight.w800),
        titleLarge: TextStyle(fontWeight: FontWeight.w700),
      ),
    );

    return MaterialApp(
      navigatorKey: _appNavigatorKey,
      title: 'Travel Helper',
      debugShowCheckedModeBanner: false,
      theme: theme,
      home: _isAuthBootstrapping
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : _isLoggedIn
          ? Scaffold(
              appBar: AppBar(
                title: const Text('Travel Helper'),
                actions: <Widget>[
                  IconButton(
                    tooltip: 'Log Out',
                    onPressed: () {
                      _confirmSignOut();
                    },
                    icon: const Icon(Icons.logout_rounded),
                  ),
                ],
              ),
              body: SafeArea(
                child: IndexedStack(
                  index: _selectedTab,
                  children: <Widget>[
                    LandingScreen(
                      query: _landingQuery,
                      onQueryChanged: (String value) {
                        setState(() {
                          _landingQuery = value;
                        });
                      },
                      onExplore: () => _goToTab(2),
                      onStartPlanning: () => _goToTab(3),
                      onQuickFilterTap: (String filterId) {
                        _goToTab(2);
                        _selectExploreCategory('places');
                      },
                    ),
                    DashboardScreen(
                      trips: _trips,
                      activeTripId: _activeTrip.id,
                      savedTrips: _savedTrips,
                      onToggleSaveTrip: _toggleSaveTrip,
                      onCreateNewTrip: _createNewTrip,
                      onDeleteTrip: _confirmDeleteTrip,
                      onSelectTrip: _selectTripFromDashboard,
                    ),
                    ExploreScreen(
                      isLoading: _exploreLoading,
                      errorMessage: _exploreError,
                      locationLabel: _exploreLocationLabel,
                      selectedCategory: _selectedExploreCategory,
                      onSelectCategory: _selectExploreCategory,
                      places: _explorePlaces,
                      addedDestinationIds: _addedDestinationIds,
                      onToggleAddDestination: _toggleAddDestination,
                    ),
                    PlannerScreen(
                      trip: _activeTrip,
                      itinerary: _buildBackendItinerary(_activeTrip),
                      onToggleDone: _toggleActivityDone,
                      onAddActivity: _showAddActivitySheet,
                      onOpenTravelMode: () => _goToTab(4),
                    ),
                    TripDetailsScreen(
                      trip: _activeTrip,
                      itinerary: _buildBackendItinerary(_activeTrip),
                      onBackToPlanner: () => _goToTab(3),
                    ),
                  ],
                ),
              ),
              bottomNavigationBar: NavigationBar(
                selectedIndex: _selectedTab,
                onDestinationSelected: _goToTab,
                destinations: const <NavigationDestination>[
                  NavigationDestination(
                    icon: Icon(Icons.home_rounded),
                    label: 'Home',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.dashboard_rounded),
                    label: 'Dashboard',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.travel_explore_rounded),
                    label: 'Explore',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.event_note_rounded),
                    label: 'Planner',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.airplanemode_active_rounded),
                    label: 'Travel Mode',
                  ),
                ],
              ),
            )
          : LoginScreen(
              onSignIn: _signIn,
              onRegister: _register,
              registrationNotice: _registrationNotice,
              onDismissRegistrationNotice: () {
                setState(() {
                  _registrationNotice = null;
                });
              },
            ),
    );
  }

  InputDecoration _inputDecoration(String hint) {
    return InputDecoration(
      hintText: hint,
      filled: true,
      fillColor: const Color(0xFFF7F3EC),
      border: OutlineInputBorder(
        borderSide: BorderSide.none,
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }
}

// Landing hero, search, CTA buttons, and feature highlights.
class LandingScreen extends StatelessWidget {
  const LandingScreen({
    super.key,
    required this.query,
    required this.onQueryChanged,
    required this.onExplore,
    required this.onStartPlanning,
    required this.onQuickFilterTap,
  });

  final String query;
  final ValueChanged<String> onQueryChanged;
  final VoidCallback onExplore;
  final VoidCallback onStartPlanning;
  final ValueChanged<String> onQuickFilterTap;

  static const Color _oceanBlue = Color(0xFF2196A6);
  static const Color _sunsetOrange = Color(0xFFF4845F);
  static const Color _deepBlue = Color(0xFF1A2B3C);

  @override
  Widget build(BuildContext context) {
    // The landing page is a scrollable hero-first marketing entry point.
    return CustomScrollView(
      slivers: <Widget>[
        SliverToBoxAdapter(
          child: SizedBox(
            height: 480,
            child: Stack(
              fit: StackFit.expand,
              children: <Widget>[
                TravelImage(
                  'https://images.unsplash.com/photo-1653959747793-c7c3775665f0?auto=format&fit=crop&w=1200&q=80',
                  fit: BoxFit.cover,
                ),
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: <Color>[Color(0x55333A40), Color(0xCC11181F)],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 22, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Row(
                        children: const <Widget>[
                          Icon(Icons.explore_rounded, color: Colors.white),
                          SizedBox(width: 8),
                          Text(
                            'Travel Helper',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.20),
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Icon(
                              Icons.location_pin,
                              size: 18,
                              color: Color(0xFFFFD580),
                            ),
                            SizedBox(width: 6),
                            Text(
                              'Your digital travel agent',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        'Plan Your Next\nAdventure',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 38,
                          height: 1.1,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'Discover destinations, build itineraries, and travel smarter.',
                        style: TextStyle(color: Colors.white70, fontSize: 15),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        onChanged: onQueryChanged,
                        controller: TextEditingController(text: query)
                          ..selection = TextSelection.collapsed(
                            offset: query.length,
                          ),
                        decoration: InputDecoration(
                          hintText:
                              'Search hiking, snorkeling, nightlife, cities...',
                          filled: true,
                          fillColor: Colors.white,
                          prefixIcon: const Icon(Icons.search),
                          suffixIcon: IconButton(
                            onPressed: onExplore,
                            icon: const Icon(Icons.arrow_forward_rounded),
                          ),
                          border: OutlineInputBorder(
                            borderSide: BorderSide.none,
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 36,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: <Widget>[
                            _quickChip(
                              'Beaches',
                              () => onQuickFilterTap('beaches'),
                            ),
                            _quickChip(
                              'Hiking',
                              () => onQuickFilterTap('hiking'),
                            ),
                            _quickChip(
                              'Food Tours',
                              () => onQuickFilterTap('food'),
                            ),
                            _quickChip(
                              'Nightlife',
                              () => onQuickFilterTap('nightlife'),
                            ),
                            _quickChip(
                              'Museums',
                              () => onQuickFilterTap('museums'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: <Widget>[
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: onExplore,
                              style: FilledButton.styleFrom(
                                backgroundColor: _oceanBlue,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              icon: const Icon(Icons.travel_explore_rounded),
                              label: const Text('Explore Trips'),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: onStartPlanning,
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.white,
                                side: const BorderSide(color: Colors.white54),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              icon: const Icon(Icons.edit_calendar_rounded),
                              label: const Text('Start Planning'),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
          sliver: SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  'Travel smarter, not harder',
                  style: TextStyle(
                    fontSize: 23,
                    fontWeight: FontWeight.w800,
                    color: _deepBlue,
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'Everything you need for the perfect trip in one mobile experience.',
                  style: TextStyle(color: Colors.black54),
                ),
                const SizedBox(height: 16),
                _featureCard(
                  icon: Icons.airplanemode_active_rounded,
                  title: 'All-in-One Planner',
                  description:
                      'Flights, hotels, and activities in one timeline.',
                  color: _oceanBlue,
                ),
                const SizedBox(height: 10),
                _featureCard(
                  icon: Icons.bolt_rounded,
                  title: 'Instant Itineraries',
                  description: 'Build your day-by-day plan in seconds.',
                  color: _sunsetOrange,
                ),
                const SizedBox(height: 10),
                _featureCard(
                  icon: Icons.verified_user_rounded,
                  title: 'Travel With Confidence',
                  description:
                      'Reservation details and travel essentials at your fingertips.',
                  color: const Color(0xFF5B8A5E),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _quickChip(String label, VoidCallback onTap) {
    // Compact filter pills over the hero image for quick exploration entry.
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(100),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xE6FFFFFF),
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: const Color(0x88FFFFFF)),
          ),
          child: Text(
            label,
            style: const TextStyle(
              color: Color(0xFF1A2B3C),
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
      ),
    );
  }

  Widget _featureCard({
    required IconData icon,
    required String title,
    required String description,
    required Color color,
  }) {
    // Small benefit cards explain the app value below the hero section.
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE8E0D5)),
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: <Widget>[
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: const TextStyle(color: Colors.black54),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Login gate shown before the travel app shell loads.
class LoginScreen extends StatefulWidget {
  const LoginScreen({
    super.key,
    required this.onSignIn,
    this.onRegister,
    this.registrationNotice,
    this.onDismissRegistrationNotice,
  });

  final Function(String username, String password) onSignIn;
  final Function(
    String firstName,
    String lastName,
    String login,
    String email,
    String password,
  )?
  onRegister;
  final String? registrationNotice;
  final VoidCallback? onDismissRegistrationNotice;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _rememberMe = true;

  void _showRegisterDialog() {
    final TextEditingController firstNameController = TextEditingController();
    final TextEditingController lastNameController = TextEditingController();
    final TextEditingController loginController = TextEditingController();
    final TextEditingController registerEmailController =
        TextEditingController();
    final TextEditingController registerPasswordController =
        TextEditingController();

    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          title: const Text('Create Account'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextField(
                  controller: firstNameController,
                  decoration: const InputDecoration(
                    labelText: 'First Name',
                    hintText: 'John',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: lastNameController,
                  decoration: const InputDecoration(
                    labelText: 'Last Name',
                    hintText: 'Doe',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: loginController,
                  decoration: const InputDecoration(
                    labelText: 'Username',
                    hintText: 'johndoe',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: registerEmailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    hintText: 'john@example.com',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: registerPasswordController,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Password'),
                ),
              ],
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                if (firstNameController.text.trim().isEmpty ||
                    lastNameController.text.trim().isEmpty ||
                    loginController.text.trim().isEmpty ||
                    registerEmailController.text.trim().isEmpty ||
                    registerPasswordController.text.trim().isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please fill in all fields')),
                  );
                  return;
                }
                Navigator.of(dialogContext).pop();
                // Call the parent app's register handler with collected data
                widget.onRegister?.call(
                  firstNameController.text.trim(),
                  lastNameController.text.trim(),
                  loginController.text.trim(),
                  registerEmailController.text.trim(),
                  registerPasswordController.text.trim(),
                );
              },
              child: const Text('Register'),
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: <Color>[
              Color(0xFFF9F6F1),
              Color(0xFFF0E9DD),
              Color(0xFFE7F5F7),
            ],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Material(
                  color: Colors.transparent,
                  child: Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(color: const Color(0xFFE8E0D5)),
                      boxShadow: const <BoxShadow>[
                        BoxShadow(
                          color: Color(0x22000000),
                          blurRadius: 24,
                          offset: Offset(0, 12),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        if (widget.registrationNotice != null) ...<Widget>[
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEAF7EE),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: const Color(0xFFBFE3C8),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                const Padding(
                                  padding: EdgeInsets.only(top: 2),
                                  child: Icon(
                                    Icons.mark_email_unread_outlined,
                                    color: Color(0xFF1E7A3E),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    widget.registrationNotice!,
                                    style: const TextStyle(
                                      color: Color(0xFF1E7A3E),
                                      fontWeight: FontWeight.w600,
                                      height: 1.4,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(
                                    minWidth: 32,
                                    minHeight: 32,
                                  ),
                                  visualDensity: VisualDensity.compact,
                                  onPressed: widget.onDismissRegistrationNotice,
                                  icon: const Icon(
                                    Icons.close,
                                    size: 18,
                                    color: Color(0xFF1E7A3E),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),
                        ],
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: const Color(
                              0xFF2196A6,
                            ).withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: const Icon(
                            Icons.explore_rounded,
                            color: Color(0xFF2196A6),
                            size: 30,
                          ),
                        ),
                        const SizedBox(height: 18),
                        const Text(
                          'Welcome back',
                          style: TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1A2B3C),
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Sign in to continue planning trips, saving destinations, and managing your itinerary.',
                          style: TextStyle(color: Colors.black54, height: 1.4),
                        ),
                        const SizedBox(height: 22),
                        TextField(
                          controller: _usernameController,
                          keyboardType: TextInputType.text,
                          decoration: InputDecoration(
                            labelText: 'Username',
                            hintText: 'johndoe',
                            prefixIcon: const Icon(
                              Icons.person_outline_rounded,
                            ),
                            filled: true,
                            fillColor: const Color(0xFFF7F3EC),
                            border: OutlineInputBorder(
                              borderSide: BorderSide.none,
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _passwordController,
                          obscureText: true,
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline_rounded),
                            filled: true,
                            fillColor: const Color(0xFFF7F3EC),
                            border: OutlineInputBorder(
                              borderSide: BorderSide.none,
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: <Widget>[
                            Checkbox(
                              value: _rememberMe,
                              onChanged: (bool? value) {
                                setState(() {
                                  _rememberMe = value ?? false;
                                });
                              },
                            ),
                            const Expanded(
                              child: Text(
                                'Remember me',
                                style: TextStyle(color: Colors.black87),
                              ),
                            ),
                            TextButton(
                              onPressed: () {},
                              child: const Text('Forgot password?'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton(
                            onPressed: () {
                              widget.onSignIn(
                                _usernameController.text,
                                _passwordController.text,
                              );
                            },
                            style: FilledButton.styleFrom(
                              backgroundColor: const Color(0xFF2196A6),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: const Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: Text('Sign In'),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: _showRegisterDialog,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF1A2B3C),
                              side: const BorderSide(color: Color(0xFFCFC6BA)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: const Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: Text('Create Account'),
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        const Center(
                          child: Text(
                            'Travel Helper',
                            style: TextStyle(
                              color: Color(0xFF2196A6),
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// Saved-trip dashboard cards plus the create-trip entry points.
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({
    super.key,
    required this.trips,
    required this.activeTripId,
    required this.savedTrips,
    required this.onToggleSaveTrip,
    required this.onCreateNewTrip,
    required this.onDeleteTrip,
    required this.onSelectTrip,
  });

  final List<Trip> trips;
  final String activeTripId;
  final Set<String> savedTrips;
  final ValueChanged<String> onToggleSaveTrip;
  final VoidCallback onCreateNewTrip;
  final ValueChanged<Trip> onDeleteTrip;
  final ValueChanged<Trip> onSelectTrip;

  @override
  Widget build(BuildContext context) {
    // Dashboard focuses on saved trips, high-level stats, and primary trip actions.
    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        Row(
          children: <Widget>[
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Your Dashboard',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1A2B3C),
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Saved trips, progress, and travel plans in one place.',
                    style: TextStyle(color: Colors.black54),
                  ),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: () => onCreateNewTrip(),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Create'),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF2196A6),
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: const <Widget>[
            _StatCard(
              label: 'Trips Taken',
              value: '24',
              icon: Icons.airplanemode_active_rounded,
            ),
            _StatCard(
              label: 'Countries',
              value: '12',
              icon: Icons.public_rounded,
            ),
            _StatCard(
              label: 'Saved Places',
              value: '38',
              icon: Icons.favorite_rounded,
            ),
          ],
        ),
        const SizedBox(height: 14),
        ...trips.map((Trip trip) {
          final bool saved = savedTrips.contains(trip.id);
          final bool isActive = trip.id == activeTripId;
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(
                color: isActive
                    ? const Color(0xFF2196A6)
                    : const Color(0xFFE8E0D5),
                width: isActive ? 2 : 1,
              ),
            ),
            child: Column(
              children: <Widget>[
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(22),
                  ),
                  child: Stack(
                    children: <Widget>[
                      TravelImage(
                        trip.image,
                        height: 160,
                        width: double.infinity,
                        fit: BoxFit.cover,
                      ),
                      Positioned(
                        top: 10,
                        right: 10,
                        child: IconButton.filledTonal(
                          onPressed: () => onToggleSaveTrip(trip.id),
                          icon: Icon(
                            saved
                                ? Icons.bookmark_rounded
                                : Icons.bookmark_border_rounded,
                          ),
                        ),
                      ),
                      Positioned(
                        top: 10,
                        left: 10,
                        child: IconButton.filled(
                          onPressed: () => onDeleteTrip(trip),
                          style: IconButton.styleFrom(
                            backgroundColor: const Color(0xFFB3261E),
                            foregroundColor: Colors.white,
                          ),
                          icon: const Icon(Icons.delete_outline_rounded),
                          tooltip: 'Delete trip',
                        ),
                      ),
                    ],
                  ),
                ),
                ListTile(
                  onTap: () => onSelectTrip(trip),
                  title: Text(
                    trip.destination,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  subtitle: Text('${trip.location}\n${trip.dates}'),
                  isThreeLine: true,
                  trailing: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    child: FilledButton.icon(
                      onPressed: () => onSelectTrip(trip),
                      style: FilledButton.styleFrom(
                        backgroundColor: isActive
                            ? const Color(0xFF2196A6)
                            : const Color(0xFFF4845F),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(
                            isActive ? 999 : 12,
                          ),
                        ),
                      ),
                      icon: Icon(
                        isActive
                            ? Icons.check_circle_rounded
                            : Icons.trip_origin_rounded,
                        size: 18,
                      ),
                      label: Text(isActive ? 'Selected' : 'Select'),
                    ),
                  ),
                ),
              ],
            ),
          );
        }),
        OutlinedButton.icon(
          onPressed: () => onCreateNewTrip(),
          icon: const Icon(Icons.add_circle_outline_rounded),
          label: const Text('Create New Trip'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(double.infinity, 52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
      ],
    );
  }
}

// Destination discovery with filters and add-to-trip actions.
class ExploreScreen extends StatelessWidget {
  const ExploreScreen({
    super.key,
    required this.isLoading,
    required this.errorMessage,
    required this.locationLabel,
    required this.selectedCategory,
    required this.onSelectCategory,
    required this.places,
    required this.addedDestinationIds,
    required this.onToggleAddDestination,
  });

  final bool isLoading;
  final String? errorMessage;
  final String? locationLabel;
  final String selectedCategory;
  final ValueChanged<String> onSelectCategory;
  final List<ExplorePlaceResult> places;
  final Set<String> addedDestinationIds;
  final ValueChanged<ExplorePlaceResult> onToggleAddDestination;

  @override
  Widget build(BuildContext context) {
    final Map<String, int> counts = <String, int>{
      'places': 0,
      'hotels': 0,
      'events': 0,
      'flights': 0,
    };
    for (final ExplorePlaceResult place in places) {
      counts[_resultCategory(place)] =
          (counts[_resultCategory(place)] ?? 0) + 1;
    }

    final List<ExplorePlaceResult> filtered = places.where((
      ExplorePlaceResult place,
    ) {
      return _resultCategory(place) == selectedCategory;
    }).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        const Text(
          'Explore',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: Color(0xFF1A2B3C),
          ),
        ),
        const SizedBox(height: 4),
        SizedBox(
          height: 44,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: <Widget>[
              _categoryChip(
                id: 'places',
                icon: Icons.place_rounded,
                label: 'Places',
                count: counts['places'] ?? 0,
              ),
              _categoryChip(
                id: 'hotels',
                icon: Icons.hotel_rounded,
                label: 'Hotels',
                count: counts['hotels'] ?? 0,
              ),
              _categoryChip(
                id: 'events',
                icon: Icons.event_rounded,
                label: 'Events',
                count: counts['events'] ?? 0,
              ),
              _categoryChip(
                id: 'flights',
                icon: Icons.flight_takeoff_rounded,
                label: 'Flights',
                count: counts['flights'] ?? 0,
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        if (locationLabel != null) ...<Widget>[
          Text(
            'Showing live places near $locationLabel',
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: Colors.black54,
            ),
          ),
          const SizedBox(height: 6),
        ] else
          const Text(
            'Create or select a trip to load live places.',
            style: TextStyle(
              fontWeight: FontWeight.w700,
              color: Colors.black54,
            ),
          ),
        const SizedBox(height: 10),
        if (errorMessage != null) ...<Widget>[
          Container(
            padding: const EdgeInsets.all(14),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF4E5),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFF1D3A8)),
            ),
            child: Text(
              errorMessage!,
              style: const TextStyle(color: Color(0xFF8A5B00), height: 1.4),
            ),
          ),
        ],
        if (isLoading)
          Container(
            margin: const EdgeInsets.only(top: 16),
            padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE8E0D5)),
            ),
            child: const Column(
              children: <Widget>[
                CircularProgressIndicator(),
                SizedBox(height: 12),
                Text(
                  'Loading explore results...',
                  style: TextStyle(
                    color: Colors.black54,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        if (!isLoading && filtered.isEmpty)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE8E0D5)),
            ),
            child: const Text(
              'No results for this category yet. Select a trip location or switch categories.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black54, height: 1.4),
            ),
          ),
        if (!isLoading)
          ...filtered.map((ExplorePlaceResult place) {
            final bool added = addedDestinationIds.contains(place.id);
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: const Color(0xFFE8E0D5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(22),
                    ),
                    child: place.image.isNotEmpty
                        ? TravelImage(
                            place.image,
                            height: 170,
                            width: double.infinity,
                            fit: BoxFit.cover,
                          )
                        : Container(
                            height: 170,
                            width: double.infinity,
                            color: const Color(0xFFEFE7DA),
                            alignment: Alignment.center,
                            child: const Icon(
                              Icons.place_rounded,
                              color: Color(0xFF9BA3AD),
                              size: 40,
                            ),
                          ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Row(
                          children: <Widget>[
                            Expanded(
                              child: Text(
                                place.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 17,
                                ),
                              ),
                            ),
                            if (place.rating != null)
                              Text(
                                place.rating!.toStringAsFixed(1),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFF4845F),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          place.location,
                          style: const TextStyle(color: Colors.black54),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _resultTypeLabel(place),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        if (place.date != null ||
                            place.venue != null) ...<Widget>[
                          const SizedBox(height: 6),
                          Text(
                            '${place.date ?? 'Date TBD'} • ${place.venue ?? place.location}',
                            style: const TextStyle(color: Colors.black54),
                          ),
                        ],
                        const SizedBox(height: 10),
                        Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.icon(
                            onPressed: () => onToggleAddDestination(place),
                            style: FilledButton.styleFrom(
                              backgroundColor: added
                                  ? const Color(0xFF5B8A5E)
                                  : const Color(0xFF2196A6),
                              foregroundColor: Colors.white,
                            ),
                            icon: Icon(
                              added ? Icons.check_rounded : Icons.add_rounded,
                            ),
                            label: Text(
                              added ? 'Added to Trip' : 'Add to Trip',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  Widget _categoryChip({
    required String id,
    required IconData icon,
    required String label,
    required int count,
  }) {
    final bool active = selectedCategory == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => onSelectCategory(id),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: active ? const Color(0xFFE8EEF9) : const Color(0xFFF4F5F7),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: active ? const Color(0xFF9AA8C9) : const Color(0xFFE1E4EA),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Icon(
                icon,
                size: 16,
                color: active
                    ? const Color(0xFF435A8B)
                    : const Color(0xFF677089),
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: active
                      ? const Color(0xFF314A7A)
                      : const Color(0xFF4B556B),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: active
                      ? const Color(0xFF3F5788)
                      : const Color(0xFFCCD3E2),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$count',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _resultTypeLabel(ExplorePlaceResult place) {
    final String category = _resultCategory(place);
    switch (category) {
      case 'hotels':
        return 'Hotel';
      case 'events':
        return 'Event';
      case 'flights':
        return 'Flight';
      default:
        return place.type.isEmpty ? 'Place' : place.type;
    }
  }

  String _resultCategory(ExplorePlaceResult place) {
    final String normalizedType = place.type.toLowerCase();
    final String normalizedName = place.name.toLowerCase();

    if (place.venue != null || place.date != null || place.ticketUrl != null) {
      return 'events';
    }

    if (normalizedType.contains('lodging') ||
        normalizedType.contains('hotel') ||
        normalizedName.contains('hotel') ||
        normalizedName.contains('resort')) {
      return 'hotels';
    }

    if (normalizedType.contains('flight') ||
        normalizedType.contains('airport') ||
        normalizedName.contains('flight')) {
      return 'flights';
    }

    return 'places';
  }
}

// Day-by-day itinerary builder and budget tracker for the active trip.
class PlannerScreen extends StatelessWidget {
  const PlannerScreen({
    super.key,
    required this.trip,
    required this.itinerary,
    required this.onToggleDone,
    required this.onAddActivity,
    required this.onOpenTravelMode,
  });

  final Trip trip;
  final List<ItineraryDay> itinerary;
  final void Function(String dayId, String activityId) onToggleDone;
  final ValueChanged<String> onAddActivity;
  final VoidCallback onOpenTravelMode;

  @override
  Widget build(BuildContext context) {
    // The planner combines the itinerary editor and budget summary for the active trip.
    final double total = itinerary
        .expand((ItineraryDay day) => day.activities)
        .fold<double>(
          0,
          (double sum, PlannedActivity activity) => sum + activity.cost,
        );
    final double budgetLimit = trip.estimatedBudget;
    final double progress = budgetLimit == 0
        ? 0
        : (total / budgetLimit).clamp(0, 1);
    final bool hasItems = itinerary.any(
      (ItineraryDay day) => day.activities.isNotEmpty,
    );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        ClipRRect(
          borderRadius: BorderRadius.circular(24),
          child: Stack(
            children: <Widget>[
              Positioned.fill(
                child: TravelImage(trip.image, fit: BoxFit.cover),
              ),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: <Color>[Color(0x55000000), Color(0xCC000000)],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    const Text(
                      'Trip Planner',
                      style: TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      trip.destination,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${trip.location} | ${trip.dates}',
                      style: const TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 10),
                    FilledButton.icon(
                      onPressed: onOpenTravelMode,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFFF4845F),
                        foregroundColor: Colors.white,
                      ),
                      icon: const Icon(Icons.airplane_ticket_rounded),
                      label: const Text('Open Travel Mode'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE8E0D5)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Text(
                'Budget Tracker',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 6),
              Text('Estimated: \$${trip.estimatedBudget.toStringAsFixed(0)}'),
              Text('Planned spend: \$${total.toStringAsFixed(0)}'),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: progress,
                borderRadius: BorderRadius.circular(20),
                minHeight: 8,
                color: const Color(0xFFF4845F),
                backgroundColor: const Color(0xFFECE4DA),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Itinerary Builder',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: Color(0xFF1A2B3C),
          ),
        ),
        const SizedBox(height: 8),
        if (!hasItems)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE8E0D5)),
            ),
            child: const Text(
              'This trip has no saved backend items yet. Add places or events from Explore to build the itinerary.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black54, height: 1.4),
            ),
          )
        else
          ...itinerary.map((ItineraryDay day) {
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE8E0D5)),
              ),
              child: ExpansionTile(
                tilePadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                title: Text(
                  day.label,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(day.date),
                childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
                children: <Widget>[
                  ...day.activities.map((PlannedActivity activity) {
                    return ListTile(
                      dense: true,
                      leading: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: activity.category.color.withValues(
                            alpha: 0.12,
                          ),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          activity.category.icon,
                          color: activity.category.color,
                          size: 18,
                        ),
                      ),
                      title: Text(activity.title),
                      subtitle: Text(
                        activity.details.isNotEmpty
                            ? '${activity.time} • ${activity.details}'
                            : activity.time,
                      ),
                      trailing: Text(
                        activity.cost == 0
                            ? 'Saved'
                            : '\$${activity.cost.toStringAsFixed(0)}',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    );
                  }),
                ],
              ),
            );
          }),
      ],
    );
  }
}

// Travel-mode details for itinerary, hotel, flights, reservations, and essentials.
class TripDetailsScreen extends StatefulWidget {
  const TripDetailsScreen({
    super.key,
    required this.trip,
    required this.itinerary,
    required this.onBackToPlanner,
  });

  final Trip trip;
  final List<ItineraryDay> itinerary;
  final VoidCallback onBackToPlanner;

  @override
  State<TripDetailsScreen> createState() => _TripDetailsScreenState();
}

class _TripDetailsScreenState extends State<TripDetailsScreen>
    with SingleTickerProviderStateMixin {
  // Tab controller keeps travel details grouped into logical sections.
  late final TabController _tabController = TabController(
    length: 4,
    vsync: this,
  );

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        SizedBox(
          height: 220,
          child: Stack(
            fit: StackFit.expand,
            children: <Widget>[
              TravelImage(widget.trip.image, fit: BoxFit.cover),
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: <Color>[Color(0x33000000), Color(0xCC000000)],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        IconButton.filledTonal(
                          onPressed: widget.onBackToPlanner,
                          icon: const Icon(Icons.arrow_back_rounded),
                        ),
                        const Spacer(),
                        const Chip(
                          label: Text('Travel Mode'),
                          avatar: Icon(Icons.flight_takeoff_rounded),
                        ),
                      ],
                    ),
                    const Spacer(),
                    Text(
                      widget.trip.destination,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      widget.trip.dates,
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Material(
          color: Colors.white,
          child: TabBar(
            controller: _tabController,
            isScrollable: true,
            tabs: const <Tab>[
              Tab(text: 'Itinerary'),
              Tab(text: 'Travel Info'),
              Tab(text: 'Reservations'),
              Tab(text: 'Essentials'),
            ],
          ),
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: <Widget>[
              _itineraryTab(),
              _travelInfoTab(),
              _reservationsTab(),
              _essentialsTab(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _itineraryTab() {
    // Compact view of the active trip schedule for travel mode.
    return ListView(
      padding: const EdgeInsets.all(14),
      children: widget.itinerary.isEmpty
          ? <Widget>[
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE8E0D5)),
                ),
                child: const Text(
                  'No backend items have been saved for this trip yet.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.black54, height: 1.4),
                ),
              ),
            ]
          : widget.itinerary.map((ItineraryDay day) {
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE8E0D5)),
                ),
                child: ExpansionTile(
                  title: Text(day.label),
                  subtitle: Text(day.date),
                  children: day.activities
                      .map(
                        (PlannedActivity activity) => ListTile(
                          leading: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: activity.category.color.withValues(
                                alpha: 0.12,
                              ),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              activity.category.icon,
                              color: activity.category.color,
                              size: 18,
                            ),
                          ),
                          title: Text(activity.title),
                          subtitle: Text(
                            activity.details.isNotEmpty
                                ? '${activity.time} • ${activity.details}'
                                : activity.time,
                          ),
                          trailing: Text(
                            activity.cost == 0
                                ? 'Saved'
                                : '\$${activity.cost.toStringAsFixed(0)}',
                          ),
                        ),
                      )
                      .toList(),
                ),
              );
            }).toList(),
    );
  }

  Widget _travelInfoTab() {
    // Hotel and flight cards are grouped here so travelers can find logistics quickly.
    return ListView(
      padding: const EdgeInsets.all(14),
      children: <Widget>[
        _infoCard(
          title: 'Hotel Address',
          content: widget.trip.hotelAddress,
          icon: Icons.hotel_rounded,
        ),
        const SizedBox(height: 10),
        _infoCard(
          title: 'Flight Info',
          content: widget.trip.flightInfo,
          icon: Icons.flight_rounded,
        ),
      ],
    );
  }

  Widget _reservationsTab() {
    // Reservation list acts as a quick confirmation checklist.
    return ListView(
      padding: const EdgeInsets.all(14),
      children: widget.trip.reservations
          .map(
            (String reservation) => ListTile(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              tileColor: Colors.white,
              leading: const Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF5B8A5E),
              ),
              title: Text(reservation),
            ),
          )
          .toList(),
    );
  }

  Widget _essentialsTab() {
    // Useful trip reference details live here for offline-style access during travel.
    return ListView(
      padding: const EdgeInsets.all(14),
      children: <Widget>[
        _infoCard(
          title: 'Emergency',
          content: 'Police: 119 | Ambulance: 102 | Hotel: +960 660-0304',
          icon: Icons.emergency_rounded,
        ),
        const SizedBox(height: 10),
        _infoCard(
          title: 'Currency',
          content: 'USD and MVR accepted at most resorts',
          icon: Icons.payments_rounded,
        ),
        const SizedBox(height: 10),
        _infoCard(
          title: 'Connectivity',
          content: 'Local eSIM installed | roaming backup enabled',
          icon: Icons.wifi_rounded,
        ),
      ],
    );
  }

  Widget _infoCard({
    required String title,
    required String content,
    required IconData icon,
  }) {
    // Reusable info tile used for hotel, flight, and travel reference details.
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE8E0D5)),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0xFF2196A6).withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: const Color(0xFF2196A6)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 2),
                Text(content, style: const TextStyle(color: Colors.black54)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Small reusable card for dashboard stats.
class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    // Small numeric summary tile shown at the top of the dashboard.
    return Container(
      width: 112,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8E0D5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, color: const Color(0xFF2196A6)),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
          ),
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Colors.black54),
          ),
        ],
      ),
    );
  }
}

class Trip {
  // Core trip record shared across dashboard, planner, and travel mode screens.
  Trip({
    required this.id,
    required this.destination,
    required this.location,
    required this.dates,
    required this.image,
    required this.estimatedBudget,
    required this.flightInfo,
    required this.hotelAddress,
    required this.reservations,
    this.backendItems,
  });

  final String id;
  final String destination;
  final String location;
  final String dates;
  final String image;
  final double estimatedBudget;
  final String flightInfo;
  final String hotelAddress;
  final List<String> reservations;
  // Store the raw backend items for finding indices during remove operations
  final List<dynamic>? backendItems;
}

class ExplorePlaceResult {
  // Explore-page result model returned from the live places API.
  ExplorePlaceResult({
    required this.id,
    required this.name,
    required this.location,
    required this.image,
    required this.type,
    this.rating,
    this.lat,
    this.lng,
    this.address,
    this.date,
    this.venue,
    this.ticketUrl,
  });

  final String id;
  final String name;
  final String location;
  final String image;
  final String type;
  final double? rating;
  // Additional fields for places
  final double? lat;
  final double? lng;
  final String? address;
  // Additional fields for events
  final String? date;
  final String? venue;
  final String? ticketUrl;
}

class ItineraryDay {
  // A single day in the trip planner containing a list of activities.
  ItineraryDay({
    required this.id,
    required this.label,
    required this.date,
    required this.activities,
  });

  final String id;
  final String label;
  final String date;
  final List<PlannedActivity> activities;
}

class PlannedActivity {
  // Individual itinerary entry with time, category, and completion state.
  PlannedActivity({
    required this.id,
    required this.title,
    required this.time,
    required this.category,
    required this.cost,
    this.done = false,
    this.details = '',
  });

  final String id;
  final String title;
  final String time;
  final ActivityCategory category;
  final double cost;
  final bool done;
  final String details;

  PlannedActivity copyWith({
    String? id,
    String? title,
    String? time,
    ActivityCategory? category,
    double? cost,
    bool? done,
    String? details,
  }) {
    return PlannedActivity(
      id: id ?? this.id,
      title: title ?? this.title,
      time: time ?? this.time,
      category: category ?? this.category,
      cost: cost ?? this.cost,
      done: done ?? this.done,
      details: details ?? this.details,
    );
  }
}

enum ActivityCategory {
  flight('Flight', Icons.flight_rounded, Color(0xFF2196A6)),
  hotel('Hotel', Icons.hotel_rounded, Color(0xFF7B5EA7)),
  food('Food', Icons.restaurant_rounded, Color(0xFFF4845F)),
  activity('Activity', Icons.camera_alt_rounded, Color(0xFF5B8A5E)),
  transport('Transport', Icons.directions_car_rounded, Color(0xFFC9853A));

  const ActivityCategory(this.label, this.icon, this.color);

  final String label;
  final IconData icon;
  final Color color;
}

// Shared image wrapper that keeps the UI stable when image requests fail in tests or offline.
class TravelImage extends StatelessWidget {
  const TravelImage(
    this.url, {
    super.key,
    this.fit = BoxFit.cover,
    this.height,
    this.width,
  });

  final String url;
  final BoxFit fit;
  final double? height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    // Network images fall back to a neutral placeholder so layout stays stable offline and in tests.
    return Image.network(
      url,
      fit: fit,
      height: height,
      width: width,
      errorBuilder:
          (BuildContext context, Object error, StackTrace? stackTrace) {
            return Container(
              height: height,
              width: width,
              color: const Color(0xFFECE4DA),
              alignment: Alignment.center,
              child: const Icon(
                Icons.landscape_rounded,
                color: Color(0xFF9BA3AD),
              ),
            );
          },
    );
  }
}
