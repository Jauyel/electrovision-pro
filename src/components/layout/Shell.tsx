import React, { useEffect, useMemo, useState } from 'react';
import { TopHeader } from './TopHeader';
import { useProject } from '../../context/ProjectContext';
import { Dashboard } from '../dashboard/Dashboard';
import { AIObjectScanner } from '../scanner/AIObjectScanner';
import { InstallationMode } from '../installation/InstallationMode';
import { PanelBuilder } from '../panel/PanelBuilder';
import { ElectricalCAD } from '../cad/ElectricalCAD';
import { MaterialEstimator } from '../estimator/MaterialEstimator';
import { ElectricalCalculations } from '../calculations/ElectricalCalculations';
import { ProjectsView } from '../projects/ProjectsView';
import { ReportsView } from '../reports/ReportsView';
import { SettingsView } from '../settings/SettingsView';
import { ComplianceAuditor } from '../compliance/ComplianceAuditor';
import { ProjectTemplates } from '../templates/ProjectTemplates';
import { AiCopilotModal } from '../ai/AiCopilotModal';
import { Modal } from '../common/Modal';
import { 
  HashRouter, 
  HashRoute, 
  HashLink, 
  useHashRoute, 
  PrimaryRoute, 
  ToolRoute,
  formatRouteHash,
  parseHash 
} from '../routing/HashRouter';
import { 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  Box, 
  Server, 
  Calculator, 
  Wrench, 
  CheckCheck, 
  Layers, 
  FileText,
  FileBadge,
  Save,
  Check,
  Download,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Activity,
  Zap,
  LayoutDashboard,
  FolderKanban,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Compass,
  CircuitBoard,
  Scan,
  ClipboardList,
  Crosshair,
  Receipt,
  ArrowLeftRight,
  Bot,
  Gauge,
  X
} from 'lucide-react';

export interface ToolTab {
  id: ToolRoute;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
  badge: string;
}

export const TOOL_TABS: ToolTab[] = [
  { id: 'cad', label: 'Electrical CAD & SLD', shortLabel: 'CAD & SLD', icon: CircuitBoard, accent: '#8B5CFF', badge: 'SLD' },
  { id: 'scanner', label: '3D Room Scanner', shortLabel: '3D Room', icon: Scan, accent: '#18D8F2', badge: 'BIM' },
  { id: 'panel', label: 'Smart Panel Builder 3D', shortLabel: 'Panel 3D', icon: Server, accent: '#FF9A24', badge: 'DIN' },
  { id: 'calculations', label: 'Cable & Sizing', shortLabel: 'Calculations', icon: Calculator, accent: '#FF5263', badge: 'ΔU / Ikz' },
  { id: 'installation', label: 'AR Installation Mode', shortLabel: 'Install AR', icon: Crosshair, accent: '#00D6A0', badge: 'AR' },
  { id: 'estimator', label: 'Material Estimator BOM', shortLabel: 'BOM Cost', icon: Receipt, accent: '#147DFF', badge: 'Rates' },
  { id: 'compliance', label: 'Compliance Auditor', shortLabel: 'PUE Audit', icon: ShieldCheck, accent: '#10B981', badge: 'PUE 7.1' },
  { id: 'templates', label: 'Circuit Presets', shortLabel: 'Presets', icon: Layers, accent: '#F59E0B', badge: 'Turnkey' },
  { id: 'reports', label: 'Engineering PDF Dossier', shortLabel: 'Reports', icon: FileBadge, accent: '#EC4899', badge: 'PDF' },
];

export interface MainPillar {
  id: PrimaryRoute;
  label: string;
  hash: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
  description: string;
  accent: string;
}

export const MAIN_PILLARS: MainPillar[] = [
  { id: 'dashboard', label: 'Dashboard', hash: '#/dashboard', icon: LayoutDashboard, badge: 'HQ', description: 'Real-time project health & metrics', accent: '#147DFF' },
  { id: 'projects', label: 'Projects', hash: '#/projects', icon: FolderKanban, badge: 'Workspaces', description: 'Client installation files', accent: '#18D8F2' },
  { id: 'tools', label: 'Tools', hash: '#/tools/cad', icon: Wrench, badge: '9 Tools', description: 'CAD, BIM, Panels & Sizing', accent: '#8B5CFF' },
  { id: 'settings', label: 'Settings', hash: '#/settings', icon: SlidersHorizontal, badge: 'Config', description: 'Codes, standards & account', accent: '#00D6A0' },
];

/**
 * ShellSidebar: Premium Dark Navy Persistent Navigation Sidebar
 * Houses active project context, 4 core pillar nav links, and the 9 specialized engineering tools.
 */
interface ShellSidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const ShellSidebar: React.FC<ShellSidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const { primary, tool, navigate, navigateToTool } = useHashRoute();
  const {
    activeProject,
    projects,
    saveStatus,
    openAiModal,
    t
  } = useProject();

  const [isToolsExpanded, setIsToolsExpanded] = useState<boolean>(true);

  const totalLoadKw = useMemo(() => {
    return (activeProject.cadCircuits || []).reduce((sum, c) => sum + (c.powerWatts || 0), 0) / 1000;
  }, [activeProject.cadCircuits]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Persistent Dark Navy Sidebar */}
      <aside 
        aria-label="Application Sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-[#061426] border-r border-[#1B3A5C] flex flex-col justify-between shrink-0 select-none transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${isMobileOpen ? 'translate-x-0 shadow-2xl shadow-black/80' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Top Scrollable Navigation Container */}
        <div className="p-3.5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Mobile Header Bar (Close button) */}
          <div className="flex items-center justify-between lg:hidden pb-2 border-b border-[#1B3A5C]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#147DFF]/20 border border-[#147DFF]/40 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#18D8F2]" />
              </div>
              <span className="text-xs font-bold text-[#F4F8FF] font-mono">ElectroVision PRO</span>
            </div>
            <button 
              onClick={onCloseMobile}
              className="p-1.5 text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] rounded-lg transition-colors border border-[#1B3A5C]"
              aria-label="Close Navigation Sidebar"
            >
              <X className="w-4 h-4 text-[#18D8F2]" />
            </button>
          </div>

          {/* Persistent Active Project Context Card */}
          <div className="p-3 bg-gradient-to-b from-[#0B1C32] to-[#071526] border border-[#1B3A5C] rounded-xl flex flex-col gap-2.5 shadow-md shadow-black/30">
            <div className="flex items-center justify-between text-[11px] text-[#9EB2CC]">
              <span className="uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 text-[#00D6A0]">
                <span className="w-2 h-2 rounded-full bg-[#00D6A0] animate-pulse" />
                Current Project
              </span>
              <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded border flex items-center gap-1 ${
                saveStatus === 'saving'
                  ? 'bg-[#FF9A24]/15 text-[#FF9A24] border-[#FF9A24]/30'
                  : 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30'
              }`}>
                {saveStatus === 'saving' ? (
                  <>
                    <div className="w-2 h-2 border border-current border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-2.5 h-2.5 text-[#00D6A0]" />
                    <span>Saved</span>
                  </>
                )}
              </span>
            </div>

            <div className="text-xs font-bold text-[#F4F8FF] truncate leading-tight flex items-center gap-1.5" title={activeProject.name}>
              <CircuitBoard className="w-3.5 h-3.5 text-[#18D8F2] shrink-0" />
              <span className="truncate">{activeProject.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono py-1.5 border-y border-[#1B3A5C]/60 bg-[#030B18]/40 px-2 rounded-lg">
              <div className="flex flex-col">
                <span className="text-[#9EB2CC] text-[9px] flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-[#FF9A24]" />
                  TOTAL LOAD
                </span>
                <span className="text-[#00D6A0] font-bold text-[11px]">{totalLoadKw.toFixed(1)} kW</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#9EB2CC] text-[9px] flex items-center gap-1">
                  <Cpu className="w-2.5 h-2.5 text-[#18D8F2]" />
                  CIRCUITS
                </span>
                <span className="text-[#18D8F2] font-bold text-[11px]">{activeProject.cadCircuits.length} Groups</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] pt-0.5">
              <span className="font-mono text-[#9EB2CC] truncate text-[9px] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#10B981] shrink-0" />
                <span className="truncate">{activeProject.standard}</span>
              </span>
              <button
                onClick={() => {
                  navigate('#/projects');
                  onCloseMobile();
                }}
                className="flex items-center gap-1 text-[10px] font-semibold text-[#18D8F2] hover:text-white transition-colors cursor-pointer group"
                title="Switch active workspace project"
              >
                <ArrowLeftRight className="w-3 h-3 group-hover:rotate-180 transition-transform duration-300" />
                <span>Switch</span>
              </button>
            </div>
          </div>

          {/* Primary 4 Main Application Modules Navigation */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold text-[#9EB2CC] uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Main Navigation</span>
              <span className="text-[#18D8F2] text-[9px]">Zero-Reload</span>
            </div>

            {/* 1. Dashboard Nav Link */}
            <button
              onClick={() => {
                navigate('#/dashboard');
                onCloseMobile();
              }}
              className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                primary === 'dashboard'
                  ? 'bg-gradient-to-r from-[#147DFF]/25 via-[#147DFF]/15 to-transparent border-[#147DFF]/60 text-white font-bold shadow-md shadow-black/20'
                  : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] hover:border-[#1B3A5C]/60'
              }`}
            >
              {primary === 'dashboard' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#147DFF] shadow-[0_0_8px_#147DFF]" />
              )}
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                  primary === 'dashboard'
                    ? 'bg-[#147DFF]/30 border-[#147DFF]/60 text-[#147DFF] shadow-[0_0_10px_#147DFF40]'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] group-hover:text-white group-hover:border-[#147DFF]/50'
                }`}>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                </div>
                <span>{t.nav.dashboard}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  primary === 'dashboard' ? 'bg-[#147DFF]/20 border-[#147DFF]/40 text-[#147DFF]' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC]'
                }`}>
                  HQ
                </span>
                <ChevronRight className={`w-3 h-3 text-[#9EB2CC] transition-transform ${primary === 'dashboard' ? 'opacity-100 text-[#147DFF]' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
            </button>

            {/* 2. Projects Nav Link */}
            <button
              onClick={() => {
                navigate('#/projects');
                onCloseMobile();
              }}
              className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                primary === 'projects'
                  ? 'bg-gradient-to-r from-[#18D8F2]/25 via-[#18D8F2]/15 to-transparent border-[#18D8F2]/60 text-white font-bold shadow-md shadow-black/20'
                  : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] hover:border-[#1B3A5C]/60'
              }`}
            >
              {primary === 'projects' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#18D8F2] shadow-[0_0_8px_#18D8F2]" />
              )}
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                  primary === 'projects'
                    ? 'bg-[#18D8F2]/30 border-[#18D8F2]/60 text-[#18D8F2] shadow-[0_0_10px_#18D8F240]'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] group-hover:text-white group-hover:border-[#18D8F2]/50'
                }`}>
                  <FolderKanban className="w-3.5 h-3.5" />
                </div>
                <span>{t.nav.projects}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  primary === 'projects' ? 'bg-[#18D8F2]/20 border-[#18D8F2]/40 text-[#18D8F2]' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC]'
                }`}>
                  {projects.length} files
                </span>
                <ChevronRight className={`w-3 h-3 text-[#9EB2CC] transition-transform ${primary === 'projects' ? 'opacity-100 text-[#18D8F2]' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
            </button>

            {/* 3. Tools Nav Link (with expandable 9 tools accordion) */}
            <div className="pt-0.5">
              <div className={`w-full flex items-center justify-between rounded-xl border transition-all ${
                primary === 'tools'
                  ? 'bg-[#10243D] border-[#8B5CFF]/50 shadow-sm'
                  : 'border-transparent hover:bg-[#0B1C32]'
              }`}>
                <button
                  onClick={() => {
                    navigate(formatRouteHash(tool || 'cad'));
                    onCloseMobile();
                  }}
                  className="flex-1 group flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-left cursor-pointer"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                    primary === 'tools'
                      ? 'bg-[#8B5CFF]/30 border-[#8B5CFF]/60 text-[#8B5CFF] shadow-[0_0_10px_#8B5CFF40]'
                      : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] group-hover:text-[#8B5CFF] group-hover:border-[#8B5CFF]/50'
                  }`}>
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <span className={primary === 'tools' ? 'text-white font-bold' : 'text-[#9EB2CC] group-hover:text-[#F4F8FF]'}>
                    {t.nav.tools}
                  </span>
                </button>

                <div className="flex items-center gap-1 pr-2">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#061426] border border-[#1B3A5C] text-[#8B5CFF]">
                    9 Tools
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsToolsExpanded(!isToolsExpanded);
                    }}
                    className="p-1 hover:bg-[#1B3A5C]/40 rounded text-[#9EB2CC] hover:text-white transition-colors cursor-pointer"
                    aria-label="Toggle Tools Accordion"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isToolsExpanded ? 'rotate-180 text-[#8B5CFF]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Sub-Navigation for the 9 Electrical Tools */}
              {isToolsExpanded && (
                <div className="pl-3.5 pr-1 pt-1.5 pb-1 space-y-1 border-l-2 border-[#1B3A5C]/60 ml-3.5 mt-1">
                  {TOOL_TABS.map((item, index) => {
                    const Icon = item.icon;
                    const isSubActive = primary === 'tools' && tool === item.id;
                    const modNum = String(index + 1).padStart(2, '0');

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigateToTool(item.id);
                          onCloseMobile();
                        }}
                        className={`w-full group relative flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                          isSubActive
                            ? 'text-white font-bold border-[#18D8F2]/50 bg-[#10243D] shadow-sm'
                            : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
                        }`}
                        style={isSubActive ? {
                          borderColor: `${item.accent}77`,
                          backgroundColor: `${item.accent}18`
                        } : undefined}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[9px] opacity-70 w-3.5 text-left">{modNum}</span>
                          <div 
                            className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                            style={{
                              backgroundColor: `${item.accent}20`,
                              border: `1px solid ${item.accent}40`,
                              color: item.accent
                            }}
                          >
                            <Icon className="w-3 h-3" />
                          </div>
                          <span className="truncate text-[11px]">{item.shortLabel}</span>
                        </div>
                        <span 
                          className={`text-[9px] font-mono px-1 py-0.2 rounded border transition-colors ${
                            isSubActive ? 'border-transparent' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC]'
                          }`}
                          style={isSubActive ? {
                            backgroundColor: `${item.accent}30`,
                            color: item.accent
                          } : undefined}
                        >
                          {item.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Settings Nav Link */}
            <button
              onClick={() => {
                navigate('#/settings');
                onCloseMobile();
              }}
              className={`w-full group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                primary === 'settings'
                  ? 'bg-gradient-to-r from-[#00D6A0]/25 via-[#00D6A0]/15 to-transparent border-[#00D6A0]/60 text-white font-bold shadow-md shadow-black/20'
                  : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] hover:border-[#1B3A5C]/60'
              }`}
            >
              {primary === 'settings' && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#00D6A0] shadow-[0_0_8px_#00D6A0]" />
              )}
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                  primary === 'settings'
                    ? 'bg-[#00D6A0]/30 border-[#00D6A0]/60 text-[#00D6A0] shadow-[0_0_10px_#00D6A040]'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] group-hover:text-white group-hover:border-[#00D6A0]/50'
                }`}>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
                <span>{t.nav.settings}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  primary === 'settings' ? 'bg-[#00D6A0]/20 border-[#00D6A0]/40 text-[#00D6A0]' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC]'
                }`}>
                  Config
                </span>
                <ChevronRight className={`w-3 h-3 text-[#9EB2CC] transition-transform ${primary === 'settings' ? 'opacity-100 text-[#00D6A0]' : 'opacity-0 group-hover:opacity-100'}`} />
              </div>
            </button>
          </div>

          {/* AI Engineering Suite Section */}
          <div className="pt-2 border-t border-[#1B3A5C]/60 space-y-1.5">
            <div className="text-[10px] font-bold text-[#18D8F2] uppercase tracking-wider font-mono px-2 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#18D8F2]" />
                AI Engineering Suite
              </span>
              <span className="text-[9px] font-mono text-[#00D6A0] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
                Online
              </span>
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  openAiModal('audit');
                  onCloseMobile();
                }}
                className="w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#9EB2CC] hover:text-[#00D6A0] hover:bg-[#0B1C32] border border-transparent hover:border-[#00D6A0]/40 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-7 h-7 rounded-lg bg-[#00D6A0]/15 border border-[#00D6A0]/30 text-[#00D6A0] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">Code Audit (PUE 7.1)</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#061426] border border-[#00D6A0]/30 text-[#00D6A0]">
                  Inspect
                </span>
              </button>

              <button
                onClick={() => {
                  openAiModal('chat');
                  onCloseMobile();
                }}
                className="w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#9EB2CC] hover:text-[#18D8F2] hover:bg-[#0B1C32] border border-transparent hover:border-[#18D8F2]/40 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-7 h-7 rounded-lg bg-[#147DFF]/20 border border-[#147DFF]/40 text-[#18D8F2] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">AI Co-Pilot Advisor</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#061426] border border-[#18D8F2]/30 text-[#18D8F2]">
                  Live
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom Engineering Cert Badge */}
        <div className="p-3 border-t border-[#1B3A5C] bg-[#030B18]/70">
          <div className="p-2.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00D6A0]/15 border border-[#00D6A0]/30 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-[#00D6A0]" />
            </div>
            <div className="flex flex-col truncate">
              <span className="text-[11px] font-bold text-[#F4F8FF] truncate">Deterministic Engine</span>
              <span className="text-[9px] text-[#9EB2CC] font-mono">GOST 30331 & IEC 60364</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

/**
 * ShellInner: Main UI content rendered inside the HashRouter context
 */
const ShellInner: React.FC = () => {
  const { primary, tool, rawHash, navigate, navigateToTool } = useHashRoute();
  const { 
    activeModule, 
    setActiveModule,
    activeProject,
    saveStatus,
    triggerSave,
    isAiModalOpen, 
    aiModalTab, 
    openAiModal, 
    closeAiModal,
    isTemplatesModalOpen,
    closeTemplatesModal,
    downloadProjectPdf,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    t
  } = useProject();

  // Keep activeModule in sync with the current HashRouter state
  useEffect(() => {
    const targetModule = primary === 'tools' ? tool : primary;
    if (activeModule !== targetModule) {
      setActiveModule(targetModule);
    }
  }, [primary, tool, activeModule, setActiveModule]);

  // Keyboard shortcut listener (Cmd+J / Ctrl+J to toggle AI Co-Pilot)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (isAiModalOpen) {
          closeAiModal();
        } else {
          openAiModal('audit');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiModalOpen, openAiModal, closeAiModal]);

  const totalLoadKw = useMemo(() => {
    return (activeProject.cadCircuits || []).reduce((sum, c) => sum + (c.powerWatts || 0), 0) / 1000;
  }, [activeProject.cadCircuits]);

  const currentToolConfig = useMemo(() => {
    return TOOL_TABS.find(t => t.id === tool) || TOOL_TABS[0];
  }, [tool]);

  // Render sub-tool component when inside the Tools suite
  const renderToolComponent = (toolId: ToolRoute) => {
    switch (toolId) {
      case 'cad':
        return <ElectricalCAD />;
      case 'scanner':
        return <AIObjectScanner />;
      case 'panel':
        return <PanelBuilder />;
      case 'calculations':
        return <ElectricalCalculations />;
      case 'installation':
        return <InstallationMode />;
      case 'estimator':
        return <MaterialEstimator />;
      case 'compliance':
        return <ComplianceAuditor />;
      case 'templates':
        return <ProjectTemplates />;
      case 'reports':
        return <ReportsView />;
      default:
        return <ElectricalCAD />;
    }
  };

  return (
    <div className="min-h-screen bg-[#030B18] text-[#F4F8FF] flex flex-col relative select-none">
      {/* Persistent Top Application Header */}
      <TopHeader />

      {/* Main Container with Persistent Sidebar + Content Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Dark Navy Sidebar (Dashboard, Projects, Tools, Settings) */}
        <ShellSidebar 
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Content Canvas managed by HashRouter */}
        <main className="flex-1 overflow-y-auto bg-[#030B18] flex flex-col">
          {/* Breadcrumb & Navigation Switcher Bar */}
          <div className="bg-[#050E1B] border-b border-[#1B3A5C]/70 px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            {/* Left: Interactive Hash Breadcrumb Trail */}
            <div className="flex items-center gap-1.5 text-xs text-[#9EB2CC] font-mono">
              <span className="text-[#18D8F2] flex items-center gap-1 font-bold">
                <Compass className="w-3.5 h-3.5" />
                <span>ElectroVision</span>
              </span>
              <ChevronRight className="w-3 h-3 text-[#1B3A5C]" />

              {/* Primary Pillar Crumb */}
              {(() => {
                const activePillarObj = MAIN_PILLARS.find(p => p.id === primary);
                const PillarIcon = activePillarObj ? activePillarObj.icon : LayoutDashboard;
                return (
                  <button
                    onClick={() => navigate(formatRouteHash(primary))}
                    className="capitalize font-semibold text-[#F4F8FF] hover:text-[#18D8F2] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <PillarIcon className="w-3.5 h-3.5 text-[#18D8F2]" />
                    <span>{primary === 'tools' ? 'Tools' : primary}</span>
                  </button>
                );
              })()}

              {/* Sub-Tool Crumb (when inside Tools Suite) */}
              {primary === 'tools' && (
                <>
                  <ChevronRight className="w-3 h-3 text-[#1B3A5C]" />
                  <span className="text-[#00D6A0] font-bold flex items-center gap-1.5">
                    {(() => {
                      const SubIcon = currentToolConfig.icon;
                      return (
                        <>
                          <SubIcon className="w-3.5 h-3.5 text-[#00D6A0]" />
                          <span>{currentToolConfig.label}</span>
                        </>
                      );
                    })()}
                  </span>
                </>
              )}
            </div>

            {/* Center: 4-Pillar Lightweight View Switcher Tabs (Zero Reload) */}
            <nav className="flex items-center gap-1 bg-[#09182C] p-1 rounded-lg border border-[#1B3A5C]/60 shadow-inner" aria-label="Main View Switcher">
              {MAIN_PILLARS.map((pillar) => {
                const Icon = pillar.icon;
                const isSelected = primary === pillar.id;
                return (
                  <button
                    key={pillar.id}
                    onClick={() => navigate(pillar.hash)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/25 font-bold'
                        : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D]'
                    }`}
                    title={`Switch to ${pillar.label} view (${pillar.hash})`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{pillar.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right: Persistent Project Context Pill */}
            <div className="flex items-center gap-2 text-xs">
              <button 
                onClick={() => navigate('#/projects')}
                className="flex items-center gap-2 px-2.5 py-1 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg cursor-pointer transition-colors"
                title="Active workspace project (click to switch projects)"
              >
                <span className="w-2 h-2 rounded-full bg-[#00D6A0] animate-pulse" />
                <span className="font-semibold text-[#F4F8FF] truncate max-w-[120px] sm:max-w-[170px]">
                  {activeProject.name}
                </span>
                <span className="text-[#00D6A0] font-mono text-[11px] hidden md:inline">
                  {totalLoadKw.toFixed(1)} kW
                </span>
              </button>

              {/* Quick Save Trigger */}
              <button
                onClick={triggerSave}
                disabled={saveStatus === 'saving'}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  saveStatus === 'saved'
                    ? 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/40'
                    : 'bg-[#147DFF] text-white border-[#147DFF]/50 shadow-sm hover:bg-[#147DFF]/90'
                }`}
                title="Save workspace state to local/cloud storage"
              >
                {saveStatus === 'saved' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Saved</span>
                  </>
                ) : saveStatus === 'saving' ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Save</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sub-Header Context Bar: Displayed when inside Tools Suite */}
          {primary === 'tools' && (
            <div className="sticky top-0 z-30 bg-[#061426]/95 backdrop-blur-md border-b border-[#1B3A5C] px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md shadow-black/20">
              {/* Left Side: Horizontal Scrollable Tool Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
                {TOOL_TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = tool === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => navigateToTool(tab.id)}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border ${
                        isActive
                          ? 'text-white font-bold shadow-sm'
                          : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] hover:border-[#1B3A5C]/60'
                      }`}
                      style={isActive ? {
                        backgroundColor: `${tab.accent}20`,
                        borderColor: `${tab.accent}60`,
                        color: '#FFFFFF'
                      } : undefined}
                    >
                      <Icon 
                        className="w-3.5 h-3.5 shrink-0" 
                        style={isActive ? { color: tab.accent } : undefined} 
                      />
                      <span>{tab.shortLabel}</span>
                      <span 
                        className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                          isActive ? 'border-transparent' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC]'
                        }`}
                        style={isActive ? {
                          backgroundColor: `${tab.accent}30`,
                          color: tab.accent
                        } : undefined}
                      >
                        {tab.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right Side: Quick Action Strip */}
              <div className="flex items-center gap-2 shrink-0 ml-auto text-xs">
                {/* Quick AI Audit Trigger */}
                <button
                  onClick={() => openAiModal('audit')}
                  className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#10243D] hover:bg-[#147DFF]/20 text-[#18D8F2] border border-[#18D8F2]/40 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  title="Run automated PUE 7.1 / IEC 60364 compliance audit"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00D6A0]" />
                  <span>Audit</span>
                </button>

                {/* Quick Export PDF Trigger */}
                <button
                  onClick={downloadProjectPdf}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#10243D] hover:bg-[#147DFF]/20 text-[#9EB2CC] hover:text-white border border-[#1B3A5C] rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  title="Generate stamped engineering PDF report"
                >
                  <Download className="w-3.5 h-3.5 text-[#EC4899]" />
                  <span>PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* Module Content Area - Rendered Declaratively via HashRoute */}
          <div className="p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full flex-1">
            <HashRoute path="dashboard" component={<Dashboard />} />
            <HashRoute path="projects" component={<ProjectsView />} />
            <HashRoute path="tools" component={renderToolComponent(tool)} />
            <HashRoute path="settings" component={<SettingsView />} />
          </div>
        </main>
      </div>

      {/* Global Floating AI Co-Pilot Trigger Badge */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex items-center gap-2">
        <button
          onClick={() => openAiModal('chat')}
          className="group flex items-center gap-2.5 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-[#10243D] to-[#0B1C32] hover:from-[#147DFF] hover:to-[#18D8F2] text-[#F4F8FF] hover:text-[#030B18] border border-[#147DFF]/40 rounded-full shadow-2xl shadow-[#147DFF]/25 hover:shadow-[#18D8F2]/40 transition-all duration-300 cursor-pointer font-bold text-xs hover:scale-105"
          title="Open AI Engineering Co-Pilot (Ctrl+J / ⌘J)"
        >
          <div className="w-5 h-5 rounded-full bg-[#18D8F2]/20 group-hover:bg-[#030B18]/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-[#18D8F2] group-hover:text-[#030B18]" />
          </div>
          <span className="hidden xs:inline sm:inline">AI Co-Pilot</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#061426]/70 group-hover:bg-[#030B18]/30 text-[#18D8F2] group-hover:text-[#030B18] border border-white/10">
            ⌘J
          </span>
        </button>
      </div>

      {/* AI Engineering Co-Pilot Suite Modal */}
      <AiCopilotModal
        isOpen={isAiModalOpen}
        onClose={closeAiModal}
        defaultTab={aiModalTab}
      />

      {/* Global Project Templates & Presets Modal */}
      {isTemplatesModalOpen && (
        <Modal
          isOpen={isTemplatesModalOpen}
          onClose={closeTemplatesModal}
          title="Circuit Presets & Engineering Templates"
          maxWidth="max-w-6xl"
        >
          <ProjectTemplates isModalView onClose={closeTemplatesModal} />
        </Modal>
      )}
    </div>
  );
};

/**
 * Shell: Root Application Frame wrapping the HashRouter view management system
 */
export const Shell: React.FC = () => {
  return (
    <HashRouter initialTarget="#/dashboard">
      <ShellInner />
    </HashRouter>
  );
};

export default Shell;
