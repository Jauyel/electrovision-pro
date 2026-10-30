import React, { useState } from 'react';
import { 
  Wrench, 
  Save, 
  Camera, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Eye, 
  Layers, 
  Compass, 
  Share2, 
  Maximize, 
  CheckSquare, 
  Square,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { CableCircuitType, CableRoute, InstallationTask } from '../../types';
import { Modal } from '../common/Modal';

export const InstallationMode: React.FC = () => {
  const { 
    activeProject, 
    updateActiveProject, 
    addCableRoute, 
    t, 
    triggerSave, 
    saveStatus 
  } = useProject();

  const [activeLayer, setActiveLayer] = useState<{
    lighting: boolean;
    sockets: boolean;
    appliance: boolean;
    control: boolean;
    dimensions: boolean;
  }>({
    lighting: true,
    sockets: true,
    appliance: true,
    control: true,
    dimensions: true
  });

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isArModalOpen, setIsArModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssigned, setNewTaskAssigned] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<'chasing' | 'conduit' | 'cabling' | 'devices' | 'panel' | 'testing'>('conduit');

  // New route form state
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteType, setNewRouteType] = useState<CableCircuitType>('lighting');
  const [newRouteCable, setNewRouteCable] = useState('VVGng-LS 3x1.5');
  const [newRouteLength, setNewRouteLength] = useState(25);

  const toggleChecklist = (id: string) => {
    updateActiveProject(prev => ({
      ...prev,
      checklist: prev.checklist.map(item => 
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const updateTaskStatus = (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    updateActiveProject(prev => ({
      ...prev,
      installationTasks: prev.installationTasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    }));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    const newTask: InstallationTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      description: "Field order logged via AI Installation Mode",
      status: "pending",
      assignedTo: newTaskAssigned || "Field Technician",
      category: newTaskCategory
    };
    updateActiveProject(prev => ({
      ...prev,
      installationTasks: [newTask, ...prev.installationTasks]
    }));
    setNewTaskTitle('');
    setNewTaskAssigned('');
    setIsNewTaskModalOpen(false);
  };

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    const colorMap: Record<CableCircuitType, string> = {
      lighting: '#18D8F2',
      sockets: '#147DFF',
      appliance: '#FF9A24',
      control: '#8B5CFF'
    };

    const newRoute: CableRoute = {
      id: `route-${Date.now()}`,
      name: newRouteName || "New Circuit Route",
      type: newRouteType,
      color: colorMap[newRouteType],
      cableType: newRouteCable,
      lengthMeters: Number(newRouteLength),
      conduitType: "PVC Corrugated 20mm",
      pathPoints: [],
      connectedPoints: [],
      status: "planned"
    };

    addCableRoute(newRoute);
    setNewRouteName('');
    setIsAddRouteModalOpen(false);
  };

  const routes = activeProject.cableRoutes.filter(r => activeLayer[r.type]);
  const tasks = activeProject.installationTasks;
  const checklist = activeProject.checklist;

  return (
    <div className="space-y-4 pb-12 animate-fade-in">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#061426] border border-[#1B3A5C] rounded-xl shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00D6A0]" />
            <h1 className="text-xl font-extrabold text-[#F4F8FF] tracking-tight">{t.installation.title}</h1>
            <span className="text-[10px] font-mono uppercase bg-[#00D6A0]/15 text-[#00D6A0] px-2 py-0.5 rounded border border-[#00D6A0]/30">
              Module 02
            </span>
          </div>
          <p className="text-xs text-[#9EB2CC] mt-1">{t.installation.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsArModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-[#147DFF] to-[#00D6A0] hover:opacity-95 text-[#030B18] font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-[#00D6A0]/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch AR Lens Mode</span>
          </button>

          <button
            onClick={() => setIsAddRouteModalOpen(true)}
            className="px-3 py-1.5 bg-[#0B1C32] hover:bg-[#10243D] border border-[#1B3A5C] text-[#F4F8FF] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#00D6A0]" />
            <span>Add Cable Route</span>
          </button>

          <button
            onClick={triggerSave}
            className="px-3.5 py-1.5 bg-[#147DFF] hover:bg-[#147DFF]/90 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#147DFF]/25 transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveStatus === 'saved' ? t.saved : t.installation.saveInstallation}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Visual Cable Map (8 cols) + Tasks & Checklist (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 2.5D Cable Route Visualizer */}
        <div className="lg:col-span-8 space-y-3">
          {/* Layer Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#061426] p-2.5 rounded-xl border border-[#1B3A5C]">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#9EB2CC] uppercase tracking-wider px-2 font-mono">
                Circuit Layers:
              </span>
              <button
                onClick={() => setActiveLayer(p => ({ ...p, lighting: !p.lighting }))}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeLayer.lighting 
                    ? 'bg-[#18D8F2]/20 text-[#18D8F2] border border-[#18D8F2]/40' 
                    : 'bg-[#0B1C32] text-[#9EB2CC] border border-[#1B3A5C]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#18D8F2]" />
                <span>Lighting (1.5mm²)</span>
              </button>

              <button
                onClick={() => setActiveLayer(p => ({ ...p, sockets: !p.sockets }))}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeLayer.sockets 
                    ? 'bg-[#147DFF]/20 text-[#147DFF] border border-[#147DFF]/40' 
                    : 'bg-[#0B1C32] text-[#9EB2CC] border border-[#1B3A5C]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#147DFF]" />
                <span>Sockets (2.5mm²)</span>
              </button>

              <button
                onClick={() => setActiveLayer(p => ({ ...p, appliance: !p.appliance }))}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeLayer.appliance 
                    ? 'bg-[#FF9A24]/20 text-[#FF9A24] border border-[#FF9A24]/40' 
                    : 'bg-[#0B1C32] text-[#9EB2CC] border border-[#1B3A5C]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#FF9A24]" />
                <span>Power Loads (4.0mm²)</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-[#00D6A0] px-2 font-semibold">
              Total Routes: {routes.length} ({routes.reduce((a, b) => a + b.lengthMeters, 0).toFixed(1)}m)
            </div>
          </div>

          {/* Interactive Routing Canvas */}
          <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-[#1B3A5C] bg-[#061426] blueprint-grid-dense flex items-center justify-center p-6 select-none">
            {/* Architectural room boundary container */}
            <div className="relative w-[520px] h-[400px] border-2 border-[#1B3A5C] rounded-lg bg-[#0B1C32]/85 shadow-2xl overflow-hidden">
              {/* Room label watermark */}
              <div className="absolute top-3 left-4 text-xs font-mono font-bold text-[#9EB2CC]/60">
                {activeProject.roomData.roomName} · {activeProject.roomData.lengthMeters}m × {activeProject.roomData.widthMeters}m
              </div>

              {/* Distribution Board Origin Node */}
              <div 
                className="absolute left-8 top-12 p-2 bg-[#FF9A24]/20 border border-[#FF9A24] rounded-lg shadow-lg z-30 flex items-center gap-1.5 cursor-pointer"
                title="Main Distribution Board MDB-1"
              >
                <div className="w-3 h-3 rounded-full bg-[#FF9A24] animate-ping" />
                <span className="text-[10px] font-mono font-bold text-[#FF9A24]">MDB-1</span>
              </div>

              {/* SVG Cable Route Paths Overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {/* Lighting Route (Cyan) */}
                {activeLayer.lighting && (
                  <path
                    d="M 60 70 L 180 70 L 180 160 L 320 160 L 320 220"
                    fill="none"
                    stroke="#18D8F2"
                    strokeWidth="3.5"
                    strokeDasharray="6 3"
                    className="animate-pulse"
                  />
                )}

                {/* Sockets Route (Blue) */}
                {activeLayer.sockets && (
                  <path
                    d="M 60 70 L 60 320 L 240 320 L 240 350 L 440 350 L 440 180"
                    fill="none"
                    stroke="#147DFF"
                    strokeWidth="4"
                  />
                )}

                {/* Dedicated Appliance Route (Orange) */}
                {activeLayer.appliance && (
                  <path
                    d="M 60 70 L 420 70 L 420 120"
                    fill="none"
                    stroke="#FF9A24"
                    strokeWidth="4.5"
                  />
                )}
              </svg>

              {/* Physical Route Terminal Markers */}
              {/* Point 1: Media Sockets Quad */}
              {activeLayer.sockets && (
                <div 
                  onClick={() => setSelectedRouteId('route-c-sock-1')}
                  className="absolute right-12 bottom-12 p-1.5 bg-[#147DFF] rounded shadow-lg z-20 cursor-pointer hover:scale-110 transition-transform text-[9px] font-bold text-[#030B18]"
                >
                  S1: Media Quad
                </div>
              )}

              {/* Point 2: Central Light Chandelier */}
              {activeLayer.lighting && (
                <div 
                  onClick={() => setSelectedRouteId('route-c-light-1')}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-2 bg-[#18D8F2] rounded-full shadow-lg z-20 cursor-pointer hover:scale-110 transition-transform text-[9px] font-bold text-[#030B18]"
                >
                  L1: Chandelier
                </div>
              )}

              {/* Point 3: Inverter AC Feed */}
              {activeLayer.appliance && (
                <div 
                  onClick={() => setSelectedRouteId('route-c-app-ac')}
                  className="absolute right-16 top-24 p-1.5 bg-[#FF9A24] rounded shadow-lg z-20 cursor-pointer hover:scale-110 transition-transform text-[9px] font-bold text-[#030B18]"
                >
                  AC-1: Inverter
                </div>
              )}

              {/* Distance Dimension Annotations */}
              <div className="absolute top-10 left-36 text-[10px] font-mono text-[#18D8F2] bg-[#061426] px-1.5 py-0.5 rounded border border-[#1B3A5C]">
                Span: 3.45m (conduit d20)
              </div>
              <div className="absolute bottom-16 left-48 text-[10px] font-mono text-[#147DFF] bg-[#061426] px-1.5 py-0.5 rounded border border-[#1B3A5C]">
                Span: 4.80m (screed embed)
              </div>
            </div>

            {/* Bottom HUD Legend */}
            <div className="absolute bottom-3 left-4 flex items-center gap-3 bg-[#0B1C32]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#1B3A5C] text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-[#18D8F2]">
                <span className="w-3 h-1 bg-[#18D8F2]" /> Lighting (1.5mm²)
              </span>
              <span className="flex items-center gap-1.5 text-[#147DFF]">
                <span className="w-3 h-1 bg-[#147DFF]" /> Sockets (2.5mm²)
              </span>
              <span className="flex items-center gap-1.5 text-[#FF9A24]">
                <span className="w-3 h-1 bg-[#FF9A24]" /> High Power (4.0mm²)
              </span>
            </div>
          </div>

          {/* Cable Route Spec Table */}
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl overflow-hidden">
            <div className="p-3 bg-[#061426] border-b border-[#1B3A5C] flex items-center justify-between">
              <span className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider font-mono">
                Planned Conduit Runs & Cable Specifications
              </span>
              <span className="text-[10px] font-mono text-[#00D6A0]">Laser Verified</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#061426]/70 border-b border-[#1B3A5C] text-[#9EB2CC] uppercase font-mono text-[10px]">
                  <tr>
                    <th className="px-4 py-2">Route Name</th>
                    <th className="px-3 py-2">Conductor Spec</th>
                    <th className="px-3 py-2">Conduit</th>
                    <th className="px-3 py-2">Length</th>
                    <th className="px-3 py-2">Installation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1B3A5C]/40">
                  {activeProject.cableRoutes.map(r => (
                    <tr key={r.id} className="hover:bg-[#10243D] transition-colors">
                      <td className="px-4 py-2 font-semibold text-[#F4F8FF] flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        {r.name}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#9EB2CC]">{r.cableType}</td>
                      <td className="px-3 py-2 font-mono text-[#9EB2CC]">{r.conduitType}</td>
                      <td className="px-3 py-2 font-mono font-bold text-[#F4F8FF]">{r.lengthMeters} m</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          r.status === 'verified' 
                            ? 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30' 
                            : 'bg-[#18D8F2]/15 text-[#18D8F2] border-[#18D8F2]/30'
                        }`}>
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Installation Tasks & Quality Checklist (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quality & Safety Checklist */}
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1B3A5C] pb-2">
              <h3 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#00D6A0]" />
                <span>{t.installation.checklistTitle}</span>
              </h3>
              <span className="text-[10px] font-mono text-[#00D6A0]">
                {checklist.filter(c => c.completed).length} / {checklist.length}
              </span>
            </div>

            <div className="space-y-2">
              {checklist.map(item => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklist(item.id)}
                  className="flex items-start gap-2.5 p-2 bg-[#061426] hover:bg-[#10243D] border border-[#1B3A5C] rounded-lg cursor-pointer transition-colors"
                >
                  <button className="mt-0.5 text-[#00D6A0]">
                    {item.completed ? (
                      <CheckSquare className="w-4 h-4 text-[#00D6A0]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#9EB2CC]" />
                    )}
                  </button>
                  <span className={`text-xs ${item.completed ? 'line-through text-[#9EB2CC]' : 'text-[#F4F8FF]'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Installation Work Orders / Task Panel */}
          <div className="bg-[#0B1C32] border border-[#1B3A5C] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#1B3A5C] pb-2">
              <h3 className="text-xs font-bold text-[#F4F8FF] uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-[#18D8F2]" />
                <span>{t.installation.tasksTitle}</span>
              </h3>
              <button
                onClick={() => setIsNewTaskModalOpen(true)}
                className="text-[10px] text-[#18D8F2] hover:underline flex items-center gap-1 font-mono font-semibold"
              >
                <Plus className="w-3 h-3" /> Add Order
              </button>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
              {tasks.map(task => (
                <div 
                  key={task.id} 
                  className="p-3 bg-[#061426] border border-[#1B3A5C] rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[#F4F8FF] leading-snug">
                      {task.title}
                    </span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                      task.status === 'completed'
                        ? 'bg-[#00D6A0]/15 text-[#00D6A0] border-[#00D6A0]/30'
                        : task.status === 'in_progress'
                        ? 'bg-[#18D8F2]/15 text-[#18D8F2] border-[#18D8F2]/30'
                        : 'bg-[#FF9A24]/15 text-[#FF9A24] border-[#FF9A24]/30'
                    }`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#9EB2CC] leading-relaxed">
                    {task.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#9EB2CC] pt-1 border-t border-[#1B3A5C]/50 font-mono">
                    <span>Tech: {task.assignedTo}</span>
                    <div className="flex items-center gap-1">
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="text-[#00D6A0] hover:underline"
                        >
                          Mark Done
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AR Lens Mode Modal */}
      <Modal
        isOpen={isArModalOpen}
        onClose={() => setIsArModalOpen(false)}
        title="Augmented Reality (AR) Cable Installation HUD"
        subtitle="Simulated ARCore / WebXR camera view with real-time laser distance guidelines and drill anchors."
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-[#1B3A5C] shadow-2xl">
            <img
              src="/src/assets/images/ar_installation_scan_1792251187804.jpg"
              alt="AR Installation Viewport"
              className="w-full h-auto object-cover max-h-[500px]"
              referrerPolicy="no-referrer"
            />
            {/* Interactive HUD Overlay Over Camera Frame */}
            <div className="absolute top-4 left-4 p-3 bg-[#061426]/90 backdrop-blur-md rounded-xl border border-[#18D8F2]/50 text-xs space-y-1">
              <div className="flex items-center gap-2 text-[#00D6A0] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-[#00D6A0] animate-ping" />
                <span>AR DEPTH SENSOR: 3.45m</span>
              </div>
              <div className="text-[11px] text-[#F4F8FF]">Circuit 04: Lighting & Data Junction</div>
              <div className="text-[10px] text-[#9EB2CC] font-mono">Drill point verified (6mm Masonry Anchor)</div>
            </div>

            <div className="absolute bottom-4 right-4 p-3 bg-[#061426]/90 backdrop-blur-md rounded-xl border border-[#1B3A5C] text-xs font-mono text-[#9EB2CC]">
              <span>Laser Tracking: 60 FPS · Precision ±1.5mm</span>
            </div>
          </div>

          <div className="p-3 bg-[#061426] rounded-xl border border-[#1B3A5C] text-xs text-[#9EB2CC] flex items-center justify-between">
            <span>Ready for field sync on native Apple ARKit / Android ARCore devices.</span>
            <button
              onClick={() => setIsArModalOpen(false)}
              className="px-4 py-1.5 bg-[#147DFF] text-white font-bold rounded-lg text-xs"
            >
              Close AR Preview
            </button>
          </div>
        </div>
      </Modal>

      {/* Add New Task Modal */}
      <Modal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Create Field Work Order"
        subtitle="Assign rough-in, conduit chasing, or termination tasks to on-site technicians."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Work Order Title</label>
            <input
              type="text"
              required
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Pull 3x2.5mm² into Kitchen ring conduit"
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Assigned Technician</label>
            <input
              type="text"
              value={newTaskAssigned}
              onChange={(e) => setNewTaskAssigned(e.target.value)}
              placeholder="e.g. Rustam Aliyev / Lead Wireman"
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Task Category</label>
            <select
              value={newTaskCategory}
              onChange={(e) => setNewTaskCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
            >
              <option value="chasing">Wall Chasing & Coring</option>
              <option value="conduit">Conduit & Tray Installation</option>
              <option value="cabling">Cable Pulling & Labelling</option>
              <option value="devices">Device Trim-Out & Sockets</option>
              <option value="panel">Distribution Panel Assembly</option>
              <option value="testing">Megger & Loop Testing</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#1B3A5C]">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-3 py-1.5 bg-[#061426] text-xs font-medium text-[#9EB2CC] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#147DFF] text-white text-xs font-bold rounded-lg"
            >
              Create Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Add New Cable Route Modal */}
      <Modal
        isOpen={isAddRouteModalOpen}
        onClose={() => setIsAddRouteModalOpen(false)}
        title="Add New Cable Conduit Route"
        subtitle="Specify cable sizing, circuit type, and estimated route length."
      >
        <form onSubmit={handleCreateRoute} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Route Name</label>
            <input
              type="text"
              required
              value={newRouteName}
              onChange={(e) => setNewRouteName(e.target.value)}
              placeholder="e.g. Route L3 - Terrace Architectural Lighting"
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Circuit Type</label>
            <select
              value={newRouteType}
              onChange={(e) => setNewRouteType(e.target.value as CableCircuitType)}
              className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
            >
              <option value="lighting">Lighting Circuit (1.5mm²)</option>
              <option value="sockets">Socket Circuit (2.5mm²)</option>
              <option value="appliance">Dedicated Appliance (4.0mm² - 6.0mm²)</option>
              <option value="control">Control & Smart Automation</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Cable Type</label>
              <input
                type="text"
                value={newRouteCable}
                onChange={(e) => setNewRouteCable(e.target.value)}
                placeholder="e.g. VVGng-LS 3x1.5"
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#9EB2CC] mb-1.5">Length (m)</label>
              <input
                type="number"
                value={newRouteLength}
                onChange={(e) => setNewRouteLength(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#061426] border border-[#1B3A5C] rounded-lg text-xs text-[#F4F8FF]"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-[#1B3A5C]">
            <button
              type="button"
              onClick={() => setIsAddRouteModalOpen(false)}
              className="px-3 py-1.5 bg-[#061426] text-xs font-medium text-[#9EB2CC] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#147DFF] text-white text-xs font-bold rounded-lg"
            >
              Save Route
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
