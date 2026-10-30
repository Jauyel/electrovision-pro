import React, { useState, useMemo } from 'react';
import { 
  FolderDown, 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Sparkles, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Building2, 
  Home, 
  Factory, 
  Server, 
  Bookmark, 
  ChevronRight, 
  Info, 
  ArrowRight, 
  Copy,
  AlertCircle,
  X
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ProjectTemplate, TemplateCategory } from '../../types';
import { TEMPLATE_CATEGORIES } from '../../data/projectTemplates';
import { Modal } from '../common/Modal';

interface ProjectTemplatesProps {
  onClose?: () => void;
  isModalView?: boolean;
}

export const ProjectTemplates: React.FC<ProjectTemplatesProps> = ({ 
  onClose, 
  isModalView = false 
}) => {
  const { 
    templates, 
    activeProject, 
    applyTemplate, 
    createProjectFromTemplate, 
    saveCurrentAsTemplate, 
    deleteCustomTemplate,
    exportTemplatesJson,
    importTemplatesJson,
    setActiveModule,
    addActivityLog
  } = useProject();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null);

  // Apply dialog state
  const [applyTargetTemplate, setApplyTargetTemplate] = useState<ProjectTemplate | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');

  // Save current project state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetCategory, setPresetCategory] = useState<TemplateCategory>('residential');
  const [presetDescription, setPresetDescription] = useState('');
  const [presetTagline, setPresetTagline] = useState('');

  // Import JSON state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importFeedback, setImportFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // Success banner
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => {
      setActionSuccessMessage(null);
    }, 4000);
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(tpl => {
      const matchesCategory = 
        selectedCategory === 'all' ? true :
        selectedCategory === 'custom' ? tpl.isCustom :
        tpl.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.tagline.toLowerCase().includes(q) ||
        tpl.circuits.some(c => c.name.toLowerCase().includes(q) || c.cableType.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Phase distribution calculations for selected template
  const phaseBreakdown = useMemo(() => {
    if (!selectedTemplate) return { L1: 0, L2: 0, L3: 0, totalWatts: 0 };
    let L1 = 0, L2 = 0, L3 = 0;
    selectedTemplate.circuits.forEach(c => {
      if (c.phase === '3P') {
        L1 += c.powerWatts / 3;
        L2 += c.powerWatts / 3;
        L3 += c.powerWatts / 3;
      } else if (c.phase === 'L1') L1 += c.powerWatts;
      else if (c.phase === 'L2') L2 += c.powerWatts;
      else if (c.phase === 'L3') L3 += c.powerWatts;
    });
    const totalWatts = L1 + L2 + L3;
    return { L1, L2, L3, totalWatts };
  }, [selectedTemplate]);

  // Handle Save Current
  const handleSaveCurrent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetName.trim()) return;

    const saved = saveCurrentAsTemplate(
      presetName.trim(),
      presetCategory,
      presetDescription.trim(),
      presetTagline.trim()
    );

    setIsSaveModalOpen(false);
    setPresetName('');
    setPresetDescription('');
    setPresetTagline('');
    setSelectedCategory('custom');
    showToast(`Preset "${saved.name}" successfully created and saved to library!`);
  };

  // Handle Apply
  const handleConfirmApply = () => {
    if (!applyTargetTemplate) return;
    applyTemplate(applyTargetTemplate.id, applyMode);
    const templateName = applyTargetTemplate.name;
    setApplyTargetTemplate(null);
    showToast(`Applied "${templateName}" (${applyMode === 'replace' ? 'replaced' : 'appended'})!`);
  };

  // Handle Create New Project
  const handleCreateNewProject = (template: ProjectTemplate) => {
    createProjectFromTemplate(template.id, `${template.name} — Project`);
    showToast(`Created and switched to new project with "${template.name}" configuration!`);
    if (onClose) onClose();
  };

  // Handle Export
  const handleExportJson = () => {
    const dataStr = exportTemplatesJson();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ElectroVision_Templates_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported template presets to JSON file!');
  };

  // Handle Import
  const handleConfirmImport = () => {
    if (!jsonInput.trim()) return;
    const res = importTemplatesJson(jsonInput);
    if (res.success) {
      setImportFeedback({ success: true, message: `Successfully imported ${res.importedCount} preset(s)!` });
      setTimeout(() => {
        setIsImportModalOpen(false);
        setJsonInput('');
        setImportFeedback(null);
        setSelectedCategory('custom');
        showToast(`Imported ${res.importedCount} circuit preset(s) into your library!`);
      }, 1200);
    } else {
      setImportFeedback({ success: false, message: res.error || 'Failed to import JSON.' });
    }
  };

  const getCategoryIcon = (category: TemplateCategory) => {
    switch (category) {
      case 'residential':
        return <Home className="w-3.5 h-3.5 text-[#18D8F2]" />;
      case 'commercial':
        return <Building2 className="w-3.5 h-3.5 text-[#8B5CFF]" />;
      case 'industrial':
        return <Factory className="w-3.5 h-3.5 text-[#FF9A24]" />;
      case 'specialty':
        return <Server className="w-3.5 h-3.5 text-[#00D6A0]" />;
      case 'custom':
        return <Bookmark className="w-3.5 h-3.5 text-[#147DFF]" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-[#18D8F2]" />;
    }
  };

  const getCategoryBadgeClass = (category: TemplateCategory) => {
    switch (category) {
      case 'residential':
        return 'bg-[#18D8F2]/15 text-[#18D8F2] border-[#18D8F2]/30';
      case 'commercial':
        return 'bg-[#8B5CFF]/15 text-[#8B5CFF] border-[#8B5CFF]/30';
      case 'industrial':
        return 'bg-[#FF9A24]/15 text-[#FF9A24] border-[#FF9A24]/30';
      case 'specialty':
        return 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30';
      case 'custom':
        return 'bg-[#147DFF]/15 text-[#147DFF] border-[#147DFF]/30';
      default:
        return 'bg-[#18D8F2]/15 text-[#18D8F2] border-[#18D8F2]/30';
    }
  };

  return (
    <div className={`space-y-6 ${isModalView ? '' : 'pb-12 animate-fade-in'}`}>
      {/* Toast Notification */}
      {actionSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#00D6A0] text-[#030B18] px-4 py-3 rounded-xl font-bold text-xs shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-[#030B18]" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="p-5 bg-[#061426] border border-[#1B3A5C] rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#18D8F2]/20 to-[#8B5CFF]/20 border border-[#18D8F2]/40 flex items-center justify-center">
              <Layers className="w-5 h-5 text-[#18D8F2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-[#F4F8FF] tracking-tight">Circuit Presets & Project Templates</h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#18D8F2]/15 text-[#18D8F2] border border-[#18D8F2]/30">
                  Engineering Library
                </span>
              </div>
              <p className="text-xs text-[#9EB2CC] mt-0.5">
                Accelerate new electrical projects with standard IEC 60364 & PUE 7.1 circuit templates or capture reusable custom designs.
              </p>
            </div>
          </div>
        </div>

        {/* Global Template Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setPresetName(`${activeProject.name} — Circuit Preset`);
              setIsSaveModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#147DFF]/25 transition-all cursor-pointer"
            title="Save active project's circuits as a reusable template"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Save Current as Preset</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Import template configurations from JSON"
          >
            <Upload className="w-3.5 h-3.5 text-[#18D8F2]" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export preset library to JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#00D6A0]" />
            <span>Export Library</span>
          </button>

          {isModalView && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] rounded-lg transition-colors ml-1 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B1C32] p-3 rounded-xl border border-[#1B3A5C]">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {TEMPLATE_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat.id;
            const count = cat.id === 'all' 
              ? templates.length 
              : cat.id === 'custom' 
                ? templates.filter(t => t.isCustom).length 
                : templates.filter(t => t.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30'
                    : 'bg-[#061426] text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] border border-[#1B3A5C]'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-[#0B1C32] text-[#9EB2CC]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9EB2CC]" />
          <input
            type="text"
            placeholder="Search templates or circuits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] placeholder-[#9EB2CC] focus:outline-none focus:border-[#18D8F2]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9EB2CC] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Template Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const isCustom = template.isCustom;
          const circuitCount = template.circuits.length;
          const totalLoad = template.estimatedLoadKw || (template.circuits.reduce((a, b) => a + b.powerWatts, 0) / 1000);
          const isSelected = selectedTemplate?.id === template.id;

          return (
            <div
              key={template.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 group ${
                isSelected 
                  ? 'bg-[#10243D] border-[#18D8F2] ring-2 ring-[#18D8F2]/30 shadow-xl' 
                  : 'bg-[#0B1C32] border-[#1B3A5C] hover:border-[#18D8F2]/40 hover:shadow-lg'
              }`}
            >
              <div>
                {/* Header with badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${getCategoryBadgeClass(template.category)}`}>
                      {getCategoryIcon(template.category)}
                      <span className="capitalize">{template.category}</span>
                    </span>

                    <span className="px-1.5 py-0.5 bg-[#061426] text-[#9EB2CC] text-[10px] font-mono rounded border border-[#1B3A5C]">
                      {template.standard}
                    </span>

                    {isCustom && (
                      <span className="px-1.5 py-0.5 bg-[#00D6A0]/15 text-[#00D6A0] text-[10px] font-mono font-bold rounded border border-[#00D6A0]/30">
                        Custom User
                      </span>
                    )}
                  </div>

                  {isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete custom preset "${template.name}"?`)) {
                          deleteCustomTemplate(template.id);
                          if (selectedTemplate?.id === template.id) setSelectedTemplate(null);
                          showToast(`Deleted custom template "${template.name}"`);
                        }
                      }}
                      className="text-[#9EB2CC] hover:text-[#FF5263] p-1 rounded transition-colors"
                      title="Delete custom preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Title & Tagline */}
                <h3 className="text-base font-bold text-[#F4F8FF] leading-snug group-hover:text-[#18D8F2] transition-colors">
                  {template.name}
                </h3>
                <p className="text-xs text-[#9EB2CC] mt-1 line-clamp-2">
                  {template.tagline || template.description}
                </p>

                {/* Key Spec Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 bg-[#061426] rounded-xl border border-[#1B3A5C] text-center">
                  <div>
                    <div className="text-[10px] font-mono text-[#9EB2CC]">Circuits</div>
                    <div className="text-xs font-extrabold text-[#F4F8FF] font-mono">{circuitCount} QF</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-[#9EB2CC]">Connected</div>
                    <div className="text-xs font-extrabold text-[#18D8F2] font-mono">{totalLoad.toFixed(1)} kW</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono text-[#9EB2CC]">Feed</div>
                    <div className="text-xs font-extrabold text-[#00D6A0] font-mono">{template.nominalVoltage}V {template.nominalVoltage === 400 ? '3P' : '1P'}</div>
                  </div>
                </div>

                {/* Highlights */}
                {template.highlights && template.highlights.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {template.highlights.slice(0, 3).map((hl, i) => (
                      <li key={i} className="text-[11px] text-[#9EB2CC] flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#18D8F2] shrink-0" />
                        <span className="truncate">{hl}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-[#1B3A5C] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="flex-1 py-1.5 px-3 bg-[#061426] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-[#18D8F2]" />
                    <span>Inspect Circuits</span>
                  </button>

                  <button
                    onClick={() => setApplyTargetTemplate(template)}
                    className="flex-1 py-1.5 px-3 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:opacity-95 text-[#030B18] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-[#147DFF]/20 transition-all cursor-pointer"
                  >
                    <FolderDown className="w-3.5 h-3.5 text-[#030B18]" />
                    <span>Apply Preset</span>
                  </button>
                </div>

                <button
                  onClick={() => handleCreateNewProject(template)}
                  className="w-full py-1 px-2.5 text-[11px] text-[#9EB2CC] hover:text-[#00D6A0] hover:bg-[#061426] rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer font-mono"
                >
                  <Plus className="w-3 h-3 text-[#00D6A0]" />
                  <span>Initialize New Project with this Preset</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="p-12 text-center bg-[#061426] border border-[#1B3A5C] rounded-2xl">
          <Layers className="w-12 h-12 text-[#9EB2CC] mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-[#F4F8FF]">No Templates Found</h3>
          <p className="text-xs text-[#9EB2CC] mt-1 max-w-md mx-auto">
            No circuit templates matched your active category filter or search query. Try clearing the filter or saving the active project as a new preset.
          </p>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="mt-4 px-4 py-2 bg-[#147DFF] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Inspect Template Modal / Drawer */}
      {selectedTemplate && (
        <Modal
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          title={`Circuit Schedule & Topology — ${selectedTemplate.name}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-5">
            {/* Template Header Overview */}
            <div className="p-4 bg-[#061426] rounded-xl border border-[#1B3A5C] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${getCategoryBadgeClass(selectedTemplate.category)}`}>
                    {getCategoryIcon(selectedTemplate.category)}
                    <span className="capitalize">{selectedTemplate.category}</span>
                  </span>
                  <span className="text-xs font-mono text-[#00D6A0]">{selectedTemplate.standard}</span>
                  <span className="text-xs font-mono text-[#9EB2CC]">· {selectedTemplate.incomerBreaker}</span>
                </div>
                <p className="text-xs text-[#9EB2CC] mt-2 leading-relaxed">
                  {selectedTemplate.description}
                </p>
              </div>

              {/* Actions inside inspector */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setApplyTargetTemplate(selectedTemplate);
                  }}
                  className="px-4 py-2 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#147DFF]/25 cursor-pointer"
                >
                  <FolderDown className="w-4 h-4" />
                  <span>Apply to Active Project</span>
                </button>
              </div>
            </div>

            {/* Phase Load Balance Strip */}
            <div className="p-3.5 bg-[#061426] rounded-xl border border-[#1B3A5C]">
              <div className="flex items-center justify-between text-xs font-mono text-[#9EB2CC] mb-1.5">
                <span className="font-bold text-[#F4F8FF]">Estimated 3-Phase Distribution</span>
                <span>Total: {(phaseBreakdown.totalWatts / 1000).toFixed(2)} kW active</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-2 rounded bg-[#0B1C32] border border-[#8B5CFF]/30">
                  <div className="text-[10px] font-mono text-[#8B5CFF] font-bold">Phase L1 (Brown)</div>
                  <div className="text-xs font-mono font-extrabold text-[#F4F8FF] mt-0.5">
                    {(phaseBreakdown.L1 / 1000).toFixed(2)} kW
                  </div>
                </div>
                <div className="p-2 rounded bg-[#0B1C32] border border-[#18D8F2]/30">
                  <div className="text-[10px] font-mono text-[#18D8F2] font-bold">Phase L2 (Black)</div>
                  <div className="text-xs font-mono font-extrabold text-[#F4F8FF] mt-0.5">
                    {(phaseBreakdown.L2 / 1000).toFixed(2)} kW
                  </div>
                </div>
                <div className="p-2 rounded bg-[#0B1C32] border border-[#FF9A24]/30">
                  <div className="text-[10px] font-mono text-[#FF9A24] font-bold">Phase L3 (Grey)</div>
                  <div className="text-xs font-mono font-extrabold text-[#F4F8FF] mt-0.5">
                    {(phaseBreakdown.L3 / 1000).toFixed(2)} kW
                  </div>
                </div>
              </div>
            </div>

            {/* Circuit Table */}
            <div className="border border-[#1B3A5C] rounded-xl overflow-hidden bg-[#061426]">
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#0B1C32] text-[#9EB2CC] font-mono text-[10px] uppercase border-b border-[#1B3A5C] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Tag</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Phase / Volts</th>
                      <th className="py-2.5 px-3">Power</th>
                      <th className="py-2.5 px-3">Breaker</th>
                      <th className="py-2.5 px-3">Cable Spec</th>
                      <th className="py-2.5 px-3">Length</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1B3A5C] font-mono text-[11px]">
                    {selectedTemplate.circuits.map((c, idx) => (
                      <tr key={idx} className="hover:bg-[#10243D]/60 transition-colors">
                        <td className="py-2 px-3 font-bold text-[#18D8F2]">{c.tag}</td>
                        <td className="py-2 px-3 text-[#F4F8FF] font-sans font-semibold">{c.name}</td>
                        <td className="py-2 px-3 text-[#9EB2CC]">
                          <span className={c.phase === '3P' ? 'text-[#00D6A0] font-bold' : ''}>
                            {c.phase}
                          </span> ({c.supplyVoltage}V)
                        </td>
                        <td className="py-2 px-3 text-[#F4F8FF] font-bold">{c.powerWatts} W</td>
                        <td className="py-2 px-3 text-[#FF9A24]">{c.breakerRatingA}A (C)</td>
                        <td className="py-2 px-3 text-[#9EB2CC]">{c.cableType}</td>
                        <td className="py-2 px-3 text-[#9EB2CC]">{c.cableLengthMeters}m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Enclosure Recommendation */}
            {selectedTemplate.enclosureSuggestion && (
              <div className="p-3 bg-[#0B1C32] rounded-xl border border-[#1B3A5C] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#FF9A24]" />
                  <div>
                    <span className="font-bold text-[#F4F8FF]">Recommended Enclosure: </span>
                    <span className="text-[#9EB2CC] font-mono">{selectedTemplate.enclosureSuggestion.model}</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-[#00D6A0]">
                  {selectedTemplate.enclosureSuggestion.totalModules} DIN Modules ({selectedTemplate.enclosureSuggestion.ipRating})
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Apply Preset Confirmation Modal */}
      {applyTargetTemplate && (
        <Modal
          isOpen={!!applyTargetTemplate}
          onClose={() => setApplyTargetTemplate(null)}
          title={`Apply Preset — ${applyTargetTemplate.name}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#9EB2CC] leading-relaxed">
              How would you like to apply the <strong className="text-[#F4F8FF]">{applyTargetTemplate.circuits.length} circuits</strong> from <strong className="text-[#18D8F2]">{applyTargetTemplate.name}</strong> to the active project ({activeProject.name})?
            </p>

            <div className="space-y-2.5">
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  applyMode === 'replace'
                    ? 'bg-[#10243D] border-[#147DFF] ring-2 ring-[#147DFF]/20'
                    : 'bg-[#061426] border-[#1B3A5C] hover:border-[#147DFF]/40'
                }`}
              >
                <input
                  type="radio"
                  name="applyMode"
                  value="replace"
                  checked={applyMode === 'replace'}
                  onChange={() => setApplyMode('replace')}
                  className="mt-0.5 accent-[#147DFF]"
                />
                <div>
                  <div className="text-xs font-bold text-[#F4F8FF]">Replace Current Circuits</div>
                  <div className="text-[11px] text-[#9EB2CC] mt-0.5">
                    Overwrites the active project's CAD circuits with this template. Recommended when initializing a fresh design.
                  </div>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  applyMode === 'append'
                    ? 'bg-[#10243D] border-[#147DFF] ring-2 ring-[#147DFF]/20'
                    : 'bg-[#061426] border-[#1B3A5C] hover:border-[#147DFF]/40'
                }`}
              >
                <input
                  type="radio"
                  name="applyMode"
                  value="append"
                  checked={applyMode === 'append'}
                  onChange={() => setApplyMode('append')}
                  className="mt-0.5 accent-[#147DFF]"
                />
                <div>
                  <div className="text-xs font-bold text-[#F4F8FF]">Append to Existing Circuits</div>
                  <div className="text-[11px] text-[#9EB2CC] mt-0.5">
                    Adds all template circuits as new branch feeds (e.g. QF{activeProject.cadCircuits.length + 1}+) without deleting current circuits.
                  </div>
                </div>
              </label>
            </div>

            <div className="p-3 bg-[#FF9A24]/10 border border-[#FF9A24]/30 rounded-xl flex items-start gap-2.5 text-[11px] text-[#FF9A24]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Applying will automatically trigger power flow calculations and update panel module configurations and BOM estimations.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setApplyTargetTemplate(null)}
                className="px-3 py-1.5 bg-[#061426] hover:bg-[#0B1C32] border border-[#1B3A5C] text-[#9EB2CC] rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                className="px-4 py-1.5 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] text-[#030B18] rounded-lg text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm & Apply
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Save Current as Template Modal */}
      {isSaveModalOpen && (
        <Modal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          title="Save Active Configuration as Preset"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveCurrent} className="space-y-4">
            <p className="text-xs text-[#9EB2CC]">
              Capture the current circuit configuration (<strong className="text-[#F4F8FF]">{activeProject.cadCircuits.length} circuits</strong>) as a reusable template saved to your browser library.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#F4F8FF] mb-1">Preset Name *</label>
              <input
                type="text"
                required
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g. Standard 3-Phase Luxury Villa"
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:outline-none focus:border-[#147DFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F4F8FF] mb-1">Category</label>
              <select
                value={presetCategory}
                onChange={(e) => setPresetCategory(e.target.value as TemplateCategory)}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:outline-none focus:border-[#147DFF]"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial & EV</option>
                <option value="specialty">Specialty & IT</option>
                <option value="custom">Custom Saved</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F4F8FF] mb-1">Tagline</label>
              <input
                type="text"
                value={presetTagline}
                onChange={(e) => setPresetTagline(e.target.value)}
                placeholder="e.g. Segregated lighting & heavy appliances"
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:outline-none focus:border-[#147DFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F4F8FF] mb-1">Description</label>
              <textarea
                rows={2}
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="Notes on regional standard, voltage drop limits, and special applications..."
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:outline-none focus:border-[#147DFF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3 py-1.5 bg-[#061426] hover:bg-[#0B1C32] border border-[#1B3A5C] text-[#9EB2CC] rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-lg text-xs font-bold shadow-md shadow-[#147DFF]/25 cursor-pointer"
              >
                Save to Library
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Import JSON Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Import Circuit Presets from JSON"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <p className="text-xs text-[#9EB2CC]">
              Paste JSON containing circuit configurations or an exported template library to import presets into your workspace.
            </p>

            <textarea
              rows={8}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`[
  {
    "name": "Custom Workshop",
    "category": "industrial",
    "standard": "IEC 60364",
    "circuits": [
      { "tag": "QF1", "name": "Lighting", "powerWatts": 800, "phase": "L1", "supplyVoltage": 230, "cableType": "VVGng-LS 3x1.5", "crossSectionMm2": 1.5, "breakerRatingA": 10 }
    ]
  }
]`}
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs font-mono text-[#F4F8FF] focus:outline-none focus:border-[#18D8F2]"
            />

            {importFeedback && (
              <div className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 border ${
                importFeedback.success 
                  ? 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30' 
                  : 'bg-[#FF5263]/15 text-[#FF5263] border-[#FF5263]/30'
              }`}>
                {importFeedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{importFeedback.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3 py-1.5 bg-[#061426] hover:bg-[#0B1C32] border border-[#1B3A5C] text-[#9EB2CC] rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-4 py-1.5 bg-[#18D8F2] hover:bg-[#18D8F2]/90 text-[#030B18] rounded-lg text-xs font-bold shadow-md cursor-pointer"
              >
                Validate & Import
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
