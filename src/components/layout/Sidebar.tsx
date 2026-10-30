import React, { useState } from 'react';
import { 
  FolderKanban, 
  Bookmark,
  FileText,
  Settings,
  ChevronRight,
  ChevronDown,
  Zap,
  X,
  ShieldCheck,
  Activity,
  CheckCheck,
  Layers,
  LayoutDashboard,
  Wrench,
  Plus,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { SidebarNav } from './SidebarNav';

export const Sidebar: React.FC = () => {
  const { 
    activeModule, 
    setActiveModule, 
    t, 
    projects,
    activeProject, 
    isMobileMenuOpen, 
    setIsMobileMenuOpen,
    openAiModal,
    saveStatus
  } = useProject();

  const [isToolsExpanded, setIsToolsExpanded] = useState(true);

  // Checks for primary module categories
  const isDashboardActive = activeModule === 'dashboard';
  const isProjectsActive = activeModule === 'projects' || activeModule === 'saved';
  const isToolsActive = ['cad', 'scanner', 'panel', 'calculations', 'installation', 'estimator', 'compliance', 'templates', 'reports'].includes(activeModule);
  const isSettingsActive = activeModule === 'settings';

  const totalLoadKw = (activeProject.cadCircuits || []).reduce((sum, c) => sum + (c.powerWatts || 0), 0) / 1000;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Sidebar (Fixed on mobile, static on desktop) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-68 bg-[#061426] border-r border-[#1B3A5C] flex flex-col justify-between shrink-0 select-none transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Top Section */}
        <div className="p-3.5 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Mobile Close Bar */}
          <div className="flex items-center justify-between lg:hidden pb-1 border-b border-[#1B3A5C]">
            <span className="text-xs font-bold text-[#F4F8FF] font-mono flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#18D8F2]" /> ElectroVision PRO
            </span>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1 text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] rounded transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4 text-[#18D8F2]" />
            </button>
          </div>

          {/* Persistent Active Project Context Card */}
          <div className="p-3 bg-gradient-to-b from-[#0B1C32] to-[#071526] border border-[#1B3A5C] rounded-xl flex flex-col gap-2 shadow-md shadow-black/20">
            <div className="flex items-center justify-between text-[11px] text-[#9EB2CC]">
              <span className="uppercase font-mono tracking-wider font-semibold flex items-center gap-1.5 text-[#00D6A0]">
                <span className="w-2 h-2 rounded-full bg-[#00D6A0] animate-pulse" />
                Current Project
              </span>
              <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded border ${
                saveStatus === 'saving'
                  ? 'bg-[#FF9A24]/15 text-[#FF9A24] border-[#FF9A24]/30'
                  : 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30'
              }`}>
                {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            </div>

            <div className="text-xs font-bold text-[#F4F8FF] truncate" title={activeProject.name}>
              {activeProject.name}
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono py-1 border-y border-[#1B3A5C]/50">
              <div className="flex flex-col">
                <span className="text-[#9EB2CC] text-[9px]">ACTIVE LOAD</span>
                <span className="text-[#00D6A0] font-bold">{totalLoadKw.toFixed(1)} kW</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[#9EB2CC] text-[9px]">CAD CIRCUITS</span>
                <span className="text-[#18D8F2] font-bold">{activeProject.cadCircuits.length} Groups</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-[10px]">
              <span className="font-mono text-[#9EB2CC] truncate text-[9px]">
                {activeProject.standard}
              </span>
              <button
                onClick={() => {
                  setActiveModule('projects');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-1 text-[10px] font-semibold text-[#18D8F2] hover:text-white transition-colors cursor-pointer"
                title="Switch or manage projects"
              >
                <FolderOpen className="w-3 h-3" />
                <span>Switch</span>
              </button>
            </div>
          </div>

          {/* Primary 4 Main Application Modules Navigation */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold text-[#9EB2CC] uppercase tracking-wider font-mono">
              Main Navigation
            </div>

            {/* 1. Dashboard */}
            <button
              onClick={() => {
                setActiveModule('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isDashboardActive
                  ? 'bg-gradient-to-r from-[#147DFF]/25 via-[#147DFF]/15 to-transparent border-[#147DFF]/60 text-white font-bold shadow-md shadow-black/20'
                  : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] hover:border-[#1B3A5C]/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  isDashboardActive
                    ? 'bg-[#147DFF]/30 border-[#147DFF]/60 text-[#147DFF]'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] group-hover:text-white'
                }`}>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                </div>
                <span>{t.nav.dashboard}</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                isDashboardActive ? 'bg-[#147DFF]/20 border-[#147DFF]/40 text-[#147DFF]' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC]'
              }`}>
                HQ
              </span>
            </button>

            {/* 2. Projects */}
            <button
              onClick={() => {
                setActiveModule('projects');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isProjectsActive
                  ? 'bg-gradient-to-r from-[#147DFF]/25 via-[#147DFF]/15 to-transparent border-[#147DFF]/60 text-white font-bold shadow-md shadow-black/20'
                  : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] hover:border-[#1B3A5C]/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  isProjectsActive
                    ? 'bg-[#147DFF]/30 border-[#147DFF]/60 text-[#147DFF]'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] group-hover:text-white'
                }`}>
                  <FolderKanban className="w-3.5 h-3.5" />
                </div>
                <span>{t.nav.projects}</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                isProjectsActive ? 'bg-[#147DFF]/20 border-[#147DFF]/40 text-[#147DFF]' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC]'
              }`}>
                {projects.length}
              </span>
            </button>

            {/* 3. Tools (Expandable Section) */}
            <div className="pt-1">
              <button
                onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isToolsActive
                    ? 'bg-[#10243D] border-[#18D8F2]/40 text-white font-bold shadow-sm'
                    : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                    isToolsActive
                      ? 'bg-[#18D8F2]/20 border-[#18D8F2]/40 text-[#18D8F2]'
                      : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] group-hover:text-[#18D8F2]'
                  }`}>
                    <Wrench className="w-3.5 h-3.5" />
                  </div>
                  <span>{t.nav.tools}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#061426] border border-[#1B3A5C] text-[#18D8F2]">
                    9 Tools
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#9EB2CC] transition-transform ${isToolsExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Collapsible Tools Suite */}
              {isToolsExpanded && (
                <div className="pl-1 pt-1.5 pb-1">
                  <SidebarNav onItemClick={() => setIsMobileMenuOpen(false)} />
                </div>
              )}
            </div>

            {/* 4. Settings */}
            <button
              onClick={() => {
                setActiveModule('settings');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isSettingsActive
                  ? 'bg-gradient-to-r from-[#147DFF]/25 via-[#147DFF]/15 to-transparent border-[#147DFF]/60 text-white font-bold shadow-md shadow-black/20'
                  : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] hover:border-[#1B3A5C]/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  isSettingsActive
                    ? 'bg-[#147DFF]/30 border-[#147DFF]/60 text-[#147DFF]'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] group-hover:text-white'
                }`}>
                  <Settings className="w-3.5 h-3.5" />
                </div>
                <span>{t.nav.settings}</span>
              </div>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                isSettingsActive ? 'bg-[#147DFF]/20 border-[#147DFF]/40 text-[#147DFF]' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC]'
              }`}>
                Config
              </span>
            </button>
          </div>

          {/* AI Engineering Suite Section */}
          <div className="pt-2 border-t border-[#1B3A5C]/60 space-y-1.5">
            <div className="text-[10px] font-bold text-[#18D8F2] uppercase tracking-wider font-mono px-2 mb-1 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-[#18D8F2]" />
              AI Engineering Suite
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => {
                  openAiModal('audit');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#9EB2CC] hover:text-[#00D6A0] hover:bg-[#0B1C32] border border-transparent hover:border-[#00D6A0]/40 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-7 h-7 rounded-lg bg-[#00D6A0]/15 border border-[#00D6A0]/30 text-[#00D6A0] flex items-center justify-center shrink-0">
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
                  setIsMobileMenuOpen(false);
                }}
                className="w-full group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#9EB2CC] hover:text-[#18D8F2] hover:bg-[#0B1C32] border border-transparent hover:border-[#18D8F2]/40 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-7 h-7 rounded-lg bg-[#147DFF]/20 border border-[#147DFF]/40 text-[#18D8F2] flex items-center justify-center shrink-0">
                    <Activity className="w-3.5 h-3.5" />
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
