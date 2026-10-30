import React, { useState, useRef } from 'react';
import { 
  FolderKanban, 
  Plus, 
  MapPin, 
  Calendar, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck,
  Zap,
  Sparkles,
  Download,
  Upload,
  Copy,
  Trash2,
  FileText,
  Layers,
  Edit2,
  AlertTriangle,
  Check
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { Modal } from '../common/Modal';
import { downloadItemizedPdfReport } from '../../lib/pdf-report';

export const ProjectsView: React.FC = () => {
  const { 
    projects, 
    activeProject, 
    setActiveProjectId, 
    createNewProject,
    duplicateProject,
    deleteProject,
    exportProjectJson,
    importProjectJson,
    setActiveModule,
    formatCurrency,
    openAiModal,
    openTemplatesModal,
    currency,
    updateActiveProject
  } = useProject();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [client, setClient] = useState('');
  const [standard, setStandard] = useState<'IEC 60364' | 'GOST 31996' | 'NEC NFPA 70'>('IEC 60364');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{ message: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createNewProject(name, location);
    setName('');
    setLocation('');
    setClient('');
    setIsModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importProjectJson(content);
      if (res.success) {
        setImportStatus({ message: "Loyiha muvaffaqiyatli import qilindi!" });
      } else {
        setImportStatus({ message: res.error || "Faylni import qilishda xatolik yuz berdi", isError: true });
      }
      setTimeout(() => setImportStatus(null), 4000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Portfolio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#061426] border border-[#1B3A5C] rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#147DFF]" />
            <h1 className="text-xl font-extrabold text-[#F4F8FF] tracking-tight">Engineering Projects Portfolio</h1>
          </div>
          <p className="text-xs text-[#9EB2CC] mt-1">
            Manage, duplicate, export, and restore electrical installation projects with local offline persistence and PDF certification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Import JSON Button */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".json,application/json" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Import Project JSON backup"
          >
            <Upload className="w-4 h-4 text-[#00D6A0]" />
            <span>Restore JSON</span>
          </button>

          <button
            onClick={openTemplatesModal}
            className="px-3.5 py-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Browse pre-engineered circuit presets and project templates"
          >
            <Layers className="w-4 h-4 text-[#18D8F2]" />
            <span>Templates</span>
          </button>

          <button
            onClick={() => openAiModal('generate')}
            className="px-3.5 py-2 bg-gradient-to-r from-[#147DFF]/20 to-[#18D8F2]/20 hover:from-[#147DFF]/30 hover:to-[#18D8F2]/30 text-[#18D8F2] border border-[#18D8F2]/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#18D8F2]" />
            <span>AI Turnkey Generator</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#147DFF]/25 transition-all cursor-pointer hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Import Feedback Banner */}
      {importStatus && (
        <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono animate-fade-in ${
          importStatus.isError
            ? 'bg-[#FF5263]/10 border-[#FF5263]/30 text-[#FF5263]'
            : 'bg-[#00D6A0]/10 border-[#00D6A0]/30 text-[#00D6A0]'
        }`}>
          <div className="flex items-center gap-2">
            {importStatus.isError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{importStatus.message}</span>
          </div>
          <button onClick={() => setImportStatus(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map(p => {
          const isActive = p.id === activeProject.id;
          const totalWatts = p.cadCircuits.reduce((a, b) => a + b.powerWatts, 0);
          const totalCableM = p.cableRoutes.reduce((a, b) => a + (b.lengthMeters || 0), 0);

          return (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                isActive 
                  ? 'bg-[#0B1C32] border-[#147DFF] ring-2 ring-[#147DFF]/30 shadow-2xl scale-[1.01]' 
                  : 'bg-[#081729] border-[#1B3A5C]/80 hover:border-[#147DFF]/40'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="text-[10px] font-mono text-[#18D8F2] bg-[#061426] px-2 py-0.5 rounded border border-[#1B3A5C]">
                      {p.code}
                    </span>
                    <h3 className="text-base font-bold text-[#F4F8FF] mt-1.5 leading-snug">{p.name}</h3>
                  </div>

                  {isActive && (
                    <span className="px-2.5 py-0.5 bg-[#00D6A0]/15 text-[#00D6A0] text-[10px] font-mono font-bold rounded-full border border-[#00D6A0]/30 flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A0]" />
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-[#9EB2CC] mb-3">
                  <MapPin className="w-3.5 h-3.5 text-[#18D8F2] shrink-0" />
                  <span className="truncate">{p.location}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#1B3A5C]/60 text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-[#9EB2CC]">Design Load</div>
                    <div className="font-bold text-[#F4F8FF]">{(totalWatts / 1000).toFixed(1)} kW</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9EB2CC]">Circuits & Cabling</div>
                    <div className="font-bold text-[#18D8F2]">{p.cadCircuits.length} ccts ({totalCableM.toFixed(0)}m)</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#9EB2CC]">Standard</div>
                    <div className="font-bold text-[#00D6A0] truncate">{p.standard}</div>
                  </div>
                </div>

                <div className="pt-2.5 flex items-center justify-between text-[11px] text-[#9EB2CC] font-mono">
                  <span>Client: {p.client || 'Private'}</span>
                  <span>PE: {p.leadEngineer}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="pt-3 border-t border-[#1B3A5C]/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {/* Export JSON */}
                  <button
                    onClick={() => exportProjectJson(p.id)}
                    className="p-1.5 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#9EB2CC] hover:text-[#18D8F2] border border-[#1B3A5C] transition-colors cursor-pointer"
                    title="Export Project Data (JSON)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {/* Certified PDF */}
                  <button
                    onClick={() => downloadItemizedPdfReport(p, currency)}
                    className="p-1.5 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#9EB2CC] hover:text-[#00D6A0] border border-[#1B3A5C] transition-colors cursor-pointer"
                    title="Generate Certified Engineering PDF Report"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>

                  {/* Duplicate */}
                  <button
                    onClick={() => duplicateProject(p.id)}
                    className="p-1.5 rounded-lg bg-[#061426] hover:bg-[#10243D] text-[#9EB2CC] hover:text-[#FF9A24] border border-[#1B3A5C] transition-colors cursor-pointer"
                    title="Duplicate Project"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete with confirmation */}
                  {deleteConfirmId === p.id ? (
                    <div className="flex items-center gap-1 bg-[#FF5263]/15 border border-[#FF5263]/30 px-1.5 py-0.5 rounded-lg">
                      <span className="text-[10px] text-[#FF5263] font-bold">O'chirilsinmi?</span>
                      <button
                        onClick={() => {
                          deleteProject(p.id);
                          setDeleteConfirmId(null);
                        }}
                        className="px-1.5 py-0.5 bg-[#FF5263] text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Ha
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-1 py-0.5 text-[#9EB2CC] hover:text-white text-[10px] cursor-pointer"
                      >
                        Yo'q
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="p-1.5 rounded-lg bg-[#061426] hover:bg-[#FF5263]/20 text-[#9EB2CC] hover:text-[#FF5263] border border-[#1B3A5C] transition-colors cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && (
                    <button
                      onClick={() => setActiveProjectId(p.id)}
                      className="px-3 py-1.5 bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] text-xs font-semibold rounded-xl border border-[#1B3A5C] transition-colors cursor-pointer"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveProjectId(p.id);
                      setActiveModule('dashboard');
                    }}
                    className="px-3.5 py-1.5 bg-[#147DFF] hover:bg-[#18D8F2] text-[#030B18] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-102"
                  >
                    <span>Open Project</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Initialize New Project"
        subtitle="Set project code, site location, and initialize unified engineering databases."
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Project Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Samarkand High-Tech Campus"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Physical Location</label>
              <input
                type="text"
                placeholder="e.g. Samarkand, Uzbekistan"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Client Organization</label>
              <input
                type="text"
                placeholder="e.g. Samarkand Tech Park LLC"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1">Applicable Engineering Standard</label>
            <select
              value={standard}
              onChange={(e) => setStandard(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
            >
              <option value="IEC 60364">IEC 60364 — Low-Voltage Electrical Installations</option>
              <option value="GOST 31996">GOST 31996 / PUE 7.1 — Regional Standards</option>
              <option value="NEC NFPA 70">NEC NFPA 70 — National Electrical Code</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#1B3A5C]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 bg-[#061426] hover:bg-[#10243D] text-xs font-medium text-[#9EB2CC] rounded-xl border border-[#1B3A5C] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#147DFF] hover:bg-[#18D8F2] text-[#030B18] text-xs font-bold rounded-xl shadow cursor-pointer transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
