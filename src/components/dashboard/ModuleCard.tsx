import React, { useState } from 'react';
import { 
  LucideIcon, 
  ArrowRight, 
  Zap, 
  Cpu, 
  Box, 
  Wrench, 
  Server, 
  Calculator,
  Layers,
  Sparkles
} from 'lucide-react';

export interface ModuleCardData {
  id: 'scanner' | 'installation' | 'panel' | 'cad' | 'calculations' | 'estimator';
  num: string;
  title: string;
  tag: string;
  desc: string;
  icon: LucideIcon;
  accentColor: string;
  glowColor: string;
  borderColor: string;
  illustrationImage: string;
  illustrationAlt: string;
  stats: string;
  secondaryStats?: {
    label: string;
    value: string;
  };
}

interface ModuleCardProps {
  module: ModuleCardData;
  isActive?: boolean;
  onClick: (id: string) => void;
  className?: string;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  isActive = false,
  onClick,
  className = ''
}) => {
  const Icon = module.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={() => onClick(module.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${module.title} module`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(module.id);
        }
      }}
      className={`group relative flex flex-col justify-between rounded-2xl bg-[#0B1C32]/85 backdrop-blur-2xl border transition-all duration-300 cursor-pointer overflow-hidden text-left focus:outline-none focus:ring-2 select-none hover:-translate-y-1.5 ${
        isActive 
          ? 'shadow-xl shadow-black/50' 
          : 'shadow-lg shadow-black/40'
      } ${className}`}
      style={{
        borderColor: isActive || isHovered ? module.accentColor : '#1B3A5C',
        boxShadow: isHovered 
          ? `0 12px 30px -10px ${module.accentColor}35, 0 0 0 1px ${module.accentColor}50` 
          : undefined
      }}
    >
      {/* Specular Top Border Highlight in Accent Color */}
      <div 
        className="absolute inset-x-0 top-0 h-[2px] transition-opacity duration-300 pointer-events-none z-10"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${module.accentColor} 50%, transparent 100%)`,
          opacity: isHovered || isActive ? 1 : 0.4
        }}
      />

      {/* Dynamic Background Hover Glow Accent */}
      <div 
        className="absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl pointer-events-none transition-all duration-500 opacity-20 group-hover:opacity-45"
        style={{ backgroundColor: module.accentColor }}
      />

      {/* Top Media: Technical Illustration Container */}
      <div className="relative w-full h-36 overflow-hidden bg-[#040E1B] border-b border-[#1B3A5C]/80">
        <img
          src={module.illustrationImage}
          alt={module.illustrationAlt}
          className="w-full h-full object-cover transform group-hover:scale-108 transition-transform duration-700 ease-out"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Blueprint Grid + Gradient Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C32] via-[#040E1B]/50 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#18D8F2_0.5px,transparent_0.5px)] [background-size:12px_12px] opacity-15 pointer-events-none" />

        {/* Top Floating Badge Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="font-mono text-[10px] font-black px-2 py-0.5 rounded-md bg-[#040E1B]/90 backdrop-blur-md border border-[#1B3A5C] text-[#9EB2CC] shadow-sm">
            MOD <strong className="text-[#F4F8FF]">{module.num}</strong>
          </span>

          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-md border shadow-md transition-all duration-300 group-hover:scale-110"
            style={{ 
              backgroundColor: `${module.accentColor}25`, 
              borderColor: `${module.accentColor}60`,
              boxShadow: `0 0 15px ${module.accentColor}40`
            }}
          >
            <Icon className="w-4 h-4 transition-transform duration-300 group-hover:rotate-6" style={{ color: module.accentColor }} />
          </div>
        </div>

        {/* Bottom Floating Tag */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between">
          <span 
            className="text-[9px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded border backdrop-blur-md shadow-sm"
            style={{
              backgroundColor: `${module.accentColor}18`,
              borderColor: `${module.accentColor}40`,
              color: module.accentColor
            }}
          >
            {module.tag}
          </span>
        </div>
      </div>

      {/* Card Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Module Title */}
          <h3 className="text-base font-bold text-[#F4F8FF] group-hover:text-white transition-colors tracking-tight flex items-center justify-between">
            <span>{module.title}</span>
          </h3>

          {/* Module Description */}
          <p className="text-xs text-[#9EB2CC] leading-relaxed mt-1.5 line-clamp-2">
            {module.desc}
          </p>
        </div>

        {/* Telemetry and Action Footer */}
        <div className="pt-3 border-t border-[#1B3A5C]/70 space-y-2.5">
          {/* Primary Telemetry Line */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[11px] text-[#9EB2CC] truncate max-w-[170px]" title={module.stats}>
              {module.stats}
            </span>

            {module.secondaryStats && (
              <span className="text-[10px] text-[#F4F8FF] bg-[#061426] px-1.5 py-0.5 rounded border border-[#1B3A5C] font-mono">
                {module.secondaryStats.value}
              </span>
            )}
          </div>

          {/* Action Button Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono text-[#9EB2CC] flex items-center gap-1.5">
              <span 
                className="w-1.5 h-1.5 rounded-full animate-pulse" 
                style={{ backgroundColor: module.accentColor }} 
              />
              Ready
            </span>

            <div 
              className="flex items-center gap-1.5 text-xs font-bold transition-all duration-200 group-hover:translate-x-1"
              style={{ color: module.accentColor }}
            >
              <span>Launch</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
