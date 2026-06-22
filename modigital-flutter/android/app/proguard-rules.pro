# ── Flutter ──────────────────────────────────────────────────────────────────
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-keepclassmembers class io.flutter.** { *; }
-dontwarn io.flutter.embedding.**

# ── mobile_scanner ────────────────────────────────────────────────────────────
-keep class dev.steenbakker.mobile_scanner.** { *; }
-keepclassmembers class dev.steenbakker.mobile_scanner.** { *; }

# ── CameraX (used internally by mobile_scanner) ───────────────────────────────
-keep class androidx.camera.** { *; }
-keepclassmembers class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# ── Google ML Kit barcode scanning ────────────────────────────────────────────
-keep class com.google.mlkit.** { *; }
-keepclassmembers class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# ── Google Play Services / Tasks (ML Kit dependency) ─────────────────────────
-keep class com.google.android.gms.** { *; }
-keepclassmembers class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class com.google.android.gms.tasks.** { *; }

# ── permission_handler ────────────────────────────────────────────────────────
-keep class com.baseflow.permissionhandler.** { *; }
-keepclassmembers class com.baseflow.permissionhandler.** { *; }

# ── shared_preferences ────────────────────────────────────────────────────────
-keep class io.flutter.plugins.sharedpreferences.** { *; }
-keepclassmembers class io.flutter.plugins.sharedpreferences.** { *; }

# ── Kotlin reflect (used by several plugins) ──────────────────────────────────
-dontwarn kotlin.**
-keep class kotlin.** { *; }
-keepclassmembers class kotlin.** { *; }
