import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { MIN_ITEMS, buildStyleReport, buildWeeklyCalendar } from "@/lib/styleAssistant";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const [{ data: products }, { data: outfits }] = await Promise.all([
    supabase.from("products").select("id, title, price, era").eq("user_id", user.id),
    supabase.from("outfits").select("id, title, era").eq("user_id", user.id),
  ]);

  const productList = products ?? [];
  const outfitList = outfits ?? [];

  if (productList.length + outfitList.length < MIN_ITEMS) {
    return NextResponse.json(
      { error: "Öneri üretmek için en az 3 ürün/kombin paylaşman gerekiyor." },
      { status: 422 }
    );
  }

  const reportText = buildStyleReport({ userId: user.id, products: productList, outfits: outfitList });
  const weeklyCalendar = buildWeeklyCalendar({ userId: user.id, products: productList });
  const generatedAt = new Date().toISOString();

  const { error: upsertError } = await supabase.from("style_reports").upsert(
    {
      user_id: user.id,
      report_text: reportText,
      weekly_calendar: weeklyCalendar,
      generated_at: generatedAt,
    },
    { onConflict: "user_id" }
  );

  if (upsertError) {
    return NextResponse.json(
      { error: "Rapor kaydedilirken bir hata oluştu: " + upsertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    report_text: reportText,
    weekly_calendar: weeklyCalendar,
    generated_at: generatedAt,
  });
}
