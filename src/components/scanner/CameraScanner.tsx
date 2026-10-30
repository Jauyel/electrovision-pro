import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Check, 
  Compass, 
  Sliders, 
  Zap, 
  Download, 
  Ruler, 
  Box, 
  Layers, 
  Trash2, 
  Undo2, 
  Sun, 
  FlipHorizontal, 
  AlertCircle,
  Eye,
  Crosshair,
  Sparkles,
  Info,
  Mic,
  Volume2,
  Wrench,
  CheckCircle2,
  X
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { RoomPhoto, VoiceAnnotation } from '../../types';
import { VoiceAnnotatorModal } from './VoiceAnnotatorModal';
import { VoiceAnnotationsDrawer } from './VoiceAnnotationsDrawer';

export interface CameraScannerProps {
  onApplyDimensions?: (dimensions: { length: number; width: number; height: number; area: number }) => void;
  onCapturePhoto?: (photo: RoomPhoto) => void;
  onClose?: () => void;
  initialUnit?: 'm' | 'ft';
}

interface Point2D {
  x: number; // percentage of viewport width (0 - 100)
  y: number; // percentage of viewport height (0 - 100)
  id: string;
  label?: string;
}

type MeasurementMode = 'perimeter' | 'tape' | 'height' | 'polygon' | 'annotate';
type CameraState = 'idle' | 'requesting' | 'live' | 'error' | 'simulation';

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onApplyDimensions,
  onCapturePhoto,
  onClose,
  initialUnit = 'm'
}) => {
  const { 
    activeProject, 
    updateActiveProject, 
    addActivityLog, 
    triggerSave,
    voiceAnnotations,
    updateVoiceAnnotation,
    deleteVoiceAnnotation
  } = useProject();

  // Field Engineer Voice Annotation State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isVoiceDrawerOpen, setIsVoiceDrawerOpen] = useState<boolean>(false);
  const [selectedVoiceCoordinates, setSelectedVoiceCoordinates] = useState<{ x: number; y: number } | null>(null);
  const [selectedTargetLabel, setSelectedTargetLabel] = useState<string>('');
  const [activeAnnotationCard, setActiveAnnotationCard] = useState<VoiceAnnotation | null>(null);

  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Camera Settings & State
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Measurement State
  const [mode, setMode] = useState<MeasurementMode>('perimeter');
  const [points, setPoints] = useState<Point2D[]>([]);
  const [unit, setUnit] = useState<'m' | 'ft'>(initialUnit);
  const [referenceDistanceMeters, setReferenceDistanceMeters] = useState<number>(3.5); // estimated camera distance
  const [opticalCalibration, setOpticalCalibration] = useState<number>(1.0); // manual calibration multiplier
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [customCeilingHeight, setCustomCeilingHeight] = useState<number>(
    activeProject.roomData?.heightMeters || 2.8
  );

  // Device Orientation (Level / Plumb Gauge)
  const [deviceTilt, setDeviceTilt] = useState<{ pitch: number; roll: number; isLevel: boolean }>({
    pitch: 0,
    roll: 0,
    isLevel: true
  });

  // UI Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Convert distance from meters to chosen unit
  const formatDistance = (meters: number): string => {
    if (unit === 'ft') {
      const feet = meters * 3.28084;
      return `${feet.toFixed(2)} ft`;
    }
    return `${meters.toFixed(2)} m`;
  };

  const formatArea = (sqMeters: number): string => {
    if (unit === 'ft') {
      const sqFt = sqMeters * 10.7639;
      return `${sqFt.toFixed(1)} sq ft`;
    }
    return `${sqMeters.toFixed(2)} m²`;
  };

  // Stop current camera stream
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  }, []);

  // Start real device camera via getUserMedia
  const startCamera = useCallback(async (desiredFacing: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setErrorMessage('');
    setCameraState('requesting');

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('MediaDevices API is not supported in this browser environment. Using AR Simulation mode.');
      setCameraState('simulation');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: desiredFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => {
          console.warn('Video autoPlay prevented:', e);
        });
      }

      // Check for flashlight / torch support
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener('ended', () => {
          stopCameraStream();
          setCameraState('idle');
        }, { once: true });

        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        if (capabilities?.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }
      }

      setCameraState('live');
      showToast('Camera feed calibrated. Tap anywhere to pin architectural measurement anchors.');
    } catch (err: any) {
      console.warn('Camera access denied or failed:', err);
      const isPermissionDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      const msg = isPermissionDenied 
        ? 'Camera permission denied. Switched to high-fidelity AR Simulation mode.'
        : `Camera hardware unavailable (${err?.name || 'Error'}). Switched to AR Simulation mode.`;
      
      setErrorMessage(msg);
      setCameraState('simulation');
    }
  }, [facingMode, stopCameraStream]);

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
      showToast(nextTorch ? 'Auxiliary Flashlight Enabled' : 'Flashlight Disabled');
    } catch (err) {
      console.warn('Torch toggle failed:', err);
    }
  };

  // Flip camera (environment <-> user)
  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (cameraState === 'live') {
      startCamera(nextFacing);
    }
  };

  // Listen to device orientation for horizon / leveling
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const pitch = Math.round(e.beta || 0); // front-to-back tilt in degrees (-180 to 180)
      const roll = Math.round(e.gamma || 0); // left-to-right tilt in degrees (-90 to 90)
      const isLevel = Math.abs(roll) <= 3 && Math.abs(pitch - 75) <= 15; // phone held angled towards floor/wall
      setDeviceTilt({ pitch, roll, isLevel });
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      if (window.DeviceOrientationEvent) {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  // Initialize camera or simulation on mount
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCameraStream();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Distance calculation from percentage coordinates based on optical calibration
  // We model camera field of view: standard smartphone camera has approx 65deg H-FOV
  const calculateRealDistance = (p1: Point2D, p2: Point2D): number => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const normalizedPixelDist = Math.sqrt(dx * dx + dy * dy); // 0 - 100 scale

    // Perspective conversion factor:
    // Distance (m) = (normalizedPixelDist / 100) * (2 * referenceDistance * tan(FOV/2)) * calibration
    const fovRad = (65 * Math.PI) / 180;
    const viewportPhysicalWidth = 2 * referenceDistanceMeters * Math.tan(fovRad / 2);
    const calculatedMeters = (normalizedPixelDist / 100) * viewportPhysicalWidth * opticalCalibration;
    return Math.max(0.1, Number(calculatedMeters.toFixed(2)));
  };

  // Shoelace formula for polygon area
  const calculateFloorArea = (pts: Point2D[]): number => {
    if (pts.length < 3) return 0;
    // Scale coordinates to meters relative to origin pt[0]
    const fovRad = (65 * Math.PI) / 180;
    const viewportPhysicalWidth = 2 * referenceDistanceMeters * Math.tan(fovRad / 2) * opticalCalibration;
    const viewportPhysicalHeight = viewportPhysicalWidth * 0.75; // 4:3 or 16:9 aspect assumption

    const meterCoords = pts.map(p => ({
      x: (p.x / 100) * viewportPhysicalWidth,
      y: (p.y / 100) * viewportPhysicalHeight
    }));

    let area = 0;
    for (let i = 0; i < meterCoords.length; i++) {
      const j = (i + 1) % meterCoords.length;
      area += meterCoords[i].x * meterCoords[j].y;
      area -= meterCoords[j].x * meterCoords[i].y;
    }
    return Math.max(0.1, Number((Math.abs(area) / 2).toFixed(2)));
  };

  // Derive measured dimensions based on placed points
  const derivedDimensions = (() => {
    if (mode === 'height' && points.length >= 2) {
      const h = calculateRealDistance(points[0], points[1]);
      return {
        length: activeProject.roomData?.lengthMeters || 5.0,
        width: activeProject.roomData?.widthMeters || 4.0,
        height: h,
        area: (activeProject.roomData?.lengthMeters || 5.0) * (activeProject.roomData?.widthMeters || 4.0),
        perimeter: 0
      };
    }

    if (mode === 'tape' && points.length >= 2) {
      const dist = calculateRealDistance(points[0], points[1]);
      return {
        length: dist,
        width: activeProject.roomData?.widthMeters || 4.0,
        height: customCeilingHeight,
        area: dist * (activeProject.roomData?.widthMeters || 4.0),
        perimeter: dist * 2
      };
    }

    if (mode === 'perimeter' && points.length >= 4) {
      // 4 corners of floor: Wall 0-1, Wall 1-2, Wall 2-3, Wall 3-0
      const d01 = calculateRealDistance(points[0], points[1]);
      const d12 = calculateRealDistance(points[1], points[2]);
      const d23 = calculateRealDistance(points[2], points[3]);
      const d30 = calculateRealDistance(points[3], points[0]);

      const avgLength = Number(((d01 + d23) / 2).toFixed(2));
      const avgWidth = Number(((d12 + d30) / 2).toFixed(2));
      const polygonArea = calculateFloorArea(points);
      const area = polygonArea > 0 ? polygonArea : Number((avgLength * avgWidth).toFixed(2));
      const perimeter = Number((d01 + d12 + d23 + d30).toFixed(2));

      return {
        length: Math.max(1.0, avgLength),
        width: Math.max(1.0, avgWidth),
        height: customCeilingHeight,
        area,
        perimeter
      };
    }

    if (mode === 'polygon' && points.length >= 3) {
      let perim = 0;
      for (let i = 0; i < points.length; i++) {
        const next = points[(i + 1) % points.length];
        perim += calculateRealDistance(points[i], next);
      }
      const area = calculateFloorArea(points);
      const estDim = Math.sqrt(area);
      return {
        length: Number(estDim.toFixed(2)) || 4.0,
        width: Number(estDim.toFixed(2)) || 4.0,
        height: customCeilingHeight,
        area,
        perimeter: Number(perim.toFixed(2))
      };
    }

    // Default fallback to project values
    return {
      length: activeProject.roomData?.lengthMeters || 5.0,
      width: activeProject.roomData?.widthMeters || 4.0,
      height: customCeilingHeight,
      area: (activeProject.roomData?.lengthMeters || 5.0) * (activeProject.roomData?.widthMeters || 4.0),
      perimeter: 18.0
    };
  })();

  // Handle clicking / tapping to place a measurement pin
  const handleViewportClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    // In annotate mode, clicking places a voice annotation pin
    if (mode === 'annotate') {
      setSelectedVoiceCoordinates({ x, y });
      setSelectedTargetLabel(`Camera Pin (${x.toFixed(0)}%, ${y.toFixed(0)}%)`);
      setIsVoiceModalOpen(true);
      return;
    }

    // Check limits per mode
    if (mode === 'tape' && points.length >= 2) {
      setPoints([{ x, y, id: `pt-${Date.now()}-1`, label: 'Anchor A' }]);
      return;
    }
    if (mode === 'height' && points.length >= 2) {
      setPoints([{ x, y, id: `pt-${Date.now()}-1`, label: 'Floor Level' }]);
      return;
    }
    if (mode === 'perimeter' && points.length >= 4) {
      // Start a fresh 4-corner scan
      setPoints([{ x, y, id: `pt-${Date.now()}-1`, label: 'Corner 1' }]);
      return;
    }

    const labels = mode === 'height'
      ? ['Floor Datum', 'Ceiling Plane']
      : mode === 'tape'
      ? ['Wall Start A', 'Wall End B']
      : ['Corner 1', 'Corner 2', 'Corner 3', 'Corner 4', 'Corner 5', 'Corner 6'];

    const newPoint: Point2D = {
      x,
      y,
      id: `pt-${Date.now()}-${points.length + 1}`,
      label: labels[points.length] || `Node ${points.length + 1}`
    };

    setPoints(prev => [...prev, newPoint]);
  };

  // Handle mouse move over container for interactive cursor & laser raycast
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setHoverPos({ x, y });
  };

  // Undo last point
  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  // Clear all points
  const handleClear = () => {
    setPoints([]);
    showToast('Measurement anchors cleared');
  };

  // Apply measured room dimensions to active project
  const handleApplyDimensions = () => {
    const { length, width, height, area } = derivedDimensions;

    updateActiveProject(prev => ({
      ...prev,
      roomData: {
        ...prev.roomData,
        lengthMeters: length,
        widthMeters: width,
        heightMeters: height,
        scanDate: new Date().toISOString()
      }
    }));

    addActivityLog({
      action: 'AR Room Dimension Capture',
      details: `Captured room dimensions: ${length}m × ${width}m × ${height}m (Area: ${area} m²) via CameraScanner`,
      category: 'scanner',
      status: 'completed',
      user: 'ElectroVision AI Scanner',
      moduleTarget: 'scanner'
    });

    triggerSave();
    if (onApplyDimensions) {
      onApplyDimensions({ length, width, height, area });
    }
    showToast(`Saved to project: ${length}m × ${width}m × ${height}m`);
  };

  // Capture Annotated Snapshot with overlay
  const handleCaptureSnapshot = () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!container || !canvas) return;

    // Create offscreen merged canvas
    const offscreen = document.createElement('canvas');
    const w = canvas.width || 1280;
    const h = canvas.height || 720;
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    // Draw background (either video frame or simulation background)
    if (cameraState === 'live' && video && video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, w, h);
    } else {
      // Render simulation background
      ctx.fillStyle = '#061426';
      ctx.fillRect(0, 0, w, h);
      // Perspective architectural lines
      ctx.strokeStyle = '#18D8F222';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    // Overlay the measurement canvas on top
    ctx.drawImage(canvas, 0, 0, w, h);

    // Architectural metadata stamp in corner
    ctx.fillStyle = 'rgba(6, 20, 38, 0.85)';
    ctx.fillRect(20, h - 90, 360, 70);
    ctx.strokeStyle = '#18D8F2';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, h - 90, 360, 70);

    ctx.fillStyle = '#18D8F2';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`ELECTROVISION AR MEASUREMENT`, 35, h - 68);
    ctx.fillStyle = '#00D6A0';
    ctx.font = '12px monospace';
    ctx.fillText(`DIMENSIONS: ${derivedDimensions.length}m x ${derivedDimensions.width}m x ${derivedDimensions.height}m`, 35, h - 48);
    ctx.fillStyle = '#9EB2CC';
    ctx.font = '10px monospace';
    ctx.fillText(`AREA: ${derivedDimensions.area} m² | TIME: ${new Date().toLocaleTimeString()}`, 35, h - 30);

    const dataUrl = offscreen.toDataURL('image/jpeg', 0.92);

    const newPhoto: RoomPhoto = {
      id: `photo-ar-${Date.now()}`,
      image: dataUrl,
      capturedAt: new Date().toISOString(),
      note: `AR Measure: ${derivedDimensions.length}m x ${derivedDimensions.width}m x ${derivedDimensions.height}m (${derivedDimensions.area}m²)`,
      source: 'camera'
    };

    updateActiveProject(prev => ({
      ...prev,
      roomData: {
        ...prev.roomData,
        photos: [...(prev.roomData.photos || []), newPhoto]
      }
    }));

    if (onCapturePhoto) {
      onCapturePhoto(newPhoto);
    }

    showToast('High-Res AR Blueprint photo captured and attached to project!');
  };

  // RENDER CANVAS OVERLAY LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId: number;
    let scanLineY = 0;

    const render = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const width = rect.width;
      const height = rect.height;

      // 1. If in simulation mode, draw synthetic architectural room wireframe
      if (cameraState === 'simulation') {
        ctx.save();
        // Horizon vanishing point
        const vpX = width / 2;
        const vpY = height * 0.42;

        // Perspective floor grid
        ctx.strokeStyle = 'rgba(24, 216, 242, 0.15)';
        ctx.lineWidth = 1;
        const numFloorRays = 16;
        for (let i = -numFloorRays; i <= numFloorRays; i++) {
          ctx.beginPath();
          ctx.moveTo(vpX, vpY);
          ctx.lineTo(vpX + i * (width / 8), height);
          ctx.stroke();
        }

        // Horizontal depth rings on floor
        for (let yRatio = 0.5; yRatio <= 1.0; yRatio += 0.08) {
          const y = vpY + (height - vpY) * Math.pow(yRatio, 2);
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Room back wall box
        const bwW = width * 0.45;
        const bwH = height * 0.35;
        const bwLeft = (width - bwW) / 2;
        const bwTop = vpY - bwH * 0.6;
        ctx.strokeStyle = 'rgba(0, 214, 160, 0.3)';
        ctx.strokeRect(bwLeft, bwTop, bwW, bwH);

        // Corner projection lines to screen edges
        ctx.beginPath();
        ctx.moveTo(bwLeft, bwTop);
        ctx.lineTo(0, 0);
        ctx.moveTo(bwLeft + bwW, bwTop);
        ctx.lineTo(width, 0);
        ctx.moveTo(bwLeft, bwTop + bwH);
        ctx.lineTo(0, height);
        ctx.moveTo(bwLeft + bwW, bwTop + bwH);
        ctx.lineTo(width, height);
        ctx.stroke();

        ctx.restore();
      }

      // 2. Animated Laser Sweep Line
      scanLineY = (scanLineY + 1.2) % height;
      const grad = ctx.createLinearGradient(0, scanLineY - 30, 0, scanLineY);
      grad.addColorStop(0, 'rgba(24, 216, 242, 0)');
      grad.addColorStop(1, 'rgba(24, 216, 242, 0.18)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanLineY - 30, width, 30);
      ctx.strokeStyle = 'rgba(24, 216, 242, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, scanLineY);
      ctx.lineTo(width, scanLineY);
      ctx.stroke();

      // 3. Central AR Crosshair / Tactical Reticle
      const cx = width / 2;
      const cy = height / 2;
      ctx.save();
      ctx.strokeStyle = deviceTilt.isLevel ? '#00D6A0' : '#18D8F2';
      ctx.lineWidth = 1.2;

      // Outer targeting brackets
      const bracketSize = 22;
      const bracketGap = 8;
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(cx - bracketGap - bracketSize, cy - bracketGap);
      ctx.lineTo(cx - bracketGap, cy - bracketGap);
      ctx.lineTo(cx - bracketGap, cy - bracketGap - bracketSize);
      ctx.stroke();
      // Top-Right
      ctx.beginPath();
      ctx.moveTo(cx + bracketGap + bracketSize, cy - bracketGap);
      ctx.lineTo(cx + bracketGap, cy - bracketGap);
      ctx.lineTo(cx + bracketGap, cy - bracketGap - bracketSize);
      ctx.stroke();
      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(cx - bracketGap - bracketSize, cy + bracketGap);
      ctx.lineTo(cx - bracketGap, cy + bracketGap);
      ctx.lineTo(cx - bracketGap, cy + bracketGap + bracketSize);
      ctx.stroke();
      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(cx + bracketGap + bracketSize, cy + bracketGap);
      ctx.lineTo(cx + bracketGap, cy + bracketGap);
      ctx.lineTo(cx + bracketGap, cy + bracketGap + bracketSize);
      ctx.stroke();

      // Center laser dot
      ctx.fillStyle = deviceTilt.isLevel ? '#00D6A0' : '#FF5263';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Horizon leveling line
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((deviceTilt.roll * Math.PI) / 180);
      ctx.strokeStyle = deviceTilt.isLevel ? 'rgba(0, 214, 160, 0.7)' : 'rgba(255, 154, 36, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-50, 0);
      ctx.lineTo(-25, 0);
      ctx.moveTo(25, 0);
      ctx.lineTo(50, 0);
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // 4. Render Polygon Floor Plane if 3+ points in perimeter or polygon mode
      if ((mode === 'perimeter' || mode === 'polygon') && points.length >= 3) {
        ctx.save();
        ctx.beginPath();
        const p0 = { x: (points[0].x / 100) * width, y: (points[0].y / 100) * height };
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < points.length; i++) {
          const pt = { x: (points[i].x / 100) * width, y: (points[i].y / 100) * height };
          ctx.lineTo(pt.x, pt.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(24, 216, 242, 0.12)';
        ctx.fill();
        ctx.restore();
      }

      // 5. Render Connected Laser Lines & Measurement Callouts between Points
      if (points.length > 1) {
        const isClosedLoop = (mode === 'perimeter' && points.length >= 4) || (mode === 'polygon' && points.length >= 3);
        const loopCount = isClosedLoop ? points.length : points.length - 1;

        for (let i = 0; i < loopCount; i++) {
          const pA = points[i];
          const pB = points[(i + 1) % points.length];
          const ax = (pA.x / 100) * width;
          const ay = (pA.y / 100) * height;
          const bx = (pB.x / 100) * width;
          const by = (pB.y / 100) * height;

          // Glowing laser line
          ctx.save();
          ctx.shadowColor = '#18D8F2';
          ctx.shadowBlur = 8;
          ctx.strokeStyle = '#18D8F2';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();

          // Millimeter tick marks along line
          const segDist = calculateRealDistance(pA, pB);
          const midX = (ax + bx) / 2;
          const midY = (ay + by) / 2;

          // Perpendicular angle for ticks & label
          const angle = Math.atan2(by - ay, bx - ax);
          const perpAngle = angle + Math.PI / 2;

          // Draw end ticks
          const tickLen = 8;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(ax - Math.cos(perpAngle) * tickLen, ay - Math.sin(perpAngle) * tickLen);
          ctx.lineTo(ax + Math.cos(perpAngle) * tickLen, ay + Math.sin(perpAngle) * tickLen);
          ctx.moveTo(bx - Math.cos(perpAngle) * tickLen, by - Math.sin(perpAngle) * tickLen);
          ctx.lineTo(bx + Math.cos(perpAngle) * tickLen, by + Math.sin(perpAngle) * tickLen);
          ctx.stroke();

          // Measurement badge pill in middle of line
          ctx.shadowBlur = 0;
          const text = formatDistance(segDist);
          ctx.font = 'bold 11px monospace';
          const textMetrics = ctx.measureText(text);
          const padX = 8;
          const padY = 4;
          const badgeW = textMetrics.width + padX * 2;
          const badgeH = 18;

          ctx.fillStyle = 'rgba(6, 20, 38, 0.9)';
          ctx.strokeStyle = '#00D6A0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(midX - badgeW / 2, midY - badgeH / 2, badgeW, badgeH, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#00D6A0';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, midX, midY);

          ctx.restore();
        }
      }

      // 6. Dynamic Laser Guide from last placed point to active cursor hover
      if (points.length > 0 && hoverPos) {
        const lastPt = points[points.length - 1];
        const lx = (lastPt.x / 100) * width;
        const ly = (lastPt.y / 100) * height;
        const hx = (hoverPos.x / 100) * width;
        const hy = (hoverPos.y / 100) * height;

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(255, 154, 36, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        ctx.restore();
      }

      // 7. Render Pinned Nodes / Anchors
      points.forEach((pt, index) => {
        const px = (pt.x / 100) * width;
        const py = (pt.y / 100) * height;

        ctx.save();
        // Outer pulsing ring
        ctx.strokeStyle = '#18D8F2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = '#00D6A0';
        ctx.shadowColor = '#00D6A0';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pin Label
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(6, 20, 38, 0.85)';
        ctx.strokeStyle = '#1B3A5C';
        ctx.lineWidth = 1;
        const labelText = `${pt.label || `P${index + 1}`}`;
        ctx.font = 'bold 10px monospace';
        const labelW = ctx.measureText(labelText).width + 8;
        ctx.roundRect(px + 12, py - 9, labelW, 18, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F4F8FF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, px + 16, py);

        ctx.restore();
      });

      // 8. Render Field Voice Annotation Pins
      const currentAnnotations = activeProject.voiceAnnotations || [];
      currentAnnotations.forEach((va) => {
        if (!va.coordinates) return;
        const vx = (va.coordinates.x / 100) * width;
        const vy = (va.coordinates.y / 100) * height;

        ctx.save();
        const pinColor = va.resolved 
          ? '#00D6A0' 
          : va.category === 'defect' 
          ? '#FF5263' 
          : va.category === 'safety' 
          ? '#FFB800' 
          : va.category === 'punch_list' 
          ? '#FF9A24' 
          : '#18D8F2';

        // Outer pulsing ring
        const pulse = 10 + Math.sin(Date.now() / 250) * 2;
        ctx.strokeStyle = pinColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(vx, vy, pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = pinColor;
        ctx.shadowColor = pinColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(vx, vy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pin Badge Pill
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(6, 20, 38, 0.9)';
        ctx.strokeStyle = pinColor;
        ctx.lineWidth = 1;
        const badgeText = `🎙️ ${va.targetLabel}`;
        ctx.font = 'bold 10px monospace';
        const bW = ctx.measureText(badgeText).width + 8;
        ctx.roundRect(vx + 14, vy - 9, bW, 18, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F4F8FF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, vx + 18, vy);

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [points, hoverPos, mode, unit, referenceDistanceMeters, opticalCalibration, cameraState, deviceTilt, activeProject.voiceAnnotations]);

  return (
    <div 
      className={`relative flex flex-col bg-[#030B18] border border-[#1B3A5C] rounded-2xl overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full min-h-[580px]'
      }`}
    >
      {/* TOP HUD BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#061426]/95 border-b border-[#1B3A5C] backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#18D8F2]/10 border border-[#18D8F2]/30 text-[#18D8F2]">
              <Crosshair className="w-4 h-4 animate-spin-slow" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-[#F4F8FF]">
                  ElectroVision AR Camera Scanner
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border ${
                  cameraState === 'live' 
                    ? 'bg-[#00D6A0]/15 border-[#00D6A0]/40 text-[#00D6A0]'
                    : cameraState === 'simulation'
                    ? 'bg-[#FF9A24]/15 border-[#FF9A24]/40 text-[#FF9A24]'
                    : 'bg-[#9EB2CC]/15 border-[#9EB2CC]/40 text-[#9EB2CC]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    cameraState === 'live' ? 'bg-[#00D6A0] animate-pulse' : cameraState === 'simulation' ? 'bg-[#FF9A24]' : 'bg-[#9EB2CC]'
                  }`} />
                  {cameraState === 'live' ? 'CAMERA LIVE' : cameraState === 'simulation' ? 'AR SIMULATION' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[11px] text-[#9EB2CC] hidden sm:block">
                Optical room geometry capture & real-time dimensional CAD mapping
              </p>
            </div>
          </div>
        </div>

        {/* Field Voice Annotations Drawer Trigger & Quick Mic */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVoiceDrawerOpen(true)}
            className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-[#18D8F2]/40 bg-[#18D8F2]/10 hover:bg-[#18D8F2]/20 text-[#18D8F2] flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Open Field Engineer Voice Annotations & Punch List"
          >
            <Mic className="w-3.5 h-3.5 text-[#18D8F2]" />
            <span>Field Notes</span>
            <span className="px-1.5 py-0.2 rounded bg-[#18D8F2] text-[#030B18] text-[10px] font-bold">
              {voiceAnnotations.length}
            </span>
          </button>

          <button
            onClick={() => {
              setSelectedVoiceCoordinates(null);
              setSelectedTargetLabel('');
              setIsVoiceModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#9EB2CC] hover:text-[#18D8F2] transition-colors cursor-pointer"
            title="Dictate New Voice Note"
          >
            <Mic className="w-4 h-4 text-[#18D8F2]" />
          </button>
        </div>

        {/* Level / Horizon Plumb Indicator */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
            deviceTilt.isLevel 
              ? 'bg-[#00D6A0]/10 border-[#00D6A0]/30 text-[#00D6A0]'
              : 'bg-[#0B1C32] border-[#1B3A5C] text-[#9EB2CC]'
          }`}>
            <Compass className="w-3.5 h-3.5" />
            <span>Tilt: {deviceTilt.roll}°</span>
            {deviceTilt.isLevel && <span className="font-bold text-[9px] uppercase tracking-wider">Level</span>}
          </div>

          {/* Unit Toggle */}
          <div className="flex bg-[#0B1C32] p-0.5 rounded-lg border border-[#1B3A5C]">
            <button
              onClick={() => setUnit('m')}
              className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all ${
                unit === 'm' ? 'bg-[#18D8F2] text-[#030B18]' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              Meters (m)
            </button>
            <button
              onClick={() => setUnit('ft')}
              className={`px-2 py-0.5 text-[10px] rounded font-bold transition-all ${
                unit === 'ft' ? 'bg-[#18D8F2] text-[#030B18]' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              Feet (ft)
            </button>
          </div>

          {/* Torch toggle if available */}
          {hasTorch && cameraState === 'live' && (
            <button
              onClick={toggleTorch}
              className={`p-1.5 rounded-lg border transition-all ${
                isTorchOn 
                  ? 'bg-[#FF9A24]/20 border-[#FF9A24] text-[#FF9A24]' 
                  : 'bg-[#0B1C32] border-[#1B3A5C] text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
              title="Toggle Flashlight / Torch"
            >
              <Sun className="w-4 h-4" />
            </button>
          )}

          {/* Switch Camera (Front / Rear) */}
          {cameraState === 'live' && (
            <button
              onClick={toggleFacingMode}
              className="p-1.5 rounded-lg bg-[#0B1C32] border border-[#1B3A5C] text-[#9EB2CC] hover:text-[#18D8F2] transition-colors"
              title="Switch Camera (Front / Rear)"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-[#0B1C32] border border-[#1B3A5C] text-[#9EB2CC] hover:text-[#18D8F2] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-xs text-[#9EB2CC] hover:text-[#FF5263] border border-[#1B3A5C] rounded-lg"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* ERROR / NOTIFICATION BANNER */}
      {errorMessage && cameraState === 'simulation' && (
        <div className="bg-[#FF9A24]/10 border-b border-[#FF9A24]/30 px-4 py-2 text-xs text-[#FF9A24] flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button 
            onClick={() => startCamera(facingMode)}
            className="text-[11px] underline font-bold hover:text-white"
          >
            Retry Camera Access
          </button>
        </div>
      )}

      {/* TOAST POPUP */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-[#0B1C32]/95 border border-[#18D8F2] text-[#F4F8FF] px-4 py-2 rounded-xl text-xs font-mono shadow-2xl flex items-center gap-2 animate-fade-in backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-[#18D8F2]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN VIEWPORT WITH VIDEO & OVERLAY CANVAS */}
      <div 
        ref={containerRef}
        onClick={handleViewportClick}
        onMouseMove={handleMouseMove}
        className="relative flex-1 min-h-[460px] bg-[#020712] cursor-crosshair select-none overflow-hidden"
      >
        {/* Real HTML5 Camera Video */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            cameraState === 'live' ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Real-Time AR Measurement Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* On-screen Instruction Pill */}
        <div className="absolute top-4 left-4 z-20 bg-[#061426]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1B3A5C] text-[11px] font-mono text-[#9EB2CC] flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#18D8F2] animate-ping" />
          {mode === 'perimeter' && (
            <span>Tap 4 floor corners (anchors placed: {points.length}/4)</span>
          )}
          {mode === 'tape' && (
            <span>Tap Point A then Point B to measure wall length (anchors: {points.length}/2)</span>
          )}
          {mode === 'height' && (
            <span>Tap Floor datum then Ceiling plane (anchors: {points.length}/2)</span>
          )}
          {mode === 'polygon' && (
            <span>Tap consecutive room corners to trace perimeter (anchors: {points.length})</span>
          )}
          {mode === 'annotate' && (
            <span className="text-[#FF9A24] font-bold">Voice Annotate Mode: Tap any component or area on camera to record voice note</span>
          )}
        </div>

        {/* Interactive Voice Annotation Overlay Pins on Camera Viewport */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {voiceAnnotations.map((va) => {
            if (!va.coordinates) return null;
            const catColor = va.resolved 
              ? 'border-[#00D6A0] bg-[#00D6A0]/20 text-[#00D6A0]' 
              : va.category === 'defect' 
              ? 'border-[#FF5263] bg-[#FF5263]/25 text-[#FF5263]' 
              : va.category === 'safety' 
              ? 'border-[#FFB800] bg-[#FFB800]/25 text-[#FFB800]' 
              : va.category === 'punch_list' 
              ? 'border-[#FF9A24] bg-[#FF9A24]/25 text-[#FF9A24]' 
              : 'border-[#18D8F2] bg-[#18D8F2]/25 text-[#18D8F2]';

            return (
              <div
                key={va.id}
                style={{ left: `${va.coordinates.x}%`, top: `${va.coordinates.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto group cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveAnnotationCard(va);
                }}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform group-hover:scale-125 ${catColor}`}>
                  <Mic className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-current animate-ping opacity-75" />
                </div>

                {/* Floating Tooltip Card */}
                <div className="absolute left-9 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col w-56 p-2.5 bg-[#061426]/95 border border-[#1B3A5C] rounded-xl shadow-2xl backdrop-blur-md z-30 text-left pointer-events-none font-sans">
                  <div className="flex items-center justify-between text-[10px] font-mono pb-1 border-b border-[#1B3A5C]">
                    <span className="font-bold text-[#F4F8FF] truncate">{va.targetLabel}</span>
                    <span className="text-[#9EB2CC]">{va.exactTime}</span>
                  </div>
                  <p className="text-[11px] text-[#F4F8FF] mt-1 line-clamp-2 italic">
                    "{va.transcript}"
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[9px] font-mono">
                    <span className="text-[#18D8F2]">Click to open details</span>
                    <span className={va.resolved ? 'text-[#00D6A0]' : 'text-[#FF9A24]'}>
                      {va.resolved ? 'RESOLVED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Annotation Quick Inspection Card */}
        {activeAnnotationCard && (
          <div className="absolute bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-30 bg-[#061426]/95 border border-[#18D8F2] rounded-2xl p-3.5 shadow-2xl backdrop-blur-md animate-fade-in space-y-2">
            <div className="flex items-center justify-between border-b border-[#1B3A5C] pb-2">
              <div className="flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-[#18D8F2]" />
                <span className="text-xs font-mono font-bold text-[#F4F8FF] truncate">
                  {activeAnnotationCard.targetLabel}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveAnnotationCard(null);
                }}
                className="p-1 text-[#9EB2CC] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#F4F8FF] italic font-sans bg-[#030B18] p-2 rounded-lg border border-[#1B3A5C]">
              "{activeAnnotationCard.transcript}"
            </p>

            <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
              <span className="text-[#9EB2CC]">{activeAnnotationCard.timestamp} {activeAnnotationCard.exactTime}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance(activeAnnotationCard.transcript);
                      window.speechSynthesis.speak(u);
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-[#0B1C32] hover:bg-[#10243D] text-[#18D8F2] border border-[#1B3A5C] flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Listen</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateVoiceAnnotation(activeAnnotationCard.id, { resolved: !activeAnnotationCard.resolved });
                    setActiveAnnotationCard(prev => prev ? { ...prev, resolved: !prev.resolved } : null);
                  }}
                  className={`px-2 py-0.5 rounded border cursor-pointer ${
                    activeAnnotationCard.resolved
                      ? 'bg-[#00D6A0]/20 border-[#00D6A0]/40 text-[#00D6A0]'
                      : 'bg-[#FF9A24]/20 border-[#FF9A24]/40 text-[#FF9A24]'
                  }`}
                >
                  {activeAnnotationCard.resolved ? 'Resolved' : 'Resolve'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live HUD Telemetry Card (Top Right Floating) */}
        <div className="absolute top-4 right-4 z-20 w-64 bg-[#061426]/90 backdrop-blur-md border border-[#1B3A5C] rounded-xl p-3 shadow-xl space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1B3A5C] text-xs font-mono font-bold text-[#18D8F2]">
            <span className="flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" />
              Live Telemetry
            </span>
            <span className="text-[10px] text-[#00D6A0] bg-[#00D6A0]/10 px-1.5 py-0.5 rounded border border-[#00D6A0]/20">
              {unit === 'm' ? 'METRIC' : 'IMPERIAL'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-1.5 rounded bg-[#0B1C32] border border-[#1B3A5C]">
              <span className="text-[10px] text-[#9EB2CC] block">Room Length (L)</span>
              <span className="text-sm font-bold text-[#F4F8FF]">
                {formatDistance(derivedDimensions.length)}
              </span>
            </div>
            <div className="p-1.5 rounded bg-[#0B1C32] border border-[#1B3A5C]">
              <span className="text-[10px] text-[#9EB2CC] block">Room Width (W)</span>
              <span className="text-sm font-bold text-[#F4F8FF]">
                {formatDistance(derivedDimensions.width)}
              </span>
            </div>
            <div className="p-1.5 rounded bg-[#0B1C32] border border-[#1B3A5C]">
              <span className="text-[10px] text-[#9EB2CC] block">Height (H)</span>
              <span className="text-sm font-bold text-[#FF9A24]">
                {formatDistance(derivedDimensions.height)}
              </span>
            </div>
            <div className="p-1.5 rounded bg-[#0B1C32] border border-[#1B3A5C]">
              <span className="text-[10px] text-[#9EB2CC] block">Floor Area</span>
              <span className="text-sm font-bold text-[#00D6A0]">
                {formatArea(derivedDimensions.area)}
              </span>
            </div>
          </div>

          <div className="pt-1 text-[10px] font-mono text-[#9EB2CC] flex items-center justify-between">
            <span>Room Volume:</span>
            <strong className="text-[#F4F8FF]">
              {(derivedDimensions.area * derivedDimensions.height).toFixed(1)} {unit === 'm' ? 'm³' : 'ft³'}
            </strong>
          </div>
        </div>

        {/* Floating Bottom Quick Actions Dock */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 bg-[#061426]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-[#1B3A5C] shadow-2xl">
          {/* Mode Selectors */}
          <div className="flex bg-[#0B1C32] p-1 rounded-xl border border-[#1B3A5C] gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setMode('perimeter'); setPoints([]); }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                mode === 'perimeter'
                  ? 'bg-[#18D8F2] text-[#030B18] shadow-md'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              4-Corner Floor
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setMode('tape'); setPoints([]); }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                mode === 'tape'
                  ? 'bg-[#18D8F2] text-[#030B18] shadow-md'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              Laser Tape (2 Pt)
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setMode('height'); setPoints([]); }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                mode === 'height'
                  ? 'bg-[#18D8F2] text-[#030B18] shadow-md'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Ceiling Plumb
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setMode('polygon'); setPoints([]); }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                mode === 'polygon'
                  ? 'bg-[#18D8F2] text-[#030B18] shadow-md'
                  : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Multi-Wall
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setMode('annotate'); }}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'annotate'
                  ? 'bg-gradient-to-r from-[#FF5263] to-[#FF9A24] text-white shadow-md shadow-[#FF5263]/30 animate-pulse'
                  : 'text-[#FF9A24] hover:text-[#F4F8FF]'
              }`}
              title="Voice Annotation Mode: Tap anywhere on camera view to record voice note"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Pin</span>
              {voiceAnnotations.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-black/40 text-white font-mono">
                  {voiceAnnotations.length}
                </span>
              )}
            </button>
          </div>

          <div className="h-6 w-px bg-[#1B3A5C] mx-1 hidden sm:block" />

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); handleUndo(); }}
              disabled={points.length === 0}
              className="p-2 rounded-xl bg-[#0B1C32] border border-[#1B3A5C] text-[#9EB2CC] hover:text-[#F4F8FF] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Undo Last Anchor Point"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleClear(); }}
              disabled={points.length === 0}
              className="p-2 rounded-xl bg-[#0B1C32] border border-[#1B3A5C] text-[#9EB2CC] hover:text-[#FF5263] disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Clear All Anchor Points"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleCaptureSnapshot(); }}
              className="px-3 py-2 rounded-xl bg-[#10243D] hover:bg-[#153052] border border-[#18D8F2]/50 text-[#18D8F2] text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md"
              title="Save Overlay Snapshot to Project Photos"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Snapshot</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleApplyDimensions(); }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00D6A0] to-[#00B887] hover:brightness-110 text-[#030B18] text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-[#00D6A0]/20 transition-all"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Apply to Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM CALIBRATION & PERSPECTIVE SETTINGS TRAY */}
      <div className="px-4 py-3 bg-[#061426] border-t border-[#1B3A5C] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-5">
          {/* Estimated Distance to Surface */}
          <div className="flex items-center gap-2">
            <span className="text-[#9EB2CC] text-[11px]">Optical Focal Depth:</span>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.1"
              value={referenceDistanceMeters}
              onChange={(e) => setReferenceDistanceMeters(parseFloat(e.target.value))}
              className="w-24 accent-[#18D8F2] cursor-pointer"
            />
            <span className="text-[#18D8F2] font-bold text-[11px] w-12">
              {referenceDistanceMeters.toFixed(1)} m
            </span>
          </div>

          {/* Scale Fine-Tuning Multiplier */}
          <div className="flex items-center gap-2">
            <span className="text-[#9EB2CC] text-[11px]">Scale Calibrator:</span>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={opticalCalibration}
              onChange={(e) => setOpticalCalibration(parseFloat(e.target.value))}
              className="w-20 accent-[#00D6A0] cursor-pointer"
            />
            <span className="text-[#00D6A0] font-bold text-[11px] w-10">
              {opticalCalibration.toFixed(2)}x
            </span>
          </div>

          {/* Default Ceiling Height */}
          <div className="flex items-center gap-2">
            <span className="text-[#9EB2CC] text-[11px]">Ceiling Plumb:</span>
            <input
              type="number"
              step="0.05"
              min="1.8"
              max="6.0"
              value={customCeilingHeight}
              onChange={(e) => setCustomCeilingHeight(parseFloat(e.target.value) || 2.8)}
              className="w-16 px-1.5 py-0.5 bg-[#0B1C32] border border-[#1B3A5C] rounded text-[#F4F8FF] text-center text-[11px]"
            />
            <span className="text-[#9EB2CC] text-[11px]">m</span>
          </div>
        </div>

        {/* Current Active Room Target */}
        <div className="text-[11px] text-[#9EB2CC] flex items-center gap-2">
          <span>Active Target:</span>
          <span className="px-2 py-0.5 bg-[#0B1C32] text-[#F4F8FF] rounded border border-[#1B3A5C]">
            {activeProject.roomData?.roomName || 'Primary Room'} ({activeProject.name})
          </span>
        </div>
      </div>

      {/* Field Engineer Voice Annotator Modal */}
      <VoiceAnnotatorModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        initialCoordinates={selectedVoiceCoordinates}
        initialTargetLabel={selectedTargetLabel}
        onAnnotationSaved={(saved) => {
          showToast(`Voice note pinned to ${saved.targetLabel}`);
          setActiveAnnotationCard(saved);
        }}
      />

      {/* Field Engineer Voice Annotations Slide-Over Drawer */}
      <VoiceAnnotationsDrawer
        isOpen={isVoiceDrawerOpen}
        onClose={() => setIsVoiceDrawerOpen(false)}
        onOpenRecordModal={() => {
          setSelectedVoiceCoordinates(null);
          setSelectedTargetLabel('');
          setIsVoiceModalOpen(true);
        }}
        onFocusAnnotation={(ann) => {
          setIsVoiceDrawerOpen(false);
          setActiveAnnotationCard(ann);
        }}
      />
    </div>
  );
};

export default CameraScanner;
