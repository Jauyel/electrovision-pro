import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  ScanLine, 
  Wand2, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Lightbulb, 
  ArrowRight, 
  Loader2, 
  RotateCcw, 
  Camera, 
  Layers, 
  Cpu, 
  Zap, 
  FileCheck2, 
  Plus,
  Upload,
  CircuitBoard,
  Calculator,
  Compass
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { AIAuditResult, AIScanResult, ElectricalPoint, WallOpening, Project, MaterialItem } from '../../types';

export type AiAssistantTab = 'chat' | 'audit' | 'scan' | 'generate';

export const AiAssistantView: React.FC = () => {
  const { 
    activeProject, 
    updateActiveProject, 
    createNewProject,
    language, 
    currency, 
    addActivityLog 
  } = useProject();

  const [activeTab, setActiveTab] = useState<AiAssistantTab>('chat');

  // --------------------------------------------------------------------------
  // Tab 1: AI Safety & Code Compliance Audit
  // --------------------------------------------------------------------------
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<AIAuditResult | null>(activeProject.lastAudit || null);
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
  // Tab 2: Multilingual AI Engineering Assistant Chat
  // --------------------------------------------------------------------------
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; timestamp: string }>>([
    {
      role: 'assistant',
      text: `Salom! Men ElectroVision AI — elektr muhandisligi bo'yicha sun'iy intellekt assistentingizman. 

Men sizga:
• PUE 7.1 va IEC 60364 standartlari bo'yicha kabellar kesimi va kuchlanish tushishini hisoblashda
• Fazalarni muvozanatlash va avtomat o'chirgichlar (MCB/RCD) parametrlarini tanlashda
• Elektr taxtasi (DIN rail) va bir chiziqli sxemalar (SLD) arxitekturasini loyihalashda
• Texnik xavfsizlik va GOST talablari bo'yicha yordam bera olaman.

Qanday savolingiz yoki hisob-kitobingiz bor?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatLoading]);

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputMessage.trim();
    if (!promptToSend || chatLoading) return;

    const userMsg = {
      role: 'user' as const,
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputMessage('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptToSend,
          context: {
            projectName: activeProject.name,
            totalPowerKw: (activeProject.cadCircuits || []).reduce((sum, c) => sum + (c.powerWatts || 0), 0) / 1000,
            circuitCount: activeProject.cadCircuits?.length || 0,
            standard: activeProject.standard,
            circuits: activeProject.cadCircuits?.map(c => ({
              tag: c.tag,
              name: c.name,
              powerWatts: c.powerWatts,
              phase: c.phase,
              breakerRatingA: c.breakerRatingA
            }))
          },
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI Co-pilot javob bera olmadi');
      }

      const assistantMsg = {
        role: 'assistant' as const,
        text: data.reply || data.text || 'Tushundim. Muhandislik hisob-kitoblari tayyor.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Kechirasiz, tarmoq xatosi yoki Gemini API javob bermadi: ${err?.message || 'Server xatosi'}. Iltimos, qayta urinib ko'ring yoki .env sozlamalarini tekshiring.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 3: Visual Photo & Blueprint Analysis
  // --------------------------------------------------------------------------
  const [scanImageBase64, setScanImageBase64] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [scanError, setScanError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScanError('Faqat rasm fayllarini yuklash mumkin (JPG, PNG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScanImageBase64(reader.result as string);
      setScanResult(null);
      setScanError('');
    };
    reader.readAsDataURL(file);
  };

  const handleRunVisionScan = async () => {
    if (!scanImageBase64) return;
    setScanLoading(true);
    setScanError('');

    try {
      const res = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: scanImageBase64,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Rasm tahlilida xatolik yuz berdi');
      }

      setScanResult(data);
      addActivityLog({
        action: 'AI Vision Analysis',
        details: `Identified ${data.points?.length || 0} electrical fixtures, ${data.detectedDimensions?.areaSqM || 0} m² estimated area`,
        category: 'scanner',
        status: 'completed',
        user: 'ElectroVision AI',
        moduleTarget: 'scanner'
      });
    } catch (err: any) {
      setScanError(err?.message || 'Rasm tahlili amalga oshmadi');
    } finally {
      setScanLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 4: Autonomous Project Generator
  // --------------------------------------------------------------------------
  const [genRoomType, setGenRoomType] = useState('apartment');
  const [genArea, setGenArea] = useState<number>(65);
  const [genRooms, setGenRooms] = useState<number>(3);
  const [genElectrificationLevel, setGenElectrificationLevel] = useState<'standard' | 'comfort' | 'premium'>('comfort');
  const [genLoading, setGenLoading] = useState(false);
  const [genSuccess, setGenSuccess] = useState('');

  const handleGenerateProject = async () => {
    setGenLoading(true);
    setGenSuccess('');

    try {
      const res = await fetch('/api/ai/generate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: genRoomType + ' - ' + genArea + 'm2 - ' + genRooms + ' rooms',
          currency,
          language
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Loyiha generatsiyasida xatolik');
      }

      if (data && data.name) {
        createNewProject(data.name, 'Tashkent, Uzbekistan', {
          standard: activeProject.standard,
        });
        updateActiveProject(p => ({
          ...p,
          cadCircuits: (data.circuits || []).map((c: any, idx: number) => ({
            id: `c-gen-${idx}`,
            tag: c.tag || `QF${idx+1}`,
            name: c.name || `Circuit ${idx+1}`,
            phase: c.phase || 'L1',
            supplyVoltage: 230,
            powerWatts: c.powerWatts || 1000,
            powerFactor: 0.95,
            cableLengthMeters: c.cableLengthMeters || 20,
            conductor: 'Cu',
            crossSectionMm2: c.cableType?.includes('3x4') ? 4.0 : c.cableType?.includes('3x2.5') ? 2.5 : 1.5,
            cableType: c.cableType || 'VVGng-LS 3x2.5',
            installMethod: 'conduit',
            breakerRatingA: c.breakerRatingA || 16
          })),
          panelComponents: (data.panel || []).map((comp: any, idx: number) => ({
            id: `pc-gen-${idx}`,
            railIndex: Math.floor(idx / 6),
            slotPosition: (idx % 6) * 2,
            moduleWidth: comp.modules || 2,
            type: comp.kind?.toLowerCase() === 'mcb' ? 'mcb' : comp.kind?.toLowerCase() === 'rcd' ? 'rcd' : 'mcb',
            model: comp.name || 'MCB',
            manufacturer: 'Schneider Electric',
            ratedCurrentA: 16,
            poles: '1P+N',
            status: 'verified'
          })),
          materials: (data.estimates || []).map((m: any, idx: number) => ({
            id: `mat-gen-${idx}`,
            category: 'cables',
            name: m.name || 'Material',
            model: 'GOST',
            specification: m.category || 'Standard',
            unit: m.unit || 'pcs',
            quantity: m.quantity || 1,
            unitPriceUzS: m.price || 10000,
            wastePercent: m.waste || 5,
            sourceModule: 'AI Generator',
            notes: m.notes || ''
          }))
        }));
        setGenSuccess(`Yangi loyiha muvaffaqiyatli yaratildi: "${data.name}" (${data.circuits?.length || 0} ta guruh zanjirlari bilan)`);
      }
    } catch (err: any) {
      alert(`Xatolik: ${err?.message || 'Loyiha generatsiyasi amalga oshmadi'}`);
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Switcher */}
      <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#1B3A5C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#147DFF] to-[#18D8F2] flex items-center justify-center text-[#030B18] shadow-lg shadow-[#147DFF]/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#F4F8FF] font-mono">
                  AI Engineering Assistant & Inspector
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A0] animate-pulse" />
                  Gemini Flash Online
                </span>
              </div>
              <p className="text-xs text-[#9EB2CC] mt-0.5">
                Deterministic standards grounding: PUE 7.1, GOST 30331, and IEC 60364-5-52
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#9EB2CC] hidden lg:inline">Active Context:</span>
            <div className="px-3 py-1 bg-[#0B1C32] border border-[#1B3A5C] rounded-lg text-xs font-mono text-[#18D8F2] flex items-center gap-2">
              <CircuitBoard className="w-3.5 h-3.5" />
              <span className="truncate max-w-[150px]">{activeProject.name}</span>
            </div>
          </div>
        </div>

        {/* 4 Mode Navigation Tabs */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#147DFF] text-white shadow-md shadow-[#147DFF]/30'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] border border-[#1B3A5C]'
            }`}
          >
            <Bot className="w-4 h-4 text-[#18D8F2]" />
            <span>Interactive Co-Pilot Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-[#00D6A0] text-[#030B18] shadow-md shadow-[#00D6A0]/30'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] border border-[#1B3A5C]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-[#00D6A0]" />
            <span>PUE 7.1 Compliance Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'scan'
                ? 'bg-[#18D8F2] text-[#030B18] shadow-md shadow-[#18D8F2]/30'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] border border-[#1B3A5C]'
            }`}
          >
            <ScanLine className="w-4 h-4 text-[#18D8F2]" />
            <span>Vision Blueprint & Photo Scan</span>
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-[#FF9A24] text-[#030B18] shadow-md shadow-[#FF9A24]/30'
                : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32] border border-[#1B3A5C]'
            }`}
          >
            <Wand2 className="w-4 h-4 text-[#FF9A24]" />
            <span>Autonomous Project Synthesizer</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Multilingual Co-Pilot Chat */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Chat Canvas (8 cols) */}
          <div className="lg:col-span-8 bg-[#061426] border border-[#1B3A5C] rounded-2xl flex flex-col h-[650px] shadow-xl overflow-hidden">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#030B18]/50">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-[#147DFF]/20 border border-[#147DFF]/40 text-[#18D8F2] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-4 text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-r from-[#147DFF] to-[#0A58CA] text-white border border-[#147DFF]/60'
                      : 'bg-[#0B1C32] text-[#F4F8FF] border border-[#1B3A5C]'
                  }`}>
                    {m.text}
                    <div className={`text-[9px] font-mono mt-2 text-right ${m.role === 'user' ? 'text-white/70' : 'text-[#9EB2CC]'}`}>
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-8 h-8 rounded-lg bg-[#147DFF]/20 border border-[#147DFF]/40 text-[#18D8F2] flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-[#0B1C32] text-[#9EB2CC] border border-[#1B3A5C] rounded-2xl px-4 py-2 text-xs font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#18D8F2] animate-ping" />
                    ElectroVision AI muhandislik hisob-kitobini tahlil qilmoqda...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-[#061426] border-t border-[#1B3A5C] flex items-center gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Savolingizni yozing (masalan: 7.2 kW induction hob uchun kabel va avtomat qanday tanlanadi?)..."
                className="flex-1 bg-[#030B18] border border-[#1B3A5C] rounded-xl px-4 py-2.5 text-xs text-[#F4F8FF] focus:border-[#18D8F2] outline-none font-sans"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={chatLoading || !inputMessage.trim()}
                className="px-4 py-2.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-[#147DFF]/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Yuborish</span>
              </button>
            </div>
          </div>

          {/* Quick Engineering Prompts (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 bg-[#061426] border border-[#1B3A5C] rounded-2xl space-y-3">
              <div className="text-xs font-bold text-[#F4F8FF] font-mono flex items-center gap-2 pb-2 border-b border-[#1B3A5C]">
                <Lightbulb className="w-4 h-4 text-[#FF9A24]" />
                Tezkor muhandislik so'rovlari
              </div>

              <div className="space-y-2">
                {[
                  {
                    title: "Kabel kesimi va kuchlanish tushishi (ΔU)",
                    prompt: "35 metr masofaga 4.5 kW 1-fazali yuklama uchun VVGng mis kabel kesimini va kuchlanish tushishi foizini (ΔU <= 4%) hisoblab ber."
                  },
                  {
                    title: "3-Fazali yuklamani muvozanatlash",
                    prompt: "Mening loyihamda umumiy yuklama 18 kW. Fazalar (L1, L2, L3) bo'yicha assimmetriya 15% dan oshmasligi uchun zanjirlarni qanday taqsimlash kerak?"
                  },
                  {
                    title: "RCD / UZO differensial himoya tanlash",
                    prompt: "Hammom, oshxona va tashqi rozetkalar uchun PUE 7.1 bo'yicha qanday sezgirlikdagi UZO (10mA yoki 30mA Type A) tavsiya etiladi?"
                  },
                  {
                    title: "Qisqa tutashuv toki (Ikz) va MCB",
                    prompt: "Transformator quyi stansiyasidan 150 metr masofadagi xonadon uchun kutilayotgan qisqa tutashuv toki va 6kA avtomatning uzish qobiliyatini tushuntirib ber."
                  }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="w-full text-left p-3 rounded-xl bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] hover:border-[#18D8F2]/60 transition-all text-xs text-[#9EB2CC] hover:text-[#F4F8FF] cursor-pointer group"
                  >
                    <div className="font-bold text-[#18D8F2] mb-1 group-hover:text-white flex items-center justify-between">
                      <span>{item.title}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[11px] line-clamp-2 text-[#9EB2CC]">
                      {item.prompt}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Project Summary Card */}
            <div className="p-4 bg-[#061426] border border-[#1B3A5C] rounded-2xl space-y-2 font-mono text-xs">
              <span className="text-[10px] text-[#9EB2CC] block uppercase tracking-wider">Loyiha holati</span>
              <div className="flex justify-between py-1 border-b border-[#1B3A5C]/50">
                <span className="text-[#9EB2CC]">Zanjirlar soni:</span>
                <strong className="text-[#F4F8FF]">{activeProject.cadCircuits?.length || 0} ta guruh</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#1B3A5C]/50">
                <span className="text-[#9EB2CC]">Umumiy quvvat:</span>
                <strong className="text-[#00D6A0]">
                  {((activeProject.cadCircuits || []).reduce((s, c) => s + (c.powerWatts || 0), 0) / 1000).toFixed(2)} kW
                </strong>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#9EB2CC]">Standart:</span>
                <strong className="text-[#18D8F2]">{activeProject.standard}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: PUE 7.1 Code Compliance Audit */}
      {activeTab === 'audit' && (
        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1B3A5C]">
            <div>
              <h2 className="text-base font-bold text-[#F4F8FF] font-mono flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#00D6A0]" />
                Texnik xavfsizlik va PUE 7.1 / IEC 60364-5-52 auditi
              </h2>
              <p className="text-xs text-[#9EB2CC] mt-1">
                Loyiha zanjirlarining yuklama koeffitsienti, kabel kesimlari, UZO himoyasi va fazalar balansi tekshiruvi
              </p>
            </div>

            <button
              onClick={runAudit}
              disabled={auditLoading}
              className="px-5 py-2.5 bg-[#00D6A0] hover:bg-[#00D6A0]/90 text-[#030B18] font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shadow-[#00D6A0]/20 disabled:opacity-50 cursor-pointer"
            >
              {auditLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Audit o'tkazilmoqda...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{auditData ? 'Auditni qayta o\'tkazish' : 'Auditorlik tahlilini boshlash'}</span>
                </>
              )}
            </button>
          </div>

          {auditError && (
            <div className="p-4 bg-[#FF5263]/10 border border-[#FF5263]/30 rounded-xl text-xs text-[#FF5263] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{auditError}</span>
            </div>
          )}

          {auditData ? (
            <div className="space-y-6">
              {/* Score and KPI cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-1">
                  <span className="text-[10px] text-[#9EB2CC]">Xavfsizlik indeksi</span>
                  <div className={`text-2xl font-black ${auditData.safetyScore >= 85 ? 'text-[#00D6A0]' : auditData.safetyScore >= 70 ? 'text-[#FF9A24]' : 'text-[#FF5263]'}`}>
                    {auditData.safetyScore}%
                  </div>
                  <span className="text-[10px] text-[#9EB2CC]">
                    {auditData.safetyScore >= 85 ? 'Standartlarga mos' : 'Tuzatishlar talab etiladi'}
                  </span>
                </div>

                <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-1">
                  <span className="text-[10px] text-[#9EB2CC]">Hisobiy umumiy yuklama</span>
                  <div className="text-2xl font-black text-[#18D8F2]">
                    {auditData.totalEstimatedLoadKw} kW
                  </div>
                  <span className="text-[10px] text-[#9EB2CC]">Bir vaqtlik talab</span>
                </div>

                <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-1">
                  <span className="text-[10px] text-[#9EB2CC]">Tavsiya etilgan bosh avtomat</span>
                  <div className="text-xl font-bold text-[#FF9A24]">
                    {auditData.mainBreakerRecommendation}
                  </div>
                  <span className="text-[10px] text-[#9EB2CC]">Kirish himoya qurilmasi</span>
                </div>

                <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl space-y-1">
                  <span className="text-[10px] text-[#9EB2CC]">Xulosalar soni</span>
                  <div className="text-2xl font-black text-[#F4F8FF]">
                    {auditData.findings?.length || 0} ta
                  </div>
                  <span className="text-[10px] text-[#9EB2CC]">Muhandislik ko'rsatmalari</span>
                </div>
              </div>

              {/* Findings Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#F4F8FF] font-mono">
                  Audit ko'rsatmalari va aniqlangan mezonlar:
                </h3>

                <div className="space-y-2">
                  {auditData.findings?.map((f, i) => (
                    <div 
                      key={i} 
                      className={`p-3.5 rounded-xl border text-xs font-mono space-y-1 ${
                        f.level === 'critical' 
                          ? 'bg-[#FF5263]/10 border-[#FF5263]/30 text-[#FF5263]' 
                          : f.level === 'warning'
                          ? 'bg-[#FF9A24]/10 border-[#FF9A24]/30 text-[#FF9A24]'
                          : 'bg-[#00D6A0]/10 border-[#00D6A0]/30 text-[#00D6A0]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          {f.level === 'critical' ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          {f.rule}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#030B18]/50">
                          {f.level}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#F4F8FF] font-sans">
                        {f.description}
                      </p>
                      {f.recommendation && (
                        <div className="text-[10px] text-[#9EB2CC] pt-1">
                          <strong>Tavsiya:</strong> {f.recommendation}
                        </div>
                      )}
                    </div>
                  ))},
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-[#1B3A5C] rounded-2xl space-y-3">
              <ShieldCheck className="w-12 h-12 text-[#18D8F2] mx-auto opacity-40" />
              <div className="text-sm font-bold text-[#F4F8FF]">Audit tahlili hali o'tkazilmadi</div>
              <p className="text-xs text-[#9EB2CC] max-w-md mx-auto">
                Yuqoridagi "Auditorlik tahlilini boshlash" tugmasini bosing. Gemini AI loyihangizdagi barcha kabel kesimlari va avtomatlarni PUE 7.1 qoidalariga solishtirib chiqadi.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Vision Blueprint & Photo Scan */}
      {activeTab === 'scan' && (
        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="pb-4 border-b border-[#1B3A5C]">
            <h2 className="text-base font-bold text-[#F4F8FF] font-mono flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-[#18D8F2]" />
              Rasm va chizma tahlili (Gemini Vision)
            </h2>
            <p className="text-xs text-[#9EB2CC] mt-1">
              Elektr shitlari, xonalar fotosurati yoki arxitektura chizmasini yuklang — AI nuqtalarni avtomatik taniydi.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#1B3A5C] hover:border-[#18D8F2] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-[#030B18]/50"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                {scanImageBase64 ? (
                  <div className="space-y-3">
                    <img 
                      src={scanImageBase64} 
                      alt="Uploaded blueprint preview" 
                      className="max-h-64 mx-auto rounded-lg object-contain shadow-md" 
                    />
                    <span className="text-xs text-[#18D8F2] block font-mono">Boshqa rasm yuklash uchun bosing</span>
                  </div>
                ) : (
                  <div className="space-y-3 py-6">
                    <Upload className="w-10 h-10 text-[#18D8F2] mx-auto opacity-60" />
                    <div className="text-xs font-bold text-[#F4F8FF]">
                      Rasm yoki loyiha rejasini bu yerga tashlang
                    </div>
                    <span className="text-[10px] text-[#9EB2CC] font-mono block">
                      PNG, JPG, WebP formatlar qo'llab-quvvatlanadi
                    </span>
                  </div>
                )}
              </div>

              {scanImageBase64 && (
                <button
                  onClick={handleRunVisionScan}
                  disabled={scanLoading}
                  className="w-full py-3 bg-[#18D8F2] hover:bg-[#18D8F2]/90 text-[#030B18] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-[#18D8F2]/20 disabled:opacity-50 cursor-pointer"
                >
                  {scanLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gemini Vision orqali tahlil qilinmoqda...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Rasmni sun'iy intellekt bilan tahlil qilish</span>
                    </>
                  )}
                </button>
              )}

              {scanError && (
                <div className="p-3 bg-[#FF5263]/10 border border-[#FF5263]/30 rounded-xl text-xs text-[#FF5263]">
                  {scanError}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="p-4 bg-[#0B1C32] border border-[#1B3A5C] rounded-2xl h-full space-y-4 font-mono text-xs">
                <span className="text-xs font-bold text-[#F4F8FF] block pb-2 border-b border-[#1B3A5C]">
                  Tahlil natijalari
                </span>

                {scanResult ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-[#061426] border border-[#00D6A0]/40 rounded-xl space-y-1">
                      <span className="text-[10px] text-[#00D6A0] uppercase font-bold">Xona parametrlari</span>
                      <div className="text-sm font-bold text-[#F4F8FF]">
                        Taxminiy maydon: {((scanResult.length || 0) * (scanResult.width || 0)).toFixed(1)} m²
                      </div>
                      <div className="text-[11px] text-[#9EB2CC]">
                        O'lchamlar: {scanResult.length || 0}m × {scanResult.width || 0}m (Balandligi: {scanResult.height || 3.0}m)
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] text-[#9EB2CC] uppercase block">Aniqlangan elektr nuqtalari ({scanResult.suggestedPoints?.length || 0}):</span>
                      <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {scanResult.suggestedPoints?.map((p: any, i: number) => (
                          <div key={i} className="p-2 rounded bg-[#061426] border border-[#1B3A5C] flex justify-between items-center text-[11px]">
                            <span className="text-[#F4F8FF] font-semibold">{p.type}</span>
                            <span className="text-[#18D8F2]">{p.label || `Point ${i + 1}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-[#9EB2CC]">
                    Rasm yuklab tahlilni ishga tushiring. Natijalar bu yerda chiqadi.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 4: Autonomous Project Synthesizer */}
      {activeTab === 'generate' && (
        <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-6 shadow-xl space-y-6">
          <div className="pb-4 border-b border-[#1B3A5C]">
            <h2 className="text-base font-bold text-[#F4F8FF] font-mono flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-[#FF9A24]" />
              Avtonom loyiha generatori
            </h2>
            <p className="text-xs text-[#9EB2CC] mt-1">
              Parametrlarni kiriting — AI to'liq loyihani, kabel marshrutlarini va zanjirlar jadvalini noldan sintezlaydi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1 font-mono text-xs">
              <label className="text-[#9EB2CC] block">Bino / Xona turi</label>
              <select
                value={genRoomType}
                onChange={(e) => setGenRoomType(e.target.value)}
                className="w-full p-2.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-[#F4F8FF]"
              >
                <option value="apartment">Ko'p qavatli xonadon</option>
                <option value="house">Hovli / Kottej</option>
                <option value="office">Ofis / Ish maydoni</option>
                <option value="commercial">Savdo do'koni</option>
              </select>
            </div>

            <div className="space-y-1 font-mono text-xs">
              <label className="text-[#9EB2CC] block">Umumiy maydon (m²)</label>
              <input
                type="number"
                value={genArea}
                onChange={(e) => setGenArea(Number(e.target.value))}
                className="w-full p-2.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-[#F4F8FF]"
              />
            </div>

            <div className="space-y-1 font-mono text-xs">
              <label className="text-[#9EB2CC] block">Elektrlashtirish darajasi</label>
              <select
                value={genElectrificationLevel}
                onChange={(e) => setGenElectrificationLevel(e.target.value as any)}
                className="w-full p-2.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-[#F4F8FF]"
              >
                <option value="standard">Standart (Asosiy zanjirlar)</option>
                <option value="comfort">Komfort (AC, Idish yuvish, Oshxona)</option>
                <option value="premium">Premium (Smart Home, EV Charger, VRV)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerateProject}
            disabled={genLoading}
            className="w-full py-3.5 bg-gradient-to-r from-[#FF9A24] to-[#FF5263] hover:opacity-95 text-[#030B18] font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#FF9A24]/20 disabled:opacity-50 cursor-pointer"
          >
            {genLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI loyihani sintezlamoqda...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>To'liq muhandislik loyihasini generatsiya qilish</span>
              </>
            )}
          </button>

          {genSuccess && (
            <div className="p-4 bg-[#00D6A0]/15 border border-[#00D6A0]/30 rounded-xl text-xs text-[#00D6A0] font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{genSuccess}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AiAssistantView;
