import React, { useState, useRef, useEffect } from 'react';
import { 
  FolderKanban, 
  ChevronDown, 
  Check, 
  Plus, 
  MapPin, 
  Zap, 
  Search,
  Sparkles,
  Calendar,
  Layers
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';

interface ProjectSelectorProps {
  onOpenNewProjectModal?: () => void;
  className?: string;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({ 
  onOpenNewProjectModal,
  className = '' 
}) => {
  const { 
    projects, 
    activeProject, 
    setActiveProjectId, 
    t,
    addActivityLog 
  } = useProject();

  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(filterQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleSelectProject = (projectId: string, projectName: string) => {
    if (projectId === activeProject.id) {
      setIsOpen(false);
      return;
    }
    setActiveProjectId(projectId);
    setIsOpen(false);
    addActivityLog({
      action: 'Switched Project',
      details: `Active workspace switched to "${projectName}"`,
      category: 'project',
      status: 'completed',
      user: activeProject.leadEngineer || 'Olimjon K.'
    });
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] active:bg-[#081525] border border-[#1B3A5C] hover:border-[#147DFF]/50 rounded-lg text-xs font-medium text-[#F4F8FF] transition-all duration-150 shadow-sm group focus:outline-none focus:ring-1 focus:ring-[#147DFF]"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="w-2 h-2 rounded-full bg-[#00D6A0] animate-pulse shadow-sm shadow-[#00D6A0]/50" />
        <span className="truncate max-w-[180px] font-semibold text-[#F4F8FF] group-hover:text-[#18D8F2] transition-colors">
          {activeProject.name}
        </span>
        <span className="text-[10px] text-[#9EB2CC] font-mono px-1.5 py-0.5 bg-[#061426] rounded border border-[#1B3A5C]">
          {activeProject.code}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#9EB2CC] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#18D8F2]' : 'group-hover:text-[#F4F8FF]'}`} />
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 mt-2 w-88 bg-[#0B1C32]/95 backdrop-blur-xl border border-[#1B3A5C] rounded-xl shadow-2xl p-2.5 z-50 animate-fade-in divide-y divide-[#1B3A5C]/60"
          style={{ width: '22rem' }}
          role="listbox"
        >
          {/* Header & Search */}
          <div className="pb-2 space-y-2">
            <div className="flex items-center justify-between px-1.5">
              <span className="text-[11px] font-bold text-[#9EB2CC] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-[#147DFF]" />
                Switch Project ({projects.length})
              </span>
              <span className="text-[10px] font-mono text-[#00D6A0] bg-[#00D6A0]/10 px-1.5 py-0.5 rounded border border-[#00D6A0]/20">
                Live State
              </span>
            </div>

            {/* Quick Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9EB2CC] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search projects or code..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] placeholder-[#9EB2CC]/50 focus:outline-none focus:border-[#147DFF] font-mono transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Project List */}
          <div className="py-2 max-h-64 overflow-y-auto space-y-1 custom-scrollbar">
            {filteredProjects.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#9EB2CC]">
                No matching projects found
              </div>
            ) : (
              filteredProjects.map(p => {
                const isSelected = p.id === activeProject.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProject(p.id, p.name)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs flex flex-col gap-1 transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#147DFF]/15 text-[#18D8F2] border border-[#147DFF]/40 shadow-sm'
                        : 'text-[#F4F8FF] hover:bg-[#10243D] border border-transparent hover:border-[#1B3A5C]'
                    }`}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold truncate text-[#F4F8FF]">{p.name}</span>
                        {isSelected && (
                          <span className="p-0.5 rounded bg-[#18D8F2]/20 text-[#18D8F2]">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#061426] text-[#9EB2CC] border border-[#1B3A5C] shrink-0">
                        {p.code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#9EB2CC]">
                      <span className="truncate flex items-center gap-1 max-w-[170px]">
                        <MapPin className="w-3 h-3 text-[#18D8F2] shrink-0" />
                        <span className="truncate">{p.location}</span>
                      </span>
                      <div className="flex items-center gap-2 font-mono shrink-0">
                        <span className="text-[#00D6A0]">{p.cadCircuits?.length || 0} ccts</span>
                        <span>·</span>
                        <span>{p.standard}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Create Project Action Footer */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onOpenNewProjectModal) {
                  onOpenNewProjectModal();
                }
              }}
              className="w-full py-2 px-3 bg-gradient-to-r from-[#147DFF] to-[#00D6A0] hover:brightness-110 active:brightness-95 text-[#F4F8FF] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#147DFF]/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
