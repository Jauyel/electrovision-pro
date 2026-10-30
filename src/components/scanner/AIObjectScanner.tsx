import React, { useState, useRef } from 'react';
import { 
  Box, 
  Upload, 
  Plus, 
  Save, 
  Eye, 
  Maximize2, 
  Trash2, 
  Info, 
  CheckCircle2, 
  Layers, 
  DoorClosed, 
  Square, 
  Lightbulb, 
  ToggleLeft, 
  Server, 
  Cpu, 
  ShieldAlert,
  Camera,
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Check,
  Ruler,
  Crosshair,
  Mic
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Room3DViewer } from './Room3DViewer';
import { CameraRoom } from './CameraRoom';
import { CameraScanner } from './CameraScanner';
import { SpatialCameraScanner } from './SpatialCameraScanner';
import { ElectricalPoint, ElectricalPointType, WallOpening, AIScanResult } from '../../types';
import { Modal } from '../common/Modal';

export const AIObjectScanner: React.FC = () => {
  const { 
    activeProject, 
    updateActiveProject, 
    addRoomPoint, 
    removeRoomPoint, 
    t, 
    triggerSave, 
    saveStatus,
    language,
    addActivityLog
  } = useProject();

  const [activeTab, setActiveTab] = useState<'2d' | '3d' | 'points' | 'openings' | 'camera' | 'ar_scanner' | 'spatial_cad'>('2d');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);

  // Real AI Blueprint Scan Modal State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanFileBase64, setScanFileBase64] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const room = activeProject.roomData;

  const handleUpdateDimensions = (key: 'lengthMeters' | 'widthMeters' | 'heightMeters', value: number) => {
    updateActiveProject(prev => ({
      ...prev,
      roomData: {
        ...prev.roomData,
        [key]: Math.max(1, value)
      }
    }));
  };

  const handleUpdateRoomMeta = (key: string, value: string) => {
    updateActiveProject(prev => ({
      ...prev,
      roomData: {
        ...prev.roomData,
        [key]: value
      }
    }));
  };

  // Add new electrical point
  const handleAddPoint = (type: ElectricalPointType) => {
    const defaultHeights: Record<ElectricalPointType, number> = {
      socket_single: 300,
      socket_double: 300,
      socket_wet: 1100,
      switch_1gang: 900,
      switch_2gang: 900,
      switch_dimmer: 900,
      ceiling_light: room.heightMeters * 1000,
      spotlight: room.heightMeters * 1000,
      led_strip: 2400,
      panel: 1600,
      ac_unit: 2600,
      oven: 450,
      boiler: 1400
    };

    const typeNames: Record<ElectricalPointType, string> = {
      socket_single: "Single Socket (16A)",
      socket_double: "Double Socket (16A)",
      socket_wet: "IP44 Water-Resistant Socket",
      switch_1gang: "1-Gang Rocker Switch",
      switch_2gang: "2-Gang Dual Switch",
      switch_dimmer: "Rotary LED Dimmer",
      ceiling_light: "Center Ceiling Fixture",
      spotlight: "Recessed Downlight",
      led_strip: "Architectural Cove Light",
      panel: "Distribution Sub-Panel",
      ac_unit: "Inverter AC Dedicated Feed",
      oven: "Heavy Cooker Outlet (32A)",
      boiler: "Water Heater Isolation Point"
    };

    const newPt: ElectricalPoint = {
      id: `pt-${Date.now()}`,
      type,
      name: typeNames[type],
      wall: type.includes('light') ? 'ceiling' : 'north',
      x: Number((room.lengthMeters / 2 + (Math.random() * 2 - 1)).toFixed(2)),
      y: Number((room.widthMeters / 2 + (Math.random() * 2 - 1)).toFixed(2)),
      heightMm: defaultHeights[type] || 900,
      wattage: type.includes('socket') ? 600 : type.includes('light') ? 60 : type.includes('ac') ? 2500 : 0,
      notes: "Configured via AI Room Palette"
    };

    addRoomPoint(newPt);
    setSelectedPointId(newPt.id);
  };

  // Add new wall opening (Door or Window)
  const handleAddOpening = (type: 'door' | 'window') => {
    const newOpening: WallOpening = {
      id: `op-${Date.now()}`,
      type,
      wall: 'north',
      x: 1.5,
      offset: 1.5,
      widthMeters: type === 'door' ? 0.9 : 1.4,
      heightMeters: type === 'door' ? 2.1 : 1.5,
      sill: type === 'door' ? 0 : 0.85,
      label: type === 'door' ? 'Interior Door' : 'Casement Window'
    };

    updateActiveProject(prev => ({
      ...prev,
      roomData: {
        ...prev.roomData,
        openings: [...(prev.roomData.openings || []), newOpening]
      }
    }));
    setSelectedOpeningId(newOpening.id);
  };

  const handleRemoveOpening = (id: string) => {
    updateActiveProject(prev => ({
      ...prev,
      roomData: {
        ...prev.roomData,
        openings: (prev.roomData.openings || []).filter(o => o.id !== id)
      }
    }));
    if (selectedOpeningId === id) setSelectedOpeningId(null);
  };

  const selectedPoint = room.points.find(p => p.id === selectedPointId);
  const selectedOpening = (room.openings || []).find(o => o.id === selectedOpeningId);

  const handleUpdateSelectedPoint = (field: keyof ElectricalPoint, val: any) => {
    if (!selectedPointId) return;
    updateActiveProject(prev => ({
      ...prev,
      roomData: {
        ...prev.roomData,
        points: prev.roomData.points.map(pt => pt.id === selectedPointId ? { ...pt, [field]: val } : pt)
      }
    }));
  };

  const handleUpdateSelectedOpening = (field: keyof WallOpening, val: any) => {
    if (!selectedOpeningId) return;
    updateActiveProject(prev => ({
      ...prev,
      roomData: {
        ...prev.roomData,
        openings: (prev.roomData.openings || []).map(o => o.id === selectedOpeningId ? { ...o, [field]: val } : o)
      }
    }));
  };

  // Real Multimodal Gemini Vision Floorplan Upload & Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setScanFileBase64(b64);
      setScanResult(null);
      setScanError('');
    };
    reader.readAsDataURL(file);
  };

  const runGeminiScan = async (base64ToUse = scanFileBase64) => {
    if (!base64ToUse) return;

    setScanLoading(true);
    setScanError('');
    try {
      const res = await fetch('/api/ai/blueprint-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64ToUse,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Blueprint scan failed');
      }

      setScanResult(data);
      addActivityLog({
        action: 'AI Vision Parse',
        details: `Detected boundaries for ${data.roomName} (${data.length}x${data.width}m)`,
        category: 'scanner',
        status: 'completed',
        user: 'ElectroVision AI',
        moduleTarget: 'scanner'
      });
    } catch (err: any) {
      setScanError(err?.message || 'Skanerlashda xatolik yuz berdi');
    } finally {
      setScanLoading(false);
    }
  };

  const applyScanResultToRoom = () => {
    if (!scanResult) return;

    updateActiveProject(prev => {
      const mappedOpenings: WallOpening[] = (scanResult.openings || []).map((o, idx) => ({
        id: `op-ai-${Date.now()}-${idx}`,
        type: o.kind === 'window' ? 'window' : 'door',
        wall: o.wall || 'north',
        x: o.offset || 1.2,
        offset: o.offset || 1.2,
        widthMeters: o.width || 1.2,
        heightMeters: o.height || 2.1,
        sill: o.sill || 0,
        label: o.label || (o.kind === 'window' ? 'Deraza' : 'Eshik')
      }));

      const mappedPoints: ElectricalPoint[] = (scanResult.suggestedPoints || []).map((p, idx) => ({
        id: `pt-ai-${Date.now()}-${idx}`,
        type: p.type || 'socket_double',
        name: p.label || 'AI Point',
        wall: p.wall || 'north',
        x: Number((p.x * scanResult.length).toFixed(2)),
        y: Number((p.y * scanResult.width).toFixed(2)),
        heightMm: p.type.includes('socket') ? 300 : p.type.includes('switch') ? 900 : p.type.includes('light') ? scanResult.height * 1000 : 1600,
        wattage: p.wattage || 600,
        notes: `AI Skaner orqali xaritaga kiritildi (${p.label})`
      }));

      return {
        ...prev,
        roomData: {
          ...prev.roomData,
          roomName: scanResult.roomName || prev.roomData.roomName,
          lengthMeters: Number(scanResult.length) || prev.roomData.lengthMeters,
          widthMeters: Number(scanResult.width) || prev.roomData.widthMeters,
          heightMeters: Number(scanResult.height) || prev.roomData.heightMeters,
          openings: mappedOpenings.length > 0 ? mappedOpenings : prev.roomData.openings,
          points: mappedPoints.length > 0 ? [...prev.roomData.points, ...mappedPoints] : prev.roomData.points,
          notes: `${prev.roomData.notes ? prev.roomData.notes + '\n' : ''}AI Scan: ${scanResult.detectedFeatures}`
        }
      };
    });

    setIsScanModalOpen(false);
    setScanFileBase64(null);
    setScanResult(null);
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#061426] border border-[#1B3A5C] rounded-xl shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#18D8F2] shadow-[0_0_8px_#18D8F2]" />
            <h1 className="text-xl font-extrabold text-[#F4F8FF] tracking-tight">{t.scanner.title}</h1>
            <span className="text-[10px] font-mono uppercase bg-[#18D8F2]/15 text-[#18D8F2] px-2 py-0.5 rounded border border-[#18D8F2]/30 font-bold">
              Module 01 · 3D BIM
            </span>
          </div>
          <p className="text-xs text-[#9EB2CC] mt-1">{t.scanner.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveTab('ar_scanner')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              activeTab === 'ar_scanner'
                ? 'bg-[#18D8F2] text-[#030B18] border-[#18D8F2] shadow-md shadow-[#18D8F2]/25'
                : 'bg-[#0B1C32] hover:bg-[#10243D] border-[#1B3A5C] text-[#18D8F2]'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-[#FF9A24]" />
            <span>AR Scanner & Voice Notes</span>
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
              activeTab === 'camera'
                ? 'bg-[#18D8F2] text-[#030B18] border-[#18D8F2] shadow-md shadow-[#18D8F2]/25'
                : 'bg-[#0B1C32] hover:bg-[#10243D] border-[#1B3A5C] text-[#F4F8FF]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Survey</span>
          </button>

          <button
            onClick={() => setIsScanModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-[#147DFF]/20 to-[#18D8F2]/20 hover:from-[#147DFF]/30 hover:to-[#18D8F2]/30 border border-[#18D8F2]/40 text-[#18D8F2] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#18D8F2]" />
            <span>AI Blueprint Scan</span>
          </button>

          <button
            onClick={triggerSave}
            className="px-3.5 py-1.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#147DFF]/25 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveStatus === 'saved' ? t.saved : t.scanner.saveProject}</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column / Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Tool Palette (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {/* Add Terminals */}
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-3 space-y-2">
            <div className="text-[11px] font-bold text-[#9EB2CC] uppercase tracking-wider px-1 font-mono">
              Add Terminals
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => handleAddPoint('socket_double')}
                className="w-full text-left p-2 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] text-xs font-medium border border-[#1B3A5C] hover:border-[#147DFF] flex items-center gap-2 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-[#147DFF]/20 flex items-center justify-center text-[#147DFF]">
                  <Square className="w-3.5 h-3.5" />
                </div>
                <span>Double Socket</span>
              </button>

              <button
                onClick={() => handleAddPoint('socket_wet')}
                className="w-full text-left p-2 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] text-xs font-medium border border-[#1B3A5C] hover:border-[#00D6A0] flex items-center gap-2 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-[#00D6A0]/20 flex items-center justify-center text-[#00D6A0]">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <span>IP44 Wet Socket</span>
              </button>

              <button
                onClick={() => handleAddPoint('switch_2gang')}
                className="w-full text-left p-2 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] text-xs font-medium border border-[#1B3A5C] hover:border-[#18D8F2] flex items-center gap-2 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-[#18D8F2]/20 flex items-center justify-center text-[#18D8F2]">
                  <ToggleLeft className="w-3.5 h-3.5" />
                </div>
                <span>2-Gang Switch</span>
              </button>

              <button
                onClick={() => handleAddPoint('ceiling_light')}
                className="w-full text-left p-2 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] text-xs font-medium border border-[#1B3A5C] hover:border-[#00D6A0] flex items-center gap-2 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-[#00D6A0]/20 flex items-center justify-center text-[#00D6A0]">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <span>Ceiling Chandelier</span>
              </button>

              <button
                onClick={() => handleAddPoint('ac_unit')}
                className="w-full text-left p-2 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] text-xs font-medium border border-[#1B3A5C] hover:border-[#FF9A24] flex items-center gap-2 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-[#FF9A24]/20 flex items-center justify-center text-[#FF9A24]">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <span>Inverter AC Unit</span>
              </button>

              <button
                onClick={() => handleAddPoint('panel')}
                className="w-full text-left p-2 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] text-xs font-medium border border-[#1B3A5C] hover:border-[#FF9A24] flex items-center gap-2 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-[#FF9A24]/20 flex items-center justify-center text-[#FF9A24]">
                  <Server className="w-3.5 h-3.5" />
                </div>
                <span>Sub-Distribution Panel</span>
              </button>
            </div>
          </div>

          {/* Add Openings Palette */}
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-3 space-y-2">
            <div className="text-[11px] font-bold text-[#9EB2CC] uppercase tracking-wider px-1 font-mono">
              Wall Openings
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleAddOpening('door')}
                className="p-2 bg-[#061426] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-xs font-medium text-[#F4F8FF] flex items-center justify-center gap-1.5 transition-colors"
              >
                <DoorClosed className="w-3.5 h-3.5 text-[#FF9A24]" />
                <span>+ Door</span>
              </button>
              <button
                onClick={() => handleAddOpening('window')}
                className="p-2 bg-[#061426] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg text-xs font-medium text-[#F4F8FF] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5 text-[#18D8F2]" />
                <span>+ Window</span>
              </button>
            </div>
          </div>

          {/* Room Dimensions */}
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-3 space-y-2.5">
            <div className="text-[11px] font-bold text-[#9EB2CC] uppercase tracking-wider px-1 font-mono">
              Dimensions (m)
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-[#9EB2CC] font-mono">Length (X axis)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={room.lengthMeters}
                  onChange={(e) => handleUpdateDimensions('lengthMeters', parseFloat(e.target.value) || 1)}
                  className="w-full px-2.5 py-1 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#9EB2CC] font-mono">Width (Y axis)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={room.widthMeters}
                  onChange={(e) => handleUpdateDimensions('widthMeters', parseFloat(e.target.value) || 1)}
                  className="w-full px-2.5 py-1 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#9EB2CC] font-mono">Height (Z axis)</label>
                <input
                  type="number"
                  step="0.1"
                  min="2"
                  value={room.heightMeters}
                  onChange={(e) => handleUpdateDimensions('heightMeters', parseFloat(e.target.value) || 2)}
                  className="w-full px-2.5 py-1 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Central Visualization Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Workspace Tabs */}
          <div className="flex items-center justify-between bg-[#061426] p-1.5 rounded-xl border border-[#1B3A5C]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('2d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === '2d' 
                    ? 'bg-[#18D8F2]/20 text-[#18D8F2] border border-[#18D8F2]/40' 
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                {t.scanner.tab2d}
              </button>
              <button
                onClick={() => setActiveTab('3d')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === '3d' 
                    ? 'bg-[#147DFF]/20 text-[#147DFF] border border-[#147DFF]/40' 
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                {t.scanner.tab3d}
              </button>
              <button
                onClick={() => setActiveTab('points')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'points' 
                    ? 'bg-[#00D6A0]/20 text-[#00D6A0] border border-[#00D6A0]/40' 
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                {t.scanner.tabPoints} ({room.points.length})
              </button>
              <button
                onClick={() => setActiveTab('openings')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'openings' 
                    ? 'bg-[#FF9A24]/20 text-[#FF9A24] border border-[#FF9A24]/40' 
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                Openings ({room.openings?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('spatial_cad')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'spatial_cad' 
                    ? 'bg-gradient-to-r from-[#147DFF]/25 to-[#18D8F2]/25 text-[#18D8F2] border border-[#18D8F2]/50 shadow-sm font-bold' 
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-[#18D8F2]" />
                <span>3D Spatial CAD Scanner</span>
              </button>
              <button
                onClick={() => setActiveTab('ar_scanner')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'ar_scanner' 
                    ? 'bg-[#18D8F2]/20 text-[#18D8F2] border border-[#18D8F2]/40 shadow-sm' 
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                <Crosshair className="w-3.5 h-3.5 text-[#18D8F2]" />
                <span>AR Tape Measure</span>
              </button>
              <button
                onClick={() => setActiveTab('camera')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === 'camera' 
                    ? 'bg-[#8B5CFF]/20 text-[#8B5CFF] border border-[#8B5CFF]/40' 
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                Camera Survey
              </button>
            </div>

            <div className="text-[11px] font-mono text-[#9EB2CC] px-2 hidden sm:block">
              Floor Area: {(room.lengthMeters * room.widthMeters).toFixed(1)} m²
            </div>
          </div>

          {/* Active Canvas Body */}
          {activeTab === 'spatial_cad' ? (
            <SpatialCameraScanner
              onApplyToCAD={() => {
                setActiveTab('2d');
              }}
              onClose={() => setActiveTab('2d')}
            />
          ) : activeTab === 'ar_scanner' ? (
            <CameraScanner
              onApplyDimensions={({ length, width, height }) => {
                setActiveTab('2d');
              }}
              onCapturePhoto={(photo) => {
                // Photo is already attached to project in CameraScanner
              }}
              onClose={() => setActiveTab('2d')}
            />
          ) : activeTab === 'camera' ? (
            <CameraRoom
              photos={room.photos || []}
              onSavePhotos={(newPhotos) => {
                updateActiveProject(prev => ({
                  ...prev,
                  roomData: {
                    ...prev.roomData,
                    photos: [...(prev.roomData.photos || []), ...newPhotos]
                  }
                }));
              }}
              onDeletePhoto={(id) => {
                updateActiveProject(prev => ({
                  ...prev,
                  roomData: {
                    ...prev.roomData,
                    photos: (prev.roomData.photos || []).filter(p => p.id !== id)
                  }
                }));
              }}
              onAnalyzePhoto={(photoB64) => {
                setScanFileBase64(photoB64);
                setIsScanModalOpen(true);
                runGeminiScan(photoB64);
              }}
              onClose={() => setActiveTab('2d')}
            />
          ) : activeTab === '3d' ? (
            <Room3DViewer
              roomData={room}
              selectedPointId={selectedPointId}
              onSelectPoint={setSelectedPointId}
            />
          ) : activeTab === 'openings' ? (
            /* Openings Management Grid */
            <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-5 space-y-4 min-h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
                <div>
                  <h3 className="text-sm font-bold text-[#F4F8FF]">Architectural Wall Openings</h3>
                  <p className="text-xs text-[#9EB2CC]">Configure doors, casement windows and patio sliders for structural collision checking.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddOpening('door')}
                    className="px-3 py-1.5 bg-[#FF9A24]/20 hover:bg-[#FF9A24]/30 text-[#FF9A24] border border-[#FF9A24]/40 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Door
                  </button>
                  <button
                    onClick={() => handleAddOpening('window')}
                    className="px-3 py-1.5 bg-[#18D8F2]/20 hover:bg-[#18D8F2]/30 text-[#18D8F2] border border-[#18D8F2]/40 rounded-lg text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Window
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(room.openings || []).map((op) => (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOpeningId(op.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedOpeningId === op.id
                        ? 'bg-[#10243D] border-[#18D8F2] shadow-lg'
                        : 'bg-[#061426] border-[#1B3A5C] hover:border-[#18D8F2]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {op.type === 'door' ? (
                          <DoorClosed className="w-4 h-4 text-[#FF9A24]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#18D8F2]" />
                        )}
                        <span className="font-bold text-xs text-[#F4F8FF]">{op.label || (op.type === 'door' ? 'Door' : 'Window')}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveOpening(op.id);
                        }}
                        className="text-[#9EB2CC] hover:text-[#FF5263] p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#9EB2CC]">
                      <div>Wall: <strong className="text-[#F4F8FF] uppercase">{op.wall}</strong></div>
                      <div>Offset: <strong className="text-[#F4F8FF]">{op.offset || op.x}m</strong></div>
                      <div>Width: <strong className="text-[#F4F8FF]">{op.widthMeters}m</strong></div>
                      <div>Height: <strong className="text-[#F4F8FF]">{op.heightMeters}m</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'points' ? (
            /* Points Table List */
            <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-5 space-y-4 min-h-[520px]">
              <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
                <div>
                  <h3 className="text-sm font-bold text-[#F4F8FF]">Installed Electrical Terminals ({room.points.length})</h3>
                  <p className="text-xs text-[#9EB2CC]">Click any point to inspect, calibrate coordinate or assign to branch feeder.</p>
                </div>
              </div>

              <div className="space-y-2 max-h-[440px] overflow-y-auto custom-scrollbar">
                {room.points.map(pt => (
                  <div
                    key={pt.id}
                    onClick={() => setSelectedPointId(pt.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      selectedPointId === pt.id
                        ? 'bg-[#10243D] border-[#18D8F2] shadow-md'
                        : 'bg-[#061426] border-[#1B3A5C] hover:border-[#147DFF]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#0B1C32] border border-[#1B3A5C] flex items-center justify-center font-bold text-[10px] text-[#18D8F2]">
                        {pt.type.includes('socket') ? 'S' : pt.type.includes('switch') ? 'W' : pt.type.includes('panel') ? 'P' : 'L'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#F4F8FF]">{pt.name}</div>
                        <span className="text-[10px] text-[#9EB2CC] font-mono">
                          Wall: {pt.wall} · Pos: ({pt.x}m, {pt.y}m) · H: {pt.heightMm}mm
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-[#00D6A0]">{pt.wattage}W</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRoomPoint(pt.id);
                        }}
                        className="text-[#9EB2CC] hover:text-[#FF5263] p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* 2D Canvas */
            <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-[#1B3A5C] bg-[#061426] blueprint-grid flex items-center justify-center p-8 select-none">
              {/* 2D Architectural Floor Plan Interactive Canvas */}
              <div 
                className="relative bg-[#0B1C32]/90 border-2 border-[#18D8F2] rounded shadow-2xl transition-all"
                style={{
                  width: `${Math.min(540, room.lengthMeters * 65)}px`,
                  height: `${Math.min(420, room.widthMeters * 65)}px`,
                }}
              >
                {/* Wall Labels & Dimensions */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[#18D8F2] bg-[#061426] px-2 py-0.5 rounded border border-[#1B3A5C]">
                  North Wall ({room.lengthMeters}m)
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[#9EB2CC] bg-[#061426] px-2 py-0.5 rounded border border-[#1B3A5C]">
                  South Wall ({room.lengthMeters}m)
                </div>
                <div className="absolute -left-16 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-mono text-[#9EB2CC] bg-[#061426] px-2 py-0.5 rounded border border-[#1B3A5C]">
                  West Wall ({room.widthMeters}m)
                </div>
                <div className="absolute -right-16 top-1/2 -translate-y-1/2 rotate-90 text-[10px] font-mono text-[#9EB2CC] bg-[#061426] px-2 py-0.5 rounded border border-[#1B3A5C]">
                  East Wall ({room.widthMeters}m)
                </div>

                {/* Render Dynamic Openings on Walls */}
                {(room.openings || []).map((op) => {
                  const wall = op.wall || 'north';
                  const offset = op.offset || op.x || 1.0;
                  const ratio = wall === 'north' || wall === 'south' 
                    ? offset / room.lengthMeters 
                    : offset / room.widthMeters;

                  let style: React.CSSProperties = {};
                  if (wall === 'north') {
                    style = { top: 0, left: `${Math.min(90, Math.max(5, ratio * 100))}%`, height: '4px', width: `${Math.min(80, (op.widthMeters || 1) * 40)}px` };
                  } else if (wall === 'south') {
                    style = { bottom: 0, left: `${Math.min(90, Math.max(5, ratio * 100))}%`, height: '4px', width: `${Math.min(80, (op.widthMeters || 1) * 40)}px` };
                  } else if (wall === 'west') {
                    style = { left: 0, top: `${Math.min(90, Math.max(5, ratio * 100))}%`, width: '4px', height: `${Math.min(80, (op.widthMeters || 1) * 40)}px` };
                  } else {
                    style = { right: 0, top: `${Math.min(90, Math.max(5, ratio * 100))}%`, width: '4px', height: `${Math.min(80, (op.widthMeters || 1) * 40)}px` };
                  }

                  return (
                    <div
                      key={op.id}
                      onClick={() => setSelectedOpeningId(op.id)}
                      style={style}
                      className={`absolute cursor-pointer transition-all z-10 ${
                        op.type === 'door' ? 'bg-[#FF9A24]' : 'bg-[#18D8F2]'
                      } ${selectedOpeningId === op.id ? 'ring-2 ring-white scale-125' : ''}`}
                      title={`${op.label || op.type} (${op.widthMeters}m)`}
                    />
                  );
                })}

                {/* Render All Electrical Points in 2D with exact coordinates */}
                {room.points.map((pt) => {
                  const isSelected = pt.id === selectedPointId;
                  const leftPercent = (pt.x / room.lengthMeters) * 100;
                  const topPercent = (pt.y / room.widthMeters) * 100;

                  let colorBg = 'bg-[#147DFF]';
                  if (pt.type.includes('light')) colorBg = 'bg-[#00D6A0]';
                  if (pt.type.includes('panel')) colorBg = 'bg-[#FF9A24]';
                  if (pt.type.includes('switch')) colorBg = 'bg-[#18D8F2]';

                  return (
                    <div
                      key={pt.id}
                      onClick={() => setSelectedPointId(pt.id)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125 z-20 ${
                        isSelected ? 'scale-125 ring-2 ring-[#FF9A24]' : ''
                      }`}
                      style={{ left: `${Math.min(96, Math.max(4, leftPercent))}%`, top: `${Math.min(96, Math.max(4, topPercent))}%` }}
                      title={`${pt.name} (${pt.heightMm}mm)`}
                    >
                      <div className={`w-5 h-5 rounded-md ${colorBg} flex items-center justify-center shadow-lg text-[9px] font-bold text-[#030B18]`}>
                        {pt.type.includes('socket') ? 'S' : pt.type.includes('switch') ? 'W' : pt.type.includes('panel') ? 'P' : 'L'}
                      </div>
                      <div className="absolute left-6 top-0 text-[9px] font-mono whitespace-nowrap bg-[#061426]/90 px-1 py-0.2 rounded border border-[#1B3A5C] text-[#F4F8FF] pointer-events-none">
                        {pt.name.split(' ')[0]}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom 2D Legend */}
              <div className="absolute bottom-3 left-4 flex flex-wrap items-center gap-3 bg-[#0B1C32]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1B3A5C] text-[11px] font-mono">
                <span className="flex items-center gap-1 text-[#147DFF]">
                  <span className="w-2 h-2 rounded bg-[#147DFF]" /> Sockets
                </span>
                <span className="flex items-center gap-1 text-[#18D8F2]">
                  <span className="w-2 h-2 rounded bg-[#18D8F2]" /> Switches
                </span>
                <span className="flex items-center gap-1 text-[#00D6A0]">
                  <span className="w-2 h-2 rounded bg-[#00D6A0]" /> Luminaires
                </span>
                <span className="flex items-center gap-1 text-[#FF9A24]">
                  <span className="w-2 h-2 rounded bg-[#FF9A24]" /> Switchboard
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspection Column (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1B3A5C]">
              <span className="text-xs font-bold text-[#F4F8FF]">
                {selectedPoint ? 'Terminal Calibration' : selectedOpening ? 'Opening Calibration' : 'Room Properties'}
              </span>
              {selectedPoint && (
                <button
                  onClick={() => removeRoomPoint(selectedPoint.id)}
                  className="text-xs text-[#FF5263] hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
              {selectedOpening && (
                <button
                  onClick={() => handleRemoveOpening(selectedOpening.id)}
                  className="text-xs text-[#FF5263] hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            {selectedPoint ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">Terminal Label</label>
                  <input
                    type="text"
                    value={selectedPoint.name}
                    onChange={(e) => handleUpdateSelectedPoint('name', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">X Coord (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedPoint.x}
                      onChange={(e) => handleUpdateSelectedPoint('x', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Y Coord (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedPoint.y}
                      onChange={(e) => handleUpdateSelectedPoint('y', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Mount Height (mm)</label>
                    <input
                      type="number"
                      step="50"
                      value={selectedPoint.heightMm}
                      onChange={(e) => handleUpdateSelectedPoint('heightMm', parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Load Rating (W)</label>
                    <input
                      type="number"
                      step="50"
                      value={selectedPoint.wattage}
                      onChange={(e) => handleUpdateSelectedPoint('wattage', parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">Associated Circuit Tag</label>
                  <input
                    type="text"
                    value={selectedPoint.circuitId || ''}
                    placeholder="e.g. QF1, QF2"
                    onChange={(e) => handleUpdateSelectedPoint('circuitId', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  />
                </div>
              </div>
            ) : selectedOpening ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">Opening Name</label>
                  <input
                    type="text"
                    value={selectedOpening.label || ''}
                    onChange={(e) => handleUpdateSelectedOpening('label', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">Attached Wall</label>
                  <select
                    value={selectedOpening.wall}
                    onChange={(e) => handleUpdateSelectedOpening('wall', e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  >
                    <option value="north">North Wall</option>
                    <option value="south">South Wall</option>
                    <option value="east">East Wall</option>
                    <option value="west">West Wall</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Width (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedOpening.widthMeters}
                      onChange={(e) => handleUpdateSelectedOpening('widthMeters', parseFloat(e.target.value) || 0.8)}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Height (m)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={selectedOpening.heightMeters}
                      onChange={(e) => handleUpdateSelectedOpening('heightMeters', parseFloat(e.target.value) || 2.1)}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">Offset from corner (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={selectedOpening.offset || selectedOpening.x}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 0.5;
                      handleUpdateSelectedOpening('offset', v);
                      handleUpdateSelectedOpening('x', v);
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">{t.scanner.roomName}</label>
                  <input
                    type="text"
                    value={room.roomName}
                    onChange={(e) => handleUpdateRoomMeta('roomName', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">{t.scanner.roomType}</label>
                  <select
                    value={room.roomType}
                    onChange={(e) => handleUpdateRoomMeta('roomType', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  >
                    <option value="living_room">Living Room & Lounge</option>
                    <option value="kitchen">Commercial / Domestic Kitchen</option>
                    <option value="office">Executive Office</option>
                    <option value="server_room">Server Room / Data NOC</option>
                    <option value="electrical_room">Electrical Switchboard Room</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">{t.scanner.notes}</label>
                  <textarea
                    rows={3}
                    value={room.notes}
                    onChange={(e) => handleUpdateRoomMeta('notes', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  />
                </div>

                <div className="p-3 bg-[#061426] rounded-lg border border-[#1B3A5C] text-[11px] text-[#9EB2CC] space-y-1">
                  <div className="font-semibold text-[#18D8F2]">Standards Guidance:</div>
                  <p>{t.scanner.disclaimer}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real AI Blueprint & Floorplan Vision Scanner Modal */}
      <Modal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        title="Gemini AI Floor Plan & Blueprint Optical Scanner"
        subtitle="Upload architectural drawings or photos to detect room boundaries and electrical points."
      >
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#1B3A5C] hover:border-[#18D8F2] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#061426]"
          >
            <Upload className="w-8 h-8 text-[#18D8F2] mx-auto mb-2" />
            <div className="text-xs font-bold text-[#F4F8FF]">
              {scanFileBase64 ? 'Image Loaded - Ready to Parse' : 'Click to select blueprint drawing or photo'}
            </div>
            <p className="text-[11px] text-[#9EB2CC] mt-1">Supports PNG, JPG, WEBP architectural sketches</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {scanFileBase64 && (
            <div className="rounded-xl overflow-hidden border border-[#1B3A5C] max-h-48 flex items-center justify-center bg-black/60">
              <img src={scanFileBase64} alt="Preview" className="max-h-48 w-auto object-contain" />
            </div>
          )}

          {scanError && (
            <div className="p-3 bg-[#FF5263]/10 border border-[#FF5263]/30 rounded-xl text-xs text-[#FF5263] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {scanResult && (
            <div className="p-4 bg-[#061426] border border-[#00D6A0]/40 rounded-xl space-y-3 text-xs animate-fade-in">
              <div className="font-bold text-[#00D6A0] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#00D6A0]" />
                  <span>Detected: {scanResult.roomName}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30">
                  Verification Required
                </span>
              </div>
              <p className="text-[#9EB2CC] text-[11px]">{scanResult.detectedFeatures}</p>
              
              {/* Calibration Notice: Optical photos are approximate estimates */}
              <div className="p-2.5 bg-[#FF9A24]/10 border border-[#FF9A24]/30 rounded-lg text-[11px] text-[#FF9A24] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Aniq o'lchov tekshiruvi:</strong> Oddiy fotosuratlar taxminiy o'lchamlarni beradi. Iltimos, xona uzunligi va kengligini lazer masofao'lchagich yoki tasdiqlangan chizma bilan solishtirib tasdiqlang.
                </span>
              </div>

              {/* Editable confirmed dimensions */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono block mb-1">Tasdiqlangan Uzunlik (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={scanResult.length}
                    onChange={(e) => setScanResult({ ...scanResult, length: Math.max(1, parseFloat(e.target.value) || 1) })}
                    className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-lg text-xs font-mono text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono block mb-1">Tasdiqlangan Kenglik (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    value={scanResult.width}
                    onChange={(e) => setScanResult({ ...scanResult, width: Math.max(1, parseFloat(e.target.value) || 1) })}
                    className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-lg text-xs font-mono text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono block mb-1">Balandlik (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="2"
                    value={scanResult.height}
                    onChange={(e) => setScanResult({ ...scanResult, height: Math.max(2, parseFloat(e.target.value) || 2.8) })}
                    className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-lg text-xs font-mono text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
                  />
                </div>
              </div>

              <div className="text-[11px] font-mono text-[#18D8F2] flex items-center justify-between pt-1">
                <span>{scanResult.openings?.length || 0} Openings · {scanResult.suggestedPoints?.length || 0} Electrical Points</span>
                <span>Area: {(scanResult.length * scanResult.width).toFixed(1)} m²</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1B3A5C]">
            <button
              onClick={() => {
                setIsScanModalOpen(false);
                setScanFileBase64(null);
                setScanResult(null);
              }}
              className="px-3 py-1.5 bg-[#061426] text-xs font-medium text-[#9EB2CC] rounded-lg"
            >
              Cancel
            </button>

            {scanResult ? (
              <button
                onClick={applyScanResultToRoom}
                className="px-4 py-1.5 bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#030B18] text-xs font-bold rounded-lg shadow flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Apply to Active Room</span>
              </button>
            ) : (
              <button
                onClick={() => runGeminiScan()}
                disabled={!scanFileBase64 || scanLoading}
                className="px-4 py-1.5 bg-[#147DFF] hover:bg-[#147DFF]/90 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow flex items-center gap-1.5"
              >
                {scanLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Parsing with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Parse with Gemini</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
