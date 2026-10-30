import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { PanelComponent, PanelEnclosure } from '../../types';
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Panel3DViewerProps {
  enclosure: PanelEnclosure;
  components: PanelComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (id: string | null) => void;
  viewMode: 'front' | 'side' | 'isometric';
  onChangeViewMode: (mode: 'front' | 'side' | 'isometric') => void;
}

export const Panel3DViewer: React.FC<Panel3DViewerProps> = ({
  enclosure,
  components,
  selectedComponentId,
  onSelectComponent,
  viewMode,
  onChangeViewMode
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const [cameraAngle, setCameraAngle] = useState({ theta: 0, phi: Math.PI / 2, radius: 2.2 });

  // Update camera angle when viewMode changes
  useEffect(() => {
    if (viewMode === 'front') {
      setCameraAngle({ theta: 0, phi: Math.PI / 2, radius: 1.8 });
    } else if (viewMode === 'side') {
      setCameraAngle({ theta: Math.PI / 2 - 0.2, phi: Math.PI / 2, radius: 1.9 });
    } else if (viewMode === 'isometric') {
      setCameraAngle({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 2.3 });
    }
  }, [viewMode]);

  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth || 600;
    const height = mountRef.current.clientHeight || 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061426);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    cameraRef.current = camera;
    updateCamera();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Studio lighting for metallic enclosure
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
    keyLight.position.set(5, 8, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x18D8F2, 0.5);
    fillLight.position.set(-5, -2, 5);
    scene.add(fillLight);

    const orangeAccent = new THREE.DirectionalLight(0xFF9A24, 0.4);
    orangeAccent.position.set(0, 5, -5);
    scene.add(orangeAccent);

    const group = new THREE.Group();
    scene.add(group);
    groupRef.current = group;

    renderCabinet(group, enclosure, components, selectedComponentId);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const updateCamera = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngle;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  };

  useEffect(() => {
    updateCamera();
  }, [cameraAngle]);

  useEffect(() => {
    if (groupRef.current) {
      renderCabinet(groupRef.current, enclosure, components, selectedComponentId);
    }
  }, [enclosure, components, selectedComponentId]);

  const disposeHierarchy = (node: THREE.Object3D) => {
    node.traverse((child: any) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  };

  const renderCabinet = (
    group: THREE.Group,
    enc: PanelEnclosure,
    comps: PanelComponent[],
    selId: string | null
  ) => {
    while (group.children.length > 0) {
      const obj = group.children[0];
      disposeHierarchy(obj);
      group.remove(obj);
    }

    const boxW = enc.widthMm / 500; // normalized scale (~0.9m)
    const boxH = enc.heightMm / 500; // (~1.2m)
    const boxD = 0.22;

    // Metallic Enclosure Backplate & Sides
    const enclosureMat = new THREE.MeshStandardMaterial({
      color: 0x1A293E,
      metalness: 0.85,
      roughness: 0.25
    });

    const enclosureChassis = new THREE.Mesh(
      new THREE.BoxGeometry(boxW, boxH, boxD),
      enclosureMat
    );
    enclosureChassis.castShadow = true;
    enclosureChassis.receiveShadow = true;
    group.add(enclosureChassis);

    // Enclosure Interior Recess
    const interiorMat = new THREE.MeshStandardMaterial({
      color: 0x0B1C32,
      metalness: 0.7,
      roughness: 0.4
    });
    const interior = new THREE.Mesh(
      new THREE.BoxGeometry(boxW - 0.06, boxH - 0.06, boxD - 0.02),
      interiorMat
    );
    interior.position.z = 0.02;
    group.add(interior);

    // DIN Rails & Components
    const numRows = enc.rows || 3;
    const rowSpacing = (boxH - 0.18) / numRows;
    const startY = (boxH - 0.18) / 2 - rowSpacing / 2;

    const dinRailMat = new THREE.MeshStandardMaterial({
      color: 0xD0D7DE,
      metalness: 0.95,
      roughness: 0.15
    });

    for (let r = 0; r < numRows; r++) {
      const railY = startY - r * rowSpacing;

      // DIN Rail 35mm
      const dinRail = new THREE.Mesh(
        new THREE.BoxGeometry(boxW - 0.12, 0.035, 0.015),
        dinRailMat
      );
      dinRail.position.set(0, railY, 0.05);
      group.add(dinRail);

      // Cable duct above and below rail
      const ductMat = new THREE.MeshStandardMaterial({
        color: 0x10243D,
        roughness: 0.8
      });
      const topDuct = new THREE.Mesh(
        new THREE.BoxGeometry(boxW - 0.1, 0.03, 0.04),
        ductMat
      );
      topDuct.position.set(0, railY + 0.07, 0.05);
      group.add(topDuct);
    }

    // Modular Components mounted on rails
    const moduleUnitWidth = (boxW - 0.14) / enc.modulesPerRow;

    comps.forEach((c) => {
      const isSelected = c.id === selId;
      const railY = startY - c.railIndex * rowSpacing;
      const compW = c.moduleWidth * moduleUnitWidth;
      const compX = -(boxW - 0.14) / 2 + (c.slotPosition + c.moduleWidth / 2) * moduleUnitWidth;

      // Color coding according to breaker / device type
      let baseColor = 0xF4F8FF; // light grey/white body for standard MCB
      if (c.type === 'rcd') baseColor = 0xE2E8F0;
      if (c.type === 'rcbo') baseColor = 0xE0E7FF;
      if (c.type === 'meter') baseColor = 0x1E293B;
      if (c.type === 'surge') baseColor = 0xFF9A24;

      const compMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xFF9A24 : baseColor,
        roughness: 0.35,
        metalness: 0.3,
        emissive: isSelected ? 0xFF9A24 : 0x000000,
        emissiveIntensity: isSelected ? 0.3 : 0.0
      });

      // Component Main Body
      const compMesh = new THREE.Mesh(
        new THREE.BoxGeometry(compW - 0.003, 0.082, 0.065),
        compMat
      );
      compMesh.position.set(compX, railY, 0.09);
      compMesh.castShadow = true;
      group.add(compMesh);

      // Component Toggle Switch handle
      const switchMat = new THREE.MeshStandardMaterial({
        color: c.status === 'verified' ? 0x00D6A0 : 0xFF5263,
        metalness: 0.4,
        roughness: 0.3
      });
      const switchHandle = new THREE.Mesh(
        new THREE.BoxGeometry(compW * 0.5, 0.018, 0.015),
        switchMat
      );
      switchHandle.position.set(compX, railY, 0.125);
      group.add(switchHandle);

      // Terminal Screws on top and bottom
      const screwMat = new THREE.MeshStandardMaterial({ color: 0x8B949E, metalness: 0.9 });
      const topScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 8), screwMat);
      topScrew.rotation.x = Math.PI / 2;
      topScrew.position.set(compX, railY + 0.033, 0.12);
      group.add(topScrew);
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    setCameraAngle(prev => ({
      ...prev,
      theta: prev.theta - deltaX * 0.01,
      phi: Math.max(0.1, Math.min(Math.PI - 0.1, prev.phi - deltaY * 0.01))
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMousePosRef.current.x;
    const deltaY = e.touches[0].clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    setCameraAngle(prev => ({
      ...prev,
      theta: prev.theta - deltaX * 0.015,
      phi: Math.max(0.1, Math.min(Math.PI - 0.1, prev.phi - deltaY * 0.015))
    }));
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-[#1B3A5C] bg-[#061426]">
      {/* 3D WebGL Canvas */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
        onWheel={(e) => {
          e.preventDefault();
          setCameraAngle(prev => ({
            ...prev,
            radius: Math.max(1.2, Math.min(4.0, prev.radius + e.deltaY * 0.003))
          }));
        }}
      />

      {/* Floating View Angle Selector */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-[#0B1C32]/90 backdrop-blur-md p-1 rounded-lg border border-[#1B3A5C]">
        <button
          onClick={() => onChangeViewMode('front')}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
            viewMode === 'front' ? 'bg-[#FF9A24] text-[#030B18] shadow' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
          }`}
        >
          Front Elevation
        </button>
        <button
          onClick={() => onChangeViewMode('isometric')}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
            viewMode === 'isometric' ? 'bg-[#FF9A24] text-[#030B18] shadow' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
          }`}
        >
          3D Perspective
        </button>
        <button
          onClick={() => onChangeViewMode('side')}
          className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
            viewMode === 'side' ? 'bg-[#FF9A24] text-[#030B18] shadow' : 'text-[#9EB2CC] hover:text-[#F4F8FF]'
          }`}
        >
          Side Profile
        </button>
      </div>

      {/* Camera Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#0B1C32]/90 backdrop-blur-md p-1.5 rounded-lg border border-[#1B3A5C]">
        <button
          onClick={() => setCameraAngle(prev => ({ ...prev, radius: Math.max(1.2, prev.radius - 0.3) }))}
          className="p-1.5 text-[#9EB2CC] hover:text-[#FF9A24] rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setCameraAngle(prev => ({ ...prev, radius: Math.min(4.0, prev.radius + 0.3) }))}
          className="p-1.5 text-[#9EB2CC] hover:text-[#FF9A24] rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => onChangeViewMode('isometric')}
          className="p-1.5 text-[#9EB2CC] hover:text-[#FF9A24] rounded transition-colors"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Enclosure HUD Specs */}
      <div className="absolute bottom-3 left-4 flex items-center gap-3 bg-[#030B18]/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1B3A5C] text-xs font-mono text-[#9EB2CC]">
        <span className="text-[#F4F8FF] font-bold">{enclosure.model}</span>
        <span>·</span>
        <span>{enclosure.rows} Rows × {enclosure.modulesPerRow} Mods ({enclosure.totalModules}M)</span>
        <span>·</span>
        <span className="text-[#00D6A0]">{enclosure.ipRating}</span>
      </div>
    </div>
  );
};
