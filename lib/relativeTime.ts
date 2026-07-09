import { formatDistanceToNowStrict } from "date-fns";
import { tr } from "date-fns/locale";

// "2 saat önce" → "2 sa önce" gibi kısa, Twitter tarzı Türkçe zaman etiketi.
const SHORT_UNITS: [RegExp, string][] = [
  [/ saniye/, " sn"],
  [/ dakika/, " dk"],
  [/ saat/, " sa"],
];

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  let label = formatDistanceToNowStrict(date, { locale: tr, addSuffix: true });
  for (const [pattern, replacement] of SHORT_UNITS) {
    label = label.replace(pattern, replacement);
  }
  return label;
}
