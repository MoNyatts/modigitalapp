import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:permission_handler/permission_handler.dart';

import '../api.dart';
import '../main.dart';
import '../models.dart';
import 'confirm_admission_screen.dart';

const _scanFeedbackChannel = MethodChannel('modigital_scanner/scan_feedback');

class ScannerScreen extends StatefulWidget {
  final Event event;
  final Activity activity;

  const ScannerScreen({super.key, required this.event, required this.activity});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen>
    with WidgetsBindingObserver {
  final MobileScannerController _camera = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    formats: const [BarcodeFormat.qrCode],
  );

  bool _processing = false;
  bool _cameraPermissionGranted = false;
  Feed? _feed;
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _requestCameraPermission();
    _loadFeed();
    _poll = Timer.periodic(const Duration(seconds: 5), (_) => _loadFeed());
  }

  // Called when this screen is pushed back onto the navigator stack.
  // Restart the camera without re-requesting permission.
  @override
  void activate() {
    super.activate();
    if (_cameraPermissionGranted) {
      _camera.start();
    }
  }

  // Called when the screen is removed from the tree (route pushed on top or popped).
  // Stop the camera here so MobileScanner's InheritedWidget dependents are
  // cleaned up before dispose() fires its ChangeNotifier callbacks.
  @override
  void deactivate() {
    _camera.stop();
    super.deactivate();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!mounted || !_cameraPermissionGranted) return;
    switch (state) {
      case AppLifecycleState.resumed:
        _camera.start();
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
        _camera.stop();
      default:
        break;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _poll?.cancel();
    // Camera was already stopped in deactivate(); dispose the controller.
    _camera.dispose();
    super.dispose();
  }

  Future<void> _requestCameraPermission() async {
    final status = await Permission.camera.request();
    if (mounted) {
      setState(() => _cameraPermissionGranted = status.isGranted);
    }
  }

  Future<void> _loadFeed() async {
    try {
      final feed = await api.feed(widget.activity.id);
      if (mounted) setState(() => _feed = feed);
    } catch (_) {}
  }

  // Camera detected a code — navigate to the confirm screen instead of
  // submitting immediately so the user can review and adjust admission count.
  Future<void> _handleDetection(BarcodeCapture capture) async {
    if (_processing) return;

    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null) return;

    final String? raw = barcode.rawValue;
    if (raw == null || raw.trim().isEmpty) return;

    setState(() => _processing = true);
    _camera.stop();

    if (!mounted) {
      // Widget disposed between stop and push — reset so next launch can scan.
      _processing = false;
      return;
    }

    bool admitted = false;
    try {
      admitted = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => ConfirmAdmissionScreen(
                event: widget.event,
                activity: widget.activity,
                qrCode: raw,
              ),
            ),
          ) ==
          true;
    } catch (_) {
      // Navigation failure — swallow so we can reset state below.
    }

    if (admitted) await _loadFeed();

    if (mounted) {
      setState(() => _processing = false);
      if (_cameraPermissionGranted) _camera.start();
    } else {
      _processing = false;
    }
  }

  Future<void> _playScanFeedback(bool valid) async {
    try {
      await _scanFeedbackChannel.invokeMethod<void>('play', {'valid': valid});
    } catch (_) {
      await SystemSound.play(SystemSoundType.click);
      if (!valid) {
        await Future<void>.delayed(const Duration(milliseconds: 90));
        await SystemSound.play(SystemSoundType.click);
      }
    }
    try {
      if (valid) {
        await HapticFeedback.mediumImpact();
      } else {
        await HapticFeedback.heavyImpact();
      }
    } catch (_) {}
  }

  Future<void> _manualEntry() async {
    final qrController = TextEditingController();
    final notesController = TextEditingController();
    int count = 1;
    bool submitting = false;

    final result = await showModalBottomSheet<ScanResult>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => StatefulBuilder(
        builder: (ctx, setSheetState) {
          Future<void> doSubmit() async {
            setSheetState(() => submitting = true);
            ScanResult scanResult;
            try {
              scanResult = await api.scan(
                qrController.text.trim(),
                widget.activity.id,
                admissionCount: count,
              );
            } catch (e) {
              scanResult = ScanResult(
                success: false,
                message: e.toString(),
                remaining: 0,
                maxAdmissions: 0,
              );
            }
            if (ctx.mounted) Navigator.pop(ctx, scanResult);
          }

          final canSubmit =
              qrController.text.trim().isNotEmpty && !submitting;

          return Padding(
            // Keyboard avoidance without AnimatedPadding / MediaQuery dependency
            padding: EdgeInsets.only(
              bottom: MediaQuery.viewInsetsOf(ctx).bottom,
            ),
            child: FractionallySizedBox(
              heightFactor: 0.92,
              alignment: Alignment.bottomCenter,
              child: Material(
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(16)),
                clipBehavior: Clip.antiAlias,
                child: SafeArea(
                  top: false,
                  child: Column(
                    children: [
                      Container(
                        width: 40,
                        height: 4,
                        margin: const EdgeInsets.only(top: 12),
                        decoration: BoxDecoration(
                          color: Colors.black12,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 16, 8, 4),
                        child: Row(
                          children: [
                            const Text(
                              'Scan QR Code',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const Spacer(),
                            IconButton(
                              onPressed: () => Navigator.pop(ctx),
                              icon: const Icon(Icons.close),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: SingleChildScrollView(
                          keyboardDismissBehavior:
                              ScrollViewKeyboardDismissBehavior.onDrag,
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              OutlinedButton.icon(
                                onPressed: () => Navigator.pop(ctx),
                                icon: const Icon(Icons.qr_code_scanner),
                                label: const Text('Open Camera'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: brandNavy,
                                  side: const BorderSide(color: brandNavy),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 14,
                                  ),
                                ),
                              ),
                              const Padding(
                                padding: EdgeInsets.symmetric(vertical: 18),
                                child: Row(
                                  children: [
                                    Expanded(child: Divider()),
                                    Padding(
                                      padding: EdgeInsets.symmetric(
                                        horizontal: 12,
                                      ),
                                      child: Text(
                                        'or enter manually',
                                        style: TextStyle(color: Colors.black45),
                                      ),
                                    ),
                                    Expanded(child: Divider()),
                                  ],
                                ),
                              ),
                              const Text(
                                'QR Code *',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextField(
                                controller: qrController,
                                textCapitalization:
                                    TextCapitalization.characters,
                                autofocus: true,
                                decoration: const InputDecoration(
                                  hintText: 'Enter QR code (S123, D456, M30)',
                                  border: OutlineInputBorder(),
                                ),
                                onChanged: (_) => setSheetState(() {}),
                              ),
                              const SizedBox(height: 20),
                              const Text(
                                'Admission Count',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.black26),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    IconButton(
                                      onPressed: count > 1
                                          ? () => setSheetState(() => count--)
                                          : null,
                                      icon: const Icon(Icons.remove),
                                    ),
                                    Expanded(
                                      child: Text(
                                        '$count',
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          fontSize: 20,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                    IconButton(
                                      onPressed: () =>
                                          setSheetState(() => count++),
                                      icon: const Icon(Icons.add),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 20),
                              const Text(
                                'Notes',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 8),
                              TextField(
                                controller: notesController,
                                maxLines: 3,
                                decoration: const InputDecoration(
                                  hintText: 'Optional notes',
                                  border: OutlineInputBorder(),
                                ),
                              ),
                              const SizedBox(height: 20),
                              Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Colors.black12),
                                ),
                                child: const Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'QR Code Types:',
                                      style:
                                          TextStyle(fontWeight: FontWeight.w800),
                                    ),
                                    SizedBox(height: 8),
                                    Text('• S = Single person (1 admission)'),
                                    Text(
                                        '• D = Double person (2 admissions)'),
                                    Text(
                                        '• M = Multiple people (M30 = 30 people, etc.)'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      Container(
                        padding:
                            const EdgeInsets.fromLTRB(20, 12, 20, 16),
                        decoration: const BoxDecoration(
                          border:
                              Border(top: BorderSide(color: Colors.black12)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('Cancel'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: FilledButton(
                                onPressed: canSubmit ? doSubmit : null,
                                child: Text(
                                  submitting ? 'Checking...' : 'Check',
                                ),
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
        },
      ),
    );

    qrController.dispose();
    notesController.dispose();

    if (result != null) {
      await _playScanFeedback(result.success);
      await _loadFeed();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (_) => _ResultDialog(result: result),
      );
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
            Text(
              widget.activity.name,
              style: const TextStyle(fontSize: 12, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: _cameraPermissionGranted
                ? () => _camera.toggleTorch()
                : null,
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
                if (!_cameraPermissionGranted)
                  _PermissionDeniedView(onRequest: _requestCameraPermission)
                else
                  MobileScanner(
                    controller: _camera,
                    onDetect: _handleDetection,
                    errorBuilder: (context, error) => _CameraError(
                      error: error,
                      onRetry: () => _camera.start(),
                    ),
                  ),
                if (_cameraPermissionGranted)
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
                        _Stat(
                          label: 'Admitted',
                          value: feed?.totalAdmissions ?? 0,
                          color: Colors.green,
                        ),
                        _Stat(
                          label: 'Scans',
                          value: feed?.totalScans ?? 0,
                          color: brandNavy,
                        ),
                        _Stat(
                          label: 'Codes',
                          value: feed?.uniqueCodes ?? 0,
                          color: brandRed,
                        ),
                      ],
                    ),
                  ),
                  const Divider(height: 1),
                  Expanded(
                    child: feed == null
                        ? const Center(child: CircularProgressIndicator())
                        : feed.scans.isEmpty
                        ? const Center(
                            child: Text(
                              'No admissions yet — scans from all devices appear here.',
                              style: TextStyle(color: Colors.black54),
                            ),
                          )
                        : ListView.separated(
                            itemCount: feed.scans.length,
                            separatorBuilder: (_, _) =>
                                const Divider(height: 1),
                            itemBuilder: (context, i) {
                              final scan = feed.scans[i];
                              return ListTile(
                                dense: true,
                                leading: CircleAvatar(
                                  radius: 16,
                                  backgroundColor: Colors.green.shade50,
                                  child: Text(
                                    '${scan.admissionCount}',
                                    style: TextStyle(
                                      color: Colors.green.shade700,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                                title: Text(
                                  '${scan.code} — ${scan.guestName}',
                                  style: const TextStyle(fontSize: 14),
                                ),
                                subtitle: Text(
                                  'by ${scan.scannedBy}',
                                  style: const TextStyle(fontSize: 12),
                                ),
                                trailing: Text(
                                  TimeOfDay.fromDateTime(
                                    scan.scannedAt.toLocal(),
                                  ).format(context),
                                  style: const TextStyle(
                                    color: Colors.black45,
                                    fontSize: 12,
                                  ),
                                ),
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

class _PermissionDeniedView extends StatelessWidget {
  final VoidCallback onRequest;

  const _PermissionDeniedView({required this.onRequest});

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.camera_alt_outlined,
                color: Colors.white54,
                size: 64,
              ),
              const SizedBox(height: 20),
              const Text(
                'Camera Permission Required',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              const Text(
                'Allow camera access to scan QR codes and check in guests.',
                style: TextStyle(color: Colors.white70),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onRequest,
                icon: const Icon(Icons.camera_alt),
                label: const Text('Allow Camera'),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: openAppSettings,
                child: const Text(
                  'Open App Settings',
                  style: TextStyle(color: Colors.white70),
                ),
              ),
            ],
          ),
        ),
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
          Text(
            '$value',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: color,
            ),
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

class _ResultDialog extends StatelessWidget {
  final ScanResult result;

  const _ResultDialog({required this.result});

  @override
  Widget build(BuildContext context) {
    final ok = result.success;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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
            Text(
              result.guestName!,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
          const SizedBox(height: 6),
          Text(result.message, textAlign: TextAlign.center),
          if (ok && result.maxAdmissions > 1) ...[
            const SizedBox(height: 6),
            Text(
              '${result.remaining} of ${result.maxAdmissions} admissions remaining',
              style: const TextStyle(color: Colors.black54),
            ),
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

class _CameraError extends StatelessWidget {
  final MobileScannerException error;
  final VoidCallback onRetry;

  const _CameraError({required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final isPermission =
        error.errorCode == MobileScannerErrorCode.permissionDenied;
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.camera_alt_outlined,
                color: Colors.white54,
                size: 56,
              ),
              const SizedBox(height: 16),
              Text(
                isPermission
                    ? 'Camera permission is required to scan QR codes.'
                    : 'Camera unavailable. Please try again.',
                style: const TextStyle(color: Colors.white70),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              if (isPermission)
                FilledButton(
                  onPressed: openAppSettings,
                  child: const Text('Open Settings'),
                )
              else
                FilledButton(
                  onPressed: onRetry,
                  child: const Text('Retry'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
