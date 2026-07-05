import { supabase } from "../utils/supabase";
import FashionWeekClient from "./FashionWeekClient";

export default async function FashionWeekPage() {
  const now = new Date().toISOString();

  const { data: activeWeeks } = await supabase
    .from("fashion_weeks")
    .select("*")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .limit(1);

  const { data: pastWeeks } = await supabase
    .from("fashion_weeks")
    .select("*")
    .lt("ends_at", now)
    .order("ends_at", { ascending: false })
    .limit(10);

  const activeWeek = (activeWeeks && activeWeeks[0]) || null;

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <FashionWeekClient activeWeek={activeWeek} pastWeeks={pastWeeks ?? []} />
    </main>
  );
}
