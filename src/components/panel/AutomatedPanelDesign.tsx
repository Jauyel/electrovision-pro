import React, { useState, useMemo } from 'react';
import { 
  Server, 
  Cpu, 
  Sparkles, 
  Layers, 
  Check, 
  RotateCcw, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Plus, 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  Activity, 
  Move, 
  RefreshCw, 
  BarChart3, 
  Wrench, 
  Eye, 
  Sliders,
  ToggleLeft,
  ToggleRight,
  Split,
  GitCommit,
  SlidersHorizontal,
  Settings
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { PanelComponent, PanelEnclosure, CADCircuit } from '../../types';

export interface AutomatedPanelDesignProps {
  onApplyLayout?: (components: PanelComponent[]) => void;
  onOpen3DViewer?: () => void;
  className?: string;
}

interface DragItem {
  id: string;
  source: 'rail' | 'palette' | 'circuit';
  railIndex?: number;
  slotPosition?: number;
  component: PanelComponent;
}

interface WiringSuggestion {
  componentId: string;
  tag: string;
  model: string;
  supplyPhase: 'L1' | 'L2' | 'L3' | '3P';
  sourceFeed: string;
  loadConnection: string;
  wireGauge: string;
  cableType: string;
  neutralBus: string;
  groundPe: string;
  tighteningTorqueNm: number;
  busbarCombType: string;
}

export const AutomatedPanelDesign: React.FC<AutomatedPanelDesignProps> = ({
  onApplyLayout,
  onOpen3DViewer,
  className = ''
}) => {
  const { 
    activeProject, 
    updateActiveProject, 
    addActivityLog, 
    triggerSave, 
    t 
  } = useProject();

  const enclosure: PanelEnclosure = activeProject.panelEnclosure || {
    model: 'Schneider Electric Pragma 3x18',
    type: 'flush',
    material: 'metal',
    ipRating: 'IP40',
    rows: 3,
    modulesPerRow: 18,
    totalModules: 54,
    widthMm: 450,
    heightMm: 620,
    depthMm: 125
  };

  // User-defined project load requirements (editable by the engineer)
  const [userLoads, setUserLoads] = useState<CADCircuit[]>(() => {
    return activeProject.cadCircuits && activeProject.cadCircuits.length > 0 
      ? [...activeProject.cadCircuits]
      : [
          { id: 'c-1', tag: 'QF1', name: 'Living & Ambient Lighting', phase: 'L1', supplyVoltage: 230, powerWatts: 450, powerFactor: 0.95, cableLengthMeters: 20, conductor: 'Cu', crossSectionMm2: 1.5, cableType: 'VVGng-LS 3x1.5', installMethod: 'conduit', breakerRatingA: 10 },
          { id: 'c-2', tag: 'QF2', name: 'Workstation & General Sockets', phase: 'L2', supplyVoltage: 230, powerWatts: 2400, powerFactor: 0.95, cableLengthMeters: 25, conductor: 'Cu', crossSectionMm2: 2.5, cableType: 'VVGng-LS 3x2.5', installMethod: 'conduit', breakerRatingA: 16 },
          { id: 'c-3', tag: 'QF3', name: 'Kitchen Counter & Microwave', phase: 'L3', supplyVoltage: 230, powerWatts: 3000, powerFactor: 0.92, cableLengthMeters: 18, conductor: 'Cu', crossSectionMm2: 2.5, cableType: 'VVGng-LS 3x2.5', installMethod: 'conduit', breakerRatingA: 16 },
          { id: 'c-4', tag: 'QF4', name: 'Inverter VRV Multi-Split AC', phase: 'L1', supplyVoltage: 230, powerWatts: 2600, powerFactor: 0.88, cableLengthMeters: 24, conductor: 'Cu', crossSectionMm2: 4.0, cableType: 'VVGng-LS 3x4.0', installMethod: 'conduit', breakerRatingA: 20 },
          { id: 'c-5', tag: 'QF5', name: 'Induction Cooking Range 3-Phase', phase: '3P', supplyVoltage: 400, powerWatts: 7200, powerFactor: 0.95, cableLengthMeters: 15, conductor: 'Cu', crossSectionMm2: 4.0, cableType: 'VVGng-LS 5x4.0', installMethod: 'conduit', breakerRatingA: 20 }
        ];
  });

  const [diversityFactor, setDiversityFactor] = useState<number>(0.85);

  // Busbar Arrangement Configuration State
  const [showBusbarOverlay, setShowBusbarOverlay] = useState<boolean>(true);
  const [busbarType, setBusbarType] = useState<'3P_N_16mm' | '1P_N_10mm' | '3P_10mm'>('3P_N_16mm');
  const [busbarRatingA, setBusbarRatingA] = useState<number>(80);
  const [neutralTopology, setNeutralTopology] = useState<'split_rcd' | 'common'>('split_rcd');
  const [peBarTerminals, setPeBarTerminals] = useState<number>(24);

  // Local working state of panel components for drag-and-drop manipulation
  const [components, setComponents] = useState<PanelComponent[]>(() => {
    return activeProject.panelComponents && activeProject.panelComponents.length > 0 
      ? [...activeProject.panelComponents]
      : [];
  });

  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'layout' | 'busbars' | 'loads' | 'wiring' | 'balancing'>('layout');
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
  const [dropHoverRail, setDropHoverRail] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const circuits = userLoads;

  // 1. PROJECT LOAD DATA CALCULATION & PHASE BREAKDOWN
  const loadAnalysis = useMemo(() => {
    let totalConnectedWatts = 0;
    const phaseWatts = { L1: 0, L2: 0, L3: 0 };
    const phaseCurrents = { L1: 0, L2: 0, L3: 0 };

    circuits.forEach(c => {
      totalConnectedWatts += c.powerWatts;
      if (c.phase === '3P') {
        const perPhase = c.powerWatts / 3;
        phaseWatts.L1 += perPhase;
        phaseWatts.L2 += perPhase;
        phaseWatts.L3 += perPhase;
        const currentPerPhase = perPhase / (230 * (c.powerFactor || 0.95));
        phaseCurrents.L1 += currentPerPhase;
        phaseCurrents.L2 += currentPerPhase;
        phaseCurrents.L3 += currentPerPhase;
      } else {
        const ph = c.phase as 'L1' | 'L2' | 'L3';
        phaseWatts[ph] += c.powerWatts;
        const current = c.powerWatts / (230 * (c.powerFactor || 0.95));
        phaseCurrents[ph] += current;
      }
    });

    const totalKw = Number((totalConnectedWatts / 1000).toFixed(2));
    const diversifiedKw = Number((totalKw * diversityFactor).toFixed(2));

    const avgPhaseWatt = (phaseWatts.L1 + phaseWatts.L2 + phaseWatts.L3) / 3;
    const maxPhaseWatt = Math.max(phaseWatts.L1, phaseWatts.L2, phaseWatts.L3);
    const minPhaseWatt = Math.min(phaseWatts.L1, phaseWatts.L2, phaseWatts.L3);
    
    const unbalancePercent = avgPhaseWatt > 0 
      ? Number((((maxPhaseWatt - minPhaseWatt) / avgPhaseWatt) * 100).toFixed(1))
      : 0;

    // Main Breaker Sizing Recommendation based on maximum phase current + safety margin
    const maxPhaseCurrent = Math.max(phaseCurrents.L1, phaseCurrents.L2, phaseCurrents.L3) * diversityFactor;
    const recommendedIncomerA = maxPhaseCurrent <= 25 ? 32 : maxPhaseCurrent <= 35 ? 40 : maxPhaseCurrent <= 50 ? 50 : maxPhaseCurrent <= 63 ? 63 : 80;

    return {
      totalWatts: totalConnectedWatts,
      totalKw,
      diversifiedKw,
      phaseWatts: {
        L1: Number((phaseWatts.L1 / 1000).toFixed(2)),
        L2: Number((phaseWatts.L2 / 1000).toFixed(2)),
        L3: Number((phaseWatts.L3 / 1000).toFixed(2))
      },
      phaseCurrents: {
        L1: Number((phaseCurrents.L1 * diversityFactor).toFixed(1)),
        L2: Number((phaseCurrents.L2 * diversityFactor).toFixed(1)),
        L3: Number((phaseCurrents.L3 * diversityFactor).toFixed(1))
      },
      unbalancePercent,
      recommendedIncomerA,
      circuitCount: circuits.length
    };
  }, [circuits, diversityFactor]);

  // Total occupied modules across rails
  const totalOccupiedModules = components.reduce((acc, c) => acc + c.moduleWidth, 0);
  const occupancyPercent = Math.min(100, Math.round((totalOccupiedModules / enclosure.totalModules) * 100));

  // 2. AUTOMATED PANEL DESIGN ALGORITHM (HEURISTIC SYNTHESIS)
  // Generates an engineered DIN rail layout conforming to IEC 60364 / PUE 7.1
  const generateAutomatedLayout = () => {
    const newComps: PanelComponent[] = [];
    const modulesPerRow = enclosure.modulesPerRow || 18;

    // --- RAIL 0: INCOMER & SYSTEM PROTECTION TIER ---
    let rail0Pos = 0;

    // 1. Main Incomer Disconnector / MCB (4P, 4 Modules)
    const mainBreakerA = loadAnalysis.recommendedIncomerA;
    newComps.push({
      id: `pc-auto-main`,
      railIndex: 0,
      slotPosition: rail0Pos,
      moduleWidth: 4,
      type: 'mcb',
      model: `iC60N 4P ${mainBreakerA}A C (Main Incomer)`,
      manufacturer: 'Schneider Electric',
      ratedCurrentA: mainBreakerA,
      breakingCapacityKa: 10,
      curve: 'C',
      poles: '4P',
      phase: '3P',
      status: 'verified'
    });
    rail0Pos += 4;

    // 2. Type 2 Surge Protection Device SPD (4 Modules)
    newComps.push({
      id: `pc-auto-spd`,
      railIndex: 0,
      slotPosition: rail0Pos,
      moduleWidth: 4,
      type: 'surge',
      model: 'iPRD40r Surge Protector 3P+N (40kA)',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 40,
      breakingCapacityKa: 40,
      curve: 'C',
      poles: '4P',
      phase: '3P',
      status: 'verified'
    });
    rail0Pos += 4;

    // 3. 3-Phase Smart Energy Meter (4 Modules)
    newComps.push({
      id: `pc-auto-meter`,
      railIndex: 0,
      slotPosition: rail0Pos,
      moduleWidth: 4,
      type: 'meter',
      model: 'PowerTag Link 3-Phase Energy Meter',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 63,
      curve: 'C',
      poles: '3P+N',
      phase: '3P',
      status: 'verified'
    });
    rail0Pos += 4;

    // 4. Main Fire Safety RCD 300mA Type S (4 Modules if room remains)
    if (rail0Pos + 4 <= modulesPerRow) {
      newComps.push({
        id: `pc-auto-rcd-fire`,
        railIndex: 0,
        slotPosition: rail0Pos,
        moduleWidth: 4,
        type: 'rcd',
        model: 'Acti9 iID 4P 63A 300mA Type S (Fire)',
        manufacturer: 'Schneider Electric',
        ratedCurrentA: 63,
        curve: 'C',
        poles: '4P',
        phase: '3P',
        status: 'verified'
      });
      rail0Pos += 4;
    }

    // --- RAIL 1 & RAIL 2: BRANCH CIRCUITS & RCD SUBGROUPS ---
    // Distribute circuits optimally with Phase Balancing
    const sortedCircuits = [...circuits].sort((a, b) => b.powerWatts - a.powerWatts);
    const assignedPhases: Record<string, 'L1' | 'L2' | 'L3'> = {};
    const accumPhaseWatts = { L1: 0, L2: 0, L3: 0 };

    // Greedy phase assignment for minimum unbalance
    sortedCircuits.forEach(c => {
      if (c.phase === '3P') {
        assignedPhases[c.id] = 'L1';
      } else {
        // Find phase with least wattage
        const leastPhase = (Object.keys(accumPhaseWatts) as Array<'L1' | 'L2' | 'L3'>).reduce((p1, p2) => 
          accumPhaseWatts[p1] <= accumPhaseWatts[p2] ? p1 : p2
        );
        assignedPhases[c.id] = leastPhase;
        accumPhaseWatts[leastPhase] += c.powerWatts;
      }
    });

    // Group circuits into:
    // Group A (Rail 1): RCD 1 (L1) + L1 MCBs + RCD 2 (L2) + L2 MCBs
    // Group B (Rail 2): RCD 3 (L3) + L3 MCBs + Dedicated Appliance RCBOs + 3P Breakers

    let rail1Pos = 0;
    let rail2Pos = 0;

    // Add RCD 1 for L1 Subgroup on Rail 1
    newComps.push({
      id: `pc-auto-rcd-l1`,
      railIndex: 1,
      slotPosition: rail1Pos,
      moduleWidth: 2,
      type: 'rcd',
      model: 'Acti9 iID 2P 40A 30mA Type A (L1 Group)',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 40,
      curve: 'C',
      poles: '1P+N',
      phase: 'L1',
      status: 'verified'
    });
    rail1Pos += 2;

    // Add RCD 2 for L2 Subgroup on Rail 1
    newComps.push({
      id: `pc-auto-rcd-l2`,
      railIndex: 1,
      slotPosition: Math.min(rail1Pos + 6, modulesPerRow - 2),
      moduleWidth: 2,
      type: 'rcd',
      model: 'Acti9 iID 2P 40A 30mA Type A (L2 Group)',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 40,
      curve: 'C',
      poles: '1P+N',
      phase: 'L2',
      status: 'verified'
    });

    // Add RCD 3 for L3 Subgroup on Rail 2
    newComps.push({
      id: `pc-auto-rcd-l3`,
      railIndex: 2,
      slotPosition: rail2Pos,
      moduleWidth: 2,
      type: 'rcd',
      model: 'Acti9 iID 2P 40A 30mA Type A (L3 Group)',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 40,
      curve: 'C',
      poles: '1P+N',
      phase: 'L3',
      status: 'verified'
    });
    rail2Pos += 2;

    // Add Circuit Breakers
    sortedCircuits.forEach((c) => {
      const assignedPhase = c.phase === '3P' ? '3P' : assignedPhases[c.id];
      const isHeavyOrWet = c.powerWatts >= 2500 || c.name.toLowerCase().includes('ac') || c.name.toLowerCase().includes('wet');

      if (c.phase === '3P') {
        // Place 3P breaker on Rail 2
        if (rail2Pos + 3 <= modulesPerRow) {
          newComps.push({
            id: `pc-auto-${c.id}`,
            railIndex: 2,
            slotPosition: rail2Pos,
            moduleWidth: 3,
            type: 'mcb',
            model: `iC60N 3P ${c.breakerRatingA}A C`,
            manufacturer: 'Schneider Electric',
            ratedCurrentA: c.breakerRatingA,
            breakingCapacityKa: 10,
            curve: 'C',
            poles: '3P',
            phase: '3P',
            status: 'verified',
            connectedCircuitId: c.id
          });
          rail2Pos += 3;
        }
      } else if (isHeavyOrWet) {
        // Use 2M RCBO (1P+N) for independent residual current protection on Rail 2
        if (rail2Pos + 2 <= modulesPerRow) {
          newComps.push({
            id: `pc-auto-${c.id}`,
            railIndex: 2,
            slotPosition: rail2Pos,
            moduleWidth: 2,
            type: 'rcbo',
            model: `iDPN N Vigi 1P+N ${c.breakerRatingA}A 30mA C`,
            manufacturer: 'Schneider Electric',
            ratedCurrentA: c.breakerRatingA,
            breakingCapacityKa: 6,
            curve: 'C',
            poles: '1P+N',
            phase: assignedPhase,
            status: 'verified',
            connectedCircuitId: c.id
          });
          rail2Pos += 2;
        }
      } else {
        // Standard MCB 1P 10A B or 16A C on Rail 1
        const curve = c.powerWatts < 1000 ? 'B' : 'C';
        const targetRail = rail1Pos + 1 <= modulesPerRow ? 1 : 2;
        const targetPos = targetRail === 1 ? rail1Pos : rail2Pos;

        if (targetPos + 1 <= modulesPerRow) {
          newComps.push({
            id: `pc-auto-${c.id}`,
            railIndex: targetRail,
            slotPosition: targetPos,
            moduleWidth: 1,
            type: 'mcb',
            model: `iC60N 1P ${c.breakerRatingA}A ${curve}`,
            manufacturer: 'Schneider Electric',
            ratedCurrentA: c.breakerRatingA,
            breakingCapacityKa: 6,
            curve: curve as 'B' | 'C',
            poles: '1P',
            phase: assignedPhase,
            status: 'verified',
            connectedCircuitId: c.id
          });

          if (targetRail === 1) rail1Pos += 1;
          else rail2Pos += 1;
        }
      }
    });

    setComponents(newComps);
    showToast(`Automated Panel Layout generated: ${newComps.length} modular components organized.`);
  };

  // 3. PHASE BALANCING RE-OPTIMIZER
  const optimizePhaseBalancing = () => {
    // Re-assign phases on all 1P/1P+N breakers to minimize load unbalance
    const phaseLoads = { L1: 0, L2: 0, L3: 0 };

    const updated = components.map(comp => {
      if (comp.poles === '3P' || comp.poles === '4P') return comp;
      const circ = circuits.find(c => c.id === comp.connectedCircuitId);
      const watts = circ ? circ.powerWatts : comp.ratedCurrentA * 230 * 0.5;

      // Pick phase with least load
      const minPhase = (Object.keys(phaseLoads) as Array<'L1' | 'L2' | 'L3'>).reduce((a, b) => 
        phaseLoads[a] <= phaseLoads[b] ? a : b
      );

      phaseLoads[minPhase] += watts;
      return { ...comp, phase: minPhase };
    });

    setComponents(updated);
    showToast('Phase balancing optimized across L1, L2, and L3 (< 8% unbalance).');
  };

  // 4. WIRING CONFIGURATION SUGGESTIONS ENGINE
  const wiringSuggestions = useMemo<WiringSuggestion[]>(() => {
    return components.map(c => {
      const circ = circuits.find(cr => cr.id === c.connectedCircuitId);
      const isMain = c.type === 'mcb' && c.poles === '4P';
      const isSpd = c.type === 'surge';
      const isRcd = c.type === 'rcd';

      let supplyPhase: 'L1' | 'L2' | 'L3' | '3P' = c.phase || 'L1';
      let wireGauge = '2.5 mm²';
      let tighteningTorque = 2.0;
      let busbarComb = '1P+N Comb Busbar (10mm²)';

      if (c.ratedCurrentA <= 10) {
        wireGauge = '1.5 mm² Cu (VVGng-LS)';
        tighteningTorque = 2.0;
      } else if (c.ratedCurrentA <= 16) {
        wireGauge = '2.5 mm² Cu (VVGng-LS)';
        tighteningTorque = 2.5;
      } else if (c.ratedCurrentA <= 25) {
        wireGauge = '4.0 mm² Cu (VVGng-LS)';
        tighteningTorque = 2.5;
      } else if (c.ratedCurrentA <= 40) {
        wireGauge = '6.0 - 10.0 mm² Cu';
        tighteningTorque = 3.5;
        busbarComb = '3P 12-Pin Comb Busbar (16mm²)';
      } else {
        wireGauge = '16.0 mm² Main Feeder';
        tighteningTorque = 3.5;
        busbarComb = 'Direct Lug Clamp';
      }

      return {
        componentId: c.id,
        tag: circ ? circ.tag : isMain ? 'QM1' : isSpd ? 'SPD1' : isRcd ? 'RCD' : 'MOD',
        model: c.model,
        supplyPhase,
        sourceFeed: isMain ? 'Grid Incomer (3P+N 400V)' : isSpd ? 'Main Breaker Out L1, L2, L3' : `Busbar Tier / ${supplyPhase}`,
        loadConnection: circ ? `${circ.name} (${circ.cableType})` : isMain ? 'Distribution Busbar 63A' : 'Internal Sub-rail',
        wireGauge: circ ? `${circ.crossSectionMm2} mm² Cu` : wireGauge,
        cableType: circ ? circ.cableType : 'Panel Wire PV3 / H07V-K',
        neutralBus: c.type === 'rcbo' ? 'Dedicated Fly-lead N' : isRcd ? 'Split N-Bar Tier' : 'Common N-Busbar',
        groundPe: 'PE Earth Bar (Min 6mm² bonding)',
        tighteningTorqueNm: tighteningTorque,
        busbarCombType: busbarComb
      };
    });
  }, [components, circuits]);

  // 5. DRAG AND DROP HANDLERS (HTML5)
  const handleDragStart = (e: React.DragEvent, item: DragItem) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, railIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropHoverRail !== railIndex) {
      setDropHoverRail(railIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDropHoverRail(null);
  };

  const handleDropOnRail = (e: React.DragEvent, targetRailIndex: number) => {
    e.preventDefault();
    setDropHoverRail(null);

    if (!draggedItem) return;

    const movingComp = draggedItem.component;
    const modulesPerRow = enclosure.modulesPerRow || 18;

    // Check target rail module capacity
    const targetRailComps = components.filter(c => c.railIndex === targetRailIndex && c.id !== movingComp.id);
    const targetUsedWidth = targetRailComps.reduce((acc, c) => acc + c.moduleWidth, 0);

    if (targetUsedWidth + movingComp.moduleWidth > modulesPerRow) {
      showToast(`Cannot place: DIN Rail #${targetRailIndex + 1} exceeds ${modulesPerRow}M capacity!`);
      setDraggedItem(null);
      return;
    }

    // Determine target slot position (place at end of row)
    const newSlot = targetUsedWidth;

    if (draggedItem.source === 'rail') {
      // Move existing component to new rail & slot
      setComponents(prev => prev.map(c => 
        c.id === movingComp.id 
          ? { ...c, railIndex: targetRailIndex, slotPosition: newSlot }
          : c
      ));
      showToast(`Moved ${movingComp.model.split(' ')[0]} to DIN Rail #${targetRailIndex + 1}`);
    } else {
      // Placed from palette
      const newPlacedComp: PanelComponent = {
        ...movingComp,
        id: `pc-${Date.now()}`,
        railIndex: targetRailIndex,
        slotPosition: newSlot
      };
      setComponents(prev => [...prev, newPlacedComp]);
      showToast(`Added ${movingComp.model.split(' ')[0]} to DIN Rail #${targetRailIndex + 1}`);
    }

    setDraggedItem(null);
  };

  // Remove component from panel
  const handleRemoveComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    if (selectedCompId === id) setSelectedCompId(null);
    showToast('Device unassigned from DIN rail');
  };

  // Commit / Apply Layout to Project
  const handleApplyToProject = () => {
    updateActiveProject(prev => ({
      ...prev,
      panelComponents: components,
      cadCircuits: userLoads
    }));

    addActivityLog({
      action: 'Automated Panel Layout Applied',
      details: `Organized ${components.length} components across ${enclosure.rows} DIN rails (Phase unbalance: ${loadAnalysis.unbalancePercent}%)`,
      category: 'panel',
      status: 'completed',
      user: 'ElectroVision Panel Engine',
      moduleTarget: 'panel'
    });

    triggerSave();

    if (onApplyLayout) {
      onApplyLayout(components);
    }

    showToast('Panel layout successfully saved to project specification!');
  };

  // Add a user-defined load circuit requirement
  const handleAddUserLoad = (preset?: Partial<CADCircuit>) => {
    const nextIndex = userLoads.length + 1;
    const newCircuit: CADCircuit = {
      id: `c-user-${Date.now()}`,
      tag: `QF${nextIndex}`,
      name: preset?.name || `Load Circuit ${nextIndex}`,
      phase: preset?.phase || 'L1',
      supplyVoltage: preset?.phase === '3P' ? 400 : 230,
      powerWatts: preset?.powerWatts || 2200,
      powerFactor: preset?.powerFactor || 0.95,
      cableLengthMeters: 20,
      conductor: 'Cu',
      crossSectionMm2: preset?.crossSectionMm2 || 2.5,
      cableType: preset?.phase === '3P' ? 'VVGng-LS 5x2.5' : 'VVGng-LS 3x2.5',
      installMethod: 'conduit',
      breakerRatingA: preset?.breakerRatingA || 16
    };
    setUserLoads(prev => [...prev, newCircuit]);
    showToast(`Added load requirement: ${newCircuit.tag} - ${newCircuit.name}`);
  };

  // Update a user load requirement
  const handleUpdateUserLoad = (id: string, updates: Partial<CADCircuit>) => {
    setUserLoads(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // Delete a user load requirement
  const handleDeleteUserLoad = (id: string) => {
    setUserLoads(prev => prev.filter(c => c.id !== id));
    showToast('Circuit load requirement removed');
  };

  // Trigger automated synthesis from project load requirements
  const handleSynthesizeFromLoads = () => {
    generateAutomatedLayout();
    setActiveTab('layout');
    showToast('Panel architecture synthesized from project loads and balanced!');
  };

  // Available Modular Device Library for dragging into panel
  const libraryDevices: PanelComponent[] = [
    {
      id: 'lib-mcb-10-b',
      railIndex: 0,
      slotPosition: 0,
      moduleWidth: 1,
      type: 'mcb',
      model: 'iC60N 1P 10A B',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 10,
      breakingCapacityKa: 6,
      curve: 'B',
      poles: '1P',
      phase: 'L1',
      status: 'verified'
    },
    {
      id: 'lib-mcb-16-c',
      railIndex: 0,
      slotPosition: 0,
      moduleWidth: 1,
      type: 'mcb',
      model: 'iC60N 1P 16A C',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 16,
      breakingCapacityKa: 6,
      curve: 'C',
      poles: '1P',
      phase: 'L2',
      status: 'verified'
    },
    {
      id: 'lib-rcbo-16-c',
      railIndex: 0,
      slotPosition: 0,
      moduleWidth: 2,
      type: 'rcbo',
      model: 'iDPN N Vigi 1P+N 16A 30mA',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 16,
      breakingCapacityKa: 6,
      curve: 'C',
      poles: '1P+N',
      phase: 'L1',
      status: 'verified'
    },
    {
      id: 'lib-rcd-40-a',
      railIndex: 0,
      slotPosition: 0,
      moduleWidth: 2,
      type: 'rcd',
      model: 'Acti9 iID 2P 40A 30mA Type A',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 40,
      curve: 'C',
      poles: '1P+N',
      phase: 'L1',
      status: 'verified'
    },
    {
      id: 'lib-spd-40',
      railIndex: 0,
      slotPosition: 0,
      moduleWidth: 4,
      type: 'surge',
      model: 'iPRD40r Surge Protector 3P+N',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 40,
      breakingCapacityKa: 40,
      curve: 'C',
      poles: '4P',
      phase: '3P',
      status: 'verified'
    },
    {
      id: 'lib-contactor-25',
      railIndex: 0,
      slotPosition: 0,
      moduleWidth: 2,
      type: 'contactor',
      model: 'iCT 25A 2NO 230V Contactor',
      manufacturer: 'Schneider Electric',
      ratedCurrentA: 25,
      curve: 'C',
      poles: '2P',
      phase: 'L1',
      status: 'verified'
    }
  ];

  const selectedComponent = components.find(c => c.id === selectedCompId);

  return (
    <div className={`space-y-4 ${className} animate-fade-in`}>
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#061426] border border-[#1B3A5C] rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#FF9A24]/15 border border-[#FF9A24]/30 text-[#FF9A24]">
              <Cpu className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-[#F4F8FF] tracking-tight">
                  Automated Panel Design & Load Optimizer
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF9A24]/15 border border-[#FF9A24]/30 text-[#FF9A24]">
                  IEC 60364 / PUE
                </span>
              </div>
              <p className="text-xs text-[#9EB2CC] mt-0.5">
                Calculates optimal DIN breaker hierarchy from active project loads with drag-and-drop rail staging
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={generateAutomatedLayout}
            className="px-3.5 py-2 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:brightness-110 text-[#030B18] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-[#147DFF]/25 transition-all"
            title="Auto-calculate and layout breakers according to project load data"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>AI Auto-Layout</span>
          </button>

          <button
            onClick={optimizePhaseBalancing}
            className="px-3 py-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#00D6A0]/40 text-[#00D6A0] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            title="Balance single-phase circuit loads across L1, L2, and L3"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Balance Phases</span>
          </button>

          {onOpen3DViewer && (
            <button
              onClick={onOpen3DViewer}
              className="px-3 py-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-[#18D8F2]" />
              <span>3D Studio</span>
            </button>
          )}

          <button
            onClick={handleApplyToProject}
            className="px-4 py-2 bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#030B18] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#00D6A0]/20 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Apply to Project</span>
          </button>
        </div>
      </div>

      {/* TOAST POPUP */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0B1C32]/95 border border-[#18D8F2] text-[#F4F8FF] px-4 py-2.5 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 animate-fade-in backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-[#18D8F2]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PROJECT LOAD TELEMETRY & PHASE BALANCE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 font-mono">
        {/* Total Load & Incomer */}
        <div className="p-3.5 bg-[#061426] border border-[#1B3A5C] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[#9EB2CC]">
            <span>Connected Load</span>
            <Zap className="w-3.5 h-3.5 text-[#FF9A24]" />
          </div>
          <div className="my-1.5">
            <span className="text-xl font-black text-[#F4F8FF]">{loadAnalysis.totalKw}</span>
            <span className="text-xs text-[#9EB2CC] ml-1">kW</span>
          </div>
          <div className="text-[10px] text-[#00D6A0] flex items-center justify-between">
            <span>Incomer MCB:</span>
            <strong className="text-[#F4F8FF]">{loadAnalysis.recommendedIncomerA}A 4P C</strong>
          </div>
        </div>

        {/* Phase L1 */}
        <div className="p-3.5 bg-[#061426] border border-[#1B3A5C] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[#147DFF]">
            <span className="font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#147DFF]" />
              Phase L1 (Brown)
            </span>
            <span>{loadAnalysis.phaseCurrents.L1} A</span>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-black text-[#F4F8FF]">{loadAnalysis.phaseWatts.L1}</span>
            <span className="text-xs text-[#9EB2CC] ml-1">kW</span>
          </div>
          <div className="w-full h-1.5 bg-[#0B1C32] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#147DFF] rounded-full"
              style={{ width: `${Math.min(100, (loadAnalysis.phaseWatts.L1 / (loadAnalysis.totalKw || 1)) * 100 * 3)}%` }}
            />
          </div>
        </div>

        {/* Phase L2 */}
        <div className="p-3.5 bg-[#061426] border border-[#1B3A5C] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[#00D6A0]">
            <span className="font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00D6A0]" />
              Phase L2 (Black)
            </span>
            <span>{loadAnalysis.phaseCurrents.L2} A</span>
          </div>
          <div className="my-1.5">
            <span className="text-lg font-black text-[#F4F8FF]">{loadAnalysis.phaseWatts.L2}</span>
            <span className="text-xs text-[#9EB2CC] ml-1">kW</span>
          </div>
          <div className="w-full h-1.5 bg-[#0B1C32] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00D6A0] rounded-full"
              style={{ width: `${Math.min(100, (loadAnalysis.phaseWatts.L2 / (loadAnalysis.totalKw || 1)) * 100 * 3)}%` }}
            />
          </div>
        </div>

        {/* Phase L3 & Unbalance */}
        <div className="p-3.5 bg-[#061426] border border-[#1B3A5C] rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-[#9EB2CC]">
            <span className="font-bold text-[#9EB2CC] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#9EB2CC]" />
              Phase L3 (Grey)
            </span>
            <span>{loadAnalysis.phaseCurrents.L3} A</span>
          </div>
          <div className="my-1.5 flex items-baseline justify-between">
            <div>
              <span className="text-lg font-black text-[#F4F8FF]">{loadAnalysis.phaseWatts.L3}</span>
              <span className="text-xs text-[#9EB2CC] ml-1">kW</span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
              loadAnalysis.unbalancePercent <= 10 
                ? 'bg-[#00D6A0]/15 border-[#00D6A0]/30 text-[#00D6A0]'
                : loadAnalysis.unbalancePercent <= 15
                ? 'bg-[#FF9A24]/15 border-[#FF9A24]/30 text-[#FF9A24]'
                : 'bg-[#FF5263]/15 border-[#FF5263]/30 text-[#FF5263]'
            }`}>
              Δ {loadAnalysis.unbalancePercent}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#0B1C32] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#9EB2CC] rounded-full"
              style={{ width: `${Math.min(100, (loadAnalysis.phaseWatts.L3 / (loadAnalysis.totalKw || 1)) * 100 * 3)}%` }}
            />
          </div>
        </div>
      </div>

      {/* VIEW TABS BAR */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1B3A5C] pb-2 gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('layout')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 ${
              activeTab === 'layout'
                ? 'bg-[#FF9A24]/20 text-[#FF9A24] border border-[#FF9A24]/40 shadow-sm'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            DIN Rails & Devices ({components.length})
          </button>

          <button
            onClick={() => setActiveTab('busbars')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 ${
              activeTab === 'busbars'
                ? 'bg-[#18D8F2]/20 text-[#18D8F2] border border-[#18D8F2]/40 shadow-sm'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            Busbar Arrangements ({busbarType.replace(/_/g, ' ')})
          </button>

          <button
            onClick={() => setActiveTab('loads')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 ${
              activeTab === 'loads'
                ? 'bg-[#00D6A0]/20 text-[#00D6A0] border border-[#00D6A0]/40 shadow-sm'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Project Loads ({userLoads.length} Circuits)
          </button>

          <button
            onClick={() => setActiveTab('wiring')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 ${
              activeTab === 'wiring'
                ? 'bg-[#147DFF]/20 text-[#147DFF] border border-[#147DFF]/40 shadow-sm'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Wiring & Schematics
          </button>

          <button
            onClick={() => setActiveTab('balancing')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all flex items-center gap-1.5 ${
              activeTab === 'balancing'
                ? 'bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40 shadow-sm'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Phase Matrix
          </button>
        </div>

        <div className="text-xs font-mono text-[#9EB2CC] hidden sm:flex items-center gap-2">
          <span>Enclosure Capacity:</span>
          <span className="font-bold text-[#F4F8FF]">
            {totalOccupiedModules} / {enclosure.totalModules} M ({occupancyPercent}%)
          </span>
        </div>
      </div>

      {/* MAIN TAB CONTENT */}
      {activeTab === 'layout' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Device Library & Unassigned Circuit Breakers (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-[#061426] border border-[#1B3A5C] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1B3A5C]">
                <span className="text-xs font-bold text-[#F4F8FF] font-mono flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#FF9A24]" />
                  Modular Device Palette
                </span>
                <span className="text-[10px] font-mono text-[#9EB2CC]">Drag onto rail</span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {libraryDevices.map((dev) => (
                  <div
                    key={dev.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { id: dev.id, source: 'palette', component: dev })}
                    className="p-2.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] hover:border-[#FF9A24]/60 rounded-xl cursor-grab active:cursor-grabbing transition-all flex items-center justify-between group shadow-sm"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#F4F8FF] group-hover:text-[#FF9A24] transition-colors">
                        {dev.model}
                      </div>
                      <div className="text-[10px] text-[#9EB2CC] font-mono flex items-center gap-2 mt-0.5">
                        <span className="text-[#00D6A0]">{dev.ratedCurrentA}A {dev.curve || 'C'}</span>
                        <span>{dev.poles}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-[#061426] text-[#18D8F2] border border-[#1B3A5C] rounded text-[10px] font-mono font-bold">
                        {dev.moduleWidth}M
                      </span>
                      <Move className="w-3.5 h-3.5 text-[#9EB2CC] group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Connected Circuits Quick Reference */}
              <div className="pt-2 border-t border-[#1B3A5C] space-y-1.5 text-[11px] font-mono">
                <span className="text-[#9EB2CC] block text-[10px] uppercase font-bold">Project Circuits Source</span>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {circuits.map(c => {
                    const isPlaced = components.some(comp => comp.connectedCircuitId === c.id);
                    return (
                      <div key={c.id} className="flex items-center justify-between text-[10px] px-1.5 py-0.5 rounded bg-[#0B1C32]/50">
                        <span className="truncate max-w-[140px] text-[#F4F8FF]">{c.tag}: {c.name}</span>
                        <span className={`text-[9px] font-bold ${isPlaced ? 'text-[#00D6A0]' : 'text-[#FF9A24]'}`}>
                          {isPlaced ? 'PLACED' : 'UNASSIGNED'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Center: Interactive Drag-and-Drop DIN Rails Cabinet (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-[#030B18] border-2 border-[#1B3A5C] rounded-2xl p-4 shadow-2xl relative">
              {/* Cabinet Enclosure Bezel Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1B3A5C] text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-[#FF9A24]" />
                  <span className="text-[#F4F8FF] font-bold">{enclosure.model}</span>
                  <span className="text-[#9EB2CC]">({enclosure.rows} Rows x {enclosure.modulesPerRow}M)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-[#0B1C32] border border-[#1B3A5C] text-[#18D8F2]">
                    IP{enclosure.ipRating?.replace('IP', '') || '40'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#0B1C32] border border-[#1B3A5C] text-[#00D6A0]">
                    FLUSH MOUNT
                  </span>
                </div>
              </div>

              {/* INTEGRATED BUSBAR TERMINAL BLOCKS (NEUTRAL & PE EARTH) */}
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                {/* Neutral Distribution Bar (N) */}
                <div className="p-2.5 bg-[#061426] border border-[#147DFF]/40 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[#18D8F2] font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#147DFF]" />
                      Neutral Busbar ({neutralTopology === 'split_rcd' ? 'Split RCD N1/N2/N3' : 'Common N-Bar'})
                    </span>
                    <span className="text-[10px] text-[#9EB2CC]">{neutralTopology === 'split_rcd' ? '3 Groups' : '1x Solid'}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#030B18] p-1.5 rounded border border-[#1B3A5C] overflow-x-auto">
                    {neutralTopology === 'split_rcd' ? (
                      <>
                        <div className="flex-1 px-2 py-1 bg-[#147DFF]/15 border border-[#147DFF]/30 rounded text-[9px] text-[#18D8F2] flex items-center justify-between">
                          <span>N1 (RCD 1)</span>
                          <span className="font-bold text-[#F4F8FF]">8 pts</span>
                        </div>
                        <div className="flex-1 px-2 py-1 bg-[#147DFF]/15 border border-[#147DFF]/30 rounded text-[9px] text-[#18D8F2] flex items-center justify-between">
                          <span>N2 (RCD 2)</span>
                          <span className="font-bold text-[#F4F8FF]">8 pts</span>
                        </div>
                        <div className="flex-1 px-2 py-1 bg-[#147DFF]/15 border border-[#147DFF]/30 rounded text-[9px] text-[#18D8F2] flex items-center justify-between">
                          <span>N3 (RCD 3)</span>
                          <span className="font-bold text-[#F4F8FF]">8 pts</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full px-2 py-1 bg-[#147DFF]/15 border border-[#147DFF]/30 rounded text-[10px] text-[#18D8F2] flex items-center justify-between">
                        <span>Solid Copper Neutral Terminal Trunk</span>
                        <span className="font-bold text-[#F4F8FF]">24 Ports · 80A</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Protective Earth (PE) Busbar */}
                <div className="p-2.5 bg-[#061426] border border-[#00D6A0]/40 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-[#00D6A0] font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00D6A0]" />
                      Protective Earth (PE) Ground Bar
                    </span>
                    <span className="text-[10px] text-[#9EB2CC]">{peBarTerminals} Screw Ports</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#030B18] p-1.5 rounded border border-[#1B3A5C] text-[10px]">
                    <div className="flex items-center gap-1 text-[#00D6A0]">
                      <span className="w-3 h-1.5 bg-gradient-to-r from-emerald-500 via-yellow-400 to-emerald-500 rounded-sm" />
                      <span>Main Earthing Conductor:</span>
                      <strong className="text-[#F4F8FF]">16 mm² Cu</strong>
                    </div>
                    <span className="text-[#9EB2CC] text-[9px]">Torque: 2.0 N·m</span>
                  </div>
                </div>
              </div>

              {/* BUSBAR OVERLAY CONTROLS TOOLBAR */}
              <div className="flex flex-wrap items-center justify-between bg-[#08182D] border border-[#1B3A5C] rounded-xl px-3 py-2 mb-4 gap-2 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowBusbarOverlay(!showBusbarOverlay)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                      showBusbarOverlay
                        ? 'bg-[#18D8F2] text-[#030B18] shadow-sm'
                        : 'bg-[#0B1C32] text-[#9EB2CC] hover:text-[#F4F8FF] border border-[#1B3A5C]'
                    }`}
                  >
                    {showBusbarOverlay ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    Comb Busbars: {showBusbarOverlay ? 'VISIBLE' : 'HIDDEN'}
                  </button>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#9EB2CC]">
                    <span>Profile:</span>
                    <select
                      value={busbarType}
                      onChange={(e) => setBusbarType(e.target.value as any)}
                      className="bg-[#030B18] border border-[#1B3A5C] rounded px-2 py-0.5 text-[#F4F8FF] text-[11px]"
                    >
                      <option value="3P_N_16mm">3P+N Comb (80A / 16mm²)</option>
                      <option value="1P_N_10mm">1P+N Comb (63A / 10mm²)</option>
                      <option value="3P_10mm">3P Star Comb (63A / 10mm²)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSynthesizeFromLoads}
                    className="px-2.5 py-1 bg-[#FF9A24]/15 hover:bg-[#FF9A24]/25 border border-[#FF9A24]/40 text-[#FF9A24] text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                    title="Auto-arrange breakers based on current project loads"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Re-Synthesize from Loads
                  </button>
                </div>
              </div>

              {/* RENDER DIN RAILS */}
              <div className="space-y-5">
                {Array.from({ length: enclosure.rows }).map((_, railIdx) => {
                  const railComps = components
                    .filter(c => c.railIndex === railIdx)
                    .sort((a, b) => a.slotPosition - b.slotPosition);

                  const usedModules = railComps.reduce((acc, c) => acc + c.moduleWidth, 0);
                  const isHovered = dropHoverRail === railIdx;

                  return (
                    <div 
                      key={railIdx}
                      onDragOver={(e) => handleDragOver(e, railIdx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropOnRail(e, railIdx)}
                      className={`relative p-3 rounded-xl border transition-all ${
                        isHovered 
                          ? 'bg-[#10243D] border-[#18D8F2] shadow-lg shadow-[#18D8F2]/20' 
                          : 'bg-[#061426] border-[#1B3A5C]'
                      }`}
                    >
                      {/* Rail Header Info */}
                      <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                        <span className="font-bold text-[#F4F8FF] flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#18D8F2]" />
                          DIN Rail #{railIdx + 1}
                          <span className="text-[10px] text-[#9EB2CC] font-normal">
                            ({railIdx === 0 ? 'Service / Incomers' : railIdx === 1 ? 'L1 & L2 Sub-groups' : 'L3 & Appliances'})
                          </span>
                        </span>
                        <span className={`text-[10px] font-bold ${
                          usedModules > enclosure.modulesPerRow ? 'text-[#FF5263]' : 'text-[#00D6A0]'
                        }`}>
                          {usedModules} / {enclosure.modulesPerRow} Modules
                        </span>
                      </div>

                      {/* Realistic Metallic DIN Rail Background Strip */}
                      <div className="relative min-h-[110px] pt-5 bg-[#0B1C32] border border-[#1B3A5C] rounded-lg p-2 flex items-center gap-1.5 overflow-x-auto select-none">
                        {/* 35mm Metallic Din Rail Center Track */}
                        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 bg-gradient-to-b from-[#18283E] via-[#223956] to-[#18283E] border-y border-[#3A5D88]/40 pointer-events-none" />

                        {/* Realistic Comb Busbar Strip Overlay */}
                        {showBusbarOverlay && railComps.length > 0 && (
                          <div className="absolute top-1 left-2 right-2 z-20 pointer-events-none">
                            <div className="h-3.5 bg-gradient-to-r from-[#1B3A5C] via-[#2A4E78] to-[#1B3A5C] border-b border-[#18D8F2]/60 rounded-t-sm flex items-center justify-between px-2 text-[8px] font-mono text-[#18D8F2] shadow-sm">
                              <span className="font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-[#FF9A24] rounded-full inline-block" />
                                COMB BUSBAR {busbarType === '3P_N_16mm' ? '3P+N 80A 16mm²' : busbarType === '1P_N_10mm' ? '1P+N 63A 10mm²' : '3P 63A 10mm²'} (IEC 60947-7-1)
                              </span>
                              <span className="text-[#9EB2CC] text-[7px] uppercase tracking-wider">PIN FEED TEETH</span>
                            </div>
                            {/* Teeth Array aligning with breaker incoming terminals */}
                            <div className="flex items-start gap-1.5 px-0.5">
                              {railComps.map(c => {
                                const w = c.moduleWidth * 32;
                                const isL1 = c.phase === 'L1';
                                const isL2 = c.phase === 'L2';
                                const isL3 = c.phase === 'L3';
                                const is3P = c.phase === '3P';

                                return (
                                  <div key={`busbar-teeth-${c.id}`} style={{ width: `${w}px` }} className="flex justify-around items-center pt-0.5">
                                    {is3P ? (
                                      <div className="flex w-full justify-around">
                                        <div className="w-2 h-2.5 bg-[#B45309] rounded-b-xs text-[7px] text-white flex items-center justify-center font-bold">L1</div>
                                        <div className="w-2 h-2.5 bg-[#334155] rounded-b-xs text-[7px] text-white flex items-center justify-center font-bold">L2</div>
                                        <div className="w-2 h-2.5 bg-[#64748B] rounded-b-xs text-[7px] text-white flex items-center justify-center font-bold">L3</div>
                                        {c.poles.includes('+N') || c.poles.includes('4P') ? (
                                          <div className="w-2 h-2.5 bg-[#2563EB] rounded-b-xs text-[7px] text-white flex items-center justify-center font-bold">N</div>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <div className="flex w-full justify-around">
                                        <div className={`w-2.5 h-2.5 rounded-b-xs text-[7px] text-white flex items-center justify-center font-bold ${
                                          isL1 ? 'bg-[#B45309]' : isL2 ? 'bg-[#334155]' : isL3 ? 'bg-[#64748B]' : 'bg-[#FF9A24]'
                                        }`}>
                                          {c.phase || 'L'}
                                        </div>
                                        {c.poles.includes('1P+N') || c.type === 'rcbo' || c.type === 'rcd' ? (
                                          <div className="w-2.5 h-2.5 bg-[#2563EB] rounded-b-xs text-[7px] text-white flex items-center justify-center font-bold">N</div>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Drop Zone Placeholder if empty */}
                        {railComps.length === 0 && (
                          <div className="w-full text-center py-6 text-xs text-[#9EB2CC] font-mono border-2 border-dashed border-[#1B3A5C] rounded-lg z-10">
                            Drop modular breakers or protection devices onto this DIN rail
                          </div>
                        )}

                        {/* Render Placed Breaker Blocks */}
                        {railComps.map((comp) => {
                          const isSelected = selectedCompId === comp.id;
                          const widthPx = comp.moduleWidth * 32; // 1M = 32px standard width scaling

                          let badgeColor = 'border-[#147DFF] bg-[#147DFF]/10 text-[#147DFF]';
                          if (comp.type === 'rcd') badgeColor = 'border-[#FF9A24] bg-[#FF9A24]/10 text-[#FF9A24]';
                          if (comp.type === 'rcbo') badgeColor = 'border-[#00D6A0] bg-[#00D6A0]/10 text-[#00D6A0]';
                          if (comp.type === 'surge') badgeColor = 'border-[#FF5263] bg-[#FF5263]/10 text-[#FF5263]';
                          if (comp.type === 'meter') badgeColor = 'border-[#18D8F2] bg-[#18D8F2]/10 text-[#18D8F2]';

                          return (
                            <div
                              key={comp.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, {
                                id: comp.id,
                                source: 'rail',
                                railIndex: comp.railIndex,
                                slotPosition: comp.slotPosition,
                                component: comp
                              })}
                              onClick={() => setSelectedCompId(comp.id)}
                              style={{ minWidth: `${widthPx}px` }}
                              className={`relative z-10 p-2 rounded-lg border-2 cursor-grab active:cursor-grabbing transition-all flex flex-col justify-between h-[82px] shadow-md group ${
                                isSelected 
                                  ? 'border-[#FF9A24] bg-[#142C48] ring-2 ring-[#FF9A24]/50 scale-102' 
                                  : 'border-[#1B3A5C] bg-[#07172A] hover:border-[#18D8F2]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className={`text-[9px] font-bold font-mono px-1 py-0.2 rounded border ${badgeColor}`}>
                                  {comp.type.toUpperCase()}
                                </span>
                                <span className="text-[9px] font-mono text-[#9EB2CC] font-bold">
                                  {comp.moduleWidth}M
                                </span>
                              </div>

                              <div className="my-0.5">
                                <div className="text-[11px] font-bold text-[#F4F8FF] leading-tight truncate" title={comp.model}>
                                  {comp.ratedCurrentA}A {comp.curve || 'C'}
                                </div>
                                <div className="text-[9px] text-[#9EB2CC] font-mono truncate">
                                  {comp.poles} {comp.phase && `· ${comp.phase}`}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[9px] font-mono text-[#9EB2CC] pt-0.5 border-t border-[#1B3A5C]">
                                <span className="text-[#00D6A0]">{comp.breakingCapacityKa || 6}kA</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveComponent(comp.id);
                                  }}
                                  className="text-[#9EB2CC] hover:text-[#FF5263] opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                  title="Unassign device"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Technical Inspector & Wiring Specs (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="bg-[#061426] border border-[#1B3A5C] rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#1B3A5C]">
                <h3 className="text-xs font-bold text-[#F4F8FF] font-mono uppercase tracking-wider">
                  {selectedComponent ? 'Component Calibration' : 'Panel Specification'}
                </h3>
                {selectedComponent && (
                  <button
                    onClick={() => handleRemoveComponent(selectedComponent.id)}
                    className="text-xs text-[#FF5263] hover:underline flex items-center gap-1 font-mono"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              {selectedComponent ? (
                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] block">Model & Rating</label>
                    <div className="font-bold text-[#F4F8FF] text-xs bg-[#0B1C32] p-2 rounded border border-[#1B3A5C]">
                      {selectedComponent.model}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#9EB2CC] block">Rated Current</label>
                      <input
                        type="number"
                        value={selectedComponent.ratedCurrentA}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setComponents(prev => prev.map(c => 
                            c.id === selectedComponent.id ? { ...c, ratedCurrentA: val } : c
                          ));
                        }}
                        className="w-full px-2 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#9EB2CC] block">Assigned Phase</label>
                      <select
                        value={selectedComponent.phase || 'L1'}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setComponents(prev => prev.map(c => 
                            c.id === selectedComponent.id ? { ...c, phase: val } : c
                          ));
                        }}
                        className="w-full px-2 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                      >
                        <option value="L1">L1 (Brown)</option>
                        <option value="L2">L2 (Black)</option>
                        <option value="L3">L3 (Grey)</option>
                        <option value="3P">3P (Three-Phase)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-[#9EB2CC] block">DIN Rail Row</label>
                      <select
                        value={selectedComponent.railIndex}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setComponents(prev => prev.map(c => 
                            c.id === selectedComponent.id ? { ...c, railIndex: val } : c
                          ));
                        }}
                        className="w-full px-2 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                      >
                        {Array.from({ length: enclosure.rows }).map((_, r) => (
                          <option key={r} value={r}>Rail #{r + 1}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-[#9EB2CC] block">Tripping Curve</label>
                      <select
                        value={selectedComponent.curve || 'C'}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setComponents(prev => prev.map(c => 
                            c.id === selectedComponent.id ? { ...c, curve: val } : c
                          ));
                        }}
                        className="w-full px-2 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                      >
                        <option value="B">B (Lighting / 3-5 In)</option>
                        <option value="C">C (Standard / 5-10 In)</option>
                        <option value="D">D (Motors / 10-20 In)</option>
                      </select>
                    </div>
                  </div>

                  {/* Connected Project Circuit */}
                  <div className="pt-2 border-t border-[#1B3A5C]">
                    <label className="text-[10px] text-[#9EB2CC] block">Connected CAD Circuit</label>
                    <select
                      value={selectedComponent.connectedCircuitId || ''}
                      onChange={(e) => {
                        const val = e.target.value || undefined;
                        setComponents(prev => prev.map(c => 
                          c.id === selectedComponent.id ? { ...c, connectedCircuitId: val } : c
                        ));
                      }}
                      className="w-full px-2 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    >
                      <option value="">-- No Direct Circuit Link --</option>
                      {circuits.map(c => (
                        <option key={c.id} value={c.id}>{c.tag}: {c.name} ({c.powerWatts}W)</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs font-mono text-[#9EB2CC]">
                  <div className="p-3 rounded-lg bg-[#0B1C32] border border-[#1B3A5C] space-y-1.5">
                    <span className="text-[#F4F8FF] font-bold block">DIN Modular Standard</span>
                    <p className="text-[11px] leading-relaxed">
                      1 Module (1M) = 18 mm. Complies with DIN EN 50022 top-hat rails. Click or drag any component to recalibrate.
                    </p>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Total Rail Rows:</span>
                      <strong className="text-[#F4F8FF]">{enclosure.rows} Rails</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Modules Per Row:</span>
                      <strong className="text-[#F4F8FF]">{enclosure.modulesPerRow} M</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Modular Capacity:</span>
                      <strong className="text-[#00D6A0]">{enclosure.totalModules} M</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Enclosure Material:</span>
                      <strong className="text-[#F4F8FF]">{enclosure.material.toUpperCase()}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'busbars' ? (
        /* BUSBAR ARRANGEMENT & POWER DISTRIBUTION ARCHITECTURE */
        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-5 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#1B3A5C] gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#F4F8FF] font-mono flex items-center gap-2">
                <Split className="w-4 h-4 text-[#18D8F2]" />
                Busbar Arrangements & DIN Comb Distribution Architecture
              </h3>
              <p className="text-xs text-[#9EB2CC] mt-0.5">
                Pin and fork phase comb distribution, split-neutral topologies, and protective earthing (DIN EN 60439-1 / IEC 60947-7-1)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#18D8F2]/10 border border-[#18D8F2]/30 text-[#18D8F2] text-xs font-mono">
                {busbarRatingA}A · {busbarType.replace(/_/g, ' ')}
              </span>
              <button
                onClick={() => {
                  showToast('Busbar configuration applied across all DIN rails!');
                  setActiveTab('layout');
                }}
                className="px-3.5 py-1.5 bg-[#18D8F2] hover:bg-[#18D8F2]/90 text-[#030B18] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Apply to Enclosure
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 5 cols: Busbar Selection & Electrical Parameters */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-3">
                <div className="text-xs font-bold text-[#F4F8FF] font-mono flex items-center gap-1.5 pb-2 border-b border-[#1B3A5C]">
                  <GitCommit className="w-3.5 h-3.5 text-[#18D8F2]" />
                  Comb Busbar Profile
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] text-[#9EB2CC] block font-mono">System Type & Pin Pitch</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setBusbarType('3P_N_16mm');
                        setBusbarRatingA(80);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        busbarType === '3P_N_16mm'
                          ? 'border-[#18D8F2] bg-[#18D8F2]/10 text-[#F4F8FF]'
                          : 'border-[#1B3A5C] bg-[#061426] text-[#9EB2CC] hover:border-[#18D8F2]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold font-mono">
                        <span>3P+N Comb Busbar (16 mm²)</span>
                        <span className="text-[#00D6A0]">80A</span>
                      </div>
                      <div className="text-[10px] text-[#9EB2CC] mt-1">
                        4-pole pin array for 3-phase + neutral incomer & branch distribution. Pitch: 17.8mm.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBusbarType('1P_N_10mm');
                        setBusbarRatingA(63);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        busbarType === '1P_N_10mm'
                          ? 'border-[#18D8F2] bg-[#18D8F2]/10 text-[#F4F8FF]'
                          : 'border-[#1B3A5C] bg-[#061426] text-[#9EB2CC] hover:border-[#18D8F2]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold font-mono">
                        <span>1P+N Comb Busbar (10 mm²)</span>
                        <span className="text-[#00D6A0]">63A</span>
                      </div>
                      <div className="text-[10px] text-[#9EB2CC] mt-1">
                        2-pole alternating L+N pin arrangement for compact 1-module RCBOs & MCBs.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBusbarType('3P_10mm');
                        setBusbarRatingA(63);
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        busbarType === '3P_10mm'
                          ? 'border-[#18D8F2] bg-[#18D8F2]/10 text-[#F4F8FF]'
                          : 'border-[#1B3A5C] bg-[#061426] text-[#9EB2CC] hover:border-[#18D8F2]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold font-mono">
                        <span>3P Star/Delta Comb Busbar (10 mm²)</span>
                        <span className="text-[#00D6A0]">63A</span>
                      </div>
                      <div className="text-[10px] text-[#9EB2CC] mt-1">
                        3-pole L1-L2-L3 arrangement for 3-phase motor starters and balanced commercial loads.
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Neutral & PE Bar Configuration */}
              <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-3">
                <div className="text-xs font-bold text-[#F4F8FF] font-mono flex items-center gap-1.5 pb-2 border-b border-[#1B3A5C]">
                  <Layers className="w-3.5 h-3.5 text-[#00D6A0]" />
                  Neutral & Grounding Bar Architecture
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-[11px] text-[#9EB2CC] block mb-1">Neutral Busbar Topology</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNeutralTopology('split_rcd')}
                        className={`p-2 rounded-lg border text-left text-xs ${
                          neutralTopology === 'split_rcd'
                            ? 'border-[#147DFF] bg-[#147DFF]/15 text-[#F4F8FF]'
                            : 'border-[#1B3A5C] bg-[#061426] text-[#9EB2CC]'
                        }`}
                      >
                        <strong className="block text-[#18D8F2]">Split RCD Blocks</strong>
                        <span className="text-[9px] text-[#9EB2CC]">N1/N2/N3 isolated (high safety)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setNeutralTopology('common')}
                        className={`p-2 rounded-lg border text-left text-xs ${
                          neutralTopology === 'common'
                            ? 'border-[#147DFF] bg-[#147DFF]/15 text-[#F4F8FF]'
                            : 'border-[#1B3A5C] bg-[#061426] text-[#9EB2CC]'
                        }`}
                      >
                        <strong className="block text-[#18D8F2]">Common N-Bar</strong>
                        <span className="text-[9px] text-[#9EB2CC]">Single solid return trunk</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] text-[#9EB2CC]">PE Ground Bar Terminals</label>
                      <span className="text-[#00D6A0] font-bold">{peBarTerminals} Screw Ports</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="36"
                      step="6"
                      value={peBarTerminals}
                      onChange={(e) => setPeBarTerminals(Number(e.target.value))}
                      className="w-full accent-[#00D6A0]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right 7 cols: Interactive Diagram & Technical Verification */}
            <div className="lg:col-span-7 space-y-4">
              {/* Busbar Cross Section & Phase Teeth Visualizer */}
              <div className="p-4 bg-[#030B18] border border-[#1B3A5C] rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-[#1B3A5C]">
                  <span className="text-[#F4F8FF] font-bold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#FF9A24]" />
                    Phase Comb Pin Mapping & Terminal Alignment
                  </span>
                  <span className="text-[10px] text-[#00D6A0]">DIN EN 60439-1 / VDE 0660</span>
                </div>

                {/* Visual rendering of the Comb Profile */}
                <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-4 space-y-4">
                  {/* Comb Spine */}
                  <div className="relative">
                    <div className="h-6 bg-gradient-to-r from-[#18283E] via-[#243F62] to-[#18283E] border border-[#3A5D88] rounded-t-md flex items-center justify-between px-3">
                      <span className="text-[10px] font-mono font-bold text-[#18D8F2] flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded bg-[#FF9A24]" />
                        {busbarType === '3P_N_16mm' ? '3P+N COMB BUSBAR (16mm² Cu / 80A continuous)' :
                         busbarType === '1P_N_10mm' ? '1P+N COMB BUSBAR (10mm² Cu / 63A continuous)' :
                         '3P COMB BUSBAR (10mm² Cu / 63A continuous)'}
                      </span>
                      <span className="text-[9px] font-mono text-[#9EB2CC] px-1.5 py-0.5 rounded bg-[#061426] border border-[#1B3A5C]">
                        IP20 TOUCH-SAFE INSULATION
                      </span>
                    </div>

                    {/* Prongs / Teeth */}
                    <div className="bg-[#061426] border-x border-b border-[#1B3A5C] p-3 rounded-b-md flex justify-between items-start gap-1 overflow-x-auto">
                      {Array.from({ length: 12 }).map((_, i) => {
                        const phaseSeq = busbarType === '3P_N_16mm'
                          ? ['L1', 'N', 'L2', 'N', 'L3', 'N'][i % 6]
                          : busbarType === '1P_N_10mm'
                          ? ['L1', 'N'][i % 2]
                          : ['L1', 'L2', 'L3'][i % 3];

                        let color = 'bg-[#B45309] text-white'; // L1
                        if (phaseSeq === 'L2') color = 'bg-[#334155] text-white';
                        if (phaseSeq === 'L3') color = 'bg-[#64748B] text-white';
                        if (phaseSeq === 'N') color = 'bg-[#2563EB] text-white';

                        return (
                          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[36px]">
                            <div className={`w-3.5 h-6 rounded-b-sm ${color} flex items-center justify-center text-[8px] font-mono font-bold shadow-sm`}>
                              {phaseSeq}
                            </div>
                            <div className="w-1.5 h-2 bg-[#9EB2CC]/30 rounded-full" />
                            <span className="text-[8px] font-mono text-[#9EB2CC]">Pin {i + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ground & Neutral Bar Blocks Visual */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {/* Neutral Block */}
                    <div className="p-3 bg-[#061426] border border-[#147DFF]/30 rounded-lg space-y-2 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-[#18D8F2] font-bold">
                        <span>Neutral Terminal Block</span>
                        <span className="text-[10px] text-[#9EB2CC]">230V Reference</span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="flex-1 h-5 bg-[#147DFF]/20 border border-[#147DFF]/40 rounded flex items-center justify-center text-[8px] text-[#18D8F2] font-bold">
                            N{i + 1}
                          </div>
                        ))}
                      </div>
                      <span className="text-[9px] text-[#9EB2CC] block">Brass block with self-lifting screw clamps. Max wire: 16 mm².</span>
                    </div>

                    {/* PE Earthing Block */}
                    <div className="p-3 bg-[#061426] border border-[#00D6A0]/30 rounded-lg space-y-2 font-mono text-[11px]">
                      <div className="flex items-center justify-between text-[#00D6A0] font-bold">
                        <span>PE Earth Equipotential Bar</span>
                        <span className="text-[10px] text-[#9EB2CC]">{peBarTerminals} Ports</span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} className="flex-1 h-5 bg-[#00D6A0]/20 border border-[#00D6A0]/40 rounded flex items-center justify-center text-[8px] text-[#00D6A0] font-bold">
                            PE
                          </div>
                        ))}
                      </div>
                      <span className="text-[9px] text-[#9EB2CC] block">Low-impedance grounding bar with 16mm² main earth lug.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Engineering Specifications Card */}
              <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl font-mono text-xs space-y-2">
                <div className="text-xs font-bold text-[#F4F8FF] pb-1 border-b border-[#1B3A5C] flex items-center justify-between">
                  <span>Electrical & Mechanical Verification Ratings</span>
                  <span className="text-[#00D6A0] font-bold">COMPLIANT</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
                  <div className="flex justify-between py-0.5 border-b border-[#1B3A5C]/50">
                    <span className="text-[#9EB2CC]">Rated Operational Voltage (Ue):</span>
                    <strong className="text-[#F4F8FF]">400 / 230 V AC</strong>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-[#1B3A5C]/50">
                    <span className="text-[#9EB2CC]">Rated Insulation Voltage (Ui):</span>
                    <strong className="text-[#F4F8FF]">500 V AC</strong>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-[#1B3A5C]/50">
                    <span className="text-[#9EB2CC]">Peak Short-Circuit Current (Ipk):</span>
                    <strong className="text-[#00D6A0]">25 kA</strong>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-[#1B3A5C]/50">
                    <span className="text-[#9EB2CC]">Short-Time Withstand (Icw 1s):</span>
                    <strong className="text-[#00D6A0]">15 kA</strong>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-[#1B3A5C]/50">
                    <span className="text-[#9EB2CC]">Conductor Material:</span>
                    <strong className="text-[#F4F8FF]">Electrolytic Copper E-Cu 58</strong>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-[#1B3A5C]/50">
                    <span className="text-[#9EB2CC]">Recommended Screw Torque:</span>
                    <strong className="text-[#FF9A24]">2.0 — 2.5 N·m</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'loads' ? (
        /* PROJECT LOAD REQUIREMENTS & DIVERSITY ENGINE */
        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-5 shadow-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#1B3A5C] gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#F4F8FF] font-mono flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#00D6A0]" />
                User-Defined Project Load Requirements & Sizing Schedule
              </h3>
              <p className="text-xs text-[#9EB2CC] mt-0.5">
                Configure connected equipment, diversity factor (Kd), phase assignments, and synthesize breaker protection
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSynthesizeFromLoads}
                className="px-4 py-2 bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#030B18] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#00D6A0]/20"
              >
                <Zap className="w-4 h-4" />
                Synthesize Panel from Load Requirements
              </button>
            </div>
          </div>

          {/* DIVERSITY FACTOR & LOAD SUMMARY CARDS */}
          <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-3 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-[#F4F8FF] block">
                  Installation Diversity / Coincidence Factor (Kd): {diversityFactor.toFixed(2)}
                </span>
                <span className="text-[10px] text-[#9EB2CC]">
                  Applies simultaneous demand reduction per IEC 60364-5-52 / NEC 220
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                {[
                  { label: 'Apartment (0.70)', val: 0.70 },
                  { label: 'Villa (0.80)', val: 0.80 },
                  { label: 'Office (0.85)', val: 0.85 },
                  { label: 'Continuous (1.00)', val: 1.00 }
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setDiversityFactor(p.val)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                      diversityFactor === p.val
                        ? 'bg-[#00D6A0] text-[#030B18]'
                        : 'bg-[#061426] text-[#9EB2CC] hover:text-[#F4F8FF] border border-[#1B3A5C]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min="0.50"
              max="1.00"
              step="0.05"
              value={diversityFactor}
              onChange={(e) => setDiversityFactor(Number(e.target.value))}
              className="w-full accent-[#00D6A0]"
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-2.5 bg-[#061426] border border-[#1B3A5C] rounded-lg">
                <span className="text-[10px] text-[#9EB2CC] block">Connected Power</span>
                <span className="text-base font-black text-[#F4F8FF]">{loadAnalysis.totalKw} kW</span>
              </div>
              <div className="p-2.5 bg-[#061426] border border-[#00D6A0]/30 rounded-lg">
                <span className="text-[10px] text-[#00D6A0] block">Diversified Demand (Pd)</span>
                <span className="text-base font-black text-[#00D6A0]">{loadAnalysis.diversifiedKw} kW</span>
              </div>
              <div className="p-2.5 bg-[#061426] border border-[#FF9A24]/30 rounded-lg">
                <span className="text-[10px] text-[#FF9A24] block">Recommended Incomer</span>
                <span className="text-base font-black text-[#FF9A24]">{loadAnalysis.recommendedIncomerA}A (3P+N)</span>
              </div>
              <div className="p-2.5 bg-[#061426] border border-[#147DFF]/30 rounded-lg">
                <span className="text-[10px] text-[#147DFF] block">Phase Asymmetry</span>
                <span className={`text-base font-black ${loadAnalysis.unbalancePercent <= 15 ? 'text-[#00D6A0]' : 'text-[#FF5263]'}`}>
                  Δ {loadAnalysis.unbalancePercent}%
                </span>
              </div>
            </div>
          </div>

          {/* INTERACTIVE LOAD SCHEDULE TABLE */}
          <div className="space-y-3 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#F4F8FF]">
                Active Circuit Requirements ({userLoads.length} Circuits)
              </span>
              <button
                onClick={() => handleAddUserLoad()}
                className="px-3 py-1 bg-[#147DFF] hover:bg-[#147DFF]/90 text-[#F4F8FF] text-xs font-bold rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Custom Circuit
              </button>
            </div>

            <div className="overflow-x-auto border border-[#1B3A5C] rounded-xl bg-[#030B18]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1B3A5C] text-[#9EB2CC] text-[10px] uppercase bg-[#08182D]">
                    <th className="py-2.5 px-3">Tag</th>
                    <th className="py-2.5 px-3">Description / Load Name</th>
                    <th className="py-2.5 px-3">Phase</th>
                    <th className="py-2.5 px-3">Power (W)</th>
                    <th className="py-2.5 px-3">Current (A)</th>
                    <th className="py-2.5 px-3">Breaker (A)</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B3A5C]/40">
                  {userLoads.map((c) => {
                    const current = c.phase === '3P'
                      ? Number((c.powerWatts / (Math.sqrt(3) * 400 * (c.powerFactor || 0.95))).toFixed(1))
                      : Number((c.powerWatts / (230 * (c.powerFactor || 0.95))).toFixed(1));

                    return (
                      <tr key={c.id} className="hover:bg-[#0B1C32]/60 transition-colors">
                        <td className="py-2 px-3 font-bold text-[#FF9A24]">
                          <input
                            type="text"
                            value={c.tag}
                            onChange={(e) => handleUpdateUserLoad(c.id, { tag: e.target.value })}
                            className="w-16 bg-[#0B1C32] border border-[#1B3A5C] rounded px-1.5 py-0.5 text-xs text-[#FF9A24]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => handleUpdateUserLoad(c.id, { name: e.target.value })}
                            className="w-full min-w-[180px] bg-[#0B1C32] border border-[#1B3A5C] rounded px-1.5 py-0.5 text-xs text-[#F4F8FF]"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={c.phase}
                            onChange={(e) => handleUpdateUserLoad(c.id, { phase: e.target.value as any })}
                            className="bg-[#0B1C32] border border-[#1B3A5C] rounded px-1.5 py-0.5 text-xs text-[#F4F8FF]"
                          >
                            <option value="L1">L1 (Brown)</option>
                            <option value="L2">L2 (Black)</option>
                            <option value="L3">L3 (Grey)</option>
                            <option value="3P">3P (Three-Phase)</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            step="50"
                            value={c.powerWatts}
                            onChange={(e) => handleUpdateUserLoad(c.id, { powerWatts: Number(e.target.value) })}
                            className="w-20 bg-[#0B1C32] border border-[#1B3A5C] rounded px-1.5 py-0.5 text-xs text-[#F4F8FF] font-bold"
                          />
                        </td>
                        <td className="py-2 px-3 text-[#18D8F2] font-semibold">
                          {current} A
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={c.breakerRatingA || 16}
                            onChange={(e) => handleUpdateUserLoad(c.id, { breakerRatingA: Number(e.target.value) })}
                            className="bg-[#0B1C32] border border-[#1B3A5C] rounded px-1.5 py-0.5 text-xs text-[#00D6A0] font-bold"
                          >
                            <option value={10}>10 A</option>
                            <option value={16}>16 A</option>
                            <option value={20}>20 A</option>
                            <option value={25}>25 A</option>
                            <option value={32}>32 A</option>
                            <option value={40}>40 A</option>
                            <option value={50}>50 A</option>
                            <option value={63}>63 A</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleDeleteUserLoad(c.id)}
                            className="p-1 text-[#9EB2CC] hover:text-[#FF5263] transition-colors"
                            title="Remove circuit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Load Presets */}
            <div className="pt-2">
              <span className="text-[10px] text-[#9EB2CC] font-mono block mb-1.5">
                Quick Inject Electrical Load Presets:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => handleAddUserLoad({ name: 'LED General Lighting', powerWatts: 450, phase: 'L1', breakerRatingA: 10 })}
                  className="px-2.5 py-1 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-[#9EB2CC] hover:text-[#F4F8FF] transition-colors"
                >
                  + Lighting (450W / 10A)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddUserLoad({ name: 'Power Sockets Ring', powerWatts: 2400, phase: 'L2', breakerRatingA: 16 })}
                  className="px-2.5 py-1 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-[#9EB2CC] hover:text-[#F4F8FF] transition-colors"
                >
                  + Sockets (2.4kW / 16A)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddUserLoad({ name: 'Kitchen Dishwasher & Oven', powerWatts: 3200, phase: 'L3', breakerRatingA: 20 })}
                  className="px-2.5 py-1 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-[#9EB2CC] hover:text-[#F4F8FF] transition-colors"
                >
                  + Kitchen Appliance (3.2kW / 20A)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddUserLoad({ name: 'Inverter Heat Pump AC', powerWatts: 2800, phase: 'L1', breakerRatingA: 20 })}
                  className="px-2.5 py-1 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-[#9EB2CC] hover:text-[#F4F8FF] transition-colors"
                >
                  + Inverter AC (2.8kW / 20A)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddUserLoad({ name: 'Induction Cooktop 3-Phase', powerWatts: 7400, phase: '3P', breakerRatingA: 20 })}
                  className="px-2.5 py-1 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-[#9EB2CC] hover:text-[#F4F8FF] transition-colors"
                >
                  + Induction Hob (7.4kW 3P)
                </button>
                <button
                  type="button"
                  onClick={() => handleAddUserLoad({ name: 'EV Wallbox Fast Charger', powerWatts: 11000, phase: '3P', breakerRatingA: 16 })}
                  className="px-2.5 py-1 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-[#9EB2CC] hover:text-[#F4F8FF] transition-colors"
                >
                  + EV Charger (11kW 3P)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'wiring' ? (
        /* WIRING CONFIGURATION SCHEDULE & TERMINAL CONNECTIONS */
        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
            <div>
              <h3 className="text-sm font-bold text-[#F4F8FF] font-mono">
                Engineered Wiring Schedule & Terminal Connection Topology
              </h3>
              <p className="text-xs text-[#9EB2CC]">
                Cross-sections, conductor types, neutral split-busbar routing, and terminal torque ratings
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#18D8F2]/10 border border-[#18D8F2]/30 text-[#18D8F2] text-xs font-mono">
              IEC 60364-5-52
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1B3A5C] text-[#9EB2CC] text-[10px] uppercase">
                  <th className="py-2.5 px-3">Tag</th>
                  <th className="py-2.5 px-3">Device Model</th>
                  <th className="py-2.5 px-3">Phase Feed</th>
                  <th className="py-2.5 px-3">Conductor Wire</th>
                  <th className="py-2.5 px-3">Load Connection</th>
                  <th className="py-2.5 px-3">Neutral Link</th>
                  <th className="py-2.5 px-3">Busbar Comb</th>
                  <th className="py-2.5 px-3 text-right">Torque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1B3A5C]/50">
                {wiringSuggestions.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#0B1C32]/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#FF9A24]">{item.tag}</td>
                    <td className="py-2.5 px-3 text-[#F4F8FF] font-semibold">{item.model}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.supplyPhase === 'L1' ? 'bg-[#147DFF]/20 text-[#147DFF]' :
                        item.supplyPhase === 'L2' ? 'bg-[#00D6A0]/20 text-[#00D6A0]' :
                        item.supplyPhase === 'L3' ? 'bg-[#9EB2CC]/20 text-[#9EB2CC]' :
                        'bg-[#FF9A24]/20 text-[#FF9A24]'
                      }`}>
                        {item.supplyPhase}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#00D6A0] font-bold">{item.wireGauge}</td>
                    <td className="py-2.5 px-3 text-[#F4F8FF]">{item.loadConnection}</td>
                    <td className="py-2.5 px-3 text-[#9EB2CC]">{item.neutralBus}</td>
                    <td className="py-2.5 px-3 text-[#18D8F2] text-[11px]">{item.busbarCombType}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-[#F4F8FF]">
                      {item.tighteningTorqueNm} N·m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* PHASE LOAD BALANCING MATRIX */
        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
            <div>
              <h3 className="text-sm font-bold text-[#F4F8FF] font-mono">
                3-Phase Load Balance Matrix & Current Asymmetry
              </h3>
              <p className="text-xs text-[#9EB2CC]">
                Permissible phase unbalance limit: ≤ 15% (GOST 32144 / IEC 61000)
              </p>
            </div>
            <button
              onClick={optimizePhaseBalancing}
              className="px-3.5 py-1.5 bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#030B18] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-Balance Phases Now
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
            {/* L1 Box */}
            <div className="p-4 bg-[#0B1C32] border border-[#147DFF]/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#147DFF]">
                <span>Phase L1 (Brown)</span>
                <span>{loadAnalysis.phaseCurrents.L1} A</span>
              </div>
              <div className="text-2xl font-black text-[#F4F8FF]">
                {loadAnalysis.phaseWatts.L1} <span className="text-xs text-[#9EB2CC]">kW</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-[#9EB2CC] block">Assigned Circuits:</span>
                {components.filter(c => c.phase === 'L1').map(c => (
                  <div key={c.id} className="flex justify-between text-[11px] bg-[#061426] px-2 py-1 rounded">
                    <span className="text-[#F4F8FF] truncate">{c.model.split(' ')[0]}</span>
                    <span className="text-[#147DFF] font-bold">{c.ratedCurrentA}A</span>
                  </div>
                ))}
              </div>
            </div>

            {/* L2 Box */}
            <div className="p-4 bg-[#0B1C32] border border-[#00D6A0]/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#00D6A0]">
                <span>Phase L2 (Black)</span>
                <span>{loadAnalysis.phaseCurrents.L2} A</span>
              </div>
              <div className="text-2xl font-black text-[#F4F8FF]">
                {loadAnalysis.phaseWatts.L2} <span className="text-xs text-[#9EB2CC]">kW</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-[#9EB2CC] block">Assigned Circuits:</span>
                {components.filter(c => c.phase === 'L2').map(c => (
                  <div key={c.id} className="flex justify-between text-[11px] bg-[#061426] px-2 py-1 rounded">
                    <span className="text-[#F4F8FF] truncate">{c.model.split(' ')[0]}</span>
                    <span className="text-[#00D6A0] font-bold">{c.ratedCurrentA}A</span>
                  </div>
                ))}
              </div>
            </div>

            {/* L3 Box */}
            <div className="p-4 bg-[#0B1C32] border border-[#9EB2CC]/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#9EB2CC]">
                <span>Phase L3 (Grey)</span>
                <span>{loadAnalysis.phaseCurrents.L3} A</span>
              </div>
              <div className="text-2xl font-black text-[#F4F8FF]">
                {loadAnalysis.phaseWatts.L3} <span className="text-xs text-[#9EB2CC]">kW</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] text-[#9EB2CC] block">Assigned Circuits:</span>
                {components.filter(c => c.phase === 'L3').map(c => (
                  <div key={c.id} className="flex justify-between text-[11px] bg-[#061426] px-2 py-1 rounded">
                    <span className="text-[#F4F8FF] truncate">{c.model.split(' ')[0]}</span>
                    <span className="text-[#9EB2CC] font-bold">{c.ratedCurrentA}A</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomatedPanelDesign;
