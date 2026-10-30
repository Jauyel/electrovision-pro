import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  Camera, 
  CameraOff, 
  Crosshair, 
  Ruler, 
  Box, 
  Server, 
  Plug, 
  Lightbulb, 
  Wind, 
  Zap, 
  Check, 
  RotateCcw, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  Download, 
  Layers, 
  Undo2, 
  Compass, 
  Cpu, 
  Maximize2, 
  Minimize2, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Sliders,
  Sun,
  Flame,
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { ElectricalPoint, ElectricalPointType, CADCircuit, CableRoute, RoomPhoto } from '../../types';

export interface SpatialCameraScannerProps {
  onApplyToCAD?: (data: {
    points: ElectricalPoint[];
    circuits: CADCircuit[];
    dimensions: { length: number; width: number; height: number; area: number };
  }) => void;
  onClose?: () => void;
  initialUnit?: 'm' | 'ft';
}

export type SpatialMarkerCategory = 'corner' | 'panel' | 'socket' | 'switch' | 'light' | 'hvac';

export interface SpatialMarker {
  id: string;
  category: SpatialMarkerCategory;
  pointType: ElectricalPointType;
  label: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  heightMm: number; // elevation from floor datum in mm
  wattage: number;
  circuitTag: string; // e.g. QF1, QF2
  phase: 'L1' | 'L2' | 'L3' | '3P';
  color: string;
  distanceToPanelMeters?: number;
}

export const SpatialCameraScanner: React.FC<SpatialCameraScannerProps> = ({
  onApplyToCAD,
  onClose,
  initialUnit = 'm'
}) => {
  const { 
    activeProject, 
    updateActiveProject, 
    addActivityLog, 
    triggerSave,
    setActiveModule 
  } = useProject();

  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Camera State
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'live' | 'simulation' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Measurement & Marker Placement Mode
  const [activeTool, setActiveTool] = useState<SpatialMarkerCategory>('corner');
  const [markers, setMarkers] = useState<SpatialMarker[]>(() => {
    // Initialize with existing project points mapped to spatial markers if available
    const existingPoints = activeProject.roomData?.points || [];
    return existingPoints.map((pt, idx) => {
      let category: SpatialMarkerCategory = 'socket';
      let color = '#18D8F2';
      if (pt.type === 'panel') { category = 'panel'; color = '#EC4899'; }
      else if (pt.type.includes('switch')) { category = 'switch'; color = '#00D6A0'; }
      else if (pt.type.includes('light') || pt.type.includes('spot')) { category = 'light'; color = '#8B5CFF'; }
      else if (pt.type === 'ac_unit' || pt.type === 'boiler') { category = 'hvac'; color = '#FF9A24'; }

      return {
        id: pt.id || `sm-${idx}`,
        category,
        pointType: pt.type,
        label: pt.name,
        x: Math.min(90, Math.max(10, 20 + (idx * 15) % 65)),
        y: Math.min(85, Math.max(25, 40 + (idx * 12) % 45)),
        heightMm: pt.heightMm || 300,
        wattage: pt.wattage || 200,
        circuitTag: pt.circuitId || `QF${(idx % 3) + 1}`,
        phase: idx % 3 === 0 ? 'L1' : idx % 3 === 1 ? 'L2' : 'L3',
        color,
        distanceToPanelMeters: 3.2 + (idx * 1.1)
      };
    });
  });

  // Corner measurement points for room dimensions
  const [cornerPoints, setCornerPoints] = useState<{ x: number; y: number; id: string }[]>([
    { x: 18, y: 78, id: 'c-1' },
    { x: 82, y: 78, id: 'c-2' },
    { x: 74, y: 34, id: 'c-3' },
    { x: 26, y: 34, id: 'c-4' }
  ]);

  // Selected Marker for fine-tuning
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Optical & Measurement calibration
  const [referenceDistanceMeters, setReferenceDistanceMeters] = useState(3.5);
  const [opticalCalibration, setOpticalCalibration] = useState(1.0);
  const [unit, setUnit] = useState<'m' | 'ft'>(initialUnit);
  const [ceilingHeightMeters, setCeilingHeightMeters] = useState(activeProject.roomData?.heightMeters || 3.0);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // CAD Interface Drawer state
  const [isCadPanelExpanded, setIsCadPanelExpanded] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  }, []);

  // Request browser camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user' = facingMode) => {
    stopCamera();
    setErrorMessage('');
    setCameraState('requesting');

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('MediaDevices API not available in this browser. AR Spatial Simulation engaged.');
      setCameraState('simulation');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.warn('AutoPlay delayed:', e));
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        track.addEventListener('ended', () => {
          stopCamera();
          setCameraState('idle');
        }, { once: true });

        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        setHasTorch(!!capabilities?.torch);
      }

      setCameraState('live');
      showToast('Live camera calibrated. Tap anywhere to overlay spatial electrical markers.');
    } catch (err: any) {
      console.warn('Camera access unavailable:', err);
      const isDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
      setErrorMessage(
        isDenied 
          ? 'Camera permission denied. Operating in Spatial AR Simulation mode.'
          : 'Camera device unavailable. Operating in Spatial AR Simulation mode.'
      );
      setCameraState('simulation');
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Torch toggle
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !isTorchOn;
      await (track as any).applyConstraints({ advanced: [{ torch: nextTorch }] });
      setIsTorchOn(nextTorch);
      showToast(nextTorch ? 'Auxiliary Worklight ON' : 'Worklight OFF');
    } catch (err) {
      console.warn('Torch failed:', err);
    }
  };

  // Distance computation between 2 viewport percentages (in meters)
  const calculateRealDistance = (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const fovRad = (65 * Math.PI) / 180;
    const viewportPhysicalWidth = 2 * referenceDistanceMeters * Math.tan(fovRad / 2);
    const meters = (pixelDist / 100) * viewportPhysicalWidth * opticalCalibration;
    return Math.max(0.1, Number(meters.toFixed(2)));
  };

  // Derive measured room dimensions
  const derivedDimensions = useMemo(() => {
    if (cornerPoints.length >= 4) {
      const d01 = calculateRealDistance(cornerPoints[0].x, cornerPoints[0].y, cornerPoints[1].x, cornerPoints[1].y);
      const d12 = calculateRealDistance(cornerPoints[1].x, cornerPoints[1].y, cornerPoints[2].x, cornerPoints[2].y);
      const d23 = calculateRealDistance(cornerPoints[2].x, cornerPoints[2].y, cornerPoints[3].x, cornerPoints[3].y);
      const d30 = calculateRealDistance(cornerPoints[3].x, cornerPoints[3].y, cornerPoints[0].x, cornerPoints[0].y);

      const length = Math.max(2.0, Number(((d01 + d23) / 2).toFixed(2)));
      const width = Math.max(2.0, Number(((d12 + d30) / 2).toFixed(2)));
      const area = Number((length * width).toFixed(1));

      return { length, width, height: ceilingHeightMeters, area };
    }

    return {
      length: activeProject.roomData?.lengthMeters || 6.0,
      width: activeProject.roomData?.widthMeters || 4.5,
      height: ceilingHeightMeters,
      area: (activeProject.roomData?.lengthMeters || 6.0) * (activeProject.roomData?.widthMeters || 4.5)
    };
  }, [cornerPoints, referenceDistanceMeters, opticalCalibration, ceilingHeightMeters, activeProject.roomData]);

  // Find panel location
  const panelMarker = useMemo(() => {
    return markers.find(m => m.category === 'panel') || {
      id: 'default-panel',
      x: 15,
      y: 45,
      label: 'Main Distribution Board'
    };
  }, [markers]);

  // Synthesize CAD Branch Circuits from Placed Spatial Markers
  const synthesizedCadCircuits: CADCircuit[] = useMemo(() => {
    const circuits: CADCircuit[] = [];
    const lightMarkers = markers.filter(m => m.category === 'light');
    const socketMarkers = markers.filter(m => m.category === 'socket');
    const hvacMarkers = markers.filter(m => m.category === 'hvac');

    // 1. Lighting Circuit (QF1)
    if (lightMarkers.length > 0) {
      const totalWatts = lightMarkers.reduce((s, m) => s + m.wattage, 0);
      const maxLen = Math.max(...lightMarkers.map(m => m.distanceToPanelMeters || 12), 15);
      circuits.push({
        id: 'c-ar-qf1',
        tag: 'QF1',
        name: `Architectural Lighting (${lightMarkers.length} Fixtures)`,
        phase: 'L1',
        supplyVoltage: 230,
        powerWatts: Math.max(150, totalWatts),
        powerFactor: 0.95,
        cableLengthMeters: Number(maxLen.toFixed(1)),
        conductor: 'Cu',
        crossSectionMm2: 1.5,
        cableType: 'VVGng-LS 3x1.5',
        installMethod: 'conduit',
        breakerRatingA: 10
      });
    }

    // 2. Power Outlets Circuit (QF2)
    if (socketMarkers.length > 0) {
      const totalWatts = socketMarkers.reduce((s, m) => s + m.wattage, 0);
      const maxLen = Math.max(...socketMarkers.map(m => m.distanceToPanelMeters || 18), 22);
      circuits.push({
        id: 'c-ar-qf2',
        tag: 'QF2',
        name: `General Power Outlets (${socketMarkers.length} Points)`,
        phase: 'L2',
        supplyVoltage: 230,
        powerWatts: Math.max(500, totalWatts),
        powerFactor: 0.95,
        cableLengthMeters: Number(maxLen.toFixed(1)),
        conductor: 'Cu',
        crossSectionMm2: 2.5,
        cableType: 'VVGng-LS 3x2.5',
        installMethod: 'conduit',
        breakerRatingA: 16
      });
    }

    // 3. HVAC & Appliance Feeder (QF3)
    if (hvacMarkers.length > 0) {
      const totalWatts = hvacMarkers.reduce((s, m) => s + m.wattage, 0);
      const maxLen = Math.max(...hvacMarkers.map(m => m.distanceToPanelMeters || 20), 24);
      circuits.push({
        id: 'c-ar-qf3',
        tag: 'QF3',
        name: `Inverter Climate Control (${hvacMarkers.length} Units)`,
        phase: 'L3',
        supplyVoltage: 230,
        powerWatts: Math.max(1200, totalWatts),
        powerFactor: 0.88,
        cableLengthMeters: Number(maxLen.toFixed(1)),
        conductor: 'Cu',
        crossSectionMm2: 4.0,
        cableType: 'VVGng-LS 3x4.0',
        installMethod: 'conduit',
        breakerRatingA: 20
      });
    }

    // If no devices were placed yet, supply standard baseline circuits
    if (circuits.length === 0) {
      circuits.push(
        { id: 'c-base-1', tag: 'QF1', name: 'Ambient Lighting', phase: 'L1', supplyVoltage: 230, powerWatts: 350, powerFactor: 0.95, cableLengthMeters: 20, conductor: 'Cu', crossSectionMm2: 1.5, cableType: 'VVGng-LS 3x1.5', installMethod: 'conduit', breakerRatingA: 10 },
        { id: 'c-base-2', tag: 'QF2', name: 'Wall Receptacles', phase: 'L2', supplyVoltage: 230, powerWatts: 2200, powerFactor: 0.95, cableLengthMeters: 25, conductor: 'Cu', crossSectionMm2: 2.5, cableType: 'VVGng-LS 3x2.5', installMethod: 'conduit', breakerRatingA: 16 }
      );
    }

    return circuits;
  }, [markers]);

  // CAD Metrics Summary
  const cadMetrics = useMemo(() => {
    const totalWatts = synthesizedCadCircuits.reduce((acc, c) => acc + c.powerWatts, 0);
    const totalLoadKw = Number((totalWatts / 1000).toFixed(2));
    const designCurrentA = Number((totalWatts / (230 * 0.92)).toFixed(1));
    const maxDropPercent = Math.max(...synthesizedCadCircuits.map(c => {
      const rho = 0.0175;
      const ib = c.powerWatts / (c.supplyVoltage * c.powerFactor);
      const dropV = (2 * c.cableLengthMeters * ib * c.powerFactor * rho) / c.crossSectionMm2;
      return (dropV / c.supplyVoltage) * 100;
    }), 0.8);

    return {
      totalLoadKw,
      designCurrentA,
      maxDropPercent: Number(maxDropPercent.toFixed(2)),
      recommendedBreaker: designCurrentA > 40 ? '50A 4P C-Curve' : designCurrentA > 25 ? '40A 2P C-Curve' : '32A 2P C-Curve',
      compliance: maxDropPercent <= 3.0 ? 'PUE 7.1 Optimal (≤ 3%)' : 'Derating Review'
    };
  }, [synthesizedCadCircuits]);

  // Handle Viewport Click to place or select a marker
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

    const x = Math.round(((clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((clientY - rect.top) / rect.height) * 100);

    // If Corner tool active, place room corner datum
    if (activeTool === 'corner') {
      if (cornerPoints.length >= 4) {
        setCornerPoints([{ x, y, id: `c-${Date.now()}` }]);
      } else {
        setCornerPoints(prev => [...prev, { x, y, id: `c-${Date.now()}` }]);
      }
      showToast(`Corner Point ${cornerPoints.length + 1} anchored`);
      return;
    }

    // Otherwise place electrical marker
    const distToPanel = calculateRealDistance(x, y, panelMarker.x, panelMarker.y);

    let pointType: ElectricalPointType = 'socket_double';
    let label = 'Double Schuko Socket';
    let heightMm = 300;
    let wattage = 1500;
    let circuitTag = 'QF2';
    let color = '#18D8F2';
    let phase: 'L1' | 'L2' | 'L3' | '3P' = 'L2';

    if (activeTool === 'panel') {
      pointType = 'panel';
      label = 'Main Distribution Board (MDB)';
      heightMm = 1600;
      wattage = 0;
      circuitTag = 'MAIN';
      color = '#EC4899';
      phase = '3P';
    } else if (activeTool === 'switch') {
      pointType = 'switch_2gang';
      label = 'Dual Rocker Switch';
      heightMm = 900;
      wattage = 20;
      circuitTag = 'QF1';
      color = '#00D6A0';
      phase = 'L1';
    } else if (activeTool === 'light') {
      pointType = 'ceiling_light';
      label = 'Recessed LED Downlight';
      heightMm = Math.round(ceilingHeightMeters * 1000);
      wattage = 45;
      circuitTag = 'QF1';
      color = '#8B5CFF';
      phase = 'L1';
    } else if (activeTool === 'hvac') {
      pointType = 'ac_unit';
      label = 'Inverter VRV AC Split';
      heightMm = 2600;
      wattage = 2400;
      circuitTag = 'QF3';
      color = '#FF9A24';
      phase = 'L3';
    }

    const newMarker: SpatialMarker = {
      id: `sm-${Date.now()}`,
      category: activeTool,
      pointType,
      label,
      x,
      y,
      heightMm,
      wattage,
      circuitTag,
      phase,
      color,
      distanceToPanelMeters: distToPanel
    };

    setMarkers(prev => [...prev, newMarker]);
    setSelectedMarkerId(newMarker.id);
    showToast(`Overlayed ${label} (${distToPanel.toFixed(1)}m from panel)`);
  };

  // Delete marker
  const handleDeleteMarker = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMarkers(prev => prev.filter(m => m.id !== id));
    if (selectedMarkerId === id) setSelectedMarkerId(null);
  };

  // Commit spatial data to active project and Electrical CAD module
  const handleCommitToCAD = (autoNavigateToCad = false) => {
    const { length, width, height, area } = derivedDimensions;

    // Convert markers to standard ElectricalPoint objects
    const electricalPoints: ElectricalPoint[] = markers.map(m => {
      let wall: ElectricalPoint['wall'] = 'west';
      if (m.y < 35) wall = 'north';
      else if (m.x > 70) wall = 'east';
      else if (m.y > 65) wall = 'south';
      else if (m.category === 'light') wall = 'ceiling';

      return {
        id: m.id,
        type: m.pointType,
        name: m.label,
        wall,
        x: (m.x / 100) * length,
        y: (m.y / 100) * width,
        heightMm: m.heightMm,
        circuitId: m.circuitTag,
        wattage: m.wattage,
        notes: `Placed via AR Camera Scanner (${m.distanceToPanelMeters?.toFixed(1) || 0}m run)`
      };
    });

    // Synthesize cable runs
    const generatedRoutes: CableRoute[] = synthesizedCadCircuits.map((circ, idx) => ({
      id: `route-ar-${idx}`,
      name: `Feeder ${circ.tag} (${circ.name})`,
      type: circ.tag === 'QF1' ? 'lighting' : circ.tag === 'QF2' ? 'sockets' : 'appliance',
      color: circ.tag === 'QF1' ? '#8B5CFF' : circ.tag === 'QF2' ? '#18D8F2' : '#FF9A24',
      cableType: circ.cableType,
      lengthMeters: circ.cableLengthMeters,
      conduitType: 'PVC Corrugated 20mm',
      pathPoints: [{ x: 0.5, y: 0.5, z: 1.6 }, { x: length * 0.5, y: width * 0.5, z: 2.8 }],
      connectedPoints: electricalPoints.filter(p => p.circuitId === circ.tag).map(p => p.id),
      status: 'planned'
    }));

    updateActiveProject(prev => ({
      ...prev,
      roomData: {
        ...prev.roomData,
        lengthMeters: length,
        widthMeters: width,
        heightMeters: height,
        points: electricalPoints,
        scanDate: new Date().toISOString()
      },
      cadCircuits: synthesizedCadCircuits,
      cableRoutes: generatedRoutes
    }));

    addActivityLog({
      action: 'Spatial AR Scan Committed to CAD',
      details: `Generated ${synthesizedCadCircuits.length} circuits and ${electricalPoints.length} spatial points for ${activeProject.name} (${length}m × ${width}m)`,
      category: 'cad',
      status: 'completed',
      user: 'ElectroVision AR Scanner',
      moduleTarget: 'cad'
    });

    triggerSave();

    if (onApplyToCAD) {
      onApplyToCAD({
        points: electricalPoints,
        circuits: synthesizedCadCircuits,
        dimensions: { length, width, height, area }
      });
    }

    showToast(`Committed ${electricalPoints.length} points and ${synthesizedCadCircuits.length} circuits to Electrical CAD!`);

    if (autoNavigateToCad) {
      window.location.hash = '#/tools/cad';
      setActiveModule('cad');
    }
  };

  // Render Canvas Overlays
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let animId: number;
    let laserScanY = 0;

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

      const w = rect.width;
      const h = rect.height;

      // 1. Synthetic 3D Room Grid if in simulation mode
      if (cameraState === 'simulation') {
        const vpX = w / 2;
        const vpY = h * 0.42;

        ctx.strokeStyle = 'rgba(24, 216, 242, 0.12)';
        ctx.lineWidth = 1;
        for (let i = -10; i <= 10; i++) {
          ctx.beginPath();
          ctx.moveTo(vpX, vpY);
          ctx.lineTo(vpX + i * (w / 6), h);
          ctx.stroke();
        }

        // Room Back Wall Rectangle
        const bwW = w * 0.5;
        const bwH = h * 0.4;
        const bwX = (w - bwW) / 2;
        const bwY = vpY - bwH * 0.5;
        ctx.strokeStyle = 'rgba(0, 214, 160, 0.25)';
        ctx.strokeRect(bwX, bwY, bwW, bwH);
      }

      // 2. Room Corner Polygon & Dimensions
      if (cornerPoints.length >= 2) {
        ctx.strokeStyle = '#00D6A0';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        cornerPoints.forEach((pt, idx) => {
          const px = (pt.x / 100) * w;
          const py = (pt.y / 100) * h;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        if (cornerPoints.length >= 3) {
          ctx.closePath();
          ctx.fillStyle = 'rgba(0, 214, 160, 0.06)';
          ctx.fill();
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Corner Dots
        cornerPoints.forEach((pt, idx) => {
          const px = (pt.x / 100) * w;
          const py = (pt.y / 100) * h;
          ctx.fillStyle = '#00D6A0';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#F4F8FF';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`C${idx + 1}`, px + 6, py - 4);
        });
      }

      // 3. Draw Laser Conduit Lines connecting devices to Panel
      if (panelMarker) {
        const panX = (panelMarker.x / 100) * w;
        const panY = (panelMarker.y / 100) * h;

        markers.forEach(m => {
          if (m.category === 'panel') return;
          const mx = (m.x / 100) * w;
          const my = (m.y / 100) * h;

          ctx.strokeStyle = m.color + '55';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(panX, panY);
          ctx.lineTo(mx, my);
          ctx.stroke();
          ctx.setLineDash([]);

          // Conduit Length Tag on Line Midpoint
          const midX = (panX + mx) / 2;
          const midY = (panY + my) / 2;
          const dist = calculateRealDistance(panelMarker.x, panelMarker.y, m.x, m.y);

          ctx.fillStyle = 'rgba(6, 20, 38, 0.85)';
          ctx.fillRect(midX - 16, midY - 8, 32, 14);
          ctx.fillStyle = m.color;
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${dist.toFixed(1)}m`, midX, midY + 3);
          ctx.textAlign = 'left';
        });
      }

      // 4. Subtle Animated Level Sweep
      laserScanY = (laserScanY + 1.2) % h;
      const grad = ctx.createLinearGradient(0, laserScanY - 10, 0, laserScanY + 10);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, 'rgba(24, 216, 242, 0.25)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, laserScanY - 10, w, 20);

      // 5. Reticle Crosshair at cursor/hover
      if (hoverPos) {
        const hx = (hoverPos.x / 100) * w;
        const hy = (hoverPos.y / 100) * h;
        ctx.strokeStyle = 'rgba(24, 216, 242, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(hx, hy, 14, 0, Math.PI * 2);
        ctx.moveTo(hx - 22, hy);
        ctx.lineTo(hx + 22, hy);
        ctx.moveTo(hx, hy - 22);
        ctx.lineTo(hx, hy + 22);
        ctx.stroke();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [cornerPoints, markers, panelMarker, cameraState, hoverPos, referenceDistanceMeters, opticalCalibration]);

  return (
    <div className="space-y-4 pb-8 animate-fade-in select-none">
      {/* Top Banner Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#061426] border border-[#1B3A5C] rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#147DFF]/20 border border-[#147DFF]/40 text-[#18D8F2] flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#F4F8FF] tracking-tight">
                3D Room Scanner & Electrical Spatial Interface
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                cameraState === 'live'
                  ? 'bg-[#00D6A0]/15 text-[#00D6A0] border border-[#00D6A0]/30'
                  : 'bg-[#18D8F2]/15 text-[#18D8F2] border border-[#18D8F2]/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cameraState === 'live' ? 'bg-[#00D6A0] animate-pulse' : 'bg-[#18D8F2]'}`} />
                {cameraState === 'live' ? 'LIVE CAMERA STREAM' : 'AR SIMULATION MODE'}
              </span>
            </div>
            <p className="text-xs text-[#9EB2CC] mt-0.5">
              Overlay physical measurement markers and directly generate single-line diagram circuits for the Electrical CAD module.
            </p>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                isTorchOn 
                  ? 'bg-[#FF9A24] text-black border-[#FF9A24]' 
                  : 'bg-[#0B1C32] border-[#1B3A5C] text-[#9EB2CC] hover:text-white'
              }`}
              title="Toggle Flashlight / Worklight"
            >
              <Sun className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              const next = facingMode === 'environment' ? 'user' : 'environment';
              setFacingMode(next);
              startCamera(next);
            }}
            className="p-2 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#9EB2CC] hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
            title="Switch Front / Rear Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Quick Commit & Open CAD CTA Button */}
          <button
            onClick={() => handleCommitToCAD(true)}
            className="px-4 py-1.5 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:from-[#18D8F2] hover:to-[#147DFF] text-white hover:text-black rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#147DFF]/25 transition-all cursor-pointer"
            title="Commit measured spatial points and open Electrical CAD module"
          >
            <Cpu className="w-4 h-4" />
            <span>Generate & Open in CAD</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split Layout: AR Camera Viewfinder (Left) + CAD Spatial Interface (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Interactive AR Viewfinder */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {/* Viewport Frame */}
          <div
            ref={containerRef}
            onClick={handleViewportClick}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoverPos({
                x: ((e.clientX - rect.left) / rect.width) * 100,
                y: ((e.clientY - rect.top) / rect.height) * 100
              });
            }}
            className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-[#030B18] border-2 border-[#1B3A5C] rounded-2xl overflow-hidden shadow-2xl cursor-crosshair group"
          >
            {/* Live Camera Video Stream */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 ${
                cameraState === 'live' ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Simulation Canvas / Overlay Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
            />

            {/* Top-Left Viewfinder Status HUD */}
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 pointer-events-none">
              <div className="flex items-center gap-2 bg-[#061426]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#1B3A5C] text-xs font-mono">
                <span className="text-[#18D8F2] font-bold flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5" />
                  LASER RETICLE
                </span>
                <span>·</span>
                <span className="text-[#00D6A0]">
                  {derivedDimensions.length}m × {derivedDimensions.width}m ({derivedDimensions.area} m²)
                </span>
              </div>

              {errorMessage && (
                <div className="bg-[#FF9A24]/15 border border-[#FF9A24]/40 text-[#FF9A24] px-3 py-1 rounded-xl text-[11px] font-mono flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Top-Right Telemetry Badge */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 pointer-events-none">
              <div className="bg-[#061426]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#1B3A5C] text-[11px] font-mono text-[#F4F8FF] flex items-center gap-2">
                <span className="text-[#9EB2CC]">Depth:</span>
                <span className="text-[#18D8F2] font-bold">{referenceDistanceMeters.toFixed(1)} m</span>
                <span className="text-[#9EB2CC]">·</span>
                <span className="text-[#9EB2CC]">Markers:</span>
                <span className="text-[#00D6A0] font-bold">{markers.length}</span>
              </div>
            </div>

            {/* Interactive Pinned Spatial Markers on Camera View */}
            {markers.map((marker) => {
              const isSelected = selectedMarkerId === marker.id;
              const isPanel = marker.category === 'panel';
              const Icon = 
                marker.category === 'panel' ? Server :
                marker.category === 'socket' ? Plug :
                marker.category === 'switch' ? Zap :
                marker.category === 'light' ? Lightbulb : Wind;

              return (
                <div
                  key={marker.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMarkerId(marker.id);
                  }}
                  style={{
                    left: `${marker.x}%`,
                    top: `${marker.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className={`absolute z-30 transition-all duration-150 cursor-pointer ${
                    isSelected ? 'scale-110 z-40' : 'hover:scale-105'
                  }`}
                >
                  <div className={`p-2 rounded-2xl flex items-center gap-1.5 shadow-2xl border ${
                    isSelected
                      ? 'bg-[#10243D] ring-2 ring-white/60'
                      : 'bg-[#061426]/90 backdrop-blur-md'
                  }`}
                  style={{ borderColor: marker.color }}
                  >
                    <Icon className="w-4 h-4 shrink-0" style={{ color: marker.color }} />
                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-[#F4F8FF] leading-none whitespace-nowrap">
                          {marker.label}
                        </span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded font-bold" style={{ backgroundColor: `${marker.color}25`, color: marker.color }}>
                          {marker.circuitTag}
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-[#9EB2CC] mt-0.5 flex items-center gap-1">
                        <span>+{marker.heightMm}mm</span>
                        <span>·</span>
                        <span>{marker.wattage}W</span>
                      </div>
                    </div>

                    {/* Delete marker on hover or select */}
                    {isSelected && (
                      <button
                        onClick={(e) => handleDeleteMarker(marker.id, e)}
                        className="ml-1 p-1 hover:bg-[#FF5263]/20 text-[#FF5263] rounded-lg transition-colors cursor-pointer"
                        title="Delete marker"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Marker Pin Stalk */}
                  <div 
                    className="w-0.5 h-4 mx-auto" 
                    style={{ backgroundColor: marker.color }} 
                  />
                  <div 
                    className="w-2 h-2 rounded-full mx-auto" 
                    style={{ backgroundColor: marker.color }} 
                  />
                </div>
              );
            })}

            {/* Toast Notification */}
            {toastMessage && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 bg-[#061426]/95 backdrop-blur-md border border-[#00D6A0]/50 px-4 py-2 rounded-xl text-xs font-mono text-[#00D6A0] shadow-2xl animate-fade-in flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00D6A0]" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Bottom Viewfinder Palette Selector */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#061426]/95 backdrop-blur-md p-1.5 rounded-2xl border border-[#1B3A5C] shadow-2xl">
              {[
                { id: 'corner', label: 'Room Corner', icon: Box, color: '#00D6A0' },
                { id: 'panel', label: 'Panel (MDB)', icon: Server, color: '#EC4899' },
                { id: 'socket', label: 'Outlets', icon: Plug, color: '#18D8F2' },
                { id: 'switch', label: 'Switches', icon: Zap, color: '#00D6A0' },
                { id: 'light', label: 'Lighting', icon: Lightbulb, color: '#8B5CFF' },
                { id: 'hvac', label: 'HVAC Unit', icon: Wind, color: '#FF9A24' },
              ].map(tool => {
                const Icon = tool.icon;
                const isActive = activeTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTool(tool.id as any);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'text-white shadow-md'
                        : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#0B1C32]'
                    }`}
                    style={isActive ? {
                      backgroundColor: `${tool.color}30`,
                      borderColor: tool.color,
                      borderWidth: '1px'
                    } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: tool.color }} />
                    <span className="hidden sm:inline">{tool.label}</span>
                  </button>
                );
              })}

              <div className="w-px h-5 bg-[#1B3A5C] mx-1" />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMarkers([]);
                  setCornerPoints([]);
                  showToast('Spatial markers reset');
                }}
                className="p-1.5 text-[#9EB2CC] hover:text-[#FF5263] rounded-xl hover:bg-[#0B1C32] transition-colors cursor-pointer"
                title="Clear all spatial markers"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Guidance Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#061426] border border-[#1B3A5C] rounded-xl text-xs text-[#9EB2CC] font-mono">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#18D8F2]" />
              <span>Click anywhere on camera feed to drop active electrical marker. Connects to panel automatically.</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Datum: <strong className="text-[#F4F8FF]">Floor Laser</strong></span>
              <span>·</span>
              <span>Ceiling: <strong className="text-[#18D8F2]">{ceilingHeightMeters.toFixed(2)}m</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Electrical CAD Spatial Data Interface */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          {/* CAD Module Bridge Card */}
          <div className="bg-[#061426] border border-[#1B3A5C] rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1B3A5C]">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#8B5CFF]" />
                <h3 className="text-sm font-bold text-[#F4F8FF]">Electrical CAD Interface</h3>
              </div>
              <span className="text-[10px] font-mono text-[#00D6A0] bg-[#00D6A0]/10 border border-[#00D6A0]/30 px-2 py-0.5 rounded-full">
                Deterministic SLD
              </span>
            </div>

            {/* Live Electrical Telemetry Matrix */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl">
                <span className="text-[10px] text-[#9EB2CC] uppercase block">Connected Load</span>
                <span className="text-lg font-bold text-[#18D8F2] tabular-nums">
                  {cadMetrics.totalLoadKw} <span className="text-xs text-[#9EB2CC]">kW</span>
                </span>
              </div>

              <div className="p-3 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl">
                <span className="text-[10px] text-[#9EB2CC] uppercase block">Design Current</span>
                <span className="text-lg font-bold text-[#F4F8FF] tabular-nums">
                  {cadMetrics.designCurrentA} <span className="text-xs text-[#9EB2CC]">A</span>
                </span>
              </div>

              <div className="p-3 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl">
                <span className="text-[10px] text-[#9EB2CC] uppercase block">Max Voltage Drop</span>
                <span className="text-sm font-bold text-[#00D6A0] tabular-nums">
                  ΔU {cadMetrics.maxDropPercent}%
                </span>
              </div>

              <div className="p-3 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl">
                <span className="text-[10px] text-[#9EB2CC] uppercase block">Incomer Rating</span>
                <span className="text-xs font-bold text-[#FF9A24]">
                  {cadMetrics.recommendedBreaker}
                </span>
              </div>
            </div>

            {/* Synthesized CAD Circuit Groups Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#9EB2CC] font-mono">
                <span>SYNTHESIZED BRANCH CIRCUITS</span>
                <span>{synthesizedCadCircuits.length} Groups</span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {synthesizedCadCircuits.map(circ => (
                  <div
                    key={circ.id}
                    className="p-2.5 bg-[#0B1C32] border border-[#1B3A5C] rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#18D8F2]/20 text-[#18D8F2] font-bold">
                          {circ.tag}
                        </span>
                        <span className="font-semibold text-[#F4F8FF] truncate max-w-[160px]">
                          {circ.name}
                        </span>
                      </div>
                      <span className="font-mono text-[#00D6A0] font-bold">
                        {circ.powerWatts}W
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-[#9EB2CC]">
                      <span>{circ.breakerRatingA}A Curve C · {circ.crossSectionMm2}mm² Cu</span>
                      <span>Run: {circ.cableLengthMeters}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions for CAD Sync */}
            <div className="pt-3 border-t border-[#1B3A5C] space-y-2">
              <button
                onClick={() => handleCommitToCAD(false)}
                className="w-full py-2 bg-[#10243D] hover:bg-[#147DFF]/20 text-[#18D8F2] border border-[#18D8F2]/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Spatial Markers to Project</span>
              </button>

              <button
                onClick={() => handleCommitToCAD(true)}
                className="w-full py-2.5 bg-gradient-to-r from-[#147DFF] to-[#18D8F2] hover:from-[#18D8F2] hover:to-[#147DFF] text-white hover:text-black rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#147DFF]/25 transition-all cursor-pointer"
              >
                <Cpu className="w-4 h-4" />
                <span>Launch Electrical CAD SLD</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Perspective & Depth Calibrator */}
          <div className="p-4 bg-[#061426] border border-[#1B3A5C] rounded-2xl text-xs font-mono space-y-3">
            <div className="flex items-center justify-between text-[#9EB2CC]">
              <span className="font-bold text-[#F4F8FF] flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#18D8F2]" />
                Depth & Laser Calibration
              </span>
              <span>{referenceDistanceMeters.toFixed(1)} m</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9EB2CC]">
                <span>Distance to Surface:</span>
                <span className="text-[#18D8F2] font-bold">{referenceDistanceMeters}m</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="8.0"
                step="0.1"
                value={referenceDistanceMeters}
                onChange={(e) => setReferenceDistanceMeters(parseFloat(e.target.value))}
                className="w-full accent-[#18D8F2] cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-[#9EB2CC]">
                <span>Ceiling Height:</span>
                <span className="text-[#00D6A0] font-bold">{ceilingHeightMeters.toFixed(2)}m</span>
              </div>
              <input
                type="range"
                min="2.2"
                max="5.0"
                step="0.05"
                value={ceilingHeightMeters}
                onChange={(e) => setCeilingHeightMeters(parseFloat(e.target.value))}
                className="w-full accent-[#00D6A0] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
