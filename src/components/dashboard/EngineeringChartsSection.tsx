import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Zap, 
  ShieldCheck, 
  PieChart as PieIcon, 
  BarChart3, 
  Sparkles, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Info,
  Maximize2,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { compileItemizedRoomLoads } from '../../lib/pdf-report';

const COST_PALETTE: Record<string, string> = {
  cables: '#3b8cff',
  conduits: '#fb923c',
  sockets_switches: '#4bc8dc',
  lighting: '#818cf8',
  panel_equipment: '#e9b663',
  protection: '#f43f5e',
  mounting: '#94a3b8',
  tools: '#64748b',
  labor: '#c084fc',
};

const LOAD_COLORS = {
  outlets: '#4bc8dc', // Cyan
  hvac: '#fb923c',    // Orange
  lighting: '#818cf8',// Indigo
  other: '#37c99b',   // Emerald
  threshold: '#ef4444'// Red for 80% ceiling
};

export const EngineeringChartsSection: React.FC = () => {
  const { 
    activeProject, 
    currency, 
    formatCurrency, 
    openAiModal, 
    downloadProjectPdf 
  } = useProject();

  const [chartMode, setChartMode] = useState<'stacked' | 'total'>('stacked');
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);
  const [selectedCostCategory, setSelectedCostCategory] = useState<string | null>(null);

  // Compile room load data
  const roomLoadData = useMemo(() => {
    const compiled = compileItemizedRoomLoads(activeProject);
    return compiled.loads.map(r => ({
      name: r.roomName,
      outlets: r.outletsKw,
      hvac: r.hvacKw,
      lighting: r.lightsKw,
      other: r.otherKw,
      total: r.totalLoadKw,
      capacity: r.capacityKw,
      safeThreshold: Number((r.capacityKw * 0.8).toFixed(2)),
      ratio: r.ratioPercent,
      status: r.status,
      compliance: r.complianceRule,
      area: r.areaM2,
      points: r.pointsCount,
    }));
  }, [activeProject]);

  // Compile cost breakdown data
  const costBreakdownData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    activeProject.materials.forEach(m => {
      const cat = m.category || 'other';
      const cost = m.quantity * m.unitPriceUzS * (1 + m.wastePercent / 100);
      categoryTotals[cat] = (categoryTotals[cat] || 0) + cost;
    });

    // Add estimated labor cost
    const laborCost = activeProject.laborRatePerDayUzs * 5;
    categoryTotals['labor'] = laborCost;

    const totalSum = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(categoryTotals).map(([cat, total]) => {
      const label = cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      const percent = Math.round((total / totalSum) * 1000) / 10;
      return {
        key: cat,
        name: label,
        value: Math.round(total),
        percent,
        color: COST_PALETTE[cat] || '#64748b',
      };
    }).sort((a, b) => b.value - a.value);
  }, [activeProject]);

  const lastAudit = activeProject.lastAudit;

  return (
    <div className="space-y-6">
      {/* AI Safety Compliance & PDF Quick-Bar Banner */}
      <div className="p-5 bg-gradient-to-r from-[#0B1C32] via-[#061426] to-[#0B1C32] border border-[#1B3A5C] rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-start sm:items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-lg border shrink-0 ${
            lastAudit
              ? lastAudit.safetyScore >= 85
                ? 'bg-[#00D6A0]/15 border-[#00D6A0]/40 text-[#00D6A0]'
                : lastAudit.safetyScore >= 70
                  ? 'bg-[#FF9A24]/15 border-[#FF9A24]/40 text-[#FF9A24]'
                  : 'bg-[#FF5263]/15 border-[#FF5263]/40 text-[#FF5263]'
              : 'bg-[#18D8F2]/15 border-[#18D8F2]/40 text-[#18D8F2]'
          }`}>
            {lastAudit ? `${lastAudit.safetyScore}%` : 'AI'}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#F4F8FF]">
                {lastAudit ? 'PUE 7.1 Electrical Safety Certification' : 'Electrical Safety & Code Audit Engine'}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#061426] text-[#00D6A0] border border-[#00D6A0]/30 font-bold">
                {lastAudit ? 'AUDIT VERIFIED' : 'READY TO ANALYZE'}
              </span>
            </div>
            <p className="text-xs text-[#9EB2CC] mt-0.5">
              {lastAudit 
                ? lastAudit.summary
                : 'Run an autonomous safety audit to mathematically test for thermal ampacity overloads, neutral conductor sizing, and wet area protection.'
              }
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => openAiModal('audit')}
            className="px-4 py-2 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:opacity-95 text-[#030B18] rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#18D8F2]/25 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{lastAudit ? 'Re-Run AI Audit' : 'Launch AI Audit'}</span>
          </button>

          <button
            onClick={downloadProjectPdf}
            className="px-4 py-2 bg-[#10243D] hover:bg-[#1B3A5C] border border-[#1B3A5C] text-[#F4F8FF] rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            title="Download full multi-page PDF certificate"
          >
            <Download className="w-4 h-4 text-[#18D8F2]" />
            <span>Export Certified PDF</span>
          </button>
        </div>
      </div>

      {/* Interactive Charts Dual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Interactive Room Electrical Load (Stacked BarChart) */}
        <div className="lg:col-span-7 bg-[#0B1C32] border border-[#1B3A5C] rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1B3A5C]/60">
              <div>
                <h3 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider font-mono flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#18D8F2]" />
                  <span>Room Load Breakdown & 80% Safety Ceiling</span>
                </h3>
                <p className="text-[11px] text-[#9EB2CC]">
                  PUE 7.1 continuous duty limit (3.68 kW breaker at 230V / 2.94 kW safety threshold)
                </p>
              </div>

              {/* Mode Toggle Button */}
              <div className="flex items-center gap-1 p-1 bg-[#061426] border border-[#1B3A5C] rounded-lg self-start sm:self-auto">
                <button
                  onClick={() => setChartMode('stacked')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                    chartMode === 'stacked' ? 'bg-[#147DFF] text-white' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                  }`}
                >
                  Segmented
                </button>
                <button
                  onClick={() => setChartMode('total')}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
                    chartMode === 'total' ? 'bg-[#147DFF] text-white' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                  }`}
                >
                  Consolidated
                </button>
              </div>
            </div>

            {/* Recharts Container */}
            <div className="h-64 sm:h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={roomLoadData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                  onClick={(state: any) => {
                    if (state?.activePayload && state.activePayload.length > 0) {
                      setSelectedRoom(state.activePayload[0].payload);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1B3A5C" opacity={0.6} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9EB2CC" 
                    fontSize={11} 
                    tickLine={false} 
                    interval={0}
                    tick={{ fill: '#9EB2CC' }}
                  />
                  <YAxis 
                    stroke="#9EB2CC" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(v) => `${v} kW`}
                    tick={{ fill: '#9EB2CC' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#061426] border border-[#1B3A5C] rounded-xl p-3 shadow-2xl text-xs space-y-1.5 z-50">
                          <div className="font-bold text-[#F4F8FF] border-b border-[#1B3A5C] pb-1 flex justify-between gap-4">
                            <span>{d.name}</span>
                            <span className="font-mono text-[#18D8F2]">{d.total} kW</span>
                          </div>
                          <div className="space-y-1 font-mono text-[11px]">
                            <div className="flex justify-between gap-3 text-[#4bc8dc]">
                              <span>Sockets:</span>
                              <span>{d.outlets} kW</span>
                            </div>
                            <div className="flex justify-between gap-3 text-[#fb923c]">
                              <span>HVAC / Heavy:</span>
                              <span>{d.hvac} kW</span>
                            </div>
                            <div className="flex justify-between gap-3 text-[#818cf8]">
                              <span>Lighting:</span>
                              <span>{d.lighting} kW</span>
                            </div>
                            <div className="flex justify-between gap-3 text-[#ef4444] border-t border-[#1B3A5C] pt-1">
                              <span>80% Safe Limit:</span>
                              <span>{d.safeThreshold} kW</span>
                            </div>
                          </div>
                          <div className={`text-[10px] font-bold ${d.ratio >= 80 ? 'text-[#FF5263]' : 'text-[#00D6A0]'}`}>
                            {d.compliance}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                    formatter={(val) => <span style={{ color: '#9EB2CC' }}>{val}</span>}
                  />

                  {chartMode === 'stacked' ? (
                    <>
                      <Bar dataKey="outlets" name="Outlets & Plugs" stackId="a" fill={LOAD_COLORS.outlets} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="hvac" name="HVAC & Heavy" stackId="a" fill={LOAD_COLORS.hvac} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="lighting" name="Lighting" stackId="a" fill={LOAD_COLORS.lighting} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="safeThreshold" name="80% Safety Ceiling" fill={LOAD_COLORS.threshold} opacity={0.3} radius={[2, 2, 0, 0]} />
                    </>
                  ) : (
                    <>
                      <Bar dataKey="total" name="Total Load" fill="#147DFF" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="safeThreshold" name="80% Safety Ceiling" fill="#ef4444" opacity={0.4} radius={[4, 4, 0, 0]} />
                    </>
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#1B3A5C]/60 text-xs text-[#9EB2CC]">
            <span>Click any room bar to inspect connected nodes and continuous duty ratio</span>
            <span className="font-mono text-[#00D6A0] font-semibold">
              Total Building Load: {roomLoadData.reduce((a, b) => a + b.total, 0).toFixed(2)} kW
            </span>
          </div>
        </div>

        {/* Chart 2: Cost Breakdown Donut Chart */}
        <div className="lg:col-span-5 bg-[#0B1C32] border border-[#1B3A5C] rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]/60">
              <h3 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider font-mono flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-[#00D6A0]" />
                <span>Expenditure Breakdown by Trade</span>
              </h3>
              <span className="text-[10px] font-mono text-[#00D6A0] bg-[#00D6A0]/15 px-2 py-0.5 rounded border border-[#00D6A0]/30 font-bold">
                Live BOM
              </span>
            </div>

            {/* Donut Chart */}
            <div className="h-56 sm:h-60 w-full pt-2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(data: any) => {
                      if (data && data.key) {
                        setSelectedCostCategory(String(data.key));
                      }
                    }}
                  >
                    {costBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#061426" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#061426] border border-[#1B3A5C] rounded-xl p-2.5 shadow-2xl text-xs space-y-1">
                          <div className="font-bold text-[#F4F8FF] flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span>{d.name}</span>
                          </div>
                          <div className="font-mono text-[11px] text-[#00D6A0] font-bold">
                            {formatCurrency(d.value)} ({d.percent}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-[#9EB2CC] font-mono uppercase">Total BOM</span>
                <span className="text-xs font-black text-[#F4F8FF] font-mono">
                  {formatCurrency(costBreakdownData.reduce((a, b) => a + b.value, 0)).split(' ')[0]}
                </span>
                <span className="text-[9px] text-[#9EB2CC] font-mono">{currency}</span>
              </div>
            </div>

            {/* Top Categories Legend Pills */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {costBreakdownData.slice(0, 6).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedCostCategory(item.key)}
                  className="p-2 bg-[#061426]/70 hover:bg-[#10243D] border border-[#1B3A5C] rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[#9EB2CC] text-[11px] truncate">{item.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#F4F8FF] font-bold shrink-0">{item.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-[#9EB2CC] font-mono pt-2 border-t border-[#1B3A5C]/60 flex items-center justify-between">
            <span>Includes 5-day installation labor & waste factor</span>
            <span className="text-[#147DFF] hover:underline cursor-pointer" onClick={downloadProjectPdf}>
              Export Take-Off Sheet
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Room Inspection Drawer Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0B1C32] border border-[#147DFF] rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
              <div>
                <span className="text-[10px] font-mono text-[#18D8F2] uppercase font-bold">Room Electrical Telemetry</span>
                <h4 className="text-base font-bold text-[#F4F8FF]">{selectedRoom.name}</h4>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="p-1 text-[#9EB2CC] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
              <div className="p-2.5 bg-[#061426] border border-[#1B3A5C] rounded-xl">
                <span className="text-[10px] text-[#9EB2CC]">Connected Load</span>
                <div className="text-sm font-bold text-[#18D8F2]">{selectedRoom.total} kW</div>
              </div>
              <div className="p-2.5 bg-[#061426] border border-[#1B3A5C] rounded-xl">
                <span className="text-[10px] text-[#9EB2CC]">Continuous Limit</span>
                <div className="text-sm font-bold text-[#00D6A0]">{selectedRoom.safeThreshold} kW</div>
              </div>
              <div className="p-2.5 bg-[#061426] border border-[#1B3A5C] rounded-xl">
                <span className="text-[10px] text-[#9EB2CC]">Duty Ratio</span>
                <div className={`text-sm font-bold ${selectedRoom.ratio >= 80 ? 'text-[#FF5263]' : 'text-[#00D6A0]'}`}>
                  {selectedRoom.ratio}%
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#1B3A5C]">
                <span className="text-[#9EB2CC]">Floor Area:</span>
                <span className="text-[#F4F8FF] font-mono">{selectedRoom.area} m²</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B3A5C]">
                <span className="text-[#9EB2CC]">Electrical Point Count:</span>
                <span className="text-[#F4F8FF] font-mono">{selectedRoom.points} points</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B3A5C]">
                <span className="text-[#9EB2CC]">Socket Receptacles:</span>
                <span className="text-[#4bc8dc] font-mono">{selectedRoom.outlets} kW</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B3A5C]">
                <span className="text-[#9EB2CC]">HVAC / Heavy Appliance:</span>
                <span className="text-[#fb923c] font-mono">{selectedRoom.hvac} kW</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#9EB2CC]">Luminaires:</span>
                <span className="text-[#818cf8] font-mono">{selectedRoom.lighting} kW</span>
              </div>
            </div>

            <div className="p-3 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs flex items-center justify-between">
              <span className="text-[#9EB2CC]">PUE 7.1 Compliance:</span>
              <span className={`font-bold ${selectedRoom.ratio >= 80 ? 'text-[#FF5263]' : 'text-[#00D6A0]'}`}>
                {selectedRoom.compliance}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedRoom(null)}
                className="px-4 py-2 bg-[#10243D] hover:bg-[#1B3A5C] text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Category Inspection Drawer Modal */}
      {selectedCostCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0B1C32] border border-[#00D6A0] rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
              <div>
                <span className="text-[10px] font-mono text-[#00D6A0] uppercase font-bold">Category Take-Off Breakdown</span>
                <h4 className="text-base font-bold text-[#F4F8FF] capitalize">{selectedCostCategory.replace('_', ' ')}</h4>
              </div>
              <button onClick={() => setSelectedCostCategory(null)} className="p-1 text-[#9EB2CC] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
              {activeProject.materials.filter(m => m.category === selectedCostCategory).map(item => (
                <div key={item.id} className="p-2.5 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs flex justify-between items-center">
                  <div className="truncate pr-2">
                    <div className="font-bold text-[#F4F8FF] truncate">{item.name}</div>
                    <span className="text-[10px] text-[#9EB2CC] font-mono">{item.specification}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-[#00D6A0]">
                      {formatCurrency(item.quantity * item.unitPriceUzS * (1 + item.wastePercent / 100))}
                    </div>
                    <span className="text-[10px] text-[#9EB2CC] font-mono">{item.quantity} {item.unit}</span>
                  </div>
                </div>
              ))}

              {activeProject.materials.filter(m => m.category === selectedCostCategory).length === 0 && (
                <div className="p-4 text-center text-xs text-[#9EB2CC]">
                  {selectedCostCategory === 'labor' ? '5 days installation labor calculated by day rate' : 'No custom items in this category'}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCostCategory(null)}
                className="px-4 py-2 bg-[#10243D] hover:bg-[#1B3A5C] text-white rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
