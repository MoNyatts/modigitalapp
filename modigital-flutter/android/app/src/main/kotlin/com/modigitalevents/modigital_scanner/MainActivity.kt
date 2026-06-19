package com.modigitalevents.modigital_scanner

import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Handler
import android.os.Looper
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "modigital_scanner/scan_feedback"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName).setMethodCallHandler { call, result ->
            when (call.method) {
                "play" -> {
                    val valid = call.argument<Boolean>("valid") ?: false
                    playScanTone(valid)
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun playScanTone(valid: Boolean) {
        val toneType = if (valid) ToneGenerator.TONE_PROP_ACK else ToneGenerator.TONE_PROP_NACK
        val durationMs = if (valid) 160 else 420
        val toneGenerator = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100)

        toneGenerator.startTone(toneType, durationMs)
        Handler(Looper.getMainLooper()).postDelayed({
            toneGenerator.release()
        }, (durationMs + 120).toLong())
    }
}
