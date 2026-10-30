import React from 'react';
import { 
  Box, 
  Wrench, 
  Server, 
  Cpu, 
  Calculator, 
  ArrowRight, 
  Activity, 
  Zap, 
  ShieldCheck, 
  FolderGit2, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Play
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ProjectStatistics } from './ProjectStatistics';
import { ModuleCard, ModuleCardData } from './ModuleCard';
import { RecentActivityFeed } from './RecentActivityFeed';
import { EngineeringChartsSection } from './EngineeringChartsSection';
import { ActiveProjectsSummary } from './ActiveProjectsSummary';

export const Dashboard: React.FC = () => {
  const { 
    t, 
    activeProject, 
    setActiveModule, 
    powerCalculations, 
    formatCurrency, 
    needsRecalculation, 
    recalculatePower 
  } = useProject();

  // Calculate synchronized BOM grand total
  const materialsTotalUzs = activeProject.materials.reduce((acc, item) => {
    const lineTotal = item.quantity * item.unitPriceUzS * (1 + item.wastePercent / 100);
    return acc + lineTotal;
  }, 0);
  const laborTotalUzs = activeProject.laborRatePerDayUzs * 5; // 5 days estimated
  const grandTotalUzs = (materialsTotalUzs + laborTotalUzs) * (1 + activeProject.contingencyPercent / 100);

  const modules: ModuleCardData[] = [
    {
      id: 'scanner',
      num: '01',
      title: t.nav.roomScanner,
      tag: 'AI Architectural Scanner',
      desc: t.dashboard.modules.scannerDesc,
      icon: Box,
      accentColor: '#18D8F2',
      glowColor: 'rgba(24, 216, 242, 0.4)',
      borderColor: '#18D8F2',
      illustrationImage: '/src/assets/images/dashboard_3d_blueprint_1792251187220.jpg',
      illustrationAlt: '3D Room Scanner Architecture Blueprint',
      stats: `${activeProject.roomData.points.length} Electrical Nodes`,
      secondaryStats: {
        label: 'Area',
        value: `${activeProject.roomData.lengthMeters}×${activeProject.roomData.widthMeters}m`
      }
    },
    {
      id: 'installation',
      num: '02',
      title: t.nav.installation,
      tag: 'Augmented Reality Routing',
      desc: t.dashboard.modules.installDesc,
      icon: Wrench,
      accentColor: '#00D6A0',
      glowColor: 'rgba(0, 214, 160, 0.4)',
      borderColor: '#00D6A0',
      illustrationImage: '/src/assets/images/ar_installation_scan_1792251187804.jpg',
      illustrationAlt: 'AR Electrical Installation Cable Routing',
      stats: `${activeProject.cableRoutes.length} Conduit Runs`,
      secondaryStats: {
        label: 'Length',
        value: `${activeProject.cableRoutes.reduce((a, b) => a + b.lengthMeters, 0).toFixed(1)}m`
      }
    },
    {
      id: 'panel',
      num: '03',
      title: t.nav.panelBuilder,
      tag: '3D Enclosure Assembly',
      desc: t.dashboard.modules.panelDesc,
      icon: Server,
      accentColor: '#FF9A24',
      glowColor: 'rgba(255, 154, 36, 0.4)',
      borderColor: '#FF9A24',
      illustrationImage: '/src/assets/images/smart_panel_cabinet_1792251188830.jpg',
      illustrationAlt: '3D Smart Panel Cabinet Enclosure',
      stats: `${activeProject.panelComponents.length} DIN Devices`,
      secondaryStats: {
        label: 'Enclosure',
        value: activeProject.panelEnclosure.ipRating
      }
    },
    {
      id: 'cad',
      num: '04',
      title: t.nav.electricalCad,
      tag: 'Deterministic Power Flow',
      desc: t.dashboard.modules.cadDesc,
      icon: Cpu,
      accentColor: '#8B5CFF',
      glowColor: 'rgba(139, 92, 255, 0.4)',
      borderColor: '#8B5CFF',
      illustrationImage: '/src/assets/images/cad_power_analysis_1792253197079.jpg',
      illustrationAlt: 'Single Line Diagram and Power Flow Analysis CAD',
      stats: `${powerCalculations.totalActivePowerKw} kW Connected`,
      secondaryStats: {
        label: 'ΔU Max',
        value: `${Math.max(...powerCalculations.circuitCalculations.map(c => c.voltageDropPercent), 0).toFixed(2)}%`
      }
    },
    {
      id: 'calculations',
      num: '05',
      title: t.nav.calculations,
      tag: 'PUE / IEC Verified Formulas',
      desc: 'Voltage drop, cable sizing derating, ground loop resistance, short-circuit trip verification and phase imbalance.',
      icon: Zap,
      accentColor: '#FF5263',
      glowColor: 'rgba(255, 82, 99, 0.4)',
      borderColor: '#FF5263',
      illustrationImage: '/src/assets/images/cad_power_analysis_1792253197079.jpg',
      illustrationAlt: 'Cable Sizing and Electrical Power Calculations',
      stats: `${activeProject.calculations?.length || 3} Verified Benchmarks`,
      secondaryStats: {
        label: 'Compliance',
        value: 'PUE 7.1'
      }
    },
    {
      id: 'estimator',
      num: '06',
      title: t.nav.materialEstimator,
      tag: 'Synchronized BOM Engine',
      desc: t.dashboard.modules.estimatorDesc,
      icon: Calculator,
      accentColor: '#147DFF',
      glowColor: 'rgba(20, 125, 255, 0.4)',
      borderColor: '#147DFF',
      illustrationImage: '/src/assets/images/material_estimator_bom_1792253197044.jpg',
      illustrationAlt: 'Electrical Material Estimator Bill of Materials',
      stats: `${activeProject.materials.length} Synchronized Items`,
      secondaryStats: {
        label: 'Total',
        value: formatCurrency(grandTotalUzs)
      }
    }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Notice Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#10243D]/80 border border-[#1B3A5C] rounded-xl text-xs text-[#9EB2CC]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#00D6A0]" />
          <span>{t.dashboard.sampleDataNotice}</span>
          <span className="text-[#18D8F2] font-semibold">[{activeProject.name}]</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span>Standard: <strong className="text-[#F4F8FF]">{activeProject.standard}</strong></span>
          <span>·</span>
          <span>Last modified: {activeProject.updatedAt}</span>
        </div>
      </div>

      {/* Hero Showcase Section with Visual 3D Blueprint */}
      <div className="relative rounded-2xl overflow-hidden border border-[#1B3A5C] bg-gradient-to-r from-[#061426] via-[#0B1C32] to-[#061426] shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
          {/* Left Text Zone */}
          <div className="lg:col-span-7 p-8 z-10 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-[#18D8F2] tracking-wider uppercase">
                <Zap className="w-3.5 h-3.5" />
                <span>Next-Gen Electrical Engineering Suite</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F4F8FF] tracking-tight leading-tight">
                {t.dashboard.welcome}
              </h1>
              <p className="text-sm text-[#9EB2CC] max-w-xl leading-relaxed">
                {t.dashboard.subtitle} Seamlessly transition from 3D architectural scanning to DIN-rail assembly, power flow simulation, and live BOM generation.
              </p>
            </div>

            {/* Quick Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-[#1B3A5C]/60">
              <div className="bg-[#061426]/70 p-3 rounded-xl border border-[#1B3A5C]">
                <div className="text-[10px] text-[#9EB2CC] uppercase font-mono">{t.dashboard.stats.totalLoad}</div>
                <div className="text-lg font-extrabold text-[#F4F8FF] font-mono tabular-nums">
                  {powerCalculations.totalActivePowerKw} <span className="text-xs font-normal text-[#9EB2CC]">kW</span>
                </div>
              </div>

              <div className="bg-[#061426]/70 p-3 rounded-xl border border-[#1B3A5C]">
                <div className="text-[10px] text-[#9EB2CC] uppercase font-mono">{t.dashboard.stats.totalCircuits}</div>
                <div className="text-lg font-extrabold text-[#18D8F2] font-mono tabular-nums">
                  {activeProject.cadCircuits.length} <span className="text-xs font-normal text-[#9EB2CC]">Groups</span>
                </div>
              </div>

              <div className="bg-[#061426]/70 p-3 rounded-xl border border-[#1B3A5C]">
                <div className="text-[10px] text-[#9EB2CC] uppercase font-mono">{t.dashboard.stats.voltageDropMax}</div>
                <div className="text-lg font-extrabold text-[#00D6A0] font-mono tabular-nums">
                  {Math.max(...powerCalculations.circuitCalculations.map(c => c.voltageDropPercent), 0).toFixed(2)}%
                </div>
              </div>

              <div className="bg-[#061426]/70 p-3 rounded-xl border border-[#1B3A5C]">
                <div className="text-[10px] text-[#9EB2CC] uppercase font-mono">{t.dashboard.stats.phaseBalance}</div>
                <div className="text-lg font-extrabold text-[#FF9A24] font-mono tabular-nums">
                  {powerCalculations.phaseBalanceUnbalancePercent}%
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={() => setActiveModule('scanner')}
                className="px-4 py-2 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white text-xs font-bold rounded-xl shadow-lg shadow-[#147DFF]/25 flex items-center gap-2 transition-all hover:translate-x-0.5"
              >
                <span>Launch 3D Room Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setActiveModule('cad')}
                className="px-4 py-2 bg-[#10243D] hover:bg-[#10243D]/90 border border-[#1B3A5C] text-[#F4F8FF] text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
              >
                <Cpu className="w-4 h-4 text-[#8B5CFF]" />
                <span>Run IEC Load Flow</span>
              </button>

              <button
                onClick={() => setActiveModule('reports')}
                className="px-4 py-2 bg-[#10243D] hover:bg-[#10243D]/90 border border-[#1B3A5C] text-[#9EB2CC] hover:text-[#F4F8FF] text-xs font-medium rounded-xl flex items-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Project Reports</span>
              </button>
            </div>
          </div>

          {/* Right Visual Image */}
          <div className="lg:col-span-5 h-full min-h-[300px] relative overflow-hidden border-t lg:border-t-0 lg:border-l border-[#1B3A5C]">
            <img
              src="/src/assets/images/dashboard_3d_blueprint_1792251187220.jpg"
              alt="ElectroVision 3D Electrical Blueprint"
              className="w-full h-full object-cover min-h-[340px] transform hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061426] via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-4 left-4 right-4 p-3 bg-[#061426]/85 backdrop-blur-md rounded-xl border border-[#1B3A5C] flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#F4F8FF]">3D Spatial BIM Visualizer</div>
                <div className="text-[10px] text-[#9EB2CC] font-mono">Conduit & Terminal Routing active</div>
              </div>
              <button
                onClick={() => setActiveModule('installation')}
                className="px-3 py-1 bg-[#18D8F2]/20 hover:bg-[#18D8F2]/30 text-[#18D8F2] text-xs font-semibold rounded-lg border border-[#18D8F2]/40 transition-colors"
              >
                AR Mode
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Electrical Projects Portfolio Summary & Creation Hub */}
      <ActiveProjectsSummary />

      {/* Key Project Engineering Statistics */}
      <ProjectStatistics />

      {/* Five Coordinated Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-[#F4F8FF] tracking-tight">Core Engineering Workspaces</h2>
            <p className="text-xs text-[#9EB2CC]">Five fully coordinated modules sharing live architectural and electrical parameters.</p>
          </div>
          {needsRecalculation && (
            <button
              onClick={recalculatePower}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#FF9A24]/20 border border-[#FF9A24]/40 text-[#FF9A24] text-xs font-semibold rounded-lg animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Recalculation Required</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {modules.map((m) => (
            <ModuleCard
              key={m.id}
              module={m}
              onClick={(id) => setActiveModule(id as any)}
            />
          ))}
        </div>
      </div>

      {/* Secondary Project Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Scope & Engineering Details */}
        <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-[#147DFF]" />
              <span>Project Technical Specification</span>
            </h3>
            <span className="text-[10px] font-mono text-[#00D6A0] bg-[#00D6A0]/15 px-2 py-0.5 rounded border border-[#00D6A0]/30">
              IEC / GOST Ready
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B3A5C]/60">
              <span className="text-[#9EB2CC]">Project Name</span>
              <span className="font-semibold text-[#F4F8FF]">{activeProject.name}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B3A5C]/60">
              <span className="text-[#9EB2CC]">Location</span>
              <span className="font-mono text-[#F4F8FF]">{activeProject.location}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B3A5C]/60">
              <span className="text-[#9EB2CC]">Client</span>
              <span className="font-medium text-[#F4F8FF]">{activeProject.client}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B3A5C]/60">
              <span className="text-[#9EB2CC]">Lead Electrical Engineer</span>
              <span className="font-semibold text-[#18D8F2]">{activeProject.leadEngineer}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#1B3A5C]/60">
              <span className="text-[#9EB2CC]">Design Standard</span>
              <span className="font-mono text-[#00D6A0]">{activeProject.standard}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[#9EB2CC]">Distribution Enclosure</span>
              <span className="font-mono text-[#FF9A24]">{activeProject.panelEnclosure.model}</span>
            </div>
          </div>
        </div>

        {/* Phase Balance & Power Metrics */}
        <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8B5CFF]" />
              <span>3-Phase Load Balance Breakdown</span>
            </h3>
            <span className="text-[10px] font-mono text-[#9EB2CC]">
              Target &lt; 15%
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#9EB2CC] font-mono">Phase L1 (Brown)</span>
                <span className="font-mono font-bold text-[#F4F8FF]">{powerCalculations.phaseLoadsKw.L1} kW</span>
              </div>
              <div className="w-full h-2 bg-[#061426] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#8B5CFF] rounded-full" 
                  style={{ width: `${Math.min(100, (powerCalculations.phaseLoadsKw.L1 / (powerCalculations.totalActivePowerKw || 1)) * 100 * 2.5)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#9EB2CC] font-mono">Phase L2 (Black)</span>
                <span className="font-mono font-bold text-[#F4F8FF]">{powerCalculations.phaseLoadsKw.L2} kW</span>
              </div>
              <div className="w-full h-2 bg-[#061426] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#18D8F2] rounded-full" 
                  style={{ width: `${Math.min(100, (powerCalculations.phaseLoadsKw.L2 / (powerCalculations.totalActivePowerKw || 1)) * 100 * 2.5)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#9EB2CC] font-mono">Phase L3 (Grey)</span>
                <span className="font-mono font-bold text-[#F4F8FF]">{powerCalculations.phaseLoadsKw.L3} kW</span>
              </div>
              <div className="w-full h-2 bg-[#061426] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#FF9A24] rounded-full" 
                  style={{ width: `${Math.min(100, (powerCalculations.phaseLoadsKw.L3 / (powerCalculations.totalActivePowerKw || 1)) * 100 * 2.5)}%` }}
                />
              </div>
            </div>

            <div className="p-3 bg-[#061426] rounded-xl border border-[#1B3A5C] flex items-center justify-between text-xs font-mono">
              <span className="text-[#9EB2CC]">Calculated Phase Asymmetry:</span>
              <span className={`font-bold ${powerCalculations.phaseBalanceUnbalancePercent > 15 ? 'text-[#FF5263]' : 'text-[#00D6A0]'}`}>
                {powerCalculations.phaseBalanceUnbalancePercent}% ({powerCalculations.phaseBalanceUnbalancePercent > 15 ? 'Excessive' : 'Optimal'})
              </span>
            </div>
          </div>
        </div>

        {/* Bill of Materials Summary */}
        <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#00D6A0]" />
                <span>Synchronized Cost Estimate</span>
              </h3>
              <button
                onClick={() => setActiveModule('estimator')}
                className="text-[10px] text-[#147DFF] hover:underline font-mono"
              >
                View Full BOM
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#1B3A5C]/60">
                <span className="text-[#9EB2CC]">Material Take-Off Items</span>
                <span className="font-mono text-[#F4F8FF]">{activeProject.materials.length} Line items</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#1B3A5C]/60">
                <span className="text-[#9EB2CC]">Materials Subtotal</span>
                <span className="font-mono font-semibold text-[#F4F8FF]">{formatCurrency(materialsTotalUzs)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#1B3A5C]/60">
                <span className="text-[#9EB2CC]">Labor & Workmanship (5 days)</span>
                <span className="font-mono text-[#9EB2CC]">{formatCurrency(laborTotalUzs)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#1B3A5C]/60">
                <span className="text-[#9EB2CC]">Contingency Reserve ({activeProject.contingencyPercent}%)</span>
                <span className="font-mono text-[#9EB2CC]">{formatCurrency((materialsTotalUzs + laborTotalUzs) * (activeProject.contingencyPercent / 100))}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#061426] rounded-xl border border-[#147DFF]/30 flex items-center justify-between">
            <span className="text-xs text-[#9EB2CC] uppercase font-mono font-semibold">Grand Total:</span>
            <span className="text-base font-extrabold text-[#00D6A0] font-mono tabular-nums">
              {formatCurrency(grandTotalUzs)}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Load & Cost Engineering Charts (Recharts) */}
      <EngineeringChartsSection />

      {/* Real-time Engineering Activity Feed */}
      <RecentActivityFeed />
    </div>
  );
};
