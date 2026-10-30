import React, { useState } from 'react';
import { 
  Server, 
  Plus, 
  Trash2, 
  Save, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Eye, 
  Cpu, 
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Panel3DViewer } from './Panel3DViewer';
import { AutomatedPanelDesign } from './AutomatedPanelDesign';
import { PanelComponent, PanelEnclosure } from '../../types';
import { Modal } from '../common/Modal';

export const PanelBuilder: React.FC = () => {
  const { 
    activeProject, 
    updateActiveProject, 
    addPanelComponent, 
    removePanelComponent, 
    t, 
    triggerSave, 
    saveStatus,
    setActiveModule
  } = useProject();

  const [panelViewTab, setPanelViewTab] = useState<'automated_design' | '3d_assembly'>('automated_design');
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'front' | 'side' | 'isometric'>('isometric');
  const [componentCategoryFilter, setComponentCategoryFilter] = useState<string>('all');
  const [componentSearch, setComponentSearch] = useState<string>('');
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const [isEnclosureModalOpen, setIsEnclosureModalOpen] = useState(false);

  const enclosure = activeProject.panelEnclosure;
  const components = activeProject.panelComponents;

  // Calculate total occupied modules across all DIN rails
  const totalOccupiedModules = components.reduce((acc, c) => acc + c.moduleWidth, 0);
  const occupancyPercent = Math.min(100, Math.round((totalOccupiedModules / enclosure.totalModules) * 100));

  // Available Modular Device Library Catalog
  const deviceLibrary = [
    {
      type: 'mcb' as const,
      model: 'iC60N 1P 10A B',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 10,
      breakingCapacityKa: 6,
      curve: 'B' as const,
      poles: '1P' as const,
      moduleWidth: 1,
      category: 'breakers'
    },
    {
      type: 'mcb' as const,
      model: 'iC60N 1P 16A C',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 16,
      breakingCapacityKa: 6,
      curve: 'C' as const,
      poles: '1P' as const,
      moduleWidth: 1,
      category: 'breakers'
    },
    {
      type: 'mcb' as const,
      model: 'iC60N 1P 25A C',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 25,
      breakingCapacityKa: 6,
      curve: 'C' as const,
      poles: '1P' as const,
      moduleWidth: 1,
      category: 'breakers'
    },
    {
      type: 'mcb' as const,
      model: 'iC60N 3P 40A C',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 40,
      breakingCapacityKa: 10,
      curve: 'C' as const,
      poles: '3P' as const,
      moduleWidth: 3,
      category: 'breakers'
    },
    {
      type: 'mcb' as const,
      model: 'iC60N 4P 50A C (Main)',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 50,
      breakingCapacityKa: 10,
      curve: 'C' as const,
      poles: '4P' as const,
      moduleWidth: 4,
      category: 'breakers'
    },
    {
      type: 'rcd' as const,
      model: 'Acti9 iID 2P 40A 30mA Type A',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 40,
      curve: 'C' as const,
      poles: '1P+N' as const,
      moduleWidth: 2,
      category: 'protection'
    },
    {
      type: 'rcbo' as const,
      model: 'iDPN N Vigi 1P+N 16A 30mA C',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 16,
      breakingCapacityKa: 6,
      curve: 'C' as const,
      poles: '1P+N' as const,
      moduleWidth: 2,
      category: 'protection'
    },
    {
      type: 'surge' as const,
      model: 'iPRD40r Surge Arrester 3P+N',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 40,
      breakingCapacityKa: 40,
      curve: 'C' as const,
      poles: '4P' as const,
      moduleWidth: 4,
      category: 'protection'
    },
    {
      type: 'contactor' as const,
      model: 'iCT 25A 2NO 230V Modular Contactor',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 25,
      curve: 'C' as const,
      poles: '2P' as const,
      moduleWidth: 2,
      category: 'control'
    },
    {
      type: 'meter' as const,
      model: 'PowerTag Link 3-Phase Energy Meter',
      manufacturer: 'Schneider Electric' as const,
      ratedCurrentA: 63,
      curve: 'C' as const,
      poles: '3P+N' as const,
      moduleWidth: 4,
      category: 'meters'
    }
  ];

  const filteredLibrary = deviceLibrary.filter(d => {
    const matchesCat = componentCategoryFilter === 'all' || d.category === componentCategoryFilter;
    const matchesSearch = d.model.toLowerCase().includes(componentSearch.toLowerCase()) || 
                          d.manufacturer.toLowerCase().includes(componentSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleAddComponentFromLibrary = (libItem: typeof deviceLibrary[0]) => {
    // Find next available row & slot
    let targetRow = 0;
    let targetSlot = 0;

    for (let r = 0; r < enclosure.rows; r++) {
      const rowComps = components.filter(c => c.railIndex === r);
      const usedSlots = rowComps.reduce((acc, c) => acc + c.moduleWidth, 0);
      if (usedSlots + libItem.moduleWidth <= enclosure.modulesPerRow) {
        targetRow = r;
        targetSlot = usedSlots;
        break;
      }
    }

    const newComp: PanelComponent = {
      id: `pc-${Date.now()}`,
      railIndex: targetRow,
      slotPosition: targetSlot,
      moduleWidth: libItem.moduleWidth,
      type: libItem.type,
      model: libItem.model,
      manufacturer: libItem.manufacturer,
      ratedCurrentA: libItem.ratedCurrentA,
      breakingCapacityKa: libItem.breakingCapacityKa,
      curve: libItem.curve,
      poles: libItem.poles,
      phase: libItem.poles === '4P' || libItem.poles === '3P' ? '3P' : 'L1',
      status: 'verified'
    };

    addPanelComponent(newComp);
    setSelectedCompId(newComp.id);
  };

  const selectedComp = components.find(c => c.id === selectedCompId);

  const handleUpdateSelected = (field: keyof PanelComponent, val: any) => {
    if (!selectedCompId) return;
    updateActiveProject(prev => ({
      ...prev,
      panelComponents: prev.panelComponents.map(c => 
        c.id === selectedCompId ? { ...c, [field]: val } : c
      )
    }));
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#061426] border border-[#1B3A5C] rounded-xl shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9A24]" />
            <h1 className="text-xl font-extrabold text-[#F4F8FF] tracking-tight">{t.panel.title}</h1>
            <span className="text-[10px] font-mono uppercase bg-[#FF9A24]/15 text-[#FF9A24] px-2 py-0.5 rounded border border-[#FF9A24]/30">
              Module 03
            </span>
          </div>
          <p className="text-xs text-[#9EB2CC] mt-1">{t.panel.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsStudioModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#FF9A24]/40 text-[#FF9A24] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio 3D Photo View</span>
          </button>

          <button
            onClick={() => setIsEnclosureModalOpen(true)}
            className="px-3 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-[#18D8F2]" />
            <span>Enclosure Specs</span>
          </button>

          <button
            onClick={() => setActiveModule('estimator')}
            className="px-3 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#00D6A0]" />
            <span>Sync BOM</span>
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

      {/* Sub-mode Tab Navigation */}
      <div className="flex items-center gap-2 bg-[#061426] p-1.5 rounded-xl border border-[#1B3A5C] max-w-fit">
        <button
          onClick={() => setPanelViewTab('automated_design')}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
            panelViewTab === 'automated_design'
              ? 'bg-[#FF9A24] text-[#030B18] shadow-lg shadow-[#FF9A24]/20'
              : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Automated Panel Design & Drag-Drop</span>
        </button>

        <button
          onClick={() => setPanelViewTab('3d_assembly')}
          className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 ${
            panelViewTab === '3d_assembly'
              ? 'bg-[#18D8F2] text-[#030B18] shadow-lg shadow-[#18D8F2]/20'
              : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>3D WebGL Cabinet Studio</span>
        </button>
      </div>

      {panelViewTab === 'automated_design' ? (
        <AutomatedPanelDesign onOpen3DViewer={() => setPanelViewTab('3d_assembly')} />
      ) : (
        /* Main 3-Panel Assembly Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Component Catalog (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#9EB2CC] uppercase tracking-wider font-mono">
                {t.panel.componentLibrary}
              </span>
              <span className="text-[10px] font-mono text-[#FF9A24]">Modular 18mm</span>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9EB2CC] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={componentSearch}
                onChange={(e) => setComponentSearch(e.target.value)}
                placeholder="Search MCB, RCD, 16A..."
                className="w-full pl-8 pr-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              />
            </div>

            {/* Category Segmented Controls */}
            <div className="grid grid-cols-3 gap-1 bg-[#061426] p-1 rounded-lg border border-[#1B3A5C] text-[10px] font-semibold">
              <button
                onClick={() => setComponentCategoryFilter('all')}
                className={`py-1 rounded transition-colors ${componentCategoryFilter === 'all' ? 'bg-[#FF9A24] text-[#030B18]' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'}`}
              >
                All
              </button>
              <button
                onClick={() => setComponentCategoryFilter('breakers')}
                className={`py-1 rounded transition-colors ${componentCategoryFilter === 'breakers' ? 'bg-[#FF9A24] text-[#030B18]' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'}`}
              >
                MCB
              </button>
              <button
                onClick={() => setComponentCategoryFilter('protection')}
                className={`py-1 rounded transition-colors ${componentCategoryFilter === 'protection' ? 'bg-[#FF9A24] text-[#030B18]' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'}`}
              >
                RCD/SPD
              </button>
            </div>

            {/* Component Cards List */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredLibrary.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#061426] hover:bg-[#10243D] border border-[#1B3A5C] hover:border-[#FF9A24]/50 rounded-xl transition-all group flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#F4F8FF] leading-snug group-hover:text-[#FF9A24] transition-colors">
                        {item.model}
                      </div>
                      <div className="text-[10px] text-[#9EB2CC] font-mono">
                        {item.manufacturer} · {item.poles}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#0B1C32] rounded border border-[#1B3A5C] text-[#18D8F2]">
                      {item.moduleWidth}M
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1B3A5C]/40 text-[10px] font-mono">
                    <span className="text-[#00D6A0]">{item.ratedCurrentA}A {item.curve} {item.breakingCapacityKa || 6}kA</span>
                    <button
                      onClick={() => handleAddComponentFromLibrary(item)}
                      className="px-2 py-0.5 bg-[#FF9A24]/15 hover:bg-[#FF9A24] text-[#FF9A24] hover:text-[#030B18] font-bold rounded transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Interactive 3D Cabinet Canvas (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          {/* DIN Rail Occupancy Gauge Ribbon */}
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider font-mono">
                {t.panel.occupancy}
              </span>
              <span className="text-xs font-mono font-bold text-[#FF9A24]">
                {totalOccupiedModules} / {enclosure.totalModules} M ({occupancyPercent}%)
              </span>
            </div>

            <div className="w-48 h-2.5 bg-[#061426] rounded-full overflow-hidden border border-[#1B3A5C]">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  occupancyPercent > 85 ? 'bg-[#FF5263]' : occupancyPercent > 65 ? 'bg-[#00D6A0]' : 'bg-[#18D8F2]'
                }`}
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>

            <span className="text-[10px] font-mono text-[#00D6A0] hidden sm:block">
              {enclosure.totalModules - totalOccupiedModules}M Spare Reserve
            </span>
          </div>

          {/* 3D WebGL Panel Viewer */}
          <Panel3DViewer
            enclosure={enclosure}
            components={components}
            selectedComponentId={selectedCompId}
            onSelectComponent={setSelectedCompId}
            viewMode={viewMode}
            onChangeViewMode={setViewMode}
          />

          {/* Quick Rails Overview Strip */}
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((railIdx) => {
              const railComps = components.filter(c => c.railIndex === railIdx);
              const used = railComps.reduce((a, b) => a + b.moduleWidth, 0);
              return (
                <div key={railIdx} className="p-2.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs font-mono">
                  <div className="flex items-center justify-between text-[#9EB2CC] mb-1">
                    <span>DIN Rail #{railIdx + 1}</span>
                    <span className="text-[#F4F8FF] font-bold">{used}/{enclosure.modulesPerRow}M</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#061426] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#147DFF] rounded-full" 
                      style={{ width: `${(used / enclosure.modulesPerRow) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Technical Inspector (3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1B3A5C] pb-2">
              <h3 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider">
                {selectedComp ? 'Device Inspector' : t.panel.enclosureSpecs}
              </h3>
              {selectedComp && (
                <button
                  onClick={() => removePanelComponent(selectedComp.id)}
                  className="text-[10px] text-[#FF5263] hover:underline flex items-center gap-1 font-mono"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            {selectedComp ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">Component Model</label>
                  <input
                    type="text"
                    value={selectedComp.model}
                    onChange={(e) => handleUpdateSelected('model', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF] font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Rated Current</label>
                    <input
                      type="number"
                      value={selectedComp.ratedCurrentA}
                      onChange={(e) => handleUpdateSelected('ratedCurrentA', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Breaking Cap (kA)</label>
                    <input
                      type="number"
                      value={selectedComp.breakingCapacityKa || 6}
                      onChange={(e) => handleUpdateSelected('breakingCapacityKa', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs font-mono text-[#F4F8FF]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">DIN Rail Row</label>
                    <select
                      value={selectedComp.railIndex}
                      onChange={(e) => handleUpdateSelected('railIndex', Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    >
                      <option value={0}>Row 1 (Top)</option>
                      <option value={1}>Row 2 (Middle)</option>
                      <option value={2}>Row 3 (Bottom)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9EB2CC] font-mono">Supply Phase</label>
                    <select
                      value={selectedComp.phase || 'L1'}
                      onChange={(e) => handleUpdateSelected('phase', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                    >
                      <option value="L1">Phase L1</option>
                      <option value="L2">Phase L2</option>
                      <option value="L3">Phase L3</option>
                      <option value="3P">3-Phase (L1+L2+L3)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#9EB2CC] font-mono">Verification Status</label>
                  <select
                    value={selectedComp.status}
                    onChange={(e) => handleUpdateSelected('status', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded text-xs text-[#F4F8FF]"
                  >
                    <option value="verified">Verified (Compliant)</option>
                    <option value="needs_review">Needs Review</option>
                    <option value="not_verified">Not Verified</option>
                  </select>
                </div>

                <div className="p-3 bg-[#061426] rounded-lg border border-[#1B3A5C] space-y-1 text-[11px]">
                  <div className="font-semibold text-[#FF9A24]">Physical Specifications:</div>
                  <div className="text-[#9EB2CC] font-mono">
                    Width: {selectedComp.moduleWidth * 18} mm ({selectedComp.moduleWidth} Modules)
                  </div>
                  <div className="text-[#9EB2CC] font-mono">
                    Mounting: Standard Top Hat DIN EN 50022
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#061426] rounded-lg border border-[#1B3A5C] space-y-2">
                  <div className="text-xs font-bold text-[#F4F8FF]">{enclosure.model}</div>
                  <div className="text-[11px] text-[#9EB2CC]">
                    Modular industrial chassis with galvanized DIN rail sub-assembly and top/bottom knockout gland plates.
                  </div>
                </div>

                <div className="space-y-2 py-1">
                  <div className="flex justify-between py-1 border-b border-[#1B3A5C]/40 text-[#9EB2CC]">
                    <span>Total Rows:</span>
                    <span className="font-mono text-[#F4F8FF]">{enclosure.rows} Rows</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1B3A5C]/40 text-[#9EB2CC]">
                    <span>Modules per Row:</span>
                    <span className="font-mono text-[#F4F8FF]">{enclosure.modulesPerRow} M (18mm)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1B3A5C]/40 text-[#9EB2CC]">
                    <span>Ingress Protection:</span>
                    <span className="font-mono text-[#00D6A0]">{enclosure.ipRating}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#1B3A5C]/40 text-[#9EB2CC]">
                    <span>Dimensions:</span>
                    <span className="font-mono text-[#F4F8FF]">{enclosure.widthMm} × {enclosure.heightMm} × {enclosure.depthMm} mm</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#FF9A24]/10 border border-[#FF9A24]/30 rounded-lg text-[11px] text-[#FF9A24]">
                  Click on any component on the DIN rails to inspect technical curves and terminals.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {/* Studio Reference High-Fidelity 3D Modal */}
      <Modal
        isOpen={isStudioModalOpen}
        onClose={() => setIsStudioModalOpen(false)}
        title="High-Fidelity Studio Distribution Cabinet View"
        subtitle="Ultra-clean industrial rendering of populated DIN enclosure with cable ducting and wiring loom."
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-[#1B3A5C] shadow-2xl">
            <img
              src="/src/assets/images/smart_panel_cabinet_1792251188830.jpg"
              alt="Industrial Electrical Distribution Cabinet"
              className="w-full h-auto object-cover max-h-[500px]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-4 left-4 p-3 bg-[#061426]/90 backdrop-blur-md rounded-xl border border-[#FF9A24]/50 text-xs font-mono text-[#F4F8FF]">
              <span className="font-bold text-[#FF9A24]">Distribution Board Assembly Standard</span> · IEC 61439-1/2
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setIsStudioModalOpen(false)}
              className="px-4 py-1.5 bg-[#147DFF] text-white text-xs font-bold rounded-lg"
            >
              Close Studio View
            </button>
          </div>
        </div>
      </Modal>

      {/* Enclosure Configuration Modal */}
      <Modal
        isOpen={isEnclosureModalOpen}
        onClose={() => setIsEnclosureModalOpen(false)}
        title="Distribution Cabinet Enclosure Configuration"
        subtitle="Select modular capacity, IP ingress protection rating, and chassis dimensions."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Enclosure Model</label>
            <input
              type="text"
              value={enclosure.model}
              onChange={(e) => updateActiveProject(prev => ({
                ...prev,
                panelEnclosure: { ...prev.panelEnclosure, model: e.target.value }
              }))}
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Number of DIN Rows</label>
              <select
                value={enclosure.rows}
                onChange={(e) => updateActiveProject(prev => {
                  const rows = Number(e.target.value);
                  return {
                    ...prev,
                    panelEnclosure: {
                      ...prev.panelEnclosure,
                      rows,
                      totalModules: rows * prev.panelEnclosure.modulesPerRow
                    }
                  };
                })}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              >
                <option value={2}>2 Rows (36 Modules)</option>
                <option value={3}>3 Rows (54 Modules)</option>
                <option value={4}>4 Rows (72 Modules)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Ingress Protection</label>
              <select
                value={enclosure.ipRating}
                onChange={(e) => updateActiveProject(prev => ({
                  ...prev,
                  panelEnclosure: { ...prev.panelEnclosure, ipRating: e.target.value as any }
                }))}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              >
                <option value="IP31">IP31 (Dry Indoor)</option>
                <option value="IP40">IP40 (Standard Residential Flush)</option>
                <option value="IP54">IP54 (Dust & Water Splash)</option>
                <option value="IP65">IP65 (Heavy Industrial Outdoor)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#1B3A5C]">
            <button
              onClick={() => setIsEnclosureModalOpen(false)}
              className="px-4 py-1.5 bg-[#147DFF] text-white text-xs font-bold rounded-lg"
            >
              Apply Enclosure
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
