"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import FirstRunWizard from "@/components/FirstRunWizard";
import { Icon, registerToast } from "@/components/ui";
import { useJobsPoll, summarize, ProgressBar } from "@/components/jobsClient";

// labelKey resolves through t() at render time — NAV is a module-level const, so it
// can't call the translation hook itself.
const NAV = [
  { href: "/", icon: "grid", labelKey: "nav.worlds", match: (p) => p === "/" || p.startsWith("/worlds") },
  { href: "/usage", icon: "activity", labelKey: "nav.usage", match: (p) => p.startsWith("/usage") },
  { href: "/settings", icon: "settings", labelKey: "nav.settings", match: (p) => p.startsWith("/settings") },
  { href: "/info", icon: "info", labelKey: "nav.info", match: (p) => p.startsWith("/info") },
];

export default function Shell({ children }) {
  const { t } = useTranslation();
  const path = usePathname();
  const [toasts, setToasts] = useState([]);
  const [ver, setVer] = useState(null);
  const jobs = useJobsPoll();
  const jobSummary = summarize(jobs);

  useEffect(() => {
    fetch("/api/app/version").then((r) => r.json()).then(setVer).catch(() => {});
  }, []);

  const openRelease = () => {
    const url = ver?.releaseUrl;
    if (url) { try { window.open(url, "_blank"); } catch {} }
  };

  useEffect(() => {
    registerToast((msg, kind) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t, { id, msg, kind }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
    });
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", height: "100vh", overflow: "hidden" }}>
      <FirstRunWizard />
      {/* PSM 3.0 fixed-width glass sidebar */}
      <aside style={{
        width: 280,
        background: "var(--sidebar)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        boxShadow: "8px 0 32px rgba(0,0,0,0.35)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderRight: "1px solid var(--line)",
      }}>
        {/* Logo area */}
        <div style={{ padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 12, overflow: "hidden", display: "grid", placeItems: "center", flexShrink: 0, background: "var(--accent)" }}>
              <img src="/icon.png" alt="PSM" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.2, color: "var(--ink)" }}>PSM</div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.72rem", color: "var(--ink-muted)", lineHeight: 1.2 }}>{t("app.name")}</div>
            </div>
          </div>
        </div>
        <div style={{ margin: "0 24px", height: 1, background: "var(--line)" }} />

        {/* nav */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px 18px 18px" }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--ink-muted)",
            padding: "24px 24px 12px",
          }}>
            {t("sidebar.management")}
          </div>
          {NAV.map((n) => (
            <NavItem key={n.href} {...n} label={t(n.labelKey)} active={n.match(path)} />
          ))}
          <DownloadsNavItem active={path.startsWith("/downloads")} summary={jobSummary} label={t("nav.downloads")} />
        </div>

        {/* footer: server status + version / update */}
        <div style={{ padding: "18px 24px", flexShrink: 0 }}>
          <div style={{ margin: "0 0 14px", height: 1, background: "var(--line)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: 14 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--green-bright)", boxShadow: "0 0 8px rgba(74,222,128,0.45)" }} />
            <span style={{ fontWeight: 600, fontSize: "0.78rem", color: "var(--ink-soft)" }}>{t("server.online") || "Online"}</span>
          </div>
          {ver?.updateAvailable && (
            <button onClick={openRelease} title="Open the latest release to download"
              style={{
                width: "100%", marginBottom: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: 12,
                background: "linear-gradient(135deg, #6E3CFF 0%, #A43CFF 100%)", color: "#fff", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.78rem",
              }}>
              <Icon name="download" size={15} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {t("app.updateAvailable", { version: ver.latest })}
              </span>
            </button>
          )}
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700, fontSize: "0.78rem", whiteSpace: "nowrap", color: "var(--ink)" }}>{t("app.name")}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--ink-muted)" }}>
              v{ver?.current || "—"}{ver && !ver.updateAvailable && ver.checked ? ` · ${t("app.upToDate")}` : ""}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: "auto", background: "var(--bg)" }}>
        <div style={{ padding: "48px", maxWidth: 1600, margin: "0 auto" }}>
          {children}
        </div>
      </main>

      {/* Toasts */}
      <div style={{ position: "fixed", right: 18, bottom: 18, display: "flex", flexDirection: "column", gap: 8, zIndex: 50 }}>
        {toasts.map((t) => (
          <div key={t.id} className="panel animate-floatUp" style={{
            padding: "0.7rem 1rem", minWidth: 220, maxWidth: 340, fontWeight: 600, fontSize: "0.88rem",
            borderLeft: `3px solid ${t.kind === "error" ? "var(--red)" : t.kind === "success" ? "var(--green-bright)" : "var(--accent)"}`,
          }}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active }) {
  return (
    <Link href={href}
      style={{
        display: "flex", alignItems: "center", gap: "14px",
        height: 60, padding: "0 24px", borderRadius: 18,
        textDecoration: "none",
        fontWeight: 600, fontSize: 15,
        color: active ? "#fff" : "var(--ink-soft)",
        background: active ? "linear-gradient(135deg, #6E3CFF 0%, #A43CFF 100%)" : "transparent",
        boxShadow: active ? "0 0 20px rgba(124,77,255,0.30)" : "none",
        transition: "background 180ms ease-out, color 180ms ease-out, box-shadow 180ms ease-out",
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--ink)"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-soft)"; } }}
    >
      <Icon name={icon} size={22} />
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
    </Link>
  );
}

// Sidebar "Downloads" entry — a permanent nav item that shows a live count and
// aggregate progress while installs/updates run, and links to the Downloads page.
function DownloadsNavItem({ active, summary, label }) {
  const { activeCount, percent, anyError } = summary;
  const busy = activeCount > 0;
  const dotColor = anyError ? "var(--red)" : "var(--accent)";

  return (
    <Link href="/downloads"
      style={{
        display: "block", height: busy ? "auto" : 60, padding: busy ? "10px 24px" : "0 24px",
        borderRadius: 18, textDecoration: "none", fontWeight: 600, fontSize: 15,
        color: active ? "#fff" : "var(--ink-soft)",
        background: active ? "linear-gradient(135deg, #6E3CFF 0%, #A43CFF 100%)" : "transparent",
        boxShadow: active ? "0 0 20px rgba(124,77,255,0.30)" : "none",
        transition: "background 180ms ease-out, color 180ms ease-out, box-shadow 180ms ease-out",
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--ink)"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-soft)"; } }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", position: "relative", minHeight: busy ? 40 : 60 }}>
        <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <Icon name="download" size={22} />
          {busy && (
            <span className="animate-pulseDot" style={{ position: "absolute", top: -3, right: -4, width: 8, height: 8, borderRadius: 999, background: dotColor, border: "1.5px solid #121024" }} />
          )}
        </span>
        <span style={{ whiteSpace: "nowrap", flex: 1 }}>{label}</span>
        {busy && (
          <span style={{
            background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)",
            fontSize: "0.7rem", fontWeight: 800, padding: "0.15rem 0.5rem", borderRadius: 999, color: active ? "#fff" : "var(--ink-soft)",
          }}>
            {activeCount}
          </span>
        )}
      </div>
      {busy && (
        <ProgressBar percent={percent} style={{ marginTop: "0.6rem", height: 5, background: "rgba(255,255,255,0.08)" }} />
      )}
    </Link>
  );
}
