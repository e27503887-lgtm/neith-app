import { Mail } from "lucide-react";

export default function MessagesPage() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-24 px-6 flex items-center justify-center">
      <div className="bg-white border border-gray-100 rounded-xl p-10 flex flex-col items-center gap-3 text-center">
        <Mail size={32} className="text-gray-400" />
        <h1 className="text-lg font-semibold">Mesajlar</h1>
        <p className="text-gray-500 text-sm">Yakında!</p>
      </div>
    </main>
  );
}
