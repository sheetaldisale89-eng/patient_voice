import { useState, useRef, useEffect } from 'react';
import {
  Search, BookOpen, Heart, ThumbsUp, Eye, AlertTriangle, Brain,
  Loader2, Check, ExternalLink, Moon, Sun, Bookmark, ChevronLeft,
} from 'lucide-react';

const API_WEBHOOK_URL  = import.meta.env.VITE_API_WEBHOOK_URL as string;
const SAVE_WEBHOOK_URL = import.meta.env.VITE_SAVE_WEBHOOK_URL as string;
const LIST_WEBHOOK_URL = import.meta.env.VITE_LIST_WEBHOOK_URL as string;

const SUGGESTED = ['Anxiety', 'Long COVID', 'IBS', 'Chronic Pain', 'ADHD'];

const FORUMS = [
  { name: 'Reddit Health Communities', domain: 'reddit.com',          desc: 'Thousands of condition-specific subreddits', icon: '💬' },
  { name: 'Patient.info Forums',       domain: 'patient.info',        desc: 'UK-based patient discussion boards',         icon: '🗣️' },
  { name: 'HealthUnlocked',            domain: 'healthunlocked.com',  desc: 'Social network for patients',               icon: '🤝' },
  { name: 'Inspire Communities',       domain: 'inspire.com',         desc: 'Disease-specific patient communities',      icon: '✨' },
  { name: 'Drugs.com User Reviews',    domain: 'drugs.com',           desc: 'Real medication experiences',               icon: '💊' },
  { name: 'WebMD Community',           domain: 'webmd.com/community', desc: 'Patient stories and discussions',           icon: '🏥' },
];

const DEFAULT_CHECKED = FORUMS.slice(0, 4).map(f => f.domain);

interface PatientResult {
  name: string;
  summary?:                    string;
  what_it_actually_feels_like?: string;
  what_helps?:                 string;
  what_doctors_dont_tell_you?: string;
  side_effects_real_talk?:     string;
  emotional_journey?:          string;
  sources?:                    string;
}

interface SavedSearch {
  id?:      string;
  disease:  string;
  result:   PatientResult;
  savedAt?: string;
}

const CARDS = [
  { key: 'summary',                    label: 'Summary',                     Icon: BookOpen,      accent: '#5C8374' },
  { key: 'what_it_actually_feels_like',label: 'What It Actually Feels Like',  Icon: Heart,         accent: '#9EC8B9' },
  { key: 'what_helps',                 label: 'What Helps (Patient Tips)',    Icon: ThumbsUp,      accent: '#5C8374' },
  { key: 'what_doctors_dont_tell_you', label: "What Doctors Don't Tell You",  Icon: Eye,           accent: '#E8B86D' },
  { key: 'side_effects_real_talk',     label: 'Side Effects: Real Talk',      Icon: AlertTriangle, accent: '#E8B86D' },
  { key: 'emotional_journey',          label: 'The Emotional Journey',        Icon: Brain,         accent: '#9EC8B9' },
] as const;

/* ── design tokens ── */
const light = {
  bg:         '#FAF6EE',
  surface:    '#FFFFFF',
  border:     '#DDE8E2',
  text:       '#2C3A33',
  muted:      '#6B7A72',
  primary:    '#5C8374',
  secondary:  '#9EC8B9',
  amber:      '#E8B86D',
  amberLight: '#FBF3E0',
  cream:      '#FAF6EE',
  creamDark:  '#F0EAD8',
};
const dark = {
  bg:        '#0F1115',
  surface:   '#151922',
  border:    '#2D3645',
  text:      '#F5F7FA',
  muted:     '#8A94A6',
  amber:     '#E6B566',
  cream:     '#1B212C',
  creamDark: '#232A36',
  cardText:  '#F5F7FA',
  cardMuted: '#C2CAD6',
  // sidebar / left panel
  sidebarBg: '#12161D',
  inputBg:   '#161B24',
  hover:     '#262F3D',
  active:    '#313C4D',
  softBorder:'#252D3A',
};

/* ── helpers ── */
function tok(isDark: boolean) {
  if (!isDark) {
    return {
      ...light,
      cardText:   light.text,
      cardMuted:  light.muted,
      sidebarBg:  light.surface,
      inputBg:    light.cream,
      hover:      '#EBF3EE',
      active:     '#DDE8E2',
      softBorder: light.border,
    };
  }
  return { ...light, ...dark };
}

function HeartbeatIcon({ color = 'white' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function Toast({ show }: { show: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 z-50 transition-all duration-300 ${
      show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
    }`} style={{ background: light.amber, color: light.text }}>
      <Check size={15} strokeWidth={3} />
      <span className="text-sm font-semibold">Saved!</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SEARCH PAGE
══════════════════════════════════════════════════════════════════════════ */
function SearchPage({ onNavigate, isDark, setDark }: {
  onNavigate: (p: string) => void;
  isDark: boolean;
  setDark: (v: boolean) => void;
}) {
  const t = tok(isDark);
  const [query,   setQuery]   = useState('');
  const [sites,   setSites]   = useState<string[]>(DEFAULT_CHECKED);
  const [results, setResults] = useState<PatientResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [shake,   setShake]   = useState(false);
  const [fadeIn,  setFadeIn]  = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [toast,   setToast]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = async (term?: string) => {
    if (sites.length === 0) { setError('Please select at least one source.'); return; }
    const q = (term ?? query).trim().toLowerCase();
    if (!q) { setShake(true); setTimeout(() => setShake(false), 500); inputRef.current?.focus(); return; }
    setLoading(true); setError(null); setResults(null); setFadeIn(false);
    try {
      const res = await fetch(API_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ disease: q, websites: sites }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      console.log('RAW API RESPONSE:', JSON.stringify(data, null, 2));
      setResults(Array.isArray(data) ? data[0] : data);
      setTimeout(() => setFadeIn(true), 50);
    } catch {
      setError("Couldn't find patient discussions. Try a different condition.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSite = (domain: string) =>
    setSites(p => p.includes(domain) ? p.filter(d => d !== domain) : [...p, domain]);

  const doSave = async () => {
    if (!results) return;
    setSaving(true);
    try {
      const res = await fetch(SAVE_WEBHOOK_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ disease: results.name, result: results }),
      });
      if (!res.ok) throw new Error();
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300"
      style={{ background: t.bg, color: t.text, fontFamily: "'Inter', sans-serif" }}>

      {/* ── header ── */}
      <header className="sticky top-0 z-20 border-b"
        style={{ background: t.surface, borderColor: t.border, boxShadow: '0 1px 6px rgba(44,58,51,0.07)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: t.primary }}>
              <HeartbeatIcon />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: t.text }}>Patient Voice</span>
            <span className="hidden sm:inline text-xs font-medium ml-1 pl-3 border-l"
              style={{ color: t.muted, borderColor: t.border }}>
              Real experiences. Real people.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onNavigate('saved')}
              className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: t.primary }}>
              <Bookmark size={15} /> My Searches
            </button>
            <button onClick={() => setDark(!isDark)} aria-label="Toggle dark mode"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: t.creamDark, color: t.muted }}>
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ════ LEFT PANEL ════ */}
          <aside className="w-full lg:w-[360px] shrink-0 space-y-5">

            {/* search card */}
            <div className="rounded-2xl border p-6"
              style={{ background: t.surface, borderColor: t.border, boxShadow: '0 2px 10px rgba(44,58,51,0.06)' }}>
              <h1 className="text-2xl font-bold mb-1" style={{ color: t.text }}>Patient Voice</h1>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: t.muted }}>
                Real patient experiences. Not what doctors say — what people living with the condition share.
              </p>

              {/* input */}
              <div className="rounded-xl border-2 flex items-center transition-all duration-200"
                style={{
                  background:  t.inputBg,
                  borderColor: shake ? '#D95A5A' : t.softBorder,
                  animation:   shake ? 'shake 0.45s ease-in-out' : undefined,
                }}
                onFocus={() => {}}
                onClickCapture={e => {
                  const wrap = e.currentTarget as HTMLDivElement;
                  wrap.style.borderColor = t.primary;
                }}
                onBlurCapture={e => {
                  const wrap = e.currentTarget as HTMLDivElement;
                  if (!wrap.contains(document.activeElement))
                    wrap.style.borderColor = shake ? '#D95A5A' : t.softBorder;
                }}
              >
                <Search className="ml-3 shrink-0" size={16} style={{ color: t.muted }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doSearch()}
                  placeholder="Try: living with diabetes, chronic migraine, IBS…"
                  className="flex-1 py-3 px-2.5 text-sm bg-transparent outline-none"
                  style={{ color: t.text }}
                />
              </div>

              <button onClick={() => doSearch()} disabled={loading}
                className="mt-3 w-full py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: t.primary, color: 'white' }}
                onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = t.secondary; }}
                onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = t.primary; }}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {loading ? 'Searching…' : 'Search Patient Stories'}
              </button>

              {/* chips */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {SUGGESTED.map(d => (
                  <button key={d}
                    onClick={() => { setQuery(d); doSearch(d); }}
                    className="px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150"
                    style={{ borderColor: t.primary, color: t.primary, background: 'transparent' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = t.hover; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* forums card */}
            <div className="rounded-2xl border p-6"
              style={{ background: isDark ? t.sidebarBg : t.surface, borderColor: t.border, boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.25)' : '0 2px 10px rgba(44,58,51,0.06)' }}>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: t.muted }}>
                Patient Communities
              </h2>
              <div className="space-y-2">
                {FORUMS.map(site => {
                  const checked = sites.includes(site.domain);
                  return (
                    <label key={site.domain}
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150"
                      style={{
                        borderColor: checked ? t.primary : t.border,
                        background:  checked ? (isDark ? t.active : '#EEF5F1') : 'transparent',
                      }}>
                      <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background:  checked ? t.primary : 'transparent',
                          borderColor: checked ? t.primary : (isDark ? '#3A4557' : '#AABFB5'),
                        }}>
                        {checked && <Check size={11} color="white" strokeWidth={3} />}
                        <input type="checkbox" checked={checked} onChange={() => toggleSite(site.domain)} className="sr-only" />
                      </div>
                      <span className="text-base leading-none">{site.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-tight"
                          style={{ color: checked ? t.primary : t.text }}>{site.name}</p>
                        <p className="text-xs mt-0.5 leading-tight" style={{ color: t.muted }}>{site.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {error && sites.length === 0 && (
                <p className="text-xs mt-3" style={{ color: '#C05050' }}>{error}</p>
              )}
            </div>
          </aside>

          {/* ════ RIGHT PANEL ════ */}
          <div className="flex-1 min-w-0">

            {/* empty state */}
            {!loading && !results && !error && (
              <div className="flex flex-col items-center justify-center py-28 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: isDark ? t.cream : '#EEF5F1' }}>
                  <Heart size={28} style={{ color: t.primary }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: t.text }}>Hear from real patients</h3>
                <p className="text-sm max-w-xs" style={{ color: t.muted }}>
                  Enter a condition on the left to see what people actually living with it share.
                </p>
              </div>
            )}

            {/* loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-28">
                <Loader2 className="animate-spin mb-4" size={36} style={{ color: t.primary }} />
                <p className="text-sm font-medium" style={{ color: t.muted }}>Gathering patient voices…</p>
              </div>
            )}

            {/* error */}
            {!loading && error && sites.length > 0 && (
              <div className="rounded-2xl border p-6 flex items-start gap-4"
                style={{ background: isDark ? '#1E1620' : '#FDF0EE', borderColor: isDark ? '#4A2A3A' : '#E8A090' }}>
                <AlertTriangle size={20} style={{ color: isDark ? '#F08090' : '#C05050', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p className="font-semibold mb-0.5" style={{ color: isDark ? '#F5C0C8' : '#A03030' }}>No results found</p>
                  <p className="text-sm" style={{ color: isDark ? '#C89098' : '#C05050' }}>{error}</p>
                </div>
              </div>
            )}

            {/* results */}
            {!loading && results && (
              <div className="transition-opacity duration-500" style={{ opacity: fadeIn ? 1 : 0 }}>

                {/* disclaimer */}
                <div className="rounded-xl border px-4 py-3 flex items-start gap-2.5 mb-6"
                  style={{ background: '#FBF3E0', borderColor: light.amber }}>
                  <span className="text-base shrink-0">💬</span>
                  <p className="text-xs leading-relaxed" style={{ color: '#7A5818' }}>
                    <strong>These are real patient experiences from forums.</strong> Always consult a healthcare professional for medical decisions.
                  </p>
                </div>

                {/* title + save */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold capitalize tracking-tight" style={{ color: t.text }}>
                    {results.name}
                  </h2>
                  <button onClick={doSave} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: t.amber, color: light.text }}
                    onMouseEnter={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = '#F0C878'; }}
                    onMouseLeave={e => { if (!saving) (e.currentTarget as HTMLButtonElement).style.background = t.amber; }}>
                    <Bookmark size={14} />
                    {saving ? 'Saving…' : 'Save Search'}
                  </button>
                </div>

                {/* cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {CARDS.map(({ key, label, Icon, accent }) => {
                    const val = results[key as keyof PatientResult] as string | undefined;
                    return (
                      <div key={key}
                        className="rounded-xl p-5 hover:shadow-md transition-shadow duration-200"
                        style={{
                          background:  t.cream,
                          border:      `1px solid ${t.border}`,
                          borderLeft:  `4px solid ${accent}`,
                          boxShadow:   '0 2px 6px rgba(44,58,51,0.05)',
                        }}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <Icon size={17} style={{ color: t.amber, flexShrink: 0 }} />
                          <h3 className="font-bold text-sm leading-tight" style={{ color: t.cardText }}>{label}</h3>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: t.cardMuted, lineHeight: '1.7' }}>
                          {val || 'Not enough patient discussion yet.'}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* sources */}
                {results.sources && (
                  <div className="rounded-2xl border p-5"
                    style={{ background: t.surface, borderColor: t.border }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: t.muted }}>Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {results.sources.split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => {
                        let hostname = url;
                        try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch { /* raw */ }
                        const href = url.startsWith('http') ? url : `https://${url}`;
                        return (
                          <a key={idx} href={href} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                            style={{ background: isDark ? t.hover : t.creamDark, color: t.text, borderColor: t.border }}
                            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = t.primary; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = t.border; }}>
                            {hostname}<ExternalLink size={11} />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t py-4 text-center mt-auto"
        style={{ background: t.surface, borderColor: t.border }}>
        <p className="text-xs" style={{ color: t.muted }}>
          From real patient communities. <span className="font-medium">Not medical advice.</span>
        </p>
      </footer>

      <Toast show={toast} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-6px); }
          40%       { transform: translateX(6px); }
          60%       { transform: translateX(-4px); }
          80%       { transform: translateX(4px); }
        }
        ::placeholder { color: #7B8F84; }
        .dark ::placeholder { color: #6E7887; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SAVED SEARCHES PAGE
══════════════════════════════════════════════════════════════════════════ */
function SavedSearchesPage({ onNavigate, isDark, setDark }: {
  onNavigate: (p: string) => void;
  isDark: boolean;
  setDark: (v: boolean) => void;
}) {
  const t = tok(isDark);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(LIST_WEBHOOK_URL);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setSearches(Array.isArray(data) ? data : [data]);
      } catch {
        setError('Failed to load saved searches.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300"
      style={{ background: t.bg, color: t.text, fontFamily: "'Inter', sans-serif" }}>

      <header className="sticky top-0 z-20 border-b"
        style={{ background: t.surface, borderColor: t.border, boxShadow: '0 1px 6px rgba(44,58,51,0.07)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <button onClick={() => onNavigate('search')}
            className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: t.primary }}>
            <ChevronLeft size={16} /> Back to Search
          </button>
          <div className="flex items-center gap-2.5 absolute left-1/2 -translate-x-1/2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: t.primary }}>
              <HeartbeatIcon />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: t.text }}>Patient Voice</span>
          </div>
          <button onClick={() => setDark(!isDark)} aria-label="Toggle dark mode"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ background: t.creamDark, color: t.muted }}>
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-8 py-10">
        <h1 className="text-3xl font-bold mb-1" style={{ color: t.text }}>My Saved Searches</h1>
        <p className="text-sm mb-8" style={{ color: t.muted }}>Your previously saved patient experience lookups</p>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin mb-4" size={36} style={{ color: t.primary }} />
            <p className="text-sm font-medium" style={{ color: t.muted }}>Loading…</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border p-6 flex items-start gap-4"
            style={{ background: isDark ? '#1E1620' : '#FDF0EE', borderColor: isDark ? '#4A2A3A' : '#E8A090' }}>
            <AlertTriangle size={20} style={{ color: isDark ? '#F08090' : '#C05050', flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="font-semibold mb-0.5" style={{ color: isDark ? '#F5C0C8' : '#A03030' }}>Error</p>
              <p className="text-sm" style={{ color: isDark ? '#C89098' : '#C05050' }}>{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && searches.length === 0 && (
          <div className="rounded-2xl border p-12 text-center"
            style={{ background: t.surface, borderColor: t.border }}>
            <Bookmark size={32} className="mx-auto mb-3" style={{ color: t.muted }} />
            <p className="font-semibold mb-3" style={{ color: t.muted }}>No saved searches yet</p>
            <button onClick={() => onNavigate('search')}
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: t.primary }}>
              Start searching →
            </button>
          </div>
        )}

        {!loading && !error && searches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searches.map((s, idx) => (
              <button key={idx} onClick={() => onNavigate('search')}
                className="p-5 rounded-2xl border text-left group transition-all duration-150 hover:shadow-md"
                style={{ background: t.surface, borderLeft: `4px solid ${t.primary}`, borderColor: t.border }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = t.primary; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderLeft = `4px solid ${t.primary}`; (e.currentTarget as HTMLButtonElement).style.borderColor = t.border; (e.currentTarget as HTMLButtonElement).style.borderLeft = `4px solid ${t.primary}`; }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: isDark ? t.hover : '#EEF5F1' }}>
                    <Heart size={16} style={{ color: t.primary }} />
                  </div>
                  <ExternalLink size={14} style={{ color: t.muted, marginTop: 4 }} />
                </div>
                <h3 className="font-semibold capitalize mb-1" style={{ color: t.text }}>{s.disease}</h3>
                <p className="text-xs" style={{ color: t.muted }}>
                  {s.savedAt
                    ? new Date(s.savedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                    : 'Saved'}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t py-4 text-center mt-auto"
        style={{ background: t.surface, borderColor: t.border }}>
        <p className="text-xs" style={{ color: t.muted }}>
          From real patient communities. <span className="font-medium">Not medical advice.</span>
        </p>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  const [page,   setPage]   = useState('search');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.body.style.background = isDark ? dark.bg : light.bg;
  }, [isDark]);

  return page === 'search'
    ? <SearchPage  onNavigate={setPage} isDark={isDark} setDark={setIsDark} />
    : <SavedSearchesPage onNavigate={setPage} isDark={isDark} setDark={setIsDark} />;
}
