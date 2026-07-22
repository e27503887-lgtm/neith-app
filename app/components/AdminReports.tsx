"use client";

// Admin panelindeki "Şikayetler" sekmesi: open olanlar üstte, şikayet
// edilen içeriğe link, "İncelendi" / "İşlem Yapıldı" durum butonları.
// Görüntüleme/güncelleme yetkisi RLS'te admine tanımlı.

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../utils/supabase";

type ReportStatus = "open" | "reviewed" | "actioned";

type Report = {
  id: number | string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  created_at: string;
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: "Açık",
  reviewed: "İncelendi",
  actioned: "İşlem Yapıldı",
};

const STATUS_ORDER: Record<string, number> = { open: 0, reviewed: 1, actioned: 2 };

function targetHref(report: Report, usernameById: Map<string, string>): string | null {
  switch (report.target_type) {
    case "product":
      return `/product/${report.target_id}`;
    case "outfit":
      return `/outfit/${report.target_id}`;
    case "post":
      return `/post/${report.target_id}`;
    case "profile": {
      const username = usernameById.get(report.target_id);
      return username ? `/profile/${username}` : null;
    }
    default:
      return null; // yorumların ayrı sayfası yok
  }
}

const TYPE_LABELS: Record<string, string> = {
  product: "Ürün",
  outfit: "Kombin",
  post: "Gönderi",
  profile: "Profil",
  comment: "Yorum",
};

export default function AdminReports() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [usernameById, setUsernameById] = useState<Map<string, string>>(new Map());
  const [busyId, setBusyId] = useState<number | string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      const rows = (data ?? []) as Report[];

      // Profil şikayetlerinde link için kullanıcı adları çözülür.
      const profileIds = [
        ...new Set(
          rows.filter((r) => r.target_type === "profile").map((r) => r.target_id)
        ),
      ];
      const { data: profiles } = profileIds.length
        ? await supabase.from("profiles").select("id, username").in("id", profileIds)
        : { data: [] as { id: string; username: string }[] };

      if (!active) return;
      setUsernameById(new Map((profiles ?? []).map((p) => [p.id, p.username])));
      setReports(rows);
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function setStatus(report: Report, status: ReportStatus) {
    setBusyId(report.id);
    const { error } = await supabase.from("reports").update({ status }).eq("id", report.id);
    if (!error) {
      setReports((prev) =>
        (prev ?? []).map((r) => (r.id === report.id ? { ...r, status } : r))
      );
    }
    setBusyId(null);
  }

  if (reports === null) {
    return <p className="text-sm text-gray-500">Yükleniyor...</p>;
  }

  if (reports.length === 0) {
    return <p className="text-sm text-gray-500">Henüz şikayet yok.</p>;
  }

  const sorted = [...reports].sort(
    (a, b) =>
      (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="border border-neutral-200 divide-y divide-neutral-200">
      {sorted.map((report) => {
        const href = targetHref(report, usernameById);
        return (
          <div key={String(report.id)} className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                  report.status === "open"
                    ? "border-accent text-accent"
                    : "border-neutral-300 text-gray-500"
                }`}
              >
                {STATUS_LABELS[report.status] ?? report.status}
              </span>
              <span className="text-xs uppercase tracking-wide text-gray-500">
                {TYPE_LABELS[report.target_type] ?? report.target_type}
              </span>
              <span className="text-sm font-medium text-ink">{report.reason}</span>
              <span className="ml-auto text-xs text-gray-500">
                {new Date(report.created_at).toLocaleDateString("tr-TR")}
              </span>
            </div>

            {report.description && (
              <p className="text-sm text-gray-600 leading-6">{report.description}</p>
            )}

            <div className="flex items-center gap-4">
              {href ? (
                <Link
                  href={href}
                  className="text-xs uppercase tracking-wide text-accent underline underline-offset-4 hover:text-ink transition-colors"
                >
                  İçeriğe git →
                </Link>
              ) : (
                <span className="text-xs text-gray-500">
                  Hedef: {report.target_type} #{report.target_id}
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                {report.status !== "reviewed" && (
                  <button
                    type="button"
                    onClick={() => setStatus(report, "reviewed")}
                    disabled={busyId === report.id}
                    className="text-xs uppercase tracking-wide border border-neutral-300 text-gray-600 px-3 py-1.5 hover:border-primary hover:text-ink transition-colors disabled:opacity-50"
                  >
                    İncelendi
                  </button>
                )}
                {report.status !== "actioned" && (
                  <button
                    type="button"
                    onClick={() => setStatus(report, "actioned")}
                    disabled={busyId === report.id}
                    className="text-xs uppercase tracking-wide border border-primary text-ink px-3 py-1.5 hover:bg-primary hover:text-dark transition-colors disabled:opacity-50"
                  >
                    İşlem Yapıldı
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
