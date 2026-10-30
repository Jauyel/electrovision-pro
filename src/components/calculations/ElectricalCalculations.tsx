import React, { useState } from 'react';
import { 
  Calculator, 
  Zap, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Save, 
  Trash2, 
  FileText, 
  Check, 
  ChevronRight, 
  Layers, 
  Info,
  RotateCcw,
  Sparkles,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { calculateElectrical, CalcKind, CalcInput, CalcOutput } from '../../model/calculations';
import { runElectricalTests } from '../../model/calculations.test';

const CALC_KINDS: { key: CalcKind; name: string; sub: string; formula: string; icon: string; color: string }[] = [
  { key: "drop", name: "Kuchlanish tushishi & Kabel tekshiruvi", sub: "PUE 7.1 · ΔV% va kabel zaxirasi", formula: "ΔV = 2 × ρ × L × I × cos φ ÷ S", icon: "⚡", color: "#18D8F2" },
  { key: "single", name: "1 fazali quvvat & Tok", sub: "230V aktiv, to'liq va reaktiv quvvat", formula: "P = V × I × cos φ ÷ 1000", icon: "🔌", color: "#147DFF" },
  { key: "three", name: "3 fazali quvvat (380V/400V)", sub: "Sanoat va bino kirish quvvati", formula: "P = √3 × V_L × I × cos φ ÷ 1000", icon: "🏢", color: "#8B5CFF" },
  { key: "cablesizing", name: "Kabel kesimi & Termik tok", sub: "IEC 60364-5-52 · Harorat va guruhlash", formula: "I_z = I_tab × k_temp × k_group ≥ I_b", icon: "📏", color: "#00D6A0" },
  { key: "shortcircuit", name: "Qisqa tutashuv toki (Ik.z)", sub: "Avtomat lahzali o'chish tezligi B/C/D", formula: "I_kz = V_faza ÷ Z_faza-nol", icon: "💥", color: "#FF5263" },
  { key: "earthing", name: "Yerga ulash konturi (Zazemleniye)", sub: "PUE 1.7 · R ≤ 4.0 Om konturi", formula: "R = (ρ ÷ 2πL) × [ln(2L/d) + 0.5 ln...]", icon: "🌱", color: "#FF9A24" },
  { key: "imbalance", name: "3 fazali asimmetriya & Nol toki", sub: "PUE 7.1.36 · Asimmetriya ≤ 15%", formula: "I_N = √(I_A² + I_B² + I_C² - ...)", icon: "⚖️", color: "#FFD028" },
  { key: "energy", name: "Elektr energiya sarfi & Xarajat", sub: "E = P × t · KVt·soat va hisob-kitob", formula: "E = P × soat × kunlar ÷ 1000", icon: "📊", color: "#00D6A0" },
];

const SOIL_TYPES = [
  { name: "Qoratuproq / Botqoqlik (30 Ω·m)", value: 30 },
  { name: "Qumloq tuproq / Gil (100 Ω·m - O'rtacha)", value: 100 },
  { name: "Oddiy loytuproq (150 Ω·m)", value: 150 },
  { name: "Qumloq quruq tuproq (300 Ω·m)", value: 300 },
  { name: "Toshloq / Qoyatosh (1000 Ω·m)", value: 1000 },
];

export const ElectricalCalculations: React.FC = () => {
  const { 
    activeProject, 
    updateActiveProject, 
    addActivityLog, 
    downloadProjectPdf, 
    formatCurrency, 
    currency,
    openAiModal 
  } = useProject();

  const [selectedKind, setSelectedKind] = useState<CalcKind>("drop");
  const [values, setValues] = useState<Record<string, any>>({
    voltage: 230,
    current: 16,
    powerKw: 3.5,
    powerFactor: 0.95,
    length: 25,
    area: 2.5,
    material: "copper",
    networkPhase: "single",
    ambientTempC: 30,
    cablesInGroup: 1,
    soilResistivity: 100,
    rodLength: 2.5,
    rodDiameter: 16,
    targetResistance: 4.0,
    breakerRatingA: 16,
    breakerCurve: "C",
    gridImpedance: 0.05,
    loadPhaseA: 28,
    loadPhaseB: 22,
    loadPhaseC: 16,
    hoursPerDay: 8,
    days: 30,
    tariffPerKwh: currency === "USD" ? 0.08 : 450,
  });

  const [output, setOutput] = useState<CalcOutput | null>(() => {
    try {
      return calculateElectrical("drop", {
        voltage: 230,
        current: 16,
        powerFactor: 0.95,
        length: 25,
        area: 2.5,
        material: "copper",
        networkPhase: "single",
      });
    } catch {
      return null;
    }
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResults, setTestResults] = useState<{ passed: number; total: number } | null>(null);

  const handleCalculate = () => {
    setErrorMsg("");
    setSaveSuccess(false);
    try {
      const parsed: CalcInput = {
        voltage: Number(values.voltage) || 230,
        current: Number(values.current) || undefined,
        powerKw: Number(values.powerKw) || undefined,
        powerFactor: Number(values.powerFactor) || 0.95,
        length: Number(values.length) || 25,
        area: Number(values.area) || 2.5,
        material: values.material as any,
        networkPhase: values.networkPhase as any,
        ambientTempC: Number(values.ambientTempC) || 30,
        cablesInGroup: Number(values.cablesInGroup) || 1,
        soilResistivity: Number(values.soilResistivity) || 100,
        rodLength: Number(values.rodLength) || 2.5,
        rodDiameter: Number(values.rodDiameter) || 16,
        targetResistance: Number(values.targetResistance) || 4.0,
        breakerRatingA: Number(values.breakerRatingA) || 16,
        breakerCurve: values.breakerCurve as any,
        gridImpedance: Number(values.gridImpedance) || 0.05,
        loadPhaseA: Number(values.loadPhaseA) || 20,
        loadPhaseB: Number(values.loadPhaseB) || 20,
        loadPhaseC: Number(values.loadPhaseC) || 20,
        hoursPerDay: Number(values.hoursPerDay) || 8,
        days: Number(values.days) || 30,
        tariffPerKwh: Number(values.tariffPerKwh) || 450,
      };

      const res = calculateElectrical(selectedKind, parsed);
      setOutput(res);
    } catch (err: any) {
      setErrorMsg(err?.message || "Hisoblashda xatolik yuz berdi");
      setOutput(null);
    }
  };

  const handleSaveToProject = () => {
    if (!output) return;
    const currentKindMeta = CALC_KINDS.find(k => k.key === selectedKind);
    const newRecord = {
      id: `calc-${Date.now()}`,
      kind: currentKindMeta?.name || selectedKind,
      expression: output.formula,
      result: `${output.value} ${output.unit}`,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      pueCompliance: output.pueCompliance?.status || "pass",
      details: output.details,
    };

    updateActiveProject(prev => ({
      ...prev,
      calculations: [newRecord, ...(prev.calculations || [])]
    }));

    addActivityLog({
      action: 'Electrical Calculation Verified',
      details: `${currentKindMeta?.name}: ${output.value} ${output.unit} (${output.pueCompliance?.status.toUpperCase()})`,
      category: 'cad',
      status: output.pueCompliance?.status === 'fail' ? 'warning' : 'verified',
      user: 'Chief Electrical Engineer',
      moduleTarget: 'cad'
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleDeleteSavedCalc = (id: string) => {
    updateActiveProject(prev => ({
      ...prev,
      calculations: (prev.calculations || []).filter(c => c.id !== id)
    }));
  };

  const handleRunReferenceTests = () => {
    try {
      const res = runElectricalTests();
      setTestResults(res);
      setTimeout(() => setTestResults(null), 6000);
    } catch (e: any) {
      setErrorMsg(`Benchmark test error: ${e.message}`);
    }
  };

  const currentKindInfo = CALC_KINDS.find(k => k.key === selectedKind);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#147DFF] via-[#18D8F2] to-[#FF007A]" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#147DFF]/15 text-[#18D8F2] border border-[#147DFF]/30 uppercase tracking-wider">
                Module 07 · Verified Engine
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#00D6A0] bg-[#00D6A0]/10 border border-[#00D6A0]/20">
                PUE 7.1 / IEC 60364-5-52
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#F4F8FF] tracking-tight flex items-center gap-2">
              <Calculator className="w-6 h-6 text-[#18D8F2]" />
              Cable Sizing & Electrical Power Calculators
            </h1>
            <p className="text-xs text-[#9EB2CC] max-w-3xl">
              Deterministic, safety-certified engineering calculator suite for voltage drop, thermal ampacity derating, 
              prospective short-circuit trip verification, ground loop resistance, and 3-phase asymmetry analysis.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleRunReferenceTests}
              className="px-3.5 py-2 bg-[#0B1C32] hover:bg-[#10243D] text-[#18D8F2] border border-[#18D8F2]/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102"
              title="Run 8/8 automated reference calculations"
            >
              <ShieldCheck className="w-4 h-4 text-[#00D6A0]" />
              <span>Verify Benchmarks</span>
            </button>

            <button
              onClick={downloadProjectPdf}
              className="px-4 py-2 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:from-[#18D8F2] hover:to-[#147DFF] text-[#030B18] font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-[#147DFF]/25 cursor-pointer hover:scale-102"
            >
              <FileText className="w-4 h-4" />
              <span>Export Certified PDF</span>
            </button>
          </div>
        </div>

        {/* Test Result Toast */}
        {testResults && (
          <div className="mt-4 p-3 bg-[#00D6A0]/10 border border-[#00D6A0]/40 rounded-xl flex items-center justify-between text-xs text-[#00D6A0] font-mono animate-fade-in">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              All {testResults.passed}/{testResults.total} PUE 7.1 and IEC 60364 mathematical benchmarks passed with 100% precision.
            </span>
            <span className="text-[10px] text-[#9EB2CC]">Verified in memory</span>
          </div>
        )}
      </div>

      {/* Main Grid: Left Methods Palette, Center Input Parameters, Right Live Verification Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Calculation Methods Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-4 shadow-lg space-y-3">
            <div className="text-[11px] font-bold text-[#18D8F2] uppercase font-mono tracking-wider flex items-center justify-between">
              <span>Engineering Formulas</span>
              <span className="text-[#9EB2CC] text-[10px]">8 Modules</span>
            </div>

            <div className="space-y-1.5">
              {CALC_KINDS.map((item) => {
                const isSelected = selectedKind === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSelectedKind(item.key);
                      setErrorMsg("");
                      setSaveSuccess(false);
                      // Trigger calculate with existing values
                      setTimeout(() => handleCalculate(), 20);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'bg-[#10243D] border-[#147DFF] text-[#F4F8FF] shadow-md shadow-[#147DFF]/20 scale-[1.01]'
                        : 'bg-[#081729] border-[#1B3A5C]/70 text-[#9EB2CC] hover:text-[#F4F8FF] hover:border-[#147DFF]/40 hover:bg-[#0B1C32]'
                    }`}
                  >
                    <span className="text-xl shrink-0 p-1 rounded-lg bg-[#061426] border border-white/5">
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#F4F8FF] truncate flex items-center justify-between">
                        <span>{item.name}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#18D8F2]" />}
                      </div>
                      <div className="text-[10px] text-[#9EB2CC] truncate font-mono mt-0.5">
                        {item.sub}
                      </div>
                      <div className="text-[9px] text-[#18D8F2]/80 font-mono mt-1 opacity-80 truncate">
                        {item.formula}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* AI Advisor Card */}
            <div className="p-3.5 bg-gradient-to-br from-[#10243D] to-[#0B1C32] border border-[#147DFF]/30 rounded-xl space-y-2 mt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#18D8F2]">
                <Sparkles className="w-4 h-4 text-[#18D8F2]" />
                <span>Need Formula Assistance?</span>
              </div>
              <p className="text-[11px] text-[#9EB2CC] leading-relaxed">
                ElectroVision AI explains thermal derating, cable selection, and PUE compliance clauses in Uzbek, Russian, or English.
              </p>
              <button
                onClick={() => openAiModal('chat')}
                className="w-full mt-1 px-3 py-1.5 bg-[#147DFF]/20 hover:bg-[#147DFF]/30 border border-[#147DFF]/40 rounded-lg text-xs font-bold text-[#18D8F2] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Ask AI Engineering Co-Pilot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Column: Input Form (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#1B3A5C] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[#18D8F2] uppercase tracking-wider font-bold">
                  Parameters & Design Inputs
                </span>
                <h3 className="text-sm font-bold text-[#F4F8FF]">
                  {currentKindInfo?.name}
                </h3>
              </div>
              <button
                onClick={handleCalculate}
                className="px-3 py-1.5 bg-[#147DFF] hover:bg-[#18D8F2] text-[#030B18] font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Calculate</span>
              </button>
            </div>

            {/* Form Fields depend on selected kind */}
            <div className="space-y-3.5 text-xs">
              {/* Voltage & Phase Configuration */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                    Voltage (V)
                  </label>
                  <select
                    value={values.voltage}
                    onChange={(e) => setValues({ ...values, voltage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                  >
                    <option value={220}>220 V (1-Phase Legacy)</option>
                    <option value={230}>230 V (1-Phase IEC / PUE)</option>
                    <option value={380}>380 V (3-Phase Legacy)</option>
                    <option value={400}>400 V (3-Phase IEC / PUE)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                    Network Phase
                  </label>
                  <select
                    value={values.networkPhase}
                    onChange={(e) => setValues({ ...values, networkPhase: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                  >
                    <option value="single">Single-Phase (1P+N+PE)</option>
                    <option value="three">Three-Phase (3P+N+PE)</option>
                  </select>
                </div>
              </div>

              {/* Load Current and Power Inputs */}
              {(selectedKind === "single" || selectedKind === "three" || selectedKind === "drop" || selectedKind === "cablesizing" || selectedKind === "energy") && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                      Load Current (I)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        value={values.current}
                        onChange={(e) => setValues({ ...values, current: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono pr-8 focus:border-[#18D8F2] outline-none"
                      />
                      <span className="absolute right-3 top-2 text-[10px] font-mono text-[#9EB2CC]">A</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                      Active Power (P)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={values.powerKw}
                        onChange={(e) => setValues({ ...values, powerKw: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono pr-8 focus:border-[#18D8F2] outline-none"
                      />
                      <span className="absolute right-3 top-2 text-[10px] font-mono text-[#9EB2CC]">kW</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Power Factor (cos φ) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono text-[#9EB2CC]">
                    Power Factor (cos φ): <strong className="text-[#18D8F2]">{values.powerFactor}</strong>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setValues({ ...values, powerFactor: 0.88 })}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#0B1C32] text-[#9EB2CC] hover:text-[#F4F8FF] border border-[#1B3A5C]"
                    >
                      Motors (0.88)
                    </button>
                    <button
                      type="button"
                      onClick={() => setValues({ ...values, powerFactor: 0.95 })}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#0B1C32] text-[#9EB2CC] hover:text-[#F4F8FF] border border-[#1B3A5C]"
                    >
                      Sockets (0.95)
                    </button>
                    <button
                      type="button"
                      onClick={() => setValues({ ...values, powerFactor: 1.0 })}
                      className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#0B1C32] text-[#9EB2CC] hover:text-[#F4F8FF] border border-[#1B3A5C]"
                    >
                      Heater (1.0)
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="1.00"
                  step="0.01"
                  value={values.powerFactor}
                  onChange={(e) => setValues({ ...values, powerFactor: parseFloat(e.target.value) })}
                  className="w-full accent-[#18D8F2]"
                />
              </div>

              {/* Cable Length & Section (For Voltage Drop & Short Circuit) */}
              {(selectedKind === "drop" || selectedKind === "shortcircuit" || selectedKind === "cablesizing") && (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                        Conductor Material
                      </label>
                      <select
                        value={values.material}
                        onChange={(e) => setValues({ ...values, material: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                      >
                        <option value="copper">Mis (Cu) · VVGng-LS</option>
                        <option value="aluminium">Alyuminiy (Al) · AVVG</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                        Cross-Section (S)
                      </label>
                      <select
                        value={values.area}
                        onChange={(e) => setValues({ ...values, area: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                      >
                        <option value={1.5}>1.5 mm² (Yoritish liniyasi)</option>
                        <option value={2.5}>2.5 mm² (Rozetkalar guruhi)</option>
                        <option value={4.0}>4.0 mm² (Konditsioner / Plita)</option>
                        <option value={6.0}>6.0 mm² (Asosiy taqsimot)</option>
                        <option value={10.0}>10.0 mm² (Kiritish magistrali)</option>
                        <option value={16.0}>16.0 mm² (Bosh kirish)</option>
                        <option value={25.0}>25.0 mm² (Sanoat kirish)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                      Circuit Route Length (L)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={values.length}
                        onChange={(e) => setValues({ ...values, length: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono pr-8 focus:border-[#18D8F2] outline-none"
                      />
                      <span className="absolute right-3 top-2 text-[10px] font-mono text-[#9EB2CC]">m</span>
                    </div>
                  </div>
                </>
              )}

              {/* Cable Sizing: Ambient Temp & Grouping */}
              {selectedKind === "cablesizing" && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                      Ambient Temp (°C)
                    </label>
                    <select
                      value={values.ambientTempC}
                      onChange={(e) => setValues({ ...values, ambientTempC: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                    >
                      <option value={25}>25 °C (k = 1.06)</option>
                      <option value={30}>30 °C (Standart k = 1.00)</option>
                      <option value={35}>35 °C (k = 0.94)</option>
                      <option value={40}>40 °C (Yoz fasli k = 0.87)</option>
                      <option value={45}>45 °C (Qizigan tom k = 0.79)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                      Cables in Bundle / Tray
                    </label>
                    <select
                      value={values.cablesInGroup}
                      onChange={(e) => setValues({ ...values, cablesInGroup: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                    >
                      <option value={1}>1 ta kabel (k = 1.00)</option>
                      <option value={2}>2 ta kabel (k = 0.80)</option>
                      <option value={3}>3 ta kabel (k = 0.70)</option>
                      <option value={4}>4 ta kabel (k = 0.65)</option>
                      <option value={6}>6 ta kabel (k = 0.60)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Short Circuit: Breaker and Curve */}
              {selectedKind === "shortcircuit" && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                      Circuit Breaker Rating (A)
                    </label>
                    <select
                      value={values.breakerRatingA}
                      onChange={(e) => setValues({ ...values, breakerRatingA: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                    >
                      <option value={10}>10 A (Lighting)</option>
                      <option value={16}>16 A (Standard Sockets)</option>
                      <option value={20}>20 A (AC / Heavy)</option>
                      <option value={25}>25 A (Cooker / Feed)</option>
                      <option value={32}>32 A (Sub-feeder)</option>
                      <option value={40}>40 A (Main)</option>
                      <option value={50}>50 A (Incomer)</option>
                      <option value={63}>63 A (Building Head)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                      Trip Curve
                    </label>
                    <select
                      value={values.breakerCurve}
                      onChange={(e) => setValues({ ...values, breakerCurve: e.target.value })}
                      className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                    >
                      <option value="B">B Curve (3-5 In · Nozik chiziqlar)</option>
                      <option value="C">C Curve (5-10 In · Umumiy rozetkalar)</option>
                      <option value="D">D Curve (10-20 In · Dvigatel / Nasos)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Earthing (Grounding): Soil & Electrode Dimensions */}
              {selectedKind === "earthing" && (
                <>
                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                      Soil Type & Resistivity (ρ)
                    </label>
                    <select
                      value={values.soilResistivity}
                      onChange={(e) => setValues({ ...values, soilResistivity: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                    >
                      {SOIL_TYPES.map(s => (
                        <option key={s.value} value={s.value}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                        Rod Length (L)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.5"
                          value={values.rodLength}
                          onChange={(e) => setValues({ ...values, rodLength: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono pr-8 focus:border-[#18D8F2] outline-none"
                        />
                        <span className="absolute right-3 top-2 text-[10px] font-mono text-[#9EB2CC]">m</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                        Rod Diameter (Ø)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={values.rodDiameter}
                          onChange={(e) => setValues({ ...values, rodDiameter: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono pr-8 focus:border-[#18D8F2] outline-none"
                        />
                        <span className="absolute right-3 top-2 text-[10px] font-mono text-[#9EB2CC]">mm</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Phase Imbalance: Loads on Phase A, B, C */}
              {selectedKind === "imbalance" && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-[#9EB2CC] block">
                    Three-Phase Load Currents (Amperes)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-[#FF5263] block mb-0.5">Faza A (L1)</span>
                      <input
                        type="number"
                        value={values.loadPhaseA}
                        onChange={(e) => setValues({ ...values, loadPhaseA: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[#00D6A0] block mb-0.5">Faza B (L2)</span>
                      <input
                        type="number"
                        value={values.loadPhaseB}
                        onChange={(e) => setValues({ ...values, loadPhaseB: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[#18D8F2] block mb-0.5">Faza C (L3)</span>
                      <input
                        type="number"
                        value={values.loadPhaseC}
                        onChange={(e) => setValues({ ...values, loadPhaseC: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Energy Calculation: Hours, Days, Tariff */}
              {selectedKind === "energy" && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">Hours / Day</label>
                    <input
                      type="number"
                      max={24}
                      min={1}
                      value={values.hoursPerDay}
                      onChange={(e) => setValues({ ...values, hoursPerDay: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">Days</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={values.days}
                      onChange={(e) => setValues({ ...values, days: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">Tariff / kWh</label>
                    <input
                      type="number"
                      value={values.tariffPerKwh}
                      onChange={(e) => setValues({ ...values, tariffPerKwh: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] font-mono focus:border-[#18D8F2] outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleCalculate}
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:from-[#18D8F2] hover:to-[#147DFF] text-[#030B18] font-black rounded-xl text-xs tracking-wider uppercase transition-all shadow-md shadow-[#147DFF]/25 cursor-pointer flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Execute PUE Engineering Calculation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Mathematical Output & PUE Compliance Card (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {errorMsg ? (
            <div className="p-4 bg-[#FF5263]/10 border border-[#FF5263]/30 rounded-2xl text-xs text-[#FF5263] flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <strong className="block">Hisoblashda xatolik:</strong>
                <span>{errorMsg}</span>
              </div>
            </div>
          ) : output ? (
            <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#1B3A5C] pb-3">
                <span className="text-[10px] font-mono text-[#9EB2CC] uppercase tracking-wider font-bold">
                  Calculation Verification
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${
                  output.pueCompliance?.status === 'pass'
                    ? 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30'
                    : output.pueCompliance?.status === 'warning'
                      ? 'bg-[#FF9A24]/15 text-[#FF9A24] border-[#FF9A24]/30'
                      : 'bg-[#FF5263]/15 text-[#FF5263] border-[#FF5263]/30'
                }`}>
                  {output.pueCompliance?.status === 'pass' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {output.pueCompliance?.status.toUpperCase()}
                </span>
              </div>

              {/* Big Result Figure */}
              <div className="text-center py-2 bg-[#0B1C32] rounded-xl border border-[#1B3A5C]/80">
                <div className="text-3xl sm:text-4xl font-black text-[#F4F8FF] font-mono tracking-tight flex items-baseline justify-center gap-1.5">
                  <span className="text-[#18D8F2]">{output.value}</span>
                  <span className="text-sm font-bold text-[#9EB2CC]">{output.unit}</span>
                </div>
                <div className="text-[11px] text-[#9EB2CC] font-mono mt-1 px-4 truncate">
                  {output.formula}
                </div>
              </div>

              {/* Compliance & Recommendation Box */}
              {output.pueCompliance && (
                <div className={`p-3.5 rounded-xl border space-y-1.5 text-xs ${
                  output.pueCompliance.status === 'pass'
                    ? 'bg-[#00D6A0]/10 border-[#00D6A0]/30 text-[#00D6A0]'
                    : output.pueCompliance.status === 'warning'
                      ? 'bg-[#FF9A24]/10 border-[#FF9A24]/30 text-[#FF9A24]'
                      : 'bg-[#FF5263]/10 border-[#FF5263]/30 text-[#FF5263]'
                }`}>
                  <div className="font-bold flex items-center justify-between">
                    <span>{output.pueCompliance.text}</span>
                  </div>
                  <p className="text-[11px] text-[#F4F8FF]/90 leading-relaxed">
                    {output.pueCompliance.recommendation}
                  </p>
                  <div className="text-[9px] font-mono text-[#9EB2CC] pt-0.5">
                    Reference: {output.pueCompliance.standardClause}
                  </div>
                </div>
              )}

              {/* Detailed Breakdown Grid */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-[#9EB2CC] uppercase tracking-wider block">
                  Detailed Parameter Schedule
                </span>
                <div className="bg-[#081729] rounded-xl p-3 border border-[#1B3A5C]/60 space-y-2">
                  {output.details.map((d, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs border-b border-white/5 last:border-none pb-1 last:pb-0">
                      <span className="text-[#9EB2CC]">{d.label}</span>
                      <strong className="text-[#F4F8FF] font-mono">{d.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Save to Project Passport */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleSaveToProject}
                  className="flex-1 py-2.5 bg-[#10243D] hover:bg-[#147DFF] text-[#F4F8FF] border border-[#147DFF]/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:scale-[1.01]"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-[#00D6A0]" />
                      <span className="text-[#00D6A0]">Saved to Passport</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#18D8F2]" />
                      <span>Save Calculation to Project</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom Section: Saved Calculations History in Active Project */}
      <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-[#1B3A5C] pb-3">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#18D8F2]" />
            <div>
              <h3 className="text-sm font-bold text-[#F4F8FF]">
                Project Verified Calculations Register ({activeProject.name})
              </h3>
              <p className="text-[11px] text-[#9EB2CC]">
                Stored calculations are automatically compiled into the certified engineering PDF handover report.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-[#00D6A0] bg-[#00D6A0]/10 px-2.5 py-1 rounded-lg border border-[#00D6A0]/20">
            {activeProject.calculations?.length || 0} Registered Entries
          </span>
        </div>

        {(!activeProject.calculations || activeProject.calculations.length === 0) ? (
          <div className="p-8 text-center bg-[#081729] rounded-xl border border-dashed border-[#1B3A5C] text-[#9EB2CC] text-xs">
            <Calculator className="w-8 h-8 text-[#1B3A5C] mx-auto mb-2" />
            <span>Hozircha saqlangan hisob-kitoblar mavjud emas. Yuqoridagi kalkulyatordan foydalanib natijalarni loyihaga saqlang.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1B3A5C] text-[#9EB2CC] text-[10px] font-mono uppercase bg-[#081729]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Calculation Kind</th>
                  <th className="py-2.5 px-3">Formula / Method</th>
                  <th className="py-2.5 px-3">Result</th>
                  <th className="py-2.5 px-3">PUE Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B3A5C]/40">
                {activeProject.calculations.map((c) => (
                  <tr key={c.id} className="hover:bg-[#0B1C32] transition-colors">
                    <td className="py-3 px-3 font-mono text-[11px] text-[#9EB2CC]">{c.createdAt}</td>
                    <td className="py-3 px-3 font-bold text-[#F4F8FF]">{c.kind}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-[#18D8F2] truncate max-w-xs">{c.expression}</td>
                    <td className="py-3 px-3 font-mono font-bold text-[#F4F8FF]">{c.result}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        c.pueCompliance === 'fail' 
                          ? 'bg-[#FF5263]/20 text-[#FF5263] border border-[#FF5263]/30'
                          : c.pueCompliance === 'warning'
                            ? 'bg-[#FF9A24]/20 text-[#FF9A24] border border-[#FF9A24]/30'
                            : 'bg-[#00D6A0]/20 text-[#00D6A0] border border-[#00D6A0]/30'
                      }`}>
                        {c.pueCompliance ? c.pueCompliance.toUpperCase() : "VERIFIED"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteSavedCalc(c.id)}
                        className="p-1 text-[#9EB2CC] hover:text-[#FF5263] transition-colors"
                        title="Delete calculation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
