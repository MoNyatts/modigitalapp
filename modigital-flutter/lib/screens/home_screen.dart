import 'dart:async';

import 'package:flutter/material.dart';

import '../api.dart';
import '../main.dart';
import '../models.dart';
import 'login_screen.dart';
import 'scanner_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  late Future<List<Event>> _events;
  Timer? _liveRefreshTimer;
  int _tabIndex = 0;
  int? _selectedEventId;
  int? _selectedActivityId;
  int? _selectedReportEventId;
  bool _appInForeground = true;
  bool _refreshingEvents = false;
  DateTime? _lastUpdatedAt;
  String? _liveRefreshError;

  bool get _isAdmin => api.isAdmin;
  bool get _canAutoRefresh =>
      _appInForeground && (ModalRoute.of(context)?.isCurrent ?? true);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _events = _fetchEvents();
    _liveRefreshTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _refresh(silent: true),
    );
  }

  @override
  void dispose() {
    _liveRefreshTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _appInForeground = state == AppLifecycleState.resumed;
  }

  Future<List<Event>> _fetchEvents() async {
    try {
      final events = await api.events();
      if (mounted) {
        setState(() {
          _lastUpdatedAt = DateTime.now();
          _liveRefreshError = null;
        });
      }
      return events;
    } catch (e) {
      if (mounted) {
        setState(() => _liveRefreshError = e.toString());
      }
      rethrow;
    }
  }

  Future<void> _refresh({bool silent = false}) async {
    if (_refreshingEvents || (silent && !_canAutoRefresh)) return;

    _refreshingEvents = true;
    final future = _fetchEvents();
    if (!silent) {
      setState(() {
        _events = future;
      });
    }

    try {
      final events = await future;
      if (silent && mounted) {
        setState(() {
          _events = Future<List<Event>>.value(events);
        });
      }
    } catch (_) {
      // Manual refresh errors are shown by FutureBuilder; silent errors keep the
      // last good data on screen and mark the live chip as offline.
    } finally {
      _refreshingEvents = false;
    }
  }

  Future<void> _logout() async {
    await api.logout();
    if (!mounted) return;
    Navigator.of(
      context,
    ).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final tabs = _isAdmin ? _adminTabs : _staffTabs;
    final activeTab = tabs[_tabIndex.clamp(0, tabs.length - 1)];

    return FutureBuilder<List<Event>>(
      future: _events,
      builder: (context, snapshot) {
        final events = snapshot.data ?? [];
        final loading = snapshot.connectionState == ConnectionState.waiting;

        return Scaffold(
          appBar: AppBar(
            toolbarHeight: 82,
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activeTab.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 24,
                  ),
                ),
                Text(
                  api.userName ?? 'Mo Digital',
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.white70,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            actions: [
              _LiveRefreshChip(
                error: _liveRefreshError,
                updatedAt: _lastUpdatedAt,
              ),
              if (_isAdmin && activeTab.kind == _HomeTabKind.events)
                Padding(
                  padding: const EdgeInsets.only(right: 10),
                  child: CircleAvatar(
                    backgroundColor: brandRed,
                    foregroundColor: Colors.white,
                    child: IconButton(
                      onPressed: _refresh,
                      icon: const Icon(Icons.refresh),
                      tooltip: 'Refresh',
                    ),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: IconButton(
                    onPressed: _refresh,
                    icon: const Icon(Icons.refresh),
                    tooltip: 'Refresh',
                  ),
                ),
            ],
          ),
          body: loading
              ? const Center(child: CircularProgressIndicator())
              : snapshot.hasError
              ? _Message(
                  icon: Icons.cloud_off,
                  text: 'Could not load events\n${snapshot.error}',
                  onRetry: _refresh,
                )
              : _Body(
                  kind: activeTab.kind,
                  events: events,
                  isAdmin: _isAdmin,
                  selectedEventId: _selectedEventId,
                  selectedActivityId: _selectedActivityId,
                  selectedReportEventId: _selectedReportEventId,
                  onEventChanged: (eventId) => setState(() {
                    _selectedEventId = eventId;
                    _selectedActivityId = null;
                  }),
                  onActivityChanged: (activityId) =>
                      setState(() => _selectedActivityId = activityId),
                  onReportEventChanged: (eventId) =>
                      setState(() => _selectedReportEventId = eventId),
                  onRefresh: _refresh,
                  onLogout: _logout,
                ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: _tabIndex.clamp(0, tabs.length - 1),
            onDestinationSelected: (index) => setState(() => _tabIndex = index),
            indicatorColor: brandRed.withValues(alpha: 0.12),
            destinations: [
              for (final tab in tabs)
                NavigationDestination(
                  icon: Icon(tab.icon),
                  selectedIcon: Icon(tab.icon, color: brandRed),
                  label: tab.label,
                ),
            ],
          ),
        );
      },
    );
  }
}

class _LiveRefreshChip extends StatelessWidget {
  final String? error;
  final DateTime? updatedAt;

  const _LiveRefreshChip({required this.error, required this.updatedAt});

  @override
  Widget build(BuildContext context) {
    final healthy = error == null;
    final age = updatedAt == null
        ? null
        : DateTime.now().difference(updatedAt!).inSeconds;

    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Tooltip(
        message: healthy
            ? age == null
                  ? 'Waiting for first refresh'
                  : 'Updated ${age < 1 ? 'now' : '$age seconds ago'}'
            : error!,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: healthy ? 0.16 : 0.10),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                healthy ? Icons.sync : Icons.sync_problem_outlined,
                size: 16,
                color: healthy ? Colors.white : brandGold,
              ),
              const SizedBox(width: 5),
              Text(
                healthy ? 'Live' : 'Offline',
                style: TextStyle(
                  color: healthy ? Colors.white : brandGold,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  final _HomeTabKind kind;
  final List<Event> events;
  final bool isAdmin;
  final int? selectedEventId;
  final int? selectedActivityId;
  final int? selectedReportEventId;
  final ValueChanged<int?> onEventChanged;
  final ValueChanged<int?> onActivityChanged;
  final ValueChanged<int?> onReportEventChanged;
  final Future<void> Function() onRefresh;
  final Future<void> Function() onLogout;

  const _Body({
    required this.kind,
    required this.events,
    required this.isAdmin,
    required this.selectedEventId,
    required this.selectedActivityId,
    required this.selectedReportEventId,
    required this.onEventChanged,
    required this.onActivityChanged,
    required this.onReportEventChanged,
    required this.onRefresh,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return switch (kind) {
      _HomeTabKind.events => _EventsTab(
        events: events,
        isAdmin: isAdmin,
        onRefresh: onRefresh,
      ),
      _HomeTabKind.scanner => _ScannerTab(
        events: events,
        selectedEventId: selectedEventId,
        selectedActivityId: selectedActivityId,
        onEventChanged: onEventChanged,
        onActivityChanged: onActivityChanged,
      ),
      _HomeTabKind.reports => _ReportsTab(
        events: events,
        isAdmin: isAdmin,
        selectedEventId: selectedReportEventId,
        onEventChanged: onReportEventChanged,
      ),
      _HomeTabKind.qrCodes => _QrCodesTab(events: events),
      _HomeTabKind.users => _UsersTab(
        events: events,
        onRefreshEvents: onRefresh,
        onLogout: onLogout,
      ),
      _HomeTabKind.profile => _ProfileTab(events: events, onLogout: onLogout),
    };
  }
}

class _EventsTab extends StatelessWidget {
  final List<Event> events;
  final bool isAdmin;
  final Future<void> Function() onRefresh;

  const _EventsTab({
    required this.events,
    required this.isAdmin,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 80),
          Icon(Icons.event_busy, size: 64, color: Colors.black26),
          const SizedBox(height: 16),
          Text(
            isAdmin
                ? 'No events have been created yet.'
                : 'No events assigned to you yet.',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black54),
          ),
          if (isAdmin) ...[
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: () => _showEventDialog(context, onRefresh),
              icon: const Icon(Icons.add),
              label: const Text('Create event'),
            ),
          ],
        ],
      );
    }

    final totalAdmissions = events.fold<int>(
      0,
      (total, event) => total + event.totalAdmissions,
    );
    final qrCodes = events.fold<int>(
      0,
      (total, event) => total + event.qrCodesCount,
    );
    final activities = events.fold<int>(
      0,
      (total, event) => total + event.activities.length,
    );

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: events.length + 1,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        if (index == 0) {
          return _OverviewCard(
            title: isAdmin ? 'Admin snapshot' : 'Assigned event snapshot',
            subtitle: isAdmin
                ? 'Live totals across all events'
                : 'Your current scanner access',
            stats: [
              _OverviewStat(
                Icons.event_available_outlined,
                'Events',
                events.length.toString(),
                brandRed,
              ),
              _OverviewStat(
                Icons.qr_code_2_outlined,
                'QR codes',
                qrCodes.toString(),
                brandNavy,
              ),
              _OverviewStat(
                Icons.how_to_reg_outlined,
                'Admitted',
                totalAdmissions.toString(),
                brandTeal,
              ),
              _OverviewStat(
                Icons.timeline_outlined,
                'Activities',
                activities.toString(),
                brandGold,
              ),
            ],
            action: isAdmin
                ? FilledButton.icon(
                    onPressed: () => _showEventDialog(context, onRefresh),
                    icon: const Icon(Icons.add),
                    label: const Text('Create event'),
                  )
                : null,
          );
        }

        final event = events[index - 1];
        return _EventCard(
          event: event,
          roleLabel: isAdmin ? 'No guest users assigned' : 'Assigned to you',
          onAddActivity: isAdmin
              ? () => _showActivityDialog(context, event.id, onRefresh)
              : null,
        );
      },
    );
  }
}

class _ScannerTab extends StatelessWidget {
  final List<Event> events;
  final int? selectedEventId;
  final int? selectedActivityId;
  final ValueChanged<int?> onEventChanged;
  final ValueChanged<int?> onActivityChanged;

  const _ScannerTab({
    required this.events,
    required this.selectedEventId,
    required this.selectedActivityId,
    required this.onEventChanged,
    required this.onActivityChanged,
  });

  @override
  Widget build(BuildContext context) {
    final selectedEvent =
        _findEvent(events, selectedEventId) ?? events.firstOrNull;
    final activities = selectedEvent?.activities ?? const <Activity>[];
    final selectedActivity =
        _findActivity(activities, selectedActivityId) ?? activities.firstOrNull;
    final canScan = selectedEvent != null && selectedActivity != null;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _PickerCard(
          label: 'Selected Event',
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: selectedEvent?.id,
              isExpanded: true,
              hint: const Text('Select Event'),
              items: [
                for (final event in events)
                  DropdownMenuItem(
                    value: event.id,
                    child: Text(event.name, overflow: TextOverflow.ellipsis),
                  ),
              ],
              onChanged: onEventChanged,
            ),
          ),
        ),
        const SizedBox(height: 14),
        _PickerCard(
          label: 'Selected Activity',
          muted: selectedEvent == null,
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: selectedActivity?.id,
              isExpanded: true,
              hint: const Text('Select Activity'),
              items: [
                for (final activity in activities)
                  DropdownMenuItem(
                    value: activity.id,
                    child: Text(activity.name, overflow: TextOverflow.ellipsis),
                  ),
              ],
              onChanged: selectedEvent == null ? null : onActivityChanged,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          color: canScan ? brandNavy : Colors.white,
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              children: [
                Icon(
                  Icons.qr_code_scanner,
                  size: 64,
                  color: canScan ? Colors.white : Colors.grey.shade300,
                ),
                const SizedBox(height: 14),
                Text(
                  canScan ? 'Ready to scan' : 'Scanner setup',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: canScan ? Colors.white : brandNavy,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  canScan
                      ? 'Checking in guests for ${selectedActivity.name}'
                      : 'Select an event and activity to start scanning QR codes.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: canScan ? Colors.white70 : Colors.black54,
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: canScan
                      ? () => Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ScannerScreen(
                              event: selectedEvent,
                              activity: selectedActivity,
                            ),
                          ),
                        )
                      : null,
                  icon: const Icon(Icons.qr_code_scanner),
                  label: const Text('Open scanner'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ReportsTab extends StatelessWidget {
  final List<Event> events;
  final bool isAdmin;
  final int? selectedEventId;
  final ValueChanged<int?> onEventChanged;

  const _ReportsTab({
    required this.events,
    required this.isAdmin,
    required this.selectedEventId,
    required this.onEventChanged,
  });

  @override
  Widget build(BuildContext context) {
    if (events.isEmpty) {
      return const _EmptyState(
        icon: Icons.bar_chart_outlined,
        title: 'No report data',
        text: 'Reports appear after events and activities are created.',
      );
    }

    final selectedEvent = _findEvent(events, selectedEventId) ?? events.first;
    final activities = events.fold<int>(
      0,
      (total, event) => total + event.activities.length,
    );
    final totalAdmissions = events.fold<int>(
      0,
      (total, event) => total + event.totalAdmissions,
    );
    final totalScans = events.fold<int>(
      0,
      (total, event) => total + event.totalScans,
    );
    final totalRejected = events.fold<int>(
      0,
      (total, event) => total + event.rejectedScans,
    );
    final totalQrCodes = events.fold<int>(
      0,
      (total, event) => total + event.qrCodesCount,
    );
    final selectedCapacity = selectedEvent.invitedGuests > 0
        ? selectedEvent.invitedGuests
        : selectedEvent.qrCodesCount;
    final selectedProgress = selectedCapacity == 0
        ? 0.0
        : (selectedEvent.totalAdmissions / selectedCapacity).clamp(0.0, 1.0);
    final busiestActivity = selectedEvent.activities.isEmpty
        ? null
        : selectedEvent.activities.reduce(
            (a, b) => a.totalAdmissions >= b.totalAdmissions ? a : b,
          );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _OverviewCard(
          title: 'Overall statistics',
          subtitle: isAdmin
              ? 'All events available to admin'
              : 'Events assigned to your account',
          stats: [
            _OverviewStat(
              Icons.event_available_outlined,
              'Events',
              events.length.toString(),
              brandRed,
            ),
            _OverviewStat(
              Icons.monitor_heart_outlined,
              'Activities',
              activities.toString(),
              brandTeal,
            ),
            _OverviewStat(
              Icons.how_to_reg_outlined,
              'Admitted',
              totalAdmissions.toString(),
              Colors.green,
            ),
            _OverviewStat(
              Icons.block_outlined,
              'Rejected',
              totalRejected.toString(),
              brandDarkRed,
            ),
          ],
        ),
        const SizedBox(height: 16),
        _PickerCard(
          label: 'Report Event',
          child: DropdownButtonHideUnderline(
            child: DropdownButton<int>(
              value: selectedEvent.id,
              isExpanded: true,
              items: [
                for (final event in events)
                  DropdownMenuItem(
                    value: event.id,
                    child: Text(event.name, overflow: TextOverflow.ellipsis),
                  ),
              ],
              onChanged: onEventChanged,
            ),
          ),
        ),
        const SizedBox(height: 16),
        _ReportHero(
          event: selectedEvent,
          progress: selectedProgress,
          capacity: selectedCapacity,
          totalQrCodes: totalQrCodes,
          totalScans: totalScans,
          busiestActivity: busiestActivity,
        ),
        const SizedBox(height: 16),
        Text(
          'Activity breakdown',
          style: Theme.of(
            context,
          ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 10),
        if (selectedEvent.activities.isEmpty)
          const _EmptyState(
            icon: Icons.fact_check_outlined,
            title: 'No activities',
            text: 'Add event activities to track admissions.',
          )
        else
          for (final activity in selectedEvent.activities) ...[
            _ActivityReportCard(activity: activity),
            const SizedBox(height: 10),
          ],
      ],
    );
  }
}

class _QrCodesTab extends StatelessWidget {
  final List<Event> events;

  const _QrCodesTab({required this.events});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        for (final event in events)
          Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: surfaceWarm,
                foregroundColor: brandRed,
                child: Icon(Icons.inventory_2_outlined),
              ),
              title: Text(
                event.name,
                style: const TextStyle(fontWeight: FontWeight.w900),
              ),
              subtitle: Text('${event.activities.length} activities'),
              trailing: const Icon(Icons.chevron_right),
            ),
          ),
        if (events.isEmpty)
          const _EmptyState(
            icon: Icons.inventory_2_outlined,
            title: 'No QR code batches',
            text: 'Create an event before importing QR codes.',
          ),
      ],
    );
  }
}

class _UsersTab extends StatefulWidget {
  final List<Event> events;
  final Future<void> Function() onRefreshEvents;
  final Future<void> Function() onLogout;

  const _UsersTab({
    required this.events,
    required this.onRefreshEvents,
    required this.onLogout,
  });

  @override
  State<_UsersTab> createState() => _UsersTabState();
}

class _UsersTabState extends State<_UsersTab> {
  late Future<List<AppUser>> _users;
  Timer? _liveRefreshTimer;
  bool _refreshingUsers = false;
  String? _liveRefreshError;

  @override
  void initState() {
    super.initState();
    _users = _fetchUsers();
    _liveRefreshTimer = Timer.periodic(
      const Duration(seconds: 12),
      (_) => _refresh(silent: true),
    );
  }

  @override
  void dispose() {
    _liveRefreshTimer?.cancel();
    super.dispose();
  }

  Future<List<AppUser>> _fetchUsers() async {
    try {
      final users = await api.users();
      if (mounted) setState(() => _liveRefreshError = null);
      return users;
    } catch (e) {
      if (mounted) setState(() => _liveRefreshError = e.toString());
      rethrow;
    }
  }

  Future<void> _refresh({bool silent = false}) async {
    if (_refreshingUsers) return;

    _refreshingUsers = true;
    final future = _fetchUsers();
    if (!silent) {
      setState(() {
        _users = future;
      });
    }

    try {
      final users = await future;
      if (silent && mounted) {
        setState(() {
          _users = Future<List<AppUser>>.value(users);
        });
      }
      if (!silent) {
        await widget.onRefreshEvents();
      }
    } catch (_) {
      // Silent refresh keeps the last good user list visible.
    } finally {
      _refreshingUsers = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<AppUser>>(
      future: _users,
      builder: (context, snapshot) {
        final users = snapshot.data ?? [];
        final loading = snapshot.connectionState == ConnectionState.waiting;
        final admins = users.where((user) => user.isAdmin).length;
        final staff = users.where((user) => !user.isAdmin).length;

        if (loading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return _Message(
            icon: Icons.group_off_outlined,
            text: 'Could not load users\n${snapshot.error}',
            onRetry: _refresh,
          );
        }

        return RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _OverviewCard(
                title: 'User management',
                subtitle: _liveRefreshError == null
                    ? 'Create scanner accounts and manage admin access'
                    : 'Showing last saved users while reconnecting',
                stats: [
                  _OverviewStat(
                    Icons.people_outline,
                    'Users',
                    users.length.toString(),
                    brandNavy,
                  ),
                  _OverviewStat(
                    Icons.admin_panel_settings_outlined,
                    'Admins',
                    admins.toString(),
                    brandRed,
                  ),
                  _OverviewStat(
                    Icons.qr_code_scanner,
                    'Staff',
                    staff.toString(),
                    brandTeal,
                  ),
                  _OverviewStat(
                    Icons.event_available_outlined,
                    'Events',
                    widget.events.length.toString(),
                    brandGold,
                  ),
                ],
                action: FilledButton.icon(
                  onPressed: () => _showUserDialog(
                    context,
                    events: widget.events,
                    onSaved: _refresh,
                  ),
                  icon: const Icon(Icons.person_add_alt_1),
                  label: const Text('Add user'),
                ),
              ),
              const SizedBox(height: 16),
              for (final user in users) ...[
                _AdminUserCard(
                  user: user,
                  events: widget.events,
                  onSaved: _refresh,
                ),
                const SizedBox(height: 10),
              ],
              const SizedBox(height: 16),
              _ActionTile(
                icon: Icons.logout,
                label: 'Logout',
                color: brandRed,
                onTap: widget.onLogout,
              ),
            ],
          ),
        );
      },
    );
  }
}

class _ProfileTab extends StatelessWidget {
  final List<Event> events;
  final Future<void> Function() onLogout;

  const _ProfileTab({required this.events, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text(
          'Current User',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        _UserCard(
          name: api.userName ?? 'Scanner',
          email: api.userEmail?.isNotEmpty == true
              ? api.userEmail!
              : 'No email available',
          role: api.isAdmin ? 'Administrator' : 'Scanner',
          roleColor: api.isAdmin ? Colors.green : brandGold,
        ),
        const SizedBox(height: 28),
        const Text(
          'Actions',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        _ActionTile(
          icon: Icons.logout,
          label: 'Logout',
          color: brandRed,
          onTap: onLogout,
        ),
        const SizedBox(height: 28),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Guest Access',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 12),
                Text('Only assigned events (${events.length} events)'),
                const SizedBox(height: 8),
                const Text('Scanner access: Enabled'),
                const SizedBox(height: 8),
                const Text('View reports for assigned events only'),
                const SizedBox(height: 8),
                const Text('Cannot create or delete events/activities'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _AdminUserCard extends StatelessWidget {
  final AppUser user;
  final List<Event> events;
  final Future<void> Function() onSaved;

  const _AdminUserCard({
    required this.user,
    required this.events,
    required this.onSaved,
  });

  @override
  Widget build(BuildContext context) {
    final isCurrentUser = user.email == api.userEmail;

    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: _UserAvatar(user: user),
        title: Text(
          user.name,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(user.email, maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                _Pill(
                  user.isAdmin ? 'Admin' : 'Staff',
                  color: user.isAdmin ? brandRed : brandTeal,
                ),
                _Pill(
                  user.isAdmin
                      ? 'Scanner enabled'
                      : user.scannerEnabled
                      ? 'Scanner on'
                      : 'Scanner off',
                  color: user.scannerEnabled || user.isAdmin
                      ? Colors.green
                      : brandDarkRed,
                ),
                _Pill(
                  user.isAdmin
                      ? 'All events'
                      : '${user.assignedEventsCount ?? 0} events',
                ),
              ],
            ),
          ],
        ),
        trailing: Wrap(
          spacing: 4,
          children: [
            IconButton(
              onPressed: () => _showUserDialog(
                context,
                user: user,
                events: events,
                onSaved: onSaved,
              ),
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Edit user',
            ),
            IconButton(
              onPressed: isCurrentUser
                  ? null
                  : () => _confirmDeleteUser(context, user, onSaved),
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Delete user',
            ),
          ],
        ),
      ),
    );
  }
}

class _UserAvatar extends StatelessWidget {
  final AppUser user;

  const _UserAvatar({required this.user});

  @override
  Widget build(BuildContext context) {
    final photoUrl = user.profilePhotoUrl;

    return CircleAvatar(
      radius: 25,
      backgroundColor: user.isAdmin
          ? brandRed.withValues(alpha: 0.12)
          : brandTeal.withValues(alpha: 0.12),
      foregroundColor: user.isAdmin ? brandRed : brandTeal,
      backgroundImage: photoUrl == null || photoUrl.isEmpty
          ? null
          : NetworkImage(photoUrl),
      child: photoUrl == null || photoUrl.isEmpty
          ? Text(
              user.name.trim().isEmpty
                  ? '?'
                  : user.name.trim()[0].toUpperCase(),
              style: const TextStyle(fontWeight: FontWeight.w900),
            )
          : null,
    );
  }
}

class _EventCard extends StatelessWidget {
  final Event event;
  final String roleLabel;
  final VoidCallback? onAddActivity;

  const _EventCard({
    required this.event,
    required this.roleLabel,
    this.onAddActivity,
  });

  @override
  Widget build(BuildContext context) {
    final capacity = event.invitedGuests > 0
        ? event.invitedGuests
        : event.qrCodesCount;
    final progress = capacity == 0
        ? 0.0
        : (event.totalAdmissions / capacity).clamp(0.0, 1.0);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    event.name,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                _Pill('${event.activities.length} activities'),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(
                  Icons.group_outlined,
                  size: 16,
                  color: Colors.black45,
                ),
                const SizedBox(width: 6),
                Text(roleLabel, style: const TextStyle(color: Colors.black45)),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                const Icon(
                  Icons.calendar_month_outlined,
                  size: 18,
                  color: Colors.black54,
                ),
                const SizedBox(width: 6),
                Text(
                  event.startDate,
                  style: const TextStyle(color: Colors.black54),
                ),
                const Spacer(),
                const Icon(
                  Icons.location_on_outlined,
                  size: 18,
                  color: Colors.black54,
                ),
                const SizedBox(width: 6),
                Flexible(
                  child: Text(
                    event.location,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.black54),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 9,
                backgroundColor: brandNavy.withValues(alpha: 0.08),
                valueColor: const AlwaysStoppedAnimation<Color>(brandTeal),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _MiniMetric(
                    label: 'Admitted',
                    value: event.totalAdmissions,
                    color: brandTeal,
                  ),
                ),
                Expanded(
                  child: _MiniMetric(
                    label: 'QR codes',
                    value: event.qrCodesCount,
                    color: brandNavy,
                  ),
                ),
                Expanded(
                  child: _MiniMetric(
                    label: 'Rejected',
                    value: event.rejectedScans,
                    color: brandDarkRed,
                  ),
                ),
              ],
            ),
            if (onAddActivity != null) ...[
              const SizedBox(height: 4),
              const Divider(height: 1),
              Row(
                children: [
                  TextButton.icon(
                    onPressed: onAddActivity,
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add activity'),
                    style: TextButton.styleFrom(
                      foregroundColor: brandNavy,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 4,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _PickerCard extends StatelessWidget {
  final String label;
  final Widget child;
  final bool muted;

  const _PickerCard({
    required this.label,
    required this.child,
    this.muted = false,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: muted ? Colors.white.withValues(alpha: 0.62) : Colors.white,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(color: Colors.black45, fontSize: 15),
            ),
            child,
          ],
        ),
      ),
    );
  }
}

class _OverviewStat {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _OverviewStat(this.icon, this.label, this.value, this.color);
}

class _OverviewCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final List<_OverviewStat> stats;
  final Widget? action;

  const _OverviewCard({
    required this.title,
    required this.subtitle,
    required this.stats,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          color: Colors.black54,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.insights_outlined, color: brandRed),
              ],
            ),
            const SizedBox(height: 16),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: stats.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 2.25,
              ),
              itemBuilder: (context, index) {
                final stat = stats[index];
                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: stat.color.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: stat.color.withValues(alpha: 0.10),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(stat.icon, color: stat.color, size: 22),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              stat.value,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              stat.label,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.black54,
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            if (action != null) ...[const SizedBox(height: 14), action!],
          ],
        ),
      ),
    );
  }
}

class _ReportHero extends StatelessWidget {
  final Event event;
  final double progress;
  final int capacity;
  final int totalQrCodes;
  final int totalScans;
  final Activity? busiestActivity;

  const _ReportHero({
    required this.event,
    required this.progress,
    required this.capacity,
    required this.totalQrCodes,
    required this.totalScans,
    required this.busiestActivity,
  });

  @override
  Widget build(BuildContext context) {
    final percent = (progress * 100).round();

    return Card(
      color: brandNavy,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    event.name,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                _Pill(
                  '${event.activities.length} activities',
                  color: brandGold,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${event.startDate}${event.endDate == null ? '' : ' to ${event.endDate}'} - ${event.location.isEmpty ? 'No location' : event.location}',
              style: const TextStyle(
                color: Colors.white70,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 18),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 12,
                backgroundColor: Colors.white.withValues(alpha: 0.16),
                valueColor: const AlwaysStoppedAnimation<Color>(brandGold),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              capacity == 0
                  ? '$percent% checked in'
                  : '${event.totalAdmissions} of $capacity expected admissions',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _DarkMetric(
                    label: 'Scans',
                    value: '${event.totalScans}',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _DarkMetric(
                    label: 'QR codes',
                    value: '${event.qrCodesCount}',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _DarkMetric(
                    label: 'Rejected',
                    value: '${event.rejectedScans}',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              busiestActivity == null
                  ? 'No activity data yet.'
                  : 'Busiest activity: ${busiestActivity!.name} (${busiestActivity!.totalAdmissions} admissions)',
              style: const TextStyle(
                color: Colors.white70,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'All report totals: $totalScans scans across $totalQrCodes QR codes.',
              style: const TextStyle(
                color: Colors.white54,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DarkMetric extends StatelessWidget {
  final String label;
  final String value;

  const _DarkMetric({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActivityReportCard extends StatelessWidget {
  final Activity activity;

  const _ActivityReportCard({required this.activity});

  @override
  Widget build(BuildContext context) {
    final denominator = activity.totalAdmissions + activity.rejectedScans;
    final approvalRate = denominator == 0
        ? 0.0
        : (activity.totalAdmissions / denominator).clamp(0.0, 1.0);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    activity.name,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                _Pill(
                  activity.isActive ? 'Active' : 'Paused',
                  color: activity.isActive ? brandTeal : brandDarkRed,
                ),
              ],
            ),
            if (activity.day != null || activity.startTime != null) ...[
              const SizedBox(height: 6),
              Text(
                [
                  if (activity.day != null) 'Day ${activity.day}',
                  if (activity.startTime != null) activity.startTime!,
                  if (activity.endTime != null) activity.endTime!,
                ].join(' - '),
                style: const TextStyle(
                  color: Colors.black54,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
            const SizedBox(height: 14),
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: approvalRate,
                minHeight: 10,
                backgroundColor: brandRed.withValues(alpha: 0.12),
                valueColor: const AlwaysStoppedAnimation<Color>(brandTeal),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _MiniMetric(
                    label: 'Admissions',
                    value: activity.totalAdmissions,
                    color: brandTeal,
                  ),
                ),
                Expanded(
                  child: _MiniMetric(
                    label: 'Scans',
                    value: activity.totalScans,
                    color: brandNavy,
                  ),
                ),
                Expanded(
                  child: _MiniMetric(
                    label: 'Unique',
                    value: activity.uniqueCodes,
                    color: brandGold,
                  ),
                ),
                Expanded(
                  child: _MiniMetric(
                    label: 'Rejected',
                    value: activity.rejectedScans,
                    color: brandDarkRed,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MiniMetric extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _MiniMetric({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          '$value',
          style: TextStyle(
            color: color,
            fontSize: 19,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Colors.black54,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _UserCard extends StatelessWidget {
  final String name;
  final String email;
  final String role;
  final Color roleColor;

  const _UserCard({
    required this.name,
    required this.email,
    required this.role,
    required this.roleColor,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(
          radius: 28,
          backgroundColor: Colors.blue.shade50,
          foregroundColor: Colors.blue.shade800,
          child: const Icon(Icons.how_to_reg_outlined),
        ),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w900)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(email),
            const SizedBox(height: 4),
            _Pill(role, color: roleColor),
          ],
        ),
        trailing: IconButton(
          onPressed: null,
          icon: const Icon(Icons.edit_outlined),
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionTile({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: ListTile(
        leading: Icon(icon, color: color),
        title: Text(
          label,
          style: TextStyle(color: color, fontWeight: FontWeight.w800),
        ),
        onTap: onTap,
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String label;
  final Color? color;

  const _Pill(this.label, {this.color});

  @override
  Widget build(BuildContext context) {
    final tint = color ?? Colors.blueGrey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: tint,
          fontWeight: FontWeight.w800,
          fontSize: 12,
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String text;

  const _EmptyState({
    required this.icon,
    required this.title,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 120),
      child: Column(
        children: [
          Icon(icon, size: 64, color: Colors.grey.shade300),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
          ),
          const SizedBox(height: 8),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black54),
          ),
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  final IconData icon;
  final String text;
  final Future<void> Function() onRetry;

  const _Message({
    required this.icon,
    required this.text,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: [
        const SizedBox(height: 120),
        Icon(icon, size: 64, color: Colors.black26),
        const SizedBox(height: 16),
        Text(
          text,
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 16),
        Center(
          child: OutlinedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ),
      ],
    );
  }
}

class _AdminFormSheet extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String submitLabel;
  final String busyLabel;
  final bool busy;
  final VoidCallback onCancel;
  final VoidCallback? onSubmit;
  final Widget child;

  const _AdminFormSheet({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.submitLabel,
    required this.busyLabel,
    required this.busy,
    required this.onCancel,
    required this.onSubmit,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      padding: EdgeInsets.only(bottom: bottomInset),
      child: FractionallySizedBox(
        alignment: Alignment.bottomCenter,
        heightFactor: 0.92,
        child: Material(
          color: surfaceCool,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
          clipBehavior: Clip.antiAlias,
          child: SafeArea(
            top: false,
            child: Column(
              children: [
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 10, 8, 14),
                  child: Column(
                    children: [
                      Container(
                        width: 42,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.black12,
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: brandRed.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Icon(icon, color: brandRed),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 21,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  subtitle,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Colors.black54,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            onPressed: busy ? null : onCancel,
                            icon: const Icon(Icons.close),
                            tooltip: 'Close',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    keyboardDismissBehavior:
                        ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                    child: child,
                  ),
                ),
                Container(
                  color: Colors.white,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: busy ? null : onCancel,
                          child: const Text('Cancel'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: onSubmit,
                          icon: busy
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.4,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.check),
                          label: Text(busy ? busyLabel : submitLabel),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FormSection extends StatelessWidget {
  final IconData icon;
  final String title;
  final Widget? trailing;
  final List<Widget> children;

  const _FormSection({
    required this.icon,
    required this.title,
    required this.children,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: brandNavy.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: brandNavy.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: brandNavy, size: 19),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              if (trailing != null) trailing!,
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }
}

class _SwitchRow extends StatelessWidget {
  final bool value;
  final ValueChanged<bool>? onChanged;
  final IconData icon;
  final String title;

  const _SwitchRow({
    required this.value,
    required this.onChanged,
    required this.icon,
    required this.title,
  });

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: surfaceCool,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: brandNavy.withValues(alpha: 0.08)),
      ),
      child: SwitchListTile.adaptive(
        value: value,
        onChanged: onChanged,
        contentPadding: const EdgeInsets.only(left: 12, right: 8),
        activeThumbColor: brandRed,
        secondary: Icon(
          icon,
          color: onChanged == null ? Colors.black26 : brandNavy,
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }
}

class _InlineNotice extends StatelessWidget {
  final IconData icon;
  final String text;

  const _InlineNotice({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: brandGold.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: brandGold.withValues(alpha: 0.20)),
      ),
      child: Row(
        children: [
          Icon(icon, color: brandGold),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: Colors.black54,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EventAccessTile extends StatelessWidget {
  final Event event;
  final bool selected;
  final ValueChanged<bool> onChanged;

  const _EventAccessTile({
    required this.event,
    required this.selected,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? brandRed.withValues(alpha: 0.07) : surfaceCool,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        borderRadius: BorderRadius.circular(8),
        onTap: () => onChanged(!selected),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(8, 10, 12, 10),
          child: Row(
            children: [
              Checkbox(
                value: selected,
                activeColor: brandRed,
                onChanged: (value) => onChanged(value ?? false),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      event.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      [
                        event.startDate,
                        if (event.location.isNotEmpty) event.location,
                      ].join(' - '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.black54,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              _Pill('${event.activities.length}', color: brandNavy),
            ],
          ),
        ),
      ),
    );
  }
}

Future<void> _showEventDialog(
  BuildContext context,
  Future<void> Function() onSaved,
) async {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController();
  final location = TextEditingController();
  final startDate = TextEditingController(
    text: DateTime.now().toIso8601String().substring(0, 10),
  );
  final endDate = TextEditingController();
  final invitedGuests = TextEditingController();
  final activityName = TextEditingController(text: 'Main Entrance');
  bool busy = false;
  bool multiDay = false;

  final created = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (context) => StatefulBuilder(
      builder: (context, setDialogState) {
        Future<void> pickDate(TextEditingController controller) async {
          await _pickDate(context, controller);
          setDialogState(() {});
        }

        return _AdminFormSheet(
          icon: Icons.event_available_outlined,
          title: 'Create event',
          subtitle: 'Details, schedule, and first scanner activity',
          submitLabel: 'Create event',
          busyLabel: 'Creating...',
          busy: busy,
          onCancel: () => Navigator.pop(context, false),
          onSubmit: busy
              ? null
              : () async {
                  if (!(formKey.currentState?.validate() ?? false)) return;
                  setDialogState(() => busy = true);
                  try {
                    final guests = int.tryParse(invitedGuests.text.trim());
                    await api.createEvent({
                      'name': name.text.trim(),
                      'location': location.text.trim(),
                      'start_date': startDate.text.trim(),
                      'end_date': multiDay && endDate.text.trim().isNotEmpty
                          ? endDate.text.trim()
                          : null,
                      'is_multi_day': multiDay,
                      'invited_guests': guests,
                      'activities': [
                        if (activityName.text.trim().isNotEmpty)
                          {'name': activityName.text.trim()},
                      ],
                    });
                    if (context.mounted) Navigator.pop(context, true);
                  } catch (e) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(
                      context,
                    ).showSnackBar(SnackBar(content: Text(e.toString())));
                    setDialogState(() => busy = false);
                  }
                },
          child: Form(
            key: formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _FormSection(
                  icon: Icons.edit_calendar_outlined,
                  title: 'Event details',
                  children: [
                    TextFormField(
                      controller: name,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Event name',
                        prefixIcon: Icon(Icons.event_outlined),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                          ? 'Required'
                          : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: location,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Location',
                        prefixIcon: Icon(Icons.location_on_outlined),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                          ? 'Required'
                          : null,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _FormSection(
                  icon: Icons.calendar_month_outlined,
                  title: 'Schedule',
                  children: [
                    TextFormField(
                      controller: startDate,
                      readOnly: true,
                      onTap: () => pickDate(startDate),
                      decoration: InputDecoration(
                        labelText: 'Start date',
                        prefixIcon: const Icon(Icons.calendar_today_outlined),
                        suffixIcon: IconButton(
                          onPressed: () => pickDate(startDate),
                          icon: const Icon(Icons.edit_calendar_outlined),
                          tooltip: 'Choose date',
                        ),
                      ),
                      validator: _dateValidator,
                    ),
                    const SizedBox(height: 12),
                    _SwitchRow(
                      value: multiDay,
                      onChanged: (value) => setDialogState(() {
                        multiDay = value;
                        if (value && endDate.text.trim().isEmpty) {
                          endDate.text = startDate.text;
                        }
                      }),
                      icon: Icons.date_range_outlined,
                      title: 'Multi-day event',
                    ),
                    if (multiDay) ...[
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: endDate,
                        readOnly: true,
                        onTap: () => pickDate(endDate),
                        decoration: InputDecoration(
                          labelText: 'End date',
                          prefixIcon: const Icon(
                            Icons.event_available_outlined,
                          ),
                          suffixIcon: IconButton(
                            onPressed: () => pickDate(endDate),
                            icon: const Icon(Icons.edit_calendar_outlined),
                            tooltip: 'Choose date',
                          ),
                        ),
                        validator: (value) {
                          if (!multiDay ||
                              value == null ||
                              value.trim().isEmpty) {
                            return null;
                          }
                          return _dateValidator(value);
                        },
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 12),
                _FormSection(
                  icon: Icons.fact_check_outlined,
                  title: 'Guest access',
                  children: [
                    TextFormField(
                      controller: invitedGuests,
                      keyboardType: TextInputType.number,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Invited guests',
                        prefixIcon: Icon(Icons.groups_outlined),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: activityName,
                      textInputAction: TextInputAction.done,
                      decoration: const InputDecoration(
                        labelText: 'First activity',
                        prefixIcon: Icon(Icons.qr_code_scanner),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    ),
  );

  name.dispose();
  location.dispose();
  startDate.dispose();
  endDate.dispose();
  invitedGuests.dispose();
  activityName.dispose();

  if (created == true) {
    await onSaved();
  }
}

Future<void> _showActivityDialog(
  BuildContext context,
  int eventId,
  Future<void> Function() onSaved,
) async {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController();
  final description = TextEditingController();
  String? startTime;
  String? endTime;
  bool sendWelcomeMessage = false;
  bool busy = false;

  final created = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (context) => StatefulBuilder(
      builder: (context, setDialogState) {
        Future<void> pickTime({required bool isStart}) async {
          final picked = await showTimePicker(
            context: context,
            initialTime: TimeOfDay.now(),
            builder: (context, child) => Theme(
              data: Theme.of(context).copyWith(
                colorScheme: Theme.of(context).colorScheme.copyWith(
                  primary: brandRed,
                ),
              ),
              child: child ?? const SizedBox.shrink(),
            ),
          );
          if (picked != null) {
            final formatted =
                '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
            setDialogState(() {
              if (isStart) {
                startTime = formatted;
              } else {
                endTime = formatted;
              }
            });
          }
        }

        return _AdminFormSheet(
          icon: Icons.timeline_outlined,
          title: 'Add Activity',
          subtitle: 'Define a scanner checkpoint for this event',
          submitLabel: 'Save',
          busyLabel: 'Saving...',
          busy: busy,
          onCancel: () => Navigator.pop(context, false),
          onSubmit: busy
              ? null
              : () async {
                  if (!(formKey.currentState?.validate() ?? false)) return;
                  setDialogState(() => busy = true);
                  try {
                    await api.createActivity(eventId, {
                      'name': name.text.trim(),
                      if (description.text.trim().isNotEmpty)
                        'description': description.text.trim(),
                      'start_time': startTime,
                      'end_time': endTime,
                      'send_welcome_message': sendWelcomeMessage,
                    });
                    if (context.mounted) Navigator.pop(context, true);
                  } catch (e) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.toString())),
                    );
                    setDialogState(() => busy = false);
                  }
                },
          child: Form(
            key: formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _FormSection(
                  icon: Icons.edit_outlined,
                  title: 'Activity details',
                  children: [
                    TextFormField(
                      controller: name,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Activity Name *',
                        prefixIcon: Icon(Icons.label_outline),
                      ),
                      validator: (value) =>
                          value == null || value.trim().isEmpty
                              ? 'Required'
                              : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: description,
                      maxLines: 3,
                      textInputAction: TextInputAction.next,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        hintText: 'Activity description',
                        prefixIcon: Icon(Icons.notes_outlined),
                        alignLabelWithHint: true,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _FormSection(
                  icon: Icons.access_time_outlined,
                  title: 'Schedule',
                  children: [
                    // Start Time
                    InkWell(
                      onTap: () => pickTime(isStart: true),
                      borderRadius: BorderRadius.circular(8),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Start Time *',
                          prefixIcon: Icon(Icons.schedule_outlined),
                          border: OutlineInputBorder(),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              startTime ?? '-- : --',
                              style: TextStyle(
                                color: startTime == null
                                    ? Colors.black45
                                    : Colors.black87,
                              ),
                            ),
                            const Icon(
                              Icons.arrow_drop_down,
                              color: Colors.black45,
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // End Time
                    InkWell(
                      onTap: () => pickTime(isStart: false),
                      borderRadius: BorderRadius.circular(8),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'End Time',
                          prefixIcon: Icon(Icons.schedule_outlined),
                          border: OutlineInputBorder(),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              endTime ?? '-- : --',
                              style: TextStyle(
                                color: endTime == null
                                    ? Colors.black45
                                    : Colors.black87,
                              ),
                            ),
                            const Icon(
                              Icons.arrow_drop_down,
                              color: Colors.black45,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _FormSection(
                  icon: Icons.mark_email_read_outlined,
                  title: 'Send Welcome Message',
                  children: [
                    _SwitchRow(
                      value: sendWelcomeMessage,
                      onChanged: (v) =>
                          setDialogState(() => sendWelcomeMessage = v),
                      icon: Icons.email_outlined,
                      title: 'Automatically send a welcome message to guests'
                          ' when they scan their QR code',
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    ),
  );

  name.dispose();
  description.dispose();

  if (created == true) {
    await onSaved();
  }
}

Future<void> _showUserDialog(
  BuildContext context, {
  AppUser? user,
  required List<Event> events,
  required Future<void> Function() onSaved,
}) async {
  final formKey = GlobalKey<FormState>();
  final name = TextEditingController(text: user?.name ?? '');
  final email = TextEditingController(text: user?.email ?? '');
  final password = TextEditingController();
  var role = user?.role ?? 'staff';
  var scannerEnabled = user?.scannerEnabled ?? true;
  final selectedEventIds = <int>{...(user?.assignedEventIds ?? const [])};
  bool busy = false;
  bool passwordVisible = false;

  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (context) => StatefulBuilder(
      builder: (context, setDialogState) => _AdminFormSheet(
        icon: user == null ? Icons.person_add_alt_1 : Icons.manage_accounts,
        title: user == null ? 'Add user' : 'Edit user',
        subtitle: role == 'admin'
            ? 'Administrator account'
            : 'Staff scanner account',
        submitLabel: user == null ? 'Create user' : 'Save changes',
        busyLabel: 'Saving...',
        busy: busy,
        onCancel: () => Navigator.pop(context, false),
        onSubmit: busy
            ? null
            : () async {
                if (!(formKey.currentState?.validate() ?? false)) return;
                setDialogState(() => busy = true);
                final payload = <String, dynamic>{
                  'name': name.text.trim(),
                  'email': email.text.trim().toLowerCase(),
                  'role': role,
                  'scanner_enabled': role == 'admin' ? true : scannerEnabled,
                  'event_ids': role == 'staff'
                      ? selectedEventIds.toList()
                      : <int>[],
                };
                if (password.text.isNotEmpty) {
                  payload['password'] = password.text;
                }

                try {
                  if (user == null) {
                    await api.createUser(payload);
                  } else {
                    await api.updateUser(user.id, payload);
                  }
                  if (context.mounted) Navigator.pop(context, true);
                } catch (e) {
                  if (!context.mounted) return;
                  ScaffoldMessenger.of(
                    context,
                  ).showSnackBar(SnackBar(content: Text(e.toString())));
                  setDialogState(() => busy = false);
                }
              },
        child: Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _FormSection(
                icon: Icons.account_circle_outlined,
                title: 'Profile',
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: role == 'admin'
                            ? brandRed.withValues(alpha: 0.12)
                            : brandTeal.withValues(alpha: 0.12),
                        foregroundColor: role == 'admin' ? brandRed : brandTeal,
                        child: Text(
                          name.text.trim().isEmpty
                              ? '?'
                              : name.text.trim()[0].toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name.text.trim().isEmpty
                                  ? 'New user'
                                  : name.text.trim(),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 4),
                            _Pill(
                              role == 'admin'
                                  ? 'Administrator'
                                  : 'Staff scanner',
                              color: role == 'admin' ? brandRed : brandTeal,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: name,
                    textInputAction: TextInputAction.next,
                    onChanged: (_) => setDialogState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Full name',
                      prefixIcon: Icon(Icons.badge_outlined),
                    ),
                    validator: (value) => value == null || value.trim().isEmpty
                        ? 'Required'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                    validator: (value) {
                      final text = value?.trim() ?? '';
                      if (text.isEmpty) return 'Required';
                      return text.contains('@') ? null : 'Enter a valid email';
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: password,
                    obscureText: !passwordVisible,
                    decoration: InputDecoration(
                      labelText: user == null
                          ? 'Password'
                          : 'New password (optional)',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        onPressed: () => setDialogState(
                          () => passwordVisible = !passwordVisible,
                        ),
                        icon: Icon(
                          passwordVisible
                              ? Icons.visibility_off_outlined
                              : Icons.visibility_outlined,
                        ),
                        tooltip: passwordVisible
                            ? 'Hide password'
                            : 'Show password',
                      ),
                    ),
                    validator: (value) {
                      final text = value ?? '';
                      if (user == null && text.length < 8) {
                        return 'Minimum 8 characters';
                      }
                      if (user != null && text.isNotEmpty && text.length < 8) {
                        return 'Minimum 8 characters';
                      }
                      return null;
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _FormSection(
                icon: Icons.admin_panel_settings_outlined,
                title: 'Access',
                children: [
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment<String>(
                        value: 'staff',
                        icon: Icon(Icons.qr_code_scanner),
                        label: Text('Staff'),
                      ),
                      ButtonSegment<String>(
                        value: 'admin',
                        icon: Icon(Icons.admin_panel_settings_outlined),
                        label: Text('Admin'),
                      ),
                    ],
                    selected: {role},
                    onSelectionChanged: (selection) => setDialogState(() {
                      role = selection.first;
                      if (role == 'admin') scannerEnabled = true;
                    }),
                    style: ButtonStyle(
                      visualDensity: VisualDensity.compact,
                      side: WidgetStatePropertyAll(
                        BorderSide(color: brandNavy.withValues(alpha: 0.16)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  _SwitchRow(
                    value: role == 'admin' ? true : scannerEnabled,
                    onChanged: role == 'admin'
                        ? null
                        : (value) =>
                              setDialogState(() => scannerEnabled = value),
                    icon: Icons.qr_code_2_outlined,
                    title: 'Scanner access',
                  ),
                ],
              ),
              if (role == 'staff') ...[
                const SizedBox(height: 12),
                _FormSection(
                  icon: Icons.event_available_outlined,
                  title: 'Event access',
                  trailing: events.isEmpty
                      ? null
                      : _Pill('${selectedEventIds.length} selected'),
                  children: [
                    if (events.isEmpty)
                      _InlineNotice(
                        icon: Icons.event_busy_outlined,
                        text: 'No events available yet.',
                      )
                    else ...[
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          TextButton.icon(
                            onPressed: () => setDialogState(() {
                              selectedEventIds
                                ..clear()
                                ..addAll(events.map((event) => event.id));
                            }),
                            style: TextButton.styleFrom(
                              foregroundColor: brandNavy,
                              minimumSize: const Size(0, 40),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 10,
                              ),
                              shape: const RoundedRectangleBorder(
                                borderRadius: BorderRadius.all(
                                  Radius.circular(8),
                                ),
                              ),
                            ),
                            icon: const Icon(Icons.done_all, size: 18),
                            label: const Text('All'),
                          ),
                          TextButton.icon(
                            onPressed: selectedEventIds.isEmpty
                                ? null
                                : () => setDialogState(selectedEventIds.clear),
                            style: TextButton.styleFrom(
                              foregroundColor: brandNavy,
                              minimumSize: const Size(0, 40),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 10,
                              ),
                              shape: const RoundedRectangleBorder(
                                borderRadius: BorderRadius.all(
                                  Radius.circular(8),
                                ),
                              ),
                            ),
                            icon: const Icon(Icons.clear_all, size: 18),
                            label: const Text('Clear'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      for (final event in events) ...[
                        _EventAccessTile(
                          event: event,
                          selected: selectedEventIds.contains(event.id),
                          onChanged: (checked) => setDialogState(() {
                            if (checked) {
                              selectedEventIds.add(event.id);
                            } else {
                              selectedEventIds.remove(event.id);
                            }
                          }),
                        ),
                        if (event != events.last) const SizedBox(height: 8),
                      ],
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    ),
  );

  name.dispose();
  email.dispose();
  password.dispose();

  if (saved == true) {
    await onSaved();
  }
}

Future<void> _confirmDeleteUser(
  BuildContext context,
  AppUser user,
  Future<void> Function() onDeleted,
) async {
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Delete user'),
      content: Text(
        'Delete ${user.name}? This removes the account and event assignments.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: brandDarkRed),
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Delete'),
        ),
      ],
    ),
  );

  if (confirmed != true) return;

  try {
    await api.deleteUser(user.id);
    await onDeleted();
  } catch (e) {
    if (!context.mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(e.toString())));
  }
}

Future<void> _pickDate(
  BuildContext context,
  TextEditingController controller,
) async {
  final now = DateTime.now();
  final initialDate = _parseDate(controller.text) ?? now;
  final picked = await showDatePicker(
    context: context,
    initialDate: initialDate,
    firstDate: DateTime(now.year - 2),
    lastDate: DateTime(now.year + 8),
    builder: (context, child) {
      return Theme(
        data: Theme.of(context).copyWith(
          colorScheme: Theme.of(
            context,
          ).colorScheme.copyWith(primary: brandRed, secondary: brandTeal),
        ),
        child: child ?? const SizedBox.shrink(),
      );
    },
  );
  if (picked != null) {
    controller.text = _formatDate(picked);
  }
}

DateTime? _parseDate(String value) {
  final text = value.trim();
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(text)) return null;
  return DateTime.tryParse(text);
}

String _formatDate(DateTime date) {
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  return '${date.year}-$month-$day';
}

String? _dateValidator(String? value) {
  final text = value?.trim() ?? '';
  if (text.isEmpty) return 'Required';
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(text)) {
    return 'Use YYYY-MM-DD';
  }
  return _parseDate(text) == null ? 'Enter a valid date' : null;
}

Event? _findEvent(List<Event> events, int? id) {
  if (id == null) return null;
  for (final event in events) {
    if (event.id == id) return event;
  }
  return null;
}

Activity? _findActivity(List<Activity> activities, int? id) {
  if (id == null) return null;
  for (final activity in activities) {
    if (activity.id == id) return activity;
  }
  return null;
}

enum _HomeTabKind { events, scanner, reports, qrCodes, users, profile }

class _HomeTab {
  final _HomeTabKind kind;
  final String label;
  final String title;
  final IconData icon;

  const _HomeTab(this.kind, this.label, this.title, this.icon);
}

const _adminTabs = [
  _HomeTab(
    _HomeTabKind.events,
    'Events',
    'Events',
    Icons.calendar_month_outlined,
  ),
  _HomeTab(
    _HomeTabKind.scanner,
    'Scanner',
    'QR Scanner',
    Icons.qr_code_scanner,
  ),
  _HomeTab(_HomeTabKind.reports, 'Reports', 'Reports', Icons.bar_chart),
  _HomeTab(
    _HomeTabKind.qrCodes,
    'QR Codes',
    'QR Codes',
    Icons.inventory_2_outlined,
  ),
  _HomeTab(
    _HomeTabKind.users,
    'Users',
    'User Management',
    Icons.group_outlined,
  ),
];

const _staffTabs = [
  _HomeTab(
    _HomeTabKind.events,
    'Events',
    'Events',
    Icons.calendar_month_outlined,
  ),
  _HomeTab(
    _HomeTabKind.scanner,
    'Scanner',
    'QR Scanner',
    Icons.qr_code_scanner,
  ),
  _HomeTab(_HomeTabKind.reports, 'Reports', 'Reports', Icons.bar_chart),
  _HomeTab(_HomeTabKind.profile, 'Profile', 'Profile', Icons.group_outlined),
];
