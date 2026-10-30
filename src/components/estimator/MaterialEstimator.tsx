import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Download, 
  FileText, 
  Plus, 
  RotateCcw, 
  Trash2, 
  Save, 
  Search, 
  DollarSign, 
  ShieldCheck, 
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  Printer,
  Layers,
  FolderKanban,
  Check,
  ChevronDown,
  Info,
  Filter,
  Package,
  Wrench,
  Zap,
  Server,
  Plug,
  Lightbulb,
  Building
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { MaterialItem, Project } from '../../types';
import { Modal } from '../common/Modal';
import { 
  aggregateProjectMaterials, 
  downloadBomCsv, 
  getProjectMaterials,
  AggregatedMaterialItem 
} from '../../lib/bom-csv';

export const MaterialEstimator: React.FC = () => {
  const { 
    projects,
    activeProject, 
    updateActiveProject, 
    recalculateMaterialsFromProject, 
    removeMaterial, 
    addCustomMaterial, 
    formatCurrency, 
    currency, 
    setCurrency,
    usdToUzsRate,
    t, 
    triggerSave, 
    saveStatus 
  } = useProject();

  // Aggregation & Scope State
  const [scopeMode, setScopeMode] = useState<'active' | 'aggregated'>('aggregated');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => 
    projects.map(p => p.id)
  );

  // Filtering & Search
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  
  // Modals & Export state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isCsvMenuOpen, setIsCsvMenuOpen] = useState(false);
  const [lastExportedTimestamp, setLastExportedTimestamp] = useState<string | null>(null);

  // New material form state
  const [newName, setNewName] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCat, setNewCat] = useState<MaterialItem['category']>('cables');
  const [newUnit, setNewUnit] = useState<MaterialItem['unit']>('m');
  const [newQty, setNewQty] = useState(10);
  const [newPrice, setNewPrice] = useState(15000);
  const [newWaste, setNewWaste] = useState(5);

  // Projects to aggregate
  const activeProjectsToAggregate = useMemo(() => {
    if (scopeMode === 'active') {
      return [activeProject];
    }
    return projects.filter(p => selectedProjectIds.includes(p.id));
  }, [projects, activeProject, scopeMode, selectedProjectIds]);

  // Aggregate materials across selected projects
  const { items: aggregatedItems, summary: aggregatedSummary } = useMemo(() => {
    return aggregateProjectMaterials(activeProjectsToAggregate);
  }, [activeProjectsToAggregate]);

  // Filtered materials based on category and search
  const filteredAggregatedItems = useMemo(() => {
    return aggregatedItems.filter(item => {
      const matchesCat = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesSearch = 
        item.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
        item.model.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.specification.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.contributions.some(c => c.projectCode.toLowerCase().includes(searchFilter.toLowerCase()) || c.projectName.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [aggregatedItems, categoryFilter, searchFilter]);

  // Active project single items
  const activeMaterials = activeProject.materials || [];
  const filteredActiveMaterials = useMemo(() => {
    return activeMaterials.filter(m => {
      const matchesCat = categoryFilter === 'all' || m.category === categoryFilter;
      const matchesSearch = 
        m.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
        m.model.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (m.specification && m.specification.toLowerCase().includes(searchFilter.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [activeMaterials, categoryFilter, searchFilter]);

  // Active project financial calculations
  const activeMaterialsSubtotalUzs = useMemo(() => {
    return activeMaterials.reduce((acc, m) => {
      return acc + (m.quantity * m.unitPriceUzS * (1 + m.wastePercent / 100));
    }, 0);
  }, [activeMaterials]);

  const activeLaborCostUzs = (activeProject.laborRatePerDayUzs || 850000) * 5;
  const activeContingencyCostUzs = (activeMaterialsSubtotalUzs + activeLaborCostUzs) * ((activeProject.contingencyPercent || 5) / 100);
  const activeGrandTotalUzs = activeMaterialsSubtotalUzs + activeLaborCostUzs + activeContingencyCostUzs;

  // Selected scope financial totals
  const currentSummary = useMemo(() => {
    if (scopeMode === 'aggregated') {
      return aggregatedSummary;
    }
    return {
      materialsSubtotalUzs: activeMaterialsSubtotalUzs,
      laborDaysTotal: 5,
      laborCostUzs: activeLaborCostUzs,
      contingencyCostUzs: activeContingencyCostUzs,
      grandTotalUzs: activeGrandTotalUzs,
      projectsCount: 1,
      itemsCount: activeMaterials.length
    };
  }, [scopeMode, aggregatedSummary, activeMaterialsSubtotalUzs, activeLaborCostUzs, activeContingencyCostUzs, activeGrandTotalUzs, activeMaterials.length]);

  // Category Cost Breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; costUzs: number; icon: any; label: string }> = {
      cables: { count: 0, costUzs: 0, icon: Zap, label: 'Cables & Conductors' },
      conduits: { count: 0, costUzs: 0, icon: Wrench, label: 'Conduits & Trays' },
      protection: { count: 0, costUzs: 0, icon: ShieldCheck, label: 'Protection & MCBs' },
      panel_equipment: { count: 0, costUzs: 0, icon: Server, label: 'Panel Enclosures' },
      sockets_switches: { count: 0, costUzs: 0, icon: Plug, label: 'Sockets & Switches' },
      lighting: { count: 0, costUzs: 0, icon: Lightbulb, label: 'Lighting Fixtures' }
    };

    aggregatedItems.forEach(item => {
      if (breakdown[item.category]) {
        breakdown[item.category].count += 1;
        breakdown[item.category].costUzs += item.totalLineCostUzS;
      }
    });

    return breakdown;
  }, [aggregatedItems]);

  // Project Checkbox Toggle
  const handleToggleProject = (id: string) => {
    setSelectedProjectIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(pId => pId !== id);
      }
      return [...prev, id];
    });
  };

  // Select all or reset projects
  const handleSelectAllProjects = () => {
    setSelectedProjectIds(projects.map(p => p.id));
  };

  // CSV Export Handler
  const handleExportCsv = (exportScope: 'aggregated' | 'single') => {
    downloadBomCsv({
      scope: exportScope,
      selectedProjects: activeProjectsToAggregate,
      activeProject,
      currency,
      usdToUzsRate
    });
    setLastExportedTimestamp(new Date().toLocaleTimeString());
    setIsCsvMenuOpen(false);
  };

  // Inline edit handler for active project materials
  const handleUpdateActiveMaterial = (id: string, field: keyof MaterialItem, val: any) => {
    updateActiveProject(prev => ({
      ...prev,
      materials: prev.materials.map(m => m.id === id ? { ...m, [field]: val } : m)
    }));
  };

  // Manual material creation
  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addCustomMaterial({
      category: newCat,
      name: newName.trim(),
      model: newModel.trim() || 'Custom',
      specification: 'Field engineer custom specification',
      unit: newUnit,
      quantity: Number(newQty) || 1,
      unitPriceUzS: Number(newPrice) || 10000,
      wastePercent: Number(newWaste) || 5,
      sourceModule: 'Manual',
      notes: `Direct manual entry on ${new Date().toISOString().slice(0, 10)}`
    });
    setNewName('');
    setNewModel('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-5 pb-12 animate-fade-in">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#061426] border border-[#1B3A5C] rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#147DFF]/20 border border-[#147DFF]/40 text-[#18D8F2] flex items-center justify-center shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#F4F8FF] tracking-tight">
                  Bill of Materials (BOM) Estimator
                </h1>
                <span className="text-[10px] font-mono text-[#00D6A0] bg-[#00D6A0]/10 border border-[#00D6A0]/30 px-2 py-0.5 rounded-full">
                  Synchronized Cost Engine
                </span>
              </div>
              <p className="text-xs text-[#9EB2CC] mt-0.5">
                Deterministic cost estimation, multi-project component aggregation, and downloadable CSV cost summaries.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Currency Toggle */}
          <div className="flex items-center bg-[#0B1C32] p-1 rounded-xl border border-[#1B3A5C] text-xs">
            <button
              onClick={() => setCurrency('UZS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currency === 'UZS'
                  ? 'bg-[#147DFF] text-white shadow-sm font-bold'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              UZS (so'm)
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                currency === 'USD'
                  ? 'bg-[#147DFF] text-white shadow-sm font-bold'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              USD ($)
            </button>
          </div>

          {/* Sync from 3D Model */}
          <button
            onClick={recalculateMaterialsFromProject}
            className="px-3.5 py-1.5 bg-[#00D6A0]/15 hover:bg-[#00D6A0]/25 border border-[#00D6A0]/40 text-[#00D6A0] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Recalculate quantities from 3D Room, Cable Routes, and DIN Panel components"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sync 3D Model</span>
          </button>

          {/* Add Custom Material */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#18D8F2]" />
            <span>Add Item</span>
          </button>

          {/* Primary Action: Download CSV Cost Summary Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsCsvMenuOpen(!isCsvMenuOpen)}
              className="px-4 py-1.5 bg-gradient-to-r from-[#EC4899] to-[#D92680] hover:from-[#F43F5E] hover:to-[#EC4899] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#EC4899]/25 hover:shadow-[#EC4899]/40 transition-all cursor-pointer"
              title="Download BOM Cost Summary in RFC-4180 CSV format with UTF-8 BOM"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
              <ChevronDown className="w-3 h-3 text-white/80" />
            </button>

            {isCsvMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl shadow-2xl p-1.5 z-40 space-y-1 animate-fade-in">
                <button
                  onClick={() => handleExportCsv('aggregated')}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-[#F4F8FF] hover:bg-[#10243D] rounded-lg flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#00D6A0]" />
                    <div>
                      <div className="font-bold">Portfolio Aggregated BOM</div>
                      <div className="text-[10px] text-[#9EB2CC]">{activeProjectsToAggregate.length} projects consolidated</div>
                    </div>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[#9EB2CC]" />
                </button>

                <button
                  onClick={() => handleExportCsv('single')}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-[#F4F8FF] hover:bg-[#10243D] rounded-lg flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#18D8F2]" />
                    <div>
                      <div className="font-bold">Active Project BOM</div>
                      <div className="text-[10px] text-[#9EB2CC]">{activeProject.name}</div>
                    </div>
                  </div>
                  <Download className="w-3.5 h-3.5 text-[#9EB2CC]" />
                </button>
              </div>
            )}
          </div>

          {/* PDF Preview Modal Trigger */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="px-3 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#9EB2CC] hover:text-[#F4F8FF] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Preview Printable Certificate"
          >
            <Printer className="w-3.5 h-3.5 text-[#8B5CFF]" />
            <span className="hidden md:inline">Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Scope Selector Ribbon: Active Project vs Multi-Project Aggregation */}
      <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#147DFF]" />
              <span>BOM Estimation Scope:</span>
            </span>

            {/* Scope Tabs */}
            <div className="flex items-center bg-[#0B1C32] p-1 rounded-xl border border-[#1B3A5C] text-xs">
              <button
                onClick={() => setScopeMode('aggregated')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scopeMode === 'aggregated'
                    ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30'
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>Multi-Project Aggregated</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30">
                  {projects.length}
                </span>
              </button>

              <button
                onClick={() => setScopeMode('active')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scopeMode === 'active'
                    ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30'
                    : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Active Project Only</span>
                <span className="text-[10px] font-mono text-[#18D8F2] truncate max-w-[100px] hidden sm:inline">
                  [{activeProject.code}]
                </span>
              </button>
            </div>
          </div>

          {/* Quick Notice info */}
          <div className="text-xs text-[#9EB2CC] font-mono flex items-center gap-2">
            {lastExportedTimestamp && (
              <span className="text-[#00D6A0] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                CSV Exported at {lastExportedTimestamp}
              </span>
            )}
            <span className="hidden lg:inline text-[#9EB2CC]/60">·</span>
            <span className="text-[#18D8F2]">{currentSummary.itemsCount} Billable Line Items</span>
          </div>
        </div>

        {/* Aggregated Mode: Interactive Project Selector Checkboxes */}
        {scopeMode === 'aggregated' && (
          <div className="pt-3 border-t border-[#1B3A5C]/60 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-[#9EB2CC] mr-1">
              Select Projects to Aggregate:
            </span>
            {projects.map(proj => {
              const isSelected = selectedProjectIds.includes(proj.id);
              const projItemsCount = getProjectMaterials(proj).length;
              return (
                <button
                  key={proj.id}
                  onClick={() => handleToggleProject(proj.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#10243D] border-[#18D8F2] text-[#F4F8FF] shadow-sm'
                      : 'bg-[#030B18]/60 border-[#1B3A5C]/60 text-[#9EB2CC] opacity-60 hover:opacity-100'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border ${
                    isSelected ? 'bg-[#18D8F2] border-[#18D8F2] text-black font-bold' : 'border-[#1B3A5C]'
                  }`}>
                    {isSelected && '✓'}
                  </span>
                  <span className="font-bold">{proj.code}</span>
                  <span className="text-[10px] text-[#9EB2CC] truncate max-w-[120px]">{proj.name}</span>
                  <span className="text-[10px] font-mono text-[#18D8F2]">({projItemsCount})</span>
                </button>
              );
            })}

            {selectedProjectIds.length < projects.length && (
              <button
                onClick={handleSelectAllProjects}
                className="text-[11px] text-[#147DFF] hover:underline font-mono ml-2 cursor-pointer"
              >
                Select All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Financial KPI Summary Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="text-[10px] uppercase font-mono text-[#9EB2CC] flex items-center justify-between">
            <span>MATERIALS SUBTOTAL</span>
            <Package className="w-4 h-4 text-[#147DFF]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#F4F8FF] font-mono tabular-nums">
              {formatCurrency(currentSummary.materialsSubtotalUzs)}
            </div>
            <div className="text-[11px] text-[#9EB2CC] font-mono mt-0.5">
              {currentSummary.itemsCount} synchronized line items
            </div>
          </div>
        </div>

        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="text-[10px] uppercase font-mono text-[#9EB2CC] flex items-center justify-between">
            <span>LABOR & INSTALLATION</span>
            <Wrench className="w-4 h-4 text-[#18D8F2]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#18D8F2] font-mono tabular-nums">
              {formatCurrency(currentSummary.laborCostUzs)}
            </div>
            <div className="text-[11px] text-[#9EB2CC] font-mono mt-0.5">
              {currentSummary.laborDaysTotal} days @ {formatCurrency(activeProject.laborRatePerDayUzs || 850000)}/day
            </div>
          </div>
        </div>

        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-4 flex flex-col justify-between shadow-lg">
          <div className="text-[10px] uppercase font-mono text-[#9EB2CC] flex items-center justify-between">
            <span>CONTINGENCY RESERVE</span>
            <ShieldCheck className="w-4 h-4 text-[#FF9A24]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#FF9A24] font-mono tabular-nums">
              {formatCurrency(currentSummary.contingencyCostUzs)}
            </div>
            <div className="text-[11px] text-[#9EB2CC] font-mono mt-0.5">
              Standard certified buffer factor
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#061426] via-[#091E38] to-[#061426] border-2 border-[#18D8F2]/40 rounded-2xl p-4 flex flex-col justify-between shadow-xl ring-1 ring-[#18D8F2]/20">
          <div className="text-[10px] uppercase font-mono text-[#00D6A0] font-bold flex items-center justify-between">
            <span>GRAND TOTAL ESTIMATE</span>
            <DollarSign className="w-4 h-4 text-[#00D6A0]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-[#00D6A0] font-mono tabular-nums">
              {formatCurrency(currentSummary.grandTotalUzs)}
            </div>
            <div className="text-[11px] text-[#9EB2CC] font-mono mt-0.5 flex items-center gap-1.5">
              <span>Includes taxes & logistics</span>
              <span>·</span>
              <span className="text-[#18D8F2]">{currentSummary.projectsCount} project(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Cost Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {Object.entries(categoryBreakdown).map(([catKey, data]) => {
          const Icon = data.icon;
          const isFilterActive = categoryFilter === catKey;
          return (
            <button
              key={catKey}
              onClick={() => setCategoryFilter(isFilterActive ? 'all' : catKey)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isFilterActive
                  ? 'bg-[#147DFF]/20 border-[#147DFF] text-white shadow-md'
                  : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4 text-[#18D8F2]" />
                <span className="text-[10px] font-mono text-[#9EB2CC]">{data.count} types</span>
              </div>
              <div className="mt-2">
                <div className="text-xs font-bold text-[#F4F8FF] truncate">{data.label.split(' ')[0]}</div>
                <div className="text-[11px] font-mono text-[#00D6A0] tabular-nums mt-0.5">
                  {formatCurrency(data.costUzs)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#061426] p-3 rounded-2xl border border-[#1B3A5C]">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {['all', 'cables', 'conduits', 'protection', 'panel_equipment', 'sockets_switches', 'lighting'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors capitalize cursor-pointer ${
                categoryFilter === cat 
                  ? 'bg-[#147DFF] text-white shadow-sm font-bold' 
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
              }`}
            >
              {cat === 'all' ? 'All Materials' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative min-w-[240px] flex-1 sm:flex-initial">
          <Search className="w-3.5 h-3.5 text-[#9EB2CC] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search material, catalog code, or project..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] focus:border-[#18D8F2] rounded-xl text-xs text-[#F4F8FF] placeholder-[#9EB2CC]/60 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Bill of Materials Table */}
      <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-[#1B3A5C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#00D6A0]" />
            <h3 className="text-sm font-bold text-[#F4F8FF]">
              {scopeMode === 'aggregated' 
                ? `Consolidated Portfolio Bill of Materials (${filteredAggregatedItems.length} Items)`
                : `Active Project BOM: ${activeProject.name} (${filteredActiveMaterials.length} Items)`}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-mono text-[#9EB2CC]">
              {scopeMode === 'aggregated' ? `${activeProjectsToAggregate.length} projects merged` : 'Single project'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#030B18] border-b border-[#1B3A5C] text-[#9EB2CC] uppercase font-mono text-[10px]">
              <tr>
                <th className="px-3 py-3 w-10">#</th>
                <th className="px-4 py-3">Material & Specification</th>
                <th className="px-3 py-3">Model / Catalog</th>
                <th className="px-2 py-3 text-center">Unit</th>
                <th className="px-2 py-3 text-right">Base Qty</th>
                <th className="px-2 py-3 text-center">Waste %</th>
                <th className="px-2 py-3 text-right">Billable</th>
                <th className="px-3 py-3 text-right">Unit Price ({currency})</th>
                <th className="px-3 py-3 text-right">Line Total ({currency})</th>
                {scopeMode === 'aggregated' ? (
                  <th className="px-3 py-3">Contributing Projects</th>
                ) : (
                  <>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-2 py-3 text-center">Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B3A5C]/40">
              {scopeMode === 'aggregated' ? (
                // Aggregated Multi-Project View
                filteredAggregatedItems.map((item, idx) => {
                  return (
                    <tr key={item.key} className="hover:bg-[#0B1C32] transition-colors">
                      <td className="px-3 py-3 font-mono text-[#9EB2CC]">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-[#F4F8FF]">
                        <div className="flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className="text-[9px] font-mono text-[#18D8F2] bg-[#18D8F2]/10 px-1.5 py-0.2 rounded border border-[#18D8F2]/20 uppercase">
                            {item.category.replace('_', ' ')}
                          </span>
                        </div>
                        {item.specification && (
                          <div className="text-[10px] text-[#9EB2CC] font-mono mt-0.5 line-clamp-1">
                            {item.specification}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-[#9EB2CC] text-[11px]">{item.model || 'Standard'}</td>
                      <td className="px-2 py-3 text-center font-mono text-[#9EB2CC]">{item.unit}</td>
                      <td className="px-2 py-3 text-right font-mono font-bold text-[#F4F8FF]">
                        {item.totalQuantity}
                      </td>
                      <td className="px-2 py-3 text-center font-mono text-[#9EB2CC]">
                        {item.averageWastePercent}%
                      </td>
                      <td className="px-2 py-3 text-right font-mono font-bold text-[#18D8F2]">
                        {item.billableQuantity}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-[#9EB2CC]">
                        {formatCurrency(item.unitPriceUzS)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-[#00D6A0] text-sm tabular-nums">
                        {formatCurrency(item.totalLineCostUzS)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {item.contributions.map((c, cIdx) => (
                            <span 
                              key={cIdx} 
                              className="text-[10px] font-mono text-[#F4F8FF] bg-[#030B18] px-1.5 py-0.5 rounded border border-[#1B3A5C]"
                              title={`${c.projectName}: ${c.quantity} ${c.unit}`}
                            >
                              <strong className="text-[#147DFF]">{c.projectCode}</strong>: {c.quantity}{c.unit}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                // Active Project Single View with Inline Editable Inputs
                filteredActiveMaterials.map((m, idx) => {
                  const lineTotalUzs = m.quantity * m.unitPriceUzS * (1 + m.wastePercent / 100);
                  return (
                    <tr key={m.id} className="hover:bg-[#0B1C32] transition-colors">
                      <td className="px-3 py-3 font-mono text-[#9EB2CC]">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-[#F4F8FF]">
                        <div>{m.name}</div>
                        {m.specification && (
                          <div className="text-[10px] text-[#9EB2CC] font-mono mt-0.5">{m.specification}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-[#9EB2CC]">{m.model}</td>
                      <td className="px-2 py-3 text-center font-mono text-[#9EB2CC]">{m.unit}</td>
                      <td className="px-2 py-3 text-right">
                        <input
                          type="number"
                          min="1"
                          value={m.quantity}
                          onChange={(e) => handleUpdateActiveMaterial(m.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-1.5 py-0.5 bg-[#030B18] border border-[#1B3A5C] rounded-lg text-xs font-mono font-bold text-[#F4F8FF] text-right"
                        />
                      </td>
                      <td className="px-2 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={m.wastePercent}
                          onChange={(e) => handleUpdateActiveMaterial(m.id, 'wastePercent', parseInt(e.target.value) || 0)}
                          className="w-12 px-1 py-0.5 bg-[#030B18] border border-[#1B3A5C] rounded-lg text-xs font-mono text-[#9EB2CC] text-center"
                        />
                      </td>
                      <td className="px-2 py-3 text-right font-mono font-bold text-[#18D8F2]">
                        {Math.ceil(m.quantity * (1 + m.wastePercent / 100))}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <input
                          type="number"
                          step="1000"
                          value={m.unitPriceUzS}
                          onChange={(e) => handleUpdateActiveMaterial(m.id, 'unitPriceUzS', parseInt(e.target.value) || 0)}
                          className="w-24 px-1.5 py-0.5 bg-[#030B18] border border-[#1B3A5C] rounded-lg text-xs font-mono text-[#18D8F2] text-right"
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-[#00D6A0] text-sm tabular-nums">
                        {formatCurrency(lineTotalUzs)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[10px] font-mono text-[#9EB2CC]">
                          {m.sourceModule}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => removeMaterial(m.id)}
                          className="p-1 text-[#FF5263] hover:bg-[#FF5263]/20 rounded-lg transition-colors cursor-pointer"
                          title="Delete line item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {((scopeMode === 'aggregated' && filteredAggregatedItems.length === 0) ||
          (scopeMode === 'active' && filteredActiveMaterials.length === 0)) && (
          <div className="p-8 text-center text-[#9EB2CC] space-y-2">
            <Package className="w-8 h-8 mx-auto opacity-50" />
            <div className="text-sm font-bold text-[#F4F8FF]">No materials found</div>
            <p className="text-xs max-w-sm mx-auto">
              No material line items matched your search filter or category. Try clearing filters or click "Sync 3D Model".
            </p>
          </div>
        )}
      </div>

      {/* Add Custom Material Row Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Material Line Item"
        subtitle="Insert custom cables, fixtures, switchgear, or mounting supplies into the BOM."
      >
        <form onSubmit={handleCreateMaterial} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Material Name <span className="text-[#EC4899]">*</span></label>
            <input
              type="text"
              required
              placeholder="e.g. Copper Earth Grounding Rod 16mm x 2.5m"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Manufacturer / Model</label>
              <input
                type="text"
                placeholder="e.g. DKC Galvanized Steel"
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Category</label>
              <select
                value={newCat}
                onChange={(e) => setNewCat(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] outline-none"
              >
                <option value="cables">Cables & Conductors</option>
                <option value="conduits">Conduits & Trays</option>
                <option value="panel_equipment">Panel Equipment</option>
                <option value="protection">Protection (MCB/RCD)</option>
                <option value="sockets_switches">Sockets & Switches</option>
                <option value="lighting">Lighting & Fixtures</option>
                <option value="mounting">Mounting & Hardware</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Unit</label>
              <select
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] outline-none"
              >
                <option value="m">Meters (m)</option>
                <option value="pcs">Pieces (pcs)</option>
                <option value="set">Set</option>
                <option value="roll">Roll</option>
                <option value="pack">Pack</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Quantity</label>
              <input
                type="number"
                value={newQty}
                onChange={(e) => setNewQty(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Unit Price (UZS)</label>
              <input
                type="number"
                step="5000"
                value={newPrice}
                onChange={(e) => setNewPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#1B3A5C]">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 bg-[#061426] text-xs font-medium text-[#9EB2CC] rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
            >
              Add to BOM
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable PDF Modal */}
      <Modal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        title="Engineering Bill of Materials & Cost Certificate"
        subtitle="Official project bill of quantities formatted for client sign-off."
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 text-xs font-sans">
          {/* Printable Document Box */}
          <div className="p-6 bg-white text-slate-900 rounded-xl border border-slate-300 space-y-6 shadow-inner print:p-0">
            {/* Document Header */}
            <div className="flex items-start justify-between border-b border-slate-300 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  ELECTROVISION ENGINEERING ESTIMATE
                </h2>
                <p className="text-xs text-slate-600 font-mono">
                  Document ID: EV-EST-{activeProject.code}-2026
                </p>
                <div className="text-xs text-slate-600 mt-1">
                  <strong>Project:</strong> {activeProject.name} ({activeProject.location})
                </div>
              </div>
              <div className="text-right text-xs text-slate-600">
                <div><strong>Standard:</strong> {activeProject.standard}</div>
                <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                <div><strong>Lead PE:</strong> {activeProject.leadEngineer}</div>
              </div>
            </div>

            {/* Compact Table */}
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-slate-700 font-bold">
                  <th className="py-1">Item</th>
                  <th className="py-1">Specification</th>
                  <th className="py-1">Model</th>
                  <th className="py-1 text-center">Unit</th>
                  <th className="py-1 text-right">Qty</th>
                  <th className="py-1 text-right">Unit Price</th>
                  <th className="py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(scopeMode === 'aggregated' ? filteredAggregatedItems : activeMaterials).slice(0, 20).map((m: any, idx: number) => {
                  const qty = m.billableQuantity || m.quantity;
                  const price = m.unitPriceUzS;
                  const amt = m.totalLineCostUzS || (m.quantity * m.unitPriceUzS * (1 + m.wastePercent / 100));
                  return (
                    <tr key={idx}>
                      <td className="py-1.5 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-1.5 font-semibold text-slate-900">{m.name}</td>
                      <td className="py-1.5 text-slate-600 font-mono">{m.model}</td>
                      <td className="py-1.5 text-center text-slate-600">{m.unit}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-slate-900">{qty}</td>
                      <td className="py-1.5 text-right font-mono text-slate-600">{formatCurrency(price)}</td>
                      <td className="py-1.5 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(amt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Financial Totals Block */}
            <div className="flex justify-end pt-4 border-t-2 border-slate-900">
              <div className="w-64 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Materials Subtotal:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(currentSummary.materialsSubtotalUzs)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Labor & Installation:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(currentSummary.laborCostUzs)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Contingency Reserve:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(currentSummary.contingencyCostUzs)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-900 text-sm font-black text-blue-900">
                  <span>ESTIMATE TOTAL:</span>
                  <span>{formatCurrency(currentSummary.grandTotalUzs)}</span>
                </div>
              </div>
            </div>

            {/* Engineering Stamp Seal */}
            <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
              <div>
                Verified for compliance with Republic of Uzbekistan ShNQ and GOST electrical safety codes.
              </div>
              <div className="border-2 border-blue-900 text-blue-900 px-3 py-1 font-mono font-black rounded uppercase text-center">
                ELECTROVISION PRO<br/>CERTIFIED PE STAMP
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsPdfModalOpen(false)}
              className="px-3 py-1.5 bg-[#061426] text-xs font-medium text-[#9EB2CC] rounded-xl cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-1.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
