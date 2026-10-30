import React, { useState } from 'react';
import { 
  X, 
  Mic, 
  Volume2, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  Sliders, 
  ShieldAlert, 
  Share2, 
  Play, 
  MapPin, 
  Filter, 
  Clock, 
  Check, 
  Download,
  Search,
  ExternalLink
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { VoiceAnnotation, VoiceAnnotationCategory } from '../../types';

export interface VoiceAnnotationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRecordModal: () => void;
  onFocusAnnotation?: (annotation: VoiceAnnotation) => void;
}

export const VoiceAnnotationsDrawer: React.FC<VoiceAnnotationsDrawerProps> = ({
  isOpen,
  onClose,
  onOpenRecordModal,
  onFocusAnnotation
}) => {
  const { 
    voiceAnnotations, 
    deleteVoiceAnnotation, 
    updateVoiceAnnotation, 
    exportAnnotationsToPunchList,
    language 
  } = useProject();

  const [selectedFilter, setSelectedFilter] = useState<'all' | VoiceAnnotationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleExportPunchList = () => {
    const exportedCount = exportAnnotationsToPunchList();
    if (exportedCount > 0) {
      showToast(`Exported ${exportedCount} voice items to Site Installation Tasks / Punch List!`);
    } else {
      showToast('No unresolved defects or punch items to export.');
    }
  };

  const filteredAnnotations = voiceAnnotations.filter(a => {
    const matchesFilter = selectedFilter === 'all' || a.category === selectedFilter;
    const matchesSearch = 
      a.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.targetLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.author && a.author.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const categoryIcons: Record<VoiceAnnotationCategory, { label: string; icon: React.ReactNode; color: string; border: string; bg: string }> = {
    defect: {
      label: 'Defect',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      color: 'text-[#FF5263]',
      border: 'border-[#FF5263]/40',
      bg: 'bg-[#FF5263]/10'
    },
    punch_list: {
      label: 'Punch List',
      icon: <Wrench className="w-3.5 h-3.5" />,
      color: 'text-[#FF9A24]',
      border: 'border-[#FF9A24]/40',
      bg: 'bg-[#FF9A24]/10'
    },
    verification: {
      label: 'Verified',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      color: 'text-[#00D6A0]',
      border: 'border-[#00D6A0]/40',
      bg: 'bg-[#00D6A0]/10'
    },
    measurement: {
      label: 'Measure',
      icon: <Sliders className="w-3.5 h-3.5" />,
      color: 'text-[#18D8F2]',
      border: 'border-[#18D8F2]/40',
      bg: 'bg-[#18D8F2]/10'
    },
    safety: {
      label: 'Safety',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      color: 'text-[#FFB800]',
      border: 'border-[#FFB800]/40',
      bg: 'bg-[#FFB800]/10'
    }
  };

  const unresolvedCount = voiceAnnotations.filter(a => !a.resolved).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#061426] border-l border-[#1B3A5C] h-full flex flex-col shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOAST POPUP */}
        {toastMessage && (
          <div className="absolute top-16 left-4 right-4 z-50 bg-[#0B1C32] border border-[#00D6A0] text-[#F4F8FF] px-4 py-2.5 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00D6A0]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* DRAWER HEADER */}
        <div className="p-4 border-b border-[#1B3A5C] bg-[#0B1C32]/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#18D8F2]/15 border border-[#18D8F2]/30 flex items-center justify-center text-[#18D8F2]">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold font-mono text-[#F4F8FF] uppercase tracking-wider">
                  Camera Voice Annotations
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#18D8F2]/20 text-[#18D8F2]">
                  {voiceAnnotations.length}
                </span>
              </div>
              <p className="text-[11px] text-[#9EB2CC]">
                {unresolvedCount} active field items logged on scanner
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ACTIONS & CONTROLS BAR */}
        <div className="p-3 border-b border-[#1B3A5C] bg-[#030B18]/70 space-y-2.5">
          {/* Quick Add Voice Note Button */}
          <button
            onClick={() => {
              onClose();
              onOpenRecordModal();
            }}
            className="w-full py-2 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:brightness-110 text-[#030B18] text-xs font-mono font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-[#147DFF]/20 transition-all cursor-pointer"
          >
            <Mic className="w-4 h-4 stroke-[2.5]" />
            <span>Record New Voice Note</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9EB2CC]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search component, transcript or tag..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] placeholder-[#9EB2CC]/50 focus:border-[#18D8F2] outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px] font-mono scrollbar-none">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                selectedFilter === 'all'
                  ? 'bg-[#18D8F2] text-[#030B18] font-bold'
                  : 'bg-[#0B1C32] text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              All ({voiceAnnotations.length})
            </button>
            {(Object.keys(categoryIcons) as VoiceAnnotationCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedFilter(cat)}
                className={`px-2 py-1 rounded-md transition-colors whitespace-nowrap capitalize ${
                  selectedFilter === cat
                    ? 'bg-[#18D8F2] text-[#030B18] font-bold'
                    : 'bg-[#0B1C32] text-[#9EB2CC] hover:text-[#F4F8FF]'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* ANNOTATIONS LIST */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredAnnotations.length === 0 ? (
            <div className="py-12 text-center text-[#9EB2CC] space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#0B1C32] border border-[#1B3A5C] mx-auto flex items-center justify-center text-[#9EB2CC]">
                <Mic className="w-5 h-5 opacity-40" />
              </div>
              <div>
                <p className="text-xs font-medium text-[#F4F8FF]">No Voice Annotations Found</p>
                <p className="text-[11px] text-[#9EB2CC] mt-0.5">
                  Tap "Record New Voice Note" or tap anywhere on the camera view to annotate
                </p>
              </div>
            </div>
          ) : (
            filteredAnnotations.map(item => {
              const catConfig = categoryIcons[item.category] || categoryIcons.defect;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border bg-[#030B18] transition-all space-y-2.5 ${
                    item.resolved 
                      ? 'border-[#00D6A0]/20 opacity-75' 
                      : 'border-[#1B3A5C] hover:border-[#18D8F2]/50'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${catConfig.bg} ${catConfig.border} ${catConfig.color}`}>
                        {catConfig.icon}
                        <span className="capitalize">{catConfig.label}</span>
                      </span>

                      {item.coordinates && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B1C32] border border-[#1B3A5C] text-[#18D8F2] flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" />
                          Pin ({item.coordinates.x.toFixed(0)}%, {item.coordinates.y.toFixed(0)}%)
                        </span>
                      )}

                      {item.severity === 'critical' && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FF5263]/15 border border-[#FF5263]/40 text-[#FF5263] font-bold">
                          CRITICAL
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-[#9EB2CC] font-mono shrink-0">
                      <Clock className="w-3 h-3" />
                      <span>{item.exactTime}</span>
                    </div>
                  </div>

                  {/* Target Component Tag */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase text-[#9EB2CC]">Target:</span>
                    <span className="text-xs font-bold text-[#F4F8FF] font-mono">
                      {item.targetLabel}
                    </span>
                  </div>

                  {/* Transcript Content */}
                  <p className="text-xs text-[#F4F8FF] leading-relaxed bg-[#061426] p-2.5 rounded-lg border border-[#1B3A5C]/60 italic font-sans">
                    "{item.transcript}"
                  </p>

                  {/* Audio Player if URL available */}
                  {item.audioBlobUrl && (
                    <audio src={item.audioBlobUrl} controls className="w-full h-7 mt-1" />
                  )}

                  {/* Item Footer Toolbar */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#1B3A5C]/50 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSpeak(item.transcript)}
                        className="px-2 py-1 rounded bg-[#0B1C32] hover:bg-[#10243D] text-[#18D8F2] hover:text-white border border-[#1B3A5C] text-[10px] font-mono flex items-center gap-1 transition-colors"
                        title="Read Note Aloud"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>Speak</span>
                      </button>

                      {onFocusAnnotation && item.coordinates && (
                        <button
                          onClick={() => onFocusAnnotation(item)}
                          className="px-2 py-1 rounded bg-[#0B1C32] hover:bg-[#10243D] text-[#9EB2CC] hover:text-[#18D8F2] border border-[#1B3A5C] text-[10px] font-mono flex items-center gap-1 transition-colors"
                          title="Locate on Camera Feed"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Locate</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateVoiceAnnotation(item.id, { resolved: !item.resolved })}
                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-colors ${
                          item.resolved
                            ? 'bg-[#00D6A0]/20 text-[#00D6A0] border-[#00D6A0]/40'
                            : 'bg-[#0B1C32] text-[#9EB2CC] hover:text-[#00D6A0] border-[#1B3A5C]'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>{item.resolved ? 'Resolved' : 'Mark Resolved'}</span>
                      </button>

                      <button
                        onClick={() => deleteVoiceAnnotation(item.id)}
                        className="p-1 text-[#9EB2CC] hover:text-[#FF5263] transition-colors"
                        title="Delete Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DRAWER FOOTER: PUNCH LIST EXPORT */}
        <div className="p-3.5 border-t border-[#1B3A5C] bg-[#0B1C32]/90 flex items-center justify-between gap-3">
          <div className="text-[11px] text-[#9EB2CC] font-mono">
            <span>{unresolvedCount} items pending</span>
          </div>

          <button
            onClick={handleExportPunchList}
            disabled={unresolvedCount === 0}
            className="px-3.5 py-1.5 bg-[#147DFF] hover:bg-[#147DFF]/90 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 shadow-md shadow-[#147DFF]/25 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Export to Punch List</span>
          </button>
        </div>
      </div>
    </div>
  );
};
