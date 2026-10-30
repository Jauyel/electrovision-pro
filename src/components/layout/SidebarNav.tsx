import React from 'react';
import { 
  Box, 
  Wrench, 
  Server, 
  Cpu, 
  Calculator, 
  LayoutDashboard,
  ChevronRight,
  Zap,
  Sparkles,
  CheckCheck,
  Layers,
  FileText,
  FolderKanban,
  Settings as SettingsIcon
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

interface SidebarNavProps {
  onItemClick?: () => void;
  className?: string;
}

export interface NavModuleItem {
  id: 'cad' | 'scanner' | 'panel' | 'calculations' | 'installation' | 'estimator' | 'compliance' | 'templates' | 'reports';
  modNumber: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accentColor: string;
  glowColor: string;
  badge: string;
  techTag: string;
}

export const MAIN_MODULES: NavModuleItem[] = [
  {
    id: 'cad',
    modNumber: '01',
    label: 'Electrical CAD & SLD',
    icon: Cpu,
    accentColor: '#8B5CFF',
    glowColor: 'rgba(139, 92, 255, 0.4)',
    badge: 'CAD / SLD',
    techTag: 'IEC / GOST'
  },
  {
    id: 'scanner',
    modNumber: '02',
    label: '3D Room Scanner',
    icon: Box,
    accentColor: '#18D8F2',
    glowColor: 'rgba(24, 216, 242, 0.4)',
    badge: '3D Room',
    techTag: 'BIM Scan'
  },
  {
    id: 'panel',
    modNumber: '03',
    label: 'Smart Panel Builder 3D',
    icon: Server,
    accentColor: '#FF9A24',
    glowColor: 'rgba(255, 154, 36, 0.4)',
    badge: '3D Panel',
    techTag: 'DIN Rail'
  },
  {
    id: 'calculations',
    modNumber: '04',
    label: 'Cable & Sizing Calculators',
    icon: Calculator,
    accentColor: '#FF5263',
    glowColor: 'rgba(255, 82, 99, 0.4)',
    badge: 'PUE / IEC',
    techTag: 'ΔU / Ikz'
  },
  {
    id: 'installation',
    modNumber: '05',
    label: 'AR Installation Mode',
    icon: Wrench,
    accentColor: '#00D6A0',
    glowColor: 'rgba(0, 214, 160, 0.4)',
    badge: 'AR Routes',
    techTag: 'Laser AR'
  },
  {
    id: 'estimator',
    modNumber: '06',
    label: 'Material Estimator BOM',
    icon: Calculator,
    accentColor: '#147DFF',
    glowColor: 'rgba(20, 125, 255, 0.4)',
    badge: 'BOM Cost',
    techTag: 'Live Rates'
  },
  {
    id: 'compliance',
    modNumber: '07',
    label: 'Compliance Auditor',
    icon: CheckCheck,
    accentColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badge: 'PUE 7.1',
    techTag: 'Code Audit'
  },
  {
    id: 'templates',
    modNumber: '08',
    label: 'Circuit Presets',
    icon: Layers,
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    badge: 'Presets',
    techTag: 'Turnkey'
  },
  {
    id: 'reports',
    modNumber: '09',
    label: 'Engineering Reports PDF',
    icon: FileText,
    accentColor: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    badge: 'Dossier',
    techTag: 'Stamped'
  }
];

export const SidebarNav: React.FC<SidebarNavProps> = ({ 
  onItemClick,
  className = '' 
}) => {
  const { activeModule, setActiveModule, t } = useProject();

  const handleSelectModule = (id: string) => {
    setActiveModule(id as any);
    if (onItemClick) {
      onItemClick();
    }
  };

  const getToolLabel = (id: string, fallback: string) => {
    if (id === 'cad') return t.nav.electricalCad || fallback;
    if (id === 'scanner') return t.nav.roomScanner || fallback;
    if (id === 'panel') return t.nav.panelBuilder || fallback;
    if (id === 'calculations') return t.nav.calculations || fallback;
    if (id === 'installation') return t.nav.installation || fallback;
    if (id === 'estimator') return t.nav.materialEstimator || fallback;
    if (id === 'reports') return t.nav.reports || fallback;
    return fallback;
  };

  return (
    <nav className={`space-y-3 ${className}`} aria-label="Tools Navigation">
      {/* Tools Suite Header */}
      <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
        <span className="text-[10px] font-bold text-[#18D8F2] uppercase tracking-wider font-mono flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-[#18D8F2]" />
          Electrical Tools Suite
        </span>
        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#061426] text-[#00D6A0] border border-[#00D6A0]/30 font-bold">
          9 TOOLS
        </span>
      </div>

      {/* 9 Specialized Tools List */}
      <div className="space-y-1">
        {MAIN_MODULES.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          const label = getToolLabel(item.id, item.label);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectModule(item.id)}
              className={`w-full group relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all duration-200 border cursor-pointer ${
                isActive
                  ? 'font-bold text-white shadow-lg shadow-black/30'
                  : 'border-transparent text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] hover:border-[#1B3A5C]/60 hover:translate-x-0.5'
              }`}
              style={isActive ? {
                background: `linear-gradient(90deg, ${item.accentColor}25 0%, ${item.accentColor}08 70%, transparent 100%)`,
                borderColor: `${item.accentColor}55`,
                boxShadow: `0 4px 20px -2px ${item.accentColor}20`
              } : undefined}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active Left Vertical Luminescent Pill */}
              {isActive && (
                <div 
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full transition-all"
                  style={{
                    backgroundColor: item.accentColor,
                    boxShadow: `0 0 10px ${item.accentColor}`
                  }}
                />
              )}

              {/* Left Side: Standardized Uniform Icon + Module Title */}
              <div className="flex items-center gap-2.5 truncate">
                {/* Uniform Icon Container */}
                <div 
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 ${
                    isActive ? 'scale-105' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] group-hover:bg-[#10243D]'
                  }`}
                  style={isActive ? {
                    backgroundColor: `${item.accentColor}25`,
                    borderColor: `${item.accentColor}60`,
                    color: item.accentColor,
                    boxShadow: `0 0 14px ${item.accentColor}35`
                  } : undefined}
                >
                  <Icon 
                    className="w-3.5 h-3.5" 
                    style={isActive ? { color: item.accentColor } : undefined} 
                  />
                </div>

                <div className="flex flex-col text-left truncate">
                  <span className="truncate tracking-tight text-xs font-semibold group-hover:text-white transition-colors">
                    {label}
                  </span>
                  <span className="text-[9px] font-mono text-[#9EB2CC]/80 flex items-center gap-1">
                    <span className="opacity-75">{item.modNumber}</span>
                    <span>·</span>
                    <span style={{ color: isActive ? item.accentColor : undefined }}>
                      {item.techTag}
                    </span>
                  </span>
                </div>
              </div>

              {/* Right Side: Module Badge */}
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                <span 
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    isActive ? 'font-bold' : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC]'
                  }`}
                  style={isActive ? {
                    backgroundColor: `${item.accentColor}20`,
                    borderColor: `${item.accentColor}50`,
                    color: item.accentColor
                  } : undefined}
                >
                  {item.badge}
                </span>

                {isActive ? (
                  <div 
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                    style={{ backgroundColor: item.accentColor }}
                  />
                ) : (
                  <ChevronRight className="w-3 h-3 text-[#9EB2CC]/40 group-hover:text-[#9EB2CC] group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
