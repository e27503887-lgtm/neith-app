import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Hesap silme (KVKK). auth.admin.deleteUser service role key gerektirir;
// bu key YALNIZCA bu route handler'da kullanılır, istemciye asla inmez
// (NEXT_PUBLIC_ öneki yok — bundle'a giremez). Önce isteği yapan
// kullanıcının oturumu doğrulanır, sonra yalnızca KENDİ hesabı silinir.

// İstemci, silme özelliğinin aktif olup olmadığını buradan öğrenir —
// yalnızca bir boolean döner, anahtarın kendisi asla sızmaz.
export async function GET() {
  return NextResponse.json({ enabled: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json({ error: "Giriş yapmalısın." }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Sunucu yapılandırması eksik (SUPABASE_SERVICE_ROLE_KEY)." },
      { status: 500 }
    );
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Hesap silinemedi: " + deleteError.message },
      { status: 500 }
    );
  }

  // Cascade'ler profil ve içerikleri temizler.
  return NextResponse.json({ ok: true });
}
