import 'package:flutter/material.dart';

import '../api.dart';
import '../models.dart';
import 'login_screen.dart';
import 'scanner_screen.dart';

/// Pick an event and activity, then start scanning.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<List<Event>> _events;

  @override
  void initState() {
    super.initState();
    _events = api.events();
  }

  Future<void> _refresh() async {
    setState(() => _events = api.events());
    await _events;
  }

  Future<void> _logout() async {
    await api.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Event'),
        actions: [
          IconButton(onPressed: _logout, icon: const Icon(Icons.logout), tooltip: 'Sign out'),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<Event>>(
          future: _events,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snapshot.hasError) {
              return _Message(
                icon: Icons.cloud_off,
                text: 'Could not load events\n${snapshot.error}',
                onRetry: _refresh,
              );
            }

            final events = snapshot.data ?? [];
            if (events.isEmpty) {
              return _Message(
                icon: Icons.event_busy,
                text: 'No events assigned to you yet.\nAsk an administrator to assign you.',
                onRetry: _refresh,
              );
            }

            return ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(12),
              itemCount: events.length,
              itemBuilder: (context, i) {
                final event = events[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ExpansionTile(
                    title: Text(event.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('${event.location} · ${event.startDate}'),
                    leading: const CircleAvatar(child: Icon(Icons.event)),
                    children: [
                      if (event.activities.isEmpty)
                        const ListTile(
                          dense: true,
                          title: Text('No activities — ask an admin to add one.',
                              style: TextStyle(color: Colors.black54)),
                        ),
                      for (final activity in event.activities)
                        ListTile(
                          leading: const Icon(Icons.qr_code_scanner),
                          title: Text(activity.name),
                          subtitle: activity.day != null ? Text('Day ${activity.day}') : null,
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ScannerScreen(event: event, activity: activity),
                            ),
                          ),
                        ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  final IconData icon;
  final String text;
  final Future<void> Function() onRetry;

  const _Message({required this.icon, required this.text, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        const SizedBox(height: 120),
        Icon(icon, size: 64, color: Colors.black26),
        const SizedBox(height: 16),
        Text(text, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
        const SizedBox(height: 16),
        Center(child: OutlinedButton(onPressed: onRetry, child: const Text('Retry'))),
      ],
    );
  }
}
