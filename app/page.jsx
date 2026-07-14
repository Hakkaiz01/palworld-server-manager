"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { api, Icon, StatusChip, fmtUptime, fmtBytes, toast } from "@/components/ui";
import CreateWorldModal from "@/components/CreateWorldModal";

const ACTION_TOAST = { start: "toast.worldStarted", stop: "toast.worldStopped", restart: "toast.worldRestarted" };

// Mini CPU sparkline — dependency-free inline SVG
function Sparkline({ points, color, width = 80, height = 24 }) {
  if (!points || points.length < 2) return null;
  const vals = points.map((p) => p.v);
  const min = Math.min(...vals), max = Math.max(...vals) || 1;
  const range = max - min || 1;
  const step = width / (vals.length - 1);
  const pts = vals.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 2) - 1}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline fill="none" stroke={color || "var(--accent)"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

export default function WorldsPage() {
  const { t } = useTranslation();
  const [worlds, setWorlds] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState({});
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [worldsRes, metricsRes] = await Promise.all([
        api("/api/worlds"),
        fetch("/api/metrics", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      ]);
      setWorlds(worldsRes.worlds);
      if (metricsRes?.ok) setMetrics(metricsRes);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  const doAction = async (id, action) => {
    setBusy((b) => ({ ...b, [id]: action }));
    try {
      await api(`/api/worlds/${id}/action`, { method: "POST", body: { action } });
      toast(t(ACTION_TOAST[action] || "toast.worldStarted"), "success");
      setTimeout(load, 600);
    } catch (e) { toast(e.message, "error"); }
    finally { setBusy((b) => ({ ...b, [id]: null })); }
  };

  const checkUpdates = async () => {
    setChecking(true);
    try {
      const r = await api("/api/updates/check");
      toast(r.latest ? t("worlds.latestBuild", { build: r.latest, count: r.worlds.length }) : t("worlds.steamUnreachable"), r.latest ? "success" : "error");
      load();
    } catch (e) { toast(e.message, "error"); }
    finally { setChecking(false); }
  };

  const running = worlds.filter((w) => w.running).length;
  const players = worlds.reduce((a, w) => a + (w.live?.currentPlayers || 0), 0);

  return (
    <div>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className="heading" style={{ fontSize: "40px", margin: 0, lineHeight: 1.1 }}>{t("worlds.title")}</h1>
          <p className="subtle" style={{ margin: "0.35rem 0 0", fontSize: "16px", fontWeight: 500, color: "var(--ink-soft)" }}>
            {t("worlds.summary", { count: worlds.length, running, players })}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={checkUpdates} disabled={checking} style={{ height: "48px", borderRadius: "var(--radius-md)" }}>
            <Icon name="refresh" /> {checking ? t("common.checking") : t("worlds.checkUpdates")}
          </button>
          <button className="btn btn-gradient" onClick={() => setShowCreate(true)} style={{ height: "48px", borderRadius: "var(--radius-md)" }}>
            <Icon name="plus" /> {t("worlds.newWorld")}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="panel subtle" style={{ padding: "2rem", textAlign: "center" }}>{t("common.loading")}</div>
      ) : worlds.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.25rem" }}>
          {worlds.map((w) => (
            <WorldCard key={w.world_id} w={w} busy={busy[w.world_id]} onAction={doAction} metrics={metrics} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateWorldModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />
      )}
    </div>
  );
}

function WorldCard({ w, busy, onAction, metrics }) {
  const { t } = useTranslation();
  const isBusy = !!busy;
  const accent = w.accent_color || "var(--accent)";
  const glow = w.running ? "var(--green)" : "var(--ink-muted)";

  return (
    <div className="panel world-card" style={{
      position: "relative",
      height: "330px",
      borderRadius: "var(--radius-lg)",
      padding: "1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
      overflow: "hidden",
      transition: "transform 220ms ease-out, box-shadow 220ms ease-out",
    }}>
      {/* subtle banner wash */}
      {w.banner_data && (
        <>
          <div aria-hidden style={{
            position: "absolute", inset: 0, zIndex: 0,
            backgroundImage: `url(${w.banner_data})`,
            backgroundSize: "cover", backgroundPosition: "center",
            opacity: 0.18, pointerEvents: "none",
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 60%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 60%)",
          }} />
          <div aria-hidden style={{
            position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
            background: "linear-gradient(to bottom, var(--card) 35%, transparent 80%)",
          }} />
        </>
      )}

      {/* Top row: avatar + name/badges */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        <div style={{
          position: "relative",
          width: 110, height: 110, borderRadius: "22px", flexShrink: 0,
          background: w.icon_data ? "transparent" : "var(--card-2)",
          border: `1px solid var(--line)`,
          boxShadow: `0 0 28px ${accent}55`,
          overflow: "hidden",
          display: "grid", placeItems: "center",
        }}>
          {w.icon_data ? (
            <img src={w.icon_data} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Icon name="globe" size={48} />
          )}
          {/* status dot */}
          <span style={{
            position: "absolute", bottom: 8, right: 8,
            width: 10, height: 10, borderRadius: "50%",
            background: w.running ? "var(--green)" : "var(--ink-muted)",
            border: "2px solid var(--card)",
            boxShadow: w.running ? "0 0 10px var(--green)" : "none",
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <Link href={`/worlds/${w.world_id}`} className="heading" style={{ fontSize: "24px", textDecoration: "none", color: "var(--ink)" }}>
              {w.display_name}
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
            <StatusChip status={w.status} running={w.running} />
            {w.community_server ? (
              <span className="chip" style={{ background: "var(--line)", color: "var(--ink-soft)" }} title={t("worlds.communityTip")}>{t("worlds.community")}</span>
            ) : (
              <span className="chip" style={{ background: "var(--line)", color: "var(--ink-soft)" }} title={t("worlds.privateTip")}>{t("worlds.private")}</span>
            )}
            {w.updateAvailable && (
              <span className="chip" style={{ background: "rgba(255,201,77,0.15)", color: "var(--yellow)" }}>{t("worlds.updateAvailable")}</span>
            )}
          </div>
          <div className="subtle" style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink-muted)", marginTop: "0.25rem" }}>
            {t("worlds.portsLine", { game: w.game_port, rest: w.rest_api_port, build: w.build_id || "—" })}
          </div>
        </div>
      </div>

      {/* Metrics panel */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "auto" }}>
        <Metric icon="users" label={t("common.players")} value={w.live ? `${w.live.currentPlayers}${w.live.maxPlayers ? "/" + w.live.maxPlayers : ""}` : "—"} />
        <Metric icon="clock" label={t("common.uptime")} value={w.live ? fmtUptime(w.live.uptime) : "—"} />
        <Metric icon="activity" label={t("world.serverFps")} value={w.live?.fps ?? "—"} />
        <Metric icon="cpu" label={t("common.cpu")} value={w.live?.cpu != null ? `${w.live.cpu}%` : "—"} />
        <Metric icon="download" label={t("common.ram")} value={w.live?.ram != null ? fmtBytes(w.live.ram) : "—"} />
        <Metric icon="globe" label={t("common.ping")} value={w.live?.ping != null ? `${w.live.ping}ms` : "—"} />
        {metrics && metrics.items && (() => {
          const m = metrics.items.find((i) => i.world_id === w.world_id);
          if (!m || !m.history || m.history.length < 2) return null;
          return (
            <div style={{ width: 180, display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.04)", display: "grid", placeItems: "center" }}>
                <Sparkline points={m.history} color={accent} width={38} height={22} />
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>CPU</div>
                <div className="subtle" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>trend</div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Actions */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: "0.6rem", justifyContent: "flex-end", marginTop: "auto" }}>
        {w.running ? (
          <>
            <button className="btn btn-outline" disabled={isBusy} onClick={() => onAction(w.world_id, "restart")} title={t("common.restart")} style={{ height: "48px", borderRadius: "var(--radius-md)" }}>
              <Icon name="restart" /> {t("common.restart")}
            </button>
            <button className="btn btn-danger" disabled={isBusy} onClick={() => onAction(w.world_id, "stop")} title={t("common.stop")} style={{ height: "48px", borderRadius: "var(--radius-md)" }}>
              <Icon name="stop" /> {t("common.stop")}
            </button>
          </>
        ) : (
          <button className="btn btn-gradient" disabled={isBusy} onClick={() => onAction(w.world_id, "start")} title={t("common.start")} style={{ height: "48px", borderRadius: "var(--radius-md)" }}>
            <Icon name="play" /> {busy === "start" ? t("common.starting") : t("common.start")}
          </button>
        )}
        <Link href={`/worlds/${w.world_id}`} className="btn btn-outline" style={{ height: "48px", borderRadius: "var(--radius-md)", textDecoration: "none" }}>{t("common.manage")}</Link>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }) {
  return (
    <div style={{ width: 180, display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{
        width: 48, height: 48, borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.04)",
        display: "grid", placeItems: "center",
        color: "var(--ink-soft)",
      }}>
        <Icon name={icon} size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--ink)" }}>{value}</div>
        <div className="subtle" style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-muted)" }}>{label}</div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }) {
  const { t } = useTranslation();
  return (
    <div className="panel" style={{
      padding: "3.5rem 2rem", textAlign: "center",
      borderRadius: "var(--radius-lg)",
      background: "var(--card)",
      border: "1px solid var(--line)",
      boxShadow: "0 20px 50px rgba(124,77,255,0.15)",
      backdropFilter: "blur(24px)",
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: "var(--radius-md)",
        background: "rgba(124,77,255,0.12)",
        display: "grid", placeItems: "center", margin: "0 auto 1.25rem",
        color: "var(--accent)",
      }}>
        <Icon name="globe" size={40} />
      </div>
      <h2 className="heading" style={{ fontSize: "28px", margin: "0 0 0.5rem", color: "var(--ink)" }}>{t("worlds.emptyTitle")}</h2>
      <p className="subtle" style={{ fontSize: "15px", fontWeight: 500, maxWidth: 460, margin: "0 auto 1.5rem", color: "var(--ink-soft)" }}>
        {t("worlds.emptyBody")}
      </p>
      <button className="btn btn-gradient" onClick={onCreate} style={{ height: "48px", borderRadius: "var(--radius-md)" }}>
        <Icon name="plus" /> {t("worlds.createWorld")}
      </button>
    </div>
  );
}
