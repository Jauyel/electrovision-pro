import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Sparkles,
  Download,
  RotateCcw,
  CheckCheck,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  Flame,
  Zap,
  Layers,
  SlidersHorizontal,
  BookmarkCheck,
  Edit3,
  Globe
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { KnowledgeBaseSearch } from './KnowledgeBaseSearch';
import {
  ComplianceChecklistItem,
  ComplianceStatus,
  ComplianceSeverity,
  RegionalStandard,
  ComplianceCategory
} from '../../types';

// Default Authoritative Regional Code Requirements Database
export const DEFAULT_REGIONAL_REQUIREMENTS: ComplianceChecklistItem[] = [
  {
    id: 'req-rcd-general',
    code: 'PUE 7.1.71 / IEC 60364-4-41',
    title: 'Residual Current Device (RCD) for General Sockets',
    description: 'Mandatory 30mA residual current protection (RCD / RCBO Type A) installed for all convenience socket outlets rated up to 32A.',
    standard: 'PUE 7.1',
    category: 'rcd_protection',
    severity: 'critical',
    status: 'compliant',
    notes: 'Schneider Electric Acti9 iID 40A 30mA Type A verified on L1 & L2 socket lines.',
    verifiedAt: '2026-10-28 14:15'
  },
  {
    id: 'req-rcd-wet',
    code: 'PUE 7.1.82 / IEC 60364-7-701',
    title: 'High-Sensitivity RCD for Wet Areas & Bathrooms',
    description: '10mA sensitivity differential protection required for hydro-massage tubs, showers, wet rooms, and sauna accessories.',
    standard: 'PUE 7.1',
    category: 'wet_zones',
    severity: 'critical',
    status: 'compliant',
    notes: 'Dedicated 10mA RCBO assigned to bathroom consumer feeder.',
    verifiedAt: '2026-10-28 14:20'
  },
  {
    id: 'req-rcd-fire',
    code: 'PUE 7.1.84 / GOST 30331.3',
    title: 'Incoming Fire Prevention Selective RCD',
    description: '100mA or 300mA selective time-delayed (Type S) RCD installed at the intake panel origin to detect cable insulation degradation and prevent arcing fires.',
    standard: 'GOST 30331',
    category: 'rcd_protection',
    severity: 'mandatory',
    status: 'compliant',
    notes: 'Main 300mA selective unit specified at incoming main panel switchgear.',
    verifiedAt: '2026-10-28 14:25'
  },
  {
    id: 'req-earthing-split',
    code: 'PUE 7.1.21 / IEC 60364-5-54',
    title: 'Separation of Neutral (N) and Protective Earth (PE)',
    description: 'Strict separation of Neutral (N) and Protective Earth (PE) conductors downstream of the PEN splitting busbar in TN-C-S / TN-S systems. Interconnection downstream is prohibited.',
    standard: 'PUE 7.1',
    category: 'earthing',
    severity: 'critical',
    status: 'compliant',
    notes: 'Isolated N and PE copper busbars inspected; zero downstream bridging.',
    verifiedAt: '2026-10-28 14:30'
  },
  {
    id: 'req-earth-resistance',
    code: 'PUE 1.7.101 / KMK 2.01.08',
    title: 'Maximum Earth Electrode Loop Resistance (<= 4.0 Ohm)',
    description: 'Earthing system resistance to earth must not exceed 4.0 Ohms under seasonal dry soil conditions for 230/400V electrical installations.',
    standard: 'PUE 7.1',
    category: 'earthing',
    severity: 'critical',
    status: 'compliant',
    notes: 'Soil resistivity measured: 2.45 Ohms with deep rod vertical electrode array.',
    verifiedAt: '2026-10-28 14:35'
  },
  {
    id: 'req-breaker-sockets',
    code: 'PUE 7.1.37',
    title: 'Branch Breaker Rating for Sockets (<= 16A)',
    description: 'Socket circuit protection must not exceed 16A miniature circuit breaker (MCB Curve C) with minimum 3x2.5 mm² copper conductor cross-section.',
    standard: 'PUE 7.1',
    category: 'overcurrent',
    severity: 'mandatory',
    status: 'compliant',
    notes: 'All socket circuits protected by iC60N 16A C-curve breakers.',
    verifiedAt: '2026-10-28 14:40'
  },
  {
    id: 'req-breaker-lighting',
    code: 'PUE 7.1.42',
    title: 'Branch Breaker Rating for Lighting (<= 10A)',
    description: 'Lighting circuit protection must not exceed 10A MCB (Curve B recommended for LED drivers) with minimum 3x1.5 mm² copper conductors.',
    standard: 'PUE 7.1',
    category: 'overcurrent',
    severity: 'mandatory',
    status: 'compliant',
    notes: 'Curve B 10A breakers deployed for LED downlight driver arrays.',
    verifiedAt: '2026-10-28 14:42'
  },
  {
    id: 'req-heavy-dedicated',
    code: 'IEC 60364-4-43',
    title: 'Dedicated Radial Circuit for High-Power Appliances (> 2kW)',
    description: 'Stationary appliances exceeding 2.0 kW (air conditioners, electric ovens, water boilers, EV chargers) must have dedicated individual radial circuits without daisy-chained socket outlets.',
    standard: 'IEC 60364',
    category: 'overcurrent',
    severity: 'mandatory',
    status: 'compliant',
    notes: 'VRV Inverter AC unit (2.8 kW) fed via dedicated 4.0 mm² run.',
    verifiedAt: '2026-10-28 14:45'
  },
  {
    id: 'req-voltage-drop',
    code: 'IEC 60364-5-52 / GOST 30331.1',
    title: 'Maximum Permissible Voltage Drop (<= 3.0% Lighting, <= 5.0% Power)',
    description: 'Voltage drop between the incoming origin and the farthest luminaire point must not exceed 3.0%, and for power outlets must not exceed 5.0% under peak load design current.',
    standard: 'IEC 60364',
    category: 'voltage_drop',
    severity: 'mandatory',
    status: 'compliant',
    notes: 'Peak voltage drop calculated at 1.84% across longest 36m run.',
    verifiedAt: '2026-10-28 14:50'
  },
  {
    id: 'req-cable-flame-retardant',
    code: 'PUE 7.1.38 / GOST 31996',
    title: 'Flame-Retardant Low-Smoke Cable Jacket (VVGng-LS / LSZH)',
    description: 'All residential and public building wiring concealed within drywall partitions or ceiling plenums must utilize VVGng-LS or halogen-free cables enclosed in self-extinguishing PVC conduits.',
    standard: 'GOST 30331',
    category: 'conduit_fire',
    severity: 'mandatory',
    status: 'compliant',
    notes: 'Uzkabel VVGng-LS certified copper cables specified across all BOM items.',
    verifiedAt: '2026-10-28 14:55'
  },
  {
    id: 'req-bathroom-zoning',
    code: 'IEC 60364-7-701 / PUE 7.1.48',
    title: 'Bathroom Safety Zones (Zone 0, 1, 2 Clearances)',
    description: 'Strict prohibition of 230V switches and socket outlets inside Zone 0 and Zone 1. All outlets in Zone 2 and Zone 3 must be at least 600mm from shower basin with IP44 protection.',
    standard: 'IEC 60364',
    category: 'wet_zones',
    severity: 'critical',
    status: 'pending',
    notes: 'Physical rough-in clearance inspection pending completion of tiling.',
    verifiedAt: undefined
  },
  {
    id: 'req-spd-surge',
    code: 'IEC 60364-4-443 / PUE 7.1.22',
    title: 'Surge Protective Device (Type 2 SPD)',
    description: 'Installation of Class II / Type 2 surge arresters (SPD) at the primary distribution panel to safeguard electronic microprocessors and smart building automation from atmospheric surges.',
    standard: 'IEC 60364',
    category: 'spd_surge',
    severity: 'recommended',
    status: 'compliant',
    notes: 'Schneider iPRD40r 3P+N surge arrester mounted on Rail 0.',
    verifiedAt: '2026-10-28 15:00'
  },
  {
    id: 'req-panel-ip-rating',
    code: 'IEC 60529 / PUE 7.1.28',
    title: 'Panel Enclosure Ingress Protection & Finger-Safe Cover',
    description: 'Distribution enclosures in indoor residential rooms must meet minimum IP31/IP40 rating with dead-front finger-safe barriers (IP2X) to prevent accidental direct contact with live parts.',
    standard: 'PUE 7.1',
    category: 'panel_enclosure',
    severity: 'mandatory',
    status: 'compliant',
    notes: 'Schneider Electric Pragma IP40 flush enclosure selected.',
    verifiedAt: '2026-10-28 15:05'
  },
  {
    id: 'req-neutral-sizing',
    code: 'PUE 7.1.45 / GOST 30331',
    title: 'Equal Cross-Section for Neutral Conductor (Sn = Sp)',
    description: 'Neutral conductors must have equal cross-sectional area to phase conductors (Sn = Sp) to accommodate third harmonic currents generated by non-linear electronics and LED drivers.',
    standard: 'PUE 7.1',
    category: 'overcurrent',
    severity: 'mandatory',
    status: 'compliant',
    notes: 'All 3-phase and 1-phase cables maintain full neutral cross-section.',
    verifiedAt: '2026-10-28 15:10'
  },
  {
    id: 'req-supplementary-bonding',
    code: 'IEC 60364-7-701 § 701.415.2',
    title: 'Supplementary Equipotential Bonding (SEB) in Bathrooms',
    description: 'Local equipotential bonding connecting metallic pipes, shower pans, and exposed conductive parts to the room earth terminal using minimum 4.0 mm² copper conductor.',
    standard: 'IEC 60364',
    category: 'wet_zones',
    severity: 'mandatory',
    status: 'pending',
    notes: 'SEB terminal box designated in bathroom wall; bonding clamp verification pending.',
    verifiedAt: undefined
  },
  {
    id: 'req-socket-count-limit',
    code: 'PUE 7.1 § 7.1.40',
    title: 'Maximum Sockets per Branch Circuit (<= 8 points)',
    description: 'Recommended limit of maximum 8 general socket outlets per single 16A branch circuit to avoid simultaneous diversity overload in living spaces.',
    standard: 'PUE 7.1',
    category: 'overcurrent',
    severity: 'recommended',
    status: 'compliant',
    notes: 'Living room CAD circuits grouped with 4 to 6 sockets maximum.',
    verifiedAt: '2026-10-28 15:15'
  }
];

export const ComplianceAuditor: React.FC<{ className?: string }> = ({ className = '' }) => {
  const {
    activeProject,
    updateActiveProject,
    openAiModal,
    addActivityLog,
    downloadProjectPdf
  } = useProject();

  // Active items stored in activeProject, falling back to defaults
  const checklistItems: ComplianceChecklistItem[] = useMemo(() => {
    if (activeProject.complianceChecklist && activeProject.complianceChecklist.length > 0) {
      return activeProject.complianceChecklist;
    }
    return DEFAULT_REGIONAL_REQUIREMENTS;
  }, [activeProject.complianceChecklist]);

  // Main View Tab: Checklist vs Knowledge Base Search
  const [activeTab, setActiveTab] = useState<'checklist' | 'knowledge'>('checklist');

  // Filters & Search State
  const [selectedStandard, setSelectedStandard] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>('');

  // 1. Calculate Live Compliance Metrics
  const metrics = useMemo(() => {
    const total = checklistItems.length;
    const compliant = checklistItems.filter(i => i.status === 'compliant').length;
    const pending = checklistItems.filter(i => i.status === 'pending').length;
    const flagged = checklistItems.filter(i => i.status === 'flagged').length;
    const score = total > 0 ? Math.round((compliant / total) * 100) : 100;

    const criticalItems = checklistItems.filter(i => i.severity === 'critical');
    const criticalPassed = criticalItems.filter(i => i.status === 'compliant').length;
    const criticalViolations = criticalItems.filter(i => i.status === 'flagged').length;

    return {
      total,
      compliant,
      pending,
      flagged,
      score,
      criticalTotal: criticalItems.length,
      criticalPassed,
      criticalViolations,
      isFullyApproved: flagged === 0 && pending === 0
    };
  }, [checklistItems]);

  // 2. Filtered list based on active filters
  const filteredItems = useMemo(() => {
    return checklistItems.filter(item => {
      // Standard filter
      if (selectedStandard !== 'ALL') {
        if (!item.standard.includes(selectedStandard) && !item.code.includes(selectedStandard)) {
          return false;
        }
      }
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchNotes = (item.notes || '').toLowerCase().includes(q);
        return matchCode || matchTitle || matchDesc || matchNotes;
      }
      return true;
    });
  }, [checklistItems, selectedStandard, selectedCategory, selectedStatus, searchQuery]);

  // 3. Toggle Status Handler for a Single Item
  const handleToggleStatus = (id: string, newStatus?: ComplianceStatus) => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const updated = checklistItems.map(item => {
      if (item.id === id) {
        let nextStatus: ComplianceStatus = 'compliant';
        if (newStatus) {
          nextStatus = newStatus;
        } else {
          // Cycle: compliant -> flagged -> pending -> compliant
          if (item.status === 'compliant') nextStatus = 'flagged';
          else if (item.status === 'flagged') nextStatus = 'pending';
          else nextStatus = 'compliant';
        }

        return {
          ...item,
          status: nextStatus,
          verifiedAt: nextStatus === 'compliant' ? now : item.verifiedAt
        };
      }
      return item;
    });

    updateActiveProject(prev => ({
      ...prev,
      complianceChecklist: updated
    }));

    const targetItem = updated.find(i => i.id === id);
    if (targetItem) {
      addActivityLog({
        action: 'Updated Compliance Requirement',
        details: `${targetItem.code} status set to [${targetItem.status.toUpperCase()}]`,
        category: 'project',
        status: targetItem.status === 'compliant' ? 'completed' : 'in_progress',
        user: activeProject.leadEngineer || 'Lead Engineer',
        moduleTarget: 'reports'
      });
    }
  };

  // 4. Save Notes Handler
  const handleSaveNotes = (id: string) => {
    const updated = checklistItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          notes: tempNotes
        };
      }
      return item;
    });

    updateActiveProject(prev => ({
      ...prev,
      complianceChecklist: updated
    }));

    setEditingNotesId(null);
  };

  // 5. Bulk Actions
  const handleMarkAllCompliant = () => {
    const now = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const updated = checklistItems.map(item => ({
      ...item,
      status: 'compliant' as ComplianceStatus,
      verifiedAt: item.verifiedAt || now
    }));

    updateActiveProject(prev => ({
      ...prev,
      complianceChecklist: updated
    }));

    addActivityLog({
      action: 'Verified Compliance Checklist',
      details: `Marked all ${updated.length} regional electrical code requirements as COMPLIANT`,
      category: 'project',
      status: 'completed',
      user: activeProject.leadEngineer || 'Lead Engineer',
      moduleTarget: 'reports'
    });
  };

  const handleResetToDefault = () => {
    updateActiveProject(prev => ({
      ...prev,
      complianceChecklist: DEFAULT_REGIONAL_REQUIREMENTS
    }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Header Card with Compliance Score Gauge */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#0B1C32] via-[#07172C] to-[#040E1B] border border-white/10 p-5 sm:p-6 shadow-2xl overflow-hidden">
        {/* Glow flare */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#18D8F2]/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#00D6A0]/15 border border-[#00D6A0]/30 flex items-center justify-center text-[#00D6A0] shadow-[0_0_15px_rgba(0,214,160,0.25)]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold text-[#F4F8FF] font-mono tracking-tight flex items-center gap-2">
                  <span>Regional Electrical Code Compliance Auditor</span>
                </h1>
                <p className="text-xs text-[#9EB2CC]">
                  Authoritative inspection checklist enforcing <strong>PUE 7.1</strong>, <strong>IEC 60364</strong>, and <strong>GOST 30331</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px] text-[#9EB2CC]">
              <span className="px-2 py-0.5 rounded-md bg-[#10243D] text-[#00D6A0] border border-[#00D6A0]/30">
                Active Code: {activeProject.standard}
              </span>
              <span>&middot;</span>
              <span>Project: <strong className="text-[#F4F8FF]">{activeProject.name}</strong></span>
              <span>&middot;</span>
              <span>Lead: <strong className="text-[#18D8F2]">{activeProject.leadEngineer}</strong></span>
            </div>
          </div>

          {/* Live Compliance Score Tile */}
          <div className="flex items-center gap-4 bg-[#061426]/80 p-4 rounded-xl border border-white/10 shrink-0">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="#10243D"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke={metrics.score >= 90 ? '#00D6A0' : metrics.score >= 70 ? '#FF9A24' : '#FF5263'}
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={163.36}
                  strokeDashoffset={163.36 - (163.36 * metrics.score) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute font-mono font-extrabold text-sm text-[#F4F8FF]">
                {metrics.score}%
              </span>
            </div>

            <div className="space-y-1 font-mono text-xs">
              <div className="text-[10px] text-[#9EB2CC] uppercase tracking-wider">Audit Rating</div>
              <div className="text-sm font-bold text-[#F4F8FF] flex items-center gap-1.5">
                {metrics.criticalViolations > 0 ? (
                  <span className="text-[#FF5263] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Action Required
                  </span>
                ) : metrics.isFullyApproved ? (
                  <span className="text-[#00D6A0] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% Certified
                  </span>
                ) : (
                  <span className="text-[#FF9A24] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> In Progress
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#9EB2CC] flex items-center gap-2">
                <span className="text-[#00D6A0]">{metrics.compliant} Pass</span>
                <span>&middot;</span>
                <span className="text-[#FF9A24]">{metrics.pending} Pending</span>
                {metrics.flagged > 0 && (
                  <>
                    <span>&middot;</span>
                    <span className="text-[#FF5263]">{metrics.flagged} Flagged</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs & Action Row */}
        <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-[#030B18] p-1 rounded-xl border border-[#1B3A5C] gap-1">
            <button
              onClick={() => setActiveTab('checklist')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'checklist'
                  ? 'bg-[#00D6A0] text-[#030B18] shadow-md shadow-[#00D6A0]/25'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Inspection Checklist ({checklistItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('knowledge')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'knowledge'
                  ? 'bg-gradient-to-r from-[#147DFF] to-[#18D8F2] text-[#030B18] shadow-md shadow-[#147DFF]/25'
                  : 'text-[#18D8F2] hover:text-[#F4F8FF]'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>NEC & Regional Code Updates</span>
              <span className="px-1.5 py-0.2 rounded bg-[#18D8F2]/20 text-[#18D8F2] text-[9px] uppercase font-bold hidden sm:inline">
                Grounding
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openAiModal('audit')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#147DFF] to-[#18D8F2] text-[#040E1B] font-bold text-xs font-mono shadow-md hover:brightness-110 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Cross-Check</span>
            </button>

            {activeTab === 'checklist' && (
              <>
                <button
                  onClick={handleMarkAllCompliant}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10243D] hover:bg-[#1B3A5C] text-[#00D6A0] text-xs font-mono border border-[#00D6A0]/30 transition-all cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Compliant</span>
                </button>

                <button
                  onClick={handleResetToDefault}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#9EB2CC] text-xs font-mono border border-white/5 transition-all cursor-pointer"
                  title="Reset checklist to standard defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </>
            )}

            <button
              onClick={() => downloadProjectPdf()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] text-xs font-mono border border-white/10 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#18D8F2]" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'knowledge' ? (
        <KnowledgeBaseSearch
          onAddSnippetToChecklist={() => {
            // Snippet added, user can stay or inspect checklist
          }}
        />
      ) : (
        <>
          {/* 2. Interactive Filter & Search Controls */}
          <div className="p-4 rounded-xl bg-[#07172C] border border-[#1B3A5C] space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Input */}
              <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9EB2CC] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code clause, requirement title, standard citation (e.g. 7.1.71, RCD, TN-S)..."
              className="w-full pl-9 pr-3 py-2 bg-[#040E1B] border border-[#1B3A5C] rounded-lg text-xs font-mono text-[#F4F8FF] placeholder-[#9EB2CC]/50 focus:outline-none focus:border-[#18D8F2]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#9EB2CC] hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#040E1B] p-1 rounded-lg border border-[#1B3A5C] text-xs font-mono self-start sm:self-auto">
            <button
              onClick={() => setSelectedStatus('ALL')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                selectedStatus === 'ALL'
                  ? 'bg-[#18D8F2] text-[#040E1B] font-bold'
                  : 'text-[#9EB2CC] hover:text-white'
              }`}
            >
              All ({checklistItems.length})
            </button>
            <button
              onClick={() => setSelectedStatus('compliant')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                selectedStatus === 'compliant'
                  ? 'bg-[#00D6A0] text-[#040E1B] font-bold'
                  : 'text-[#00D6A0] hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Pass ({metrics.compliant})</span>
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                selectedStatus === 'pending'
                  ? 'bg-[#FF9A24] text-[#040E1B] font-bold'
                  : 'text-[#FF9A24] hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pending ({metrics.pending})</span>
            </button>
            <button
              onClick={() => setSelectedStatus('flagged')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                selectedStatus === 'flagged'
                  ? 'bg-[#FF5263] text-white font-bold'
                  : 'text-[#FF5263] hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Flagged ({metrics.flagged})</span>
            </button>
          </div>
        </div>

        {/* Standard & Category Dropdown Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#9EB2CC]">
            <Filter className="w-3.5 h-3.5 text-[#18D8F2]" />
            <span>Standard:</span>
          </div>

          {(['ALL', 'PUE 7.1', 'IEC 60364', 'GOST 30331'] as const).map(std => (
            <button
              key={std}
              onClick={() => setSelectedStandard(std)}
              className={`px-2 py-0.5 rounded-md border text-[11px] transition-all ${
                selectedStandard === std
                  ? 'bg-[#18D8F2]/20 border-[#18D8F2] text-[#18D8F2] font-bold'
                  : 'bg-[#040E1B] border-white/5 text-[#9EB2CC] hover:border-white/20'
              }`}
            >
              {std === 'ALL' ? 'All Standards' : std}
            </button>
          ))}

          <span className="text-[#1B3A5C] mx-1">|</span>

          <div className="flex items-center gap-1 text-[#9EB2CC]">
            <span>Category:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1 bg-[#040E1B] border border-[#1B3A5C] rounded-md text-[11px] font-mono text-[#F4F8FF] focus:outline-none focus:border-[#18D8F2]"
          >
            <option value="ALL">All Categories</option>
            <option value="rcd_protection">RCD & Differential Protection</option>
            <option value="earthing">Earthing & Bonding (TN-S)</option>
            <option value="overcurrent">Overcurrent & Breaker Sizing</option>
            <option value="voltage_drop">Voltage Drop (ΔU)</option>
            <option value="wet_zones">Wet Zones & Bathroom Safety</option>
            <option value="conduit_fire">Fire Safety & Cable Jackets</option>
            <option value="spd_surge">Surge Protection (SPD)</option>
            <option value="panel_enclosure">Enclosure & Ingress (IP)</option>
          </select>
        </div>
      </div>

      {/* 3. Checklist Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center bg-[#07172C]/60 rounded-xl border border-white/5 font-mono text-xs text-[#9EB2CC] space-y-2">
            <Info className="w-6 h-6 text-[#18D8F2] mx-auto opacity-70" />
            <div>No regional compliance requirements match your current search or filters.</div>
            <button
              onClick={() => {
                setSelectedStandard('ALL');
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="text-[#18D8F2] underline hover:brightness-120"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          filteredItems.map(item => {
            const isExpanded = expandedItemId === item.id;
            const isEditingNotes = editingNotesId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  item.status === 'compliant'
                    ? 'bg-[#07172C]/80 border-white/5 hover:border-[#00D6A0]/40'
                    : item.status === 'flagged'
                      ? 'bg-[#150A10]/90 border-[#FF5263]/50 shadow-[0_0_15px_rgba(255,82,99,0.15)]'
                      : 'bg-[#0B1C32]/80 border-[#FF9A24]/30'
                }`}
              >
                {/* Main Card Row */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Code Citation, Severity, Title, Description */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Code Tag */}
                      <span className="text-xs font-extrabold font-mono px-2 py-0.5 rounded bg-[#10243D] text-[#18D8F2] border border-[#18D8F2]/30">
                        {item.code}
                      </span>

                      {/* Standard Tag */}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#040E1B] text-[#9EB2CC] border border-white/5">
                        {item.standard}
                      </span>

                      {/* Severity Chip */}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                        item.severity === 'critical'
                          ? 'bg-[#FF5263]/15 text-[#FF5263] border border-[#FF5263]/30'
                          : item.severity === 'mandatory'
                            ? 'bg-[#FF9A24]/15 text-[#FF9A24] border border-[#FF9A24]/30'
                            : 'bg-[#8B5CFF]/15 text-[#8B5CFF] border border-[#8B5CFF]/30'
                      }`}>
                        {item.severity}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-[#F4F8FF] tracking-tight">
                      {item.title}
                    </h3>

                    <p className="text-xs text-[#9EB2CC] leading-relaxed">
                      {item.description}
                    </p>

                    {item.verifiedAt && (
                      <div className="text-[10px] font-mono text-[#00D6A0] flex items-center gap-1 pt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified at: {item.verifiedAt}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Interactive 3-Pill Status Toggle */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    <div className="flex items-center bg-[#040E1B] p-1 rounded-xl border border-[#1B3A5C] text-xs font-mono shadow-inner">
                      {/* Compliant Button */}
                      <button
                        onClick={() => handleToggleStatus(item.id, 'compliant')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          item.status === 'compliant'
                            ? 'bg-[#00D6A0] text-[#040E1B] font-bold shadow-[0_0_10px_rgba(0,214,160,0.4)]'
                            : 'text-[#9EB2CC] hover:text-[#00D6A0]'
                        }`}
                        title="Mark as compliant / verified"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pass</span>
                      </button>

                      {/* Pending Button */}
                      <button
                        onClick={() => handleToggleStatus(item.id, 'pending')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          item.status === 'pending'
                            ? 'bg-[#FF9A24] text-[#040E1B] font-bold shadow-[0_0_10px_rgba(255,154,36,0.4)]'
                            : 'text-[#9EB2CC] hover:text-[#FF9A24]'
                        }`}
                        title="Mark as pending site inspection"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </button>

                      {/* Flagged Button */}
                      <button
                        onClick={() => handleToggleStatus(item.id, 'flagged')}
                        className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                          item.status === 'flagged'
                            ? 'bg-[#FF5263] text-white font-bold shadow-[0_0_10px_rgba(255,82,99,0.4)]'
                            : 'text-[#9EB2CC] hover:text-[#FF5263]'
                        }`}
                        title="Flag as non-compliant violation"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Flagged</span>
                      </button>
                    </div>

                    {/* Toggle Details / Notes Accordion */}
                    <button
                      onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                      className="text-[11px] font-mono text-[#9EB2CC] hover:text-[#18D8F2] flex items-center gap-1 py-1"
                    >
                      <span>{item.notes ? 'View Notes' : 'Add Notes'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 text-[#18D8F2]" />}
                    </button>
                  </div>
                </div>

                {/* Expandable Notes & Engineer Verification Box */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-[#040E1B]/80 border-t border-white/5 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-[#9EB2CC]">
                      <span className="font-bold flex items-center gap-1.5 text-[#18D8F2]">
                        <Edit3 className="w-3 h-3" />
                        <span>Site Verification & Audit Notes:</span>
                      </span>

                      {!isEditingNotes && (
                        <button
                          onClick={() => {
                            setEditingNotesId(item.id);
                            setTempNotes(item.notes || '');
                          }}
                          className="text-[10px] text-[#147DFF] hover:underline"
                        >
                          {item.notes ? 'Edit Notes' : '+ Add Inspection Note'}
                        </button>
                      )}
                    </div>

                    {isEditingNotes ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="Record megger test value, loop resistance, breaker curve model, or site inspection remarks..."
                          className="w-full p-2.5 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs font-mono text-[#F4F8FF] focus:outline-none focus:border-[#18D8F2] h-20"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingNotesId(null)}
                            className="px-2.5 py-1 rounded bg-[#10243D] text-[#9EB2CC] text-[11px]"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNotes(item.id)}
                            className="px-3 py-1 rounded bg-[#00D6A0] text-[#040E1B] font-bold text-[11px]"
                          >
                            Save Notes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-[#061426] rounded-lg border border-white/5 text-[#F4F8FF] text-[11px]">
                        {item.notes ? (
                          <span>{item.notes}</span>
                        ) : (
                          <span className="text-[#9EB2CC]/60 italic">No notes recorded yet. Click "Add Inspection Note" to record site measurements.</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
        </>
      )}
    </div>
  );
};
