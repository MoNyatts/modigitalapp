import {
  pick,
  keepLocalCopy,
  types,
  errorCodes,
  isErrorWithCode,
} from '@react-native-documents/picker';

/**
 * Document picking adapter over @react-native-documents/picker, shaped to
 * how the QR-management screen consumes it (pick one Excel file and read it
 * from a locally accessible path).
 */

export interface DocumentPickerAsset {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
}

export interface DocumentPickerResult {
  canceled: boolean;
  assets: DocumentPickerAsset[];
}

export async function getDocumentAsync(options?: {
  type?: string[];
  copyToCacheDirectory?: boolean;
}): Promise<DocumentPickerResult> {
  try {
    const [file] = await pick({
      type: options?.type ?? [types.allFiles],
    });

    let uri = file.uri;
    const name = file.name ?? 'document';

    if (options?.copyToCacheDirectory !== false) {
      // Content URIs from the Android document provider are not always
      // readable by the file-system module, so take a local copy first.
      try {
        const [copy] = await keepLocalCopy({
          files: [{ uri: file.uri, fileName: name }],
          destination: 'cachesDirectory',
        });
        if (copy.status === 'success') {
          uri = copy.localUri;
        }
      } catch {
        // Fall back to the original URI.
      }
    }

    return {
      canceled: false,
      assets: [{ uri, name, mimeType: file.type, size: file.size }],
    };
  } catch (err) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
      return { canceled: true, assets: [] };
    }
    throw err;
  }
}
