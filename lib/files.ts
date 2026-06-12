import * as RNFS from '@dr.pogodin/react-native-fs';
import Share from 'react-native-share';

/**
 * File-system and sharing adapters built on @dr.pogodin/react-native-fs and
 * react-native-share. The exported API matches how the screens consume it:
 * write/read base64 or UTF-8 strings under the app's document directory and
 * hand files to the platform share sheet.
 */

const stripFileScheme = (uri: string): string => uri.replace(/^file:\/\//, '');

export const FileSystem = {
  /** App document directory, with trailing slash, as a file:// URI. */
  documentDirectory: `file://${RNFS.DocumentDirectoryPath}/`,

  EncodingType: {
    Base64: 'base64',
    UTF8: 'utf8',
  } as const,

  async writeAsStringAsync(
    uri: string,
    data: string,
    options?: { encoding?: string },
  ): Promise<void> {
    const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
    await RNFS.writeFile(stripFileScheme(uri), data, encoding);
  },

  async readAsStringAsync(uri: string, options?: { encoding?: string }): Promise<string> {
    const encoding = options?.encoding === 'base64' ? 'base64' : 'utf8';
    return RNFS.readFile(stripFileScheme(uri), encoding);
  },

  async getContentUriAsync(uri: string): Promise<string> {
    return uri;
  },
};

export const Sharing = {
  async isAvailableAsync(): Promise<boolean> {
    return true;
  },

  async shareAsync(
    uri: string,
    options?: { mimeType?: string; dialogTitle?: string; UTI?: string },
  ): Promise<void> {
    await Share.open({
      url: uri.startsWith('file://') ? uri : `file://${uri}`,
      type: options?.mimeType,
      title: options?.dialogTitle,
      failOnCancel: false,
    });
  },
};
