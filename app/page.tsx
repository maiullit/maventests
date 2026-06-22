"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SparklesText } from "@/components/ui/sparkles-text";

// ── Types ─────────────────────────────────────────────────────────────────────

interface City {
  id: string;
  name: string;
  tz: string;
  abbrev: string;
}

interface CatalogEntry {
  name: string;
  tz: string;
  abbrev: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_CITIES: City[] = [
  { id: "sf",  name: "San Francisco", tz: "America/Los_Angeles", abbrev: "SFO" },
  { id: "ny",  name: "New York",      tz: "America/New_York",    abbrev: "NYC" },
  { id: "ldn", name: "London",        tz: "Europe/London",       abbrev: "LON" },
  { id: "ber", name: "Berlin",        tz: "Europe/Berlin",       abbrev: "BER" },
  { id: "blr", name: "Bengaluru",     tz: "Asia/Kolkata",        abbrev: "BLR" },
  { id: "sgp", name: "Singapore",     tz: "Asia/Singapore",      abbrev: "SIN" },
  { id: "tyo", name: "Tokyo",         tz: "Asia/Tokyo",          abbrev: "TYO" },
  { id: "syd", name: "Sydney",        tz: "Australia/Sydney",    abbrev: "SYD" },
];

const CATALOG: CatalogEntry[] = [
  { name: "Honolulu",    tz: "Pacific/Honolulu",       abbrev: "HNL" },
  { name: "Anchorage",   tz: "America/Anchorage",      abbrev: "ANC" },
  { name: "Los Angeles", tz: "America/Los_Angeles",    abbrev: "LAX" },
  { name: "Denver",      tz: "America/Denver",         abbrev: "DEN" },
  { name: "Chicago",     tz: "America/Chicago",        abbrev: "CHI" },
  { name: "Mexico City", tz: "America/Mexico_City",    abbrev: "MEX" },
  { name: "New York",    tz: "America/New_York",       abbrev: "NYC" },
  { name: "Toronto",     tz: "America/Toronto",        abbrev: "YYZ" },
  { name: "São Paulo",   tz: "America/Sao_Paulo",      abbrev: "SAO" },
  { name: "London",      tz: "Europe/London",          abbrev: "LON" },
  { name: "Lisbon",      tz: "Europe/Lisbon",          abbrev: "LIS" },
  { name: "Paris",       tz: "Europe/Paris",           abbrev: "PAR" },
  { name: "Berlin",      tz: "Europe/Berlin",          abbrev: "BER" },
  { name: "Madrid",      tz: "Europe/Madrid",          abbrev: "MAD" },
  { name: "Athens",      tz: "Europe/Athens",          abbrev: "ATH" },
  { name: "Istanbul",    tz: "Europe/Istanbul",        abbrev: "IST" },
  { name: "Dubai",       tz: "Asia/Dubai",             abbrev: "DXB" },
  { name: "Mumbai",      tz: "Asia/Kolkata",           abbrev: "BOM" },
  { name: "Bengaluru",   tz: "Asia/Kolkata",           abbrev: "BLR" },
  { name: "Bangkok",     tz: "Asia/Bangkok",           abbrev: "BKK" },
  { name: "Singapore",   tz: "Asia/Singapore",         abbrev: "SIN" },
  { name: "Hong Kong",   tz: "Asia/Hong_Kong",         abbrev: "HKG" },
  { name: "Shanghai",    tz: "Asia/Shanghai",          abbrev: "SHA" },
  { name: "Tokyo",       tz: "Asia/Tokyo",             abbrev: "TYO" },
  { name: "Seoul",       tz: "Asia/Seoul",             abbrev: "ICN" },
  { name: "Sydney",      tz: "Australia/Sydney",       abbrev: "SYD" },
  { name: "Auckland",    tz: "Pacific/Auckland",       abbrev: "AKL" },
];

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOffset(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false, year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const h = p.hour === "24" ? 0 : +p.hour;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, h, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function fmtTime(totalMin: number, fmt: "12h" | "24h") {
  const m = ((Math.round(totalMin) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), mm = m % 60;
  if (fmt === "24h") return { time: pad(h) + ":" + pad(mm), ampm: "" };
  const ap = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { time: h12 + ":" + pad(mm), ampm: ap };
}

function gmtLabel(offMin: number) {
  const sign = offMin < 0 ? "−" : "+";
  const a = Math.abs(offMin), hh = Math.floor(a / 60), mm = a % 60;
  return "GMT" + sign + hh + (mm ? ":" + pad(mm) : "");
}

function cellBg(localHour: number, isDark: boolean, ws: number, we: number) {
  const working = localHour >= ws && localHour < we;
  const night = localHour < 6 || localHour >= 20;
  if (working) return isDark ? "rgba(104,227,83,0.20)" : "rgba(104,227,83,0.30)";
  if (night) return isDark ? "rgba(0,40,60,0.55)" : "rgba(20,58,80,0.20)";
  return "transparent";
}

function computeDst(cities: City[]) {
  const now = Date.now();
  const out: { name: string; text: string; days: string; arrow: string }[] = [];
  for (const c of cities) {
    const base = getOffset(new Date(now), c.tz);
    for (let d = 1; d <= 45; d++) {
      const t = new Date(now + d * 86400000);
      const off = getOffset(t, c.tz);
      if (off !== base) {
        const forward = off > base;
        const ds = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(t);
        out.push({
          name: c.name,
          text: (forward ? "Clocks spring forward" : "Clocks fall back") + " · " + ds,
          days: "in " + d + "d",
          arrow: forward ? "M8 14 12 10 16 14" : "M8 10 12 14 16 10",
        });
        break;
      }
    }
  }
  return out;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M3.5 9h17M3.5 15h17M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-tertiary)" }}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 2v4M8 2v4M3 10h18" /><rect x="3" y="4" width="18" height="18" rx="2" />
  </svg>
);

const BellIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 15 6-6 6 6" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// ── Switch component ──────────────────────────────────────────────────────────

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 44, height: 24, borderRadius: "var(--radius-full)", border: "none",
        background: checked ? "var(--brand)" : "var(--sand-300)",
        cursor: "pointer", position: "relative", transition: "background var(--duration-base)",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: "var(--radius-full)",
        background: "white", transition: "left var(--duration-base) var(--ease-standard)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ── Badge component ───────────────────────────────────────────────────────────

function Badge({ children, tone = "neutral", variant = "soft" }: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "error" | "info";
  variant?: "soft" | "solid";
}) {
  const tones: Record<string, Record<string, [string, string]>> = {
    neutral: { soft: ["var(--background-tertiary)", "var(--text-secondary)"], solid: ["var(--sand-800)", "#fff"] },
    brand:   { soft: ["var(--brand-subtle)", "var(--primary-900)"],           solid: ["var(--brand)", "var(--brand-content)"] },
    success: { soft: ["var(--status-success-surface)", "var(--green-700)"],   solid: ["var(--status-success)", "#fff"] },
    warning: { soft: ["var(--status-warning-surface)", "var(--amber-600)"],   solid: ["var(--status-warning)", "#fff"] },
    error:   { soft: ["var(--status-error-surface)", "var(--red-700)"],       solid: ["var(--status-error)", "#fff"] },
    info:    { soft: ["var(--status-info-surface)", "var(--blue-700)"],       solid: ["var(--status-info)", "#fff"] },
  };
  const [bg, fg] = (tones[tone] || tones.neutral)[variant] || tones.neutral.soft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, height: 20, padding: "0 8px",
      background: bg, color: fg, fontFamily: "var(--font-sans)", fontSize: 11,
      fontWeight: "var(--font-semibold)", lineHeight: 1, letterSpacing: "0.01em",
      borderRadius: "var(--radius-full)", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function MeridianPage() {
  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  const [homeId, setHomeId] = useState("sf");
  const [cursorFrac, setCursorFrac] = useState<number | null>(null);
  const [atNow, setAtNow] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const dragRef = useRef(false);

  const WS = 9, WE = 17;
  const fmt: "12h" | "24h" = "12h";

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const home = cities.find(c => c.id === homeId) || cities[0];
  const homeOff = home ? getOffset(now, home.tz) : 0;
  const homeLocalMin = now.getTime() / 60000 + homeOff;
  const homeMinNow = ((homeLocalMin % 1440) + 1440) % 1440;
  const nowFrac = homeMinNow / 1440;
  const homeDateObj = new Date(now.getTime() + homeOff * 60000);
  const homeDayIdx = homeDateObj.getUTCDay();
  const cursorDateLabel = WD[homeDayIdx] + ", " + MO[homeDateObj.getUTCMonth()] + " " + homeDateObj.getUTCDate();

  const frac = (atNow || cursorFrac == null) ? nowFrac : cursorFrac;
  const cursorLeft = (frac * 100).toFixed(3) + "%";
  const homeCursorMin = frac * 1440;
  const ct = fmtTime(homeCursorMin, fmt);
  const cursorTimeLabel = ct.time + (ct.ampm ? " " + ct.ampm : "");
  const cursorChip = fmtTime(homeCursorMin, "24h").time;
  const cursorIsNow = atNow ? "Live · now" : "Converted time";

  // Per-city offsets
  const offs = cities.map(c => getOffset(now, c.tz));
  const localHourAt = (i: number, h: number) => {
    const diff = (offs[i] - homeOff) / 60;
    return (((h + diff) % 24) + 24) % 24;
  };
  const N = cities.length;

  // Meeting overlap
  const perHour: number[] = [];
  for (let h = 0; h < 24; h++) {
    let count = 0;
    for (let i = 0; i < N; i++) {
      const lh = localHourAt(i, h + 0.5);
      if (lh >= WS && lh < WE) count++;
    }
    perHour.push(count);
  }
  const maxC = N ? Math.max(...perHour) : 0;
  const fullExists = maxC === N && N > 0;
  const markVal = fullExists ? N : maxC;
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  for (let h = 0; h <= 24; h++) {
    const on = h < 24 && perHour[h] === markVal && markVal > 0;
    if (on) { if (curStart < 0) curStart = h; curLen++; }
    else { if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; } curStart = -1; curLen = 0; }
  }
  let meetingRange = "—", meetingTitle = "No overlap", meetingTone: "neutral" | "success" | "warning" = "neutral";
  let meetingSub = "", meetingFrac: number | null = null;
  if (bestLen > 0) {
    const s1 = fmtTime(bestStart * 60, fmt), s2 = fmtTime((bestStart + bestLen) * 60, fmt);
    meetingRange = s1.time + (s1.ampm && s1.ampm !== s2.ampm ? " " + s1.ampm : "") + " – " + s2.time + (s2.ampm ? " " + s2.ampm : "");
    meetingTitle = fullExists ? "All " + N + " zones" : maxC + " of " + N + " zones";
    meetingTone = fullExists ? "success" : "warning";
    meetingSub = bestLen + (bestLen === 1 ? " hr" : " hrs") + " of shared working time";
    meetingFrac = (bestStart + bestLen / 2) / 24;
  } else {
    meetingSub = "No shared working hours across these zones";
  }

  // Hour axis
  const hourCells = Array.from({ length: 24 }, (_, h) => {
    const major = h % 6 === 0;
    const inMeeting = perHour[h] === markVal && markVal > 0;
    return {
      label: h % 3 === 0 ? fmtTime(h * 60, "24h").time : "",
      color: major ? "var(--text-secondary)" : "var(--text-tertiary)",
      weight: major ? "var(--font-bold)" : "var(--font-normal)",
      bar: inMeeting ? "var(--accent-300)" : "transparent",
    };
  });

  // Rows
  const rows = cities.map((c, i) => {
    const diff = offs[i] - homeOff;
    const total = homeCursorMin + diff;
    const dayShift = Math.floor(total / 1440);
    const t = fmtTime(total, fmt);
    const wdIdx = ((homeDayIdx + dayShift) % 7 + 7) % 7;
    const lhNow = (((total / 60) % 24) + 24) % 24;
    const cells = Array.from({ length: 24 }, (_, h) => ({ bg: cellBg(localHourAt(i, h + 0.5), isDark, WS, WE) }));
    const isHome = c.id === homeId;
    let rel = "";
    if (!isHome) {
      const sign = diff < 0 ? "−" : "+";
      const a = Math.abs(diff), hh = Math.floor(a / 60), mm = a % 60;
      rel = sign + hh + "h" + (mm ? " " + mm + "m" : "") + " · " + gmtLabel(offs[i]);
    } else rel = "Home · " + gmtLabel(offs[i]);
    const inWork = lhNow >= WS && lhNow < WE;
    return { c, isHome, rel, t, wdIdx, dayShift, inWork, cells };
  });

  // Search results
  const q = query.trim().toLowerCase();
  const existing = new Set(cities.map(c => c.tz));
  const results = q
    ? CATALOG.filter(c => c.name.toLowerCase().includes(q) && !existing.has(c.tz)).slice(0, 6).map(c => ({
        ...c, gmt: gmtLabel(getOffset(now, c.tz)),
      }))
    : [];

  // DST (recompute once per day)
  const dstAlerts = computeDst(cities);

  // Drag handlers
  const scrub = useCallback((e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setCursorFrac(f);
    setAtNow(false);
  }, []);

  const onTrackDown = (e: React.PointerEvent) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    dragRef.current = true;
    scrub(e);
  };
  const onTrackMove = (e: React.PointerEvent) => { if (dragRef.current) scrub(e); };
  const onTrackUp = () => { dragRef.current = false; };

  const addCity = (entry: CatalogEntry) => {
    const id = entry.tz + entry.abbrev;
    if (!cities.some(c => c.id === id)) {
      setCities(prev => [...prev, { id, ...entry }]);
    }
    setQuery("");
  };

  const removeCity = (id: string) => {
    setCities(prev => {
      const next = prev.filter(c => c.id !== id);
      if (homeId === id && next.length) setHomeId(next[0].id);
      return next;
    });
  };

  const moveCity = (id: string, dir: -1 | 1) => {
    setCities(prev => {
      const arr = [...prev];
      const i = arr.findIndex(c => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  return (
    <div className={isDark ? "dark" : ""} style={{ minHeight: "100vh", background: "var(--background-secondary)", fontFamily: "var(--font-sans)", color: "var(--text-primary)", WebkitFontSmoothing: "antialiased", paddingBottom: 56 }}>

      {/* ── Header ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center", gap: 20, padding: "16px 32px", background: "color-mix(in srgb, var(--background-primary) 78%, transparent)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderBottom: "1px solid var(--border-default)" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 10, background: "var(--brand)", color: "var(--brand-content)", flexShrink: 0 }}>
            <GlobeIcon />
          </div>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: "var(--font-bold)", fontSize: 17, letterSpacing: "-0.01em" }}>Meridian</div>
            <div style={{ fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-tertiary)", marginTop: 3 }}>World clock · {N} zones</div>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
          <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)", pointerEvents: "none", display: "flex" }}>
            <SearchIcon />
          </div>
          <input
            className="mp-searchinput"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Add a city or timezone…"
            style={{ width: "100%", height: 40, padding: "0 14px 0 38px", borderRadius: "var(--radius-field)", border: "1px solid var(--border-heavy)", background: "var(--surface-primary)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", outline: "none" }}
          />
          {q.length > 0 && (
            <div style={{ position: "absolute", top: 46, left: 0, right: 0, zIndex: 50, background: "var(--surface-overlay)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-lg)", padding: 6, maxHeight: 320, overflowY: "auto" }}>
              {results.length > 0 ? results.map(r => (
                <button key={r.tz + r.abbrev} className="mp-result" onClick={() => addCity(r)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "9px 11px", border: 0, background: "transparent", borderRadius: "var(--radius-lg)", cursor: "pointer", color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: "var(--font-semibold)", color: "var(--text-tertiary)", width: 38, flexShrink: 0 }}>{r.abbrev}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: "var(--text-sm)", fontWeight: "var(--font-medium)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>{r.gmt}</span>
                </button>
              )) : (
                <div style={{ padding: "14px 12px", fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>No matching cities.</div>
              )}
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text-secondary)" }}>
            <SunIcon />
            <Switch checked={isDark} onChange={() => setIsDark(d => !d)} />
            <MoonIcon />
          </div>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 28, flexWrap: "wrap", padding: "26px 32px 18px" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6 }}>{cursorIsNow}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <SparklesText
              text={cursorTimeLabel}
              sparklesCount={8}
              colors={isDark
                ? { first: "rgb(192,203,210)", second: "rgb(104,227,83)" }
                : { first: "rgb(20,58,80)", second: "rgb(82,203,61)" }
              }
              style={{ fontFamily: "var(--font-display)", fontWeight: "var(--font-bold)", fontSize: 44, lineHeight: 1, letterSpacing: "-0.02em" }}
            />
            <div style={{ fontSize: "var(--text-base)", color: "var(--text-secondary)", fontWeight: "var(--font-medium)" }}>{cursorDateLabel}</div>
          </div>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", marginTop: 6 }}>in {home?.name} · drag the timeline to convert any moment across every zone</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <button onClick={() => { setAtNow(true); setCursorFrac(null); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 40, padding: "0 16px", border: "1px solid var(--border-heavy)", background: "var(--surface-primary)", borderRadius: "var(--radius-lg)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--text-primary)" }}>
            Jump to now
          </button>
        </div>
      </div>

      {/* ── Board ── */}
      <div style={{ padding: "0 32px" }}>
        <div style={{ background: "var(--surface-primary)", borderRadius: "var(--radius-card)", boxShadow: "var(--ring-hairline), var(--shadow-sm)", overflow: "hidden" }}>

          {/* Hour axis */}
          <div style={{ display: "flex", alignItems: "stretch", height: 38, borderBottom: "1px solid var(--border-default)", background: "var(--background-secondary)" }}>
            <div style={{ width: 312, flexShrink: 0, display: "flex", alignItems: "center", paddingLeft: 20, fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>Location</div>
            <div className="mp-track" onPointerDown={onTrackDown} onPointerMove={onTrackMove} onPointerUp={onTrackUp} style={{ position: "relative", flex: 1, display: "flex", cursor: "ew-resize" }}>
              {hourCells.map((hc, h) => (
                <div key={h} style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", borderLeft: "1px solid var(--border-light)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: hc.color, fontWeight: hc.weight }}>{hc.label}</span>
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: hc.bar }} />
                </div>
              ))}
              <div style={{ position: "absolute", top: 0, bottom: 0, left: cursorLeft, width: 0, pointerEvents: "none", zIndex: 6 }}>
                <div style={{ position: "absolute", top: 4, left: -22, width: 44, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: "var(--font-bold)", color: "var(--accent-content)", background: "var(--accent)", borderRadius: "var(--radius-full)", padding: "2px 0", boxShadow: "var(--shadow-sm)" }}>{cursorChip}</div>
              </div>
            </div>
            <div style={{ width: 84, flexShrink: 0 }} />
          </div>

          {/* Rows */}
          {rows.map(({ c, isHome, rel, t, wdIdx, dayShift, inWork, cells }) => (
            <div key={c.id} className="mp-row" style={{ display: "flex", alignItems: "stretch", height: 72, borderBottom: "1px solid var(--border-light)", background: isHome ? "var(--brand-subtle)" : "transparent" }}>
              {/* Label */}
              <div style={{ width: 188, flexShrink: 0, display: "flex", alignItems: "center", gap: 11, paddingLeft: 20, cursor: "pointer" }} onClick={() => setHomeId(c.id)}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: "var(--font-semibold)", color: "var(--text-tertiary)", width: 30, flexShrink: 0 }}>{c.abbrev}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-semibold)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                    {isHome && <Badge tone="brand">Home</Badge>}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{rel}</div>
                </div>
              </div>
              {/* Time */}
              <div style={{ width: 124, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: "var(--font-bold)", letterSpacing: "-0.02em", color: inWork ? "var(--text-primary)" : "var(--text-tertiary)" }}>{t.time}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t.ampm}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: "var(--font-medium)" }}>{WD[wdIdx]}</span>
                  {dayShift !== 0 && <span style={{ fontSize: 10, fontWeight: "var(--font-semibold)", color: "var(--status-warning)" }}>{dayShift > 0 ? "+1 day" : "−1 day"}</span>}
                </div>
              </div>
              {/* Track */}
              <div className="mp-track" onPointerDown={onTrackDown} onPointerMove={onTrackMove} onPointerUp={onTrackUp} style={{ position: "relative", flex: 1, display: "flex", cursor: "ew-resize" }}>
                {cells.map((cell, h) => (
                  <div key={h} style={{ flex: 1, borderLeft: "1px solid var(--border-light)", background: cell.bg }} />
                ))}
                <div style={{ position: "absolute", top: 0, bottom: 0, left: cursorLeft, width: 2, marginLeft: -1, background: "var(--accent-400)", zIndex: 5, pointerEvents: "none" }} />
              </div>
              {/* Controls */}
              <div style={{ width: 84, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                <div className="mp-rowctl" style={{ display: "flex", gap: 2 }}>
                  <button className="mp-iconbtn" aria-label="Move up" onClick={() => moveCity(c.id, -1)} style={{ display: "grid", placeItems: "center", width: 26, height: 26, border: 0, background: "transparent", borderRadius: "var(--radius-md)", cursor: "pointer", color: "var(--text-tertiary)" }}>
                    <ChevronUpIcon />
                  </button>
                  <button className="mp-iconbtn" aria-label="Move down" onClick={() => moveCity(c.id, 1)} style={{ display: "grid", placeItems: "center", width: 26, height: 26, border: 0, background: "transparent", borderRadius: "var(--radius-md)", cursor: "pointer", color: "var(--text-tertiary)" }}>
                    <ChevronDownIcon />
                  </button>
                  <button className="mp-iconbtn" aria-label="Remove" onClick={() => removeCity(c.id)} style={{ display: "grid", placeItems: "center", width: 26, height: 26, border: 0, background: "transparent", borderRadius: "var(--radius-md)", cursor: "pointer", color: "var(--text-tertiary)" }}>
                    <XIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "13px 20px", background: "var(--background-secondary)", fontSize: 12, color: "var(--text-secondary)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 16, height: 12, borderRadius: 3, background: "var(--accent-200)", opacity: 0.5, display: "inline-block" }} />Working hours</span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 16, height: 12, borderRadius: 3, background: "var(--background-primary)", border: "1px solid var(--border-default)", display: "inline-block" }} />Daytime</span>
            <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 16, height: 12, borderRadius: 3, background: "var(--primary-900)", opacity: 0.22, display: "inline-block" }} />Night</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)" }}>Click a city name to set it as home</span>
          </div>
        </div>
      </div>

      {/* ── Panels ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, padding: "22px 32px 0" }}>

        {/* Meeting overlap */}
        <div style={{ background: "var(--surface-primary)", borderRadius: "var(--radius-card)", boxShadow: "var(--ring-hairline)", padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <CalendarIcon />
            <span style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>Meeting overlap finder</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: "var(--font-bold)", letterSpacing: "-0.02em" }}>{meetingRange}</span>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>{home?.name} time</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12 }}>
            <Badge tone={meetingTone} variant="soft">{meetingTitle}</Badge>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>{meetingSub}</span>
          </div>
          <button onClick={() => { if (meetingFrac != null) { setCursorFrac(meetingFrac); setAtNow(false); } }} className="mp-iconbtn" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", border: "1px solid var(--border-heavy)", background: "var(--surface-primary)", borderRadius: "var(--radius-lg)", cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)", color: "var(--text-primary)" }}>
            <ArrowRightIcon />
            Move cursor to this window
          </button>
        </div>

        {/* DST alerts */}
        <div style={{ background: "var(--surface-primary)", borderRadius: "var(--radius-card)", boxShadow: "var(--ring-hairline)", padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
            <BellIcon />
            <span style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-tertiary)" }}>Daylight saving alerts</span>
          </div>
          {dstAlerts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {dstAlerts.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ display: "grid", placeItems: "center", width: 30, height: 30, flexShrink: 0, borderRadius: "var(--radius-lg)", background: "var(--status-warning-surface)", color: "var(--amber-600)" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={d.arrow} />
                    </svg>
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-semibold)" }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{d.text}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", fontWeight: "var(--font-semibold)" }}>{d.days}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>No clock changes in your tracked zones over the next 45 days.</div>
          )}
        </div>
      </div>
    </div>
  );
}
