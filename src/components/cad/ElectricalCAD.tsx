import React, { useState } from 'react';
import { 
  Cpu, 
  Save, 
  Play, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Compass, 
  Activity, 
  Sliders, 
  HelpCircle,
  FileText,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { CADCircuit } from '../../types';
import { Modal } from '../common/Modal';

export const ElectricalCAD: React.FC = () => {
  const { 
    activeProject, 
    updateActiveProject, 
    powerCalculations, 
    recalculatePower, 
    t, 
    triggerSave, 
    saveStatus,
    addActivityLog,
    openTemplatesModal
  } = useProject();

  const [cadView, setCadView] = useState<'sld' | 'calculations' | 'schematic'>('sld');
  const [selectedCircuitId, setSelectedCircuitId] = useState<string | null>(activeProject.cadCircuits[0]?.id || null);
  const [isNewCircuitModalOpen, setIsNewCircuitModalOpen] = useState(false);

  // New circuit form state
  const [newTag, setNewTag] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhase, setNewPhase] = useState<'L1' | 'L2' | 'L3' | '3P'>('L1');
  const [newVoltage, setNewVoltage] = useState<230 | 400>(230);
  const [newPower, setNewPower] = useState(1500);
  const [newLength, setNewLength] = useState(25);
  const [newSection, setNewSection] = useState(2.5);
  const [newBreaker, setNewBreaker] = useState(16);

  const circuits = activeProject.cadCircuits;
  const selectedCircuit = circuits.find(c => c.id === selectedCircuitId) || circuits[0];
  const selectedCalc = powerCalculations.circuitCalculations.find(c => c.circuitId === selectedCircuit?.id);

  const handleUpdateCircuit = (field: keyof CADCircuit, val: any) => {
    if (!selectedCircuit) return;
    updateActiveProject(prev => ({
      ...prev,
      cadCircuits: prev.cadCircuits.map(c => 
        c.id === selectedCircuit.id ? { ...c, [field]: val } : c
      )
    }));
  };

  const handleAddCircuit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCircuit: CADCircuit = {
      id: `c-${Date.now()}`,
      tag: newTag || `QF${circuits.length + 1}`,
      name: newName || "New Electrical Feeder",
      phase: newPhase,
      supplyVoltage: newVoltage,
      powerWatts: Number(newPower),
      powerFactor: 0.92,
      cableLengthMeters: Number(newLength),
      conductor: "Cu",
      crossSectionMm2: Number(newSection),
      cableType: `VVGng-LS ${newVoltage === 400 ? '5x' : '3x'}${newSection}`,
      installMethod: "conduit",
      breakerRatingA: Number(newBreaker)
    };

    updateActiveProject(prev => ({
      ...prev,
      cadCircuits: [...prev.cadCircuits, newCircuit]
    }));
    addActivityLog({
      action: 'Updated CAD Drawing',
      details: `Added new circuit branch ${newCircuit.tag} (${newCircuit.name}) — ${newCircuit.powerWatts}W on ${newCircuit.phase}`,
      category: 'cad',
      status: 'completed',
      user: 'Olimjon K.',
      moduleTarget: 'cad'
    });
    setSelectedCircuitId(newCircuit.id);
    setIsNewCircuitModalOpen(false);
  };

  const handleDeleteCircuit = (id: string) => {
    if (circuits.length <= 1) return;
    updateActiveProject(prev => ({
      ...prev,
      cadCircuits: prev.cadCircuits.filter(c => c.id !== id)
    }));
    setSelectedCircuitId(circuits.find(c => c.id !== id)?.id || null);
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#061426] border border-[#1B3A5C] rounded-xl shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CFF]" />
            <h1 className="text-xl font-extrabold text-[#F4F8FF] tracking-tight">{t.cad.title}</h1>
            <span className="text-[10px] font-mono uppercase bg-[#8B5CFF]/15 text-[#8B5CFF] px-2 py-0.5 rounded border border-[#8B5CFF]/30">
              Module 04
            </span>
          </div>
          <p className="text-xs text-[#9EB2CC] mt-1">{t.cad.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={openTemplatesModal}
            className="px-3 py-1.5 bg-gradient-to-r from-[#18D8F2]/15 to-[#8B5CFF]/15 hover:from-[#18D8F2]/25 hover:to-[#8B5CFF]/25 border border-[#18D8F2]/40 text-[#18D8F2] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Browse & load pre-engineered circuit presets or save template"
          >
            <Layers className="w-3.5 h-3.5 text-[#18D8F2]" />
            <span>Circuit Presets</span>
          </button>

          <button
            onClick={() => setIsNewCircuitModalOpen(true)}
            className="px-3 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#8B5CFF]" />
            <span>Add Circuit Branch</span>
          </button>

          <button
            onClick={recalculatePower}
            className="px-3 py-1.5 bg-[#8B5CFF]/20 hover:bg-[#8B5CFF]/30 border border-[#8B5CFF]/40 text-[#8B5CFF] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run Power Flow Analysis</span>
          </button>

          <button
            onClick={triggerSave}
            className="px-3.5 py-1.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#147DFF]/25 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveStatus === 'saved' ? t.saved : t.save}</span>
          </button>
        </div>
      </div>

      {/* Main CAD Workspace Layout (8 cols drawing / diagram + 4 cols calculation form) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: CAD Diagram & Schematic (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* View Mode Tabs */}
          <div className="flex items-center justify-between bg-[#061426] p-1.5 rounded-xl border border-[#1B3A5C]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCadView('sld')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  cadView === 'sld' 
                    ? 'bg-[#8B5CFF]/20 text-[#8B5CFF] border border-[#8B5CFF]/40' 
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                {t.cad.viewSld}
              </button>
              <button
                onClick={() => setCadView('calculations')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  cadView === 'calculations' 
                    ? 'bg-[#147DFF]/20 text-[#147DFF] border border-[#147DFF]/40' 
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                {t.cad.viewCalculations}
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[#00D6A0] px-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>IEC 60364-5-52 / GOST 31996 Calculation Engine</span>
            </div>
          </div>

          {/* Canvas Body */}
          {cadView === 'sld' ? (
            <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-[#1B3A5C] bg-[#061426] blueprint-grid-cad flex flex-col p-6 select-none overflow-y-auto">
              {/* Single-Line Diagram (SLD) Header Incomer Busbar */}
              <div className="flex flex-col items-center mb-6">
                <div className="p-2.5 bg-[#0B1C32] border border-[#18D8F2] rounded-lg shadow-xl text-center">
                  <div className="text-[10px] font-mono text-[#18D8F2] uppercase font-bold">Main Utility Feed (3P+N+PE)</div>
                  <div className="text-xs font-extrabold text-[#F4F8FF] font-mono">400V / 230V · 50 Hz · TN-C-S</div>
                </div>
                {/* Vertical Main Feeder Line */}
                <div className="w-0.5 h-6 bg-[#18D8F2]" />
                {/* Main Incomer Breaker */}
                <div className="px-3 py-1 bg-[#10243D] border border-[#FF9A24] rounded text-[11px] font-mono font-bold text-[#FF9A24] flex items-center gap-1.5">
                  <span>QF0: iC60N 4P 50A C (10kA)</span>
                </div>
                <div className="w-0.5 h-6 bg-[#18D8F2]" />
                {/* Horizontal Distribution Copper Busbar */}
                <div className="w-full max-w-[620px] h-2 bg-gradient-to-r from-[#8B5CFF] via-[#18D8F2] to-[#FF9A24] rounded-full shadow-lg shadow-[#18D8F2]/20" />
                <div className="text-[9px] font-mono text-[#9EB2CC] mt-1">Main Distribution Busbar (L1 / L2 / L3 / N)</div>
              </div>

              {/* Parallel Outgoing Circuit Branches */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
                {circuits.map((c) => {
                  const isSelected = c.id === selectedCircuitId;
                  const calc = powerCalculations.circuitCalculations.find(cc => cc.circuitId === c.id);
                  const isDropOk = (calc?.voltageDropPercent || 0) <= (c.name.toLowerCase().includes('light') ? 3.0 : 5.0);

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCircuitId(c.id)}
                      className={`p-3 bg-[#0B1C32] border rounded-xl flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'border-[#8B5CFF] ring-2 ring-[#8B5CFF]/30 shadow-lg shadow-[#8B5CFF]/20 bg-[#10243D]' 
                          : 'border-[#1B3A5C] hover:border-[#8B5CFF]/50'
                      }`}
                    >
                      {/* Top Drop Line */}
                      <div className="w-0.5 h-4 bg-[#8B5CFF] mx-auto -mt-3 mb-1.5" />

                      <div>
                        <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                          <span className="font-bold text-[#8B5CFF]">{c.tag}</span>
                          <span className="text-[#9EB2CC]">{c.phase}</span>
                        </div>

                        <div className="text-xs font-bold text-[#F4F8FF] leading-snug truncate" title={c.name}>
                          {c.name}
                        </div>

                        <div className="my-2 py-1.5 px-2 bg-[#061426] rounded border border-[#1B3A5C] text-[10px] font-mono space-y-0.5">
                          <div className="text-[#18D8F2] font-semibold">{c.breakerRatingA}A Curve C</div>
                          <div className="text-[#9EB2CC]">{c.crossSectionMm2}mm² Cu</div>
                          <div className="text-[#9EB2CC]">{c.cableLengthMeters}m run</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#1B3A5C] text-[10px] font-mono">
                        <div className="flex items-center justify-between text-[#F4F8FF]">
                          <span>Load:</span>
                          <span className="font-bold">{c.powerWatts}W</span>
                        </div>
                        <div className="flex items-center justify-between text-[#9EB2CC]">
                          <span>Ib:</span>
                          <span className="text-[#F4F8FF] font-semibold">{calc?.calculatedCurrentA || 0}A</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span>ΔU:</span>
                          <span className={`font-bold ${isDropOk ? 'text-[#00D6A0]' : 'text-[#FF5263]'}`}>
                            {calc?.voltageDropPercent || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Canvas Footer */}
              <div className="mt-auto pt-6 flex items-center justify-between text-xs text-[#9EB2CC] font-mono">
                <span>Click any branch card to inspect electrical formulas & conductor cross-section.</span>
                <span className="text-[#00D6A0]">Deterministic IEC / GOST Solved</span>
              </div>
            </div>
          ) : (
            /* Tabular Results View */
            <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#061426] border-b border-[#1B3A5C] text-[#9EB2CC] uppercase font-mono text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Tag</th>
                      <th className="px-3 py-2.5">Circuit Name</th>
                      <th className="px-2 py-2.5">Phase</th>
                      <th className="px-2 py-2.5">Power</th>
                      <th className="px-2 py-2.5">Current (Ib)</th>
                      <th className="px-2 py-2.5">Breaker</th>
                      <th className="px-2 py-2.5">Cable S</th>
                      <th className="px-2 py-2.5">ΔU (V)</th>
                      <th className="px-2 py-2.5">ΔU (%)</th>
                      <th className="px-3 py-2.5">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B3A5C]/40 font-mono">
                    {circuits.map(c => {
                      const calc = powerCalculations.circuitCalculations.find(cc => cc.circuitId === c.id);
                      return (
                        <tr key={c.id} className="hover:bg-[#10243D] transition-colors">
                          <td className="px-3 py-2 font-bold text-[#8B5CFF]">{c.tag}</td>
                          <td className="px-3 py-2 font-sans font-medium text-[#F4F8FF]">{c.name}</td>
                          <td className="px-2 py-2 text-[#9EB2CC]">{c.phase}</td>
                          <td className="px-2 py-2 font-bold text-[#F4F8FF]">{c.powerWatts}W</td>
                          <td className="px-2 py-2 text-[#18D8F2]">{calc?.calculatedCurrentA} A</td>
                          <td className="px-2 py-2 text-[#FF9A24]">{c.breakerRatingA}A</td>
                          <td className="px-2 py-2 text-[#9EB2CC]">{c.crossSectionMm2} mm²</td>
                          <td className="px-2 py-2 text-[#9EB2CC]">{calc?.voltageDropV} V</td>
                          <td className="px-2 py-2 font-bold text-[#00D6A0]">{calc?.voltageDropPercent}%</td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${
                              calc?.isCompliant 
                                ? 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30' 
                                : 'bg-[#FF5263]/15 text-[#FF5263] border-[#FF5263]/30'
                            }`}>
                              {calc?.isCompliant ? 'PASS' : 'WARNING'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right: Technical Circuit Inspector & Form (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {selectedCircuit && (
            <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1B3A5C] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#8B5CFF] font-mono">{selectedCircuit.tag}</span>
                  <h3 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider">Circuit Parameters</h3>
                </div>
                {circuits.length > 1 && (
                  <button
                    onClick={() => handleDeleteCircuit(selectedCircuit.id)}
                    className="text-[10px] text-[#FF5263] hover:underline flex items-center gap-1 font-mono"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">Circuit Group Name</label>
                  <input
                    type="text"
                    value={selectedCircuit.name}
                    onChange={(e) => handleUpdateCircuit('name', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Supply Phase</label>
                    <select
                      value={selectedCircuit.phase}
                      onChange={(e) => handleUpdateCircuit('phase', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    >
                      <option value="L1">Phase L1 (230V)</option>
                      <option value="L2">Phase L2 (230V)</option>
                      <option value="L3">Phase L3 (230V)</option>
                      <option value="3P">3-Phase (400V)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Power Factor (cos φ)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="1.0"
                      value={selectedCircuit.powerFactor}
                      onChange={(e) => handleUpdateCircuit('powerFactor', parseFloat(e.target.value) || 0.9)}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Connected Power (Watts)</label>
                    <input
                      type="number"
                      step="100"
                      value={selectedCircuit.powerWatts}
                      onChange={(e) => handleUpdateCircuit('powerWatts', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Run Length (Meters)</label>
                    <input
                      type="number"
                      step="1"
                      value={selectedCircuit.cableLengthMeters}
                      onChange={(e) => handleUpdateCircuit('cableLengthMeters', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Conductor Cross-Section</label>
                    <select
                      value={selectedCircuit.crossSectionMm2}
                      onChange={(e) => handleUpdateCircuit('crossSectionMm2', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                    >
                      <option value={1.5}>1.5 mm² Cu (16A max)</option>
                      <option value={2.5}>2.5 mm² Cu (22A max)</option>
                      <option value={4.0}>4.0 mm² Cu (30A max)</option>
                      <option value={6.0}>6.0 mm² Cu (38A max)</option>
                      <option value={10.0}>10.0 mm² Cu (52A max)</option>
                      <option value={16.0}>16.0 mm² Cu (70A max)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">MCB Breaker Rating</label>
                    <select
                      value={selectedCircuit.breakerRatingA}
                      onChange={(e) => handleUpdateCircuit('breakerRatingA', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                    >
                      <option value={10}>10A (Curve B/C)</option>
                      <option value={16}>16A (Curve C)</option>
                      <option value={20}>20A (Curve C)</option>
                      <option value={25}>25A (Curve C)</option>
                      <option value={32}>32A (Curve C)</option>
                      <option value={40}>40A (Curve C)</option>
                      <option value={50}>50A (Curve C)</option>
                    </select>
                  </div>
                </div>

                {/* Live Engineering Calculation Result Box */}
                {selectedCalc && (
                  <div className={`p-3 rounded-xl border space-y-2 font-mono ${
                    selectedCalc.isCompliant 
                      ? 'bg-[#061426] border-[#00D6A0]/40' 
                      : 'bg-[#FF5263]/10 border-[#FF5263]/40'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9EB2CC]">Design Current (Ib):</span>
                      <span className="font-bold text-[#18D8F2]">{selectedCalc.calculatedCurrentA} A</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9EB2CC]">Voltage Drop (ΔU):</span>
                      <span className="font-bold text-[#F4F8FF]">{selectedCalc.voltageDropV} V ({selectedCalc.voltageDropPercent}%)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9EB2CC]">Continuous Capacity:</span>
                      <span className="text-[#00D6A0]">{selectedCalc.thermalPermissibleA} A max</span>
                    </div>

                    {selectedCalc.warningMessage && (
                      <div className="p-2 bg-[#FF5263]/20 border border-[#FF5263]/50 rounded text-[11px] text-[#FF5263] flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{selectedCalc.warningMessage}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Load Flow Summary Card */}
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-4 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-[#9EB2CC] uppercase font-bold text-[10px]">
              <span>Overall Installation Status</span>
              <span className="text-[#00D6A0]">{activeProject.standard}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between py-1 border-b border-[#1B3A5C]/40">
                <span className="text-[#9EB2CC]">Total Active Power:</span>
                <span className="font-bold text-[#F4F8FF]">{powerCalculations.totalActivePowerKw} kW</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B3A5C]/40">
                <span className="text-[#9EB2CC]">Total Apparent Power:</span>
                <span className="font-bold text-[#F4F8FF]">{powerCalculations.totalApparentPowerKva} kVA</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B3A5C]/40">
                <span className="text-[#9EB2CC]">Calculated Incomer Current:</span>
                <span className="font-bold text-[#18D8F2]">{powerCalculations.designCurrentA} A</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#9EB2CC]">Phase Asymmetry:</span>
                <span className={`font-bold ${powerCalculations.phaseBalanceUnbalancePercent > 15 ? 'text-[#FF5263]' : 'text-[#00D6A0]'}`}>
                  {powerCalculations.phaseBalanceUnbalancePercent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Circuit Modal */}
      <Modal
        isOpen={isNewCircuitModalOpen}
        onClose={() => setIsNewCircuitModalOpen(false)}
        title="Add Outgoing Circuit Branch"
        subtitle="Define feeder electrical specifications for power analysis and SLD inclusion."
      >
        <form onSubmit={handleAddCircuit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Circuit Tag</label>
              <input
                type="text"
                placeholder="e.g. QF7"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Feeder Name</label>
              <input
                type="text"
                placeholder="e.g. Master Bedroom Sockets"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Phase</label>
              <select
                value={newPhase}
                onChange={(e) => {
                  const p = e.target.value as any;
                  setNewPhase(p);
                  setNewVoltage(p === '3P' ? 400 : 230);
                }}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              >
                <option value="L1">L1 (230V)</option>
                <option value="L2">L2 (230V)</option>
                <option value="L3">L3 (230V)</option>
                <option value="3P">3P (400V)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Load (Watts)</label>
              <input
                type="number"
                step="100"
                value={newPower}
                onChange={(e) => setNewPower(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Length (m)</label>
              <input
                type="number"
                value={newLength}
                onChange={(e) => setNewLength(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Conductor Cross-Section</label>
              <select
                value={newSection}
                onChange={(e) => setNewSection(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              >
                <option value={1.5}>1.5 mm² Cu</option>
                <option value={2.5}>2.5 mm² Cu</option>
                <option value={4.0}>4.0 mm² Cu</option>
                <option value={6.0}>6.0 mm² Cu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Breaker Rating</label>
              <select
                value={newBreaker}
                onChange={(e) => setNewBreaker(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              >
                <option value={10}>10A</option>
                <option value={16}>16A</option>
                <option value={20}>20A</option>
                <option value={25}>25A</option>
                <option value={32}>32A</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#1B3A5C]">
            <button
              type="button"
              onClick={() => setIsNewCircuitModalOpen(false)}
              className="px-3 py-1.5 bg-[#061426] text-xs font-medium text-[#9EB2CC] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#147DFF] text-white text-xs font-bold rounded-lg"
            >
              Create Circuit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
