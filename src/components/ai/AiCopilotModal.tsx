import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  ScanLine, 
  Bot, 
  Wand2, 
  X, 
  Upload, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Lightbulb, 
  ArrowRight, 
  Loader2, 
  Send, 
  Zap, 
  RotateCcw,
  Camera,
  Layers,
  FileCheck2,
  Cpu,
  Plus
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { CameraRoom } from '../scanner/CameraRoom';
import { AIAuditResult, AIScanResult, ElectricalPoint, WallOpening, Project, MaterialItem } from '../../types';

export type AiTab = 'audit' | 'scan' | 'generate' | 'chat';

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: AiTab;
}

export const AiCopilotModal: React.FC<AiCopilotModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'audit'
}) => {
  const { 
    activeProject, 
    updateActiveProject, 
    createNewProject,
    language, 
    currency, 
    addActivityLog 
  } = useProject();

  const [activeTab, setActiveTab] = useState<AiTab>(defaultTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  // --------------------------------------------------------------------------
  // Tab 1: AI Safety & Code Compliance Audit State
  // --------------------------------------------------------------------------
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<AIAuditResult | null>(null);
  const [auditError, setAuditError] = useState('');

  const runAudit = async () => {
    setAuditLoading(true);
    setAuditError('');
    try {
      const res = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: activeProject, language })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Audit service failed');
      }

      setAuditData(data);
      updateActiveProject(prev => ({
        ...prev,
        lastAudit: data
      }));

      addActivityLog({
        action: 'AI Safety Audit',
        details: `Verified project compliance: Safety Score ${data.safetyScore}% (${data.findings?.length || 0} findings)`,
        category: 'project',
        status: data.safetyScore >= 85 ? 'verified' : 'warning',
        user: 'ElectroVision AI',
        moduleTarget: 'cad'
      });
    } catch (err: any) {
      setAuditError(err?.message || 'Audit tahlilida xatolik yuz berdi');
    } finally {
      setAuditLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 2: AI Blueprint & Room Vision Scanner State
  // --------------------------------------------------------------------------
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setScanError('Iltimos, rasm faylini tanlang. / Please select an image file.');
      e.target.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setScanError('Rasm 12 MB dan kichik bo‘lishi kerak. / Image must be smaller than 12 MB.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setScanImage(b64);
      setScanResult(null);
      setScanError('');
    };
    reader.readAsDataURL(file);
  };

  const runScan = async (imageToScan = scanImage) => {
    if (!imageToScan) return;
    setScanLoading(true);
    setScanError('');
    try {
      const res = await fetch('/api/ai/blueprint-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageToScan,
          mimeType: imageToScan.match(/^data:([^;]+);base64,/)?.[1] || 'image/jpeg',
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Blueprint scan failed');
      }

      setScanResult(data);
      addActivityLog({
        action: 'AI Vision Scan',
        details: `Parsed layout for "${data.roomName}" (${data.length}x${data.width}m, ${data.suggestedPoints?.length || 0} points detected)`,
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

  const applyScanToCurrentRoom = () => {
    if (!scanResult) return;

    updateActiveProject(prev => {
      const detectedOpenings: WallOpening[] = (scanResult.openings || []).map((o, idx) => ({
        id: `op-ai-${Date.now()}-${idx}`,
        type: o.kind === 'window' ? 'window' : 'door',
        wall: o.wall || 'north',
        x: o.offset || 1.0,
        offset: o.offset || 1.0,
        widthMeters: o.width || 1.2,
        heightMeters: o.height || 2.1,
        sill: o.sill || 0,
        label: o.label || (o.kind === 'window' ? 'Deraza' : 'Eshik')
      }));

      const detectedPoints: ElectricalPoint[] = (scanResult.suggestedPoints || []).map((p, idx) => ({
        id: `pt-ai-${Date.now()}-${idx}`,
        type: p.type || 'socket_double',
        name: p.label || 'AI Point',
        wall: p.wall || 'north',
        x: Number((p.x * scanResult.length).toFixed(2)),
        y: Number((p.y * scanResult.width).toFixed(2)),
        heightMm: p.type.includes('socket') ? 300 : p.type.includes('switch') ? 900 : p.type.includes('light') ? scanResult.height * 1000 : 1600,
        wattage: p.wattage || (p.type.includes('socket') ? 600 : p.type.includes('ac') ? 2400 : 60),
        notes: `AI Vision Skaner orqali aniqlangan (${p.label})`
      }));

      return {
        ...prev,
        roomData: {
          ...prev.roomData,
          roomName: scanResult.roomName || prev.roomData.roomName,
          lengthMeters: Number(scanResult.length) || prev.roomData.lengthMeters,
          widthMeters: Number(scanResult.width) || prev.roomData.widthMeters,
          heightMeters: Number(scanResult.height) || prev.roomData.heightMeters,
          openings: detectedOpenings.length > 0 ? detectedOpenings : prev.roomData.openings,
          points: detectedPoints.length > 0 ? [...prev.roomData.points, ...detectedPoints] : prev.roomData.points,
          notes: `${prev.roomData.notes ? prev.roomData.notes + '\n' : ''}AI Scan: ${scanResult.detectedFeatures}`
        }
      };
    });

    onClose();
  };

  // --------------------------------------------------------------------------
  // Tab 3: AI Turnkey Project Generator State
  // --------------------------------------------------------------------------
  const [promptText, setPromptText] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generatedProjectPreview, setGeneratedProjectPreview] = useState<any | null>(null);

  const samplePrompts = [
    language === 'uz' ? "Toshkent shahridagi 3 xonali zamonaviy xonadon (Mehmonxona, Oshxona, Yotoqxona), induksion plita va 2 ta konditsioner bilan" : "3-room modern apartment in Tashkent with kitchen induction hob and 2 AC units",
    language === 'uz' ? "Katta ofis maydoni: server xonasi (UPS), majlislar zali va 20 ta ishchi joy uchun rozetkalar bloki" : "Commercial tech office: server room, meeting hall, and 20 workstation quad sockets",
    language === 'uz' ? "Restoran oshxonasi: 3 fazali kuchli pechlar, sovitgichlar va nam zonalarga mo'ljallangan IP44/IP65 himoya shchiti" : "Restaurant commercial kitchen: 3-phase heavy cookers, cold storage, IP44/65 switchboard"
  ];

  const runGenerateProject = async (customPrompt?: string) => {
    const textToUse = customPrompt || promptText;
    if (!textToUse?.trim()) return;

    setGenerateLoading(true);
    setGenerateError('');
    setGeneratedProjectPreview(null);

    try {
      const res = await fetch('/api/ai/generate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToUse,
          currency,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Project generation failed');
      }

      setGeneratedProjectPreview(data);
    } catch (err: any) {
      setGenerateError(err?.message || 'Loyiha generatsiyasida xatolik yuz berdi');
    } finally {
      setGenerateLoading(false);
    }
  };

  const applyGeneratedProjectToStore = () => {
    if (!generatedProjectPreview) return;

    const firstRoom = generatedProjectPreview.rooms?.[0] || {
      name: "Asosiy xona",
      length: 6.0,
      width: 4.5,
      height: 3.0,
      points: []
    };

    const newProjName = generatedProjectPreview.name || "AI Generated Electrical Plan";
    createNewProject(newProjName, "Tashkent, Uzbekistan");

    // Populate the newly created active project with generated rooms, points, panel, circuits and estimates
    setTimeout(() => {
      updateActiveProject(prev => {
        const mappedPoints: ElectricalPoint[] = (firstRoom.points || []).map((p: any, idx: number) => ({
          id: `pt-gen-${idx}`,
          type: (p.type || p.kind || 'socket_double') as any,
          name: p.label || 'Electrical Point',
          wall: p.wall || 'north',
          x: Number((p.x * firstRoom.length).toFixed(2)),
          y: Number((p.y * firstRoom.width).toFixed(2)),
          heightMm: 900,
          wattage: p.wattage || 600,
          notes: 'AI Generated Architecture'
        }));

        const mappedOpenings: WallOpening[] = (firstRoom.openings || []).map((o: any, idx: number) => ({
          id: `op-gen-${idx}`,
          type: o.kind === 'window' ? 'window' : 'door',
          wall: o.wall || 'north',
          x: o.offset || 1.0,
          offset: o.offset || 1.0,
          widthMeters: o.width || 1.2,
          heightMeters: o.height || 2.1,
          sill: o.sill || 0,
          label: o.label || 'Opening'
        }));

        const mappedBOM: MaterialItem[] = (generatedProjectPreview.estimates || []).map((e: any, idx: number) => ({
          id: `mat-gen-${idx}`,
          category: (e.category?.toLowerCase() || 'cables') as any,
          name: e.name,
          model: e.name,
          specification: e.category,
          unit: (e.unit || 'm') as any,
          quantity: e.quantity || 10,
          unitPriceUzS: e.price || 15000,
          wastePercent: e.waste || 10,
          sourceModule: 'Manual',
          notes: 'AI Project Generator BOM'
        }));

        return {
          ...prev,
          name: newProjName,
          roomData: {
            ...prev.roomData,
            roomName: firstRoom.name,
            lengthMeters: Number(firstRoom.length) || 6.0,
            widthMeters: Number(firstRoom.width) || 4.5,
            heightMeters: Number(firstRoom.height) || 3.0,
            points: mappedPoints,
            openings: mappedOpenings,
            notes: generatedProjectPreview.notes || firstRoom.note || 'AI Turnkey Generated Layout'
          },
          materials: mappedBOM.length > 0 ? mappedBOM : prev.materials,
          notes: generatedProjectPreview.notes
        } as any;
      });

      addActivityLog({
        action: 'Imported AI Project',
        details: `Generated turnkey plan "${newProjName}" with ${generatedProjectPreview.rooms?.length || 1} rooms and ${generatedProjectPreview.estimates?.length || 0} BOM items`,
        category: 'project',
        status: 'completed',
        user: 'ElectroVision AI',
        moduleTarget: 'scanner'
      });

      onClose();
    }, 100);
  };

  // --------------------------------------------------------------------------
  // Tab 4: AI Engineering Co-Pilot Chat State
  // --------------------------------------------------------------------------
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: language === 'uz'
        ? "Assalomu alaykum! Men ElectroVision AI PRO bosh muhandis maslahatchisiman. PUE 7.1, GOST 30331 va IEC 60364 standartlari bo'yicha kabel kesimini hisoblash, nominal avtomat o'chirgichlarni tanlash, UZO sezgirligi yoki faza muvozanati bo'yicha har qanday texnik savolingizga javob berishga tayyorman."
        : language === 'ru'
          ? "Здравствуйте! Я главный инженерный консультант ElectroVision AI PRO. Помогу с расчетами кабелей по ПУЭ 7.1, выбором автоматов, УЗО, балансировкой фаз и безопасностью."
          : "Hello! I am your Senior Electrical Engineering Co-Pilot. Ask me about PUE 7.1 / IEC 60364 cable sizing, thermal limits, voltage drops, or protection coordination."
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const quickChatChips = [
    language === 'uz' ? "Konditsioner (2.8 kW) uchun kabel va avtomat hisobi" : "Cable & breaker calculation for 2.8 kW AC",
    language === 'uz' ? "PUE 7.1 bo'yicha nam zonalarda UZO talablari" : "PUE 7.1 wet zone RCD protection rules",
    language === 'uz' ? "3 fazali shchitda yuklamani muvozanatlash formulasi" : "3-phase load balancing calculation formula",
    language === 'uz' ? "Kabel uzunligi 35m bo'lganda kuchlanish yo'qolishi (ΔU)" : "Voltage drop formula for 35m copper cable"
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || chatInput;
    if (!query?.trim()) return;

    const newHistory = [...messages, { role: 'user' as const, text: query }];
    setMessages(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          projectContext: {
            name: activeProject.name,
            standard: activeProject.standard,
            connectedLoadKw: (activeProject.cadCircuits.reduce((a, b) => a + b.powerWatts, 0) / 1000).toFixed(2),
            circuitsCount: activeProject.cadCircuits.length,
            room: `${activeProject.roomData.roomName} (${activeProject.roomData.lengthMeters}x${activeProject.roomData.widthMeters}m)`
          },
          history: messages,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Chat failed');
      }

      setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `⚠️ Xatolik yuz berdi: ${err?.message || 'AI bilan aloqa uzildi'}`
        }
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl w-full max-w-5xl h-[92vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:px-6 bg-[#0B1C32] border-b border-[#1B3A5C] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#147DFF] to-[#18D8F2] p-0.5 shadow-lg shadow-[#147DFF]/25 flex items-center justify-center">
              <div className="w-full h-full bg-[#061426] rounded-[9px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#18D8F2]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[#F4F8FF] tracking-tight">
                  ElectroVision AI Engineering Suite
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#147DFF]/20 text-[#18D8F2] border border-[#147DFF]/30">
                  Gemini 3.8 Server Engine
                </span>
              </div>
              <p className="text-[11px] text-[#9EB2CC] font-mono">
                Project: <strong className="text-[#F4F8FF]">{activeProject.name}</strong> ({activeProject.standard})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] rounded-lg transition-colors border border-transparent hover:border-[#1B3A5C]"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Ribbon */}
        <div className="px-4 sm:px-6 bg-[#081729] border-b border-[#1B3A5C] flex items-center gap-2 overflow-x-auto shrink-0 py-2">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'audit'
                ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#00D6A0]" />
            <span>PUE 7.1 Compliance Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'scan'
                ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
            }`}
          >
            <ScanLine className="w-4 h-4 text-[#18D8F2]" />
            <span>Blueprint & Camera Scan</span>
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'generate'
                ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
            }`}
          >
            <Wand2 className="w-4 h-4 text-[#FF9A24]" />
            <span>Turnkey Project Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'chat'
                ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
            }`}
          >
            <Bot className="w-4 h-4 text-[#8B5CFF]" />
            <span>Engineering Co-Pilot Chat</span>
          </button>
        </div>

        {/* Tab Content Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#030B18]">
          {/* TAB 1: PUE 7.1 / IEC ELECTRICAL AUDIT */}
          {activeTab === 'audit' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Audit Intro Banner */}
              <div className="p-5 bg-gradient-to-r from-[#0B1C32] to-[#061426] border border-[#1B3A5C] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-[#00D6A0] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00D6A0]" />
                    PUE 7.1 / GOST 30331 / IEC 60364 Inspector
                  </span>
                  <h3 className="text-lg font-bold text-[#F4F8FF]">
                    Electrical Installation Technical Safety Audit
                  </h3>
                  <p className="text-xs text-[#9EB2CC] max-w-xl">
                    Analyzes active room boundaries, branch feeder loads, continuous load ratios (80% rule), wet room RCD protections, and neutral sizing.
                  </p>
                </div>

                <button
                  onClick={runAudit}
                  disabled={auditLoading}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:opacity-95 text-[#030B18] rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#18D8F2]/20 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {auditLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Auditing Project with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{auditData ? 'Re-Run Compliance Audit' : 'Run Full Electrical Audit'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error Notice */}
              {auditError && (
                <div className="p-4 bg-[#FF5263]/10 border border-[#FF5263]/30 rounded-xl flex items-start gap-3 text-xs text-[#FF5263]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Audit xatoligi:</span> {auditError}
                  </div>
                </div>
              )}

              {/* Audit Findings Render */}
              {auditData ? (
                <div className="space-y-6 animate-fade-in">
                  {/* Top Metric Tiles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono text-lg font-black border ${
                        auditData.safetyScore >= 85 
                          ? 'bg-[#00D6A0]/15 border-[#00D6A0]/40 text-[#00D6A0]' 
                          : auditData.safetyScore >= 70 
                            ? 'bg-[#FF9A24]/15 border-[#FF9A24]/40 text-[#FF9A24]' 
                            : 'bg-[#FF5263]/15 border-[#FF5263]/40 text-[#FF5263]'
                      }`}>
                        {auditData.safetyScore}%
                      </div>
                      <div>
                        <div className="text-[10px] text-[#9EB2CC] font-mono uppercase">Safety Compliance Index</div>
                        <div className="text-sm font-bold text-[#F4F8FF]">
                          {auditData.safetyScore >= 85 ? 'PUE Certified' : auditData.safetyScore >= 70 ? 'Moderate Risks' : 'Critical Violations'}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-1">
                      <div className="text-[10px] text-[#9EB2CC] font-mono uppercase">Estimated Active Load</div>
                      <div className="text-base font-bold text-[#18D8F2] font-mono">
                        {auditData.totalEstimatedLoadKw} kW
                      </div>
                      <div className="text-[10px] text-[#9EB2CC]">Diversified design demand</div>
                    </div>

                    <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-1">
                      <div className="text-[10px] text-[#9EB2CC] font-mono uppercase">Main Breaker Recommended</div>
                      <div className="text-xs font-bold text-[#00D6A0] font-mono">
                        {auditData.mainBreakerRecommendation}
                      </div>
                      <div className="text-[10px] text-[#9EB2CC]">Incoming switchgear recommendation</div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-[#0B1C32]/60 border border-[#1B3A5C] rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-[#F4F8FF] font-mono text-[11px] uppercase text-[#18D8F2]">
                      Executive Engineering Summary
                    </span>
                    <p className="text-[#9EB2CC] leading-relaxed">{auditData.summary}</p>
                  </div>

                  {/* Detailed Findings List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider font-mono">
                      Code Compliance Findings ({auditData.findings?.length || 0})
                    </h4>

                    <div className="space-y-2.5">
                      {auditData.findings?.map((f, i) => (
                        <div
                          key={i}
                          className={`p-4 rounded-xl border flex items-start gap-3.5 transition-colors ${
                            f.level === 'critical'
                              ? 'bg-[#FF5263]/10 border-[#FF5263]/30'
                              : f.level === 'warning'
                                ? 'bg-[#FF9A24]/10 border-[#FF9A24]/30'
                                : f.level === 'good'
                                  ? 'bg-[#00D6A0]/10 border-[#00D6A0]/30'
                                  : 'bg-[#10243D] border-[#1B3A5C]'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {f.level === 'critical' ? (
                              <AlertTriangle className="w-4 h-4 text-[#FF5263]" />
                            ) : f.level === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-[#FF9A24]" />
                            ) : f.level === 'good' ? (
                              <CheckCircle2 className="w-4 h-4 text-[#00D6A0]" />
                            ) : (
                              <Lightbulb className="w-4 h-4 text-[#18D8F2]" />
                            )}
                          </div>

                          <div className="flex-1 space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h5 className="text-xs font-bold text-[#F4F8FF]">{f.title}</h5>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#061426] text-[#9EB2CC] border border-[#1B3A5C]">
                                {f.rule}
                              </span>
                            </div>
                            <p className="text-xs text-[#9EB2CC] leading-relaxed">{f.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {auditData.recommendations?.length > 0 && (
                    <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-2.5">
                      <h4 className="text-xs font-bold text-[#00D6A0] uppercase font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Actionable Engineering Actions
                      </h4>
                      <ul className="space-y-1.5 text-xs text-[#9EB2CC]">
                        {auditData.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#18D8F2] font-mono font-bold">0{idx + 1}.</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center bg-[#061426] border border-[#1B3A5C] rounded-2xl space-y-3">
                  <ShieldCheck className="w-12 h-12 text-[#9EB2CC]/40 mx-auto" />
                  <h4 className="text-sm font-bold text-[#F4F8FF]">No Audit Executed Yet</h4>
                  <p className="text-xs text-[#9EB2CC] max-w-sm mx-auto">
                    Click "Run Full Electrical Audit" to pass your project's conductors, panels, and loads to the Gemini engineering model.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AI BLUEPRINT & CAMERA VISION SCAN */}
          {activeTab === 'scan' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Scanner Mode Toggle */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-[#F4F8FF]">Multimodal Floorplan & Room Scanner</h4>
                  <p className="text-xs text-[#9EB2CC]">Upload a 2D floorplan drawing or turn on the camera to capture room walls</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsCameraActive(!isCameraActive)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      isCameraActive 
                        ? 'bg-[#18D8F2] text-[#030B18] border-[#18D8F2]' 
                        : 'bg-[#061426] text-[#F4F8FF] border-[#1B3A5C] hover:bg-[#10243D]'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{isCameraActive ? 'Close Camera' : 'Live Camera Mode'}</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#147DFF]/20 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Camera survey view if opened */}
              {isCameraActive && (
                <div className="animate-fade-in">
                  <CameraRoom
                    photos={activeProject.roomData.photos || []}
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
                      setScanImage(photoB64);
                      setIsCameraActive(false);
                      runScan(photoB64);
                    }}
                    onClose={() => setIsCameraActive(false)}
                  />
                </div>
              )}

              {/* Uploaded or Selected Image preview */}
              {scanImage && !isCameraActive && (
                <div className="p-4 bg-[#061426] border border-[#1B3A5C] rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F4F8FF]">Selected Floorplan Image</span>
                    <button
                      onClick={() => {
                        setScanImage(null);
                        setScanResult(null);
                      }}
                      className="text-xs text-[#FF5263] hover:underline"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="relative rounded-xl overflow-hidden border border-[#1B3A5C] max-h-72 flex items-center justify-center bg-black/60">
                    <img src={scanImage} alt="Plan preview" className="max-h-72 w-auto object-contain" />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => runScan()}
                      disabled={scanLoading}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] text-[#030B18] font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-[#18D8F2]/25 cursor-pointer disabled:opacity-50"
                    >
                      {scanLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gemini Vision Parsing Geometry...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Analyze Geometry with Gemini Vision</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Scan Error Notice */}
              {scanError && (
                <div className="p-4 bg-[#FF5263]/10 border border-[#FF5263]/30 rounded-xl flex items-center gap-2.5 text-xs text-[#FF5263]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Scan Results Card */}
              {scanResult && (
                <div className="p-5 bg-[#0B1C32] border border-[#18D8F2]/40 rounded-2xl space-y-5 animate-fade-in shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1B3A5C]">
                    <div>
                      <span className="text-[10px] font-mono text-[#00D6A0] uppercase font-bold">
                        AI Geometry Parser Result
                      </span>
                      <h4 className="text-base font-extrabold text-[#F4F8FF]">
                        {scanResult.roomName} ({scanResult.length}m × {scanResult.width}m × {scanResult.height}m)
                      </h4>
                    </div>

                    <button
                      onClick={applyScanToCurrentRoom}
                      className="px-4 py-2 bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#030B18] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-[#00D6A0]/25 transition-transform active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Apply Geometry to Current Room</span>
                    </button>
                  </div>

                  <p className="text-xs text-[#9EB2CC] leading-relaxed">
                    <strong>Detected Features:</strong> {scanResult.detectedFeatures}
                  </p>

                  {/* Openings Schedule */}
                  {scanResult.openings?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-[#F4F8FF] font-mono uppercase">
                        Detected Openings ({scanResult.openings.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {scanResult.openings.map((op, idx) => (
                          <div key={idx} className="p-2.5 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs space-y-0.5">
                            <div className="font-bold text-[#18D8F2] flex items-center justify-between">
                              <span>{op.label || (op.kind === 'window' ? 'Window' : 'Door')}</span>
                              <span className="text-[10px] font-mono text-[#9EB2CC] uppercase">{op.wall}</span>
                            </div>
                            <div className="text-[11px] text-[#9EB2CC] font-mono">
                              W: {op.width}m · H: {op.height}m · Offset: {op.offset}m
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Points */}
                  {scanResult.suggestedPoints?.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-[#F4F8FF] font-mono uppercase">
                        Detected Electrical Points ({scanResult.suggestedPoints.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {scanResult.suggestedPoints.map((pt, idx) => (
                          <div key={idx} className="p-2.5 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-[#F4F8FF] text-[11px]">{pt.label}</div>
                              <span className="text-[10px] text-[#9EB2CC] font-mono">{pt.type}</span>
                            </div>
                            <span className="text-[10px] font-mono text-[#00D6A0] font-bold">
                              {pt.wattage || 600}W
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TURNKEY PROJECT GENERATOR */}
          {activeTab === 'generate' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="p-5 bg-[#0B1C32] border border-[#1B3A5C] rounded-2xl space-y-4 shadow-xl">
                <div>
                  <h4 className="text-base font-bold text-[#F4F8FF]">
                    AI Turnkey Electrical Engineering Architect
                  </h4>
                  <p className="text-xs text-[#9EB2CC] mt-1">
                    Describe your facility in natural language. Gemini will calculate full room geometry, protective switchgear devices, branch circuits and itemized BOM materials.
                  </p>
                </div>

                {/* Preset Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-[#9EB2CC] uppercase">Quick Engineering Templates:</span>
                  <div className="flex flex-wrap gap-2">
                    {samplePrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setPromptText(p);
                          runGenerateProject(p);
                        }}
                        className="text-left text-xs px-3 py-1.5 bg-[#061426] hover:bg-[#10243D] text-[#18D8F2] border border-[#1B3A5C] hover:border-[#18D8F2]/50 rounded-xl transition-all"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Prompt Box */}
                <div className="space-y-2">
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Masalan: 4 xonali kottej, 2 ta hammom va boyler, induction plita (7.2kW), hovli yoritish liniyalari va avtomatika..."
                    rows={4}
                    className="w-full p-3.5 bg-[#061426] border border-[#1B3A5C] focus:border-[#147DFF] rounded-xl text-xs text-[#F4F8FF] placeholder-[#9EB2CC]/50 focus:outline-none transition-colors"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#9EB2CC] font-mono">
                      Currency: <strong className="text-[#00D6A0]">{currency}</strong> · Code: <strong className="text-[#18D8F2]">PUE 7.1 / IEC</strong>
                    </span>

                    <button
                      onClick={() => runGenerateProject()}
                      disabled={generateLoading || !promptText.trim()}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] text-[#030B18] font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-[#147DFF]/25 cursor-pointer disabled:opacity-50"
                    >
                      {generateLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Turnkey Project...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          <span>Generate Complete Plan</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Generate Error Notice */}
              {generateError && (
                <div className="p-4 bg-[#FF5263]/10 border border-[#FF5263]/30 rounded-xl flex items-center gap-2.5 text-xs text-[#FF5263]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{generateError}</span>
                </div>
              )}

              {/* Generated Project Preview */}
              {generatedProjectPreview && (
                <div className="p-5 bg-[#0B1C32] border border-[#18D8F2]/40 rounded-2xl space-y-5 animate-fade-in shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1B3A5C]">
                    <div>
                      <span className="text-[10px] font-mono text-[#00D6A0] uppercase font-bold">
                        Turnkey Project Ready
                      </span>
                      <h4 className="text-base font-extrabold text-[#F4F8FF]">
                        {generatedProjectPreview.name}
                      </h4>
                      <p className="text-xs text-[#9EB2CC] mt-0.5">{generatedProjectPreview.description}</p>
                    </div>

                    <button
                      onClick={applyGeneratedProjectToStore}
                      className="px-5 py-2.5 bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#030B18] font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-[#00D6A0]/25 transition-transform active:scale-95 shrink-0"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Import as Active Project</span>
                    </button>
                  </div>

                  {/* Summary Metric Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 bg-[#061426] border border-[#1B3A5C] rounded-xl">
                      <div className="text-[10px] text-[#9EB2CC]">Rooms</div>
                      <div className="text-sm font-bold text-[#F4F8FF]">
                        {generatedProjectPreview.rooms?.length || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-[#061426] border border-[#1B3A5C] rounded-xl">
                      <div className="text-[10px] text-[#9EB2CC]">Panel Devices</div>
                      <div className="text-sm font-bold text-[#FF9A24]">
                        {generatedProjectPreview.panel?.length || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-[#061426] border border-[#1B3A5C] rounded-xl">
                      <div className="text-[10px] text-[#9EB2CC]">BOM Lines</div>
                      <div className="text-sm font-bold text-[#00D6A0]">
                        {generatedProjectPreview.estimates?.length || 0}
                      </div>
                    </div>
                    <div className="p-3 bg-[#061426] border border-[#1B3A5C] rounded-xl">
                      <div className="text-[10px] text-[#9EB2CC]">Design Standard</div>
                      <div className="text-xs font-bold text-[#18D8F2]">PUE 7.1 / IEC</div>
                    </div>
                  </div>

                  {/* Room Previews */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-[#F4F8FF] font-mono uppercase">Coordinated Rooms:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {generatedProjectPreview.rooms?.map((rm: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs space-y-1">
                          <div className="font-bold text-[#18D8F2] flex justify-between">
                            <span>{rm.name}</span>
                            <span className="font-mono text-[#9EB2CC] text-[10px]">{rm.length}×{rm.width}m</span>
                          </div>
                          <div className="text-[11px] text-[#9EB2CC]">{rm.points?.length || 0} Points · {rm.openings?.length || 0} Openings</div>
                          {rm.note && <div className="text-[10px] text-[#9EB2CC]/80 italic">{rm.note}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Estimates snippet */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-[#F4F8FF] font-mono uppercase">Bill of Materials Sample:</h5>
                    <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
                      {generatedProjectPreview.estimates?.map((est: any, idx: number) => (
                        <div key={idx} className="p-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs flex justify-between items-center">
                          <span className="font-medium text-[#F4F8FF] truncate">{est.name}</span>
                          <span className="font-mono text-[11px] text-[#00D6A0] shrink-0 ml-2">
                            {est.quantity} {est.unit} · {Number(est.price).toLocaleString()} {currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI COPILOT CHAT */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full max-w-4xl mx-auto space-y-4">
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2">
                {quickChatChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip)}
                    className="text-left text-[11px] px-3 py-1 bg-[#0B1C32] hover:bg-[#10243D] text-[#18D8F2] border border-[#1B3A5C] rounded-lg transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Chat Thread Messages */}
              <div className="flex-1 bg-[#061426] border border-[#1B3A5C] rounded-2xl p-4 overflow-y-auto space-y-4 min-h-[360px] custom-scrollbar">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 text-xs leading-relaxed ${
                      m.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {m.role === 'model' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#147DFF] to-[#18D8F2] p-0.5 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="w-full h-full bg-[#061426] rounded-[7px] flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-[#18D8F2]" />
                        </div>
                      </div>
                    )}

                    <div
                      className={`p-3.5 rounded-2xl max-w-2xl whitespace-pre-line ${
                        m.role === 'user'
                          ? 'bg-[#147DFF] text-white rounded-tr-none'
                          : 'bg-[#0B1C32] text-[#F4F8FF] border border-[#1B3A5C] rounded-tl-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-xs text-[#9EB2CC] font-mono">
                    <Loader2 className="w-4 h-4 animate-spin text-[#18D8F2]" />
                    <span>ElectroVision AI is synthesizing engineering advice...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="flex items-center gap-2 p-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Elektrotexnika, PUE 7.1 yoki loyihangiz bo'yicha savol bering..."
                  className="flex-1 px-3 py-2 bg-transparent text-xs text-[#F4F8FF] placeholder-[#9EB2CC]/50 focus:outline-none"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-2 bg-[#147DFF] hover:bg-[#147DFF]/90 disabled:opacity-40 text-white rounded-lg transition-colors cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
