import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Calculator,
  Calendar,
  Zap,
  Sparkles,
  AlertTriangle,
  CheckCheck
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { downloadItemizedPdfReport } from '../../lib/pdf-report';
import { ComplianceAuditor } from '../compliance/ComplianceAuditor';

export const ReportsView: React.FC = () => {
  const { 
    activeProject, 
    currency, 
    powerCalculations, 
    formatCurrency, 
    addActivityLog, 
    openAiModal 
  } = useProject();
  
  const [downloadedDoc, setDownloadedDoc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'reports' | 'compliance'>('reports');

  const totalWatts = activeProject.cadCircuits.reduce((a, b) => a + b.powerWatts, 0);
  const totalBOM = activeProject.materials.reduce((acc, m) => acc + (m.quantity * m.unitPriceUzS * (1 + m.wastePercent / 100)), 0);

  const handleDownloadPdf = (docCode: string, title: string) => {
    try {
      downloadItemizedPdfReport(activeProject, currency, title);
      addActivityLog({
        action: 'Exported Certificate',
        details: `Generated stamped engineering certificate ${docCode} (${title})`,
        category: 'report',
        status: 'completed',
        user: 'Olimjon K.',
        moduleTarget: 'reports'
      });
      setDownloadedDoc(docCode);
      setTimeout(() => setDownloadedDoc(null), 3000);
    } catch (e: any) {
      console.error("PDF generation error:", e);
    }
  };

  const reports = [
    {
      id: 'rep-ai-audit',
      title: 'PUE 7.1 / IEC 60364 AI Safety & Compliance Certification',
      docCode: `EV-CERT-PUE-${activeProject.code}`,
      desc: 'Complete multi-page engineering certificate with executive safety index, branch conductor thermal sizing, 80% continuous duty validation, and RCD protection.',
      status: activeProject.lastAudit ? `Audit Verified (${activeProject.lastAudit.safetyScore}%)` : 'Ready to Generate',
      icon: ShieldCheck,
      color: 'text-[#00D6A0]',
      highlight: true
    },
    {
      id: 'rep-load-flow',
      title: 'IEC 60364 Power Flow & Cable Thermal Sizing Audit',
      docCode: `EV-REP-CALC-${activeProject.code}`,
      desc: 'Complete mathematical verification of conductor ampacity, prospective short circuit current, and max voltage drop across all branch feeders.',
      status: 'Verified (Compliant)',
      icon: Cpu,
      color: 'text-[#8B5CFF]'
    },
    {
      id: 'rep-sld',
      title: 'Single-Line Diagram (SLD) & Switchgear Schedule Package',
      docCode: `EV-DRW-SLD-${activeProject.code}`,
      desc: 'Certified electrical schematic showing incoming feeder switchgear, RCD residual protection, busbar links, and terminal nodes.',
      status: 'Engineering Approved',
      icon: Layers,
      color: 'text-[#18D8F2]'
    },
    {
      id: 'rep-bom',
      title: 'Official Bill of Materials (BOM) & Commercial Procurement Take-Off',
      docCode: `EV-BOM-${activeProject.code}`,
      desc: `Comprehensive itemized schedule of cables, conduits, DIN devices, and terminals with commercial costing (${formatCurrency(totalBOM)}).`,
      status: 'Live Synchronized',
      icon: Calculator,
      color: 'text-[#FF9A24]'
    }
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#061426] border border-[#1B3A5C] rounded-xl shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#8B5CFF]" />
            <h1 className="text-xl font-extrabold text-[#F4F8FF] tracking-tight">Engineering Certification Reports</h1>
          </div>
          <p className="text-xs text-[#9EB2CC] mt-1">Export formal engineering calculation sheets, schematics, and client compliance packages.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => openAiModal('audit')}
            className="px-4 py-2 bg-gradient-to-r from-[#147DFF]/20 to-[#18D8F2]/20 hover:from-[#147DFF]/30 hover:to-[#18D8F2]/30 text-[#18D8F2] border border-[#18D8F2]/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#18D8F2]" />
            <span>AI Code Audit</span>
          </button>

          <button
            onClick={() => handleDownloadPdf(`EV-FULL-CERT-${activeProject.code}`, 'Complete Engineering Certification Package')}
            className="px-4 py-2 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#147DFF]/25 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Full PDF Report</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1B3A5C]/80 pb-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-[#10243D] text-[#18D8F2] border border-[#18D8F2]/40 shadow-sm'
              : 'text-[#9EB2CC] hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Certified Documents & Packages</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
            activeTab === 'compliance'
              ? 'bg-[#10243D] text-[#00D6A0] border border-[#00D6A0]/40 shadow-sm'
              : 'text-[#9EB2CC] hover:text-white'
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          <span>Regional Code Checklist (Compliance Auditor)</span>
        </button>
      </div>

      {activeTab === 'compliance' ? (
        <ComplianceAuditor />
      ) : (
        /* Reports List */
        <div className="space-y-4">
          {reports.map((rep) => {
            const Icon = rep.icon;
            return (
              <div
                key={rep.id}
                className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  rep.highlight 
                    ? 'bg-gradient-to-r from-[#0B1C32] to-[#081729] border-[#00D6A0]/40 shadow-lg' 
                    : 'bg-[#0B1C32] border-[#1B3A5C] hover:border-[#147DFF]/40'
                }`}
              >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl bg-[#061426] border border-[#1B3A5C] flex items-center justify-center shrink-0 ${rep.highlight ? 'ring-2 ring-[#00D6A0]/30' : ''}`}>
                  <Icon className={`w-5 h-5 ${rep.color}`} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-[#F4F8FF]">{rep.title}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-[#061426] text-[#9EB2CC] rounded border border-[#1B3A5C]">
                      {rep.docCode}
                    </span>
                    {rep.highlight && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#00D6A0]/20 text-[#00D6A0] border border-[#00D6A0]/40 font-bold">
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9EB2CC] mt-1 max-w-2xl leading-relaxed">
                    {rep.desc}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-[11px] font-mono text-[#00D6A0]">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{rep.status}</span>
                    </span>
                    <span className="text-[#9EB2CC]">·</span>
                    <span className="text-[#9EB2CC]">Project: {activeProject.name}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] text-xs font-semibold rounded-lg border border-[#1B3A5C] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>
                <button
                  onClick={() => handleDownloadPdf(rep.docCode, rep.title)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md transition-colors cursor-pointer ${
                    rep.highlight 
                      ? 'bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#030B18] shadow-[#00D6A0]/20' 
                      : 'bg-[#147DFF] hover:bg-[#147DFF]/90 text-white shadow-[#147DFF]/20'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadedDoc === rep.docCode ? 'Downloaded!' : 'Download PDF'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
