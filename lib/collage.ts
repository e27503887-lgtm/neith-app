// Kombin akışındaki "parça kolajı" kartı için saf ızgara mantığı — DOM/React
// içermez, tek başına test edilebilir.
//
// Kural özeti:
//   0-1 parça → kolaj yok (çağıran taraf tekil fotoğraf kartına düşer)
//   2 parça   → 2x2, 1. (sol üst) ve 4. (sağ alt) hücreye ÇAPRAZ yerleşir
//   3 parça   → 2x2, 2. hücre (sağ üst) boş kalır
//   4 parça   → 2x2, sırayla doldurulur
//   5-6 parça → 3x2 ızgara
//   7+ parça  → 3x3 ızgara; kapasite (9) aşılırsa son hücrede "+N"

export type CollagePiece = { id: number | string; image_url: string };

export type CollageCell =
  | { kind: "piece"; piece: CollagePiece }
  | { kind: "empty"; pattern: "monogram" | "diagonal" }
  | { kind: "overflow"; count: number };

export type CollageLayout = {
  columns: number;
  rows: number;
  cells: CollageCell[];
};

const GRID_CAPACITY_3X3 = 9;

// Deterministik desen seçimi: aynı kombin her render'da aynı dolguyu
// gösterir (flicker olmaz), farklı kombinler arasında çeşitlilik sağlanır.
function pickPattern(seedKey: string, cellIndex: number): "monogram" | "diagonal" {
  let hash = 0;
  const input = `${seedKey}:${cellIndex}`;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? "monogram" : "diagonal";
}

function emptyCell(seedKey: string, cellIndex: number): CollageCell {
  return { kind: "empty", pattern: pickPattern(seedKey, cellIndex) };
}

function pieceCell(piece: CollagePiece): CollageCell {
  return { kind: "piece", piece };
}

export function computeCollageLayout(
  pieces: CollagePiece[],
  seedKey: string | number
): CollageLayout | null {
  const n = pieces.length;
  if (n < 2) return null;

  const seed = String(seedKey);

  if (n === 2) {
    // Çapraz yerleşim: sol üst + sağ alt dolu, diğer iki hücre dolgu deseni.
    return {
      columns: 2,
      rows: 2,
      cells: [pieceCell(pieces[0]), emptyCell(seed, 1), emptyCell(seed, 2), pieceCell(pieces[1])],
    };
  }

  if (n === 3) {
    // Sağ üst (2. hücre) boş; kalan üç hücre parçalarla dolu.
    return {
      columns: 2,
      rows: 2,
      cells: [pieceCell(pieces[0]), emptyCell(seed, 1), pieceCell(pieces[1]), pieceCell(pieces[2])],
    };
  }

  if (n === 4) {
    return { columns: 2, rows: 2, cells: pieces.map(pieceCell) };
  }

  if (n <= 6) {
    const cells: CollageCell[] = Array.from({ length: 6 }, (_, i) =>
      i < n ? pieceCell(pieces[i]) : emptyCell(seed, i)
    );
    return { columns: 3, rows: 2, cells };
  }

  // 7+ parça: 3x3. Kapasiteye sığıyorsa (≤9) hepsi görsel olarak gösterilir;
  // aşıyorsa ilk 8 hücre görsel, son hücre "+N" göstergesi.
  if (n <= GRID_CAPACITY_3X3) {
    const cells: CollageCell[] = Array.from({ length: 9 }, (_, i) =>
      i < n ? pieceCell(pieces[i]) : emptyCell(seed, i)
    );
    return { columns: 3, rows: 3, cells };
  }

  const cells: CollageCell[] = pieces.slice(0, 8).map(pieceCell);
  cells.push({ kind: "overflow", count: n - 8 });
  return { columns: 3, rows: 3, cells };
}
