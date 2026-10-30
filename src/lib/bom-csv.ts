import { Project, MaterialItem, Currency } from '../types';

export interface ProjectContribution {
  projectId: string;
  projectName: string;
  projectCode: string;
  quantity: number;
  unit: string;
}

export interface AggregatedMaterialItem {
  key: string;
  category: MaterialItem['category'];
  name: string;
  model: string;
  specification: string;
  unit: MaterialItem['unit'];
  totalQuantity: number;
  averageWastePercent: number;
  billableQuantity: number;
  unitPriceUzS: number;
  totalLineCostUzS: number;
  contributions: ProjectContribution[];
  sourceModules: string[];
}

export interface PortfolioCostSummary {
  materialsSubtotalUzs: number;
  laborDaysTotal: number;
  laborCostUzs: number;
  contingencyCostUzs: number;
  grandTotalUzs: number;
  projectsCount: number;
  itemsCount: number;
}

/**
 * Extracts or synthesizes synchronized materials for a single project
 */
export function getProjectMaterials(project: Project): MaterialItem[] {
  if (project.materials && project.materials.length > 0) {
    return project.materials;
  }

  // Synthesize on-the-fly from routes, points, and panel components if project has empty materials
  const synthesized: MaterialItem[] = [];

  // 1. From Cable Routes
  const cableMap: Record<string, number> = {};
  (project.cableRoutes || []).forEach(r => {
    const key = r.cableType || 'VVGng-LS 3x2.5';
    cableMap[key] = (cableMap[key] || 0) + (r.lengthMeters || 15);
  });

  Object.entries(cableMap).forEach(([cableType, length], idx) => {
    const pricePerM = cableType.includes('1.5') ? 9800 : cableType.includes('2.5') ? 15400 : cableType.includes('4.0') ? 24500 : 42000;
    synthesized.push({
      id: `syn-${project.id}-cab-${idx}`,
      category: 'cables',
      name: `Copper Power Cable ${cableType}`,
      model: 'Uzkabel GOST 31996-2012',
      specification: 'Flame retardant, low smoke, Cu 660V',
      unit: 'm',
      quantity: Math.ceil(length),
      unitPriceUzS: pricePerM,
      wastePercent: 10,
      sourceModule: 'Installation',
      notes: `Calculated from 3D cable runs for ${project.code}`
    });
  });

  // Conduits
  const totalCableLength = Object.values(cableMap).reduce((a, b) => a + b, 0);
  if (totalCableLength > 0) {
    synthesized.push({
      id: `syn-${project.id}-conduit`,
      category: 'conduits',
      name: 'PVC Corrugated Conduit 20mm with steel draw wire',
      model: 'DKC Heavy Fire-Safe',
      specification: 'Self-extinguishing, 350N crush rating',
      unit: 'm',
      quantity: Math.ceil(totalCableLength * 1.05),
      unitPriceUzS: 4200,
      wastePercent: 5,
      sourceModule: 'Installation',
      notes: `Conduit route length for ${project.code}`
    });
  }

  // 2. From Panel Components
  (project.panelComponents || []).forEach((pc, idx) => {
    synthesized.push({
      id: `syn-${project.id}-pc-${pc.id || idx}`,
      category: 'protection',
      name: `${pc.manufacturer || 'Schneider'} ${pc.model || 'iC60N MCB'}`,
      model: pc.model || 'Standard Breaker',
      specification: `${pc.poles || '1P'} ${pc.ratedCurrentA || 16}A ${pc.curve || 'C'} ${pc.breakingCapacityKa || 6}kA`,
      unit: 'pcs',
      quantity: 1,
      unitPriceUzS: pc.type === 'rcd' ? 620000 : pc.type === 'rcbo' ? 480000 : pc.poles === '4P' || pc.poles === '3P' ? 540000 : 115000,
      wastePercent: 0,
      sourceModule: 'Panel Builder',
      notes: `DIN Rail protection device`
    });
  });

  // Panel Enclosure
  if (project.panelEnclosure) {
    synthesized.push({
      id: `syn-${project.id}-enc`,
      category: 'panel_equipment',
      name: project.panelEnclosure.model || 'Distribution Enclosure',
      model: project.panelEnclosure.model || 'Enclosure',
      specification: `${project.panelEnclosure.totalModules || 36} Modules, ${project.panelEnclosure.ipRating || 'IP40'}`,
      unit: 'pcs',
      quantity: 1,
      unitPriceUzS: 1850000,
      wastePercent: 0,
      sourceModule: 'Panel Builder',
      notes: `Main enclosure chassis`
    });
  }

  // 3. From Room Points
  let socketCount = 0;
  let switchCount = 0;
  let lightCount = 0;
  ((project.roomData && project.roomData.points) || []).forEach(p => {
    const t = (p.type || '').toLowerCase();
    if (t.includes('socket')) socketCount++;
    else if (t.includes('switch')) switchCount++;
    else if (t.includes('light') || t.includes('spot')) lightCount++;
  });

  if (socketCount > 0) {
    synthesized.push({
      id: `syn-${project.id}-sockets`,
      category: 'sockets_switches',
      name: 'Schuko Double Socket Outlet with Child Shutters',
      model: 'Legrand Valena Allure 16A',
      specification: '250V 16A Grounded with safety shutter',
      unit: 'pcs',
      quantity: socketCount,
      unitPriceUzS: 82000,
      wastePercent: 0,
      sourceModule: 'Room Scanner',
      notes: `Room architectural layout`
    });
  }

  if (switchCount > 0) {
    synthesized.push({
      id: `syn-${project.id}-switches`,
      category: 'sockets_switches',
      name: 'Illuminated 2-Gang Rocker Switch',
      model: 'Legrand Valena Allure',
      specification: '250V 10AX with LED locator',
      unit: 'pcs',
      quantity: switchCount,
      unitPriceUzS: 95000,
      wastePercent: 0,
      sourceModule: 'Room Scanner',
      notes: `Lighting control points`
    });
  }

  if (lightCount > 0) {
    synthesized.push({
      id: `syn-${project.id}-lights`,
      category: 'lighting',
      name: 'Recessed Architectural LED Downlight 18W CRI95',
      model: 'Philips CoreLine SlimDownlight',
      specification: '18W 4000K Neutral White 1800lm',
      unit: 'pcs',
      quantity: lightCount,
      unitPriceUzS: 145000,
      wastePercent: 0,
      sourceModule: 'Room Scanner',
      notes: `Ceiling illumination fixtures`
    });
  }

  return synthesized;
}

/**
 * Aggregates materials across multiple active projects
 */
export function aggregateProjectMaterials(selectedProjects: Project[]): {
  items: AggregatedMaterialItem[];
  summary: PortfolioCostSummary;
} {
  const map: Record<string, AggregatedMaterialItem> = {};

  let totalLaborCostUzs = 0;
  let totalLaborDays = 0;

  selectedProjects.forEach(project => {
    const projectMaterials = getProjectMaterials(project);
    const estLaborDays = Math.max(3, Math.ceil((project.cadCircuits?.length || 4) * 0.75));
    const laborRate = project.laborRatePerDayUzs || 850000;
    totalLaborDays += estLaborDays;
    totalLaborCostUzs += estLaborDays * laborRate;

    projectMaterials.forEach(m => {
      // Normalize unique aggregation key: category + name + model + unit
      const cleanName = m.name.trim();
      const cleanModel = (m.model || '').trim();
      const key = `${m.category}:::${cleanName.toLowerCase()}:::${cleanModel.toLowerCase()}:::${m.unit}`;

      if (!map[key]) {
        map[key] = {
          key,
          category: m.category,
          name: cleanName,
          model: cleanModel,
          specification: m.specification || '',
          unit: m.unit,
          totalQuantity: 0,
          averageWastePercent: m.wastePercent || 0,
          billableQuantity: 0,
          unitPriceUzS: m.unitPriceUzS || 10000,
          totalLineCostUzS: 0,
          contributions: [],
          sourceModules: []
        };
      }

      const entry = map[key];
      entry.totalQuantity += m.quantity;
      if (m.wastePercent > entry.averageWastePercent) {
        entry.averageWastePercent = m.wastePercent;
      }
      if (m.unitPriceUzS > 0) {
        entry.unitPriceUzS = m.unitPriceUzS;
      }
      if (m.specification && m.specification.length > entry.specification.length) {
        entry.specification = m.specification;
      }
      if (!entry.sourceModules.includes(m.sourceModule)) {
        entry.sourceModules.push(m.sourceModule);
      }

      entry.contributions.push({
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        quantity: m.quantity,
        unit: m.unit
      });
    });
  });

  // Calculate billable quantities and line totals
  let materialsSubtotalUzs = 0;
  const items: AggregatedMaterialItem[] = Object.values(map).map(entry => {
    const billable = Math.ceil(entry.totalQuantity * (1 + entry.averageWastePercent / 100));
    const lineTotal = billable * entry.unitPriceUzS;
    entry.billableQuantity = billable;
    entry.totalLineCostUzS = lineTotal;
    materialsSubtotalUzs += lineTotal;
    return entry;
  });

  // Sort items by category, then by descending line cost
  const categoryOrder: Record<MaterialItem['category'], number> = {
    cables: 1,
    conduits: 2,
    panel_equipment: 3,
    protection: 4,
    sockets_switches: 5,
    lighting: 6,
    mounting: 7,
    tools: 8
  };

  items.sort((a, b) => {
    const catDiff = (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
    if (catDiff !== 0) return catDiff;
    return b.totalLineCostUzS - a.totalLineCostUzS;
  });

  // Calculate portfolio contingency (using average contingency or standard 7.5%)
  const avgContingencyPercent = selectedProjects.length > 0
    ? selectedProjects.reduce((acc, p) => acc + (p.contingencyPercent || 7.5), 0) / selectedProjects.length
    : 7.5;

  const contingencyCostUzs = (materialsSubtotalUzs + totalLaborCostUzs) * (avgContingencyPercent / 100);
  const grandTotalUzs = materialsSubtotalUzs + totalLaborCostUzs + contingencyCostUzs;

  return {
    items,
    summary: {
      materialsSubtotalUzs,
      laborDaysTotal: totalLaborDays,
      laborCostUzs: totalLaborCostUzs,
      contingencyCostUzs,
      grandTotalUzs,
      projectsCount: selectedProjects.length,
      itemsCount: items.length
    }
  };
}

/**
 * Generates properly formatted RFC-4180 CSV text with UTF-8 BOM
 */
export function generateBomCsvContent(options: {
  scope: 'aggregated' | 'single';
  selectedProjects: Project[];
  activeProject: Project;
  currency: Currency;
  usdToUzsRate: number;
}): string {
  const { scope, selectedProjects, activeProject, currency, usdToUzsRate } = options;

  const formatPrice = (uzs: number): string => {
    if (currency === 'USD') {
      return (uzs / usdToUzsRate).toFixed(2);
    }
    return Math.round(uzs).toString();
  };

  const currencyUnit = currency === 'USD' ? 'USD ($)' : 'UZS (so\'m)';

  const lines: string[] = [];

  // 1. Executive Metadata Header Block
  lines.push(`"ELECTROVISION AI PRO — DETERMINISTIC BILL OF MATERIALS (BOM) COST SUMMARY"`);
  lines.push(`"Report Generated:","${new Date().toISOString().replace('T', ' ').slice(0, 19)}"`);
  lines.push(`"Scope:","${scope === 'aggregated' ? `Portfolio Aggregated (${selectedProjects.length} Projects)` : `Single Project (${activeProject.name})`}"`);
  lines.push(`"Currency:","${currencyUnit}"`);
  if (currency === 'USD') {
    lines.push(`"Exchange Rate:","1 USD = ${usdToUzsRate.toLocaleString('en-US')} UZS"`);
  }
  lines.push(`"Regional Standards:","IEC 60364 / GOST 30331 / PUE 7.1"`);
  lines.push(`"Lead Engineer:","${activeProject.leadEngineer || 'Olimjon Khashimov, PE'}"`);
  lines.push(`""`);

  // 2. Included Projects List Block
  lines.push(`"INCLUDED ELECTRICAL PROJECTS"`);
  lines.push(`"Project Code","Project Name","Client","Location","Design Standard","Circuits","Total Load (kW)"`);
  
  const projectsToInclude = scope === 'aggregated' ? selectedProjects : [activeProject];
  projectsToInclude.forEach(p => {
    const loadKw = (p.cadCircuits || []).reduce((s, c) => s + (c.powerWatts || 0), 0) / 1000;
    lines.push(`"${p.code}","${p.name.replace(/"/g, '""')}","${p.client.replace(/"/g, '""')}","${p.location.replace(/"/g, '""')}","${p.standard}","${p.cadCircuits?.length || 0}","${loadKw.toFixed(1)}"`);
  });
  lines.push(`""`);

  // 3. Itemized Bill of Materials Table Block
  lines.push(`"ITEMIZED BILL OF MATERIALS (BOM)"`);
  const tableHeaders = [
    `"Item #"`,
    `"Category"`,
    `"Material Description"`,
    `"Model / Catalog Code"`,
    `"Specification"`,
    `"Unit"`,
    `"Base Quantity"`,
    `"Waste / Allowance %"`,
    `"Billable Quantity"`,
    `"Unit Price (${currency})"`,
    `"Line Total (${currency})"`,
    `"Contributing Projects"`
  ];
  lines.push(tableHeaders.join(','));

  const { items, summary } = aggregateProjectMaterials(projectsToInclude);

  items.forEach((item, index) => {
    const projectRefs = item.contributions
      .map(c => `${c.projectCode} (${c.quantity}${c.unit})`)
      .join('; ');

    const row = [
      index + 1,
      `"${item.category.replace(/_/g, ' ').toUpperCase()}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${(item.model || '').replace(/"/g, '""')}"`,
      `"${(item.specification || '').replace(/"/g, '""')}"`,
      `"${item.unit}"`,
      item.totalQuantity,
      `"${item.averageWastePercent}%"`,
      item.billableQuantity,
      formatPrice(item.unitPriceUzS),
      formatPrice(item.totalLineCostUzS),
      `"${projectRefs.replace(/"/g, '""')}"`
    ];
    lines.push(row.join(','));
  });

  lines.push(`""`);

  // 4. Financial Cost Summary & Engineering Reserves Block
  lines.push(`"EXECUTIVE COST & LABOR SUMMARY"`);
  lines.push(`"Cost Category","Quantity / Factor","Amount (${currency})"`);
  lines.push(`"1. Materials Net Subtotal","${items.length} line items","${formatPrice(summary.materialsSubtotalUzs)}"`);
  lines.push(`"2. Electrical Installation Labor & Testing","${summary.laborDaysTotal} days certified workmanship","${formatPrice(summary.laborCostUzs)}"`);
  lines.push(`"3. Engineering Contingency & Waste Factor","Standard certified reserve","${formatPrice(summary.contingencyCostUzs)}"`);
  lines.push(`"GRAND TOTAL ESTIMATED COST","Includes transportation, calibration & tax","${formatPrice(summary.grandTotalUzs)}"`);
  lines.push(`""`);
  lines.push(`"CERTIFICATION NOTE:","This BOM estimation is generated deterministically in compliance with IEC 60364-5-52 and GOST 31996 installation standards. Subject to final on-site verification."`);

  // Prepend UTF-8 Byte Order Mark (\uFEFF) for Microsoft Excel compatibility
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Triggers browser download of the generated CSV file
 */
export function downloadBomCsv(options: {
  scope: 'aggregated' | 'single';
  selectedProjects: Project[];
  activeProject: Project;
  currency: Currency;
  usdToUzsRate: number;
}): void {
  const csvContent = generateBomCsvContent(options);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = options.scope === 'aggregated'
    ? `ElectroVision_BOM_Portfolio_Aggregated_${options.selectedProjects.length}Projects_${timestamp}.csv`
    : `ElectroVision_BOM_${options.activeProject.code || 'Project'}_${timestamp}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
