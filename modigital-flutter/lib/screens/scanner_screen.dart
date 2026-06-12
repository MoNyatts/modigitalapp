import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../api.dart';
import '../main.dart';
import '../models.dart';

/// Scan QR codes for one event activity, with a live multi-device feed.
class ScannerScreen extends StatefulWidget {
  final Event event;
  final Activity activity;

  const ScannerScreen({super.key, required this.event, required this.activity});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final MobileScannerController _camera = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    formats: const [BarcodeFormat.qrCode],
  );

  bool _processing = false;
  Feed? _feed;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _loadFeed();
    // Poll every 5 s so this device sees admissions from other scanners.
    _poll = Timer.periodic(const Duration(seconds: 5), (_) => _loadFeed());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _camera.dispose();
    super.dispose();
  }

  Future<void> _loadFeed() async {
    try {
      final feed = await api.feed(widget.activity.id);
      if (mounted) setState(() => _feed = feed);
    } catch (_) {
      // Keep last known feed when offline; scanning still surfaces errors.
    }
  }

  Future<void> _handleDetection(BarcodeCapture capture) async {
    if (_processing) return;
    final raw = capture.barcodes.firstOrNull?.rawValue;
    if (raw == null || raw.isEmpty) return;

    await _submit(raw);
  }

  Future<void> _submit(String qrData, {int admissionCount = 1}) async {
    setState(() => _processing = true);

    ScanResult result;
    try {
      result = await api.scan(qrData, widget.activity.id, admissionCount: admissionCount);
    } catch (e) {
      result = ScanResult(success: false, message: e.toString(), remaining: 0, maxAdmissions: 0);
    }

    await _loadFeed();
    if (!mounted) return;

    await showDialog<void>(
      context: context,
      builder: (_) => _ResultDialog(result: result),
    );

    if (mounted) setState(() => _processing = false);
  }

  Future<void> _manualEntry() async {
    final controller = TextEditingController();
    int count = 1;

    final submitted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Manual entry'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: controller,
                autofocus: true,
                textCapitalization: TextCapitalization.characters,
                decoration: const InputDecoration(
                  labelText: 'Code (e.g. S001) or QR hash',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Guests: '),
                  IconButton(
                    onPressed: count > 1 ? () => setDialogState(() => count--) : null,
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  Text('$count', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(
                    onPressed: () => setDialogState(() => count++),
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(100, 44)),
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Check in'),
            ),
          ],
        ),
      ),
    );

    if (submitted == true && controller.text.trim().isNotEmpty) {
      await _submit(controller.text.trim(), admissionCount: count);
    }
  }

  @override
  Widget build(BuildContext context) {
    final feed = _feed;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.event.name, style: const TextStyle(fontSize: 16)),
            Text(widget.activity.name, style: const TextStyle(fontSize: 12, color: Colors.white70)),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () => _camera.toggleTorch(),
            icon: const Icon(Icons.flashlight_on_outlined),
            tooltip: 'Torch',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 5,
            child: Stack(
              fit: StackFit.expand,
              children: [
                MobileScanner(controller: _camera, onDetect: _handleDetection),
                IgnorePointer(
                  child: Center(
                    child: Container(
                      width: 230,
                      height: 230,
                      decoration: BoxDecoration(
                        border: Border.all(color: brandRed, width: 3),
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                  ),
                ),
                if (_processing)
                  Container(
                    color: Colors.black45,
                    alignment: Alignment.center,
                    child: const CircularProgressIndicator(color: Colors.white),
                  ),
                Positioned(
                  bottom: 12,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: FilledButton.tonalIcon(
                      onPressed: _manualEntry,
                      icon: const Icon(Icons.keyboard),
                      label: const Text('Manual entry'),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            flex: 4,
            child: Container(
              color: const Color(0xFFF9FAFB),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(10),
                    child: Row(
                      children: [
                        _Stat(label: 'Admitted', value: feed?.totalAdmissions ?? 0, color: Colors.green),
                        _Stat(label: 'Scans', value: feed?.totalScans ?? 0, color: brandNavy),
                        _Stat(label: 'Codes', value: feed?.uniqueCodes ?? 0, color: brandRed),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: feed == null
                        ? const Center(child: CircularProgressIndicator())
                        : feed.scans.isEmpty
                            ? const Center(
                                child: Text('No admissions yet — scans from all devices appear here.',
                                    style: TextStyle(color: Colors.black54)))
                            : ListView.separated(
                                itemCount: feed.scans.length,
                                separatorBuilder: (context, index) => const Divider(height: 1),
                                itemBuilder: (context, i) {
                                  final scan = feed.scans[i];
                                  return ListTile(
                                    dense: true,
                                    leading: CircleAvatar(
                                      radius: 16,
                                      backgroundColor: Colors.green.shade50,
                                      child: Text('${scan.admissionCount}',
                                          style: TextStyle(
                                              color: Colors.green.shade700, fontWeight: FontWeight.bold)),
                                    ),
                                    title: Text('${scan.code} — ${scan.guestName}',
                                        style: const TextStyle(fontSize: 14)),
                                    subtitle: Text('by ${scan.scannedBy}', style: const TextStyle(fontSize: 12)),
                                    trailing: Text(TimeOfDay.fromDateTime(scan.scannedAt.toLocal()).format(context),
                                        style: const TextStyle(color: Colors.black45, fontSize: 12)),
                                  );
                                },
                              ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final int value;
  final Color color;

  const _Stat({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text('$value', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: color)),
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
        ],
      ),
    );
  }
}

class _ResultDialog extends StatelessWidget {
  final ScanResult result;

  const _ResultDialog({required this.result});

  @override
  Widget build(BuildContext context) {
    final ok = result.success;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      icon: Icon(
        ok ? Icons.check_circle : Icons.cancel,
        size: 64,
        color: ok ? Colors.green : brandRed,
      ),
      title: Text(ok ? 'Admitted' : 'Rejected'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (result.guestName != null)
            Text(result.guestName!,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
          const SizedBox(height: 6),
          Text(result.message, textAlign: TextAlign.center),
          if (ok && result.maxAdmissions > 1) ...[
            const SizedBox(height: 6),
            Text('${result.remaining} of ${result.maxAdmissions} admissions remaining',
                style: const TextStyle(color: Colors.black54)),
          ],
        ],
      ),
      actions: [
        FilledButton(
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            backgroundColor: ok ? Colors.green : brandRed,
          ),
          onPressed: () => Navigator.pop(context),
          child: const Text('Continue scanning'),
        ),
      ],
    );
  }
}
