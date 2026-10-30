import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  CameraOff, 
  Check, 
  RotateCcw, 
  Trash2, 
  X, 
  Sparkles, 
  AlertCircle,
  Maximize2,
  RefreshCw,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import { RoomPhoto } from '../../types';

interface CameraRoomProps {
  photos: RoomPhoto[];
  onSavePhotos: (newPhotos: RoomPhoto[]) => void;
  onDeletePhoto: (id: string) => void;
  onAnalyzePhoto?: (photoBase64: string) => void;
  onClose?: () => void;
}

type CameraState = 'idle' | 'starting' | 'live' | 'error';

export const CameraRoom: React.FC<CameraRoomProps> = ({
  photos,
  onSavePhotos,
  onDeletePhoto,
  onAnalyzePhoto,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);

  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [capturedQueue, setCapturedQueue] = useState<RoomPhoto[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [selectedPhotoForInspection, setSelectedPhotoForInspection] = useState<RoomPhoto | null>(null);

  const stopCamera = () => {
    sessionRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    const session = ++sessionRef.current;
    setErrorMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Kamera qurilmasi yoki brauzer HTTPS protokoli talab qilinadi.");
      setCameraState('error');
      return;
    }

    setCameraState('starting');

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (session !== sessionRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = stream;

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setErrorMessage("Kamera ulanishi uzildi.");
        stopCamera();
      }, { once: true });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (session === sessionRef.current) {
        setCameraState('live');
        setFacingMode(mode);
      }
    } catch (err: any) {
      if (session !== sessionRef.current) return;
      stopCamera();
      setCameraState('error');

      const name = err?.name;
      if (name === 'NotAllowedError') {
        setErrorMessage("Kameraga ruxsat berilmadi. Brauzer sozlamalarida kameraga ruxsat bering.");
      } else if (name === 'NotFoundError') {
        setErrorMessage("Ushbu qurilmada kamera aniqlanmadi.");
      } else {
        setErrorMessage(`Kamerani ishga tushirishda xatolik: ${err?.message || 'Noma\'lum xatolik'}`);
      }
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || cameraState !== 'live') return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const newPhoto: RoomPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      image: dataUrl,
      capturedAt: new Date().toISOString(),
      note: `Survey snapshot (${canvas.width}×${canvas.height})`,
      source: 'camera'
    };

    setCapturedQueue(prev => [...prev, newPhoto]);
  };

  const handleSaveAll = () => {
    if (capturedQueue.length > 0) {
      onSavePhotos(capturedQueue);
      setCapturedQueue([]);
    }
    stopCamera();
    if (onClose) onClose();
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  const allDisplayPhotos = [...photos, ...capturedQueue];

  return (
    <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Header Bar */}
      <div className="p-4 bg-[#0B1C32] border-b border-[#1B3A5C] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#18D8F2]/15 border border-[#18D8F2]/30 flex items-center justify-center">
            <Camera className="w-4 h-4 text-[#18D8F2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F4F8FF] flex items-center gap-2">
              Optical Room Survey & AR Inspection Camera
            </h3>
            <p className="text-[11px] text-[#9EB2CC]">
              Capture room walls, switchboards, or blueprints for automated AI vision analysis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cameraState === 'live' && (
            <button
              onClick={handleToggleFacingMode}
              className="p-1.5 bg-[#061426] hover:bg-[#10243D] text-[#9EB2CC] hover:text-[#18D8F2] border border-[#1B3A5C] rounded-lg text-xs flex items-center gap-1.5 transition-colors"
              title="Switch Camera (Front/Rear)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono text-[10px]">Flip Camera</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D] rounded-lg transition-colors border border-transparent hover:border-[#1B3A5C]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport & Video Feed */}
      <div className="relative bg-[#030B18] min-h-[360px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
        {/* Video stream element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full max-h-[480px] object-contain transition-opacity duration-300 ${
            cameraState === 'live' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
          }`}
        />

        {/* Live Overlays when active */}
        {cameraState === 'live' && (
          <>
            {/* Architectural Reticle HUD */}
            <div className="absolute inset-8 pointer-events-none border border-[#18D8F2]/30 rounded-xl">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#18D8F2]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#18D8F2]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#18D8F2]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#18D8F2]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-[#18D8F2]/40 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-[#18D8F2] rounded-full animate-ping" />
              </div>
            </div>

            {/* Live Indicator Pill */}
            <div className="absolute top-4 left-4 px-2.5 py-1 bg-[#061426]/85 backdrop-blur-md rounded-full border border-[#00D6A0]/40 flex items-center gap-1.5 text-[10px] font-mono text-[#00D6A0]">
              <span className="w-2 h-2 rounded-full bg-[#00D6A0] animate-pulse" />
              <span>LIVE SENSOR FEED</span>
            </div>
          </>
        )}

        {/* Idle Placeholder */}
        {cameraState === 'idle' && (
          <div className="p-8 text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#0B1C32] border border-[#1B3A5C] mx-auto flex items-center justify-center shadow-inner">
              <CameraOff className="w-8 h-8 text-[#9EB2CC]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#F4F8FF]">Camera Inactive</h4>
              <p className="text-xs text-[#9EB2CC] mt-1 leading-relaxed">
                Connect your webcam or mobile camera to capture wall runs, equipment plates, or drawings directly into the engineering database.
              </p>
            </div>
            <button
              onClick={() => startCamera('environment')}
              className="px-5 py-2.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-xl text-xs font-bold shadow-lg shadow-[#147DFF]/25 flex items-center gap-2 mx-auto transition-transform active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Activate Camera</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {cameraState === 'starting' && (
          <div className="p-8 text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#18D8F2] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[#9EB2CC] font-mono">Initializing camera sensor stream...</p>
          </div>
        )}

        {/* Error View */}
        {cameraState === 'error' && (
          <div className="p-6 text-center space-y-3 max-w-md">
            <div className="w-12 h-12 rounded-xl bg-[#FF5263]/15 border border-[#FF5263]/30 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#FF5263]" />
            </div>
            <h4 className="text-sm font-bold text-[#FF5263]">Camera Error</h4>
            <p className="text-xs text-[#9EB2CC] leading-relaxed">{errorMessage}</p>
            <button
              onClick={() => startCamera('environment')}
              className="px-4 py-2 bg-[#10243D] hover:bg-[#1B3A5C] text-[#F4F8FF] border border-[#1B3A5C] rounded-lg text-xs font-semibold flex items-center gap-1.5 mx-auto transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#18D8F2]" />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Buttons Bar */}
      {cameraState === 'live' && (
        <div className="p-4 bg-[#0B1C32] border-t border-[#1B3A5C] flex items-center justify-between gap-4">
          <button
            onClick={stopCamera}
            className="px-3.5 py-2 bg-[#061426] hover:bg-[#10243D] text-[#9EB2CC] hover:text-[#F4F8FF] border border-[#1B3A5C] rounded-xl text-xs font-semibold transition-colors"
          >
            Stop Feed
          </button>

          {/* Large Shutter Button */}
          <button
            onClick={handleCapture}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#147DFF] to-[#18D8F2] p-1 shadow-lg shadow-[#147DFF]/40 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer"
            title="Take Photo"
          >
            <div className="w-full h-full rounded-full bg-[#030B18] border-2 border-white flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-[#18D8F2]" />
            </div>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={capturedQueue.length === 0}
            className="px-4 py-2 bg-[#00D6A0] hover:bg-[#00D6A0]/90 disabled:opacity-50 text-[#030B18] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#00D6A0]/20 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Finish ({capturedQueue.length})</span>
          </button>
        </div>
      )}

      {/* Photo Gallery & AI Vision Triggers */}
      {allDisplayPhotos.length > 0 && (
        <div className="p-4 bg-[#061426] border-t border-[#1B3A5C] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#F4F8FF] flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#18D8F2]" />
              Captured Survey Photos ({allDisplayPhotos.length})
            </span>
            <span className="text-[10px] text-[#9EB2CC] font-mono">
              Click photo to inspect or send to Gemini Vision
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {allDisplayPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group relative rounded-xl overflow-hidden border border-[#1B3A5C] bg-[#0B1C32] aspect-video hover:border-[#18D8F2] transition-all cursor-pointer"
                onClick={() => setSelectedPhotoForInspection(photo)}
              >
                <img
                  src={photo.image}
                  alt={photo.note || 'Captured photo'}
                  className="w-full h-full object-cover"
                />

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-1">
                  {onAnalyzePhoto && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalyzePhoto(photo.image);
                      }}
                      className="p-1.5 bg-[#18D8F2] text-[#030B18] rounded-lg text-xs font-bold hover:scale-105 transition-transform"
                      title="Analyze Blueprint / Room with Gemini Vision"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePhoto(photo.id);
                    }}
                    className="p-1.5 bg-[#FF5263] text-white rounded-lg text-xs hover:scale-105 transition-transform"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Photo Inspection Modal */}
      {selectedPhotoForInspection && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-4 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
              <div>
                <h4 className="text-sm font-bold text-[#F4F8FF]">Survey Photo Inspector</h4>
                <p className="text-[10px] text-[#9EB2CC] font-mono">{selectedPhotoForInspection.capturedAt}</p>
              </div>
              <button
                onClick={() => setSelectedPhotoForInspection(null)}
                className="p-1 text-[#9EB2CC] hover:text-[#F4F8FF] rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-[#1B3A5C] max-h-[60vh] flex items-center justify-center bg-black">
              <img
                src={selectedPhotoForInspection.image}
                alt="Enlarged survey view"
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[#9EB2CC]">{selectedPhotoForInspection.note || 'No notes added'}</span>

              <div className="flex items-center gap-2">
                {onAnalyzePhoto && (
                  <button
                    onClick={() => {
                      onAnalyzePhoto(selectedPhotoForInspection.image);
                      setSelectedPhotoForInspection(null);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] text-[#030B18] font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-[#18D8F2]/20"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Run Gemini AI Vision Scan</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedPhotoForInspection(null)}
                  className="px-3.5 py-2 bg-[#061426] hover:bg-[#10243D] text-[#F4F8FF] border border-[#1B3A5C] rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
