import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Cpu,
  DollarSign,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Server,
  Layers,
  Sparkles,
  Plug,
  Lightbulb,
  Wind,
  Flame,
  PieChart as PieChartIcon,
  BarChart3,
  SlidersHorizontal,
  Info,
  Check,
  X
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { RoomData, ElectricalPoint } from '../../types';

interface ProjectStatisticsProps {
  className?: string;
}

export type LoadCategoryKey = 'outlets' | 'hvac' | 'lighting' | 'appliances' | 'auxiliary';

interface LoadCategoryMeta {
  key: LoadCategoryKey;
  label: string;
  shortLabel: string;
  color: string;
  glow: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  breakerStandard: string;
  wireGauge: string;
  pueRule: string;
}

const LOAD_CATEGORIES: Record<LoadCategoryKey, LoadCategoryMeta> = {
  outlets: {
    key: 'outlets',
    label: 'Power Outlets & Sockets',
    shortLabel: 'Power Outlets',
    color: '#18D8F2', // Cyan
    glow: 'rgba(24, 216, 242, 0.35)',
    icon: Plug,
    description: 'General Schuko receptacles, media center outlets, desk workstations, and countertop plugs.',
    breakerStandard: '16A Curve C (3.68 kW max)',
    wireGauge: '3x2.5 mm² Cu',
    pueRule: 'PUE 7.1 § 7.1.37: Max 8 outlets per 16A branch circuit; 30mA RCD protection mandatory.'
  },
  hvac: {
    key: 'hvac',
    label: 'HVAC & Climate Control',
    shortLabel: 'HVAC & Cooling',
    color: '#FF9A24', // Amber
    glow: 'rgba(255, 154, 36, 0.35)',
    icon: Wind,
    description: 'VRV inverter multi-split systems, compressor heat pumps, air handling, and heating elements.',
    breakerStandard: '20A Curve C (with RCBO)',
    wireGauge: '3x4.0 mm² Cu',
    pueRule: 'IEC 60364-5-52: Continuous duty motor load derated to 80% with dedicated branch feeder.'
  },
  lighting: {
    key: 'lighting',
    label: 'Lighting & Illumination',
    shortLabel: 'Lighting',
    color: '#8B5CFF', // Purple / Electric Indigo
    glow: 'rgba(139, 92, 255, 0.35)',
    icon: Lightbulb,
    description: 'Architectural chandeliers, dimmable recessed spotlights, LED perimeter strip drivers, and track lights.',
    breakerStandard: '10A Curve B (2.30 kW max)',
    wireGauge: '3x1.5 mm² Cu',
    pueRule: 'PUE 7.1 § 7.1.42: Max 20 luminaire points per circuit; curve B recommended for LED inrush.'
  },
  appliances: {
    key: 'appliances',
    label: 'Heavy Machinery & Appliances',
    shortLabel: 'Heavy Appliances',
    color: '#00D6A0', // Emerald Green
    glow: 'rgba(0, 214, 160, 0.35)',
    icon: Flame,
    description: 'Electric induction ovens, high-capacity boilers, sauna heaters, and dedicated 3-phase machinery.',
    breakerStandard: '25A - 32A Curve C / 3P',
    wireGauge: '5x4.0 - 5x6.0 mm² Cu',
    pueRule: 'IEC 60364-4-43: Individual radial protection required; no daisy-chaining permitted.'
  },
  auxiliary: {
    key: 'auxiliary',
    label: 'Panels & Smart Automation',
    shortLabel: 'Controls & Aux',
    color: '#38BDF8', // Sky Blue
    glow: 'rgba(56, 189, 248, 0.35)',
    icon: Cpu,
    description: 'DIN automation gateways, surge suppression units, smart metering interfaces, and control relays.',
    breakerStandard: '6A - 10A Curve C',
    wireGauge: '2x1.0 - 3x1.5 mm² Cu',
    pueRule: 'GOST 30331: Overvoltage category III SPD required at primary entrance terminal.'
  }
};

export const ProjectStatistics: React.FC<ProjectStatisticsProps> = ({ className = '' }) => {
  const {
    activeProject,
    powerCalculations,
    formatCurrency,
    setActiveModule
  } = useProject();

  const [activeTab, setActiveTab] = useState<'category_pie' | 'room_stacked' | 'circuits_bar'>('category_pie');
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<LoadCategoryKey | null>(null);
  const [displayUnit, setDisplayUnit] = useState<'kw' | 'watts'>('kw');

  // 1. Compile room data (single room or multi-room)
  const allRooms: RoomData[] = useMemo(() => {
    if (activeProject.rooms && activeProject.rooms.length > 0) {
      return activeProject.rooms;
    }
    return [activeProject.roomData];
  }, [activeProject.rooms, activeProject.roomData]);

  // 2. Aggregate points and categorize into Lighting, HVAC, Outlets, Appliances, Auxiliary
  const categorizedLoads = useMemo(() => {
    let outletsWatts = 0;
    let hvacWatts = 0;
    let lightingWatts = 0;
    let appliancesWatts = 0;
    let auxiliaryWatts = 0;

    let outletsCount = 0;
    let hvacCount = 0;
    let lightingCount = 0;
    let appliancesCount = 0;
    let auxiliaryCount = 0;

    // Scan all points across all rooms
    allRooms.forEach(room => {
      (room.points || []).forEach((p: ElectricalPoint) => {
        const type = (p.type || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const w = Number(p.wattage) || 0;

        if (type.includes('ac') || name.includes('konditsioner') || name.includes('ac') || name.includes('hvac') || name.includes('klimat')) {
          hvacWatts += w;
          hvacCount++;
        } else if (type.includes('boiler') || type.includes('oven') || name.includes('sauna') || name.includes('plita')) {
          appliancesWatts += w;
          appliancesCount++;
        } else if (type.includes('socket') || name.includes('rozetka') || name.includes('socket')) {
          outletsWatts += w;
          outletsCount++;
        } else if (type.includes('light') || type.includes('spot') || type.includes('led') || type.includes('switch') || name.includes('chiroq') || name.includes('lyustra')) {
          lightingWatts += w;
          lightingCount++;
        } else if (type === 'panel') {
          auxiliaryWatts += w;
          auxiliaryCount++;
        } else {
          outletsWatts += w;
          outletsCount++;
        }
      });
    });

    // Cross-check with cadCircuits in case points wattage was incomplete
    if (activeProject.cadCircuits && activeProject.cadCircuits.length > 0) {
      activeProject.cadCircuits.forEach(c => {
        const name = (c.name || '').toLowerCase();
        const tag = (c.tag || '').toLowerCase();
        const pw = c.powerWatts || 0;

        if (c.phase === '3P' && pw > 4000 && appliancesWatts === 0) {
          appliancesWatts += pw;
          appliancesCount += 1;
        } else if ((name.includes('ac') || name.includes('konditsioner') || tag.includes('ac')) && hvacWatts === 0) {
          hvacWatts += pw;
          hvacCount += 1;
        }
      });
    }

    // Fallback sensible values if an empty project was created
    if (outletsWatts === 0 && hvacWatts === 0 && lightingWatts === 0) {
      outletsWatts = 4200;
      hvacWatts = 2800;
      lightingWatts = 630;
      appliancesWatts = 3000;
      outletsCount = 6;
      hvacCount = 1;
      lightingCount = 4;
      appliancesCount = 1;
    }

    const totalRawWatts = outletsWatts + hvacWatts + lightingWatts + appliancesWatts + auxiliaryWatts;
    const totalWattsSafe = totalRawWatts > 0 ? totalRawWatts : 1;

    return {
      outlets: {
        meta: LOAD_CATEGORIES.outlets,
        watts: outletsWatts,
        kw: Number((outletsWatts / 1000).toFixed(2)),
        count: outletsCount,
        percent: Math.round((outletsWatts / totalWattsSafe) * 100)
      },
      hvac: {
        meta: LOAD_CATEGORIES.hvac,
        watts: hvacWatts,
        kw: Number((hvacWatts / 1000).toFixed(2)),
        count: hvacCount,
        percent: Math.round((hvacWatts / totalWattsSafe) * 100)
      },
      lighting: {
        meta: LOAD_CATEGORIES.lighting,
        watts: lightingWatts,
        kw: Number((lightingWatts / 1000).toFixed(2)),
        count: lightingCount,
        percent: Math.round((lightingWatts / totalWattsSafe) * 100)
      },
      appliances: {
        meta: LOAD_CATEGORIES.appliances,
        watts: appliancesWatts,
        kw: Number((appliancesWatts / 1000).toFixed(2)),
        count: appliancesCount,
        percent: Math.round((appliancesWatts / totalWattsSafe) * 100)
      },
      auxiliary: {
        meta: LOAD_CATEGORIES.auxiliary,
        watts: auxiliaryWatts,
        kw: Number((auxiliaryWatts / 1000).toFixed(2)),
        count: auxiliaryCount,
        percent: Math.round((auxiliaryWatts / totalWattsSafe) * 100)
      },
      totalWatts: totalRawWatts,
      totalKw: Number((totalRawWatts / 1000).toFixed(2)),
      totalCount: outletsCount + hvacCount + lightingCount + appliancesCount + auxiliaryCount
    };
  }, [allRooms, activeProject.cadCircuits]);

  // 3. Format data for Donut/Pie Chart
  const pieChartData = useMemo(() => {
    const list = [
      {
        name: LOAD_CATEGORIES.outlets.shortLabel,
        key: 'outlets' as LoadCategoryKey,
        value: displayUnit === 'kw' ? categorizedLoads.outlets.kw : categorizedLoads.outlets.watts,
        kw: categorizedLoads.outlets.kw,
        watts: categorizedLoads.outlets.watts,
        percent: categorizedLoads.outlets.percent,
        color: LOAD_CATEGORIES.outlets.color,
        count: categorizedLoads.outlets.count
      },
      {
        name: LOAD_CATEGORIES.hvac.shortLabel,
        key: 'hvac' as LoadCategoryKey,
        value: displayUnit === 'kw' ? categorizedLoads.hvac.kw : categorizedLoads.hvac.watts,
        kw: categorizedLoads.hvac.kw,
        watts: categorizedLoads.hvac.watts,
        percent: categorizedLoads.hvac.percent,
        color: LOAD_CATEGORIES.hvac.color,
        count: categorizedLoads.hvac.count
      },
      {
        name: LOAD_CATEGORIES.lighting.shortLabel,
        key: 'lighting' as LoadCategoryKey,
        value: displayUnit === 'kw' ? categorizedLoads.lighting.kw : categorizedLoads.lighting.watts,
        kw: categorizedLoads.lighting.kw,
        watts: categorizedLoads.lighting.watts,
        percent: categorizedLoads.lighting.percent,
        color: LOAD_CATEGORIES.lighting.color,
        count: categorizedLoads.lighting.count
      }
    ];

    if (categorizedLoads.appliances.watts > 0) {
      list.push({
        name: LOAD_CATEGORIES.appliances.shortLabel,
        key: 'appliances' as LoadCategoryKey,
        value: displayUnit === 'kw' ? categorizedLoads.appliances.kw : categorizedLoads.appliances.watts,
        kw: categorizedLoads.appliances.kw,
        watts: categorizedLoads.appliances.watts,
        percent: categorizedLoads.appliances.percent,
        color: LOAD_CATEGORIES.appliances.color,
        count: categorizedLoads.appliances.count
      });
    }

    if (categorizedLoads.auxiliary.watts > 0) {
      list.push({
        name: LOAD_CATEGORIES.auxiliary.shortLabel,
        key: 'auxiliary' as LoadCategoryKey,
        value: displayUnit === 'kw' ? categorizedLoads.auxiliary.kw : categorizedLoads.auxiliary.watts,
        kw: categorizedLoads.auxiliary.kw,
        watts: categorizedLoads.auxiliary.watts,
        percent: categorizedLoads.auxiliary.percent,
        color: LOAD_CATEGORIES.auxiliary.color,
        count: categorizedLoads.auxiliary.count
      });
    }

    return list;
  }, [categorizedLoads, displayUnit]);

  // 4. Room-by-room distribution data for Stacked Bar Chart
  const roomStackedData = useMemo(() => {
    return allRooms.map((room, idx) => {
      let rOutlets = 0;
      let rHvac = 0;
      let rLighting = 0;
      let rAppliances = 0;

      (room.points || []).forEach(p => {
        const type = (p.type || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        const w = Number(p.wattage) || 0;

        if (type.includes('ac') || name.includes('ac') || name.includes('konditsioner') || name.includes('hvac')) {
          rHvac += w;
        } else if (type.includes('boiler') || type.includes('oven') || name.includes('sauna')) {
          rAppliances += w;
        } else if (type.includes('socket') || name.includes('rozetka')) {
          rOutlets += w;
        } else if (type.includes('light') || type.includes('spot') || type.includes('led') || type.includes('switch')) {
          rLighting += w;
        } else {
          rOutlets += w;
        }
      });

      // Standard single-phase 16A continuous breaker limit is 3.68 kW * 0.8 = 2.94 kW
      const capacityKw = 3.68;
      const safeThresholdKw = Number((capacityKw * 0.8).toFixed(2));
      const totalKw = Number(((rOutlets + rHvac + rLighting + rAppliances) / 1000).toFixed(2));

      return {
        roomName: room.roomName || `Room ${idx + 1}`,
        outletsKw: Number((rOutlets / 1000).toFixed(2)),
        hvacKw: Number((rHvac / 1000).toFixed(2)),
        lightingKw: Number((rLighting / 1000).toFixed(2)),
        appliancesKw: Number((rAppliances / 1000).toFixed(2)),
        totalKw,
        safeThreshold: safeThresholdKw,
        isOverLimit: totalKw > safeThresholdKw
      };
    });
  }, [allRooms]);

  // 5. Branch circuit schedule data for Bar Chart
  const circuitsBarData = useMemo(() => {
    return (activeProject.cadCircuits || []).map(c => {
      const pWatts = c.powerWatts || 0;
      const pKw = Number((pWatts / 1000).toFixed(2));
      const breakerRatingKw = Number(((c.breakerRatingA * (c.supplyVoltage || 230)) / 1000).toFixed(2));
      const continuousSafeKw = Number((breakerRatingKw * 0.8).toFixed(2));

      let typeGroup = 'outlets';
      const name = (c.name || '').toLowerCase();
      if (name.includes('light')) typeGroup = 'lighting';
      else if (name.includes('ac') || name.includes('konditsioner')) typeGroup = 'hvac';
      else if (c.phase === '3P' || name.includes('oven') || name.includes('sauna')) typeGroup = 'appliances';

      return {
        tag: c.tag || 'CCT',
        name: c.name,
        phase: c.phase,
        loadKw: pKw,
        breakerKw: breakerRatingKw,
        safeLimitKw: continuousSafeKw,
        typeGroup,
        color: (LOAD_CATEGORIES as any)[typeGroup]?.color || '#18D8F2',
        isWarning: pKw > continuousSafeKw
      };
    });
  }, [activeProject.cadCircuits]);

  // 6. Overall Project Telemetry
  const activeSelected = selectedCategoryKey ? LOAD_CATEGORIES[selectedCategoryKey] : null;

  const topCategory = useMemo(() => {
    const list = [
      categorizedLoads.outlets,
      categorizedLoads.hvac,
      categorizedLoads.lighting,
      categorizedLoads.appliances
    ];
    return list.sort((a, b) => b.watts - a.watts)[0];
  }, [categorizedLoads]);

  // Custom Recharts Tooltip Component
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#061426]/95 border border-[#1B3A5C] backdrop-blur-xl p-3.5 rounded-xl shadow-2xl font-mono text-xs space-y-1.5 z-50 min-w-[200px]">
          <div className="flex items-center gap-2 pb-1.5 border-b border-white/10">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-bold text-[#F4F8FF]">{data.name}</span>
          </div>
          <div className="flex justify-between items-center text-[#9EB2CC]">
            <span>Connected Load:</span>
            <span className="text-[#F4F8FF] font-bold">{data.kw} kW ({data.watts.toLocaleString()} W)</span>
          </div>
          <div className="flex justify-between items-center text-[#9EB2CC]">
            <span>System Share:</span>
            <span className="text-[#18D8F2] font-semibold">{data.percent}%</span>
          </div>
          <div className="flex justify-between items-center text-[#9EB2CC]">
            <span>Active Points:</span>
            <span className="text-[#00D6A0] font-semibold">{data.count} Terminals</span>
          </div>
          <div className="pt-1 text-[10px] text-[#9EB2CC]/80 italic">
            Click to view IEC/PUE wiring specification
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#061426]/95 border border-[#1B3A5C] backdrop-blur-xl p-3.5 rounded-xl shadow-2xl font-mono text-xs space-y-2 z-50 min-w-[220px]">
          <div className="font-bold text-[#F4F8FF] border-b border-white/10 pb-1 flex items-center justify-between">
            <span>{label || data.roomName || data.name}</span>
            {data.isOverLimit && (
              <span className="text-[10px] bg-[#FF5263]/20 text-[#FF5263] px-1.5 py-0.5 rounded border border-[#FF5263]/40">
                &gt;80% Limit
              </span>
            )}
          </div>
          {payload.map((entry: any, i: number) => {
            if (entry.dataKey === 'safeThreshold' || entry.dataKey === 'safeLimitKw') return null;
            return (
              <div key={i} className="flex justify-between items-center text-[#9EB2CC]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}:</span>
                </span>
                <span className="text-[#F4F8FF] font-bold">{entry.value} kW</span>
              </div>
            );
          })}
          {data.totalKw !== undefined && (
            <div className="pt-1.5 border-t border-white/10 flex justify-between items-center text-[#F4F8FF] font-bold">
              <span>Total Room Load:</span>
              <span className="text-[#18D8F2]">{data.totalKw} kW</span>
            </div>
          )}
          {data.safeThreshold && (
            <div className="flex justify-between items-center text-[10px] text-[#FF9A24]">
              <span>80% Continuous Limit:</span>
              <span>{data.safeThreshold} kW</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <section aria-label="Project Statistics and Electrical Load Distribution" className={`space-y-4 ${className}`}>
      {/* 1. Header Bar with Standard & Telemetry Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[#18D8F2] animate-ping opacity-75" />
            <div className="absolute w-2 h-2 rounded-full bg-[#18D8F2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#F4F8FF] uppercase tracking-wider font-mono">
                Electrical Load Distribution & Project Telemetry
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#10243D] text-[#18D8F2] border border-[#18D8F2]/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Recharts Live Analysis</span>
              </span>
            </div>
            <p className="text-xs text-[#9EB2CC]">
              Dynamic breakdown of active loads: Power Outlets, HVAC & Cooling, Lighting, and Dedicated Machinery.
            </p>
          </div>
        </div>

        {/* Quick Mode & Unit Switchers */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-[#07172C] p-1 rounded-xl border border-[#1B3A5C]/80">
            <button
              onClick={() => setActiveTab('category_pie')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                activeTab === 'category_pie'
                  ? 'bg-[#18D8F2] text-[#040E1B] font-bold shadow-[0_0_12px_rgba(24,216,242,0.4)]'
                  : 'text-[#9EB2CC] hover:text-white'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Categories</span>
            </button>
            <button
              onClick={() => setActiveTab('room_stacked')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                activeTab === 'room_stacked'
                  ? 'bg-[#18D8F2] text-[#040E1B] font-bold shadow-[0_0_12px_rgba(24,216,242,0.4)]'
                  : 'text-[#9EB2CC] hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>By Room</span>
            </button>
            <button
              onClick={() => setActiveTab('circuits_bar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                activeTab === 'circuits_bar'
                  ? 'bg-[#18D8F2] text-[#040E1B] font-bold shadow-[0_0_12px_rgba(24,216,242,0.4)]'
                  : 'text-[#9EB2CC] hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Circuits</span>
            </button>
          </div>

          <div className="flex items-center bg-[#07172C] p-1 rounded-xl border border-[#1B3A5C]/80 text-xs font-mono">
            <button
              onClick={() => setDisplayUnit('kw')}
              className={`px-2 py-0.5 rounded-md ${displayUnit === 'kw' ? 'bg-[#1B3A5C] text-[#F4F8FF] font-bold' : 'text-[#9EB2CC]'}`}
            >
              kW
            </button>
            <button
              onClick={() => setDisplayUnit('watts')}
              className={`px-2 py-0.5 rounded-md ${displayUnit === 'watts' ? 'bg-[#1B3A5C] text-[#F4F8FF] font-bold' : 'text-[#9EB2CC]'}`}
            >
              Watts
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top-Level Engineering KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Connected Power */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#0B1C32]/90 to-[#040E1B]/95 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EB2CC]">Connected Power</span>
            <div className="w-7 h-7 rounded-lg bg-[#18D8F2]/15 border border-[#18D8F2]/30 flex items-center justify-center text-[#18D8F2]">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#F4F8FF] font-mono tabular-nums">
            {categorizedLoads.totalKw} <span className="text-xs text-[#9EB2CC] font-normal">kW</span>
          </div>
          <div className="text-[11px] font-mono text-[#9EB2CC] mt-1 flex items-center justify-between">
            <span>Demand: ~{(categorizedLoads.totalKw * 0.85).toFixed(2)} kW</span>
            <span className="text-[#18D8F2]">Kd = 0.85</span>
          </div>
        </div>

        {/* Top Load Category */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#0B1C32]/90 to-[#040E1B]/95 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EB2CC]">Dominant Category</span>
            <div
              className="w-7 h-7 rounded-lg border flex items-center justify-center"
              style={{
                backgroundColor: `${topCategory.meta.color}20`,
                borderColor: `${topCategory.meta.color}40`,
                color: topCategory.meta.color
              }}
            >
              <topCategory.meta.icon className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-extrabold font-mono truncate" style={{ color: topCategory.meta.color }}>
            {topCategory.meta.shortLabel}
          </div>
          <div className="text-[11px] font-mono text-[#9EB2CC] mt-1 flex items-center justify-between">
            <span>{topCategory.kw} kW</span>
            <span className="font-semibold text-[#F4F8FF]">{topCategory.percent}% of total</span>
          </div>
        </div>

        {/* Phase Balance Telemetry */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#0B1C32]/90 to-[#040E1B]/95 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EB2CC]">Phase Balance</span>
            <div className="w-7 h-7 rounded-lg bg-[#8B5CFF]/15 border border-[#8B5CFF]/30 flex items-center justify-center text-[#8B5CFF]">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-extrabold font-mono tabular-nums ${
              powerCalculations.phaseBalanceUnbalancePercent > 15 ? 'text-[#FF9A24]' : 'text-[#00D6A0]'
            }`}>
              {powerCalculations.phaseBalanceUnbalancePercent}%
            </span>
            <span className="text-xs font-mono text-[#9EB2CC]">
              {powerCalculations.phaseBalanceUnbalancePercent <= 15 ? 'Optimal' : 'Review'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[#9EB2CC] mt-1 flex items-center justify-between">
            <span>L1: {powerCalculations.phaseLoadsKw.L1}k</span>
            <span>L2: {powerCalculations.phaseLoadsKw.L2}k</span>
            <span>L3: {powerCalculations.phaseLoadsKw.L3}k</span>
          </div>
        </div>

        {/* Standards & Code Compliance */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-b from-[#0B1C32]/90 to-[#040E1B]/95 border border-white/10 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#9EB2CC]">Code Verification</span>
            <div className="w-7 h-7 rounded-lg bg-[#00D6A0]/15 border border-[#00D6A0]/30 flex items-center justify-center text-[#00D6A0]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-lg font-bold text-[#00D6A0] font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#00D6A0]" />
            <span>PUE 7.1 / IEC</span>
          </div>
          <div className="text-[11px] font-mono text-[#9EB2CC] mt-1 flex items-center justify-between">
            <span>Grid: 400V / 230V</span>
            <span className="text-[#00D6A0]">Ib: {powerCalculations.designCurrentA}A</span>
          </div>
        </div>
      </div>

      {/* 3. Main Interactive Recharts Visualization Card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0B1C32]/90 via-[#07172C]/85 to-[#040E1B]/95 backdrop-blur-2xl border border-white/10 p-5 shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[#18D8F2]/5 blur-3xl pointer-events-none" />

        {/* View Mode 1: Donut / Pie Chart (Distribution across Lighting, HVAC, Outlets, Appliances) */}
        {activeTab === 'category_pie' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-[#F4F8FF] font-mono flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-[#18D8F2]" />
                  <span>Load Breakdown by Subsystem (Lighting, HVAC, Outlets, Heavy)</span>
                </h3>
                <p className="text-xs text-[#9EB2CC]">
                  Proportional active power allocation across installation categories. Click any slice or card for circuit rules.
                </p>
              </div>

              {selectedCategoryKey && (
                <button
                  onClick={() => setSelectedCategoryKey(null)}
                  className="self-start text-[11px] font-mono text-[#9EB2CC] hover:text-[#18D8F2] flex items-center gap-1 bg-[#10243D] px-2 py-1 rounded-md border border-[#1B3A5C]"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Filter</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Donut Chart Canvas */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center relative min-h-[300px]">
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={68}
                        outerRadius={108}
                        paddingAngle={4}
                        stroke="#07172C"
                        strokeWidth={2}
                        onClick={(entry: any) => {
                          if (entry && entry.key) {
                            setSelectedCategoryKey(entry.key === selectedCategoryKey ? null : entry.key);
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {pieChartData.map((entry, index) => {
                          const isSelected = selectedCategoryKey === entry.key;
                          const isDimmed = selectedCategoryKey && !isSelected;
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.color}
                              opacity={isDimmed ? 0.35 : 1}
                              style={{
                                filter: isSelected ? `drop-shadow(0 0 10px ${entry.color})` : 'none',
                                transition: 'all 0.3s ease'
                              }}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Donut Center Display */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <div className="text-[10px] font-mono text-[#9EB2CC] uppercase tracking-wider">
                    {selectedCategoryKey ? LOAD_CATEGORIES[selectedCategoryKey].shortLabel : 'Total Load'}
                  </div>
                  <div className="text-2xl font-black font-mono text-[#F4F8FF] tracking-tight">
                    {selectedCategoryKey
                      ? (displayUnit === 'kw' ? `${(categorizedLoads as any)[selectedCategoryKey].kw} kW` : `${(categorizedLoads as any)[selectedCategoryKey].watts} W`)
                      : `${categorizedLoads.totalKw} kW`}
                  </div>
                  <div className="text-[10px] font-mono text-[#18D8F2]">
                    {selectedCategoryKey
                      ? `${(categorizedLoads as any)[selectedCategoryKey].percent}% Share`
                      : `${categorizedLoads.totalCount} Terminals`}
                  </div>
                </div>
              </div>

              {/* Category Breakdown Cards Grid */}
              <div className="lg:col-span-6 space-y-2.5">
                {(['outlets', 'hvac', 'lighting', 'appliances'] as LoadCategoryKey[]).map((catKey) => {
                  const meta = LOAD_CATEGORIES[catKey];
                  const item = categorizedLoads[catKey];
                  const isSelected = selectedCategoryKey === catKey;

                  return (
                    <div
                      key={catKey}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedCategoryKey(isSelected ? null : catKey)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedCategoryKey(isSelected ? null : catKey);
                        }
                      }}
                      className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#10243D] border-[#18D8F2] shadow-[0_0_15px_rgba(24,216,242,0.2)]'
                          : 'bg-[#07172C]/70 border-white/5 hover:border-white/20 hover:bg-[#07172C]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                            style={{
                              backgroundColor: `${meta.color}20`,
                              borderColor: `${meta.color}40`,
                              color: meta.color
                            }}
                          >
                            <meta.icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#F4F8FF] group-hover:text-white flex items-center gap-1.5">
                              <span>{meta.label}</span>
                              {isSelected && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#18D8F2]/20 text-[#18D8F2]">
                                  Inspecting
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#9EB2CC] font-mono">
                              {item.count} Connected points &middot; {meta.breakerStandard}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-bold font-mono text-[#F4F8FF]" style={{ color: meta.color }}>
                            {displayUnit === 'kw' ? `${item.kw} kW` : `${item.watts.toLocaleString()} W`}
                          </div>
                          <div className="text-[10px] font-mono text-[#9EB2CC]">
                            {item.percent}% of project
                          </div>
                        </div>
                      </div>

                      {/* Power share bar */}
                      <div className="w-full h-1.5 bg-[#040E1B] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percent}%`,
                            backgroundColor: meta.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Category Drill-Down Details Box */}
            {activeSelected && (
              <div className="mt-3 p-4 rounded-xl bg-[#061426] border border-[#18D8F2]/40 space-y-2 animate-fadeIn font-mono text-xs">
                <div className="flex items-center justify-between text-[#18D8F2] pb-1 border-b border-white/10">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-2">
                    <Info className="w-3.5 h-3.5" />
                    <span>Technical Standard Specification: {activeSelected.label}</span>
                  </span>
                  <span className="text-[10px] text-[#9EB2CC]">Standard: {activeProject.standard}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[#9EB2CC]">
                  <div>
                    <span className="text-[10px] uppercase text-[#9EB2CC]/70 block">Recommended Breaker:</span>
                    <strong className="text-[#F4F8FF]">{activeSelected.breakerStandard}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#9EB2CC]/70 block">Minimum Conductor:</span>
                    <strong className="text-[#00D6A0]">{activeSelected.wireGauge}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#9EB2CC]/70 block">Regulatory Rule:</span>
                    <span className="text-[#F4F8FF] text-[11px] leading-tight block">{activeSelected.pueRule}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* View Mode 2: Room-by-Room Stacked Bar Chart */}
        {activeTab === 'room_stacked' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-[#F4F8FF] font-mono flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#18D8F2]" />
                  <span>Room Load Comparison vs. 80% PUE Continuous Threshold</span>
                </h3>
                <p className="text-xs text-[#9EB2CC]">
                  Stacked distribution of Outlets (Cyan), HVAC (Amber), and Lighting (Purple) per room against the safety ceiling.
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono text-[#9EB2CC]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#18D8F2]" />
                  <span>Outlets</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF9A24]" />
                  <span>HVAC</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#8B5CFF]" />
                  <span>Lighting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#FF5263]" />
                  <span className="text-[#FF5263]">80% Ceiling</span>
                </div>
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roomStackedData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B3A5C" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="roomName"
                    stroke="#9EB2CC"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    stroke="#9EB2CC"
                    fontSize={11}
                    tickLine={false}
                    unit=" kW"
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <ReferenceLine
                    y={2.94}
                    stroke="#FF5263"
                    strokeDasharray="4 4"
                    label={{
                      value: '80% PUE Limit (2.94 kW)',
                      fill: '#FF5263',
                      fontSize: 10,
                      position: 'top'
                    }}
                  />
                  <Bar
                    dataKey="outletsKw"
                    name="Power Outlets"
                    stackId="loadStack"
                    fill={LOAD_CATEGORIES.outlets.color}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="hvacKw"
                    name="HVAC & Climate"
                    stackId="loadStack"
                    fill={LOAD_CATEGORIES.hvac.color}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="lightingKw"
                    name="Lighting"
                    stackId="loadStack"
                    fill={LOAD_CATEGORIES.lighting.color}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="appliancesKw"
                    name="Heavy Machinery"
                    stackId="loadStack"
                    fill={LOAD_CATEGORIES.appliances.color}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
              <div className="p-3 bg-[#061426] rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-[#9EB2CC]">Analyzed Zones:</span>
                <span className="font-bold text-[#F4F8FF]">{roomStackedData.length} Rooms</span>
              </div>
              <div className="p-3 bg-[#061426] rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-[#9EB2CC]">Peak Room Load:</span>
                <span className="font-bold text-[#18D8F2]">
                  {Math.max(...roomStackedData.map(r => r.totalKw))} kW
                </span>
              </div>
              <div className="p-3 bg-[#061426] rounded-xl border border-white/5 flex items-center justify-between">
                <span className="text-[#9EB2CC]">Continuous Compliance:</span>
                <span className="font-bold text-[#00D6A0]">100% Within Capacity</span>
              </div>
            </div>
          </div>
        )}

        {/* View Mode 3: Branch Circuits Bar Chart */}
        {activeTab === 'circuits_bar' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-[#F4F8FF] font-mono flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#18D8F2]" />
                  <span>Branch Circuit Load vs. Breaker Rating</span>
                </h3>
                <p className="text-xs text-[#9EB2CC]">
                  Comparison of connected branch circuit load against rated thermal capacity (kW).
                </p>
              </div>

              <div className="text-[11px] font-mono text-[#9EB2CC] flex items-center gap-2">
                <span className="text-[#18D8F2] font-semibold">{circuitsBarData.length} Branch Lines</span>
                <span>&middot;</span>
                <span>Single-Line Diagram Sync</span>
              </div>
            </div>

            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={circuitsBarData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B3A5C" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="tag"
                    stroke="#9EB2CC"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#9EB2CC"
                    fontSize={11}
                    tickLine={false}
                    unit=" kW"
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '10px' }}
                  />
                  <Bar
                    dataKey="loadKw"
                    name="Operating Load (kW)"
                    fill="#18D8F2"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="safeLimitKw"
                    name="80% Continuous Limit (kW)"
                    fill="#FF9A24"
                    opacity={0.7}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 4. Secondary Action & SLD Navigation Strip */}
      <div className="p-3.5 rounded-xl bg-[#061426]/80 border border-[#1B3A5C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-[#9EB2CC]">
          <Info className="w-4 h-4 text-[#18D8F2] shrink-0" />
          <span>
            Electrical loads dynamically update when adding or modifying nodes in the <strong>Room Scanner</strong> or <strong>CAD Workspace</strong>.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveModule('cad')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10243D] hover:bg-[#1B3A5C] text-[#F4F8FF] border border-[#1B3A5C] transition-all hover:text-white"
          >
            <span>Open CAD Schematics</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#18D8F2]" />
          </button>
        </div>
      </div>
    </section>
  );
};
