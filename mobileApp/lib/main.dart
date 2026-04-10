import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
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
  final GlobalKey<NavigatorState> _appNavigatorKey = GlobalKey<NavigatorState>();

  // Global app palette used across the mobile UI.
  static const _beige = Color(0xFFF9F6F1);
  static const _oceanBlue = Color(0xFF2196A6);
  static const _sunsetOrange = Color(0xFFF4845F);

  // Local auth gate for switching between the login screen and the app shell.
  bool _isLoggedIn = false;
  String? _registrationNotice;

  // Live explore state backed by the searchLocation/getPlaces API flow.
  bool _exploreLoading = false;
  String? _exploreError;
  String? _exploreLocationLabel;
  List<ExplorePlaceResult> _explorePlaces = <ExplorePlaceResult>[];

  // Navigation and shared trip state for the entire app.
  int _selectedTab = 0;
  int _activeTripIndex = 0;
  String _landingQuery = '';
  String _exploreQuery = '';
  Set<String> _selectedFilters = <String>{};
  final Set<String> _savedTrips = <String>{'trip-1', 'trip-3'};
  final Set<String> _addedDestinationIds = <String>{};

  final List<Trip> _trips = <Trip>[
    Trip(
      id: 'trip-1',
      destination: 'Maldives',
      location: 'Baa Atoll, Maldives',
      dates: 'Mar 15 - Mar 24, 2026',
      image:
          'https://images.unsplash.com/photo-1622779536320-bb5f5b501a06?auto=format&fit=crop&w=1200&q=80',
      estimatedBudget: 3200,
      flightInfo: 'Emirates EK 202 | JFK -> MLE | 08:00',
      hotelAddress: 'Soneva Fushi Resort, Kunfunadhoo Island, Baa Atoll',
      reservations: const <String>[
        'Hotel confirmation: SF-20260315-4891',
        'Dinner cruise booking: CR-45890',
        'Speedboat transfer reserved',
      ],
    ),
    Trip(
      id: 'trip-2',
      destination: 'Tokyo',
      location: 'Tokyo, Japan',
      dates: 'Apr 02 - Apr 12, 2026',
      image:
          'https://images.unsplash.com/photo-1724063781332-0221499bd113?auto=format&fit=crop&w=1200&q=80',
      estimatedBudget: 2800,
      flightInfo: 'Japan Airlines JL5 | LAX -> HND | 09:45',
      hotelAddress: 'Shinjuku Granbell Hotel, 2-14-5 Kabukicho, Tokyo',
      reservations: const <String>[
        'Hotel confirmation: SGH-22044',
        'Shibuya food tour: FT-9920',
      ],
    ),
    Trip(
      id: 'trip-3',
      destination: 'Santorini',
      location: 'Santorini, Greece',
      dates: 'Jun 08 - Jun 16, 2026',
      image:
          'https://images.unsplash.com/photo-1633909198480-85595aa21285?auto=format&fit=crop&w=1200&q=80',
      estimatedBudget: 3450,
      flightInfo: 'Aegean A381 | ATH -> JTR | 12:20',
      hotelAddress: 'Andronis Boutique, Oia, Santorini',
      reservations: const <String>[
        'Hotel confirmation: AD-88321',
        'Catamaran sunset cruise: CS-32109',
      ],
    ),
  ];

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
    // Fallback to the first trip so the planner/details screens always have content.
    if (_activeTripIndex < 0 || _activeTripIndex >= _trips.length) {
      return _trips.first;
    }
    return _trips[_activeTripIndex];
  }

  void _goToTab(int index) {
    // Bottom navigation and CTA buttons route through this single tab switcher.
    setState(() {
      _selectedTab = index;
    });
  }

  void _register(String firstName, String lastName, String login, String email, String password) async {
    try{
      await register(firstName, lastName, login, email, password);
      if (!mounted) return;
      setState(() {
        _registrationNotice = 'Account created for $email. Check your email and click the verification button before logging in.';
      });
    } catch (e) {
      // IMPORTANT NOTE: In a production app, you should surface authentication errors to the user and not just print them.
      print('Authentication error: $e');
    }
  }

  void _signIn(String username, String password) async {
    try{
      String? token;


      token = await login(username, password);
      // This demo uses a local sign-in action so the UI can be exercised without backend auth.
      setState(() {
        _isLoggedIn = true;
        _registrationNotice = null;
        _selectedTab = 0;
      });
      if (token != null) {
        await saveToken(token);
      }
    }
    catch (e) {
      // IMPORTANT NOTE: In a production app, you should surface authentication errors to the user and not just print them.
      print('Authentication error: $e');
    }
  }

  Future<void> _signOut() async {
    await logout();
    setState(() {
      _isLoggedIn = false;
      _selectedTab = 0;
    });
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

  // Home and explore filters update local UI state only.
  void _toggleFilter(String filterId) {
    setState(() {
      if (_selectedFilters.contains(filterId)) {
        _selectedFilters.remove(filterId);
      } else {
        _selectedFilters.add(filterId);
      }
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

  Future<void> _searchExplorePlaces() async {
    final String searchTerm = _exploreQuery.trim();
    if (searchTerm.isEmpty) {
      setState(() {
        _exploreError = 'Enter a city or destination to search.';
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
      final Map<String, dynamic> location = await searchLocation(searchTerm);
      final double lat = (location['lat'] as num).toDouble();
      final double lng = (location['lng'] as num).toDouble();
      final String resolvedLocation = location['name']?.toString() ?? searchTerm;
      final Map<String, dynamic> placesResponse = await getPlaces(lat, lng);
      final List<dynamic> rawPlaces = (placesResponse['places'] as List<dynamic>?) ?? <dynamic>[];

      final List<ExplorePlaceResult> places = rawPlaces.map<ExplorePlaceResult>((dynamic raw) {
        final Map<String, dynamic> placeMap = raw as Map<String, dynamic>;
        return ExplorePlaceResult(
          id: placeMap['placeId']?.toString() ?? placeMap['name']?.toString() ?? '',
          name: placeMap['name']?.toString() ?? 'Unknown place',
          location: placeMap['address']?.toString() ?? resolvedLocation,
          image: placeMap['image']?.toString() ?? '',
          rating: (placeMap['rating'] as num?)?.toDouble(),
          type: placeMap['type']?.toString() ?? 'place',
        );
      }).toList();

      if (!mounted) {
        return;
      }

      setState(() {
        _exploreLoading = false;
        _exploreLocationLabel = resolvedLocation;
        _explorePlaces = places;
        _exploreError = places.isEmpty
            ? (placesResponse['error']?.toString().isNotEmpty == true
                ? placesResponse['error'].toString()
                : 'No places found for this location.')
            : null;
      });
    } catch (e) {
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

  void _toggleAddDestination(ExplorePlaceResult destination) {
    // Adding a destination also seeds the current itinerary so the planner reflects the selection.
    setState(() {
      if (_addedDestinationIds.contains(destination.id)) {
        _addedDestinationIds.remove(destination.id);
        _itinerary[1].activities.removeWhere((PlannedActivity activity) => activity.id == 'added-${destination.id}');
        return;
      }
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
  }

  void _createNewTrip() {
    // Create a fresh trip and make it the active planner context.
    final int number = _trips.length + 1;
    setState(() {
      _trips.add(
        Trip(
          id: 'trip-$number',
          destination: 'New Adventure $number',
          location: 'Choose your destination',
          dates: 'Select travel dates',
          image:
              'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
          estimatedBudget: 1500,
          flightInfo: 'Add flight details',
          hotelAddress: 'Add hotel address',
          reservations: const <String>['No reservations added yet'],
        ),
      );
      _activeTripIndex = _trips.length - 1;
      _selectedTab = 3;
    });
  }

  void _openPlannerForTrip(Trip trip) {
    // Card taps switch the planner to the selected trip.
    setState(() {
      _activeTripIndex = _trips.indexWhere((Trip t) => t.id == trip.id);
      _selectedTab = 3;
    });
  }

  void _openTripDetailsForTrip(Trip trip) {
    // The travel-mode view should always match the trip the user tapped.
    setState(() {
      _activeTripIndex = _trips.indexWhere((Trip t) => t.id == trip.id);
      _selectedTab = 4;
    });
  }

  void _toggleActivityDone(String dayId, String activityId) {
    // Checkbox state for itinerary items in the planner and travel-mode views.
    setState(() {
      final int dayIndex = _itinerary.indexWhere((ItineraryDay d) => d.id == dayId);
      if (dayIndex == -1) {
        return;
      }
      final ItineraryDay day = _itinerary[dayIndex];
      final int activityIndex =
          day.activities.indexWhere((PlannedActivity a) => a.id == activityId);
      if (activityIndex == -1) {
        return;
      }
      day.activities[activityIndex] =
          day.activities[activityIndex].copyWith(done: !day.activities[activityIndex].done);
    });
  }

  Future<void> _showAddActivitySheet(String dayId) async {
    // Bottom sheet editor for adding itinerary items to a specific day.
    final TextEditingController titleController = TextEditingController();
    final TextEditingController timeController = TextEditingController(text: '09:00');
    final TextEditingController costController = TextEditingController(text: '0');
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
                    children: ActivityCategory.values.map((ActivityCategory cat) {
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
                          final ItineraryDay day =
                              _itinerary.firstWhere((ItineraryDay d) => d.id == dayId);
                          day.activities.add(
                            PlannedActivity(
                              id: 'manual-${DateTime.now().microsecondsSinceEpoch}',
                              title: titleController.text.trim(),
                              time: timeController.text.trim().isEmpty
                                  ? '09:00'
                                  : timeController.text.trim(),
                              category: selectedCategory,
                              cost: double.tryParse(costController.text.trim()) ?? 0,
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
      home: _isLoggedIn
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
                        setState(() {
                          _selectedFilters = <String>{filterId};
                        });
                      },
                    ),
                    DashboardScreen(
                      trips: _trips,
                      savedTrips: _savedTrips,
                      onToggleSaveTrip: _toggleSaveTrip,
                      onCreateNewTrip: _createNewTrip,
                      onOpenTripPlanner: _openPlannerForTrip,
                      onOpenTripDetails: _openTripDetailsForTrip,
                    ),
                    ExploreScreen(
                      query: _exploreQuery,
                      onQueryChanged: (String value) {
                        setState(() {
                          _exploreQuery = value;
                        });
                      },
                      onSearch: _searchExplorePlaces,
                      isLoading: _exploreLoading,
                      errorMessage: _exploreError,
                      locationLabel: _exploreLocationLabel,
                      selectedFilters: _selectedFilters,
                      onToggleFilter: _toggleFilter,
                      onClearFilters: () {
                        setState(() {
                          _selectedFilters.clear();
                        });
                      },
                      places: _explorePlaces,
                      addedDestinationIds: _addedDestinationIds,
                      onToggleAddDestination: _toggleAddDestination,
                    ),
                    PlannerScreen(
                      trip: _activeTrip,
                      itinerary: _itinerary,
                      onToggleDone: _toggleActivityDone,
                      onAddActivity: _showAddActivitySheet,
                      onOpenTravelMode: () => _goToTab(4),
                    ),
                    TripDetailsScreen(
                      trip: _activeTrip,
                      itinerary: _itinerary,
                      onBackToPlanner: () => _goToTab(3),
                    ),
                  ],
                ),
              ),
              bottomNavigationBar: NavigationBar(
                selectedIndex: _selectedTab,
                onDestinationSelected: _goToTab,
                destinations: const <NavigationDestination>[
                  NavigationDestination(icon: Icon(Icons.home_rounded), label: 'Home'),
                  NavigationDestination(icon: Icon(Icons.dashboard_rounded), label: 'Dashboard'),
                  NavigationDestination(icon: Icon(Icons.travel_explore_rounded), label: 'Explore'),
                  NavigationDestination(icon: Icon(Icons.event_note_rounded), label: 'Planner'),
                  NavigationDestination(icon: Icon(Icons.airplanemode_active_rounded), label: 'Travel Mode'),
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
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.20),
                          borderRadius: BorderRadius.circular(100),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            Icon(Icons.location_pin, size: 18, color: Color(0xFFFFD580)),
                            SizedBox(width: 6),
                            Text(
                              'Your digital travel agent',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
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
                          ..selection = TextSelection.collapsed(offset: query.length),
                        decoration: InputDecoration(
                          hintText: 'Search hiking, snorkeling, nightlife, cities...',
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
                            _quickChip('Beaches', () => onQuickFilterTap('beaches')),
                            _quickChip('Hiking', () => onQuickFilterTap('hiking')),
                            _quickChip('Food Tours', () => onQuickFilterTap('food')),
                            _quickChip('Nightlife', () => onQuickFilterTap('nightlife')),
                            _quickChip('Museums', () => onQuickFilterTap('museums')),
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
                  style: TextStyle(fontSize: 23, fontWeight: FontWeight.w800, color: _deepBlue),
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
                  description: 'Flights, hotels, and activities in one timeline.',
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
                  description: 'Reservation details and travel essentials at your fingertips.',
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
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(description, style: const TextStyle(color: Colors.black54)),
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
  final Function(String firstName, String lastName, String login, String email, String password)? onRegister;
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
    final TextEditingController registerEmailController = TextEditingController();
    final TextEditingController registerPasswordController = TextEditingController();

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
                  decoration: const InputDecoration(labelText: 'First Name', hintText: 'John'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: lastNameController,
                  decoration: const InputDecoration(labelText: 'Last Name', hintText: 'Doe'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: loginController,
                  decoration: const InputDecoration(labelText: 'Username', hintText: 'johndoe'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: registerEmailController,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Email', hintText: 'john@example.com'),
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
            colors: <Color>[Color(0xFFF9F6F1), Color(0xFFF0E9DD), Color(0xFFE7F5F7)],
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
                              border: Border.all(color: const Color(0xFFBFE3C8)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                const Padding(
                                  padding: EdgeInsets.only(top: 2),
                                  child: Icon(Icons.mark_email_unread_outlined, color: Color(0xFF1E7A3E)),
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
                                  constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                                  visualDensity: VisualDensity.compact,
                                  onPressed: widget.onDismissRegistrationNotice,
                                  icon: const Icon(Icons.close, size: 18, color: Color(0xFF1E7A3E)),
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
                            color: const Color(0xFF2196A6).withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: const Icon(Icons.explore_rounded, color: Color(0xFF2196A6), size: 30),
                        ),
                        const SizedBox(height: 18),
                        const Text(
                          'Welcome back',
                          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF1A2B3C)),
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
                            prefixIcon: const Icon(Icons.person_outline_rounded),
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
                              child: Text('Remember me', style: TextStyle(color: Colors.black87)),
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
                              widget.onSignIn(_usernameController.text, _passwordController.text);
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
    required this.savedTrips,
    required this.onToggleSaveTrip,
    required this.onCreateNewTrip,
    required this.onOpenTripPlanner,
    required this.onOpenTripDetails,
  });

  final List<Trip> trips;
  final Set<String> savedTrips;
  final ValueChanged<String> onToggleSaveTrip;
  final VoidCallback onCreateNewTrip;
  final ValueChanged<Trip> onOpenTripPlanner;
  final ValueChanged<Trip> onOpenTripDetails;

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
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF1A2B3C)),
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
              onPressed: onCreateNewTrip,
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
            _StatCard(label: 'Trips Taken', value: '24', icon: Icons.airplanemode_active_rounded),
            _StatCard(label: 'Countries', value: '12', icon: Icons.public_rounded),
            _StatCard(label: 'Saved Places', value: '38', icon: Icons.favorite_rounded),
          ],
        ),
        const SizedBox(height: 14),
        ...trips.map((Trip trip) {
          final bool saved = savedTrips.contains(trip.id);
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFE8E0D5)),
            ),
            child: Column(
              children: <Widget>[
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
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
                          icon: Icon(saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded),
                        ),
                      ),
                    ],
                  ),
                ),
                ListTile(
                  onTap: () => onOpenTripPlanner(trip),
                  title: Text(trip.destination, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: Text('${trip.location}\n${trip.dates}'),
                  isThreeLine: true,
                  trailing: FilledButton(
                    onPressed: () => onOpenTripDetails(trip),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFF4845F),
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Open'),
                  ),
                ),
              ],
            ),
          );
        }),
        OutlinedButton.icon(
          onPressed: onCreateNewTrip,
          icon: const Icon(Icons.add_circle_outline_rounded),
          label: const Text('Create New Trip'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(double.infinity, 52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
        ),
      ],
    );
  }
}

// Destination discovery with search, filters, and add-to-trip actions.
class ExploreScreen extends StatelessWidget {
  const ExploreScreen({
    super.key,
    required this.query,
    required this.onQueryChanged,
    required this.onSearch,
    required this.isLoading,
    required this.errorMessage,
    required this.locationLabel,
    required this.selectedFilters,
    required this.onToggleFilter,
    required this.onClearFilters,
    required this.places,
    required this.addedDestinationIds,
    required this.onToggleAddDestination,
  });

  final String query;
  final ValueChanged<String> onQueryChanged;
  final VoidCallback onSearch;
  final bool isLoading;
  final String? errorMessage;
  final String? locationLabel;
  final Set<String> selectedFilters;
  final ValueChanged<String> onToggleFilter;
  final VoidCallback onClearFilters;
  final List<ExplorePlaceResult> places;
  final Set<String> addedDestinationIds;
  final ValueChanged<ExplorePlaceResult> onToggleAddDestination;

  @override
  Widget build(BuildContext context) {
    final List<ExplorePlaceResult> filtered = places.where((ExplorePlaceResult place) {
      final String q = query.trim().toLowerCase();
      final bool matchesQuery = q.isEmpty ||
          place.name.toLowerCase().contains(q) ||
          place.location.toLowerCase().contains(q) ||
          place.type.toLowerCase().contains(q);
      final bool matchesFilter = selectedFilters.isEmpty ||
          selectedFilters.any((String filter) => _matchesFilter(place, filter));
      return matchesQuery && matchesFilter;
    }).toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: <Widget>[
        const Text(
          'Explore',
          style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: Color(0xFF1A2B3C)),
        ),
        const SizedBox(height: 4),
        const Text('Search a city to load live nearby places from the API.'),
        const SizedBox(height: 12),
        TextField(
          onChanged: onQueryChanged,
          onSubmitted: (_) => onSearch(),
          controller: TextEditingController(text: query)
            ..selection = TextSelection.collapsed(offset: query.length),
          decoration: InputDecoration(
            hintText: 'Search a city, country, or region...',
            prefixIcon: const Icon(Icons.search_rounded),
            suffixIcon: IconButton(
              onPressed: onSearch,
              icon: const Icon(Icons.travel_explore_rounded),
              tooltip: 'Search location',
            ),
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderSide: BorderSide.none,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            onPressed: isLoading ? null : onSearch,
            icon: isLoading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.travel_explore_rounded),
            label: Text(isLoading ? 'Searching...' : 'Search Live Places'),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 42,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: <Widget>[
              _filterChip('beaches'),
              _filterChip('hiking'),
              _filterChip('food'),
              _filterChip('nightlife'),
              _filterChip('museums'),
              _filterChip('snorkeling'),
              if (selectedFilters.isNotEmpty)
                TextButton(
                  onPressed: onClearFilters,
                  child: const Text('Clear'),
                ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        if (locationLabel != null) ...<Widget>[
          Text(
            'Showing live places near $locationLabel',
            style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.black54),
          ),
          const SizedBox(height: 6),
        ] else
          const Text(
            'Search a city to load live places.',
            style: TextStyle(fontWeight: FontWeight.w700, color: Colors.black54),
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
        if (!isLoading && filtered.isEmpty)
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE8E0D5)),
            ),
            child: const Text(
              'No places loaded yet. Search for a city to see live results.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black54, height: 1.4),
            ),
          ),
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
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
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
                          child: const Icon(Icons.place_rounded, color: Color(0xFF9BA3AD), size: 40),
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
                              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 17),
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
                      Text(place.location, style: const TextStyle(color: Colors.black54)),
                      const SizedBox(height: 8),
                      Text(
                        place.type,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton.icon(
                          onPressed: () => onToggleAddDestination(place),
                          style: FilledButton.styleFrom(
                            backgroundColor:
                                added ? const Color(0xFF5B8A5E) : const Color(0xFF2196A6),
                            foregroundColor: Colors.white,
                          ),
                          icon: Icon(added ? Icons.check_rounded : Icons.add_rounded),
                          label: Text(added ? 'Added to Trip' : 'Add to Trip'),
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

  Widget _filterChip(String id) {
    final bool active = selectedFilters.contains(id);
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        selected: active,
        label: Text(_filterLabel(id)),
        onSelected: (_) => onToggleFilter(id),
      ),
    );
  }

  String _filterLabel(String id) {
    switch (id) {
      case 'food':
        return 'Food Tours';
      case 'beaches':
        return 'Beaches';
      case 'hiking':
        return 'Hiking';
      case 'nightlife':
        return 'Nightlife';
      case 'museums':
        return 'Museums';
      case 'snorkeling':
        return 'Snorkeling';
      default:
        return id;
    }
  }

  bool _matchesFilter(ExplorePlaceResult place, String filter) {
    final String haystack = '${place.name} ${place.location} ${place.type}'.toLowerCase();
    switch (filter) {
      case 'beaches':
        return haystack.contains('beach') || haystack.contains('coast') || haystack.contains('water');
      case 'hiking':
        return haystack.contains('park') || haystack.contains('trail') || haystack.contains('hiking');
      case 'food':
        return haystack.contains('restaurant') || haystack.contains('cafe') || haystack.contains('food');
      case 'nightlife':
        return haystack.contains('bar') || haystack.contains('nightlife') || haystack.contains('club');
      case 'museums':
        return haystack.contains('museum') || haystack.contains('gallery');
      case 'snorkeling':
        return haystack.contains('snorkel') || haystack.contains('aquarium') || haystack.contains('tourist');
      default:
        return haystack.contains(filter.toLowerCase());
    }
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
        .fold<double>(0, (double sum, PlannedActivity activity) => sum + activity.cost);
    final double budgetLimit = trip.estimatedBudget;
    final double progress = budgetLimit == 0 ? 0 : (total / budgetLimit).clamp(0, 1);

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
                    const Text('Trip Planner',
                        style: TextStyle(color: Colors.white70, fontWeight: FontWeight.w600)),
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
              const Text('Budget Tracker',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
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
        const Text('Itinerary Builder',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF1A2B3C))),
        const SizedBox(height: 8),
        ...itinerary.map((ItineraryDay day) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE8E0D5)),
            ),
            child: ExpansionTile(
              tilePadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              title: Text(day.label, style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(day.date),
              childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 10),
              children: <Widget>[
                ...day.activities.map((PlannedActivity activity) {
                  return ListTile(
                    dense: true,
                    leading: Checkbox(
                      value: activity.done,
                      onChanged: (_) => onToggleDone(day.id, activity.id),
                    ),
                    title: Text(activity.title),
                    subtitle: Text('${activity.time} | ${activity.category.label}'),
                    trailing: Text(
                      activity.cost == 0
                          ? 'Free'
                          : '\$${activity.cost.toStringAsFixed(0)}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  );
                }),
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: () => onAddActivity(day.id),
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Add Activity to Day'),
                  ),
                ),
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
  late final TabController _tabController = TabController(length: 4, vsync: this);

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
      children: <Widget>[
        ...widget.itinerary.map((ItineraryDay day) {
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
                  .map((PlannedActivity activity) => ListTile(
                        leading: Icon(activity.category.icon, color: activity.category.color),
                        title: Text(activity.title),
                        subtitle: Text(activity.time),
                        trailing: Text(
                          activity.cost == 0
                              ? 'Free'
                              : '\$${activity.cost.toStringAsFixed(0)}',
                        ),
                      ))
                  .toList(),
            ),
          );
        }),
      ],
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
          .map((String reservation) => ListTile(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                tileColor: Colors.white,
                leading: const Icon(Icons.check_circle_rounded, color: Color(0xFF5B8A5E)),
                title: Text(reservation),
              ))
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
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
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
          Text(value, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
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
  });

  final String id;
  final String name;
  final String location;
  final String image;
  final String type;
  final double? rating;
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
  });

  final String id;
  final String title;
  final String time;
  final ActivityCategory category;
  final double cost;
  final bool done;

  PlannedActivity copyWith({
    String? id,
    String? title,
    String? time,
    ActivityCategory? category,
    double? cost,
    bool? done,
  }) {
    return PlannedActivity(
      id: id ?? this.id,
      title: title ?? this.title,
      time: time ?? this.time,
      category: category ?? this.category,
      cost: cost ?? this.cost,
      done: done ?? this.done,
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
      errorBuilder: (BuildContext context, Object error, StackTrace? stackTrace) {
        return Container(
          height: height,
          width: width,
          color: const Color(0xFFECE4DA),
          alignment: Alignment.center,
          child: const Icon(Icons.landscape_rounded, color: Color(0xFF9BA3AD)),
        );
      },
    );
  }
}