import { useState, useRef, useEffect } from 'react';
import {
  Search, BookOpen, Activity, AlertCircle, Shield, Loader2,
  Check, ExternalLink, Moon, Sun, Bookmark, ChevronLeft,
} from 'lucide-react';

const API_WEBHOOK_URL = 'https://veestartsolutions.app.n8n.cloud/webhook/get-disease';
const SAVE_WEBHOOK_URL = 'https://veestartsolutions.app.n8n.cloud/webhook/save-search';
const LIST_WEBHOOK_URL = 'https://veestartsolutions.app.n8n.cloud/webhook/list-searches';

const SUGGESTED_DISEASES = ['Diabetes', 'Asthma', 'Hypertension', 'Migraine', 'Arthritis'];

const WEBSITES = [
  {
    name: 'Mayo Clinic',
    domain: 'mayoclinic.org',
    desc: 'Nonprofit academic medical center',
    icon: '🏥',
  },
  {
    name: 'MedlinePlus',
    domain: 'medlineplus.gov',
    desc: 'U.S. National Library of Medicine',
    icon: '📚',
  },
  {
    name: 'CDC',
    domain: 'cdc.gov',
    desc: 'Centers for Disease Control',
    icon: '🔬',
  },
  {
    name: 'Cleveland Clinic',
    domain: 'my.clevelandclinic.org',
    desc: 'World-renowned health system',
    icon: '⚕️',
  },
  {
    name: 'NHS UK',
    domain: 'nhs.uk',
    desc: 'UK National Health Service',
    icon: '🇬🇧',
  },
  {
    name: 'WebMD',
    domain: 'webmd.com',
    desc: 'Trusted health & wellness info',
    icon: '💊',
  },
];

interface DiseaseResult {
  name: string;
  summary: string;
  symptoms: string;
  causes: string;
  treatments: string;
  prevention: string;
  sources?: string;
}

interface SavedSearch {
  id?: string;
  disease: string;
  result: DiseaseResult;
  savedAt?: string;
}

function PillIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}

const CARDS = [
  { key: 'summary',    label: 'Summary',    Icon: BookOpen,   lightColor: 'text-blue-600',  darkColor: 'dark:text-blue-400',  lightBg: 'bg-blue-50',   darkBg: 'dark:bg-blue-900/30'  },
  { key: 'symptoms',   label: 'Symptoms',   Icon: Activity,   lightColor: 'text-rose-500',  darkColor: 'dark:text-rose-400',  lightBg: 'bg-rose-50',   darkBg: 'dark:bg-rose-900/30'  },
  { key: 'causes',     label: 'Causes',     Icon: AlertCircle,lightColor: 'text-amber-500', darkColor: 'dark:text-amber-400', lightBg: 'bg-amber-50',  darkBg: 'dark:bg-amber-900/30' },
  { key: 'treatments', label: 'Treatments', Icon: PillIcon,   lightColor: 'text-green-600', darkColor: 'dark:text-green-400', lightBg: 'bg-green-50',  darkBg: 'dark:bg-green-900/30' },
  { key: 'prevention', label: 'Prevention', Icon: Shield,     lightColor: 'text-teal-600',  darkColor: 'dark:text-teal-400',  lightBg: 'bg-teal-50',   darkBg: 'dark:bg-teal-900/30'  },
] as const;

function Toast({ message, show }: { message: string; show: boolean }) {
  return (
    <div className={`fixed bottom-6 right-6 bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl transition-all duration-300 flex items-center gap-2 z-50 ${
      show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
    }`}>
      <Check size={16} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

function HeartbeatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function SearchPage({ onNavigate, dark, setDark }: {
  onNavigate: (page: string) => void;
  dark: boolean;
  setDark: (v: boolean) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSites, setSelectedSites] = useState<string[]>(WEBSITES.map(w => w.domain));
  const [results, setResults] = useState<DiseaseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async (term?: string) => {
    if (selectedSites.length === 0) {
      setError('Please select at least one source.');
      return;
    }
    const query = (term ?? searchTerm).trim().toLowerCase();
    if (!query) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setFadeIn(false);
    try {
      const res = await fetch(API_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease: query, websites: selectedSites }),
      });
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      console.log("RAW API RESPONSE:", JSON.stringify(data, null, 2));
      const result: DiseaseResult = Array.isArray(data) ? data[0] : data;
      setResults(result);
      setTimeout(() => setFadeIn(true), 50);
    } catch {
      setError("Couldn't find information. Try another disease name.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (disease: string) => {
    setSearchTerm(disease);
    handleSearch(disease);
  };

  const toggleSite = (domain: string) => {
    setSelectedSites(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const handleSaveSearch = async () => {
    if (!results) return;
    setSaving(true);
    try {
      const res = await fetch(SAVE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease: results.name, result: results }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 3000);
    } catch {
      setError('Failed to save search. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <HeartbeatIcon />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">MedLookup</span>
            <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 font-medium ml-1 border-l border-gray-200 dark:border-gray-700 pl-3">Trusted disease information</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('saved')}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Bookmark size={15} />
              My Searches
            </button>
            <button
              onClick={() => setDark(!dark)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── LEFT PANEL ── */}
          <aside className="w-full lg:w-[360px] shrink-0 space-y-5">

            {/* Search card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 leading-snug">
                Look up any disease
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Get clear, sourced information instantly.
              </p>

              <label htmlFor="disease-search" className="sr-only">Search for a disease</label>
              <div
                className={`flex items-center bg-slate-50 dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 ${
                  shake ? 'border-red-400' : 'border-gray-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-500'
                }`}
                style={shake ? { animation: 'shake 0.45s ease-in-out' } : undefined}
              >
                <Search className="ml-3 text-gray-400 shrink-0" size={16} />
                <input
                  ref={inputRef}
                  id="disease-search"
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="e.g. diabetes, asthma…"
                  className="flex-1 py-3 px-2.5 text-sm text-gray-800 dark:text-gray-100 bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <button
                onClick={() => handleSearch()}
                disabled={loading}
                className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                {loading ? 'Searching…' : 'Search'}
              </button>

              {/* Quick chips */}
              <div className="flex flex-wrap gap-1.5 mt-4">
                {SUGGESTED_DISEASES.map(d => (
                  <button
                    key={d}
                    onClick={() => handleSuggestion(d)}
                    className="px-3 py-1 bg-slate-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/40 hover:text-blue-600 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400 font-medium transition-colors"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Sources card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                Medical Sources
              </h2>
              <div className="space-y-2">
                {WEBSITES.map(site => {
                  const checked = selectedSites.includes(site.domain);
                  return (
                    <label
                      key={site.domain}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                        checked
                          ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {/* Custom checkbox */}
                      <div className={`w-4.5 h-4.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                      }`}>
                        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSite(site.domain)}
                          className="sr-only"
                        />
                      </div>
                      <span className="text-base leading-none">{site.icon}</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${
                          checked ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          {site.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">{site.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
              {error && selectedSites.length === 0 && (
                <p className="text-xs text-red-500 mt-3">{error}</p>
              )}
            </div>
          </aside>

          {/* ── RIGHT PANEL ── */}
          <div className="flex-1 min-w-0">

            {/* Empty state */}
            {!loading && !results && !error && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                  <Search size={28} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Search to get started</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                  Enter a disease name on the left and select your preferred sources.
                </p>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div role="status" aria-live="polite" aria-label="Loading disease information"
                className="flex flex-col items-center justify-center py-24">
                <Loader2 className="animate-spin mb-4 text-blue-600" size={36} />
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fetching information…</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && selectedSites.length > 0 && (
              <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 flex items-start gap-4">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400 mb-0.5">No results found</p>
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Results */}
            {!loading && results && (
              <div className="transition-opacity duration-500" style={{ opacity: fadeIn ? 1 : 0 }} aria-live="polite">

                {/* Disclaimer */}
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 flex items-start gap-2.5 mb-6">
                  <span className="text-base shrink-0" aria-hidden="true">⚠️</span>
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>For informational purposes only.</strong> Not medical advice. Always consult a healthcare professional.
                  </p>
                </div>

                {/* Title row */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-white capitalize tracking-tight">
                    {results.name}
                  </h2>
                  <button
                    onClick={handleSaveSearch}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Bookmark size={14} />
                    {saving ? 'Saving…' : 'Save Search'}
                  </button>
                </div>

                {/* Info cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {CARDS.map(({ key, label, Icon, lightColor, darkColor, lightBg, darkBg }) => {
                    const text = (results[key as keyof DiseaseResult] as string) || 'Not available';
                    return (
                      <div
                        key={key}
                        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${lightBg} ${darkBg} mb-3`}>
                          <Icon className={`${lightColor} ${darkColor}`} />
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1.5 text-sm">{label}</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{text}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Sources */}
                {results.sources && (
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {results.sources.split(',').map(u => u.trim()).filter(Boolean).map((url, idx) => {
                        let hostname = url;
                        try { hostname = new URL(url).hostname.replace(/^www\./, ''); } catch { /* raw */ }
                        const href = url.startsWith('http') ? url : `https://${url}`;
                        return (
                          <a
                            key={idx}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 border border-gray-200 dark:border-gray-700 text-xs font-medium rounded-lg transition-colors"
                          >
                            {hostname}
                            <ExternalLink size={11} />
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

      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-4 px-4 text-center mt-auto">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Built with AI — <span className="font-medium">Always verify with your doctor</span>
        </p>
      </footer>

      <Toast message="Saved!" show={showSavedToast} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { font-family: 'Inter', sans-serif; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}

function SavedSearchesPage({ onNavigate, dark, setDark }: {
  onNavigate: (page: string, data?: SavedSearch) => void;
  dark: boolean;
  setDark: (v: boolean) => void;
}) {
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(LIST_WEBHOOK_URL);
        if (!res.ok) throw new Error('Failed');
        const data: SavedSearch[] = await res.json();
        setSearches(Array.isArray(data) ? data : [data]);
      } catch {
        setError('Failed to load saved searches.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-gray-950 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <button
            onClick={() => onNavigate('search')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ChevronLeft size={16} />
            Back to Search
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <HeartbeatIcon />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">MedLookup</span>
          </div>
          <button
            onClick={() => setDark(!dark)}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Saved Searches</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Your previously saved disease lookups</p>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin mb-4 text-blue-600" size={36} />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading…</p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 flex items-start gap-4">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400 mb-0.5">Error</p>
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && searches.length === 0 && (
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-12 text-center">
            <Bookmark size={32} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="font-semibold text-gray-500 dark:text-gray-400 mb-3">No saved searches yet</p>
            <button
              onClick={() => onNavigate('search')}
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Start searching →
            </button>
          </div>
        )}

        {!loading && !error && searches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {searches.map((search, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate('search', search)}
                className="p-5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <ExternalLink size={14} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors mt-1" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white capitalize mb-1">{search.disease}</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {search.savedAt ? new Date(search.savedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Saved'}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 py-4 px-4 text-center mt-auto">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Built with AI — <span className="font-medium">Always verify with your doctor</span>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('search');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [dark]);

  const handleNavigate = (page: string, _data?: SavedSearch) => {
    setCurrentPage(page);
  };

  return currentPage === 'search' ? (
    <SearchPage onNavigate={handleNavigate} dark={dark} setDark={setDark} />
  ) : (
    <SavedSearchesPage onNavigate={handleNavigate} dark={dark} setDark={setDark} />
  );
}
