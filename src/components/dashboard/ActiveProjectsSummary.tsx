import React, { useState, useMemo } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  User, 
  Cpu, 
  Server, 
  Box, 
  Download, 
  ArrowRight, 
  Search, 
  Check, 
  Sparkles, 
  SlidersHorizontal,
  Layers,
  Wrench,
  Building,
  Factory,
  Home,
  CheckCircle
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Project } from '../../types';
import { Modal } from '../common/Modal';

export const ActiveProjectsSummary: React.FC = () => {
  const { 
    projects, 
    activeProject, 
    setActiveProjectId, 
    createNewProject, 
    setActiveModule, 
    downloadProjectPdf,
    openTemplatesModal,
    openAiModal
  } = useProject();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | '3phase' | '1phase' | 'verified'>('all');

  // New Project Creation Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('Tashkent, Uzbekistan');
  const [newProjectClient, setNewProjectClient] = useState('Private Client');
  const [newProjectEngineer, setNewProjectEngineer] = useState('Olimjon Khashimov, PE');
  const [newProjectStandard, setNewProjectStandard] = useState<'IEC 60364' | 'GOST 31996' | 'NEC NFPA 70'>('IEC 60364');
  const [newProjectArchetype, setNewProjectArchetype] = useState<'residential' | 'commercial' | 'industrial' | 'blank'>('residential');
  const [createdSuccessId, setCreatedSuccessId] = useState<string | null>(null);

  // Compute helper to get total connected load of a given project
  const getProjectLoadKw = (p: Project): number => {
    return (p.cadCircuits || []).reduce((sum, c) => sum + (c.powerWatts || 0), 0) / 1000;
  };

  // Compute helper to inspect project status
  const getProjectStatus = (p: Project): {
    status: 'compliant' | 'in_progress' | 'review' | 'draft';
    label: string;
    dotColor: string;
    description: string;
  } => {
    const circuits = p.cadCircuits || [];
    if (circuits.length === 0) {
      return {
        status: 'draft',
        label: 'Drafting & Conception',
        dotColor: 'bg-[#9EB2CC]',
        description: 'Initial project setup without circuits'
      };
    }

    // Check if there are any circuit overload warnings
    const hasViolations = circuits.some(c => {
      const calculatedCurrent = c.powerWatts / (c.supplyVoltage * (c.powerFactor || 0.95));
      return calculatedCurrent > (c.breakerRatingA || 16);
    });

    if (hasViolations) {
      return {
        status: 'review',
        label: 'Engineering Review Required',
        dotColor: 'bg-[#FF9A24]',
        description: 'Overload or high voltage drop detected'
      };
    }

    if (p.lastAudit?.safetyScore && p.lastAudit.safetyScore >= 85) {
      return {
        status: 'compliant',
        label: 'Verified & Certified Compliant',
        dotColor: 'bg-[#00D6A0]',
        description: `Safety rating ${p.lastAudit.safetyScore}/100 passed`
      };
    }

    if (circuits.length >= 2) {
      return {
        status: 'compliant',
        label: 'Active & Verified (IEC 60364)',
        dotColor: 'bg-[#00D6A0]',
        description: 'Design complies with regional voltage limits'
      };
    }

    return {
      status: 'in_progress',
      label: 'Engineering in Progress',
      dotColor: 'bg-[#18D8F2]',
      description: 'Active design and load routing'
    };
  };

  // Portfolio Executive Metrics
  const portfolioMetrics = useMemo(() => {
    const totalProjects = projects.length;
    const cumulativeLoadKw = projects.reduce((acc, p) => acc + getProjectLoadKw(p), 0);
    const totalCircuits = projects.reduce((acc, p) => acc + (p.cadCircuits?.length || 0), 0);
    const totalDevices = projects.reduce((acc, p) => acc + (p.panelComponents?.length || 0), 0);
    
    // Count status breakdown
    let compliantCount = 0;
    let inProgressCount = 0;
    let reviewCount = 0;

    projects.forEach(p => {
      const st = getProjectStatus(p).status;
      if (st === 'compliant') compliantCount++;
      else if (st === 'in_progress') inProgressCount++;
      else reviewCount++;
    });

    return {
      totalProjects,
      cumulativeLoadKw: Number(cumulativeLoadKw.toFixed(1)),
      totalCircuits,
      totalDevices,
      compliantCount,
      inProgressCount,
      reviewCount,
      complianceRate: totalProjects > 0 ? Math.round((compliantCount / totalProjects) * 100) : 100
    };
  }, [projects]);

  // Filtered projects list
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Search query filter
      const matchesSearch = 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.standard.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter category
      if (filterType === '3phase') {
        return (p.cadCircuits || []).some(c => c.phase === '3P' || c.supplyVoltage === 400);
      }
      if (filterType === '1phase') {
        return (p.cadCircuits || []).every(c => c.phase !== '3P' && c.supplyVoltage === 230);
      }
      if (filterType === 'verified') {
        return getProjectStatus(p).status === 'compliant';
      }

      return true;
    });
  }, [projects, searchQuery, filterType]);

  // Handle Project Creation Submission
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    createNewProject(newProjectName.trim(), newProjectLocation.trim(), {
      client: newProjectClient.trim() || 'Private Client',
      leadEngineer: newProjectEngineer.trim() || 'Olimjon Khashimov, PE',
      standard: newProjectStandard,
      archetype: newProjectArchetype,
      initialVoltage: newProjectArchetype === 'commercial' || newProjectArchetype === 'industrial' ? 400 : 230
    });

    setCreatedSuccessId('created');
    setTimeout(() => {
      setCreatedSuccessId(null);
      setIsCreateModalOpen(false);
      setNewProjectName('');
    }, 1200);
  };

  // Quick Action Switch Workspace & Navigate to specific tool
  const handleSwitchAndNavigate = (projectId: string, toolId?: string) => {
    setActiveProjectId(projectId);
    if (toolId) {
      window.location.hash = `#/tools/${toolId}`;
      setActiveModule(toolId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Executive Summary Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#061426] border border-[#1B3A5C] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9EB2CC] text-xs font-mono">
            <span>ACTIVE PROJECTS</span>
            <FolderKanban className="w-4 h-4 text-[#147DFF]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#F4F8FF] font-mono tabular-nums">
              {portfolioMetrics.totalProjects}
            </div>
            <div className="text-[11px] text-[#9EB2CC] mt-0.5 flex items-center gap-1.5 font-mono">
              <span className="text-[#00D6A0] font-semibold">{portfolioMetrics.compliantCount} Verified</span>
              <span>·</span>
              <span>{portfolioMetrics.inProgressCount} In Progress</span>
            </div>
          </div>
        </div>

        <div className="bg-[#061426] border border-[#1B3A5C] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9EB2CC] text-xs font-mono">
            <span>PORTFOLIO LOAD</span>
            <Zap className="w-4 h-4 text-[#18D8F2]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#18D8F2] font-mono tabular-nums">
              {portfolioMetrics.cumulativeLoadKw} <span className="text-sm font-normal text-[#9EB2CC]">kW</span>
            </div>
            <div className="text-[11px] text-[#9EB2CC] mt-0.5 font-mono">
              Cumulative 3-Phase & Single-Phase
            </div>
          </div>
        </div>

        <div className="bg-[#061426] border border-[#1B3A5C] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9EB2CC] text-xs font-mono">
            <span>BRANCH CIRCUITS</span>
            <Cpu className="w-4 h-4 text-[#8B5CFF]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#F4F8FF] font-mono tabular-nums">
              {portfolioMetrics.totalCircuits} <span className="text-sm font-normal text-[#9EB2CC]">Runs</span>
            </div>
            <div className="text-[11px] text-[#9EB2CC] mt-0.5 font-mono">
              {portfolioMetrics.totalDevices} DIN Components Installed
            </div>
          </div>
        </div>

        <div className="bg-[#061426] border border-[#1B3A5C] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#9EB2CC] text-xs font-mono">
            <span>COMPLIANCE INDEX</span>
            <ShieldCheck className="w-4 h-4 text-[#00D6A0]" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-extrabold text-[#00D6A0] font-mono tabular-nums">
              {portfolioMetrics.complianceRate}%
            </div>
            <div className="text-[11px] text-[#9EB2CC] mt-0.5 font-mono">
              IEC 60364 & GOST 30331 Pass Rate
            </div>
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search, Filters & Quick Action Buttons */}
      <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-4 shadow-lg flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Section Header & Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          <div>
            <h2 className="text-base font-bold text-[#F4F8FF] tracking-tight flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#147DFF]" />
              <span>Active Electrical Projects</span>
            </h2>
            <p className="text-xs text-[#9EB2CC]">
              Deterministic engineering workspaces with live sync across CAD, 3D Panel, and BOM.
            </p>
          </div>

          {/* Search Field */}
          <div className="relative flex-1 max-w-xs sm:ml-auto lg:ml-4">
            <Search className="w-3.5 h-3.5 text-[#9EB2CC] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, clients, codes..."
              className="w-full bg-[#0B1C32] border border-[#1B3A5C] focus:border-[#18D8F2] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#F4F8FF] placeholder-[#9EB2CC]/60 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Right: Filter Buttons & New Project Action CTAs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[#0B1C32] p-1 rounded-xl border border-[#1B3A5C] text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-[#147DFF] text-white shadow-sm'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              All ({projects.length})
            </button>
            <button
              onClick={() => setFilterType('3phase')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterType === '3phase'
                  ? 'bg-[#147DFF] text-white shadow-sm'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              3-Phase
            </button>
            <button
              onClick={() => setFilterType('verified')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterType === 'verified'
                  ? 'bg-[#00D6A0]/20 text-[#00D6A0] border border-[#00D6A0]/40 font-bold'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              Verified
            </button>
          </div>

          {/* Quick Action: Templates Preset */}
          <button
            onClick={openTemplatesModal}
            className="px-3 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Browse standard electrical templates"
          >
            <Layers className="w-3.5 h-3.5 text-[#8B5CFF]" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          {/* Primary Quick Action Button: New Electrical Project */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-1.5 bg-gradient-to-r from-[#EC4899] to-[#D92680] hover:from-[#F43F5E] hover:to-[#EC4899] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#EC4899]/25 hover:shadow-[#EC4899]/40 transition-all cursor-pointer transform hover:translate-y-[-1px]"
            title="Create a new electrical engineering project"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Active Electrical Projects Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const isActive = project.id === activeProject.id;
          const statusInfo = getProjectStatus(project);
          const loadKw = getProjectLoadKw(project);
          const circuitsCount = project.cadCircuits?.length || 0;
          const panelComponentsCount = project.panelComponents?.length || 0;
          const isThreePhase = (project.cadCircuits || []).some(c => c.phase === '3P' || c.supplyVoltage === 400);

          return (
            <div
              key={project.id}
              className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-b from-[#091E38] to-[#061426] border-[#18D8F2] shadow-xl shadow-[#18D8F2]/10 ring-1 ring-[#18D8F2]/30'
                  : 'bg-[#061426] hover:bg-[#0B1C32]/70 border-[#1B3A5C] hover:border-[#147DFF]/50'
              }`}
            >
              {/* Card Header & Status Indicator */}
              <div className="p-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  {/* Status Indicator (zero-pill discipline: unboxed clean typography with indicator dot) */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.dotColor} ${isActive ? 'animate-pulse' : ''}`} />
                    <span className="font-semibold text-[#F4F8FF] text-[11px] tracking-wide">
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Active Workspace Marker */}
                  {isActive ? (
                    <span className="text-[10px] font-mono text-[#18D8F2] flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#18D8F2]" />
                      ACTIVE WORKSPACE
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-[#9EB2CC]">
                      {project.code}
                    </span>
                  )}
                </div>

                {/* Project Title & Client Details */}
                <h3 className="text-base font-bold text-[#F4F8FF] tracking-tight leading-snug line-clamp-1">
                  {project.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-[#9EB2CC] mt-1 truncate">
                  <User className="w-3.5 h-3.5 text-[#147DFF] shrink-0" />
                  <span className="truncate">{project.client}</span>
                  <span>·</span>
                  <MapPin className="w-3.5 h-3.5 text-[#00D6A0] shrink-0" />
                  <span className="truncate">{project.location.split(',')[0]}</span>
                </div>
              </div>

              {/* Technical Specifications Matrix */}
              <div className="px-5 py-3 bg-[#030B18]/60 border-y border-[#1B3A5C]/60 grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-[#9EB2CC] uppercase">Connected Load</div>
                  <div className="text-sm font-bold text-[#18D8F2] tabular-nums">
                    {loadKw.toFixed(1)} <span className="text-xs text-[#9EB2CC]">kW</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#9EB2CC] uppercase">System Voltage</div>
                  <div className="text-xs font-bold text-[#F4F8FF]">
                    {isThreePhase ? '400V 3P+N' : '230V 1P'}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#9EB2CC] uppercase">Circuits / Devices</div>
                  <div className="text-xs font-medium text-[#F4F8FF]">
                    {circuitsCount} Groups · {panelComponentsCount} DIN
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-[#9EB2CC] uppercase">Engineering Standard</div>
                  <div className="text-xs font-bold text-[#00D6A0]">
                    {project.standard}
                  </div>
                </div>
              </div>

              {/* Card Footer: Interactive Quick Action Buttons */}
              <div className="p-4 pt-3 bg-[#061426] flex items-center justify-between gap-2">
                {/* Switch Active Project Button */}
                {!isActive ? (
                  <button
                    onClick={() => setActiveProjectId(project.id)}
                    className="flex-1 py-1.5 px-3 bg-[#0B1C32] hover:bg-[#147DFF] text-[#F4F8FF] hover:text-white border border-[#1B3A5C] hover:border-[#147DFF] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Switch active workspace to this project"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Select Project</span>
                  </button>
                ) : (
                  <div className="flex-1 py-1.5 px-3 bg-[#18D8F2]/10 border border-[#18D8F2]/30 text-[#18D8F2] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#18D8F2]" />
                    <span>Selected</span>
                  </div>
                )}

                {/* Direct Workspace Launcher Shortcuts */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSwitchAndNavigate(project.id, 'cad')}
                    className="p-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#8B5CFF] hover:text-white rounded-xl transition-colors cursor-pointer"
                    title="Open Single Line Diagram CAD"
                  >
                    <Cpu className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleSwitchAndNavigate(project.id, 'panel')}
                    className="p-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#FF9A24] hover:text-white rounded-xl transition-colors cursor-pointer"
                    title="Open 3D DIN Enclosure Panel"
                  >
                    <Server className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleSwitchAndNavigate(project.id, 'scanner')}
                    className="p-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#18D8F2] hover:text-white rounded-xl transition-colors cursor-pointer"
                    title="Open 3D Room Workspace"
                  >
                    <Box className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveProjectId(project.id);
                      downloadProjectPdf();
                    }}
                    className="p-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#00D6A0] hover:text-white rounded-xl transition-colors cursor-pointer"
                    title="Export certified engineering PDF report"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clean Zero-Results State if Search Yields Nothing */}
      {filteredProjects.length === 0 && (
        <div className="p-8 text-center bg-[#061426] border border-[#1B3A5C] rounded-2xl space-y-3">
          <FolderKanban className="w-8 h-8 text-[#9EB2CC] mx-auto opacity-50" />
          <h3 className="text-sm font-bold text-[#F4F8FF]">No matching electrical projects found</h3>
          <p className="text-xs text-[#9EB2CC] max-w-sm mx-auto">
            Try adjusting your search query or clear the filter to view all projects in the engineering portfolio.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterType('all');
            }}
            className="px-3.5 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-xl text-xs font-semibold cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* New Project Creation Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Electrical Engineering Project"
        subtitle="Initialize deterministic CAD single-line, 3D panel enclosure, and room spatial model."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] uppercase tracking-wider mb-1.5">
              Project Name <span className="text-[#EC4899]">*</span>
            </label>
            <input
              type="text"
              required
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="e.g. Samarkand Silk Road Hub - Main Electrical Distribution"
              className="w-full bg-[#061426] border border-[#1B3A5C] focus:border-[#18D8F2] rounded-xl px-3.5 py-2 text-sm text-[#F4F8FF] placeholder-[#9EB2CC]/50 outline-none transition-colors"
            />
          </div>

          {/* Location & Client Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] uppercase tracking-wider mb-1.5">
                Site Location
              </label>
              <input
                type="text"
                value={newProjectLocation}
                onChange={(e) => setNewProjectLocation(e.target.value)}
                placeholder="Tashkent, Uzbekistan"
                className="w-full bg-[#061426] border border-[#1B3A5C] focus:border-[#18D8F2] rounded-xl px-3.5 py-2 text-xs text-[#F4F8FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] uppercase tracking-wider mb-1.5">
                Client / Developer
              </label>
              <input
                type="text"
                value={newProjectClient}
                onChange={(e) => setNewProjectClient(e.target.value)}
                placeholder="Mirabad Residences / Private Client"
                className="w-full bg-[#061426] border border-[#1B3A5C] focus:border-[#18D8F2] rounded-xl px-3.5 py-2 text-xs text-[#F4F8FF] outline-none"
              />
            </div>
          </div>

          {/* Lead Engineer & Standard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] uppercase tracking-wider mb-1.5">
                Lead Electrical Engineer
              </label>
              <input
                type="text"
                value={newProjectEngineer}
                onChange={(e) => setNewProjectEngineer(e.target.value)}
                placeholder="Olimjon Khashimov, PE"
                className="w-full bg-[#061426] border border-[#1B3A5C] focus:border-[#18D8F2] rounded-xl px-3.5 py-2 text-xs text-[#F4F8FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] uppercase tracking-wider mb-1.5">
                Design Standard
              </label>
              <select
                value={newProjectStandard}
                onChange={(e) => setNewProjectStandard(e.target.value as any)}
                className="w-full bg-[#061426] border border-[#1B3A5C] focus:border-[#18D8F2] rounded-xl px-3.5 py-2 text-xs text-[#F4F8FF] outline-none"
              >
                <option value="IEC 60364">IEC 60364 (International / Europe)</option>
                <option value="GOST 31996">GOST 31996 / PUE 7.1 (Uzbekistan / Regional)</option>
                <option value="NEC NFPA 70">NEC NFPA 70 (North America)</option>
              </select>
            </div>
          </div>

          {/* Starter Archetype Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] uppercase tracking-wider mb-2">
              Select Starter Archetype & Pre-Engineered Circuit Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setNewProjectArchetype('residential')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                  newProjectArchetype === 'residential'
                    ? 'bg-[#147DFF]/20 border-[#147DFF] text-white'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] hover:text-white hover:border-[#1B3A5C]/90'
                }`}
              >
                <Home className="w-5 h-5 text-[#18D8F2] mb-1.5" />
                <div className="font-bold text-xs text-[#F4F8FF]">Residential</div>
                <div className="text-[10px] text-[#9EB2CC] mt-0.5">3P 400V · Sockets, Lights, HVAC</div>
              </button>

              <button
                type="button"
                onClick={() => setNewProjectArchetype('commercial')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                  newProjectArchetype === 'commercial'
                    ? 'bg-[#147DFF]/20 border-[#147DFF] text-white'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] hover:text-white hover:border-[#1B3A5C]/90'
                }`}
              >
                <Building className="w-5 h-5 text-[#8B5CFF] mb-1.5" />
                <div className="font-bold text-xs text-[#F4F8FF]">Commercial Hub</div>
                <div className="text-[10px] text-[#9EB2CC] mt-0.5">96M Board · Server racks, CRAC</div>
              </button>

              <button
                type="button"
                onClick={() => setNewProjectArchetype('industrial')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                  newProjectArchetype === 'industrial'
                    ? 'bg-[#147DFF]/20 border-[#147DFF] text-white'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] hover:text-white hover:border-[#1B3A5C]/90'
                }`}
              >
                <Factory className="w-5 h-5 text-[#FF9A24] mb-1.5" />
                <div className="font-bold text-xs text-[#F4F8FF]">Industrial Floor</div>
                <div className="text-[10px] text-[#9EB2CC] mt-0.5">Motor Feeds · 120M IP54 panel</div>
              </button>

              <button
                type="button"
                onClick={() => setNewProjectArchetype('blank')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-colors cursor-pointer ${
                  newProjectArchetype === 'blank'
                    ? 'bg-[#147DFF]/20 border-[#147DFF] text-white'
                    : 'bg-[#061426] border-[#1B3A5C] text-[#9EB2CC] hover:text-white hover:border-[#1B3A5C]/90'
                }`}
              >
                <Wrench className="w-5 h-5 text-[#00D6A0] mb-1.5" />
                <div className="font-bold text-xs text-[#F4F8FF]">Blank Sheet</div>
                <div className="text-[10px] text-[#9EB2CC] mt-0.5">Clean workspace for custom CAD</div>
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1B3A5C]/80">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 bg-[#061426] hover:bg-[#10243D] border border-[#1B3A5C] text-[#9EB2CC] hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={createdSuccessId === 'created'}
              className="px-5 py-2 bg-gradient-to-r from-[#EC4899] to-[#D92680] hover:from-[#F43F5E] hover:to-[#EC4899] text-white rounded-xl text-xs font-bold shadow-lg shadow-[#EC4899]/25 flex items-center gap-2 transition-all cursor-pointer"
            >
              {createdSuccessId === 'created' ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Project Created!</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Create & Launch Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
