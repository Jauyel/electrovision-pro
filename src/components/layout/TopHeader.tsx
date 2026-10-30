import React, { useState } from 'react';
import { 
  Zap, 
  Search, 
  MapPin, 
  Globe, 
  Bell, 
  Save, 
  Check, 
  ChevronDown, 
  Plus,
  User, 
  ShieldCheck, 
  DollarSign,
  Menu,
  X,
  CreditCard,
  LogOut,
  Sparkles,
  Moon,
  Sun,
  Palette,
  LayoutDashboard,
  FolderKanban,
  Wrench,
  Settings as SettingsIcon,
  Cpu,
  Box,
  Server,
  Calculator,
  CheckCheck,
  Layers,
  FileText
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Language, Currency } from '../../types';
import { Modal } from '../common/Modal';
import { ProjectSelector } from './ProjectSelector';

export const TopHeader: React.FC = () => {
  const {
    language,
    setLanguage,
    currency,
    setCurrency,
    t,
    projects,
    activeProject,
    setActiveProjectId,
    createNewProject,
    saveStatus,
    triggerSave,
    notifications,
    markAllNotificationsRead,
    searchQuery,
    setSearchQuery,
    activeModule,
    setActiveModule,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    addActivityLog,
    openAiModal,
    downloadProjectPdf
  } = useProject();

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<'deep-navy' | 'cyber-neon' | 'oled-dark'>('deep-navy');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isToolsDropdownOpen, setIsToolsDropdownOpen] = useState(false);

  // New project form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');

  // Close tools dropdown on outside click
  React.useEffect(() => {
    const handleOutside = () => setIsToolsDropdownOpen(false);
    if (isToolsDropdownOpen) {
      window.addEventListener('click', handleOutside);
    }
    return () => window.removeEventListener('click', handleOutside);
  }, [isToolsDropdownOpen]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createNewProject(newProjectName, newProjectLocation);
    addActivityLog({
      action: 'Created Project',
      details: `Initialized new project "${newProjectName}" (${newProjectLocation || 'Tashkent, Uzbekistan'})`,
      category: 'project',
      status: 'completed',
      user: 'Olimjon K.',
      moduleTarget: 'scanner'
    });
    setNewProjectName('');
    setNewProjectLocation('');
    setIsNewProjectModalOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Active module checks
  const isToolsActive = ['cad', 'scanner', 'installation', 'panel', 'calculations', 'estimator', 'compliance', 'templates', 'reports'].includes(activeModule);
  const isProjectsActive = activeModule === 'projects' || activeModule === 'saved';
  const isDashboardActive = activeModule === 'dashboard';
  const isSettingsActive = activeModule === 'settings';

  const totalProjectKw = (activeProject.cadCircuits || []).reduce((sum, c) => sum + (c.powerWatts || 0), 0) / 1000;

  const TOOL_ITEMS = [
    { id: 'cad', label: 'Electrical CAD & SLD', icon: Cpu, badge: 'CAD' },
    { id: 'scanner', label: '3D Room Scanner', icon: Box, badge: '3D' },
    { id: 'panel', label: 'Smart Panel Builder 3D', icon: Server, badge: 'DIN' },
    { id: 'calculations', label: 'Cable & Sizing Calculators', icon: Calculator, badge: 'PUE' },
    { id: 'installation', label: 'AR Installation Mode', icon: Wrench, badge: 'AR' },
    { id: 'estimator', label: 'Material Estimator BOM', icon: Calculator, badge: 'BOM' },
    { id: 'compliance', label: 'Compliance Auditor', icon: CheckCheck, badge: 'Audit' },
    { id: 'templates', label: 'Circuit Presets', icon: Layers, badge: 'Preset' },
    { id: 'reports', label: 'Engineering Reports PDF', icon: FileText, badge: 'PDF' },
  ];

  return (
    <>
      <header className="h-16 bg-[#061426] border-b border-[#1B3A5C] px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-4 sticky top-0 z-40 select-none">
        {/* Zone 1: Brand Wordmark & Mobile Nav Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] rounded-lg transition-colors border border-[#1B3A5C]"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-[#18D8F2]" /> : <Menu className="w-5 h-5 text-[#18D8F2]" />}
          </button>

          <div 
            onClick={() => setActiveModule('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#147DFF] to-[#18D8F2] p-0.5 shadow-lg shadow-[#147DFF]/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#030B18] rounded-[7px] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#18D8F2] fill-[#18D8F2]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-[#F4F8FF] leading-tight flex items-center gap-1.5">
                ElectroVision <span className="text-[#18D8F2] text-xs font-black tracking-widest px-1 py-0.2 bg-[#10243D] border border-[#18D8F2]/30 rounded">PRO</span>
              </span>
              <span className="text-[10px] text-[#9EB2CC] tracking-wider uppercase font-mono hidden xl:inline">
                {t.appTagline}
              </span>
            </div>
          </div>
        </div>

        {/* Zone 2: Persistent 4 Main Modules Navigation Bar & Project Context */}
        <div className="hidden md:flex items-center gap-3 flex-1 justify-center max-w-4xl">
          {/* Main 4 Modules Switcher Bar */}
          <nav className="flex items-center gap-1 bg-[#030B18]/90 p-1 rounded-xl border border-[#1B3A5C] shadow-inner" aria-label="Main App Navigation">
            {/* 1. Dashboard */}
            <button
              onClick={() => setActiveModule('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isDashboardActive
                  ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30 font-bold'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t.nav.dashboard}</span>
            </button>

            {/* 2. Projects */}
            <button
              onClick={() => setActiveModule('projects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isProjectsActive
                  ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30 font-bold'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>{t.nav.projects}</span>
              <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                isProjectsActive ? 'bg-white/20 text-white font-bold' : 'bg-[#061426] text-[#9EB2CC] border border-[#1B3A5C]'
              }`}>
                {projects.length}
              </span>
            </button>

            {/* 3. Tools (CAD, 3D Room, Panel, Calculations, etc.) */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center">
                <button
                  onClick={() => {
                    if (!isToolsActive) setActiveModule('cad');
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-l-lg text-xs font-semibold transition-all cursor-pointer ${
                    isToolsActive
                      ? 'bg-gradient-to-r from-[#147DFF] to-[#18D8F2] text-[#030B18] font-bold shadow-md shadow-[#18D8F2]/20'
                      : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
                  }`}
                  title="Switch to Engineering Tools Suite"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{t.nav.tools}</span>
                  {isToolsActive && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#030B18]/30 text-[#030B18] font-black uppercase">
                      {activeModule === 'calculations' ? 'CALC' : activeModule.slice(0, 5)}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setIsToolsDropdownOpen(!isToolsDropdownOpen)}
                  className={`px-1.5 py-1.5 rounded-r-lg border-l border-black/20 text-xs transition-all cursor-pointer ${
                    isToolsActive
                      ? 'bg-[#18D8F2] text-[#030B18] hover:bg-white'
                      : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
                  }`}
                  title="Open tools menu"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${isToolsDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Tools Dropdown Flyout */}
              {isToolsDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl shadow-2xl p-1.5 z-50 animate-fade-in divide-y divide-[#1B3A5C]/50">
                  <div className="px-2 py-1 text-[10px] font-bold text-[#18D8F2] uppercase font-mono tracking-wider flex items-center justify-between">
                    <span>Engineering Suite</span>
                    <span className="text-[#00D6A0]">9 Tools</span>
                  </div>
                  <div className="py-1 space-y-0.5">
                    {TOOL_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = activeModule === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveModule(item.id as any);
                            setIsToolsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isItemActive
                              ? 'bg-[#147DFF]/20 text-[#18D8F2] font-bold border border-[#147DFF]/40'
                              : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className="w-3.5 h-3.5 shrink-0 text-[#18D8F2]" />
                            <span className="truncate">{item.label}</span>
                          </div>
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#061426] text-[#9EB2CC] border border-[#1B3A5C]">
                            {item.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. Settings */}
            <button
              onClick={() => setActiveModule('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                isSettingsActive
                  ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30 font-bold'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>{t.nav.settings}</span>
            </button>
          </nav>

          {/* Persistent Project Context & Quick Switcher */}
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[#1B3A5C]/80">
            <ProjectSelector onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)} />

            {/* Quick Live Context Metrics Pill */}
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 bg-[#030B18]/70 border border-[#1B3A5C] rounded-lg text-xs font-mono">
              <span className="flex items-center gap-1 text-[#00D6A0] font-semibold" title="Total Connected Active Load">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
                {totalProjectKw.toFixed(1)} kW
              </span>
              <span className="text-[#1B3A5C]">|</span>
              <span className="text-[#18D8F2]" title="Total CAD Circuits">{activeProject.cadCircuits.length} Ckts</span>
              <span className="text-[#1B3A5C]">|</span>
              <span className="text-[#9EB2CC] text-[10px]" title="Regional Standard">{activeProject.standard}</span>
            </div>
          </div>
        </div>

        {/* Zone 3: Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Search Trigger */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-xs text-[#9EB2CC] hover:text-[#F4F8FF] transition-colors cursor-pointer"
            title="Search Circuits, Components, and Documents (Ctrl+K / ⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-[#18D8F2]" />
            <kbd className="text-[10px] font-mono bg-[#061426] px-1 py-0.2 rounded border border-[#1B3A5C] text-[#9EB2CC]">
              ⌘K
            </kbd>
          </button>

          {/* Currency Toggle */}
          <button
            onClick={() => setCurrency(currency === 'UZS' ? 'USD' : 'UZS')}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-xs font-mono font-medium text-[#F4F8FF] transition-colors"
            title="Switch Currency (UZS / USD)"
          >
            <DollarSign className="w-3.5 h-3.5 text-[#00D6A0]" />
            <span>{currency}</span>
          </button>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-xs font-medium text-[#F4F8FF] transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-[#18D8F2]" />
              <span className="uppercase font-mono">{language}</span>
              <ChevronDown className="w-3 h-3 text-[#9EB2CC]" />
            </button>

            {isLangDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-36 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl shadow-2xl p-1 z-50 animate-fade-in">
                <button
                  onClick={() => { setLanguage('uz'); setIsLangDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    language === 'uz' ? 'bg-[#147DFF]/20 text-[#18D8F2] font-bold' : 'text-[#F4F8FF] hover:bg-[#10243D]'
                  }`}
                >
                  <span>O'zbekcha</span>
                  {language === 'uz' && <Check className="w-3 h-3 text-[#18D8F2]" />}
                </button>
                <button
                  onClick={() => { setLanguage('ru'); setIsLangDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    language === 'ru' ? 'bg-[#147DFF]/20 text-[#18D8F2] font-bold' : 'text-[#F4F8FF] hover:bg-[#10243D]'
                  }`}
                >
                  <span>Русский</span>
                  {language === 'ru' && <Check className="w-3 h-3 text-[#18D8F2]" />}
                </button>
                <button
                  onClick={() => { setLanguage('en'); setIsLangDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    language === 'en' ? 'bg-[#147DFF]/20 text-[#18D8F2] font-bold' : 'text-[#F4F8FF] hover:bg-[#10243D]'
                  }`}
                >
                  <span>English</span>
                  {language === 'en' && <Check className="w-3 h-3 text-[#18D8F2]" />}
                </button>
              </div>
            )}
          </div>

          {/* Theme Control */}
          <div className="relative">
            <button
              onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-xs font-medium text-[#F4F8FF] transition-colors"
              title="Theme Mode"
            >
              <Palette className="w-3.5 h-3.5 text-[#8B5CFF]" />
              <span className="hidden md:inline font-mono text-[11px]">
                {themeMode === 'deep-navy' ? 'Navy' : themeMode === 'cyber-neon' ? 'Neon' : 'OLED'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#9EB2CC]" />
            </button>

            {isThemeDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-44 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl shadow-2xl p-1 z-50 animate-fade-in">
                <button
                  onClick={() => { setThemeMode('deep-navy'); setIsThemeDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    themeMode === 'deep-navy' ? 'bg-[#147DFF]/20 text-[#18D8F2] font-bold' : 'text-[#F4F8FF] hover:bg-[#10243D]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#030B18] border border-[#147DFF]" />
                    <span>Deep Navy Pro</span>
                  </div>
                  {themeMode === 'deep-navy' && <Check className="w-3 h-3 text-[#18D8F2]" />}
                </button>
                <button
                  onClick={() => { setThemeMode('cyber-neon'); setIsThemeDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    themeMode === 'cyber-neon' ? 'bg-[#147DFF]/20 text-[#18D8F2] font-bold' : 'text-[#F4F8FF] hover:bg-[#10243D]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#18D8F2] shadow-sm shadow-[#18D8F2]" />
                    <span>Cyber Neon Glow</span>
                  </div>
                  {themeMode === 'cyber-neon' && <Check className="w-3 h-3 text-[#18D8F2]" />}
                </button>
                <button
                  onClick={() => { setThemeMode('oled-dark'); setIsThemeDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between ${
                    themeMode === 'oled-dark' ? 'bg-[#147DFF]/20 text-[#18D8F2] font-bold' : 'text-[#F4F8FF] hover:bg-[#10243D]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-black border border-[#1B3A5C]" />
                    <span>Pure CAD OLED</span>
                  </div>
                  {themeMode === 'oled-dark' && <Check className="w-3 h-3 text-[#18D8F2]" />}
                </button>
              </div>
            )}
          </div>

          {/* AI Co-Pilot Suite Launcher */}
          <button
            onClick={() => openAiModal('audit')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#147DFF]/20 via-[#18D8F2]/25 to-[#147DFF]/20 hover:from-[#147DFF]/35 hover:to-[#18D8F2]/35 text-[#18D8F2] border border-[#18D8F2]/50 hover:border-[#18D8F2] rounded-lg text-xs font-bold shadow-md shadow-[#18D8F2]/10 transition-all hover:scale-105 cursor-pointer"
            title="Open AI Engineering Suite: Compliance Audit, Vision Scan, Project Generator, and Co-Pilot"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#18D8F2] animate-pulse" />
            <span className="hidden sm:inline">AI Co-Pilot</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#030B18] text-[#00D6A0] border border-[#00D6A0]/40 font-black">
              PUE 7.1
            </span>
          </button>

          {/* Save Status / Button */}
          <button
            onClick={triggerSave}
            disabled={saveStatus === 'saving'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              saveStatus === 'saved'
                ? 'bg-[#00D6A0]/20 text-[#00D6A0] border border-[#00D6A0]/40'
                : 'bg-[#147DFF] hover:bg-[#147DFF]/85 text-white shadow-md shadow-[#147DFF]/25'
            }`}
          >
            {saveStatus === 'saved' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t.saved}</span>
              </>
            ) : saveStatus === 'saving' ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t.saving}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{t.save}</span>
              </>
            )}
          </button>

          {/* Notifications Flyout */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-[#9EB2CC] hover:text-[#F4F8FF] transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF9A24] text-[#030B18] font-bold text-[9px] rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl shadow-2xl p-3 z-50 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-[#1B3A5C]">
                  <span className="text-xs font-bold text-[#F4F8FF]">Engineering Notifications</span>
                  <button 
                    onClick={markAllNotificationsRead}
                    className="text-[10px] text-[#18D8F2] hover:underline"
                  >
                    Mark read
                  </button>
                </div>
                <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
                  {notifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`p-2 rounded-lg text-xs ${n.read ? 'bg-[#061426]/60 text-[#9EB2CC]' : 'bg-[#10243D] text-[#F4F8FF] border border-[#147DFF]/30'}`}
                    >
                      <p className="font-medium text-[11px]">{n.title}</p>
                      <span className="text-[9px] text-[#9EB2CC]">{n.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile Search Button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="lg:hidden p-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-[#9EB2CC] hover:text-[#18D8F2] transition-colors"
            title="Search"
          >
            <Search className="w-4 h-4 text-[#18D8F2]" />
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 pl-2 border-l border-[#1B3A5C] text-left hover:opacity-90 transition-opacity cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#147DFF] to-[#8B5CFF] p-0.5 flex items-center justify-center">
                <div className="w-full h-full bg-[#061426] rounded-full flex items-center justify-center text-[11px] font-bold text-[#F4F8FF]">
                  OK
                </div>
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-[#F4F8FF] leading-tight">Olimjon Khashimov</span>
                <span className="text-[10px] text-[#00D6A0] font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-[#00D6A0]" /> Lead PE · Enterprise
                </span>
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute top-full right-0 mt-2 w-72 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl shadow-2xl p-4 z-50 animate-fade-in space-y-3">
                <div className="flex items-center gap-3 pb-3 border-b border-[#1B3A5C]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#147DFF] to-[#8B5CFF] p-0.5 flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-[#061426] rounded-full flex items-center justify-center text-xs font-bold text-[#F4F8FF]">
                      OK
                    </div>
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-[#F4F8FF] truncate">Olimjon Khashimov</h4>
                    <p className="text-[10px] text-[#9EB2CC] font-mono truncate">olimjonkhashimov@gmail.com</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="px-1.5 py-0.2 bg-[#00D6A0]/15 text-[#00D6A0] text-[9px] font-mono rounded border border-[#00D6A0]/30 font-bold">
                        PRO Enterprise
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#9EB2CC]">Role:</span>
                    <span className="font-semibold text-[#F4F8FF]">Chief Electrical Engineer</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#9EB2CC]">License:</span>
                    <span className="font-mono text-[#F4F8FF]">PE-UZ-2024-8841</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#9EB2CC]">Standards:</span>
                    <span className="font-mono text-[#18D8F2]">IEC 60364 / GOST</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#9EB2CC]">Storage:</span>
                    <span className="font-mono text-[#00D6A0]">Encrypted Cloud Sync</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1B3A5C] flex flex-col gap-1">
                  <button
                    onClick={() => {
                      setActiveModule('settings');
                      setIsProfileOpen(false);
                    }}
                    className="w-full py-1.5 px-3 bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between"
                  >
                    <span>Account Settings</span>
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-[#9EB2CC]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* New Project Modal */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Initialize New Electrical Project"
        subtitle="Create an integrated workspace with room geometry, distribution panel, and material take-off."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Project Name</label>
            <input
              type="text"
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Tashkent Mirabad Avenue Villa 12"
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:outline-none focus:border-[#147DFF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Location / City</label>
            <input
              type="text"
              value={newProjectLocation}
              onChange={(e) => setNewProjectLocation(e.target.value)}
              placeholder="e.g. Mirabad District, Tashkent, Uzbekistan"
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:outline-none focus:border-[#147DFF]"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#1B3A5C]">
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[#9EB2CC] hover:text-[#F4F8FF] bg-[#061426] hover:bg-[#10243D] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#147DFF] hover:bg-[#147DFF]/90 rounded-lg shadow-md shadow-[#147DFF]/30 transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Quick Search Modal */}
      <Modal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        title="Quick Navigator & Specification Search"
        subtitle="Search across electrical circuits, panel devices, cable runs, and engineering calculations."
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#18D8F2] absolute left-3 top-2.5" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search e.g. QF1, VVGng, Socket, Schneider, 3x2.5..."
              className="w-full pl-9 pr-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:outline-none focus:border-[#18D8F2]"
            />
          </div>

          <div className="text-[11px] font-semibold text-[#9EB2CC] pt-2">Direct Module Jump</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'scanner', name: 'AI Room Scanner 3D', desc: 'Walls & Electrical Points' },
              { id: 'installation', name: 'AI Installation Mode', desc: 'Cable Routes & AR View' },
              { id: 'panel', name: 'Smart Panel Builder 3D', desc: 'DIN-Rail Enclosures' },
              { id: 'cad', name: 'Electrical CAD & Load', desc: 'Circuits & Voltage Drop' },
              { id: 'estimator', name: 'AI Material Estimator', desc: 'BOM & Cost Breakdown' },
              { id: 'reports', name: 'Engineering Reports', desc: 'Printable Certificate' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setActiveModule(m.id);
                  setIsSearchModalOpen(false);
                }}
                className="p-2.5 text-left bg-[#061426] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-xs transition-colors"
              >
                <div className="font-bold text-[#F4F8FF]">{m.name}</div>
                <div className="text-[10px] text-[#9EB2CC]">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};
