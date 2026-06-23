import 'package:flutter/material.dart';

import '../api.dart';
import '../main.dart';
import '../models.dart';

class ConfirmAdmissionScreen extends StatefulWidget {
  final Event event;
  final Activity activity;
  final String qrCode;

  const ConfirmAdmissionScreen({
    super.key,
    required this.event,
    required this.activity,
    required this.qrCode,
  });

  @override
  State<ConfirmAdmissionScreen> createState() =>
      _ConfirmAdmissionScreenState();
}

class _ConfirmAdmissionScreenState extends State<ConfirmAdmissionScreen> {
  late int _count;
  final _notesController = TextEditingController();
  bool _submitting = false;

  // Validation is intentionally done server-side.
  // Always allow submit so the backend can return a meaningful error message.
  bool get _isValidCode => true;

  @override
  void initState() {
    super.initState();
    _count = _deriveCount(widget.qrCode);
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  int _deriveCount(String code) {
    final upper = code.trim().toUpperCase();
    if (upper.startsWith('S')) return 1;
    if (upper.startsWith('D')) return 2;
    if (upper.startsWith('M')) {
      return int.tryParse(upper.substring(1)) ?? 1;
    }
    return 1; // unknown format — default to 1, backend will validate
  }

  Future<void> _admit() async {
    setState(() => _submitting = true);

    ScanResult result;
    try {
      result = await api.scan(
        widget.qrCode.trim(),
        widget.activity.id,
        admissionCount: _count,
      );
    } catch (e) {
      result = ScanResult(
        success: false,
        message: e.toString(),
        remaining: 0,
        maxAdmissions: 0,
      );
    }

    if (!mounted) return;
    setState(() => _submitting = false);

    final ok = result.success;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        icon: Icon(
          ok ? Icons.check_circle_outline : Icons.cancel_outlined,
          size: 64,
          color: ok ? Colors.green : brandRed,
        ),
        title: Text(
          ok ? 'Admitted' : 'Rejected',
          textAlign: TextAlign.center,
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (result.guestName != null) ...[
              Text(
                result.guestName!,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
            ],
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
            onPressed: () => Navigator.pop(ctx),
            child: const Text('OK'),
          ),
        ],
      ),
    );

    if (mounted) Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) {
    final canAdmit = _isValidCode && _count > 0 && !_submitting;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leadingWidth: 80,
        leading: TextButton(
          onPressed: () => Navigator.pop(context, false),
          child: const Text(
            'Cancel',
            style: TextStyle(color: Colors.white70),
          ),
        ),
        title: const Text('Confirm Admission'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // QR Code display
            Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              decoration: BoxDecoration(
                color: const Color(0xFFEBF4FF),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFBDD7F5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Card:',
                    style: TextStyle(
                      color: Colors.blue.shade700,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.qrCode.trim().toUpperCase(),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
            ),


            const SizedBox(height: 16),

            // Event & Activity info
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.black12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Event:',
                    style: TextStyle(color: Colors.black45, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    widget.event.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Activity:',
                    style: TextStyle(color: Colors.black45, fontSize: 13),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    widget.activity.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Number of People to Admit
            const Text(
              'Number of People to Admit',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
            const SizedBox(height: 10),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.black26),
                borderRadius: BorderRadius.circular(8),
                color: Colors.white,
              ),
              child: Row(
                children: [
                  IconButton(
                    onPressed: _count > 0
                        ? () => setState(() => _count--)
                        : null,
                    icon: const Icon(Icons.remove),
                    color: brandNavy,
                  ),
                  Expanded(
                    child: Text(
                      '$_count',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => setState(() => _count++),
                    icon: const Icon(Icons.add),
                    color: brandNavy,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Notes
            const Text(
              'Notes (Optional)',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _notesController,
              maxLines: 4,
              decoration: const InputDecoration(
                hintText: 'Optional notes',
                border: OutlineInputBorder(),
                filled: true,
                fillColor: Colors.white,
              ),
            ),

            const SizedBox(height: 32),

            // Action buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton(
                    onPressed: canAdmit ? _admit : null,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: brandNavy,
                    ),
                    child: _submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text('Admit'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
