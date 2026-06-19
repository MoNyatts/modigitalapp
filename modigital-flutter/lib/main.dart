import 'package:flutter/material.dart';

import 'screens/splash_screen.dart';

const brandRed = Color(0xFFEF4444);
const brandDarkRed = Color(0xFFB91C1C);
const brandNavy = Color(0xFF3B4E6C);
const brandGold = Color(0xFFD6A84F);
const brandTeal = Color(0xFF0F766E);
const surfaceWarm = Color(0xFFFFF8F2);
const surfaceCool = Color(0xFFF4F7FB);

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
        colorScheme: ColorScheme.fromSeed(
          seedColor: brandRed,
          primary: brandRed,
          secondary: brandTeal,
          tertiary: brandGold,
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: surfaceCool,
        visualDensity: VisualDensity.adaptivePlatformDensity,
        appBarTheme: const AppBarTheme(
          backgroundColor: brandNavy,
          foregroundColor: Colors.white,
          centerTitle: false,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide.none,
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: brandRed, width: 1.5),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: brandDarkRed, width: 1),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: brandRed,
            foregroundColor: Colors.white,
            minimumSize: const Size.fromHeight(52),
            textStyle: const TextStyle(fontWeight: FontWeight.w800),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: brandNavy,
            side: BorderSide(color: brandNavy.withValues(alpha: 0.22)),
            minimumSize: const Size.fromHeight(48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: Colors.white,
          indicatorColor: brandRed.withValues(alpha: 0.12),
          labelTextStyle: WidgetStateProperty.resolveWith(
            (states) => TextStyle(
              fontSize: 12,
              fontWeight: states.contains(WidgetState.selected)
                  ? FontWeight.w900
                  : FontWeight.w600,
            ),
          ),
        ),
      ),
      home: const SplashScreen(),
    );
  }
}
