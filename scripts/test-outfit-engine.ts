// lib/outfit-engine.ts için uçtan uca test scripti — gerçek veritabanına
// hiçbir şey yazmaz, yalnızca mock EngineProduct objeleriyle motor
// fonksiyonlarını doğrudan çağırır. `npm run test:engine` ile çalıştırılır.
//
// Kapsam: SLOT_RULES tamamlanmışlığı, genel kurallar (renk/silüet/dönem),
// kişiselleştirme katmanları (stil taksonomisi, vintage denge, kumaş
// katmanlama, vücut tipi, cilt alt tonu), mahremiyet (açıklama metninde
// kişisel katman sızıntısı olmamalı), geriye dönük uyumluluk (null alanlar
// çökmemeli) ve açıklama metni tutarlılığı/çeşitliliği.

import {
  buildOutfitSuggestions,
  getSlotCategories,
  scoreCandidate,
  type EngineProduct,
} from "../lib/outfit-engine";
import { STYLE_LABELS } from "../lib/styles";

// ---------------------------------------------------------------------
// Test harness (bağımlılık yok — düz konsol tabanlı PASS/FAIL toplayıcı)
// ---------------------------------------------------------------------

type TestResult = {
  scenario: string;
  name: string;
  pass: boolean;
  critical: boolean;
  detail?: string;
};

const results: TestResult[] = [];

function check(
  scenario: string,
  name: string,
  pass: boolean,
  detail?: string,
  critical = false
) {
  results.push({ scenario, name, pass, critical, detail });
}

function forbidWords(text: string, words: string[]): string[] {
  const normalized = text.toLocaleLowerCase("tr-TR");
  return words.filter((w) => {
    const escaped = w.toLocaleLowerCase("tr-TR").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "u").test(normalized);
  });
}

// ---------------------------------------------------------------------
// Mock veri fabrikası — products/wardrobe_items şemasına uygun,
// DB'ye hiç yazmaz.
// ---------------------------------------------------------------------

let idCounter = 1;

function product(overrides: Partial<EngineProduct> = {}): EngineProduct {
  const base: EngineProduct = {
    id: `mock-${idCounter++}`,
    title: "Mock Ürün",
    price: null,
    category: null,
    era: null,
    style_tag: null,
    color_group: null,
    fit: null,
    fabric: null,
    image_url: "https://example.com/mock.jpg",
    // null: buildOutfitSuggestions'daki "kendi ilanı hariç tut" kısıtı
    // yalnızca her iki tarafta da DOLU ve EŞİT user_id varsa devreye girer —
    // mock'larda varsayılan olarak bunu tetiklememek için boş bırakılıyor.
    user_id: null,
    is_sold: false,
  };
  return { ...base, ...overrides };
}

// =======================================================================
// SENARYO 1 — Temel tamamlanmışlık kuralı
// =======================================================================
{
  const scenario = "1. Tamamlanmışlık kuralı";

  const pantolonSlots = getSlotCategories("alt_giyim");
  check(
    scenario,
    "alt_giyim → ust_giyim aranıyor",
    pantolonSlots.includes("ust_giyim"),
    `slots=${JSON.stringify(pantolonSlots)}`
  );
  check(
    scenario,
    "alt_giyim → ayakkabi aranıyor",
    pantolonSlots.includes("ayakkabi"),
    `slots=${JSON.stringify(pantolonSlots)}`
  );

  const elbiseSlots = getSlotCategories("elbise");
  check(
    scenario,
    "elbise → ayakkabi aranıyor",
    elbiseSlots.includes("ayakkabi"),
    `slots=${JSON.stringify(elbiseSlots)}`
  );
  check(
    scenario,
    "elbise → ust_giyim/alt_giyim ARANMIYOR",
    !elbiseSlots.includes("ust_giyim") && !elbiseSlots.includes("alt_giyim"),
    `slots=${JSON.stringify(elbiseSlots)}`
  );
}

// =======================================================================
// SENARYO 2 — Renk uyumu
// =======================================================================
{
  const scenario = "2. Renk uyumu";

  const bothNeutral = scoreCandidate(
    product({ color_group: "notr" }),
    product({ color_group: "notr" }),
    []
  );
  check(
    scenario,
    "notr + notr → pozitif (+30)",
    bothNeutral.generalScore === 30,
    `generalScore=${bothNeutral.generalScore}, reasons=${bothNeutral.reasons}`
  );

  const neutralAccent = scoreCandidate(
    product({ color_group: "notr" }),
    product({ color_group: "canli" }),
    []
  );
  check(
    scenario,
    "notr + canli → pozitif (+30)",
    neutralAccent.generalScore === 30,
    `generalScore=${neutralAccent.generalScore}, reasons=${neutralAccent.reasons}`
  );

  const twoVivid = scoreCandidate(
    product({ color_group: "canli" }),
    product({ color_group: "canli" }),
    []
  );
  check(
    scenario,
    "canli + canli → NEGATİF ceza (-30)",
    twoVivid.generalScore === -30,
    `generalScore=${twoVivid.generalScore}`
  );

  console.log(
    `  [Senaryo 2 ham skorlar] notr+notr=${bothNeutral.generalScore}, notr+canli=${neutralAccent.generalScore}, canli+canli=${twoVivid.generalScore}`
  );
}

// =======================================================================
// SENARYO 3 — Silüet dengesi
// =======================================================================
{
  const scenario = "3. Silüet dengesi";

  const balanced = scoreCandidate(
    product({ category: "ust_giyim", fit: "oversize" }),
    product({ category: "alt_giyim", fit: "dar" }),
    []
  );
  check(
    scenario,
    "oversize üst + dar alt → pozitif bonus (+25)",
    balanced.generalScore === 25,
    `generalScore=${balanced.generalScore}, reasons=${balanced.reasons}`
  );

  const clashing = scoreCandidate(
    product({ category: "ust_giyim", fit: "oversize" }),
    product({ category: "alt_giyim", fit: "oversize" }),
    []
  );
  check(
    scenario,
    "oversize üst + oversize alt → belirgin ceza (-40)",
    clashing.generalScore === -40,
    `generalScore=${clashing.generalScore}`
  );
}

// =======================================================================
// SENARYO 4 — Stil taksonomisi ve uyum matrisi
// =======================================================================
{
  const scenario = "4. Stil taksonomisi";

  const sameStyle = scoreCandidate(
    product({ style_tag: STYLE_LABELS.vintage }),
    product({ style_tag: STYLE_LABELS.vintage }),
    []
  );
  check(
    scenario,
    "aynı style_tag → en yüksek stil bonusu (+30)",
    sameStyle.personalizationScore === 30 && sameStyle.reasons.includes("style_match"),
    `personalizationScore=${sameStyle.personalizationScore}, reasons=${sameStyle.reasons}`
  );

  const compatible = scoreCandidate(
    product({ style_tag: STYLE_LABELS.quiet_luxury }),
    product({ style_tag: STYLE_LABELS.old_money }),
    []
  );
  check(
    scenario,
    "quiet_luxury + old_money (uyumlu) → orta pozitif (+12)",
    compatible.personalizationScore === 12 && compatible.reasons.includes("style_harmony"),
    `personalizationScore=${compatible.personalizationScore}, reasons=${compatible.reasons}`
  );

  const clashingStyles = scoreCandidate(
    product({ style_tag: STYLE_LABELS.quiet_luxury }),
    product({ style_tag: STYLE_LABELS.grunge }),
    []
  );
  check(
    scenario,
    "quiet_luxury + grunge (çatışan) → ceza (-25)",
    clashingStyles.personalizationScore === -25,
    `personalizationScore=${clashingStyles.personalizationScore}`
  );

  const undefinedPair = scoreCandidate(
    product({ style_tag: STYLE_LABELS.minimalist }),
    product({ style_tag: "Tanımsız Rastgele Stil" }),
    []
  );
  check(
    scenario,
    "minimalist + tanımsız stil → nötr (0 etki)",
    undefinedPair.personalizationScore === 0,
    `personalizationScore=${undefinedPair.personalizationScore}, reasons=${undefinedPair.reasons}`
  );
}

// =======================================================================
// SENARYO 5 — Vintage dengeleme
// =======================================================================
{
  const scenario = "5. Vintage dengeleme";

  const vintageAnchor = product({ era: "90lar", style_tag: STYLE_LABELS.vintage });

  const withModern = scoreCandidate(
    vintageAnchor,
    product({ era: "guncel", style_tag: STYLE_LABELS.minimalist }),
    []
  );
  check(
    scenario,
    "90lar+vintage → guncel+minimalist: ekstra bonus ALMALI (+15)",
    withModern.reasons.includes("vintage_balance") && withModern.personalizationScore === 15,
    `personalizationScore=${withModern.personalizationScore}, reasons=${withModern.reasons}`
  );

  const withGrunge = scoreCandidate(
    vintageAnchor,
    product({ era: "guncel", style_tag: STYLE_LABELS.grunge }),
    []
  );
  check(
    scenario,
    "90lar+vintage → guncel+grunge: ekstra bonus ALMAMALI",
    !withGrunge.reasons.includes("vintage_balance") && withGrunge.personalizationScore === 0,
    `personalizationScore=${withGrunge.personalizationScore}, reasons=${withGrunge.reasons}`
  );
}

// =======================================================================
// SENARYO 6 — Kumaş / katmanlama
// =======================================================================
{
  const scenario = "6. Kumaş/katmanlama";

  const goodLayering = scoreCandidate(
    product({ category: "dis_giyim", fabric: "deri" }),
    product({ category: "ust_giyim", fabric: "ipek" }),
    []
  );
  check(
    scenario,
    "ağır dış giyim (deri) + hafif iç giyim (ipek) → bonus (+15)",
    goodLayering.reasons.includes("layering_balance") && goodLayering.personalizationScore === 15,
    `personalizationScore=${goodLayering.personalizationScore}, reasons=${goodLayering.reasons}`
  );

  const badLayering = scoreCandidate(
    product({ category: "dis_giyim", fabric: "ipek" }),
    product({ category: "ust_giyim", fabric: "deri" }),
    []
  );
  check(
    scenario,
    "hafif dış giyim (ipek) + ağır iç giyim (deri) → ceza (-20)",
    !badLayering.reasons.includes("layering_balance") && badLayering.personalizationScore === -20,
    `personalizationScore=${badLayering.personalizationScore}, reasons=${badLayering.reasons}`
  );

  let nullFabricThrew = false;
  let nullFabricResult: ReturnType<typeof scoreCandidate> | null = null;
  try {
    nullFabricResult = scoreCandidate(
      product({ category: "dis_giyim", fabric: null }),
      product({ category: "ust_giyim", fabric: "deri" }),
      []
    );
  } catch {
    nullFabricThrew = true;
  }
  check(
    scenario,
    "fabric null → hata fırlatmadan sessizce atlanır (0 etki)",
    !nullFabricThrew &&
      nullFabricResult !== null &&
      !nullFabricResult.reasons.includes("layering_balance") &&
      nullFabricResult.personalizationScore === 0,
    nullFabricThrew
      ? "hata fırlattı"
      : `personalizationScore=${nullFabricResult?.personalizationScore}, reasons=${nullFabricResult?.reasons}`
  );
}

// =======================================================================
// SENARYO 7 — Vücut tipi kişiselleştirmesi (MAHREMİYET KRİTİK)
// =======================================================================
{
  const scenario = "7. Vücut tipi (KRİTİK: mahremiyet)";

  const anchor = product({ category: "ust_giyim", fit: "dar" });
  const candidate = product({ category: "alt_giyim", fit: "dar" });

  const withBodyType = scoreCandidate(anchor, candidate, [], "kum_saati", null);
  const withoutBodyType = scoreCandidate(anchor, candidate, [], null, null);

  check(
    scenario,
    "kum_saati + iki dar parça → ekstra bonus (+10)",
    withBodyType.score - withoutBodyType.score === 10,
    `withBodyType=${withBodyType.score}, withoutBodyType=${withoutBodyType.score}, fark=${withBodyType.score - withoutBodyType.score}`
  );

  check(
    scenario,
    "body_type=null → AYNI çift için DAHA DÜŞÜK skor (kişiselleştirme yok)",
    withoutBodyType.score < withBodyType.score,
    `withBodyType=${withBodyType.score}, withoutBodyType=${withoutBodyType.score}`
  );

  // Açıklama metninde mahremiyet sızıntısı olmamalı — buildOutfitSuggestions
  // üzerinden gerçek bir öneri üretip metni denetliyoruz.
  const suggestionAnchor = product({ category: "ust_giyim", fit: "dar", title: "Kişisel Üst" });
  const altCandidate = product({ category: "alt_giyim", fit: "dar", title: "Kişisel Alt" });
  const shoeCandidate = product({ category: "ayakkabi", title: "Kişisel Ayakkabı" });

  const suggestions = buildOutfitSuggestions({
    anchor: suggestionAnchor,
    candidates: [altCandidate, shoeCandidate],
    userBodyType: "kum_saati",
  });

  const explanation = suggestions[0]?.explanation ?? "";
  const bodyLeakTerms = [
    "vücut",
    "vucut",
    "body_type",
    "kum_saati",
    "kum saati",
    "armut",
    "ters_ucgen",
    "ters üçgen",
    "dikdortgen",
    "dikdörtgen",
  ];
  const leaked = forbidWords(explanation, bodyLeakTerms);
  check(
    scenario,
    "Açıklama metninde vücut tipi terimleri GEÇMEMELİ",
    suggestions.length > 0 && leaked.length === 0,
    suggestions.length === 0
      ? "öneri üretilemedi (test kurgusu hatalı olabilir)"
      : `explanation="${explanation}", sızan terimler=${JSON.stringify(leaked)}`,
    true
  );
}

// =======================================================================
// SENARYO 8 — Cilt alt tonu kişiselleştirmesi (MAHREMİYET KRİTİK)
// =======================================================================
{
  const scenario = "8. Cilt alt tonu (KRİTİK: mahremiyet)";

  const neutralAnchor = product({ category: "ayakkabi", color_group: null });
  const warmTop = product({ category: "ust_giyim", color_group: "sicak" });

  const withSkin = scoreCandidate(neutralAnchor, warmTop, [], null, "sicak");
  const withoutSkin = scoreCandidate(neutralAnchor, warmTop, [], null, null);
  check(
    scenario,
    "sicak kullanıcı + color_group=sicak üst_giyim → bonus (+8)",
    withSkin.score - withoutSkin.score === 8,
    `withSkin=${withSkin.score}, withoutSkin=${withoutSkin.score}`
  );

  const farCategoryAnchor = product({ category: "alt_giyim", color_group: null });
  const warmShoe = product({ category: "ayakkabi", color_group: "sicak" });
  const withSkinFar = scoreCandidate(farCategoryAnchor, warmShoe, [], null, "sicak");
  const withoutSkinFar = scoreCandidate(farCategoryAnchor, warmShoe, [], null, null);
  check(
    scenario,
    "ayakkabi/çanta/aksesuar kategorisinde bonus UYGULANMAMALI",
    withSkinFar.score === withoutSkinFar.score,
    `withSkin=${withSkinFar.score}, withoutSkin=${withoutSkinFar.score}`
  );

  const suggestionAnchor = product({ category: "alt_giyim", title: "Cilt Testi Alt" });
  const topCandidate = product({ category: "ust_giyim", color_group: "sicak", title: "Cilt Testi Üst" });
  const shoeCandidate = product({ category: "ayakkabi", title: "Cilt Testi Ayakkabı" });

  const suggestions = buildOutfitSuggestions({
    anchor: suggestionAnchor,
    candidates: [topCandidate, shoeCandidate],
    userSkinUndertone: "sicak",
  });

  const explanation = suggestions[0]?.explanation ?? "";
  const skinLeakTerms = ["cilt", "ten rengi", "undertone", "sicak alt ton", "soguk alt ton"];
  const leaked = forbidWords(explanation, skinLeakTerms);
  check(
    scenario,
    "Açıklama metninde cilt tonu terimleri GEÇMEMELİ",
    suggestions.length > 0 && leaked.length === 0,
    suggestions.length === 0
      ? "öneri üretilemedi (test kurgusu hatalı olabilir)"
      : `explanation="${explanation}", sızan terimler=${JSON.stringify(leaked)}`,
    true
  );
}

// =======================================================================
// SENARYO 9 — Geriye dönük uyumluluk
// =======================================================================
{
  const scenario = "9. Geriye dönük uyumluluk";

  let threw = false;
  let result: ReturnType<typeof scoreCandidate> | null = null;
  try {
    result = scoreCandidate(
      product({ category: "ust_giyim" }),
      product({ category: "alt_giyim" }),
      []
    );
  } catch {
    threw = true;
  }
  check(
    scenario,
    "tüm opsiyonel alanlar null → ÇÖKMEMELİ",
    !threw,
    threw ? "hata fırlattı" : `score=${result?.score}`
  );
  check(
    scenario,
    "tüm opsiyonel alanlar null → skor nötr/düşük (0)",
    !threw && result?.score === 0,
    `score=${result?.score}, reasons=${result?.reasons}`
  );

  let suggestionsThrew = false;
  try {
    buildOutfitSuggestions({
      anchor: product({ category: "ust_giyim" }),
      candidates: [product({ category: "alt_giyim" }), product({ category: "ayakkabi" })],
    });
  } catch {
    suggestionsThrew = true;
  }
  check(
    scenario,
    "buildOutfitSuggestions da tamamen null verilerle ÇÖKMEMELİ",
    !suggestionsThrew,
    suggestionsThrew ? "hata fırlattı" : "ok"
  );
}

// =======================================================================
// SENARYO 10 — Açıklama metni tutarlılığı
// =======================================================================
{
  const scenario = "10. Açıklama metni tutarlılığı";

  const anchor = product({
    category: "alt_giyim",
    title: "Çeşitlilik Testi Kot",
    fit: "oversize",
    color_group: "notr",
    style_tag: STYLE_LABELS.streetwear,
  });

  const tops = [
    product({ category: "ust_giyim", fit: "dar", color_group: "notr", style_tag: STYLE_LABELS.streetwear, price: 500 }),
    product({ category: "ust_giyim", fit: "dar", color_group: "canli", style_tag: STYLE_LABELS.sporty, price: 500 }),
    product({ category: "ust_giyim", fit: "normal", color_group: "notr", style_tag: STYLE_LABELS.y2k, price: 500 }),
  ];
  const shoes = [
    product({ category: "ayakkabi", color_group: "notr", price: 500 }),
    product({ category: "ayakkabi", color_group: "canli", price: 500 }),
    product({ category: "ayakkabi", color_group: "notr", price: 500 }),
  ];

  const suggestions = buildOutfitSuggestions({
    anchor,
    candidates: [...tops, ...shoes],
    maxOutfits: 3,
  });

  const allNonEmpty = suggestions.every((s) => s.explanation.trim().length > 0);
  check(
    scenario,
    "Her önerinin açıklaması boş değil",
    suggestions.length > 0 && allNonEmpty,
    `öneri sayısı=${suggestions.length}, boş olan=${suggestions.filter((s) => !s.explanation.trim()).length}`
  );

  const allEndWithPeriod = suggestions.every((s) => /[.!]$/.test(s.explanation.trim()));
  check(
    scenario,
    "Her açıklama okunabilir bir cümle gibi bitiyor (nokta ile)",
    allEndWithPeriod,
    suggestions.map((s) => s.explanation).join(" | ")
  );

  const distinctExplanations = new Set(suggestions.map((s) => s.explanation));
  check(
    scenario,
    "En yüksek skorlu 2-3 önerinin açıklamaları çeşitlilik gösteriyor (şablon tekrarı değil)",
    suggestions.length < 2 || distinctExplanations.size > 1,
    `öneriler=${JSON.stringify(suggestions.map((s) => s.explanation))}`
  );

  console.log(`  [Senaryo 10 açıklamalar]`);
  suggestions.forEach((s, i) => console.log(`    ${i + 1}. (skor ${s.totalScore}) ${s.explanation}`));
}

// =======================================================================
// RAPOR
// =======================================================================

const scenarios = [...new Set(results.map((r) => r.scenario))];
let totalPass = 0;
let totalFail = 0;
let criticalFail = 0;

console.log("\n" + "=".repeat(70));
console.log("KOMBİN MOTORU TEST RAPORU");
console.log("=".repeat(70));

for (const scenario of scenarios) {
  const scenarioResults = results.filter((r) => r.scenario === scenario);
  console.log(`\n${scenario}`);
  for (const r of scenarioResults) {
    const mark = r.pass ? "✅ PASS" : r.critical ? "🔴 FAIL (KRİTİK)" : "❌ FAIL";
    console.log(`  ${mark} — ${r.name}`);
    if (!r.pass && r.detail) {
      console.log(`         beklenen: doğrulama koşulu sağlanmalıydı`);
      console.log(`         gerçekleşen: ${r.detail}`);
    }
    if (r.pass) totalPass++;
    else {
      totalFail++;
      if (r.critical) criticalFail++;
    }
  }
}

console.log("\n" + "=".repeat(70));
console.log(`ÖZET: ${totalPass} PASS, ${totalFail} FAIL (${criticalFail} kritik/mahremiyet)`);
console.log("=".repeat(70));

if (criticalFail > 0) {
  console.log(
    "\n🔴 KRİTİK: Mahremiyet kontrollerinde (Senaryo 7/8) FAIL var. Bu, kişisel " +
      "katmanların (vücut tipi/cilt tonu) açıklama metnine sızdığı anlamına gelir — " +
      "önce bu düzeltilmeli."
  );
}

process.exitCode = totalFail > 0 ? 1 : 0;
