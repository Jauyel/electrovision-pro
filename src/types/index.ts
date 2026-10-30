export type Language = 'en' | 'ru' | 'uz';

export type Currency = 'UZS' | 'USD';

export type ElectricalPointType = 
  | 'socket_single' 
  | 'socket_double' 
  | 'socket_wet' 
  | 'switch_1gang' 
  | 'switch_2gang' 
  | 'switch_dimmer' 
  | 'ceiling_light' 
  | 'spotlight' 
  | 'led_strip' 
  | 'panel' 
  | 'ac_unit' 
  | 'oven' 
  | 'boiler';

export interface ElectricalPoint {
  id: string;
  type: ElectricalPointType;
  name: string;
  wall: 'north' | 'south' | 'east' | 'west' | 'ceiling' | 'floor';
  x: number; // in meters or percentage
  y: number;
  heightMm: number; // height from floor in mm
  circuitId?: string;
  wattage: number;
  notes?: string;
}

export interface WallSegment {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  lengthMeters: number;
  thicknessMm: number;
  type: 'concrete' | 'brick' | 'drywall';
}

export interface WallOpening {
  id: string;
  type: 'door' | 'window';
  wall: 'north' | 'south' | 'east' | 'west';
  x: number;
  offset?: number;
  widthMeters: number;
  heightMeters: number;
  sill?: number;
  label?: string;
}

export interface RoomPhoto {
  id: string;
  image: string;
  capturedAt: string;
  note?: string;
  source: 'camera' | 'upload';
}

export interface RoomData {
  projectName: string;
  roomName: string;
  roomType: 'living_room' | 'kitchen' | 'bedroom' | 'office' | 'server_room' | 'electrical_room';
  lengthMeters: number;
  widthMeters: number;
  heightMeters: number;
  walls: WallSegment[];
  openings: WallOpening[];
  points: ElectricalPoint[];
  photos?: RoomPhoto[];
  notes: string;
  scanDate?: string;
}

export interface AIAuditFinding {
  level: 'critical' | 'warning' | 'good' | 'tip';
  title: string;
  description: string;
  rule: string;
  recommendation?: string;
}

export interface AIAuditResult {
  summary: string;
  safetyScore: number;
  totalEstimatedLoadKw: number;
  mainBreakerRecommendation: string;
  findings: AIAuditFinding[];
  recommendations: string[];
}

export interface AIScanOpening {
  kind: 'door' | 'window';
  wall: 'north' | 'south' | 'east' | 'west';
  offset: number;
  width: number;
  height: number;
  sill?: number;
  label?: string;
}

export interface AIScanPoint {
  type: ElectricalPointType;
  x: number;
  y: number;
  wall?: 'north' | 'south' | 'east' | 'west' | 'ceiling';
  label: string;
  wattage?: number;
}

export interface AIScanResult {
  roomName: string;
  length: number;
  width: number;
  height: number;
  detectedFeatures: string;
  openings: AIScanOpening[];
  suggestedPoints: AIScanPoint[];
  estimatedPowerKw?: number;
}

export type CableCircuitType = 'lighting' | 'sockets' | 'appliance' | 'control';

export interface CableRoute {
  id: string;
  name: string;
  type: CableCircuitType;
  color: string;
  cableType: string; // e.g. VVGng-LS 3x1.5 or VVGng-LS 3x2.5
  lengthMeters: number;
  conduitType: string; // e.g. PVC 20mm corrugated
  pathPoints: { x: number; y: number; z: number }[];
  connectedPoints: string[]; // point IDs
  status: 'planned' | 'in_progress' | 'verified';
}

export interface InstallationTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo: string;
  category: 'preparation' | 'chasing' | 'conduit' | 'cabling' | 'devices' | 'panel' | 'testing';
  dueDate?: string;
  hasPhoto?: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  category: 'preparation' | 'rough_in' | 'trim_out' | 'inspection';
}

export interface PanelComponent {
  id: string;
  railIndex: number; // 0, 1, 2, 3
  slotPosition: number; // 0 to 18 (modules)
  moduleWidth: number; // 1 = 18mm, 2 = 36mm, etc.
  type: 'mcb' | 'rcd' | 'rcbo' | 'contactor' | 'relay' | 'terminal' | 'busbar' | 'meter' | 'surge';
  model: string;
  manufacturer: 'Schneider Electric' | 'ABB' | 'Legrand' | 'CHINT' | 'IEK';
  ratedCurrentA: number;
  breakingCapacityKa?: number;
  curve?: 'B' | 'C' | 'D';
  poles: '1P' | '1P+N' | '2P' | '3P' | '3P+N' | '4P';
  phase?: 'L1' | 'L2' | 'L3' | '3P';
  status: 'verified' | 'needs_review' | 'not_verified';
  connectedCircuitId?: string;
}

export interface PanelEnclosure {
  model: string;
  type: 'flush' | 'surface' | 'industrial';
  material: 'metal' | 'plastic';
  ipRating: 'IP31' | 'IP40' | 'IP54' | 'IP65';
  rows: number;
  modulesPerRow: number;
  totalModules: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
}

export interface CADCircuit {
  id: string;
  tag: string; // e.g. QF1, QF2
  name: string;
  phase: 'L1' | 'L2' | 'L3' | '3P';
  supplyVoltage: 230 | 400;
  powerWatts: number;
  powerFactor: number; // 0.8 - 0.98
  cableLengthMeters: number;
  conductor: 'Cu' | 'Al';
  crossSectionMm2: number; // 1.5, 2.5, 4, 6, 10, 16
  cableType: string;
  installMethod: 'conduit' | 'tray' | 'wall_plaster' | 'air';
  breakerRatingA: number;
}

export interface PowerCalculationResults {
  totalActivePowerKw: number;
  totalApparentPowerKva: number;
  designCurrentA: number;
  phaseLoadsKw: { L1: number; L2: number; L3: number };
  phaseBalanceUnbalancePercent: number;
  circuitCalculations: {
    circuitId: string;
    calculatedCurrentA: number;
    voltageDropV: number;
    voltageDropPercent: number;
    thermalPermissibleA: number;
    isCompliant: boolean;
    warningMessage?: string;
  }[];
  overallStatus: 'compliant' | 'warning' | 'non_compliant';
  standardsCompliance: string;
}

export interface MaterialItem {
  id: string;
  category: 
    | 'cables' 
    | 'conduits' 
    | 'sockets_switches' 
    | 'lighting' 
    | 'panel_equipment' 
    | 'protection' 
    | 'mounting' 
    | 'tools';
  name: string;
  model: string;
  specification: string;
  unit: 'm' | 'pcs' | 'set' | 'roll' | 'pack';
  quantity: number;
  unitPriceUzS: number;
  wastePercent: number;
  sourceModule: 'Room Scanner' | 'Installation' | 'Panel Builder' | 'Electrical CAD' | 'Manual';
  notes: string;
}

export type ComplianceStatus = 'compliant' | 'pending' | 'flagged';
export type ComplianceSeverity = 'critical' | 'mandatory' | 'recommended';
export type RegionalStandard = 'PUE 7.1' | 'IEC 60364' | 'GOST 30331' | 'NEC NFPA 70';
export type ComplianceCategory = 
  | 'earthing' 
  | 'rcd_protection' 
  | 'overcurrent' 
  | 'voltage_drop' 
  | 'conduit_fire' 
  | 'spd_surge' 
  | 'wet_zones' 
  | 'panel_enclosure';

export interface ComplianceChecklistItem {
  id: string;
  code: string;
  title: string;
  description: string;
  standard: RegionalStandard;
  category: ComplianceCategory;
  severity: ComplianceSeverity;
  status: ComplianceStatus;
  notes?: string;
  verifiedAt?: string;
}

export type VoiceAnnotationCategory = 
  | 'defect' 
  | 'punch_list' 
  | 'verification' 
  | 'measurement' 
  | 'safety';

export interface VoiceAnnotation {
  id: string;
  transcript: string;
  category: VoiceAnnotationCategory;
  timestamp: string;
  exactTime: string;
  audioDurationSeconds?: number;
  targetType: 'component' | 'point' | 'opening' | 'circuit' | 'coordinates';
  targetId?: string;
  targetLabel: string;
  coordinates?: {
    x: number; // 0 - 100% viewport width
    y: number; // 0 - 100% viewport height
  };
  severity?: 'critical' | 'warning' | 'info' | 'resolved';
  resolved?: boolean;
  author?: string;
  audioBlobUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  location: string;
  client: string;
  leadEngineer: string;
  standard: 'IEC 60364' | 'GOST 31996' | 'NEC NFPA 70';
  createdAt: string;
  updatedAt: string;
  roomData: RoomData;
  rooms?: RoomData[];
  lastAudit?: AIAuditResult;
  cableRoutes: CableRoute[];
  installationTasks: InstallationTask[];
  checklist: ChecklistItem[];
  complianceChecklist?: ComplianceChecklistItem[];
  voiceAnnotations?: VoiceAnnotation[];
  panelEnclosure: PanelEnclosure;
  panelComponents: PanelComponent[];
  cadCircuits: CADCircuit[];
  materials: MaterialItem[];
  laborRatePerDayUzs: number;
  contingencyPercent: number;
  calculations?: CalculationRecord[];
}

export interface CalculationRecord {
  id: string;
  kind: string;
  expression: string;
  result: string;
  createdAt: string;
  pueCompliance?: string;
  details?: { label: string; value: string }[];
}

export type ActivityCategory = 
  | 'project' 
  | 'cad' 
  | 'report' 
  | 'panel' 
  | 'scanner' 
  | 'installation' 
  | 'bom';

export type ActivityStatus = 'completed' | 'verified' | 'warning' | 'in_progress';

export interface ActivityLogItem {
  id: string;
  action: string;
  details: string;
  category: ActivityCategory;
  status: ActivityStatus;
  timestamp: string;
  exactTime: string;
  user: string;
  moduleTarget?: 'scanner' | 'installation' | 'panel' | 'cad' | 'estimator' | 'reports';
}

export type TemplateCategory = 'residential' | 'commercial' | 'industrial' | 'specialty' | 'custom';

export interface ProjectTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: TemplateCategory;
  standard: 'IEC 60364' | 'PUE 7.1' | 'GOST 30331' | 'NEC NFPA 70';
  estimatedLoadKw: number;
  incomerBreaker: string;
  nominalVoltage: 230 | 400;
  highlights: string[];
  circuits: Omit<CADCircuit, 'id'>[];
  enclosureSuggestion?: Partial<PanelEnclosure>;
  isCustom?: boolean;
  createdAt?: string;
  author?: string;
}
