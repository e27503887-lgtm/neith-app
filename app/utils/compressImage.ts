import imageCompression from "browser-image-compression";

// Kullanıcı fotoğrafları (3-8MB ham) yüklenmeden ÖNCE tarayıcıda küçültülür
// ve WebP'ye çevrilir. Dosya adı .webp uzantısı alır; upload yolları uzantıyı
// dosya adından türettiği için storage yolları da otomatik .webp olur.
//
// Boyut ön kontrolü YOK: browser-image-compression her dosyayı zaten
// ~0.5MB'a indiriyor, kullanıcının orijinal dosya boyutuyla ilgilenmesine
// gerek yok. Tüm yükleme noktaları (sell/kombin/gönderi/avatar/dolabım) bu
// tek fonksiyon üzerinden geçtiği için HEIC desteği de burada, tek yerde.

export type CompressionPreset = "main" | "avatar" | "banner";

const PRESETS: Record<CompressionPreset, { maxWidthOrHeight: number; maxSizeMB: number }> = {
  main: { maxWidthOrHeight: 1600, maxSizeMB: 0.5 },
  avatar: { maxWidthOrHeight: 400, maxSizeMB: 0.1 },
  banner: { maxWidthOrHeight: 1920, maxSizeMB: 0.4 },
};

// Teknik jargon yok ("HEIC", "format" vb.) — sıradan kullanıcı bunu bilmez.
export const UNSUPPORTED_IMAGE_MESSAGE =
  "Bu dosya işlenemedi, başka bir fotoğraf dener misin?";

export class UnsupportedImageError extends Error {
  constructor() {
    super(UNSUPPORTED_IMAGE_MESSAGE);
    this.name = "UnsupportedImageError";
  }
}

// iOS bazen HEIC/HEIF dosyalarına boş ya da "application/octet-stream" MIME
// tipi veriyor — bu yüzden uzantıdan da tanıma yapılır. Dosya seçici
// input'larındaki "resim mi?" kontrolleri de bunu kullanmalı, aksi halde
// HEIC dosyaları compressImage'a hiç ulaşmadan sessizce elenir.
// image/webp, image/jpeg, image/png, image/gif vb. tüm tarayıcı-native
// formatlar burada zaten "image/" ön ekiyle yakalanır — özel bir liste
// gerekmez. Yalnızca HEIC/HEIF için ek uzantı kontrolü var (aşağıya bak).
export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(heic|heif)$/i.test(file.name);
}

// Yalnızca gerçek HEIC/HEIF dosyaları burada eşleşir — WEBP/JPEG/PNG gibi
// tarayıcı-native formatlar bu kontrolden hiçbir zaman geçmez ve doğrudan
// sıkıştırma adımına gider (aşağıdaki compressImage'a bakın).
function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  return type === "image/heic" || type === "image/heif" || /\.(heic|heif)$/i.test(file.name);
}

async function convertHeicToJpeg(file: File): Promise<File> {
  // Dinamik import: heic2any modül yüklenirken üst seviyede `window`'a
  // erişiyor, bu da bu dosyayı zincirleme import eden sayfaların SSR/build
  // prerender aşamasında çökmesine yol açar. Yalnızca tarayıcıda, gerçekten
  // bir HEIC dosyası seçildiğinde çağrıldığı için burada güvenli.
  const { default: heic2any } = await import("heic2any");
  const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export async function compressImage(
  file: File,
  preset: CompressionPreset = "main"
): Promise<File> {
  // Videolar ve bilinmeyen tipler dokunulmadan geçer; sınırları çağıran taraf uygular.
  if (!isImageFile(file)) return file;

  // HEIC/HEIF (iPhone formatı): browser-image-compression bunu çözemiyor —
  // önce JPEG'e çevrilip mevcut sıkıştırma adımına öyle gönderilir.
  // Kullanıcı hiçbir hata görmeden, dosya sanki zaten JPEG'miş gibi ilerler.
  let source = file;
  if (isHeicFile(file)) {
    try {
      source = await convertHeicToJpeg(file);
    } catch (err) {
      // Bozuk/işlenemeyen HEIC — ancak bu durumda kullanıcıya mesaj gösterilir.
      // eslint-disable-next-line no-console
      console.error("[compressImage] HEIC dönüştürme başarısız:", err);
      throw new UnsupportedImageError();
    }
  }

  const options = PRESETS[preset];

  try {
    const compressed = await imageCompression(source, {
      maxWidthOrHeight: options.maxWidthOrHeight,
      maxSizeMB: options.maxSizeMB,
      fileType: "image/webp",
      initialQuality: 0.85,
      useWebWorker: true,
    });

    const baseName = source.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([compressed], `${baseName}.webp`, { type: "image/webp" });
  } catch (err) {
    // Geçici debug logu: gerçek hata mesajı burada görünür (ör. tarayıcı
    // konsolu), kullanıcıya gösterilen mesaj hâlâ jenerik kalır.
    // eslint-disable-next-line no-console
    console.error("[compressImage] Sıkıştırma başarısız:", err, {
      fileName: source.name,
      fileType: source.type,
      fileSize: source.size,
      preset,
    });
    throw new UnsupportedImageError();
  }
}

// Video süresi (sn). Metadata okunamazsa 0 döner — çağıran taraf geçirsin.
export function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(video.duration) ? video.duration : 0);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    video.src = url;
  });
}
