import 'package:flutter/material.dart';

import 'api.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';

const brandRed = Color(0xFFEF4444);
const brandNavy = Color(0xFF3B4E6C);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MoDigitalApp());
}

class MoDigitalApp extends StatelessWidget {
  const MoDigitalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Mo' Digital Events",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: brandRed, primary: brandRed),
        appBarTheme: const AppBarTheme(
          backgroundColor: brandNavy,
          foregroundColor: Colors.white,
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: brandRed,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
      home: const _Gate(),
    );
  }
}

/// Shows login or home depending on whether a session token is stored.
class _Gate extends StatefulWidget {
  const _Gate();

  @override
  State<_Gate> createState() => _GateState();
}

class _GateState extends State<_Gate> {
  bool? _signedIn;

  @override
  void initState() {
    super.initState();
    api.loadSession().then((ok) => setState(() => _signedIn = ok));
  }

  @override
  Widget build(BuildContext context) {
    return switch (_signedIn) {
      null => const Scaffold(body: Center(child: CircularProgressIndicator())),
      true => const HomeScreen(),
      false => const LoginScreen(),
    };
  }
}
