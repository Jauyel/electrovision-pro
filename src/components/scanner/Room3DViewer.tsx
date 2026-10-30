import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { ElectricalPoint, RoomData } from '../../types';
import { Eye, RotateCcw, ZoomIn, ZoomOut, Layers } from 'lucide-react';

interface Room3DViewerProps {
  roomData: RoomData;
  selectedPointId: string | null;
  onSelectPoint: (id: string | null) => void;
}

export const Room3DViewer: React.FC<Room3DViewerProps> = ({
  roomData,
  selectedPointId,
  onSelectPoint
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });

  const [cameraAngle, setCameraAngle] = useState({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 14 });
  const [showWireframe, setShowWireframe] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth || 600;
    const height = mountRef.current.clientHeight || 400;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061426);
    scene.fog = new THREE.FogExp2(0x061426, 0.035);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // 4. Lighting setup
    const ambientLight = new THREE.AmbientLight(0x9EB2CC, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xF4F8FF, 0.9);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const blueRimLight = new THREE.DirectionalLight(0x147DFF, 0.7);
    blueRimLight.position.set(-10, 8, -10);
    scene.add(blueRimLight);

    // 5. Build Room Mesh
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    rebuildRoom(scene, objectsGroup, roomData, selectedPointId, showWireframe);

    // 6. Animation loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize listener
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

  // Update room when roomData, selectedPointId, or showWireframe changes
  useEffect(() => {
    if (sceneRef.current && objectsGroupRef.current) {
      rebuildRoom(sceneRef.current, objectsGroupRef.current, roomData, selectedPointId, showWireframe);
    }
  }, [roomData, selectedPointId, showWireframe]);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngle;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, Math.max(y, 1.5), z);
    cameraRef.current.lookAt(0, 1.2, 0);
  };

  useEffect(() => {
    updateCameraPosition();
  }, [cameraAngle]);

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

  const rebuildRoom = (
    scene: THREE.Scene,
    group: THREE.Group,
    room: RoomData,
    selectedId: string | null,
    wireframe: boolean
  ) => {
    // Clear and dispose existing children
    while (group.children.length > 0) {
      const obj = group.children[0];
      disposeHierarchy(obj);
      group.remove(obj);
    }

    const L = room.lengthMeters;
    const W = room.widthMeters;
    const H = room.heightMeters;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(L, W);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0B1C32,
      roughness: 0.8,
      metalness: 0.2,
      wireframe: wireframe
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    group.add(floor);

    // Floor Blueprint Grid
    const grid = new THREE.GridHelper(Math.max(L, W) * 1.2, 24, 0x18D8F2, 0x1B3A5C);
    grid.position.y = 0.01;
    group.add(grid);

    // Wall materials
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x10243D,
      transparent: true,
      opacity: 0.85,
      roughness: 0.7,
      metalness: 0.3,
      wireframe: wireframe
    });

    const wallBorderMat = new THREE.LineBasicMaterial({ color: 0x18D8F2, linewidth: 1 });

    // North Wall (back)
    const northWallGeo = new THREE.BoxGeometry(L, H, 0.15);
    const northWall = new THREE.Mesh(northWallGeo, wallMat);
    northWall.position.set(0, H / 2, -W / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    group.add(northWall);

    // West Wall (left)
    const westWallGeo = new THREE.BoxGeometry(0.15, H, W);
    const westWall = new THREE.Mesh(westWallGeo, wallMat);
    westWall.position.set(-L / 2, H / 2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    group.add(westWall);

    // Low Cutaway East Wall (right, cutaway to allow view into room)
    const eastWallGeo = new THREE.BoxGeometry(0.15, 0.4, W);
    const eastWall = new THREE.Mesh(eastWallGeo, wallMat);
    eastWall.position.set(L / 2, 0.2, 0);
    group.add(eastWall);

    // Low Cutaway South Wall (front)
    const southWallGeo = new THREE.BoxGeometry(L, 0.4, 0.15);
    const southWall = new THREE.Mesh(southWallGeo, wallMat);
    southWall.position.set(0, 0.2, W / 2);
    group.add(southWall);

    // Add Electrical Points in 3D Space
    room.points.forEach((pt) => {
      const isSelected = pt.id === selectedId;

      // Coordinate mapping from 2D room (0..L, 0..W) to 3D origin (-L/2..L/2, -W/2..W/2)
      const posX = pt.x - L / 2;
      const posZ = pt.y - W / 2;
      const posY = pt.heightMm / 1000;

      let color = 0x18D8F2; // default cyan
      let size = 0.18;

      if (pt.type.includes('panel')) {
        color = 0xFF9A24; // orange for panel
        size = 0.35;
        // Distribution Panel Box
        const pGeo = new THREE.BoxGeometry(0.4, 0.5, 0.1);
        const pMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0xFF9A24 : 0x147DFF,
          metalness: 0.8,
          roughness: 0.3,
          emissive: isSelected ? 0xFF9A24 : 0x061426,
          emissiveIntensity: 0.5
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(posX, posY, posZ);
        pMesh.userData = { pointId: pt.id };
        group.add(pMesh);
        return;
      }

      if (pt.type.includes('socket')) {
        color = 0x147DFF; // blue for socket
      } else if (pt.type.includes('light')) {
        color = 0x00D6A0; // teal for light
      } else if (pt.type.includes('appliance') || pt.type.includes('ac')) {
        color = 0xFF9A24;
      }

      // Point marker sphere / cube
      const markerGeo = pt.type.includes('light') 
        ? new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16) 
        : new THREE.BoxGeometry(size, size, 0.08);

      const markerMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xFF9A24 : color,
        emissive: isSelected ? 0xFF9A24 : color,
        emissiveIntensity: isSelected ? 0.9 : 0.4,
        roughness: 0.4
      });

      const marker = new THREE.Mesh(markerGeo, markerMat);
      marker.position.set(posX, Math.max(posY, 0.1), posZ);
      marker.castShadow = true;
      marker.userData = { pointId: pt.id };
      group.add(marker);

      // Light glow downward if ceiling light
      if (pt.type.includes('ceiling_light') || pt.type.includes('spotlight')) {
        const lightGlow = new THREE.PointLight(0xF4F8FF, 0.8, 4);
        lightGlow.position.set(posX, posY - 0.2, posZ);
        group.add(lightGlow);
      }
    });
  };

  // Mouse Orbit controls
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
      phi: Math.max(0.2, Math.min(Math.PI / 2 - 0.05, prev.phi - deltaY * 0.01))
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
      phi: Math.max(0.2, Math.min(Math.PI / 2 - 0.05, prev.phi - deltaY * 0.015))
    }));
  };

  const handleZoom = (delta: number) => {
    setCameraAngle(prev => ({
      ...prev,
      radius: Math.max(6, Math.min(25, prev.radius + delta))
    }));
  };

  const resetView = () => {
    setCameraAngle({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 14 });
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-[#1B3A5C] bg-[#061426]">
      {/* 3D WebGL Canvas container */}
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
          handleZoom(e.deltaY * 0.01);
        }}
      />

      {/* Floating HUD Controls */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-[#0B1C32]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1B3A5C] text-xs">
        <span className="w-2 h-2 rounded-full bg-[#18D8F2]" />
        <span className="font-bold text-[#F4F8FF]">WebGL 3D Room Spatial</span>
        <span className="text-[#9EB2CC] font-mono">
          {roomData.lengthMeters}m × {roomData.widthMeters}m × {roomData.heightMeters}m
        </span>
      </div>

      {/* Orbit & Tool Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-[#0B1C32]/85 backdrop-blur-md p-1.5 rounded-lg border border-[#1B3A5C]">
        <button
          onClick={() => handleZoom(-1.5)}
          className="p-1.5 text-[#9EB2CC] hover:text-[#18D8F2] hover:bg-[#10243D] rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(1.5)}
          className="p-1.5 text-[#9EB2CC] hover:text-[#18D8F2] hover:bg-[#10243D] rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowWireframe(!showWireframe)}
          className={`p-1.5 rounded transition-colors ${showWireframe ? 'bg-[#18D8F2]/20 text-[#18D8F2]' : 'text-[#9EB2CC] hover:text-[#F4F8FF] hover:bg-[#10243D]'}`}
          title="Toggle Wireframe CAD"
        >
          <Layers className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 text-[#9EB2CC] hover:text-[#18D8F2] hover:bg-[#10243D] rounded transition-colors"
          title="Reset Camera"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-4 text-[10px] text-[#9EB2CC] font-mono bg-[#030B18]/70 px-2.5 py-1 rounded border border-[#1B3A5C]/60 flex items-center gap-2">
        <span>Click & drag to rotate</span>
        <span>·</span>
        <span>Scroll to zoom</span>
        <span>·</span>
        <span>Points render at true elevations</span>
      </div>
    </div>
  );
};
