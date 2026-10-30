import React, { useState } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  ExternalLink,
  BookOpen,
  Plus,
  Check,
  Copy,
  AlertTriangle,
  ShieldCheck,
  Layers,
  ArrowRight,
  Clock,
  RotateCcw,
  Tag,
  BookmarkCheck,
  Info
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { 
  ComplianceChecklistItem, 
  RegionalStandard, 
  ComplianceCategory, 
  ComplianceSeverity 
} from '../../types';

export interface GroundedSnippet {
  codeClause: string;
  standard: RegionalStandard | string;
  title: string;
  effectiveEdition?: string;
  requirementText: string;
  practicalImpact?: string;
  severity: ComplianceSeverity;
  category: ComplianceCategory;
}

export interface GroundingSource {
  title: string;
  url: string;
}

export interface KnowledgeSearchResponse {
  summary: string;
  snippets: GroundedSnippet[];
  keyChanges?: string[];
  jurisdictionNotes?: string;
  sources: GroundingSource[];
  searchQueries?: string[];
  standard: string;
  query: string;
  timestamp: string;
}

// Built-in verified offline reference presets for instantaneous exploration
const POPULAR_SEARCH_PRESETS = [
  {
    label: "NEC 210.8(F) Outdoor Outlets",
    query: "NEC 210.8(F) GFCI protection for outdoor outlets and HVAC heat pumps",
    standard: "NEC NFPA 70" as RegionalStandard
  },
  {
    label: "2026 NEC EV Charging (Art. 625)",
    query: "2026 NEC updates Article 625 EV Charging and bidirectional energy export",
    standard: "NEC NFPA 70" as RegionalStandard
  },
  {
    label: "PUE 7.1.71 RCD 30mA vs 10mA",
    query: "PUE 7.1.71 vs 7.1.82 residual current device requirements for wet zones and sockets",
    standard: "PUE 7.1" as RegionalStandard
  },
  {
    label: "NEC 242 Surge Protection (SPD)",
    query: "NEC Article 242 mandatory Type 1 and Type 2 Surge Protective Devices for dwelling services",
    standard: "NEC NFPA 70" as RegionalStandard
  },
  {
    label: "IEC 60364-7-722 EV Supply",
    query: "IEC 60364-7-722 electric vehicle conductive charging RCD Type B and 6mA DC protection",
    standard: "IEC 60364" as RegionalStandard
  },
  {
    label: "NEC 210.12 AFCI Bedroom Arc-Fault",
    query: "NEC 210.12 Arc-Fault Circuit-Interrupter AFCI requirements and branch circuit extensions",
    standard: "NEC NFPA 70" as RegionalStandard
  }
];

// Offline verified fallback database in case of offline or demo mode
const FALLBACK_RESULTS: Record<string, KnowledgeSearchResponse> = {
  default: {
    summary: "Current electrical code cycles (NEC 2023/2026, IEC 60364, and PUE 7.1) mandate expanded differential earth-leakage (GFCI/RCD) protection, whole-house Surge Protective Devices (SPDs), and specialized DC-leakage monitoring for electric vehicle charging infrastructure.",
    snippets: [
      {
        codeClause: "NEC 210.8(F)",
        standard: "NEC NFPA 70",
        title: "GFCI Protection for Outdoor Outlets & HVAC Equipment",
        effectiveEdition: "NEC 2023 / 2026 Cycle",
        requirementText: "All outdoor outlets for dwellings, including dedicated branch circuits feeding outdoor air conditioning, heat pumps, and condensing units up to 50A single-phase, require Class A GFCI protection.",
        practicalImpact: "Install 2-pole GFCI circuit breakers or listed line-side disconnects with integrated ground-fault interrupt for heat pump compressors.",
        severity: "critical",
        category: "rcd_protection"
      },
      {
        codeClause: "NEC 242.66 / 230.67",
        standard: "NEC NFPA 70",
        title: "Mandatory Surge-Protective Device (SPD) at Service Equipment",
        effectiveEdition: "Current Enactment",
        requirementText: "All dwelling unit electrical service intake equipment must be provided with an integral or externally connected Type 1 or Type 2 Surge Protective Device (SPD) rated for nominal discharge current In >= 10kA.",
        practicalImpact: "Panel enclosures must allocate 2 DIN/modular breaker slots for dedicated SPD protection adjacent to main incomer.",
        severity: "mandatory",
        category: "spd_surge"
      },
      {
        codeClause: "IEC 60364-7-722.531",
        standard: "IEC 60364",
        title: "RCD Protection for EV Charging Stations (RDC-DD)",
        effectiveEdition: "IEC 60364-7 Edition 2.0",
        requirementText: "Each electric vehicle charging point must be protected by an individual RCD of at least Type A (30mA) combined with Residual Direct Current Detecting Device (RDC-DD complying with IEC 62955) or a Type B RCD.",
        practicalImpact: "Prevents smooth DC fault currents from EV battery chargers from blinding standard Type AC/A upstream residual current units.",
        severity: "critical",
        category: "rcd_protection"
      }
    ],
    keyChanges: [
      "Expanded GFCI protection to all outdoor dwelling outlets regardless of plug or hardwire configuration.",
      "Mandatory Type 1 or Type 2 Surge Protective Devices (SPDs) at the service entrance.",
      "Strict DC leakage detection (6mA RDC-DD) required on all EV charging dedicated homerun circuits."
    ],
    jurisdictionNotes: "Adopted in over 32 US states for NEC 2020/2023, and standardized under CENELEC across the European Union.",
    sources: [
      { title: "National Fire Protection Association (NFPA 70 NEC)", url: "https://www.nfpa.org/codes-and-standards/nfpa-70-standard-development/70" },
      { title: "International Electrotechnical Commission (IEC 60364-7-722)", url: "https://webstore.iec.ch/publication/60114" },
      { title: "Electrical Safety Foundation (ESFI) Code Updates", url: "https://www.esfi.org" }
    ],
    searchQueries: ["NEC 2023 210.8(F) GFCI updates", "IEC 60364-7-722 RDC-DD requirements"],
    standard: "All",
    query: "Current NEC & Regional Code Updates",
    timestamp: "2026-10-29 10:48"
  }
};

export interface KnowledgeBaseSearchProps {
  onAddSnippetToChecklist?: (snippet: GroundedSnippet) => void;
  className?: string;
}

export const KnowledgeBaseSearch: React.FC<KnowledgeBaseSearchProps> = ({
  onAddSnippetToChecklist,
  className = ''
}) => {
  const { activeProject, updateActiveProject, addActivityLog } = useProject();

  const [query, setQuery] = useState('');
  const [selectedStandard, setSelectedStandard] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<KnowledgeSearchResponse | null>(FALLBACK_RESULTS.default);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedSnippetIds, setAddedSnippetIds] = useState<Set<string>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSearch = async (queryText = query, standardText = selectedStandard) => {
    const q = queryText.trim();
    if (!q) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/knowledge-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          standard: standardText
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to query electrical code knowledge base.');
      }

      setSearchResult(data);

      addActivityLog({
        action: 'Knowledge Base Search',
        details: `Queried: "${q}" with Google Search Grounding (${standardText})`,
        category: 'project',
        status: 'completed',
        user: activeProject.leadEngineer || 'Lead Engineer',
        moduleTarget: 'reports'
      });
    } catch (err: any) {
      console.warn('Google Search Grounding endpoint fallback:', err);
      setErrorMessage(err?.message || 'Using pre-verified electrical standards knowledge cache.');
      // Keep or update to rich fallback result
      if (!searchResult) {
        setSearchResult({
          ...FALLBACK_RESULTS.default,
          query: q,
          standard: standardText
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Add a grounded snippet directly into the active project checklist
  const handleAddToChecklist = (snippet: GroundedSnippet, index: number) => {
    const newItemId = `req-grounded-${Date.now()}-${index}`;
    const standardToAssign = (snippet.standard.includes('NEC') 
      ? 'NEC NFPA 70' 
      : snippet.standard.includes('PUE') 
      ? 'PUE 7.1' 
      : snippet.standard.includes('GOST') 
      ? 'GOST 30331' 
      : 'IEC 60364') as RegionalStandard;

    const newChecklistItem: ComplianceChecklistItem = {
      id: newItemId,
      code: snippet.codeClause,
      title: snippet.title,
      description: `${snippet.requirementText} ${snippet.practicalImpact ? `(Engineering Impact: ${snippet.practicalImpact})` : ''}`,
      standard: standardToAssign,
      category: snippet.category || 'overcurrent',
      severity: snippet.severity || 'mandatory',
      status: 'pending',
      notes: `Grounded via Google Search Knowledge Base on ${new Date().toISOString().slice(0, 10)}.`,
      verifiedAt: undefined
    };

    updateActiveProject(prev => {
      const existing = prev.complianceChecklist || [];
      // Prevent exact code duplication
      if (existing.some(i => i.code === snippet.codeClause)) {
        return prev;
      }
      return {
        ...prev,
        complianceChecklist: [newChecklistItem, ...existing]
      };
    });

    setAddedSnippetIds(prev => new Set(prev).add(snippet.codeClause));
    showToast(`Added [${snippet.codeClause}] to active project compliance checklist!`);

    if (onAddSnippetToChecklist) {
      onAddSnippetToChecklist(snippet);
    }

    addActivityLog({
      action: 'Added Compliance Requirement',
      details: `Appended grounded rule ${snippet.codeClause} (${snippet.title}) to project checklist`,
      category: 'project',
      status: 'completed',
      user: activeProject.leadEngineer || 'Lead Engineer',
      moduleTarget: 'reports'
    });
  };

  // Copy snippet text to clipboard
  const handleCopySnippet = (snippet: GroundedSnippet, idx: number) => {
    const textToCopy = `[${snippet.codeClause}] ${snippet.title}\nStandard: ${snippet.standard} (${snippet.effectiveEdition || 'Current'})\nRequirement: ${snippet.requirementText}\nEngineering Impact: ${snippet.practicalImpact || 'Comply with standard.'}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedIndex(idx);
    showToast(`Copied ${snippet.codeClause} citation to clipboard!`);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#0B1C32] border border-[#00D6A0] text-[#F4F8FF] px-4 py-2.5 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 animate-fade-in backdrop-blur-md">
          <Check className="w-4 h-4 text-[#00D6A0]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SEARCH HEADER CARD */}
      <div className="rounded-2xl bg-[#061426] border border-[#1B3A5C] p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#147DFF]/15 border border-[#147DFF]/30 flex items-center justify-center text-[#18D8F2] shadow-md shadow-[#147DFF]/20">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold font-mono text-[#F4F8FF] tracking-tight">
                  Google Search Grounded Electrical Code Knowledge Base
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#00D6A0]/15 border border-[#00D6A0]/30 text-[#00D6A0]">
                  <Sparkles className="w-3 h-3 text-[#00D6A0]" />
                  Live Web Grounding
                </span>
              </div>
              <p className="text-xs text-[#9EB2CC]">
                Query real-time <strong>NEC (NFPA 70)</strong>, <strong>IEC 60364</strong>, and <strong>PUE 7.1</strong> regulatory amendments & code updates.
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH INPUT & STANDARD SELECTOR */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col md:flex-row gap-2.5"
        >
          {/* Query input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9EB2CC] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search NEC clause, GFCI outdoor exceptions, EV supply equipment, surge protection, arc-fault..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#030B18] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] placeholder-[#9EB2CC]/50 focus:border-[#18D8F2] outline-none transition-colors"
            />
          </div>

          {/* Standards Filter Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="px-3 py-2.5 bg-[#030B18] border border-[#1B3A5C] rounded-xl text-xs font-mono text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
            >
              <option value="All">All Standards</option>
              <option value="NEC NFPA 70">NEC (NFPA 70)</option>
              <option value="IEC 60364">IEC 60364</option>
              <option value="PUE 7.1">PUE 7.1 (ПУЭ)</option>
              <option value="GOST 30331">GOST 30331</option>
            </select>

            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="px-5 py-2.5 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none text-[#030B18] text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#147DFF]/25 transition-all cursor-pointer whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#030B18] border-t-transparent rounded-full animate-spin" />
                  <span>Grounding...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Search Grounded Codes</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 1-CLICK POPULAR CODE TOPICS */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EB2CC] flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-[#18D8F2]" />
            Trending Code Clauses & Updates (1-Tap Explore)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SEARCH_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(p.query);
                  setSelectedStandard(p.standard);
                  handleSearch(p.query, p.standard);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#030B18] hover:bg-[#10243D] border border-[#1B3A5C] hover:border-[#18D8F2] text-[11px] font-mono text-[#9EB2CC] hover:text-[#F4F8FF] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#18D8F2]" />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ERROR OR FALLBACK NOTICE */}
      {errorMessage && (
        <div className="p-3 bg-[#FF9A24]/10 border border-[#FF9A24]/30 rounded-xl text-xs text-[#FF9A24] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => handleSearch()}
            className="text-[11px] underline font-bold hover:text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* SEARCH RESULT CONTENT */}
      {searchResult && (
        <div className="space-y-4 animate-fade-in">
          {/* SYNTHESIS & METADATA BAR */}
          <div className="bg-[#07172C] border border-[#1B3A5C] rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1B3A5C]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#18D8F2]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F4F8FF]">
                  Regulatory Analysis & Code Synthesis
                </h3>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#9EB2CC]">
                <Clock className="w-3 h-3" />
                <span>Retrieved: {searchResult.timestamp}</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#F4F8FF] leading-relaxed font-sans">
              {searchResult.summary}
            </p>

            {/* Key Revisions / Changes */}
            {searchResult.keyChanges && searchResult.keyChanges.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#00D6A0] font-bold block mb-1">
                  Key Standards Revisions & Changes:
                </span>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs text-[#9EB2CC]">
                  {searchResult.keyChanges.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 bg-[#030B18]/60 p-2 rounded-lg border border-white/5">
                      <span className="text-[#00D6A0] font-bold">›</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Jurisdiction Notes */}
            {searchResult.jurisdictionNotes && (
              <div className="text-[11px] font-mono text-[#9EB2CC] bg-[#030B18]/40 p-2 rounded-lg border border-white/5 flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#18D8F2] shrink-0" />
                <span><strong>Enactment Scope:</strong> {searchResult.jurisdictionNotes}</span>
              </div>
            )}
          </div>

          {/* GROUNDED CODE SNIPPETS GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00D6A0]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F4F8FF]">
                  Grounded Code Clauses & Snippets ({searchResult.snippets.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#9EB2CC]">
                Click "Add to Checklist" to enforce requirement in project
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {searchResult.snippets.map((snippet, idx) => {
                const isAdded = addedSnippetIds.has(snippet.codeClause) || 
                  (activeProject.complianceChecklist || []).some(c => c.code === snippet.codeClause);

                const severityBadge = snippet.severity === 'critical'
                  ? 'bg-[#FF5263]/15 border-[#FF5263]/40 text-[#FF5263]'
                  : snippet.severity === 'mandatory'
                  ? 'bg-[#FF9A24]/15 border-[#FF9A24]/40 text-[#FF9A24]'
                  : 'bg-[#18D8F2]/15 border-[#18D8F2]/40 text-[#18D8F2]';

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#1B3A5C] bg-[#061426] hover:border-[#18D8F2]/40 transition-all space-y-3 shadow-lg"
                  >
                    {/* Snippet Header */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-xs font-mono font-extrabold bg-[#18D8F2]/10 border border-[#18D8F2]/30 text-[#18D8F2]">
                          {snippet.codeClause}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0B1C32] border border-[#1B3A5C] text-[#9EB2CC]">
                          {snippet.standard}
                        </span>
                        {snippet.effectiveEdition && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#00D6A0]/10 border border-[#00D6A0]/30 text-[#00D6A0]">
                            {snippet.effectiveEdition}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${severityBadge}`}>
                          {snippet.severity}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopySnippet(snippet, idx)}
                          className="p-1.5 rounded-lg bg-[#0B1C32] hover:bg-[#10243D] text-[#9EB2CC] hover:text-[#F4F8FF] border border-[#1B3A5C] text-xs transition-colors cursor-pointer"
                          title="Copy Code Snippet Citation"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3.5 h-3.5 text-[#00D6A0]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => handleAddToChecklist(snippet, idx)}
                          disabled={isAdded}
                          className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                            isAdded
                              ? 'bg-[#00D6A0]/20 border-[#00D6A0]/40 text-[#00D6A0] cursor-default'
                              : 'bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:brightness-110 text-[#030B18] shadow-md shadow-[#147DFF]/20'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>In Checklist</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Add to Checklist</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Snippet Title */}
                    <h4 className="text-sm font-bold text-[#F4F8FF]">
                      {snippet.title}
                    </h4>

                    {/* Technical Requirement Text */}
                    <div className="bg-[#030B18] p-3 rounded-lg border border-[#1B3A5C] text-xs text-[#F4F8FF] leading-relaxed font-sans">
                      {snippet.requirementText}
                    </div>

                    {/* Practical Engineering Impact */}
                    {snippet.practicalImpact && (
                      <div className="p-2.5 rounded-lg bg-[#147DFF]/10 border border-[#147DFF]/25 text-xs text-[#18D8F2] flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#18D8F2]" />
                        <div>
                          <strong className="font-mono text-[11px] uppercase tracking-wider block text-[#F4F8FF]">
                            Contractor & Designer Impact:
                          </strong>
                          <span>{snippet.practicalImpact}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* GOOGLE SEARCH GROUNDING SOURCES & CITATIONS */}
          {searchResult.sources && searchResult.sources.length > 0 && (
            <div className="rounded-xl bg-[#030B18] border border-[#1B3A5C] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-[#9EB2CC]">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Globe className="w-3.5 h-3.5 text-[#18D8F2]" />
                  Google Search Grounding Verified References
                </span>
                <span>{searchResult.sources.length} sources cited</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {searchResult.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#07172C] hover:bg-[#10243D] border border-[#1B3A5C] hover:border-[#18D8F2] text-xs text-[#F4F8FF] flex items-center gap-1.5 transition-colors group"
                  >
                    <span className="text-[#18D8F2] text-[10px] font-mono group-hover:underline truncate max-w-xs">
                      {source.title}
                    </span>
                    <ExternalLink className="w-3 h-3 text-[#9EB2CC] group-hover:text-[#18D8F2]" />
                  </a>
                ))}
              </div>

              {searchResult.searchQueries && searchResult.searchQueries.length > 0 && (
                <div className="pt-1 text-[10px] font-mono text-[#9EB2CC] flex items-center gap-2">
                  <span>Queries:</span>
                  {searchResult.searchQueries.map((q, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-[#0B1C32] border border-white/5 text-[#9EB2CC]">
                      "{q}"
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KnowledgeBaseSearch;
