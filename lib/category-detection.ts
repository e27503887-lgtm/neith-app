// Fotoğraftan kategori tahmini — tamamen tarayıcıda (MobileNet, ImageNet-1k
// üzerinde önceden eğitilmiş). Hiçbir sunucu/API çağrısı yapılmaz; model
// dosyası ilk kullanımda indirilip tarayıcı önbelleğinde kalır. Aşağıdaki
// eşleme tablosu ImageNet-1k'nin giysiyle ilgili sınıflarını bizim kategori
// enum'umuza karşılık getirir — eşleşme yoksa ya da güven eşiğin altındaysa
// hiçbir şey önerilmez, kullanıcı elle seçer.

import type { Category } from "@/lib/categories";

const CONFIDENCE_THRESHOLD = 0.25;
const TOP_K = 5;

export type CategoryPrediction = {
  category: Category;
  confidence: number;
};

// className string'leri mobilenet'in döndürdüğü haliyle küçük harfe
// çevrilip aranır (ör. "jersey, T-shirt, tee_shirt" → alt anahtar kelimeler
// virgülle ayrılmış listede geçebilir).
const LABEL_CATEGORY_MAP: { keywords: string[]; category: Category }[] = [
  // Üst giyim
  { keywords: ["jersey", "t-shirt", "tee_shirt", "tee shirt"], category: "ust_giyim" },
  { keywords: ["sweatshirt"], category: "ust_giyim" },
  { keywords: ["cardigan"], category: "ust_giyim" },
  { keywords: ["brassiere", "bandeau"], category: "ust_giyim" },

  // Alt giyim
  { keywords: ["jean", "denim"], category: "alt_giyim" },
  { keywords: ["miniskirt"], category: "alt_giyim" },
  { keywords: ["overskirt"], category: "alt_giyim" },
  { keywords: ["swimming_trunks", "swimming trunks", "bathing_trunks", "bathing trunks"], category: "alt_giyim" },
  { keywords: ["sarong"], category: "alt_giyim" },

  // Elbise
  { keywords: ["gown"], category: "elbise" },
  { keywords: ["abaya"], category: "elbise" },
  { keywords: ["academic_gown", "academic gown", "academic_robe", "academic robe", "judge's robe"], category: "elbise" },

  // Dış giyim
  { keywords: ["trench_coat", "trench coat"], category: "dis_giyim" },
  { keywords: ["fur_coat", "fur coat"], category: "dis_giyim" },
  { keywords: ["cloak"], category: "dis_giyim" },
  { keywords: ["poncho"], category: "dis_giyim" },
  { keywords: ["lab_coat", "lab coat", "laboratory_coat", "laboratory coat"], category: "dis_giyim" },
  { keywords: ["military_uniform", "military uniform"], category: "dis_giyim" },
  { keywords: ["vestment"], category: "dis_giyim" },
  { keywords: ["kimono"], category: "dis_giyim" },
  { keywords: ["bulletproof_vest", "bulletproof vest"], category: "dis_giyim" },

  // Ayakkabı
  { keywords: ["running_shoe", "running shoe"], category: "ayakkabi" },
  { keywords: ["sandal"], category: "ayakkabi" },
  { keywords: ["loafer"], category: "ayakkabi" },
  { keywords: ["cowboy_boot", "cowboy boot"], category: "ayakkabi" },
  { keywords: ["clog", "geta", "patten", "sabot"], category: "ayakkabi" },

  // Çanta
  { keywords: ["backpack", "knapsack", "rucksack", "haversack"], category: "canta" },
  { keywords: ["purse"], category: "canta" },
  { keywords: ["handbag"], category: "canta" },
  { keywords: ["mailbag", "postbag"], category: "canta" },

  // Aksesuar
  { keywords: ["sock"], category: "aksesuar" },
  { keywords: ["bow_tie", "bow tie", "bow-tie", "bowtie"], category: "aksesuar" },
  { keywords: ["windsor_tie", "windsor tie"], category: "aksesuar" },
  { keywords: ["hair_slide", "hair slide"], category: "aksesuar" },
  { keywords: ["cowboy_hat", "cowboy hat", "ten-gallon_hat", "ten-gallon hat"], category: "aksesuar" },
  { keywords: ["sombrero"], category: "aksesuar" },
  { keywords: ["shower_cap", "shower cap"], category: "aksesuar" },
  { keywords: ["bonnet"], category: "aksesuar" },
  { keywords: ["bearskin", "busby", "shako"], category: "aksesuar" },
  { keywords: ["hard_hat", "hard hat", "hard-hat"], category: "aksesuar" },
  { keywords: ["sunglass"], category: "aksesuar" },
  { keywords: ["wallet", "billfold", "notecase", "pocketbook"], category: "aksesuar" },
  { keywords: ["apron"], category: "aksesuar" },
];

function matchLabel(className: string): Category | null {
  const label = className.toLowerCase();
  for (const entry of LABEL_CATEGORY_MAP) {
    if (entry.keywords.some((k) => label.includes(k))) return entry.category;
  }
  return null;
}

type MobileNetModel = {
  classify: (
    img: HTMLImageElement,
    topk?: number
  ) => Promise<{ className: string; probability: number }[]>;
};

let modelPromise: Promise<MobileNetModel> | null = null;

// Model yalnızca ilk çağrıda indirilir (birkaç MB) ve modül kapsamındaki
// promise'te tutulur — sayfa içinde tekrar açılan formlar aynı modeli
// yeniden kullanır, tarayıcı sekmesi kapanana kadar tekrar indirmez.
function getModel(): Promise<MobileNetModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import("@tensorflow/tfjs");
      await tf.ready();
      const mobilenet = await import("@tensorflow-models/mobilenet");
      return mobilenet.load({ version: 2, alpha: 1.0 });
    })();
    modelPromise.catch(() => {
      modelPromise = null;
    });
  }
  return modelPromise;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

// Hata durumunda (model inemedi, tahmin başarısız, eşiğin altında vb.)
// sessizce null döner — çağıran taraf kategori alanını boş bırakır,
// kullanıcı normal şekilde elle seçime devam eder.
export async function detectCategory(file: File): Promise<CategoryPrediction | null> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return null;

  try {
    const model = await getModel();
    const img = await loadImage(file);
    const predictions = await model.classify(img, TOP_K);

    for (const prediction of predictions) {
      if (prediction.probability < CONFIDENCE_THRESHOLD) continue;
      const category = matchLabel(prediction.className);
      if (category) {
        return { category, confidence: prediction.probability };
      }
    }
    return null;
  } catch {
    return null;
  }
}
