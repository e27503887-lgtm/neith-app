"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "../utils/supabase";
import ArticleManager from "./ArticleManager";
import AdminReports from "../components/AdminReports";

type Product = {
  id: number | string;
  title: string;
  image_url: string;
  username: string;
  seller_type?: string | null;
  created_at: string;
};

type Outfit = {
  id: number | string;
  title: string;
  image_url: string;
  user_id: string;
  created_at: string;
  username: string;
};

type ApplicationStatus = "pending" | "approved" | "rejected";

type BrandApplication = {
  id: number | string;
  user_id: string;
  brand_name: string;
  website: string | null;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  username: string;
};

type Tab = "products" | "outfits" | "applications" | "articles" | "reports";

export default function AdminPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<Tab>("products");
  const [search, setSearch] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [applications, setApplications] = useState<BrandApplication[]>([]);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (!profile?.is_admin) {
        router.replace("/");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);
    }

    checkAccess();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!authorized) return;

    let active = true;

    async function loadData() {
      setLoadingData(true);

      const [{ data: productRows }, { data: outfitRows }, { data: applicationRows }] =
        await Promise.all([
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("outfits").select("*").order("created_at", { ascending: false }),
          supabase.from("brand_applications").select("*").order("created_at", { ascending: false }),
        ]);

      const outfitUserIds = (outfitRows ?? []).map((o) => o.user_id);
      const applicantIds = (applicationRows ?? []).map((a) => a.user_id);
      const profileIds = [...new Set([...outfitUserIds, ...applicantIds])];

      const { data: relatedProfiles } = profileIds.length
        ? await supabase.from("profiles").select("id, username").in("id", profileIds)
        : { data: [] as { id: string; username: string }[] };

      if (!active) return;

      const usernameById = new Map((relatedProfiles ?? []).map((p) => [p.id, p.username]));

      setProducts(productRows ?? []);

      setOutfits(
        (outfitRows ?? []).map((o) => ({
          ...o,
          username: usernameById.get(o.user_id) ?? "Bilinmeyen kullanıcı",
        }))
      );

      setApplications(
        (applicationRows ?? [])
          .map((a) => ({
            ...a,
            username: usernameById.get(a.user_id) ?? "Bilinmeyen kullanıcı",
          }))
          .sort((a, b) => (a.status === b.status ? 0 : a.status === "pending" ? -1 : b.status === "pending" ? 1 : 0))
      );

      setLoadingData(false);
    }

    loadData();
    return () => {
      active = false;
    };
  }, [authorized]);

  function setBusy(key: string, busy: boolean) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function handleDeleteProduct(product: Product) {
    if (!window.confirm(`"${product.title}" ilanını silmek istediğine emin misin?`)) return;

    const key = `product-${product.id}`;
    setBusy(key, true);
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    setBusy(key, false);

    if (error) {
      window.alert("İlan silinirken bir hata oluştu: " + error.message);
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  async function handleDeleteOutfit(outfit: Outfit) {
    if (!window.confirm(`"${outfit.title}" kombinini silmek istediğine emin misin?`)) return;

    const key = `outfit-${outfit.id}`;
    setBusy(key, true);
    await supabase.from("outfit_items").delete().eq("outfit_id", outfit.id);
    const { error } = await supabase.from("outfits").delete().eq("id", outfit.id);
    setBusy(key, false);

    if (error) {
      window.alert("Kombin silinirken bir hata oluştu: " + error.message);
      return;
    }

    setOutfits((prev) => prev.filter((o) => o.id !== outfit.id));
  }

  async function handleApprove(application: BrandApplication) {
    const key = `app-${application.id}`;
    setBusy(key, true);

    const { error: statusError } = await supabase
      .from("brand_applications")
      .update({ status: "approved" })
      .eq("id", application.id);

    if (!statusError) {
      await supabase.from("profiles").update({ account_type: "brand" }).eq("id", application.user_id);
    }

    setBusy(key, false);

    if (statusError) {
      window.alert("Başvuru onaylanırken bir hata oluştu: " + statusError.message);
      return;
    }

    setApplications((prev) => prev.map((a) => (a.id === application.id ? { ...a, status: "approved" } : a)));
  }

  async function handleReject(application: BrandApplication) {
    const key = `app-${application.id}`;
    setBusy(key, true);

    const { error } = await supabase
      .from("brand_applications")
      .update({ status: "rejected" })
      .eq("id", application.id);

    setBusy(key, false);

    if (error) {
      window.alert("Başvuru reddedilirken bir hata oluştu: " + error.message);
      return;
    }

    setApplications((prev) => prev.map((a) => (a.id === application.id ? { ...a, status: "rejected" } : a)));
  }

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.title?.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const filteredOutfits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? outfits.filter((o) => o.title?.toLowerCase().includes(q)) : outfits;
  }, [outfits, search]);

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  if (checkingAuth || !authorized) {
    return null;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "products", label: "İlanlar" },
    { key: "outfits", label: "Kombinler" },
    { key: "applications", label: `Marka Başvuruları${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "articles", label: "Makaleler" },
    { key: "reports", label: "Şikayetler" },
  ];

  return (
    <main className="min-h-screen bg-paper pt-24 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="section-label">Yönetici</p>
          <h1 className="font-serif text-3xl text-ink mt-2">Kontrol Paneli</h1>
          <p className="text-sm text-gray-500 mt-2">
            {loadingData
              ? "Yükleniyor..."
              : `${products.length} ilan, ${outfits.length} kombin, ${pendingCount} bekleyen başvuru`}
          </p>
        </div>

        <div className="flex gap-6 border-b border-neutral-200 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-3 -mb-px border-b-2 text-sm font-medium transition-colors ${
                tab === t.key ? "border-accent text-ink" : "border-transparent text-gray-500 hover:text-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(tab === "products" || tab === "outfits") && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Başlığa göre ara..."
            className="w-full max-w-sm mb-6 p-2.5 border border-neutral-200 text-sm focus:outline-none focus:border-ink transition-colors"
          />
        )}

        {tab === "articles" ? (
          <ArticleManager />
        ) : tab === "reports" ? (
          <AdminReports />
        ) : loadingData ? (
          <p className="text-sm text-gray-500">Yükleniyor...</p>
        ) : (
          <>
            {tab === "products" && (
              <div className="border border-neutral-200 divide-y divide-neutral-200">
                {filteredProducts.length === 0 && <p className="p-6 text-sm text-gray-500">İlan bulunamadı.</p>}
                {filteredProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 p-3">
                    <div className="relative w-12 h-12 shrink-0 bg-gray-100 overflow-hidden">
                      <Image src={product.image_url} alt={product.title} fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink truncate">{product.title}</p>
                      <p className="text-xs text-gray-500">
                        @{product.username} · {new Date(product.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500 border border-neutral-300 px-2 py-0.5 shrink-0">
                      {product.seller_type === "brand" ? "Marka" : "Bireysel"}
                    </span>
                    <button
                      onClick={() => handleDeleteProduct(product)}
                      disabled={busyIds.has(`product-${product.id}`)}
                      className="text-xs uppercase tracking-wide text-accent border border-accent px-3 py-1.5 hover:bg-accent hover:text-paper transition-colors disabled:opacity-50 shrink-0"
                    >
                      {busyIds.has(`product-${product.id}`) ? "Siliniyor..." : "Sil"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "outfits" && (
              <div className="border border-neutral-200 divide-y divide-neutral-200">
                {filteredOutfits.length === 0 && <p className="p-6 text-sm text-gray-500">Kombin bulunamadı.</p>}
                {filteredOutfits.map((outfit) => (
                  <div key={outfit.id} className="flex items-center gap-4 p-3">
                    <div className="relative w-12 h-12 shrink-0 bg-gray-100 overflow-hidden">
                      <Image src={outfit.image_url} alt={outfit.title} fill sizes="48px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink truncate">{outfit.title}</p>
                      <p className="text-xs text-gray-500">
                        @{outfit.username} · {new Date(outfit.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteOutfit(outfit)}
                      disabled={busyIds.has(`outfit-${outfit.id}`)}
                      className="text-xs uppercase tracking-wide text-accent border border-accent px-3 py-1.5 hover:bg-accent hover:text-paper transition-colors disabled:opacity-50 shrink-0"
                    >
                      {busyIds.has(`outfit-${outfit.id}`) ? "Siliniyor..." : "Sil"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "applications" && (
              <div className="border border-neutral-200 divide-y divide-neutral-200">
                {applications.length === 0 && <p className="p-6 text-sm text-gray-500">Başvuru bulunamadı.</p>}
                {applications.map((application) => (
                  <div key={application.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{application.brand_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          @{application.username} · {new Date(application.created_at).toLocaleDateString("tr-TR")}
                        </p>
                        {application.website && (
                          <a
                            href={application.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent underline underline-offset-4 mt-1 inline-block"
                          >
                            {application.website}
                          </a>
                        )}
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-wide px-2 py-0.5 shrink-0 border ${
                          application.status === "pending"
                            ? "border-neutral-300 text-gray-500"
                            : application.status === "approved"
                              ? "border-green-600 text-green-600"
                              : "border-red-600 text-red-600"
                        }`}
                      >
                        {application.status === "pending"
                          ? "Bekliyor"
                          : application.status === "approved"
                            ? "Onaylandı"
                            : "Reddedildi"}
                      </span>
                    </div>

                    {application.message && <p className="text-sm text-gray-600">{application.message}</p>}

                    {application.status === "pending" && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(application)}
                          disabled={busyIds.has(`app-${application.id}`)}
                          className="btn-primary"
                        >
                          {busyIds.has(`app-${application.id}`) ? "İşleniyor..." : "Onayla"}
                        </button>
                        <button
                          onClick={() => handleReject(application)}
                          disabled={busyIds.has(`app-${application.id}`)}
                          className="text-xs uppercase tracking-wide text-gray-500 border border-neutral-300 px-6 py-3 hover:border-ink hover:text-ink transition-colors disabled:opacity-50"
                        >
                          {busyIds.has(`app-${application.id}`) ? "İşleniyor..." : "Reddet"}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
