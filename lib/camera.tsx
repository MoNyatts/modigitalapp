import React, { useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  Camera as VisionCamera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

/**
 * Thin adapter over react-native-vision-camera exposing the small camera
 * surface the scanner screen needs: permission requests and a QR-scanning
 * camera view with an overlay.
 */

export const Camera = {
  async requestCameraPermissionsAsync(): Promise<{
    status: 'granted' | 'denied';
    granted: boolean;
  }> {
    const status = await VisionCamera.requestCameraPermission();
    const granted = status === 'granted';
    return { status: granted ? 'granted' : 'denied', granted };
  },

  async getCameraPermissionsAsync(): Promise<{ status: string; granted: boolean }> {
    const status = VisionCamera.getCameraPermissionStatus();
    return { status, granted: status === 'granted' };
  },
};

export interface BarcodeScanningResult {
  data: string;
  type: string;
}

interface CameraViewProps {
  style?: StyleProp<ViewStyle>;
  facing?: 'back' | 'front';
  onBarcodeScanned?: (result: BarcodeScanningResult) => void;
  barcodeScannerSettings?: { barcodeTypes: string[] };
  children?: React.ReactNode;
}

export function CameraView({
  style,
  facing = 'back',
  onBarcodeScanned,
  children,
}: CameraViewProps) {
  const device = useCameraDevice(facing);

  // Keep the latest handler without re-creating the code scanner. The screen
  // passes undefined while a scan is being processed to pause scanning.
  const handlerRef = useRef(onBarcodeScanned);
  handlerRef.current = onBarcodeScanned;

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const value = codes[0]?.value;
      if (value && handlerRef.current) {
        handlerRef.current({ data: value, type: 'qr' });
      }
    },
  });

  return (
    <View style={style}>
      {device && (
        <VisionCamera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          codeScanner={codeScanner}
        />
      )}
      {children}
    </View>
  );
}
