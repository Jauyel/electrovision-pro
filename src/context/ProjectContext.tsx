import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from 'react';
import { 
  Project, 
  Language, 
  Currency, 
  PowerCalculationResults, 
  MaterialItem, 
  ElectricalPoint, 
  CableRoute, 
  PanelComponent,
  CADCircuit,
  PanelEnclosure,
  RoomData,
  ActivityLogItem,
  ProjectTemplate,
  TemplateCategory,
  VoiceAnnotation
} from '../types';
import { translations } from '../translations';
import { downloadItemizedPdfReport } from '../lib/pdf-report';
import { BUILT_IN_TEMPLATES } from '../data/projectTemplates';
import { parseHash, formatRouteHash } from '../components/routing/HashRouter';

interface ProjectContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  usdToUzsRate: number;
  formatCurrency: (amountUzs: number) => string;
  t: typeof translations['en'];
  
  projects: Project[];
  activeProject: Project;
  setActiveProjectId: (id: string) => void;
  createNewProject: (
    name: string, 
    location: string, 
    options?: {
      client?: string;
      code?: string;
      leadEngineer?: string;
      standard?: 'IEC 60364' | 'GOST 31996' | 'NEC NFPA 70';
      archetype?: 'residential' | 'commercial' | 'industrial' | 'blank';
      initialVoltage?: 230 | 400;
    }
  ) => void;
  updateActiveProject: (updater: (prev: Project) => Project) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  exportProjectJson: (id: string) => string;
  importProjectJson: (jsonStr: string) => { success: boolean; error?: string };
  
  // Quick sub-updaters
  updateRoomPoints: (points: ElectricalPoint[]) => void;
  addRoomPoint: (point: ElectricalPoint) => void;
  removeRoomPoint: (id: string) => void;
  updateCableRoutes: (routes: CableRoute[]) => void;
  addCableRoute: (route: CableRoute) => void;
  updatePanelComponents: (components: PanelComponent[]) => void;
  addPanelComponent: (comp: PanelComponent) => void;
  removePanelComponent: (id: string) => void;
  updateCADCircuits: (circuits: CADCircuit[]) => void;
  
  // Power calculations
  powerCalculations: PowerCalculationResults;
  recalculatePower: () => void;
  needsRecalculation: boolean;
  
  // Synchronized BOM / Material calculation
  recalculateMaterialsFromProject: () => void;
  updateMaterials: (materials: MaterialItem[]) => void;
  addCustomMaterial: (item: Omit<MaterialItem, 'id'>) => void;
  removeMaterial: (id: string) => void;
  
  // Global search & navigation
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeModule: string;
  setActiveModule: (moduleName: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  
  // Activity Logs
  activityLogs: ActivityLogItem[];
  addActivityLog: (log: Omit<ActivityLogItem, 'id' | 'timestamp' | 'exactTime'>) => void;
  
  // Notifications
  notifications: { id: string; title: string; time: string; read: boolean }[];
  markAllNotificationsRead: () => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  triggerSave: () => void;

  // AI Co-Pilot & Engineering Suite Modal
  isAiModalOpen: boolean;
  aiModalTab: 'audit' | 'scan' | 'generate' | 'chat';
  openAiModal: (tab?: 'audit' | 'scan' | 'generate' | 'chat') => void;
  closeAiModal: () => void;

  // Stamped PDF Export
  downloadProjectPdf: () => void;

  // Project Templates & Circuit Presets
  templates: ProjectTemplate[];
  applyTemplate: (templateId: string, mode: 'replace' | 'append') => void;
  createProjectFromTemplate: (templateId: string, projectName?: string, location?: string) => void;
  saveCurrentAsTemplate: (name: string, category: TemplateCategory, description: string, tagline?: string) => ProjectTemplate;
  deleteCustomTemplate: (templateId: string) => void;
  exportTemplatesJson: () => string;
  importTemplatesJson: (jsonStr: string) => { success: boolean; importedCount: number; error?: string };
  isTemplatesModalOpen: boolean;
  openTemplatesModal: () => void;
  closeTemplatesModal: () => void;

  // Voice-to-Text Field Annotations
  voiceAnnotations: VoiceAnnotation[];
  addVoiceAnnotation: (annotation: Omit<VoiceAnnotation, 'id' | 'timestamp' | 'exactTime'>) => VoiceAnnotation;
  deleteVoiceAnnotation: (id: string) => void;
  updateVoiceAnnotation: (id: string, updates: Partial<VoiceAnnotation>) => void;
  exportAnnotationsToPunchList: () => number;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

// Initial Demonstration Project: Tashkent City Block 4 - Smart Penthouse
const INITIAL_PROJECTS: Project[] = [
  {
    id: "proj-tashkent-01",
    name: "Tashkent City Block 4 - Penthouse A7",
    code: "TC-B4-P7",
    location: "Shayxontohur, Tashkent, Uzbekistan",
    client: "Mirabad Residences LLC",
    leadEngineer: "Olimjon Khashimov, PE",
    standard: "IEC 60364",
    createdAt: "2026-10-10",
    updatedAt: "2026-10-17 08:30",
    laborRatePerDayUzs: 850000,
    contingencyPercent: 7.5,
    roomData: {
      projectName: "Tashkent City Block 4 - Penthouse A7",
      roomName: "Executive Living & Media Hall",
      roomType: "living_room",
      lengthMeters: 7.8,
      widthMeters: 5.4,
      heightMeters: 3.1,
      walls: [
        { id: "w-north", from: { x: 0, y: 0 }, to: { x: 7.8, y: 0 }, lengthMeters: 7.8, thicknessMm: 200, type: "concrete" },
        { id: "w-east", from: { x: 7.8, y: 0 }, to: { x: 7.8, y: 5.4 }, lengthMeters: 5.4, thicknessMm: 200, type: "concrete" },
        { id: "w-south", from: { x: 7.8, y: 5.4 }, to: { x: 0, y: 5.4 }, lengthMeters: 7.8, thicknessMm: 200, type: "brick" },
        { id: "w-west", from: { x: 0, y: 5.4 }, to: { x: 0, y: 0 }, lengthMeters: 5.4, thicknessMm: 200, type: "brick" },
      ],
      openings: [
        { id: "op-door-main", type: "door", wall: "west", x: 1.2, widthMeters: 1.0, heightMeters: 2.2 },
        { id: "op-win-terrace", type: "window", wall: "north", x: 2.0, widthMeters: 3.8, heightMeters: 2.6 }
      ],
      points: [
        { id: "pt-1", type: "panel", name: "Main Distribution Board (MDB-1)", wall: "west", x: 0.5, y: 0.8, heightMm: 1600, wattage: 0, notes: "Main 3-phase incoming distribution unit" },
        { id: "pt-2", type: "switch_2gang", name: "Entry Dual Switch", wall: "west", x: 1.4, y: 0.8, heightMm: 900, circuitId: "c-light-1", wattage: 20, notes: "Controls ceiling & perimeter LED" },
        { id: "pt-3", type: "ceiling_light", name: "Central Chandelier Array", wall: "ceiling", x: 3.9, y: 2.7, heightMm: 3100, circuitId: "c-light-1", wattage: 240, notes: "Dimmable warm 3000K LED driver" },
        { id: "pt-4", type: "spotlight", name: "Perimeter Downlights (Zone A)", wall: "ceiling", x: 1.8, y: 1.2, heightMm: 3100, circuitId: "c-light-1", wattage: 90, notes: "6x 15W architectural spot" },
        { id: "pt-5", type: "socket_double", name: "Media Center Socket Quad", wall: "north", x: 6.2, y: 0.2, heightMm: 350, circuitId: "c-sock-1", wattage: 1200, notes: "Dedicated surge protected outlets" },
        { id: "pt-6", type: "socket_double", name: "Lounge Sofa Sockets", wall: "south", x: 3.2, y: 5.2, heightMm: 300, circuitId: "c-sock-1", wattage: 400 },
        { id: "pt-7", type: "socket_double", name: "Desk Workspace Sockets", wall: "east", x: 7.6, y: 4.0, heightMm: 900, circuitId: "c-sock-2", wattage: 800 },
        { id: "pt-8", type: "ac_unit", name: "Inverter Multi-Split VRV", wall: "east", x: 7.5, y: 1.5, heightMm: 2700, circuitId: "c-app-ac", wattage: 2800, notes: "Independent 16A C-curve feed" },
        { id: "pt-9", type: "switch_1gang", name: "Terrace Access Switch", wall: "north", x: 1.8, y: 0.2, heightMm: 900, circuitId: "c-light-2", wattage: 10 }
      ],
      notes: "High-spec acoustic drywall partition on South wall. All horizontal cable runs must be recessed in ceiling slab or floor screed."
    },
    cableRoutes: [
      {
        id: "route-c-light-1",
        name: "Route L1 - Living Lighting",
        type: "lighting",
        color: "#18D8F2",
        cableType: "VVGng-LS 3x1.5",
        lengthMeters: 28.5,
        conduitType: "PVC Corrugated 16mm",
        pathPoints: [{ x: 0.5, y: 0.8, z: 2.8 }, { x: 1.4, y: 0.8, z: 2.8 }, { x: 3.9, y: 2.7, z: 2.8 }],
        connectedPoints: ["pt-1", "pt-2", "pt-3", "pt-4"],
        status: "verified"
      },
      {
        id: "route-c-sock-1",
        name: "Route S1 - Living Sockets",
        type: "sockets",
        color: "#147DFF",
        cableType: "VVGng-LS 3x2.5",
        lengthMeters: 36.0,
        conduitType: "PVC Corrugated 20mm Heavy",
        pathPoints: [{ x: 0.5, y: 0.8, z: 0.3 }, { x: 3.2, y: 5.2, z: 0.3 }, { x: 6.2, y: 0.2, z: 0.3 }],
        connectedPoints: ["pt-1", "pt-5", "pt-6"],
        status: "in_progress"
      },
      {
        id: "route-c-sock-2",
        name: "Route S2 - Office Sockets",
        type: "sockets",
        color: "#147DFF",
        cableType: "VVGng-LS 3x2.5",
        lengthMeters: 24.0,
        conduitType: "PVC Corrugated 20mm Heavy",
        pathPoints: [{ x: 0.5, y: 0.8, z: 0.3 }, { x: 7.6, y: 4.0, z: 0.3 }],
        connectedPoints: ["pt-1", "pt-7"],
        status: "planned"
      },
      {
        id: "route-c-app-ac",
        name: "Route AC1 - Inverter VRV",
        type: "appliance",
        color: "#FF9A24",
        cableType: "VVGng-LS 3x4.0",
        lengthMeters: 22.0,
        conduitType: "Fire-rated Low Smoke 25mm",
        pathPoints: [{ x: 0.5, y: 0.8, z: 2.8 }, { x: 7.5, y: 1.5, z: 2.8 }],
        connectedPoints: ["pt-1", "pt-8"],
        status: "planned"
      }
    ],
    installationTasks: [
      { id: "task-1", title: "Wall chasing and laser-level marking for living room switch heights (900mm)", description: "Ensure horizontal laser guideline matches architectural datum point ±2mm.", status: "completed", assignedTo: "Rustam Aliyev", category: "chasing" },
      { id: "task-2", title: "Run 20mm heavy corrugated conduit under screed for Media Quad", description: "Encase in concrete spacer blocks with 45mm minimum cover.", status: "completed", assignedTo: "Rustam Aliyev", category: "conduit" },
      { id: "task-3", title: "Pull VVGng-LS 3x2.5 and 3x1.5 copper conductors into Zone 1 conduits", description: "Leave 200mm tails inside junction and back-boxes for WAGO terminal connections.", status: "in_progress", assignedTo: "Bakhtiyor Sobirov", category: "cabling" },
      { id: "task-4", title: "Install Schneider Acti9 DIN enclosure & punch gland knockouts", description: "Surface level flush mounting inside electrical recess niche.", status: "in_progress", assignedTo: "Olimjon Khashimov", category: "panel" },
      { id: "task-5", title: "Megger insulation resistance test at 1000V DC (Target > 100 MΩ)", description: "Mandatory pre-energization safety verification under GOST 31996 / IEC 60364.", status: "pending", assignedTo: "Olimjon Khashimov", category: "testing" }
    ],
    checklist: [
      { id: "chk-1", label: "Verify room architectural dimensions against laser measurement logs", completed: true, category: "preparation" },
      { id: "chk-2", label: "Review 3D cable routes for clearance from hydronic heating pipes (min 150mm)", completed: true, category: "preparation" },
      { id: "chk-3", label: "Confirm electrical points with interior architectural elevation drawings", completed: true, category: "rough_in" },
      { id: "chk-4", label: "Review material requirements against current supplier warehouse stock", completed: true, category: "rough_in" },
      { id: "chk-5", label: "Record installation photographic progress in AI Installation Mode", completed: false, category: "trim_out" },
      { id: "chk-6", label: "Complete required insulation resistance and loop impedance inspections", completed: false, category: "inspection" },
      { id: "chk-7", label: "Prepare engineering handover report and stamped compliance certificate", completed: false, category: "inspection" }
    ],
    panelEnclosure: {
      model: "Schneider Electric Pragma 3x18",
      type: "flush",
      material: "metal",
      ipRating: "IP40",
      rows: 3,
      modulesPerRow: 18,
      totalModules: 54,
      widthMm: 450,
      heightMm: 620,
      depthMm: 125
    },
    panelComponents: [
      { id: "pc-main", railIndex: 0, slotPosition: 0, moduleWidth: 4, type: "mcb", model: "iC60N 4P 50A C", manufacturer: "Schneider Electric", ratedCurrentA: 50, breakingCapacityKa: 10, curve: "C", poles: "4P", phase: "3P", status: "verified" },
      { id: "pc-spd", railIndex: 0, slotPosition: 4, moduleWidth: 4, type: "surge", model: "iPRD40r Surge Protector 3P+N", manufacturer: "Schneider Electric", ratedCurrentA: 40, breakingCapacityKa: 40, curve: "C", poles: "4P", phase: "3P", status: "verified" },
      { id: "pc-rcd-1", railIndex: 0, slotPosition: 9, moduleWidth: 2, type: "rcd", model: "Acti9 iID 2P 40A 30mA Type A", manufacturer: "Schneider Electric", ratedCurrentA: 40, curve: "C", poles: "1P+N", phase: "L1", status: "verified" },
      { id: "pc-mcb-l1", railIndex: 0, slotPosition: 11, moduleWidth: 1, type: "mcb", model: "iC60N 1P 10A B", manufacturer: "Schneider Electric", ratedCurrentA: 10, breakingCapacityKa: 6, curve: "B", poles: "1P", phase: "L1", status: "verified", connectedCircuitId: "c-light-1" },
      { id: "pc-mcb-l2", railIndex: 0, slotPosition: 12, moduleWidth: 1, type: "mcb", model: "iC60N 1P 10A B", manufacturer: "Schneider Electric", ratedCurrentA: 10, breakingCapacityKa: 6, curve: "B", poles: "1P", phase: "L2", status: "verified", connectedCircuitId: "c-light-2" },
      
      { id: "pc-rcd-2", railIndex: 1, slotPosition: 0, moduleWidth: 2, type: "rcd", model: "Acti9 iID 2P 40A 30mA Type A", manufacturer: "Schneider Electric", ratedCurrentA: 40, curve: "C", poles: "1P+N", phase: "L2", status: "verified" },
      { id: "pc-mcb-s1", railIndex: 1, slotPosition: 2, moduleWidth: 1, type: "mcb", model: "iC60N 1P 16A C", manufacturer: "Schneider Electric", ratedCurrentA: 16, breakingCapacityKa: 6, curve: "C", poles: "1P", phase: "L2", status: "verified", connectedCircuitId: "c-sock-1" },
      { id: "pc-mcb-s2", railIndex: 1, slotPosition: 3, moduleWidth: 1, type: "mcb", model: "iC60N 1P 16A C", manufacturer: "Schneider Electric", ratedCurrentA: 16, breakingCapacityKa: 6, curve: "C", poles: "1P", phase: "L3", status: "verified", connectedCircuitId: "c-sock-2" },
      { id: "pc-rcbo-ac", railIndex: 1, slotPosition: 5, moduleWidth: 2, type: "rcbo", model: "iDPN N Vigi 1P+N 20A 30mA C", manufacturer: "Schneider Electric", ratedCurrentA: 20, breakingCapacityKa: 6, curve: "C", poles: "1P+N", phase: "L3", status: "verified", connectedCircuitId: "c-app-ac" },
      
      { id: "pc-meter", railIndex: 2, slotPosition: 0, moduleWidth: 4, type: "meter", model: "PowerTag Link 3-Phase Energy Meter", manufacturer: "Schneider Electric", ratedCurrentA: 63, curve: "C", poles: "3P+N", phase: "3P", status: "verified" },
      { id: "pc-relay", railIndex: 2, slotPosition: 5, moduleWidth: 2, type: "relay", model: "Zelio Smart Automation Gateway", manufacturer: "Schneider Electric", ratedCurrentA: 16, curve: "C", poles: "2P", phase: "L1", status: "verified" }
    ],
    cadCircuits: [
      { id: "c-light-1", tag: "QF1", name: "Living & Entry Lighting Group", phase: "L1", supplyVoltage: 230, powerWatts: 350, powerFactor: 0.95, cableLengthMeters: 28.5, conductor: "Cu", crossSectionMm2: 1.5, cableType: "VVGng-LS 3x1.5", installMethod: "conduit", breakerRatingA: 10 },
      { id: "c-light-2", tag: "QF2", name: "Terrace & Perimeter Lighting", phase: "L2", supplyVoltage: 230, powerWatts: 280, powerFactor: 0.92, cableLengthMeters: 22.0, conductor: "Cu", crossSectionMm2: 1.5, cableType: "VVGng-LS 3x1.5", installMethod: "conduit", breakerRatingA: 10 },
      { id: "c-sock-1", tag: "QF3", name: "Living Room Media & Sofa Sockets", phase: "L2", supplyVoltage: 230, powerWatts: 2400, powerFactor: 0.90, cableLengthMeters: 36.0, conductor: "Cu", crossSectionMm2: 2.5, cableType: "VVGng-LS 3x2.5", installMethod: "conduit", breakerRatingA: 16 },
      { id: "c-sock-2", tag: "QF4", name: "Executive Desk & Workstation Sockets", phase: "L3", supplyVoltage: 230, powerWatts: 1800, powerFactor: 0.92, cableLengthMeters: 24.0, conductor: "Cu", crossSectionMm2: 2.5, cableType: "VVGng-LS 3x2.5", installMethod: "conduit", breakerRatingA: 16 },
      { id: "c-app-ac", tag: "QF5", name: "Living Hall VRV Inverter AC Unit", phase: "L3", supplyVoltage: 230, powerWatts: 2800, powerFactor: 0.88, cableLengthMeters: 22.0, conductor: "Cu", crossSectionMm2: 4.0, cableType: "VVGng-LS 3x4.0", installMethod: "conduit", breakerRatingA: 20 },
      { id: "c-spare-3p", tag: "QF6", name: "Future 3-Phase Steam Sauna Feed", phase: "3P", supplyVoltage: 400, powerWatts: 6000, powerFactor: 0.98, cableLengthMeters: 18.0, conductor: "Cu", crossSectionMm2: 4.0, cableType: "VVGng-LS 5x4.0", installMethod: "tray", breakerRatingA: 25 }
    ],
    materials: [
      { id: "mat-1", category: "cables", name: "Copper Cable VVGng-LS 3x1.5 mm²", model: "Uzkabel GOST 31996-2012", specification: "Flame retardant, low smoke, 660V", unit: "m", quantity: 65, unitPriceUzS: 9800, wastePercent: 10, sourceModule: "Installation", notes: "Derived from lighting routes" },
      { id: "mat-2", category: "cables", name: "Copper Cable VVGng-LS 3x2.5 mm²", model: "Uzkabel GOST 31996-2012", specification: "Flame retardant, low smoke, 660V", unit: "m", quantity: 80, unitPriceUzS: 15400, wastePercent: 10, sourceModule: "Installation", notes: "Derived from socket routes" },
      { id: "mat-3", category: "cables", name: "Copper Cable VVGng-LS 3x4.0 mm²", model: "Uzkabel GOST 31996-2012", specification: "Heavy load dedicated feeder", unit: "m", quantity: 30, unitPriceUzS: 24500, wastePercent: 10, sourceModule: "Installation", notes: "Derived from AC unit route" },
      { id: "mat-4", category: "cables", name: "Copper Cable VVGng-LS 5x4.0 mm²", model: "Uzkabel GOST 31996-2012", specification: "Three-phase distribution feed", unit: "m", quantity: 25, unitPriceUzS: 38000, wastePercent: 8, sourceModule: "Electrical CAD", notes: "Derived from 3-phase spare circuit" },
      { id: "mat-5", category: "conduits", name: "Corrugated PVC Pipe d20mm Heavy Duty", model: "DKC Octo 20mm with steel pull wire", specification: "350N compression strength", unit: "m", quantity: 150, unitPriceUzS: 4200, wastePercent: 5, sourceModule: "Installation", notes: "Recessed in floor/walls" },
      { id: "mat-6", category: "panel_equipment", name: "Modular Flush Enclosure 54-Mod", model: "Schneider Electric Pragma 3x18", specification: "Metal chassis with transparent door IP40", unit: "pcs", quantity: 1, unitPriceUzS: 1850000, wastePercent: 0, sourceModule: "Panel Builder", notes: "Main distribution box" },
      { id: "mat-7", category: "protection", name: "Main Circuit Breaker iC60N 4P 50A C", model: "Schneider Electric Acti9", specification: "10kA breaking capacity", unit: "pcs", quantity: 1, unitPriceUzS: 540000, wastePercent: 0, sourceModule: "Panel Builder", notes: "Incoming switchgear" },
      { id: "mat-8", category: "protection", name: "RCD Residual Current Device 40A 30mA", model: "Schneider Acti9 iID 2P Type A", specification: "Electronic leakage protection", unit: "pcs", quantity: 2, unitPriceUzS: 620000, wastePercent: 0, sourceModule: "Panel Builder", notes: "L1 and L2 group protection" },
      { id: "mat-9", category: "protection", name: "Miniature Circuit Breaker 16A 1P C", model: "Schneider Acti9 iC60N 6kA", specification: "Socket branch protection", unit: "pcs", quantity: 2, unitPriceUzS: 110000, wastePercent: 0, sourceModule: "Panel Builder", notes: "Socket lines" },
      { id: "mat-10", category: "protection", name: "RCBO Residual Current Breaker 20A 30mA", model: "Schneider iDPN N Vigi 1P+N C", specification: "Integrated overcurrent + earth leakage", unit: "pcs", quantity: 1, unitPriceUzS: 480000, wastePercent: 0, sourceModule: "Panel Builder", notes: "HVAC line" },
      { id: "mat-11", category: "sockets_switches", name: "Schuko Double Socket Outlet", model: "Legrand Valena Allure White", specification: "16A 250V with child protection shutters", unit: "pcs", quantity: 8, unitPriceUzS: 95000, wastePercent: 5, sourceModule: "Room Scanner", notes: "Living & media zones" },
      { id: "mat-12", category: "sockets_switches", name: "2-Gang Light Switch Mechanism", model: "Legrand Valena Allure White", specification: "10AX 250V rocker switch", unit: "pcs", quantity: 2, unitPriceUzS: 82000, wastePercent: 0, sourceModule: "Room Scanner", notes: "Entry and terrace" },
      { id: "mat-13", category: "mounting", name: "WAGO 221-413 Compact Splicing Connectors", model: "WAGO 3-wire 4mm² Transparent", specification: "Box of 50 connectors", unit: "pack", quantity: 2, unitPriceUzS: 240000, wastePercent: 0, sourceModule: "Installation", notes: "Junction box terminations" }
    ],
    voiceAnnotations: [
      {
        id: "va-init-01",
        transcript: "Sub-Distribution Board MDB-1 clearance verified at 850mm. Terminal strip L2 screw requires 3.2 Nm torque recheck before energizing.",
        category: "defect",
        timestamp: "2026-10-17",
        exactTime: "09:42",
        audioDurationSeconds: 6.4,
        targetType: "point",
        targetId: "pt-1",
        targetLabel: "Main Distribution Board (MDB-1)",
        coordinates: { x: 28.5, y: 38.2 },
        severity: "warning",
        resolved: false,
        author: "Field Tech (Olimjon K.)"
      },
      {
        id: "va-init-02",
        transcript: "Living Hall VRV Inverter AC dedicated run inspected. Conduit sleeve passed through north acoustic partition without vibration dampening ring.",
        category: "punch_list",
        timestamp: "2026-10-17",
        exactTime: "10:15",
        audioDurationSeconds: 8.1,
        targetType: "point",
        targetId: "pt-8",
        targetLabel: "Inverter Multi-Split VRV",
        coordinates: { x: 74.2, y: 45.0 },
        severity: "critical",
        resolved: false,
        author: "Site Inspector"
      },
      {
        id: "va-init-03",
        transcript: "Media Center Socket Quad tested for earth continuity. PE loop impedance 0.28 Ohms, within IEC 60364-6 limits.",
        category: "verification",
        timestamp: "2026-10-17",
        exactTime: "11:04",
        audioDurationSeconds: 5.2,
        targetType: "point",
        targetId: "pt-5",
        targetLabel: "Media Center Socket Quad",
        coordinates: { x: 62.0, y: 64.5 },
        severity: "resolved",
        resolved: true,
        author: "Field Tech (Olimjon K.)"
      }
    ],
    calculations: [
      {
        id: "calc-init-01",
        kind: "Kuchlanish tushishi (ΔV%)",
        expression: "ΔV = 2 × ρ × L × I × cos φ ÷ S  |  ΔU% = (ΔV ÷ V_nom) × 100",
        result: "2.31 % (5.32 V)",
        createdAt: "2026-10-17 08:30",
        pueCompliance: "pass",
        details: [
          { label: "Kabel uzunligi", value: "25 m" },
          { label: "Kabel kesimi", value: "2.5 mm² (Mis VVGng-LS)" },
          { label: "Iste'molchidagi kuchlanish", value: "224.7 V" },
          { label: "PUE me'yori", value: "≤ 5.0% (PASS)" }
        ]
      },
      {
        id: "calc-init-02",
        kind: "1 fazali quvvat & Tok",
        expression: "P = V × I × cos φ ÷ 1000  |  I = P × 1000 ÷ (V × cos φ)",
        result: "3.39 kW (16.0 A)",
        createdAt: "2026-10-17 08:35",
        pueCompliance: "pass",
        details: [
          { label: "Nominal kuchlanish", value: "230 V" },
          { label: "Aktiv quvvat (P)", value: "3.39 kW" },
          { label: "To'liq quvvat (S)", value: "3.68 kVA" },
          { label: "Tavsiya etilgan avtomat", value: "C16A yoki C20A (1P+N)" }
        ]
      },
      {
        id: "calc-init-03",
        kind: "Yerga ulash konturi (R ≤ 4.0 Ω)",
        expression: "R = (ρ ÷ 2πL) × [ln(2L/d) + 0.5 ln((4T+L)/(4T-L))]",
        result: "3.85 Ω (PASS)",
        createdAt: "2026-10-17 08:40",
        pueCompliance: "pass",
        details: [
          { label: "Grunt solishtirma qarshiligi", value: "100 Ω·m (Loytuproq)" },
          { label: "Elektrodlar soni", value: "3 dona (L=2.5m, Ø16mm)" },
          { label: "Ulanish shakli", value: "Uchburchak 3x3x3m, lenta 40x4mm" }
        ]
      }
    ]
  },
  {
    id: "proj-samarkand-02",
    name: "Samarkand Silk Road Hub - Data Floor",
    code: "SRH-DF-02",
    location: "Registan Highway 45, Samarkand, Uzbekistan",
    client: "Samarkand Tech Park",
    leadEngineer: "Olimjon Khashimov, PE",
    standard: "IEC 60364",
    createdAt: "2026-09-28",
    updatedAt: "2026-10-15 14:10",
    laborRatePerDayUzs: 950000,
    contingencyPercent: 10.0,
    roomData: {
      projectName: "Samarkand Silk Road Hub - Data Floor",
      roomName: "Network Operations Control",
      roomType: "server_room",
      lengthMeters: 9.2,
      widthMeters: 6.8,
      heightMeters: 3.6,
      walls: [
        { id: "w-north", from: { x: 0, y: 0 }, to: { x: 9.2, y: 0 }, lengthMeters: 9.2, thicknessMm: 300, type: "concrete" },
        { id: "w-east", from: { x: 9.2, y: 0 }, to: { x: 9.2, y: 6.8 }, lengthMeters: 6.8, thicknessMm: 300, type: "concrete" },
        { id: "w-south", from: { x: 9.2, y: 6.8 }, to: { x: 0, y: 6.8 }, lengthMeters: 9.2, thicknessMm: 300, type: "concrete" },
        { id: "w-west", from: { x: 0, y: 6.8 }, to: { x: 0, y: 0 }, lengthMeters: 6.8, thicknessMm: 300, type: "concrete" },
      ],
      openings: [
        { id: "op-door-fire", type: "door", wall: "west", x: 1.0, widthMeters: 1.2, heightMeters: 2.3 }
      ],
      points: [
        { id: "pt-s1", type: "panel", name: "UPS Distribution Switchboard", wall: "north", x: 1.5, y: 0.5, heightMm: 1800, wattage: 0 },
        { id: "pt-s2", type: "socket_double", name: "Server Rack A PDU Feed", wall: "floor", x: 3.5, y: 2.5, heightMm: 0, circuitId: "sc-1", wattage: 3500 },
        { id: "pt-s3", type: "socket_double", name: "Server Rack B PDU Feed", wall: "floor", x: 5.5, y: 2.5, heightMm: 0, circuitId: "sc-2", wattage: 3500 },
        { id: "pt-s4", type: "ac_unit", name: "Precision CRAC Cooler 1", wall: "south", x: 2.5, y: 6.5, heightMm: 2200, circuitId: "sc-ac1", wattage: 4500 }
      ],
      notes: "Raised access floor (400mm clearance). Antistatic grounding grid required."
    },
    cableRoutes: [
      { id: "rt-s1", name: "UPS PDU Feeder 1", type: "appliance", color: "#FF9A24", cableType: "VVGng-FRLS 3x6.0", lengthMeters: 18.0, conduitType: "Metal Cable Basket 100mm", pathPoints: [{ x: 1.5, y: 0.5, z: 0.2 }, { x: 3.5, y: 2.5, z: 0.2 }], connectedPoints: ["pt-s1", "pt-s2"], status: "verified" },
      { id: "rt-s2", name: "UPS PDU Feeder 2", type: "appliance", color: "#FF9A24", cableType: "VVGng-FRLS 3x6.0", lengthMeters: 22.0, conduitType: "Metal Cable Basket 100mm", pathPoints: [{ x: 1.5, y: 0.5, z: 0.2 }, { x: 5.5, y: 2.5, z: 0.2 }], connectedPoints: ["pt-s1", "pt-s3"], status: "verified" }
    ],
    installationTasks: [
      { id: "st-1", title: "Install copper equipotential bonding bar (PE)", description: "Connect to main building earthing ring (tested < 2.0 Ohm).", status: "completed", assignedTo: "Sardor Umarov", category: "panel" },
      { id: "st-2", title: "Mount wire mesh cable trays below raised floor", description: "Stainless steel baskets with drop-out radius plates.", status: "in_progress", assignedTo: "Sardor Umarov", category: "conduit" }
    ],
    checklist: [
      { id: "sc-1", label: "Verify server rack clearance and cooling airflow", completed: true, category: "preparation" },
      { id: "sc-2", label: "Test static earthing resistance with calibrated ground tester", completed: true, category: "inspection" }
    ],
    panelEnclosure: {
      model: "ABB System pro E power Industrial Enclosure",
      type: "industrial",
      material: "metal",
      ipRating: "IP54",
      rows: 4,
      modulesPerRow: 24,
      totalModules: 96,
      widthMm: 800,
      heightMm: 1200,
      depthMm: 300
    },
    panelComponents: [
      { id: "spc-1", railIndex: 0, slotPosition: 0, moduleWidth: 4, type: "mcb", model: "ABB Tmax XT2 3P 100A", manufacturer: "ABB", ratedCurrentA: 100, breakingCapacityKa: 36, curve: "C", poles: "3P", phase: "3P", status: "verified" }
    ],
    cadCircuits: [
      { id: "sc-1", tag: "QF10", name: "Server Rack A Primary PDU", phase: "L1", supplyVoltage: 230, powerWatts: 3500, powerFactor: 0.98, cableLengthMeters: 18.0, conductor: "Cu", crossSectionMm2: 6.0, cableType: "VVGng-FRLS 3x6.0", installMethod: "tray", breakerRatingA: 25 },
      { id: "sc-2", tag: "QF11", name: "Server Rack B Primary PDU", phase: "L2", supplyVoltage: 230, powerWatts: 3500, powerFactor: 0.98, cableLengthMeters: 22.0, conductor: "Cu", crossSectionMm2: 6.0, cableType: "VVGng-FRLS 3x6.0", installMethod: "tray", breakerRatingA: 25 },
      { id: "sc-ac1", tag: "QF12", name: "CRAC Inverter Precision Cooler", phase: "3P", supplyVoltage: 400, powerWatts: 4500, powerFactor: 0.89, cableLengthMeters: 26.0, conductor: "Cu", crossSectionMm2: 4.0, cableType: "VVGng-LS 5x4.0", installMethod: "tray", breakerRatingA: 20 }
    ],
    materials: [
      { id: "smat-1", category: "cables", name: "Copper Cable VVGng-FRLS 3x6.0 mm²", model: "Fire Resistant Low Smoke", specification: "Halogen free 180min fire survival", unit: "m", quantity: 60, unitPriceUzS: 48000, wastePercent: 10, sourceModule: "Installation", notes: "Server feeds" }
    ]
  }
];

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('uz'); // default to Uzbek, with switch to English/Russian
  const [currency, setCurrency] = useState<Currency>('UZS'); // default to Uzbekistani som
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('electrovision_projects_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to read projects from localStorage", e);
    }
    return INITIAL_PROJECTS;
  });
  const [activeProjectId, setActiveProjectId] = useState<string>("proj-tashkent-01");

  useEffect(() => {
    try {
      localStorage.setItem('electrovision_projects_v3', JSON.stringify(projects));
    } catch (e) {
      console.warn("Failed to persist projects to localStorage", e);
    }
  }, [projects]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeModule, setActiveModuleState] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const parsed = parseHash(window.location.hash);
      return parsed.primary === 'tools' ? parsed.tool : parsed.primary;
    }
    return 'dashboard';
  });

  const setActiveModule = useCallback((moduleName: string) => {
    setActiveModuleState(moduleName);
    if (typeof window !== 'undefined') {
      const targetHash = formatRouteHash(moduleName);
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }
  }, []);

  // Synchronize browser back/forward and hash changes with activeModule
  useEffect(() => {
    const handleHashSync = () => {
      if (typeof window !== 'undefined') {
        const parsed = parseHash(window.location.hash);
        const resolvedModule = parsed.primary === 'tools' ? parsed.tool : parsed.primary;
        setActiveModuleState(resolvedModule);
      }
    };

    window.addEventListener('hashchange', handleHashSync);
    return () => window.removeEventListener('hashchange', handleHashSync);
  }, []);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [needsRecalculation, setNeedsRecalculation] = useState<boolean>(false);

  const usdToUzsRate = 12900; // Realistic exchange rate (1 USD = ~12,900 UZS)

  const activeProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  const t = translations[language];

  const formatCurrency = (amountUzs: number) => {
    if (currency === 'USD') {
      const usd = amountUzs / usdToUzsRate;
      return `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    // Uzbekistani Som format
    return `${Math.round(amountUzs).toLocaleString('uz-UZ')} so'm`;
  };

  const updateActiveProject = (updater: (prev: Project) => Project) => {
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        const updated = updater(p);
        updated.updatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
        return updated;
      }
      return p;
    }));
    setNeedsRecalculation(true);
  };

  const createNewProject = (
    name: string, 
    location: string, 
    options?: {
      client?: string;
      code?: string;
      leadEngineer?: string;
      standard?: 'IEC 60364' | 'GOST 31996' | 'NEC NFPA 70';
      archetype?: 'residential' | 'commercial' | 'industrial' | 'blank';
      initialVoltage?: 230 | 400;
    }
  ) => {
    const newId = `proj-${Date.now()}`;
    const archetype = options?.archetype || 'residential';
    const standard = options?.standard || 'IEC 60364';
    const client = options?.client || 'Private Client';
    const leadEngineer = options?.leadEngineer || 'Olimjon Khashimov, PE';
    const code = options?.code || `EL-${Math.floor(100 + Math.random() * 900)}`;

    let starterCircuits: CADCircuit[] = [];
    let starterEnclosure: PanelEnclosure = {
      model: "Schneider Electric Pragma 36M",
      type: "flush",
      material: "metal",
      ipRating: "IP40",
      rows: 2,
      modulesPerRow: 18,
      totalModules: 36,
      widthMm: 450,
      heightMm: 450,
      depthMm: 120
    };
    let starterComponents: PanelComponent[] = [];
    let starterRoom: RoomData = {
      projectName: name,
      roomName: "Primary Room",
      roomType: "living_room",
      lengthMeters: 6.0,
      widthMeters: 4.5,
      heightMeters: 3.0,
      walls: [
        { id: "w-1", from: { x: 0, y: 0 }, to: { x: 6, y: 0 }, lengthMeters: 6, thicknessMm: 200, type: "concrete" },
        { id: "w-2", from: { x: 6, y: 0 }, to: { x: 6, y: 4.5 }, lengthMeters: 4.5, thicknessMm: 200, type: "concrete" },
        { id: "w-3", from: { x: 6, y: 4.5 }, to: { x: 0, y: 4.5 }, lengthMeters: 6, thicknessMm: 200, type: "brick" },
        { id: "w-4", from: { x: 0, y: 4.5 }, to: { x: 0, y: 0 }, lengthMeters: 4.5, thicknessMm: 200, type: "brick" },
      ],
      openings: [
        { id: "op-1", type: "door", wall: "west", x: 1.0, widthMeters: 0.9, heightMeters: 2.1 }
      ],
      points: [
        { id: "pt-new-1", type: "panel", name: "Distribution Board", wall: "west", x: 0.4, y: 0.5, heightMm: 1600, wattage: 0 }
      ],
      notes: "Newly initiated room layout."
    };

    if (archetype === 'residential') {
      starterCircuits = [
        { id: `c-${Date.now()}-1`, tag: "QF1", name: "Living & Entry Lighting", phase: "L1", supplyVoltage: 230, powerWatts: 350, powerFactor: 0.95, cableLengthMeters: 24, conductor: "Cu", crossSectionMm2: 1.5, cableType: "VVGng-LS 3x1.5", installMethod: "conduit", breakerRatingA: 10 },
        { id: `c-${Date.now()}-2`, tag: "QF2", name: "General Power Outlets", phase: "L2", supplyVoltage: 230, powerWatts: 2200, powerFactor: 0.95, cableLengthMeters: 28, conductor: "Cu", crossSectionMm2: 2.5, cableType: "VVGng-LS 3x2.5", installMethod: "conduit", breakerRatingA: 16 },
        { id: `c-${Date.now()}-3`, tag: "QF3", name: "Kitchen Power Appliances", phase: "L3", supplyVoltage: 230, powerWatts: 3200, powerFactor: 0.92, cableLengthMeters: 18, conductor: "Cu", crossSectionMm2: 2.5, cableType: "VVGng-LS 3x2.5", installMethod: "conduit", breakerRatingA: 16 },
        { id: `c-${Date.now()}-4`, tag: "QF4", name: "Inverter Climate Control (HVAC)", phase: "L1", supplyVoltage: 230, powerWatts: 2400, powerFactor: 0.88, cableLengthMeters: 22, conductor: "Cu", crossSectionMm2: 4.0, cableType: "VVGng-LS 3x4.0", installMethod: "conduit", breakerRatingA: 20 }
      ];
      starterComponents = [
        { id: `pc-${Date.now()}-main`, railIndex: 0, slotPosition: 0, moduleWidth: 4, type: "mcb", model: "iC60N 4P 40A C", manufacturer: "Schneider Electric", ratedCurrentA: 40, breakingCapacityKa: 6, curve: "C", poles: "4P", phase: "3P", status: "verified" },
        { id: `pc-${Date.now()}-rcd1`, railIndex: 0, slotPosition: 4, moduleWidth: 2, type: "rcd", model: "Acti9 iID 2P 40A 30mA", manufacturer: "Schneider Electric", ratedCurrentA: 40, curve: "C", poles: "1P+N", phase: "L1", status: "verified" }
      ];
    } else if (archetype === 'commercial') {
      starterEnclosure = {
        model: "Schneider Electric Prisma G 4x24",
        type: "surface",
        material: "metal",
        ipRating: "IP40",
        rows: 4,
        modulesPerRow: 24,
        totalModules: 96,
        widthMm: 600,
        heightMm: 950,
        depthMm: 220
      };
      starterCircuits = [
        { id: `c-${Date.now()}-1`, tag: "QF10", name: "Workstation PDU Feeder A", phase: "L1", supplyVoltage: 230, powerWatts: 3500, powerFactor: 0.98, cableLengthMeters: 20, conductor: "Cu", crossSectionMm2: 6.0, cableType: "VVGng-FRLS 3x6.0", installMethod: "tray", breakerRatingA: 25 },
        { id: `c-${Date.now()}-2`, tag: "QF11", name: "Workstation PDU Feeder B", phase: "L2", supplyVoltage: 230, powerWatts: 3500, powerFactor: 0.98, cableLengthMeters: 22, conductor: "Cu", crossSectionMm2: 6.0, cableType: "VVGng-FRLS 3x6.0", installMethod: "tray", breakerRatingA: 25 },
        { id: `c-${Date.now()}-3`, tag: "QF12", name: "Precision CRAC Inverter Unit", phase: "3P", supplyVoltage: 400, powerWatts: 5000, powerFactor: 0.90, cableLengthMeters: 25, conductor: "Cu", crossSectionMm2: 4.0, cableType: "VVGng-LS 5x4.0", installMethod: "tray", breakerRatingA: 25 }
      ];
      starterComponents = [
        { id: `pc-${Date.now()}-main`, railIndex: 0, slotPosition: 0, moduleWidth: 4, type: "mcb", model: "NSX100F 3P 100A", manufacturer: "Schneider Electric", ratedCurrentA: 100, breakingCapacityKa: 36, curve: "C", poles: "3P", phase: "3P", status: "verified" }
      ];
      starterRoom.roomType = "office";
    } else if (archetype === 'industrial') {
      starterEnclosure = {
        model: "ABB System pro E power Industrial Enclosure",
        type: "industrial",
        material: "metal",
        ipRating: "IP54",
        rows: 4,
        modulesPerRow: 24,
        totalModules: 96,
        widthMm: 800,
        heightMm: 1200,
        depthMm: 300
      };
      starterCircuits = [
        { id: `c-${Date.now()}-1`, tag: "QF20", name: "Primary 3-Phase Induction Motor", phase: "3P", supplyVoltage: 400, powerWatts: 11000, powerFactor: 0.85, cableLengthMeters: 30, conductor: "Cu", crossSectionMm2: 10.0, cableType: "VVGng-LS 5x10.0", installMethod: "tray", breakerRatingA: 32 },
        { id: `c-${Date.now()}-2`, tag: "QF21", name: "Industrial High-Bay Lighting", phase: "L1", supplyVoltage: 230, powerWatts: 1800, powerFactor: 0.96, cableLengthMeters: 35, conductor: "Cu", crossSectionMm2: 2.5, cableType: "VVGng-LS 3x2.5", installMethod: "tray", breakerRatingA: 16 }
      ];
      starterRoom.roomType = "electrical_room";
    } else {
      starterCircuits = [
        { id: `c-${Date.now()}-1`, tag: "QF1", name: "General Lighting", phase: "L1", supplyVoltage: 230, powerWatts: 300, powerFactor: 0.95, cableLengthMeters: 20, conductor: "Cu", crossSectionMm2: 1.5, cableType: "VVGng-LS 3x1.5", installMethod: "conduit", breakerRatingA: 10 }
      ];
      starterComponents = [
        { id: `pc-${Date.now()}-1`, railIndex: 0, slotPosition: 0, moduleWidth: 2, type: "mcb", model: "iC60N 2P 40A C", manufacturer: "Schneider Electric", ratedCurrentA: 40, breakingCapacityKa: 6, curve: "C", poles: "2P", phase: "L1", status: "verified" }
      ];
    }

    const newProj: Project = {
      id: newId,
      name: name || "New Electrical Installation",
      code,
      location: location || "Tashkent, Uzbekistan",
      client,
      leadEngineer,
      standard,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      laborRatePerDayUzs: 850000,
      contingencyPercent: 5.0,
      roomData: starterRoom,
      cableRoutes: [],
      installationTasks: [
        { id: `nt-${Date.now()}-1`, title: "Complete initial room measurement and laser check", description: "Take diagonal cross-measurements to verify wall squareness.", status: "pending", assignedTo: leadEngineer, category: "preparation" }
      ],
      checklist: [
        { id: `nchk-${Date.now()}-1`, label: "Verify room architectural dimensions", completed: false, category: "preparation" },
        { id: `nchk-${Date.now()}-2`, label: "Plan cable conduit routes and distribution board niche", completed: false, category: "rough_in" }
      ],
      panelEnclosure: starterEnclosure,
      panelComponents: starterComponents,
      cadCircuits: starterCircuits,
      materials: [],
    };

    setProjects(prev => [newProj, ...prev]);
    setActiveProjectId(newId);
    setNeedsRecalculation(true);
    addActivityLog({
      action: 'Created Project',
      details: `Initialized new project "${newProj.name}" (${newProj.code}) with standard ${newProj.standard}`,
      category: 'project',
      status: 'completed',
      user: leadEngineer,
      moduleTarget: 'cad'
    });
  };

  const duplicateProject = (id: string) => {
    const target = projects.find(p => p.id === id);
    if (!target) return;
    const newId = `proj-${Date.now()}`;
    const duplicated: Project = {
      ...JSON.parse(JSON.stringify(target)),
      id: newId,
      name: `${target.name} (Nusxa)`,
      code: `CP-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };
    setProjects(prev => [duplicated, ...prev]);
    setActiveProjectId(newId);
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) {
      alert("Oxirgi loyihani o'chirish mumkin emas. Kamida bitta loyiha bo'lishi kerak.");
      return;
    }
    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== id);
      if (activeProjectId === id && filtered.length > 0) {
        setActiveProjectId(filtered[0].id);
      }
      return filtered;
    });
  };

  const exportProjectJson = (id: string): string => {
    const target = projects.find(p => p.id === id) || activeProject;
    const jsonStr = JSON.stringify(target, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-${target.code || 'export'}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return jsonStr;
  };

  const importProjectJson = (jsonStr: string): { success: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || typeof parsed !== 'object' || !parsed.name || !parsed.roomData) {
        return { success: false, error: "Noto'g'ri loyiha fayli formati (Invalid project schema)" };
      }
      const newId = `proj-imp-${Date.now()}`;
      const importedProject: Project = {
        ...parsed,
        id: newId,
        name: parsed.name ? `${parsed.name} (Imported)` : "Imported Project",
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      };
      setProjects(prev => [importedProject, ...prev]);
      setActiveProjectId(newId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "JSON tahlil qilishda xatolik" };
    }
  };

  // Updaters for points, routes, panel, cad
  const updateRoomPoints = (points: ElectricalPoint[]) => {
    updateActiveProject(p => ({
      ...p,
      roomData: { ...p.roomData, points }
    }));
  };

  const addRoomPoint = (point: ElectricalPoint) => {
    updateActiveProject(p => ({
      ...p,
      roomData: { ...p.roomData, points: [...p.roomData.points, point] }
    }));
  };

  const removeRoomPoint = (id: string) => {
    updateActiveProject(p => ({
      ...p,
      roomData: { ...p.roomData, points: p.roomData.points.filter(pt => pt.id !== id) }
    }));
  };

  const updateCableRoutes = (routes: CableRoute[]) => {
    updateActiveProject(p => ({ ...p, cableRoutes: routes }));
  };

  const addCableRoute = (route: CableRoute) => {
    updateActiveProject(p => ({ ...p, cableRoutes: [...p.cableRoutes, route] }));
  };

  const updatePanelComponents = (components: PanelComponent[]) => {
    updateActiveProject(p => ({ ...p, panelComponents: components }));
  };

  const addPanelComponent = (comp: PanelComponent) => {
    updateActiveProject(p => ({ ...p, panelComponents: [...p.panelComponents, comp] }));
  };

  const removePanelComponent = (id: string) => {
    updateActiveProject(p => ({ ...p, panelComponents: p.panelComponents.filter(c => c.id !== id) }));
  };

  const updateCADCircuits = (circuits: CADCircuit[]) => {
    updateActiveProject(p => ({ ...p, cadCircuits: circuits }));
  };

  const updateMaterials = (materials: MaterialItem[]) => {
    updateActiveProject(p => ({ ...p, materials }));
  };

  const addCustomMaterial = (item: Omit<MaterialItem, 'id'>) => {
    const newItem: MaterialItem = { ...item, id: `mat-${Date.now()}` };
    updateActiveProject(p => ({ ...p, materials: [newItem, ...p.materials] }));
  };

  const removeMaterial = (id: string) => {
    updateActiveProject(p => ({ ...p, materials: p.materials.filter(m => m.id !== id) }));
  };

  // Deterministic Power Analysis Engine (IEC 60364 & GOST 31996 compliant)
  const powerCalculations: PowerCalculationResults = useMemo(() => {
    const circuits = activeProject.cadCircuits;
    let l1Watts = 0;
    let l2Watts = 0;
    let l3Watts = 0;
    let totalActiveWatts = 0;

    const circuitCalculations = circuits.map(c => {
      // Current calculation:
      // 1-phase: Ib = P / (230 * cosPhi)
      // 3-phase: Ib = P / (sqrt(3) * 400 * cosPhi)
      let calculatedCurrentA = 0;
      if (c.phase === '3P' || c.supplyVoltage === 400) {
        calculatedCurrentA = c.powerWatts / (Math.sqrt(3) * 400 * (c.powerFactor || 0.9));
        l1Watts += c.powerWatts / 3;
        l2Watts += c.powerWatts / 3;
        l3Watts += c.powerWatts / 3;
      } else {
        calculatedCurrentA = c.powerWatts / (230 * (c.powerFactor || 0.9));
        if (c.phase === 'L1') l1Watts += c.powerWatts;
        else if (c.phase === 'L2') l2Watts += c.powerWatts;
        else l3Watts += c.powerWatts;
      }
      totalActiveWatts += c.powerWatts;

      // Deterministic Voltage drop calculation (V and %):
      // Resistivity: Copper rho = 0.0175 Ohm*mm²/m, Aluminum rho = 0.028 Ohm*mm²/m
      const rho = c.conductor === 'Al' ? 0.028 : 0.0175;
      let voltageDropV = 0;
      if (c.phase === '3P') {
        // Delta U = sqrt(3) * L * Ib * cosPhi * rho / S
        voltageDropV = (Math.sqrt(3) * c.cableLengthMeters * calculatedCurrentA * c.powerFactor * rho) / c.crossSectionMm2;
      } else {
        // Delta U = 2 * L * Ib * cosPhi * rho / S
        voltageDropV = (2 * c.cableLengthMeters * calculatedCurrentA * c.powerFactor * rho) / c.crossSectionMm2;
      }
      const voltageDropPercent = (voltageDropV / c.supplyVoltage) * 100;

      // Permissible current table (approximate IEC 60364-5-52 for Cu in conduit):
      const thermalMap: Record<number, number> = {
        1.5: 16.5,
        2.5: 22.0,
        4.0: 30.0,
        6.0: 38.0,
        10.0: 52.0,
        16.0: 70.0
      };
      const thermalPermissibleA = (thermalMap[c.crossSectionMm2] || 20) * (c.conductor === 'Al' ? 0.78 : 1.0);

      // Compliance verification:
      // 1. Ib must be <= breakerRatingA
      // 2. breakerRatingA must be <= thermalPermissibleA
      // 3. voltageDropPercent <= 3.0% (lighting) or <= 5.0% (power)
      const maxAllowableDrop = c.name.toLowerCase().includes('light') ? 3.0 : 5.0;
      let isCompliant = true;
      let warningMessage = "";

      if (calculatedCurrentA > c.breakerRatingA) {
        isCompliant = false;
        warningMessage = `Operating current (${calculatedCurrentA.toFixed(1)}A) exceeds breaker rating (${c.breakerRatingA}A)!`;
      } else if (c.breakerRatingA > thermalPermissibleA) {
        isCompliant = false;
        warningMessage = `Breaker rating (${c.breakerRatingA}A) exceeds cable continuous capacity (${thermalPermissibleA}A for ${c.crossSectionMm2}mm²)!`;
      } else if (voltageDropPercent > maxAllowableDrop) {
        isCompliant = false;
        warningMessage = `Voltage drop (${voltageDropPercent.toFixed(2)}%) exceeds IEC limit (${maxAllowableDrop}%). Increase cross-section!`;
      }

      return {
        circuitId: c.id,
        calculatedCurrentA: Number(calculatedCurrentA.toFixed(2)),
        voltageDropV: Number(voltageDropV.toFixed(2)),
        voltageDropPercent: Number(voltageDropPercent.toFixed(2)),
        thermalPermissibleA,
        isCompliant,
        warningMessage: warningMessage || undefined
      };
    });

    const avgWattsPerPhase = (l1Watts + l2Watts + l3Watts) / 3 || 1;
    const maxPhaseDiff = Math.max(
      Math.abs(l1Watts - avgWattsPerPhase),
      Math.abs(l2Watts - avgWattsPerPhase),
      Math.abs(l3Watts - avgWattsPerPhase)
    );
    const phaseBalanceUnbalancePercent = avgWattsPerPhase > 0 ? (maxPhaseDiff / avgWattsPerPhase) * 100 : 0;

    const totalActivePowerKw = totalActiveWatts / 1000;
    const totalApparentPowerKva = totalActivePowerKw / 0.92;
    const designCurrentA = totalActiveWatts / (Math.sqrt(3) * 400 * 0.92);

    const hasWarnings = circuitCalculations.some(c => !c.isCompliant) || phaseBalanceUnbalancePercent > 15;

    return {
      totalActivePowerKw: Number(totalActivePowerKw.toFixed(2)),
      totalApparentPowerKva: Number(totalApparentPowerKva.toFixed(2)),
      designCurrentA: Number(designCurrentA.toFixed(2)),
      phaseLoadsKw: {
        L1: Number((l1Watts / 1000).toFixed(2)),
        L2: Number((l2Watts / 1000).toFixed(2)),
        L3: Number((l3Watts / 1000).toFixed(2))
      },
      phaseBalanceUnbalancePercent: Number(phaseBalanceUnbalancePercent.toFixed(1)),
      circuitCalculations,
      overallStatus: hasWarnings ? 'warning' : 'compliant',
      standardsCompliance: activeProject.standard
    };
  }, [activeProject.cadCircuits, activeProject.standard]);

  const recalculatePower = () => {
    setNeedsRecalculation(false);
  };

  // Recalculate and synchronize BOM from active modules
  const recalculateMaterialsFromProject = () => {
    // 1. Calculate cables from routes:
    const cableGroups: Record<string, number> = {};
    activeProject.cableRoutes.forEach(r => {
      const key = `${r.cableType}|${r.conduitType}`;
      cableGroups[key] = (cableGroups[key] || 0) + r.lengthMeters;
    });

    // 2. Count electrical points:
    let socketCount = 0;
    let switchCount = 0;
    let lightCount = 0;
    activeProject.roomData.points.forEach(p => {
      if (p.type.includes('socket')) socketCount++;
      if (p.type.includes('switch')) switchCount++;
      if (p.type.includes('light') || p.type.includes('spot')) lightCount++;
    });

    // 3. Panel components:
    const panelItems: MaterialItem[] = activeProject.panelComponents.map((pc, idx) => ({
      id: `syn-p-${pc.id}`,
      category: 'protection',
      name: `${pc.manufacturer} ${pc.model}`,
      model: pc.model,
      specification: `${pc.poles} ${pc.ratedCurrentA}A ${pc.curve || ''} ${pc.breakingCapacityKa || 6}kA`,
      unit: 'pcs',
      quantity: 1,
      unitPriceUzS: pc.type === 'rcd' ? 620000 : pc.type === 'rcbo' ? 480000 : pc.type === 'mcb' && pc.poles === '4P' ? 540000 : 115000,
      wastePercent: 0,
      sourceModule: 'Panel Builder',
      notes: `Installed on DIN Rail row ${pc.railIndex + 1}`
    }));

    // Build complete updated material list
    const synchronizedMaterials: MaterialItem[] = [
      ...Object.entries(cableGroups).map(([key, len], idx) => {
        const [cType] = key.split('|');
        const pricePerM = cType.includes('1.5') ? 9800 : cType.includes('2.5') ? 15400 : cType.includes('4.0') ? 24500 : 38000;
        return {
          id: `syn-cab-${idx}`,
          category: 'cables' as const,
          name: `Copper Power Cable ${cType}`,
          model: 'Uzkabel GOST 31996-2012',
          specification: 'Flame retardant, low smoke, 660V Cu',
          unit: 'm' as const,
          quantity: Math.ceil(len),
          unitPriceUzS: pricePerM,
          wastePercent: 10,
          sourceModule: 'Installation' as const,
          notes: 'Auto-calculated from 3D cable routes with 10% cutting reserve'
        };
      }),
      {
        id: 'syn-conduit',
        category: 'conduits',
        name: 'PVC Corrugated Conduit 20mm with steel pull wire',
        model: 'DKC Heavy Flame Retardant',
        specification: 'Self-extinguishing 350N',
        unit: 'm',
        quantity: Math.ceil(Object.values(cableGroups).reduce((a, b) => a + b, 0) * 1.05),
        unitPriceUzS: 4200,
        wastePercent: 5,
        sourceModule: 'Installation',
        notes: 'Enclosure and wall chasing length'
      },
      {
        id: 'syn-panel-enc',
        category: 'panel_equipment',
        name: activeProject.panelEnclosure.model,
        model: activeProject.panelEnclosure.model,
        specification: `${activeProject.panelEnclosure.totalModules} Modules, ${activeProject.panelEnclosure.ipRating}`,
        unit: 'pcs',
        quantity: 1,
        unitPriceUzS: 1850000,
        wastePercent: 0,
        sourceModule: 'Panel Builder',
        notes: 'Flush mount chassis'
      },
      ...panelItems,
      {
        id: 'syn-sockets',
        category: 'sockets_switches',
        name: 'Schuko Double Socket Outlet with Shutters',
        model: 'Legrand Valena Allure 16A',
        specification: '250V 16A German standard grounded',
        unit: 'pcs',
        quantity: Math.max(socketCount, 1),
        unitPriceUzS: 95000,
        wastePercent: 5,
        sourceModule: 'Room Scanner',
        notes: 'Synchronized with room points'
      },
      {
        id: 'syn-switches',
        category: 'sockets_switches',
        name: 'Modular Light Switches (1-Gang & 2-Gang)',
        model: 'Legrand Valena Allure 10AX',
        specification: '250V Rocker mechanism',
        unit: 'pcs',
        quantity: Math.max(switchCount, 1),
        unitPriceUzS: 82000,
        wastePercent: 0,
        sourceModule: 'Room Scanner',
        notes: 'Synchronized with room switches'
      },
      {
        id: 'syn-wago',
        category: 'mounting',
        name: 'WAGO 221-413 Splicing Connectors',
        model: 'WAGO 221 Series (3x4mm²)',
        specification: 'Compact lever connectors',
        unit: 'pack',
        quantity: 2,
        unitPriceUzS: 240000,
        wastePercent: 0,
        sourceModule: 'Installation',
        notes: 'Junction box accessories'
      }
    ];

    updateActiveProject(p => ({ ...p, materials: synchronizedMaterials }));
    setNeedsRecalculation(false);
  };

  const triggerSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    }, 400);
  };

  const INITIAL_ACTIVITIES: ActivityLogItem[] = [
    {
      id: 'act-01',
      action: 'Updated CAD Drawing',
      details: 'Modified cable sizing for QF4 Kitchen Power (3x4mm² Cu) — ΔU reduced to 1.74%',
      category: 'cad',
      status: 'completed',
      timestamp: '8 mins ago',
      exactTime: '09:01:14',
      user: 'Olimjon K.',
      moduleTarget: 'cad'
    },
    {
      id: 'act-02',
      action: 'Recalculated Load Flow',
      details: 'Deterministic IEC 60364-5-52 analysis: connected active power 14.2 kW, Ib = 24.3A',
      category: 'cad',
      status: 'verified',
      timestamp: '24 mins ago',
      exactTime: '08:45:02',
      user: 'Olimjon K.',
      moduleTarget: 'cad'
    },
    {
      id: 'act-03',
      action: 'Exported Report',
      details: 'Generated complete technical audit PDF & single-line diagram certificate',
      category: 'report',
      status: 'completed',
      timestamp: '1 hour ago',
      exactTime: '08:08:29',
      user: 'Olimjon K.',
      moduleTarget: 'reports'
    },
    {
      id: 'act-04',
      action: 'Configured DIN Rail',
      details: 'Assigned ABB S200 miniature circuit breakers and Type A 30mA RCD to Rail 1 & Rail 2',
      category: 'panel',
      status: 'verified',
      timestamp: '2 hours ago',
      exactTime: '07:12:40',
      user: 'Olimjon K.',
      moduleTarget: 'panel'
    },
    {
      id: 'act-05',
      action: 'Synchronized BOM',
      details: 'Auto-extracted 18 BOM line items and updated procurement cost take-off with waste factor',
      category: 'bom',
      status: 'completed',
      timestamp: '3 hours ago',
      exactTime: '06:21:18',
      user: 'Olimjon K.',
      moduleTarget: 'estimator'
    },
    {
      id: 'act-06',
      action: 'Created Project',
      details: 'Initialized project TC-B4-P7 for Tashkent City Block 4 with IEC 60364 standards',
      category: 'project',
      status: 'completed',
      timestamp: 'Yesterday',
      exactTime: '16:42:00',
      user: 'Olimjon K.',
      moduleTarget: 'scanner'
    }
  ];

  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(INITIAL_ACTIVITIES);

  const addActivityLog = (log: Omit<ActivityLogItem, 'id' | 'timestamp' | 'exactTime'>) => {
    const now = new Date();
    const exactTime = now.toTimeString().split(' ')[0];
    const newLog: ActivityLogItem = {
      ...log,
      id: `act-${Date.now()}`,
      timestamp: 'Just now',
      exactTime
    };
    setActivityLogs(prev => [newLog, ...prev]);
  };

  const [notifications, setNotifications] = useState([
    { id: '1', title: 'Power flow calculation verified with zero thermal violations', time: '10 min ago', read: false },
    { id: '2', title: 'Phase asymmetry on Tashkent City Penthouse balanced to 8.4%', time: '1 hour ago', read: false },
    { id: '3', title: 'Schneider Acti9 DIN enclosure occupancy at 68% (optimal clearance)', time: '3 hours ago', read: true }
  ]);

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // AI Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiModalTab, setAiModalTab] = useState<'audit' | 'scan' | 'generate' | 'chat'>('audit');

  const openAiModal = (tab: 'audit' | 'scan' | 'generate' | 'chat' = 'audit') => {
    setAiModalTab(tab);
    setIsAiModalOpen(true);
  };

  const closeAiModal = () => {
    setIsAiModalOpen(false);
  };

  const downloadProjectPdf = () => {
    downloadItemizedPdfReport(activeProject, currency);
    addActivityLog({
      action: 'Exported Certificate',
      details: `Generated stamped PUE 7.1 compliance PDF report for "${activeProject.name}"`,
      category: 'report',
      status: 'completed',
      user: 'Olimjon K.',
      moduleTarget: 'reports',
    });
  };

  // Project Templates State
  const [customTemplates, setCustomTemplates] = useState<ProjectTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('electrovision_custom_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('electrovision_custom_templates', JSON.stringify(customTemplates));
    } catch (e) {
      console.error('Failed to store custom templates in localStorage:', e);
    }
  }, [customTemplates]);

  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const openTemplatesModal = () => setIsTemplatesModalOpen(true);
  const closeTemplatesModal = () => setIsTemplatesModalOpen(false);

  const templates = useMemo(() => {
    return [...BUILT_IN_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  const applyTemplate = (templateId: string, mode: 'replace' | 'append') => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    updateActiveProject(prev => {
      let updatedCircuits: CADCircuit[];

      if (mode === 'replace') {
        updatedCircuits = template.circuits.map((c, idx) => ({
          ...c,
          id: `c-${Date.now()}-${idx + 1}`
        }));
      } else {
        const existingCount = prev.cadCircuits.length;
        const newCircuits: CADCircuit[] = template.circuits.map((c, idx) => ({
          ...c,
          id: `c-${Date.now()}-${existingCount + idx + 1}`,
          tag: `QF${existingCount + idx + 1}`
        }));
        updatedCircuits = [...prev.cadCircuits, ...newCircuits];
      }

      const updatedEnclosure = template.enclosureSuggestion
        ? { ...prev.panelEnclosure, ...template.enclosureSuggestion }
        : prev.panelEnclosure;

      return {
        ...prev,
        cadCircuits: updatedCircuits,
        panelEnclosure: updatedEnclosure,
        updatedAt: new Date().toISOString()
      };
    });

    addActivityLog({
      action: mode === 'replace' ? 'Loaded Circuit Template' : 'Appended Circuit Preset',
      details: `${mode === 'replace' ? 'Replaced' : 'Appended'} ${template.circuits.length} circuits from "${template.name}"`,
      category: 'cad',
      status: 'completed',
      user: 'Olimjon K.',
      moduleTarget: 'cad'
    });
  };

  const createProjectFromTemplate = (templateId: string, projectName?: string, location?: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const newId = `proj-${Date.now()}`;
    const name = projectName || `${template.name} — New Build`;
    const loc = location || 'Tashkent, Uzbekistan';
    const code = `EV-${Math.floor(100 + Math.random() * 900)}`;

    const newCircuits: CADCircuit[] = template.circuits.map((c, idx) => ({
      ...c,
      id: `c-${Date.now()}-${idx + 1}`
    }));

    const enclosure = template.enclosureSuggestion
      ? { ...activeProject.panelEnclosure, ...template.enclosureSuggestion }
      : activeProject.panelEnclosure;

    const newProj: Project = {
      ...activeProject,
      id: newId,
      name,
      code,
      location: loc,
      client: 'Private Client',
      leadEngineer: 'Chief Electrical Engineer',
      standard: (template.standard === 'NEC NFPA 70' || template.standard === 'IEC 60364' ? template.standard : 'IEC 60364') as any,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: 'Just now',
      cadCircuits: newCircuits,
      panelEnclosure: enclosure,
      roomData: {
        ...activeProject.roomData,
        projectName: name
      }
    };

    setProjects(prev => [newProj, ...prev]);
    setActiveProjectId(newId);

    addActivityLog({
      action: 'Project Initialized from Preset',
      details: `Initialized new project "${name}" using "${template.name}" preset (${newCircuits.length} circuits)`,
      category: 'project',
      status: 'completed',
      user: 'Olimjon K.',
      moduleTarget: 'cad'
    });
  };

  const saveCurrentAsTemplate = (name: string, category: TemplateCategory, description: string, tagline?: string) => {
    const totalWatts = activeProject.cadCircuits.reduce((sum, c) => sum + c.powerWatts, 0);
    const estKw = Number((totalWatts / 1000).toFixed(1));
    const circuitsWithoutId = activeProject.cadCircuits.map(({ id, ...rest }) => rest);

    const newTemplate: ProjectTemplate = {
      id: `tpl-custom-${Date.now()}`,
      name,
      tagline: tagline || `${activeProject.cadCircuits.length} circuits tailored from active project`,
      description: description || `Saved preset from ${activeProject.name} (${activeProject.code}).`,
      category,
      standard: activeProject.standard as any,
      nominalVoltage: activeProject.cadCircuits.some(c => c.supplyVoltage === 400 || c.phase === '3P') ? 400 : 230,
      estimatedLoadKw: estKw,
      incomerBreaker: `QF0: Main Incomer (${estKw > 25 ? '63A 4P' : '40A 3P'})`,
      highlights: [
        `${activeProject.cadCircuits.length} circuits configured`,
        `Estimated active load: ${estKw} kW`,
        `Enclosure: ${activeProject.panelEnclosure?.model || 'Modular DIN'}`
      ],
      circuits: circuitsWithoutId,
      enclosureSuggestion: activeProject.panelEnclosure,
      isCustom: true,
      createdAt: new Date().toISOString(),
      author: activeProject.leadEngineer || 'Chief Engineer'
    };

    setCustomTemplates(prev => [newTemplate, ...prev]);

    addActivityLog({
      action: 'Saved Custom Preset',
      details: `Saved circuit configuration "${name}" with ${circuitsWithoutId.length} circuits as reusable preset`,
      category: 'cad',
      status: 'completed',
      user: 'Olimjon K.',
      moduleTarget: 'cad'
    });

    return newTemplate;
  };

  const deleteCustomTemplate = (templateId: string) => {
    setCustomTemplates(prev => prev.filter(t => t.id !== templateId));
    addActivityLog({
      action: 'Deleted Custom Preset',
      details: `Removed custom template preset ID "${templateId}"`,
      category: 'cad',
      status: 'completed',
      user: 'Olimjon K.',
      moduleTarget: 'cad'
    });
  };

  const exportTemplatesJson = () => {
    return JSON.stringify(customTemplates.length > 0 ? customTemplates : templates, null, 2);
  };

  const importTemplatesJson = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const validTemplates: ProjectTemplate[] = [];

      for (const item of items) {
        if (item && item.name && Array.isArray(item.circuits) && item.circuits.length > 0) {
          validTemplates.push({
            id: `tpl-import-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: item.name,
            tagline: item.tagline || 'Imported preset',
            description: item.description || 'Imported from external JSON configuration',
            category: item.category || 'custom',
            standard: item.standard || 'IEC 60364',
            nominalVoltage: item.nominalVoltage || 400,
            estimatedLoadKw: item.estimatedLoadKw || (item.circuits.reduce((a: number, b: any) => a + (b.powerWatts || 0), 0) / 1000),
            incomerBreaker: item.incomerBreaker || 'QF0: Incomer Breaker',
            highlights: item.highlights || [`${item.circuits.length} circuits`],
            circuits: item.circuits.map((c: any) => ({
              tag: c.tag || 'QF',
              name: c.name || 'Branch Feeder',
              phase: c.phase || 'L1',
              supplyVoltage: c.supplyVoltage || 230,
              powerWatts: Number(c.powerWatts) || 1000,
              powerFactor: Number(c.powerFactor) || 0.95,
              cableLengthMeters: Number(c.cableLengthMeters) || 20,
              conductor: c.conductor || 'Cu',
              crossSectionMm2: Number(c.crossSectionMm2) || 2.5,
              cableType: c.cableType || 'VVGng-LS 3x2.5',
              installMethod: c.installMethod || 'conduit',
              breakerRatingA: Number(c.breakerRatingA) || 16
            })),
            isCustom: true,
            createdAt: new Date().toISOString()
          });
        }
      }

      if (validTemplates.length === 0) {
        return { success: false, importedCount: 0, error: 'No valid template circuits found in JSON.' };
      }

      setCustomTemplates(prev => [...validTemplates, ...prev]);
      addActivityLog({
        action: 'Imported Presets',
        details: `Imported ${validTemplates.length} custom template(s) from JSON`,
        category: 'cad',
        status: 'completed',
        user: 'Olimjon K.',
        moduleTarget: 'cad'
      });
      return { success: true, importedCount: validTemplates.length };
    } catch (err: any) {
      return { success: false, importedCount: 0, error: err?.message || 'Invalid JSON format' };
    }
  };

  // Voice Annotations for Field Engineers
  const voiceAnnotations = useMemo(() => activeProject.voiceAnnotations || [], [activeProject.voiceAnnotations]);

  const addVoiceAnnotation = (annotation: Omit<VoiceAnnotation, 'id' | 'timestamp' | 'exactTime'>): VoiceAnnotation => {
    const now = new Date();
    const newAnnotation: VoiceAnnotation = {
      ...annotation,
      id: `va-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: now.toISOString().slice(0, 10),
      exactTime: now.toTimeString().slice(0, 5),
      author: annotation.author || 'Field Engineer'
    };

    updateActiveProject(p => ({
      ...p,
      voiceAnnotations: [newAnnotation, ...(p.voiceAnnotations || [])]
    }));

    addActivityLog({
      action: 'Voice Note Logged',
      details: `[${annotation.targetLabel}] ${annotation.category.toUpperCase()}: "${annotation.transcript.slice(0, 48)}${annotation.transcript.length > 48 ? '...' : ''}"`,
      category: 'scanner',
      status: 'completed',
      user: annotation.author || 'Field Tech',
      moduleTarget: 'scanner'
    });

    return newAnnotation;
  };

  const deleteVoiceAnnotation = (id: string) => {
    updateActiveProject(p => ({
      ...p,
      voiceAnnotations: (p.voiceAnnotations || []).filter(a => a.id !== id)
    }));
  };

  const updateVoiceAnnotation = (id: string, updates: Partial<VoiceAnnotation>) => {
    updateActiveProject(p => ({
      ...p,
      voiceAnnotations: (p.voiceAnnotations || []).map(a => a.id === id ? { ...a, ...updates } : a)
    }));
  };

  const exportAnnotationsToPunchList = (): number => {
    const annotations = activeProject.voiceAnnotations || [];
    const actionable = annotations.filter(a => (a.category === 'defect' || a.category === 'punch_list' || a.category === 'safety') && !a.resolved);
    if (actionable.length === 0) return 0;

    const newTasks = actionable.map(a => ({
      id: `task-va-${Date.now()}-${a.id}`,
      title: `[${a.targetLabel}] ${a.transcript}`,
      description: `Logged via Camera Scanner Voice Note (${a.category.toUpperCase()} / ${a.timestamp} ${a.exactTime})`,
      status: 'pending' as const,
      assignedTo: a.author || 'Field Technician',
      category: (a.category === 'safety' ? 'testing' : a.category === 'defect' ? 'devices' : 'chasing') as any
    }));

    updateActiveProject(p => ({
      ...p,
      installationTasks: [...newTasks, ...p.installationTasks]
    }));

    addActivityLog({
      action: 'Punch List Export',
      details: `Exported ${newTasks.length} voice annotations to site installation tasks`,
      category: 'installation',
      status: 'completed',
      user: 'Field Tech',
      moduleTarget: 'installation'
    });

    return newTasks.length;
  };

  return (
    <ProjectContext.Provider
      value={{
        language,
        setLanguage,
        currency,
        setCurrency,
        usdToUzsRate,
        formatCurrency,
        t,
        projects,
        activeProject,
        setActiveProjectId,
        createNewProject,
        updateActiveProject,
        duplicateProject,
        deleteProject,
        exportProjectJson,
        importProjectJson,
        updateRoomPoints,
        addRoomPoint,
        removeRoomPoint,
        updateCableRoutes,
        addCableRoute,
        updatePanelComponents,
        addPanelComponent,
        removePanelComponent,
        updateCADCircuits,
        powerCalculations,
        recalculatePower,
        needsRecalculation,
        recalculateMaterialsFromProject,
        updateMaterials,
        addCustomMaterial,
        removeMaterial,
        searchQuery,
        setSearchQuery,
        activeModule,
        setActiveModule,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        activityLogs,
        addActivityLog,
        notifications,
        markAllNotificationsRead,
        saveStatus,
        triggerSave,
        isAiModalOpen,
        aiModalTab,
        openAiModal,
        closeAiModal,
        downloadProjectPdf,
        templates,
        applyTemplate,
        createProjectFromTemplate,
        saveCurrentAsTemplate,
        deleteCustomTemplate,
        exportTemplatesJson,
        importTemplatesJson,
        isTemplatesModalOpen,
        openTemplatesModal,
        closeTemplatesModal,
        voiceAnnotations,
        addVoiceAnnotation,
        deleteVoiceAnnotation,
        updateVoiceAnnotation,
        exportAnnotationsToPunchList,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
