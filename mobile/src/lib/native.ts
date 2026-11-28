import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import type { MirrorBackend } from './storage';
import { isNative } from './platform';
import { InvoiceJotStore } from './storekit';

/* ---------- Durable on-device snapshot (Library/NoCloud is never purged by iOS) ---------- */

export function createFilesystemMirror(): MirrorBackend {
  const dir = Directory.Library;
  const p = (n: string) => `InvoiceJot/${n}`;
  return {
    async read(name) {
      try {
        const r = await Filesystem.readFile({ path: p(name), directory: dir, encoding: Encoding.UTF8 });
        return typeof r.data === 'string' ? r.data : await (r.data as Blob).text();
      } catch {
        return null;
      }
    },
    async write(name, data) {
      await Filesystem.writeFile({ path: p(name), directory: dir, data, encoding: Encoding.UTF8, recursive: true });
    },
    async copy(from, to) {
      try {
        await Filesystem.stat({ path: p(from), directory: dir });
      } catch {
        return false;
      }
      try {
        await Filesystem.deleteFile({ path: p(to), directory: dir });
      } catch {
        /* not there yet */
      }
      await Filesystem.copy({ from: p(from), to: p(to), directory: dir, toDirectory: dir });
      return true;
    },
    async rename(from, to) {
      try {
        await Filesystem.deleteFile({ path: p(to), directory: dir });
      } catch {
        /* not there yet */
      }
      await Filesystem.rename({ from: p(from), to: p(to), directory: dir, toDirectory: dir });
    },
  };
}

/* ---------- Share sheet (Mail, Messages, AirDrop, Save to Files, Print) ---------- */

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function downloadInBrowser(name: string, base64: string, mime: string) {
  const a = document.createElement('a');
  a.href = `data:${mime};base64,${base64}`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Writes the file to the cache folder and opens the iOS share sheet. Returns false if the user cancelled. */
export async function shareFile(name: string, data: { base64: string } | { text: string }, mime: string, dialogTitle: string): Promise<boolean> {
  const base64 = 'base64' in data ? data.base64 : utf8ToBase64(data.text);
  if (!isNative()) {
    downloadInBrowser(name, base64, mime);
    return true;
  }
  const res = await Filesystem.writeFile({ path: `exports/${name}`, directory: Directory.Cache, data: base64, recursive: true });
  try {
    await Share.share({ title: dialogTitle, url: res.uri, dialogTitle });
    return true;
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    if (/cancel/i.test(msg)) return false;
    throw e;
  }
}

/** Opens the share sheet with plain text (for example a payment reminder). Returns false if the user cancelled. */
export async function shareText(text: string, dialogTitle: string): Promise<boolean> {
  if (!isNative()) {
    const nav = navigator as Navigator & { share?: (d: { text: string; title?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ text, title: dialogTitle });
        return true;
      } catch {
        return false;
      }
    }
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    return true;
  }
  try {
    await Share.share({ text, dialogTitle });
    return true;
  } catch (e) {
    if (/cancel/i.test(String((e as Error)?.message ?? e))) return false;
    throw e;
  }
}

/* ---------- Camera (receipt photos) ---------- */

/** Returns a compressed JPEG data URL, or null if the user cancelled. */
export async function takeReceiptPhoto(source: 'camera' | 'library'): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: 60,
      width: 1400,
      resultType: CameraResultType.DataUrl,
      source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      correctOrientation: true,
    });
    return photo.dataUrl ?? null;
  } catch {
    return null;
  }
}

/** Downscales an image file picked with <input type="file"> to a small JPEG/PNG data URL. */
export function fileToDataUrl(file: File, maxSide = 600, mime: 'image/jpeg' | 'image/png' = 'image/png'): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read that image.'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(String(reader.result));
        if (mime === 'image/jpeg') {
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(mime, 0.8));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Haptics, review prompt, links ---------- */

export function tap() {
  if (isNative()) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

export function success() {
  if (isNative()) void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
}

/** SKStoreReviewController / AppStore.requestReview. iOS decides whether to show it (max 3 times a year). */
export async function requestAppReview(): Promise<void> {
  if (!isNative()) return;
  try {
    await InvoiceJotStore.requestReview();
  } catch {
    /* never block the user */
  }
}

export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener');
}
