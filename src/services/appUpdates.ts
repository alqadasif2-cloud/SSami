import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export interface AppUpdateConfig {
  id?: string;
  versionName: string;
  versionCode: number;
  downloadUrl: string;
  description: string;
  isMandatory: boolean;
  minSupportedVersionCode?: number;
  updatedAt?: number;
}

export const CURRENT_APP_VERSION_NAME = '1.2.0';
export const CURRENT_APP_VERSION_CODE = 10;

export const DEFAULT_UPDATE_CONFIG: AppUpdateConfig = {
  id: 'latest',
  versionName: '1.2.0',
  versionCode: 10,
  downloadUrl: 'https://github.com/alsonadi44/SamiTradingTracker/releases',
  description: 'الإصدار الأحدث متوفر الآن مع تحسينات في الأداء وتطوير الواجهة.',
  isMandatory: false,
  minSupportedVersionCode: 10,
  updatedAt: Date.now(),
};

/**
 * Compares two semantic version strings (e.g. "1.3.0" vs "1.2.0").
 * Returns true if remoteVersion is strictly newer than currentVersion.
 */
export function isNewerVersion(remoteVersion: string, currentVersion: string): boolean {
  if (!remoteVersion || !currentVersion) return false;
  const parse = (v: string) =>
    v
      .replace(/^v/i, '')
      .trim()
      .split('.')
      .map((part) => parseInt(part, 10) || 0);

  const rParts = parse(remoteVersion);
  const cParts = parse(currentVersion);
  const maxLen = Math.max(rParts.length, cParts.length);

  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] ?? 0;
    const c = cParts[i] ?? 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

/**
 * Checks whether the user should be prompted to update.
 */
export function shouldPromptUpdate(
  remote: AppUpdateConfig | null,
  currentCode: number = CURRENT_APP_VERSION_CODE,
  currentName: string = CURRENT_APP_VERSION_NAME
): boolean {
  if (!remote) return false;
  if (remote.versionCode > currentCode) return true;
  if (isNewerVersion(remote.versionName, currentName)) return true;
  return false;
}

/**
 * Fetches the latest app update configuration from Firestore.
 * Automatically seeds the default config if the document does not exist yet.
 */
export async function fetchAppUpdateConfig(): Promise<AppUpdateConfig> {
  try {
    const docRef = doc(db, 'app_updates', 'latest');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, DEFAULT_UPDATE_CONFIG);
      return DEFAULT_UPDATE_CONFIG;
    }
    const data = snap.data();
    return {
      id: snap.id,
      versionName: data.versionName || DEFAULT_UPDATE_CONFIG.versionName,
      versionCode: Number(data.versionCode) || DEFAULT_UPDATE_CONFIG.versionCode,
      downloadUrl: data.downloadUrl || DEFAULT_UPDATE_CONFIG.downloadUrl,
      description: data.description || DEFAULT_UPDATE_CONFIG.description,
      isMandatory: Boolean(data.isMandatory),
      minSupportedVersionCode: data.minSupportedVersionCode ? Number(data.minSupportedVersionCode) : undefined,
      updatedAt: data.updatedAt ? Number(data.updatedAt) : Date.now(),
    };
  } catch {
    return DEFAULT_UPDATE_CONFIG;
  }
}

/**
 * Subscribes to real-time changes of the cloud app update config.
 */
export function subscribeToAppUpdateConfig(
  callback: (config: AppUpdateConfig) => void
): () => void {
  const docRef = doc(db, 'app_updates', 'latest');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap && snap.exists()) {
        const data = snap.data();
        callback({
          id: snap.id,
          versionName: data.versionName || DEFAULT_UPDATE_CONFIG.versionName,
          versionCode: Number(data.versionCode) || DEFAULT_UPDATE_CONFIG.versionCode,
          downloadUrl: data.downloadUrl || DEFAULT_UPDATE_CONFIG.downloadUrl,
          description: data.description || DEFAULT_UPDATE_CONFIG.description,
          isMandatory: Boolean(data.isMandatory),
          minSupportedVersionCode: data.minSupportedVersionCode ? Number(data.minSupportedVersionCode) : undefined,
          updatedAt: data.updatedAt ? Number(data.updatedAt) : Date.now(),
        });
      } else {
        // Seed default if empty
        setDoc(docRef, DEFAULT_UPDATE_CONFIG).catch(() => {});
        callback(DEFAULT_UPDATE_CONFIG);
      }
    },
    () => {
      callback(DEFAULT_UPDATE_CONFIG);
    }
  );
}

/**
 * Saves or modifies the app update configuration in Firestore (Owner Sami only).
 */
export async function saveAppUpdateConfig(config: AppUpdateConfig): Promise<void> {
  const docRef = doc(db, 'app_updates', 'latest');
  const payload = {
    id: 'latest',
    versionName: config.versionName.trim(),
    versionCode: Math.floor(Number(config.versionCode) || 10),
    downloadUrl: config.downloadUrl.trim(),
    description: config.description.trim(),
    isMandatory: Boolean(config.isMandatory),
    minSupportedVersionCode: config.minSupportedVersionCode ? Math.floor(Number(config.minSupportedVersionCode)) : undefined,
    updatedAt: Date.now(),
  };
  await setDoc(docRef, payload);
}
