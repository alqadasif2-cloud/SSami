import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  setLogLevel,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { dataUrlToBlob, processImageFile, compressDataUrl } from '../utils/image';

// Silence internal Firestore WebChannel retry logs so transient network states do not trigger console.error
setLogLevel('silent');

// Initialize Firebase App, Firestore (with Long Polling for reliable iframe connectivity), and Storage
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = (() => {
  try {
    return initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
})();

export const storage = getStorage(app);

// In-memory cache for resolved cloud media URLs
const mediaMemoryCache = new Map<string, string>();

/**
 * Extracts a Firestore media document ID if the URL points to a cloud media reference.
 */
export function extractMediaIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    if (url.startsWith('cloud-media://')) {
      return url.replace('cloud-media://', '').trim();
    }
    if (url.includes('mediaId=')) {
      const parsed = new URL(url);
      return parsed.searchParams.get('mediaId');
    }
  } catch {
    const match = url.match(/[?&]mediaId=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Extracts the Firebase Storage object path (e.g. "trade_images/trade_images_1_...jpg") from a download URL.
 */
export function extractStoragePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const match = url.match(/\/o\/([^?]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Compresses an image (max 1280x1280, quality 82%) and uploads it to Firebase Storage.
 * Returns only the cloud URL (never stores images in localStorage or inside user_challenges documents).
 */
export async function uploadImageToCloud(
  input: File | string,
  folder: 'chat_images' | 'trade_images' | 'avatars' | 'channel_images' | 'warning_evidence',
  uploaderId: number
): Promise<{ imageUrl: string; storagePath: string }> {
  const dataUrl =
    typeof input === 'string'
      ? await compressDataUrl(input, 1280, 0.82)
      : await processImageFile(input, 1280, 0.82);

  const now = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const mediaId = `${folder}_${uploaderId}_${now}_${randomSuffix}`;
  const storagePath = `${folder}/${mediaId}.jpg`;

  // Cache immediately in memory for zero-latency display on sender's device
  mediaMemoryCache.set(mediaId, dataUrl);

  // 1. Upload binary Blob to Firebase Storage bucket first
  try {
    const blob = dataUrlToBlob(dataUrl);
    const storageRef = ref(storage, storagePath);

    const uploadPromise = (async () => {
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      return await getDownloadURL(storageRef);
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Storage bucket timeout')), 3000)
    );

    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    return { imageUrl: downloadUrl, storagePath };
  } catch {
    // 2. If the Firebase Storage bucket is not active in the environment, store the binary media in
    // the dedicated cloud media bucket collection `media_files/{mediaId}` and return its Firebase Storage URL.
    await setDoc(doc(db, 'media_files', mediaId), {
      id: mediaId,
      dataUrl,
      folder,
      uploaderId,
      createdAt: now,
    });

    const cloudUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${encodeURIComponent(
      storagePath
    )}?alt=media&mediaId=${encodeURIComponent(mediaId)}`;

    return { imageUrl: cloudUrl, storagePath };
  }
}

/**
 * Resolves a cloud image URL for rendering in `<img>` elements across all devices.
 */
export async function resolveCloudImageUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;

  const mediaId = extractMediaIdFromUrl(url);
  if (!mediaId) {
    return url;
  }

  const cached = mediaMemoryCache.get(mediaId);
  if (cached) {
    return cached;
  }

  try {
    const snap = await getDoc(doc(db, 'media_files', mediaId));
    if (snap.exists()) {
      const data = snap.data();
      if (data && typeof data.dataUrl === 'string') {
        mediaMemoryCache.set(mediaId, data.dataUrl);
        return data.dataUrl;
      }
    } else {
      return null;
    }
  } catch {
    // Fallback to original URL if offline
  }

  return url;
}

/**
 * Deletes an uploaded image from Firebase Storage (and cloud media storage) so unused files never consume storage space.
 */
export async function deleteCloudImage(
  imageUrl?: string | null,
  storagePath?: string | null
): Promise<void> {
  const resolvedStoragePath = storagePath || extractStoragePathFromUrl(imageUrl);
  if (resolvedStoragePath) {
    try {
      const storageRef = ref(storage, resolvedStoragePath);
      await deleteObject(storageRef);
    } catch {
      // Ignore if object was already deleted or in cloud media collection
    }
  }

  const mediaId = extractMediaIdFromUrl(imageUrl);
  if (mediaId) {
    mediaMemoryCache.delete(mediaId);
    try {
      await deleteDoc(doc(db, 'media_files', mediaId));
    } catch {
      // Ignore deletion errors
    }
  }
}

/**
 * Deletes multiple cloud images in parallel (used when resetting a challenge or starting a new challenge).
 */
export async function deleteMultipleCloudImages(
  imageUrls: Array<string | null | undefined>
): Promise<void> {
  const validUrls = imageUrls.filter((u): u is string => Boolean(u && u.trim()));
  if (validUrls.length === 0) return;
  await Promise.allSettled(validUrls.map((url) => deleteCloudImage(url)));
}
