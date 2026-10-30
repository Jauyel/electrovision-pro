import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Globe, 
  DollarSign, 
  User, 
  Check, 
  Save, 
  Building,
  Palette,
  Bell,
  Sun,
  Moon,
  Zap,
  Volume2,
  VolumeX,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sparkles,
  Layers,
  Cpu
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Language, Currency } from '../../types';

export const SettingsView: React.FC = () => {
  const { 
    activeProject, 
    updateActiveProject, 
    language, 
    setLanguage, 
    currency, 
    setCurrency, 
    triggerSave, 
    saveStatus,
    addActivityLog,
    t
  } = useProject();

  // Local settings state
  const [selectedTheme, setSelectedTheme] = useState<'deep-navy' | 'cyber-neon' | 'oled-dark'>('deep-navy');
  const [enableBlueprintGrid, setEnableBlueprintGrid] = useState(true);
  const [enableGlowEffects, setEnableGlowEffects] = useState(true);
  const [compactDensity, setCompactDensity] = useState(false);

  // Notification toggles state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifVoltageDrop, setNotifVoltageDrop] = useState(true);
  const [notifPhaseImbalance, setNotifPhaseImbalance] = useState(true);
  const [notifEnclosureCapacity, setNotifEnclosureCapacity] = useState(true);
  const [notifBomFluctuation, setNotifBomFluctuation] = useState(false);
  const [notifAutoBackup, setNotifAutoBackup] = useState(true);
  const [audioChimes, setAudioChimes] = useState(true);

  // Save feedback state
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  const handleUpdateSetting = (field: string, val: any) => {
    updateActiveProject(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleSaveAllSettings = () => {
    triggerSave();
    addActivityLog({
      action: 'Updated Settings',
      details: `Language: ${language.toUpperCase()}, Theme: ${selectedTheme}, Standards: ${activeProject.standard}`,
      category: 'project',
      status: 'completed',
      user: activeProject.leadEngineer || 'Olimjon K.'
    });
    setShowSavedFeedback(true);
    setTimeout(() => setShowSavedFeedback(false), 3000);
  };

  const languages: { id: Language; name: string; nativeName: string; flag: string; sample: string }[] = [
    { 
      id: 'uz', 
      name: 'Uzbek', 
      nativeName: "O'zbekcha", 
      flag: '🇺🇿', 
      sample: 'Xona Skanneri 3D · Qalqon Quruvchi · Quvvat Tahlili' 
    },
    { 
      id: 'ru', 
      name: 'Russian', 
      nativeName: 'Русский', 
      flag: '🇷🇺', 
      sample: '3D Сканер помещений · Щитовая 3D · Расчет нагрузок' 
    },
    { 
      id: 'en', 
      name: 'English', 
      nativeName: 'English (US/UK)', 
      flag: '🇺🇸', 
      sample: 'AI Room Scanner 3D · Smart Panel · Power Flow Analysis' 
    }
  ];

  const themes = [
    {
      id: 'deep-navy',
      name: 'Deep Navy Pro',
      tag: 'Default SaaS Engineering',
      desc: 'Balanced dark navy (#030B18) with electric-blue & cyan HUD accents. Recommended for all-day CAD drafting.',
      accent: '#147DFF',
      bgPreview: 'from-[#030B18] to-[#0B1C32]',
      borderPreview: '#1B3A5C'
    },
    {
      id: 'cyber-neon',
      name: 'Cyber Neon Glow',
      tag: 'Amplified Photometrics',
      desc: 'High-contrast luminescent cyan (#18D8F2) & purple (#8B5CFF) circuits. Maximizes route visibility in dark spaces.',
      accent: '#18D8F2',
      bgPreview: 'from-[#020813] to-[#081830]',
      borderPreview: '#18D8F2'
    },
    {
      id: 'oled-dark',
      name: 'Pure CAD OLED',
      tag: 'Ultra High Contrast',
      desc: 'True pitch black (#000000) canvas with surgical white & cyan lines. Zero glare and zero eye-strain.',
      accent: '#00D6A0',
      bgPreview: 'from-[#000000] to-[#050D1A]',
      borderPreview: '#25456A'
    }
  ];

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-[#061426] via-[#0B1C32] to-[#061426] border border-[#1B3A5C] rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#18D8F2] uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Platform Configuration</span>
          </div>
          <div className="flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-[#147DFF]" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#F4F8FF] tracking-tight">
              Engineering Workspace Settings
            </h1>
          </div>
          <p className="text-xs text-[#9EB2CC] max-w-2xl leading-relaxed">
            Customize multilingual localization, high-contrast dark themes, telemetry alarm limits, and electrical standards compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {showSavedFeedback && (
            <span className="text-xs font-mono text-[#00D6A0] flex items-center gap-1.5 animate-pulse bg-[#00D6A0]/10 px-3 py-1.5 rounded-lg border border-[#00D6A0]/30">
              <CheckCircle2 className="w-4 h-4" />
              Settings Applied!
            </span>
          )}
          <button
            onClick={handleSaveAllSettings}
            disabled={saveStatus === 'saving'}
            className="px-5 py-2.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#147DFF]/25 transition-all self-start sm:self-auto cursor-pointer"
          >
            {saveStatus === 'saving' ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Settings Sections */}
      <div className="grid grid-cols-1 gap-6">

        {/* 1. Language Preferences */}
        <section className="p-6 bg-[#0B1C32]/85 backdrop-blur-xl border border-[#1B3A5C] rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#18D8F2]/15 border border-[#18D8F2]/30 flex items-center justify-center text-[#18D8F2]">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F4F8FF]">Language Preferences (Til Sozlamalari / Язык)</h2>
                <p className="text-[11px] text-[#9EB2CC]">Select the active language for technical terminology, menus, tooltips, and generated reports.</p>
              </div>
            </div>
            <span className="font-mono text-xs text-[#18D8F2] bg-[#18D8F2]/10 px-2.5 py-1 rounded-md border border-[#18D8F2]/30 uppercase font-bold">
              Current: {language}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {languages.map((lang) => {
              const isSelected = language === lang.id;
              return (
                <div
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setLanguage(lang.id);
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-[#147DFF]/15 border-[#18D8F2] shadow-md shadow-[#18D8F2]/15 ring-1 ring-[#18D8F2]'
                      : 'bg-[#061426]/80 border-[#1B3A5C] hover:border-[#147DFF]/50 hover:bg-[#10243D]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{lang.flag}</span>
                        <div>
                          <div className="text-xs font-bold text-[#F4F8FF] group-hover:text-white">
                            {lang.nativeName}
                          </div>
                          <div className="text-[10px] text-[#9EB2CC] font-mono">{lang.name}</div>
                        </div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-[#18D8F2] border-[#18D8F2] text-[#030B18]' 
                          : 'border-[#1B3A5C] text-transparent'
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </div>

                    <div className="mt-3 p-2 bg-[#030B18]/60 rounded-lg border border-[#1B3A5C]/60 text-[10px] font-mono text-[#9EB2CC] leading-relaxed">
                      {lang.sample}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#1B3A5C]/40 text-[10px] font-mono flex items-center justify-between">
                    <span className={isSelected ? 'text-[#18D8F2] font-semibold' : 'text-[#9EB2CC]'}>
                      {isSelected ? 'Active Selection' : 'Click to Activate'}
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 bg-[#0B1C32] rounded border border-[#1B3A5C] text-[#9EB2CC]">
                      {lang.id}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 2. Theme Toggles & Engineering Visuals */}
        <section className="p-6 bg-[#0B1C32]/85 backdrop-blur-xl border border-[#1B3A5C] rounded-2xl shadow-lg space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#8B5CFF]/15 border border-[#8B5CFF]/30 flex items-center justify-center text-[#8B5CFF]">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F4F8FF]">Theme & High-Tech Visual Toggles</h2>
                <p className="text-[11px] text-[#9EB2CC]">Select visual presets tuned for blueprint clarity, glowing circuits, and minimal eye strain.</p>
              </div>
            </div>
            <span className="font-mono text-xs text-[#8B5CFF] bg-[#8B5CFF]/10 px-2.5 py-1 rounded-md border border-[#8B5CFF]/30 capitalize font-bold">
              {selectedTheme.replace('-', ' ')}
            </span>
          </div>

          {/* Theme Presets Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themes.map((th) => {
              const isSelected = selectedTheme === th.id;
              return (
                <div
                  key={th.id}
                  onClick={() => setSelectedTheme(th.id as any)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected 
                      ? 'bg-gradient-to-b from-[#10243D] to-[#061426] border-[#8B5CFF] shadow-lg shadow-[#8B5CFF]/15 ring-1 ring-[#8B5CFF]'
                      : 'bg-[#061426]/80 border-[#1B3A5C] hover:border-[#8B5CFF]/40 hover:bg-[#10243D]/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: th.accent, borderColor: th.borderPreview }}
                        />
                        <h3 className="text-xs font-bold text-[#F4F8FF]">{th.name}</h3>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#8B5CFF]" />}
                    </div>

                    <span className="text-[9px] font-mono uppercase tracking-wider text-[#9EB2CC] px-1.5 py-0.5 rounded bg-[#030B18] border border-[#1B3A5C] inline-block mb-2">
                      {th.tag}
                    </span>

                    <p className="text-[11px] text-[#9EB2CC] leading-relaxed">
                      {th.desc}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#1B3A5C]/40 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#030B18] border border-[#147DFF]" />
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#061426] border border-[#18D8F2]" />
                      <div className="w-2.5 h-2.5 rounded-sm bg-[#10243D] border border-[#8B5CFF]" />
                    </div>
                    <span className="text-[10px] font-mono text-[#8B5CFF]">
                      {isSelected ? 'Active Preset' : 'Apply Preset'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Granular Visual Switches */}
          <div className="pt-2 border-t border-[#1B3A5C]/60 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-[#061426]/70 rounded-xl border border-[#1B3A5C] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#F4F8FF]">Blueprint Grid Overlay</div>
                <div className="text-[10px] text-[#9EB2CC]">Subtle CAD coordinate mesh</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enableBlueprintGrid}
                onClick={() => setEnableBlueprintGrid(!enableBlueprintGrid)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  enableBlueprintGrid ? 'bg-[#18D8F2]' : 'bg-[#1B3A5C]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-[#030B18] shadow-md transition-transform ${
                  enableBlueprintGrid ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="p-3 bg-[#061426]/70 rounded-xl border border-[#1B3A5C] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#F4F8FF]">Laser Glow Highlights</div>
                <div className="text-[10px] text-[#9EB2CC]">Outer glow on active controls</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enableGlowEffects}
                onClick={() => setEnableGlowEffects(!enableGlowEffects)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  enableGlowEffects ? 'bg-[#00D6A0]' : 'bg-[#1B3A5C]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-[#030B18] shadow-md transition-transform ${
                  enableGlowEffects ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="p-3 bg-[#061426]/70 rounded-xl border border-[#1B3A5C] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-[#F4F8FF]">Compact Workspace Mode</div>
                <div className="text-[10px] text-[#9EB2CC]">Denser data & smaller paddings</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={compactDensity}
                onClick={() => setCompactDensity(!compactDensity)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  compactDensity ? 'bg-[#147DFF]' : 'bg-[#1B3A5C]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-[#030B18] shadow-md transition-transform ${
                  compactDensity ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* 3. Notification & Alert Thresholds */}
        <section className="p-6 bg-[#0B1C32]/85 backdrop-blur-xl border border-[#1B3A5C] rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#FF9A24]/15 border border-[#FF9A24]/30 flex items-center justify-center text-[#FF9A24]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F4F8FF]">Engineering Notifications & Telemetry Alerts</h2>
                <p className="text-[11px] text-[#9EB2CC]">Configure automated trigger thresholds for electrical safety, code compliance, and thermal overload.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-[#9EB2CC] font-mono hidden sm:inline">
                {notificationsEnabled ? 'System Enabled' : 'Muted'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  notificationsEnabled ? 'bg-[#FF9A24]' : 'bg-[#1B3A5C]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-[#030B18] shadow-md transition-transform ${
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            {/* Voltage Drop Alert */}
            <div className="p-3.5 bg-[#061426]/70 rounded-xl border border-[#1B3A5C] flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FF5263]/15 border border-[#FF5263]/30 flex items-center justify-center shrink-0 text-[#FF5263] mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F4F8FF]">Voltage Drop Violations (ΔU &gt; 3.0%)</span>
                    <span className="text-[9px] font-mono text-[#FF5263] bg-[#FF5263]/15 px-1.5 rounded border border-[#FF5263]/30">Critical Safety</span>
                  </div>
                  <p className="text-[11px] text-[#9EB2CC] mt-0.5 leading-snug">
                    Instantly flags circuits where conductor cross-section or excessive length results in voltage drops exceeding IEC 60364 limits.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifVoltageDrop}
                onClick={() => setNotifVoltageDrop(!notifVoltageDrop)}
                className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  notifVoltageDrop ? 'bg-[#00D6A0]' : 'bg-[#1B3A5C]'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-full bg-[#030B18] shadow-md transition-transform ${
                  notifVoltageDrop ? 'translate-x-4.5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Phase Imbalance Alert */}
            <div className="p-3.5 bg-[#061426]/70 rounded-xl border border-[#1B3A5C] flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#8B5CFF]/15 border border-[#8B5CFF]/30 flex items-center justify-center shrink-0 text-[#8B5CFF] mt-0.5">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F4F8FF]">3-Phase Asymmetry Warning (&gt; 15%)</span>
                    <span className="text-[9px] font-mono text-[#8B5CFF] bg-[#8B5CFF]/15 px-1.5 rounded border border-[#8B5CFF]/30">Load Flow</span>
                  </div>
                  <p className="text-[11px] text-[#9EB2CC] mt-0.5 leading-snug">
                    Alerts when single-phase branch loads produce uneven heating on phases L1, L2, or L3 and excessive neutral conductor current.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifPhaseImbalance}
                onClick={() => setNotifPhaseImbalance(!notifPhaseImbalance)}
                className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  notifPhaseImbalance ? 'bg-[#00D6A0]' : 'bg-[#1B3A5C]'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-full bg-[#030B18] shadow-md transition-transform ${
                  notifPhaseImbalance ? 'translate-x-4.5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Enclosure Space Alert */}
            <div className="p-3.5 bg-[#061426]/70 rounded-xl border border-[#1B3A5C] flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FF9A24]/15 border border-[#FF9A24]/30 flex items-center justify-center shrink-0 text-[#FF9A24] mt-0.5">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F4F8FF]">DIN Rail Enclosure Capacity (&gt; 85%)</span>
                    <span className="text-[9px] font-mono text-[#FF9A24] bg-[#FF9A24]/15 px-1.5 rounded border border-[#FF9A24]/30">Physical Fill</span>
                  </div>
                  <p className="text-[11px] text-[#9EB2CC] mt-0.5 leading-snug">
                    Warns when modular breaker and surge protector allocations leave less than 15% reserve space for thermal convection and future expansion.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifEnclosureCapacity}
                onClick={() => setNotifEnclosureCapacity(!notifEnclosureCapacity)}
                className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  notifEnclosureCapacity ? 'bg-[#00D6A0]' : 'bg-[#1B3A5C]'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-full bg-[#030B18] shadow-md transition-transform ${
                  notifEnclosureCapacity ? 'translate-x-4.5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* BOM Price Fluctuations */}
            <div className="p-3.5 bg-[#061426]/70 rounded-xl border border-[#1B3A5C] flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00D6A0]/15 border border-[#00D6A0]/30 flex items-center justify-center shrink-0 text-[#00D6A0] mt-0.5">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F4F8FF]">BOM Material Price Updates</span>
                    <span className="text-[9px] font-mono text-[#00D6A0] bg-[#00D6A0]/15 px-1.5 rounded border border-[#00D6A0]/30">Procurement</span>
                  </div>
                  <p className="text-[11px] text-[#9EB2CC] mt-0.5 leading-snug">
                    Notifies when copper cable (VVGng) or modular breaker wholesale index rates change in Central Asian supplier catalogs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifBomFluctuation}
                onClick={() => setNotifBomFluctuation(!notifBomFluctuation)}
                className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  notifBomFluctuation ? 'bg-[#00D6A0]' : 'bg-[#1B3A5C]'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-full bg-[#030B18] shadow-md transition-transform ${
                  notifBomFluctuation ? 'translate-x-4.5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {/* Audio Chimes */}
            <div className="p-3.5 bg-[#061426]/70 rounded-xl border border-[#1B3A5C] flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#147DFF]/15 border border-[#147DFF]/30 flex items-center justify-center shrink-0 text-[#147DFF] mt-0.5">
                  {audioChimes ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#F4F8FF]">Audible Engineering Verification Sounds</div>
                  <p className="text-[11px] text-[#9EB2CC] mt-0.5 leading-snug">
                    Subtle acoustic chime when power flow simulation completes successfully or error buzzer on thermal overload.
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={audioChimes}
                onClick={() => setAudioChimes(!audioChimes)}
                className={`w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 cursor-pointer ${
                  audioChimes ? 'bg-[#147DFF]' : 'bg-[#1B3A5C]'
                }`}
              >
                <div className={`w-4.5 h-4.5 rounded-full bg-[#030B18] shadow-md transition-transform ${
                  audioChimes ? 'translate-x-4.5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* 4. Engineering Standards & Calculations */}
        <section className="p-6 bg-[#0B1C32]/85 backdrop-blur-xl border border-[#1B3A5C] rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#1B3A5C]">
            <div className="w-8 h-8 rounded-xl bg-[#00D6A0]/15 border border-[#00D6A0]/30 flex items-center justify-center text-[#00D6A0]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4F8FF]">Electrical Engineering Standards & Nominal Voltages</h2>
              <p className="text-[11px] text-[#9EB2CC]">Governs permissible ampacity tables, breaker trip curves, and voltage drop calculations.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'IEC 60364', name: 'IEC 60364', tag: 'International', desc: 'Standard for Low-voltage electrical installations & thermal sizing.' },
              { id: 'GOST 31996', name: 'GOST / ShNQ', tag: 'Uzbekistan / Central Asia', desc: 'Compliant with State Construction Standards of Uzbekistan.' },
              { id: 'NEC NFPA 70', name: 'NEC (NFPA 70)', tag: 'North America', desc: 'National Electrical Code calculation tables and conduit fill.' }
            ].map((std) => {
              const isSelected = activeProject.standard === std.id;
              return (
                <div
                  key={std.id}
                  onClick={() => handleUpdateSetting('standard', std.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#147DFF]/15 border-[#147DFF] shadow-md shadow-[#147DFF]/15 ring-1 ring-[#147DFF]'
                      : 'bg-[#061426]/70 border-[#1B3A5C] text-[#9EB2CC] hover:border-[#147DFF]/40 hover:bg-[#10243D]/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs text-[#F4F8FF]">{std.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#18D8F2]" />}
                    </div>
                    <span className="text-[9px] font-mono text-[#00D6A0] bg-[#00D6A0]/10 px-1.5 py-0.5 rounded border border-[#00D6A0]/30 inline-block mb-2">
                      {std.tag}
                    </span>
                    <p className="text-[10px] text-[#9EB2CC] leading-relaxed">
                      {std.desc}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#1B3A5C]/40 text-[10px] font-mono text-[#18D8F2]">
                    {isSelected ? '✓ Active Engineering Standard' : 'Click to Apply'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Currency and Voltage Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Default Calculation Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:outline-none focus:border-[#18D8F2]"
              >
                <option value="UZS">UZS — O'zbekiston so'mi (Default Standard)</option>
                <option value="USD">USD — US Dollar ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Nominal Distribution Grid</label>
              <select
                defaultValue="400_230"
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:outline-none focus:border-[#18D8F2]"
              >
                <option value="400_230">3-Phase 400V / 1-Phase 230V, 50Hz (IEC / GOST Standard)</option>
                <option value="208_120">3-Phase 208V / 1-Phase 120V, 60Hz (NEC Standard)</option>
                <option value="480_277">3-Phase 480V / 1-Phase 277V, 60Hz (Industrial Feeder)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 5. Engineer Credentials & Enterprise Profile */}
        <section className="p-6 bg-[#0B1C32]/85 backdrop-blur-xl border border-[#1B3A5C] rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#147DFF]/15 border border-[#147DFF]/30 flex items-center justify-center text-[#147DFF]">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F4F8FF]">Chief Electrical Engineer & Sign-off Credentials</h2>
                <p className="text-[11px] text-[#9EB2CC]">Sign-off credentials affixed to certified PDF reports and single-line diagram calculations.</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30 font-bold">
              PRO Enterprise
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Lead Professional Engineer (PE)</label>
              <input
                type="text"
                value={activeProject.leadEngineer}
                onChange={(e) => handleUpdateSetting('leadEngineer', e.target.value)}
                placeholder="e.g. Olimjon Khashimov"
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:outline-none focus:border-[#147DFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Engineering License / Seal ID</label>
              <input
                type="text"
                defaultValue="PE-UZ-2024-8841 (Ministry of Energy)"
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:outline-none focus:border-[#147DFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Client Organization / Developer</label>
              <input
                type="text"
                value={activeProject.client}
                onChange={(e) => handleUpdateSetting('client', e.target.value)}
                placeholder="e.g. Tashkent City Development LLC"
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:outline-none focus:border-[#147DFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Project Physical Location</label>
              <input
                type="text"
                value={activeProject.location}
                onChange={(e) => handleUpdateSetting('location', e.target.value)}
                placeholder="e.g. Shayxontohur, Tashkent, Uzbekistan"
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:outline-none focus:border-[#147DFF]"
              />
            </div>
          </div>
        </section>

        {/* 6. Subscription License & Enterprise Support */}
        <section className="p-6 bg-[#0B1C32]/85 backdrop-blur-xl border border-[#1B3A5C] rounded-2xl shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#00D6A0]/15 border border-[#00D6A0]/30 flex items-center justify-center text-[#00D6A0]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F4F8FF]">Subscription Plan & Engineering Support</h2>
                <p className="text-[11px] text-[#9EB2CC]">Commercial licensing, cloud compute allocation, and 24/7 technical assistance.</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#00D6A0]/20 text-[#00D6A0] border border-[#00D6A0]/40 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A0]" />
              Active · Enterprise Tier
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#061426] border border-[#1B3A5C] rounded-xl space-y-2">
              <div className="text-xs font-bold text-[#F4F8FF]">ElectroVision PRO License</div>
              <div className="text-lg font-black text-[#18D8F2] font-mono">Unlimited Multi-Seat</div>
              <p className="text-[10px] text-[#9EB2CC]">Includes unlimited 3D room scans, panel exports, PDF certifications, and offline local cache.</p>
              <div className="text-[9px] font-mono text-[#00D6A0] pt-1">Valid through: 2027-12-31</div>
            </div>

            <div className="p-4 bg-[#061426] border border-[#1B3A5C] rounded-xl space-y-2">
              <div className="text-xs font-bold text-[#F4F8FF]">Server-Side AI Engine</div>
              <div className="text-lg font-black text-[#00D6A0] font-mono">Gemini 3.8 Flash</div>
              <p className="text-[10px] text-[#9EB2CC]">Server-side proxy routes for floorplan parsing, regulatory compliance audits, and knowledge search.</p>
              <div className="text-[9px] font-mono text-[#18D8F2] pt-1">Status: Operational (30 req/min)</div>
            </div>

            <div className="p-4 bg-[#061426] border border-[#1B3A5C] rounded-xl space-y-2">
              <div className="text-xs font-bold text-[#F4F8FF]">Direct Engineering Support</div>
              <div className="text-xs font-mono text-[#F4F8FF]">support@electrovision.uz</div>
              <p className="text-[10px] text-[#9EB2CC]">Contact our staff of licensed Senior Electrical Engineers (PUE 7.1 / IEC 60364 certified) for technical inquiries.</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => alert("Texnik qo'llab-quvvatlash xizmati bilan bog'lanish: support@electrovision.uz yoki +998 71 200-00-00")}
                  className="px-2.5 py-1 bg-[#10243D] hover:bg-[#147DFF]/20 text-[#18D8F2] border border-[#147DFF]/30 rounded text-[10px] font-bold transition-colors cursor-pointer"
                >
                  Contact Helpdesk
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

// Aliased export for convenience
export const Settings = SettingsView;
