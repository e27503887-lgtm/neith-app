import imageCompression from "browser-image-compression";

// Kullanıcı fotoğrafları (3-8MB ham) yüklenmeden ÖNCE tarayıcıda küçültülür
// ve WebP'ye çevrilir. Dosya adı .webp uzantısı alır; upload yolları uzantıyı
// dosya adından türettiği için storage yolları da otomatik .webp olur.

export type CompressionPreset = "main" | "avatar" | "banner";

const PRESETS: Record<CompressionPreset, { maxWidthOrHeight: number; maxSizeMB: number }> = {
  main: { maxWidthOrHeight: 1600, maxSizeMB: 0.5 },
  avatar: { maxWidthOrHeight: 400, maxSizeMB: 0.1 },
  banner: { maxWidthOrHeight: 1920, maxSizeMB: 0.4 },
};

export const UNSUPPORTED_IMAGE_MESSAGE =
  "Bu format desteklenmiyor, lütfen JPEG/PNG deneyin.";

export class UnsupportedImageError extends Error {
  constructor() {
    super(UNSUPPORTED_IMAGE_MESSAGE);
    this.name = "UnsupportedImageError";
  }
}

export async function compressImage(
  file: File,
  preset: CompressionPreset = "main"
): Promise<File> {
  // Videolar ve bilinmeyen tipler dokunulmadan geçer; sınırları çağıran taraf uygular.
  if (!file.type.startsWith("image/")) return file;

  const options = PRESETS[preset];

  try {
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: options.maxWidthOrHeight,
      maxSizeMB: options.maxSizeMB,
      fileType: "image/webp",
      initialQuality: 0.85,
      useWebWorker: true,
    });

    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([compressed], `${baseName}.webp`, { type: "image/webp" });
  } catch {
    // HEIC gibi decode edilemeyen formatlar sessiz çökmesin.
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
