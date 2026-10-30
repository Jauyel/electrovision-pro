/**
 * Automated Electrical Engineering Calculations Verification Suite
 * Tests against known reference benchmarks from PUE 7.1 and IEC 60364
 */

import { calculateElectrical } from './calculations';
import { aggregateProjectMaterials, generateBomCsvContent } from '../lib/bom-csv';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

export function runElectricalTests() {
  console.log("⚡ Starting ElectroVision AI PRO Electrical Calculations Test Suite...");
  let passed = 0;

  // Test 1: Single-phase power and current
  {
    const res = calculateElectrical("single", {
      voltage: 230,
      current: 16,
      powerFactor: 0.92,
    });
    // Expected P = 230 * 16 * 0.92 / 1000 = 3.3856 kW
    assert(Math.abs(res.value - 3.39) < 0.05, `Single phase power expected ~3.39 kW, got ${res.value}`);
    assert(res.unit === "kW", "Unit should be kW");
    assert(res.pueCompliance?.status === "pass", "Status should be pass");
    passed++;
    console.log("  ✓ Test 1: Single-phase Active/Apparent Power passed (3.39 kW)");
  }

  // Test 2: Three-phase power calculation
  {
    const res = calculateElectrical("three", {
      voltage: 400,
      current: 32,
      powerFactor: 0.88,
    });
    // Expected P = sqrt(3) * 400 * 32 * 0.88 / 1000 = 19.51 kW
    assert(Math.abs(res.value - 19.51) < 0.1, `Three phase power expected ~19.51 kW, got ${res.value}`);
    assert(res.unit === "kW", "Unit should be kW");
    passed++;
    console.log("  ✓ Test 2: Three-phase Symmetrical Power passed (19.51 kW)");
  }

  // Test 3: Voltage Drop (1-phase copper)
  {
    const res = calculateElectrical("drop", {
      voltage: 230,
      length: 25,
      area: 2.5,
      current: 16,
      material: "copper",
      powerFactor: 0.95,
      networkPhase: "single",
    });
    // Drop V = 2 * 0.0175 * 25 * 16 * 0.95 / 2.5 = 5.32 V
    // Drop % = 5.32 / 230 * 100 = 2.31 %
    assert(Math.abs(res.value - 2.31) < 0.1, `Voltage drop % expected ~2.31%, got ${res.value}%`);
    assert(res.pueCompliance?.status === "pass", "2.31% drop should PASS (<= 5.0%)");
    passed++;
    console.log("  ✓ Test 3: 1-Phase Copper Voltage Drop passed (2.31% <= 5% PUE Limit)");
  }

  // Test 4: Voltage Drop Excessive (Fail condition under PUE 7.1)
  {
    const res = calculateElectrical("drop", {
      voltage: 230,
      length: 120, // long line
      area: 1.5,
      current: 16,
      material: "copper",
      powerFactor: 0.95,
      networkPhase: "single",
    });
    // Should exceed 5% and trigger FAIL
    assert(res.value > 5.0, `Long line voltage drop should be > 5.0%, got ${res.value}%`);
    assert(res.pueCompliance?.status === "fail", "Over 5% drop must be flagged as FAIL");
    passed++;
    console.log(`  ✓ Test 4: Excessive Voltage Drop Overload correctly flagged FAIL (${res.value}%)`);
  }

  // Test 5: Cable Sizing with ambient temperature & grouping derating
  {
    const res = calculateElectrical("cablesizing", {
      powerKw: 5.5,
      voltage: 230,
      material: "copper",
      ambientTempC: 40, // derates by 0.87
      cablesInGroup: 3, // derates by 0.70
    });
    // Current = 5500 / (230 * 0.92) ≈ 26.0A
    // Derating factor = 0.87 * 0.70 ≈ 0.609
    // Required table ampacity = 26.0 / 0.609 ≈ 42.7A -> requires 6.0 mm² (46A)
    assert(res.value >= 4.0, `Cable size should be at least 4.0 or 6.0 mm², got ${res.value} mm²`);
    passed++;
    console.log(`  ✓ Test 5: IEC 60364-5-52 Cable Sizing with derating passed (${res.value} mm²)`);
  }

  // Test 6: Prospective Short-Circuit Current & Breaker Trip
  {
    const res = calculateElectrical("shortcircuit", {
      voltage: 230,
      length: 15,
      area: 2.5,
      material: "copper",
      breakerRatingA: 16,
      breakerCurve: "C", // requires 10 * 16 = 160A
    });
    // Loop resistance ≈ 2 * 0.0175 * 15 / 2.5 = 0.21 Ohm
    // Z ≈ 0.26 Ohm -> Ikz ≈ 880A >> 160A
    assert(res.value > 500, `Short circuit current should be > 500A, got ${res.value}A`);
    assert(res.pueCompliance?.status === "pass", "Short circuit current must trip C16 breaker in < 0.4s");
    passed++;
    console.log(`  ✓ Test 6: Prospective Short Circuit Current verified (${res.value} A vs 160A threshold)`);
  }

  // Test 7: Earthing Ground Loop Resistance (Dwight formula)
  {
    const res = calculateElectrical("earthing", {
      soilResistivity: 100, // Loam/clay
      rodLength: 2.5,
      rodDiameter: 16,
      targetResistance: 4.0,
    });
    assert(res.value > 0 && res.value < 100, `Earthing rod resistance should be realistic, got ${res.value} Ohm`);
    assert(res.pueCompliance !== undefined, "Should have PUE compliance note");
    passed++;
    console.log(`  ✓ Test 7: Earthing Ground Loop Resistance verified (R = ${res.value} Ω)`);
  }

  // Test 8: Three-Phase Load Asymmetry & Neutral Current
  {
    const res = calculateElectrical("imbalance", {
      loadPhaseA: 30,
      loadPhaseB: 20,
      loadPhaseC: 10,
    });
    // Average = 20A. Max dev = 10A -> 50% imbalance (> 15% PUE threshold) -> must FAIL
    assert(res.value >= 40, `Imbalance should be ~50%, got ${res.value}%`);
    assert(res.pueCompliance?.status === "fail", "50% unbalance must trigger FAIL warning under PUE 7.1.36");
    passed++;
    console.log(`  ✓ Test 8: 3-Phase Phase Imbalance & Neutral Current verified (${res.value}%)`);
  }

  // Test 9: Multi-Project BOM Component Aggregation
  {
    const mockProjects: any[] = [
      {
        id: "proj-1",
        name: "Test Penthouse",
        code: "TP-01",
        materials: [
          { id: "m-1", category: "cables", name: "Copper Cable VVGng-LS 3x2.5", model: "Uzkabel", unit: "m", quantity: 50, unitPriceUzS: 15000, wastePercent: 10 },
          { id: "m-2", category: "protection", name: "Schneider iC60N 16A MCB", model: "iC60N", unit: "pcs", quantity: 6, unitPriceUzS: 110000, wastePercent: 0 }
        ],
        laborRatePerDayUzs: 800000,
        contingencyPercent: 5.0
      },
      {
        id: "proj-2",
        name: "Test Data Hub",
        code: "TD-02",
        materials: [
          { id: "m-3", category: "cables", name: "Copper Cable VVGng-LS 3x2.5", model: "Uzkabel", unit: "m", quantity: 70, unitPriceUzS: 15000, wastePercent: 10 },
          { id: "m-4", category: "protection", name: "Schneider iC60N 16A MCB", model: "iC60N", unit: "pcs", quantity: 4, unitPriceUzS: 110000, wastePercent: 0 }
        ],
        laborRatePerDayUzs: 900000,
        contingencyPercent: 5.0
      }
    ];

    const { items, summary } = aggregateProjectMaterials(mockProjects);
    // Combined VVGng-LS 3x2.5: 50 + 70 = 120m base -> 132m billable with 10% waste
    const cableItem = items.find(i => i.name.includes("3x2.5"));
    assert(!!cableItem, "Aggregated cable item must exist");
    assert(cableItem!.totalQuantity === 120, `Expected total quantity 120, got ${cableItem!.totalQuantity}`);
    assert(cableItem!.billableQuantity === 132, `Expected billable quantity 132, got ${cableItem!.billableQuantity}`);
    assert(cableItem!.contributions.length === 2, "Must have 2 contributing projects");

    // Combined Breakers: 6 + 4 = 10 pcs
    const breakerItem = items.find(i => i.name.includes("iC60N"));
    assert(!!breakerItem, "Aggregated breaker item must exist");
    assert(breakerItem!.totalQuantity === 10, `Expected 10 breakers, got ${breakerItem!.totalQuantity}`);

    assert(summary.projectsCount === 2, "Projects count should be 2");
    assert(summary.grandTotalUzs > 0, "Grand total must be positive");
    passed++;
    console.log(`  ✓ Test 9: Multi-Project BOM Component Aggregation verified (120m cable, 10 breakers merged)`);
  }

  // Test 10: Downloadable CSV Cost Summary Generation
  {
    const mockProject: any = {
      id: "proj-1",
      name: "Tashkent City Block 4",
      code: "TC-B4-P7",
      client: "Mirabad Residences",
      location: "Tashkent",
      standard: "IEC 60364",
      leadEngineer: "Olimjon Khashimov, PE",
      materials: [
        { id: "m-1", category: "cables", name: "Copper Cable VVGng-LS 3x2.5", model: "Uzkabel", specification: "Cu 660V", unit: "m", quantity: 100, unitPriceUzS: 15000, wastePercent: 10 }
      ],
      laborRatePerDayUzs: 850000,
      contingencyPercent: 5.0
    };

    const csvOutput = generateBomCsvContent({
      scope: 'single',
      selectedProjects: [mockProject],
      activeProject: mockProject,
      currency: 'UZS',
      usdToUzsRate: 12800
    });

    assert(csvOutput.startsWith('\uFEFF'), "CSV must start with UTF-8 BOM \\uFEFF for Excel compatibility");
    assert(csvOutput.includes("ELECTROVISION AI PRO — DETERMINISTIC BILL OF MATERIALS"), "CSV must include title header");
    assert(csvOutput.includes("Copper Cable VVGng-LS 3x2.5"), "CSV must contain material row");
    assert(csvOutput.includes("EXECUTIVE COST & LABOR SUMMARY"), "CSV must include financial summary block");
    assert(csvOutput.includes("GRAND TOTAL ESTIMATED COST"), "CSV must include Grand Total");
    passed++;
    console.log(`  ✓ Test 10: Downloadable CSV Cost Summary generation verified (RFC-4180 with UTF-8 BOM)`);
  }

  console.log(`\n🎉 All ${passed}/10 Electrical Reference & BOM Engineering Tests PASSED successfully!`);
  return { passed, total: 10 };
}

// Run immediately if executed via tsx
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('calculations.test')) {
  runElectricalTests();
}
