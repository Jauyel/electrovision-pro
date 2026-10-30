import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldAlert, 
  Volume2, 
  Tag, 
  Clock, 
  MapPin, 
  ChevronDown, 
  Sparkles,
  X,
  Sliders,
  Layers,
  Wrench
} from 'lucide-react';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder';
import { useProject } from '../../context/ProjectContext';
import { VoiceAnnotation, VoiceAnnotationCategory } from '../../types';

export interface VoiceAnnotatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCoordinates?: { x: number; y: number } | null;
  initialTargetLabel?: string;
  initialTargetId?: string;
  onAnnotationSaved?: (annotation: VoiceAnnotation) => void;
}

export const VoiceAnnotatorModal: React.FC<VoiceAnnotatorModalProps> = ({
  isOpen,
  onClose,
  initialCoordinates = null,
  initialTargetLabel = '',
  initialTargetId = '',
  onAnnotationSaved
}) => {
  const { activeProject, addVoiceAnnotation, language } = useProject();

  // Form State
  const [targetType, setTargetType] = useState<'component' | 'point' | 'circuit' | 'coordinates'>(
    initialCoordinates ? 'coordinates' : 'point'
  );
  const [selectedTargetId, setSelectedTargetId] = useState<string>(initialTargetId);
  const [customTargetLabel, setCustomTargetLabel] = useState<string>(
    initialTargetLabel || (initialCoordinates ? `Camera Spot (${initialCoordinates.x.toFixed(0)}%, ${initialCoordinates.y.toFixed(0)}%)` : '')
  );
  const [category, setCategory] = useState<VoiceAnnotationCategory>('defect');
  const [severity, setSeverity] = useState<'critical' | 'warning' | 'info'>('warning');
  const [authorName, setAuthorName] = useState<string>('Field Tech (Olimjon K.)');

  // Voice recording hook
  const {
    isRecording,
    transcript,
    interimTranscript,
    recordingDuration,
    audioBlobUrl,
    audioLevels,
    micPermission,
    error,
    isSpeechSupported,
    startRecording,
    stopRecording,
    resetRecording,
    setTranscript,
    speakTranscript,
    insertPreset
  } = useVoiceRecorder({
    language: language === 'uz' ? 'uz' : language === 'ru' ? 'ru' : 'en'
  });

  // Reset form when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      if (initialCoordinates) {
        setTargetType('coordinates');
        setCustomTargetLabel(initialTargetLabel || `Camera Spot (${initialCoordinates.x.toFixed(0)}%, ${initialCoordinates.y.toFixed(0)}%)`);
      } else if (initialTargetId) {
        setTargetType('point');
        setSelectedTargetId(initialTargetId);
        setCustomTargetLabel(initialTargetLabel);
      }
    }
  }, [isOpen, initialCoordinates, initialTargetLabel, initialTargetId]);

  if (!isOpen) return null;

  // Electrical equipment presets from active project
  const electricalPoints = activeProject.roomData?.points || [];
  const cadCircuits = activeProject.cadCircuits || [];

  const handleSelectPredefinedComponent = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;

    if (val.startsWith('pt:')) {
      const ptId = val.replace('pt:', '');
      const found = electricalPoints.find(p => p.id === ptId);
      if (found) {
        setSelectedTargetId(found.id);
        setCustomTargetLabel(`${found.name} (${found.type})`);
        setTargetType('point');
      }
    } else if (val.startsWith('cir:')) {
      const cirId = val.replace('cir:', '');
      const found = cadCircuits.find(c => c.id === cirId);
      if (found) {
        setSelectedTargetId(found.id);
        setCustomTargetLabel(`${found.tag} - ${found.name}`);
        setTargetType('circuit');
      }
    } else if (val === 'custom_coord') {
      setTargetType('coordinates');
      if (initialCoordinates) {
        setCustomTargetLabel(`Camera Viewport Pin (${initialCoordinates.x.toFixed(0)}%, ${initialCoordinates.y.toFixed(0)}%)`);
      }
    }
  };

  const handleSave = () => {
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) return;

    const targetLabel = customTargetLabel.trim() || 'General Field Component';

    const saved = addVoiceAnnotation({
      transcript: cleanTranscript,
      category,
      severity,
      audioDurationSeconds: recordingDuration > 0 ? recordingDuration : undefined,
      audioBlobUrl: audioBlobUrl || undefined,
      targetType,
      targetId: selectedTargetId || undefined,
      targetLabel,
      coordinates: initialCoordinates || undefined,
      author: authorName,
      resolved: false
    });

    if (onAnnotationSaved) {
      onAnnotationSaved(saved);
    }

    resetRecording();
    onClose();
  };

  const categoryConfig: Record<VoiceAnnotationCategory, { label: string; color: string; icon: React.ReactNode; border: string; bg: string }> = {
    defect: {
      label: 'Defect / Defect',
      color: 'text-[#FF5263]',
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      border: 'border-[#FF5263]/40',
      bg: 'bg-[#FF5263]/10'
    },
    punch_list: {
      label: 'Punch List Action',
      color: 'text-[#FF9A24]',
      icon: <Wrench className="w-3.5 h-3.5" />,
      border: 'border-[#FF9A24]/40',
      bg: 'bg-[#FF9A24]/10'
    },
    verification: {
      label: 'Verification Passed',
      color: 'text-[#00D6A0]',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      border: 'border-[#00D6A0]/40',
      bg: 'bg-[#00D6A0]/10'
    },
    measurement: {
      label: 'Dimensional Note',
      color: 'text-[#18D8F2]',
      icon: <Sliders className="w-3.5 h-3.5" />,
      border: 'border-[#18D8F2]/40',
      bg: 'bg-[#18D8F2]/10'
    },
    safety: {
      label: 'Safety Hazard',
      color: 'text-[#FFB800]',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
      border: 'border-[#FFB800]/40',
      bg: 'bg-[#FFB800]/10'
    }
  };

  const standardFieldPresets = [
    {
      category: 'defect' as VoiceAnnotationCategory,
      text: 'Loose terminal screw on L2 phase, requires 3.5 Nm torque check before energizing'
    },
    {
      category: 'punch_list' as VoiceAnnotationCategory,
      text: 'Conduit run obstructed by HVAC duct at 2.4m, reroute required via lower ceiling tray'
    },
    {
      category: 'safety' as VoiceAnnotationCategory,
      text: 'Missing IP44 sealing gasket on wet-zone exterior outlet, moisture ingress risk'
    },
    {
      category: 'defect' as VoiceAnnotationCategory,
      text: 'Circuit breaker QF3 warm to touch, thermal scan advised under full 16A design load'
    },
    {
      category: 'verification' as VoiceAnnotationCategory,
      text: 'Earth loop impedance test 0.28 Ohms verified compliant with IEC 60364-6 limits'
    },
    {
      category: 'measurement' as VoiceAnnotationCategory,
      text: 'Sub-panel clearance 850mm exceeds minimum 800mm electrical code requirement'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[#061426] border border-[#1B3A5C] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1B3A5C] bg-[#0B1C32]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#147DFF] to-[#18D8F2] flex items-center justify-center text-[#030B18] shadow-md shadow-[#147DFF]/25">
              <Mic className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#F4F8FF] font-mono uppercase tracking-wider">
                  Field Engineer Voice Annotator
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#18D8F2]/10 border border-[#18D8F2]/30 text-[#18D8F2]">
                  Live Speech-to-Text
                </span>
              </div>
              <p className="text-xs text-[#9EB2CC]">
                Annotate electrical components & room targets directly during camera survey
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (isRecording) stopRecording();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* TARGET COMPONENT / AREA SELECTOR */}
          <div className="bg-[#030B18] border border-[#1B3A5C] rounded-xl p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#9EB2CC] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#18D8F2]" />
                Target Electrical Component / Area
              </span>

              {initialCoordinates && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#18D8F2]/10 border border-[#18D8F2]/30 text-[#18D8F2]">
                  Camera Pin: ({initialCoordinates.x.toFixed(1)}%, {initialCoordinates.y.toFixed(1)}%)
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                  Bind to Project Asset
                </label>
                <select
                  onChange={handleSelectPredefinedComponent}
                  value={selectedTargetId ? (targetType === 'point' ? `pt:${selectedTargetId}` : `cir:${selectedTargetId}`) : (initialCoordinates ? 'custom_coord' : '')}
                  className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
                >
                  {initialCoordinates && (
                    <option value="custom_coord">Tapped Camera Viewport Location</option>
                  )}
                  <optgroup label="Room Electrical Points">
                    {electricalPoints.map(p => (
                      <option key={p.id} value={`pt:${p.id}`}>
                        {p.name} ({p.type}) - Wall {p.wall || 'plan'}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Panel Circuit Breakers">
                    {cadCircuits.map(c => (
                      <option key={c.id} value={`cir:${c.id}`}>
                        {c.tag} - {c.name} ({c.breakerRatingA}A)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                  Component Tag / Area Label
                </label>
                <input
                  type="text"
                  value={customTargetLabel}
                  onChange={(e) => setCustomTargetLabel(e.target.value)}
                  placeholder="e.g. Sub-Panel MDB-1, Conduit Drop, Terminal Strip..."
                  className="w-full px-3 py-2 bg-[#0B1C32] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
                />
              </div>
            </div>
          </div>

          {/* CATEGORY & SEVERITY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1.5 uppercase tracking-wider">
                Annotation Category
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(categoryConfig) as VoiceAnnotationCategory[]).slice(0, 3).map((catKey) => {
                  const conf = categoryConfig[catKey];
                  const active = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategory(catKey)}
                      className={`p-2 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                        active ? `${conf.bg} ${conf.border} ${conf.color}` : 'bg-[#0B1C32] border-[#1B3A5C] text-[#9EB2CC] hover:text-[#F4F8FF]'
                      }`}
                    >
                      {conf.icon}
                      <span className="capitalize">{catKey.replace('_', ' ')}</span>
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {(Object.keys(categoryConfig) as VoiceAnnotationCategory[]).slice(3).map((catKey) => {
                  const conf = categoryConfig[catKey];
                  const active = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategory(catKey)}
                      className={`p-2 rounded-lg border text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                        active ? `${conf.bg} ${conf.border} ${conf.color}` : 'bg-[#0B1C32] border-[#1B3A5C] text-[#9EB2CC] hover:text-[#F4F8FF]'
                      }`}
                    >
                      {conf.icon}
                      <span className="capitalize">{catKey.replace('_', ' ')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1.5 uppercase tracking-wider">
                Action Severity Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSeverity('critical')}
                  className={`p-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                    severity === 'critical'
                      ? 'bg-[#FF5263]/15 border-[#FF5263] text-[#FF5263]'
                      : 'bg-[#0B1C32] border-[#1B3A5C] text-[#9EB2CC]'
                  }`}
                >
                  Critical Defect
                </button>
                <button
                  type="button"
                  onClick={() => setSeverity('warning')}
                  className={`p-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                    severity === 'warning'
                      ? 'bg-[#FF9A24]/15 border-[#FF9A24] text-[#FF9A24]'
                      : 'bg-[#0B1C32] border-[#1B3A5C] text-[#9EB2CC]'
                  }`}
                >
                  Warning
                </button>
                <button
                  type="button"
                  onClick={() => setSeverity('info')}
                  className={`p-2 rounded-lg border text-xs font-mono font-bold transition-all ${
                    severity === 'info'
                      ? 'bg-[#18D8F2]/15 border-[#18D8F2] text-[#18D8F2]'
                      : 'bg-[#0B1C32] border-[#1B3A5C] text-[#9EB2CC]'
                  }`}
                >
                  Informational
                </button>
              </div>

              <div className="mt-2.5">
                <label className="text-[10px] font-mono text-[#9EB2CC] block mb-1">
                  Inspector / Field Technician
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF] focus:border-[#18D8F2] outline-none"
                />
              </div>
            </div>
          </div>

          {/* VOICE RECORDING DOCK & LIVE AUDIO WAVEFORM */}
          <div className="bg-[#030B18] border border-[#1B3A5C] rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background glowing aura when recording */}
            {isRecording && (
              <div className="absolute inset-0 bg-[#FF5263]/5 animate-pulse pointer-events-none" />
            )}

            {/* Audio Waveform Equalizer Display */}
            <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-sm mb-3">
              {audioLevels.map((lvl, idx) => (
                <div
                  key={idx}
                  style={{ height: `${isRecording ? lvl : 4}px` }}
                  className={`w-2 rounded-full transition-all duration-75 ${
                    isRecording 
                      ? 'bg-gradient-to-t from-[#147DFF] to-[#18D8F2] shadow-sm shadow-[#18D8F2]/50'
                      : 'bg-[#1B3A5C]'
                  }`}
                />
              ))}
            </div>

            {/* Large Record Button */}
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-[#147DFF] to-[#18D8F2] text-[#030B18] shadow-xl shadow-[#147DFF]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Start Voice Recording"
                >
                  <Mic className="w-7 h-7 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-[#FF5263] text-white shadow-xl shadow-[#FF5263]/50 animate-pulse hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Stop Recording"
                >
                  <Square className="w-6 h-6 fill-current" />
                </button>
              )}
            </div>

            {/* Status & Duration Timer */}
            <div className="mt-3 text-center">
              <div className="flex items-center justify-center gap-2 font-mono">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-[#FF5263] animate-ping' : 'bg-[#9EB2CC]'}`} />
                <span className="text-xs font-bold text-[#F4F8FF]">
                  {isRecording ? 'RECORDING VOICE NOTE...' : transcript ? 'VOICE RECORDED' : 'TAP TO RECORD VOICE'}
                </span>
                <span className="text-xs font-mono text-[#18D8F2] px-2 py-0.5 rounded bg-[#0B1C32] border border-[#1B3A5C]">
                  {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                </span>
              </div>
              <p className="text-[11px] text-[#9EB2CC] mt-1">
                {isRecording 
                  ? 'Speak clearly into your microphone describing defects, torque, or clearances'
                  : 'Speak into microphone or select standard electrical presets below'
                }
              </p>
            </div>
          </div>

          {/* LIVE TRANSCRIPT BOX (EDITABLE) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#9EB2CC]">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Tag className="w-3 h-3 text-[#18D8F2]" />
                Recognized Transcript
              </span>
              <div className="flex items-center gap-2">
                {transcript && (
                  <button
                    type="button"
                    onClick={() => speakTranscript(transcript)}
                    className="text-[10px] text-[#18D8F2] hover:text-[#00D6A0] flex items-center gap-1 transition-colors"
                    title="Read Out Loud Hands-Free"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </button>
                )}
                {transcript && (
                  <button
                    type="button"
                    onClick={resetRecording}
                    className="text-[10px] text-[#9EB2CC] hover:text-[#FF5263] flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
                placeholder={isRecording ? 'Listening for speech...' : 'Your speech-to-text transcript will appear here. You can also edit or type directly...'}
                className="w-full px-3 py-2.5 bg-[#030B18] border border-[#1B3A5C] rounded-xl text-xs text-[#F4F8FF] focus:border-[#18D8F2] outline-none resize-none leading-relaxed"
              />

              {interimTranscript && isRecording && (
                <div className="absolute bottom-2 left-3 right-3 text-[11px] text-[#18D8F2] font-mono italic truncate bg-[#030B18]/90 py-0.5 pointer-events-none">
                  Live: "{interimTranscript}"
                </div>
              )}
            </div>

            {/* Audio clip preview if recorded */}
            {audioBlobUrl && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0B1C32] border border-[#1B3A5C] text-xs">
                <span className="text-[10px] font-mono text-[#9EB2CC]">Audio Capture:</span>
                <audio src={audioBlobUrl} controls className="h-7 w-full max-w-xs" />
              </div>
            )}
          </div>

          {/* QUICK ELECTRICAL FIELD PRESETS */}
          <div className="bg-[#0B1C32]/50 border border-[#1B3A5C] rounded-xl p-3 space-y-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#9EB2CC] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#18D8F2]" />
              Quick Electrical Voice Presets (Tap to Insert)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {standardFieldPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    insertPreset(preset.text);
                    setCategory(preset.category);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#061426] hover:bg-[#10243D] border border-[#1B3A5C] hover:border-[#18D8F2] text-[11px] text-[#9EB2CC] hover:text-[#F4F8FF] text-left transition-colors flex items-center gap-1.5"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    preset.category === 'defect' ? 'bg-[#FF5263]' : preset.category === 'safety' ? 'bg-[#FFB800]' : preset.category === 'verification' ? 'bg-[#00D6A0]' : 'bg-[#18D8F2]'
                  }`} />
                  <span className="truncate max-w-[280px]">{preset.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#1B3A5C] bg-[#0B1C32]/90">
          <button
            type="button"
            onClick={() => {
              if (isRecording) stopRecording();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-mono text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] border border-[#1B3A5C] transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!transcript.trim()}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00D6A0] to-[#00B887] hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none text-[#030B18] text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-[#00D6A0]/20 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Pin Annotation to Scanner</span>
          </button>
        </div>
      </div>
    </div>
  );
};
