import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(
          `${requestUrl.origin}/login?error=oauth_failed`
        );
      }

      // Profil yoksa oluştur
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          const username =
            user.user_metadata?.full_name?.replace(/\s+/g, "").toLowerCase() ||
            user.email?.split("@")[0] ||
            `user_${user.id.slice(0, 8)}`;
          
          await supabase
            .from("profiles")
            .insert([
              {
                id: user.id,
                username,
                bio: "",
                avatar_url: user.user_metadata?.avatar_url || null,
              },
            ]);
        }
      }

      return NextResponse.redirect(`${requestUrl.origin}/`);
    } catch (err) {
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=oauth_failed`
      );
    }
  }

  // Eğer code yoksa login'e yönlendir
  return NextResponse.redirect(`${requestUrl.origin}/login?error=oauth_failed`);
}
