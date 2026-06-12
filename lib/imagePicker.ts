import { launchImageLibrary } from 'react-native-image-picker';

/**
 * Image picking adapter over react-native-image-picker, shaped to how the
 * gallery screen consumes it.
 */

export interface ImagePickerAsset {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
}

export interface ImagePickerResult {
  canceled: boolean;
  assets: ImagePickerAsset[];
}

export async function requestMediaLibraryPermissionsAsync(): Promise<{
  granted: boolean;
  status: 'granted';
}> {
  // The system photo picker used by react-native-image-picker does not
  // require a runtime permission on iOS 14+ or Android 13+; older Android
  // versions are handled by the picker activity itself.
  return { granted: true, status: 'granted' };
}

export async function launchImageLibraryAsync(options?: {
  mediaTypes?: unknown;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}): Promise<ImagePickerResult> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: (options?.quality ?? 0.8) as 0.8,
    selectionLimit: 1,
  });

  if (result.didCancel || !result.assets || result.assets.length === 0) {
    return { canceled: true, assets: [] };
  }

  return {
    canceled: false,
    assets: result.assets.map(asset => ({
      uri: asset.uri ?? '',
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName ?? null,
    })),
  };
}
