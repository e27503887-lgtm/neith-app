import { redirect } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../utils/supabase";
import JoinClient from "./JoinClient";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function JoinPage({ params }: Props) {
  const { code } = await params;

  const { data: inviter } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("invite_code", code)
    .maybeSingle();

  if (!inviter) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6 flex items-center justify-center">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="flex justify-center">
          {inviter.avatar_url ? (
            <Image
              src={inviter.avatar_url}
              alt={inviter.username}
              width={80}
              height={80}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-semibold text-gray-600">
              {inviter.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-serif text-2xl text-ink">
            @{inviter.username} seni Neith&apos;e davet etti
          </h1>
          <p className="text-gray-500 text-sm mt-3">
            Neith; ikinci el modanı paylaştığın, keşfettiğin ve stilini sergilediğin bir
            topluluk. Kombinlerini paylaş, gardırobunu sat, ilham al.
          </p>
        </div>

        <JoinClient code={code} />
      </div>
    </main>
  );
}
