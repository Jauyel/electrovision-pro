/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ElectroVision AI PRO - Certified Electrical Engineering Calculation Engine
 * Compliant with PUE 7.1 (ПУЭ), GOST 30331, and IEC 60364-5-52.
 */

export type CalcKind = 
  | "single" 
  | "three" 
  | "drop" 
  | "cablesizing"
  | "shortcircuit" 
  | "earthing" 
  | "imbalance"
  | "energy";

export type ConductorMaterial = "copper" | "aluminium";

export interface CalcInput {
  voltage?: number;                 // Volts (default 230V or 400V)
  current?: number;                 // Amperes (load current)
  powerKw?: number;                 // Active power in kW
  powerFactor?: number;             // cos φ (0.7 - 1.0)
  length?: number;                  // Circuit length in meters
  area?: number;                    // Conductor cross-section in mm²
  material?: ConductorMaterial;     // "copper" or "aluminium"
  networkPhase?: "single" | "three";// Single-phase (230V) or 3-phase (400V)
  
  // Cable Sizing & Environmental Derating (IEC 60364-5-52)
  installMethod?: "conduit" | "tray" | "wall_plaster" | "air";
  ambientTempC?: number;            // Ambient temp in °C (default 30°C)
  cablesInGroup?: number;           // Number of multi-core cables in bundle/tray
  
  // Earthing / Grounding (PUE 1.7 / GOST)
  soilResistivity?: number;         // Grunt solishtirma qarshiligi (Ohm*m)
  rodLength?: number;               // Vertical electrode length in meters
  rodDiameter?: number;             // Electrode diameter in mm
  targetResistance?: number;        // Target resistance in Ohm (default 4.0 Ohm)
  
  // Short Circuit & Circuit Breaker Rating
  breakerRatingA?: number;          // Nominal current of breaker (e.g. 16, 25, 40)
  breakerCurve?: "B" | "C" | "D";   // Magnetic trip characteristic
  gridImpedance?: number;           // Upstream transformer/source impedance (default 0.05 Ohm)
  
  // Phase Imbalance (3-phase loads in Amperes or kW)
  loadPhaseA?: number;
  loadPhaseB?: number;
  loadPhaseC?: number;
  
  // Energy Consumption & Tariffs
  hoursPerDay?: number;
  days?: number;
  tariffPerKwh?: number;            // Currency per kWh (e.g. 450 UZS or 0.12 USD)
}

export interface PueComplianceResult {
  status: "pass" | "warning" | "fail";
  text: string;
  recommendation: string;
  standardClause: string;
}

export interface CalcOutput {
  kind: CalcKind;
  value: number;
  unit: string;
  formula: string;
  assumption: string;
  pueCompliance?: PueComplianceResult;
  details: Array<{ label: string; value: string; hint?: string }>;
  standards: string[];
}

// Standard IEC 60364-5-52 / PUE 1.3 continuous permissible currents for copper cables in conduit (Table B.52.4 / PUE Tab. 1.3.4)
export const COPPER_AMPACITY_TABLE: Record<number, number> = {
  1.5: 19.5, // 16A standard breaker
  2.5: 27.0, // 20A or 25A breaker
  4.0: 36.0, // 32A breaker
  6.0: 46.0, // 40A breaker
  10.0: 63.0,// 50A or 63A breaker
  16.0: 85.0,// 80A breaker
  25.0: 112.0,
  35.0: 138.0,
  50.0: 168.0,
};

export const ALUMINIUM_AMPACITY_TABLE: Record<number, number> = {
  2.5: 20.0,
  4.0: 28.0,
  6.0: 36.0,
  10.0: 49.0,
  16.0: 66.0,
  25.0: 87.0,
  35.0: 107.0,
  50.0: 131.0,
};

// Temperature derating factor for PVC insulated cables (IEC 60364-5-52 Table B.52.14, reference 30°C)
export function getTemperatureCorrectionFactor(tempC: number): number {
  if (tempC <= 25) return 1.06;
  if (tempC <= 30) return 1.00;
  if (tempC <= 35) return 0.94;
  if (tempC <= 40) return 0.87;
  if (tempC <= 45) return 0.79;
  if (tempC <= 50) return 0.71;
  return 0.65;
}

// Grouping derating factor (IEC 60364-5-52 Table B.52.17)
export function getGroupingCorrectionFactor(count: number): number {
  if (count <= 1) return 1.0;
  if (count === 2) return 0.8;
  if (count === 3) return 0.7;
  if (count === 4) return 0.65;
  if (count <= 6) return 0.6;
  if (count <= 9) return 0.55;
  return 0.5;
}

/**
 * Main Electrical Calculation Engine
 */
export function calculateElectrical(kind: CalcKind, v: CalcInput): CalcOutput {
  const isPos = (n: number | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

  // --------------------------------------------------------------------------
  // 1. Single-Phase Active, Apparent, Reactive Power and Current
  // --------------------------------------------------------------------------
  if (kind === "single") {
    const voltage: number = isPos(v.voltage) ? v.voltage : 230;
    const pf = v.powerFactor && v.powerFactor > 0 && v.powerFactor <= 1.0 ? v.powerFactor : 0.92;
    
    let pKw = 0;
    let currentA = 0;

    if (isPos(v.powerKw)) {
      pKw = v.powerKw!;
      currentA = (pKw * 1000) / (voltage * pf);
    } else if (isPos(v.current)) {
      currentA = v.current!;
      pKw = (voltage * currentA * pf) / 1000;
    } else {
      throw new Error("Hisoblash uchun quvvat (kW) yoki tok (A) qiymatini kiriting.");
    }

    const sKva = (voltage * currentA) / 1000;
    const qKvar = Math.sqrt(Math.max(0, sKva * sKva - pKw * pKw));
    
    // Nearest standard breaker rating: 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100
    const standardBreakers = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];
    const recBreaker = standardBreakers.find(b => b >= currentA * 1.15) || Math.ceil(currentA * 1.15);

    // Recommended cable section according to standard breaker
    let recCable = "VVGng-LS 3x2.5 mm²";
    if (recBreaker <= 10) recCable = "VVGng-LS 3x1.5 mm² (Yoritish)";
    else if (recBreaker <= 16) recCable = "VVGng-LS 3x2.5 mm² (Rozetkalar)";
    else if (recBreaker <= 25) recCable = "VVGng-LS 3x4.0 mm² (Konditsioner / Plita)";
    else if (recBreaker <= 32) recCable = "VVGng-LS 3x6.0 mm² (Kuchli iste'molchi)";
    else if (recBreaker <= 50) recCable = "VVGng-LS 3x10.0 mm² (Kirish kabeli)";
    else recCable = "VVGng-LS 3x16.0 mm² (Asosiy kiritish)";

    return {
      kind,
      value: Number(pKw.toFixed(2)),
      unit: "kW",
      formula: "P = V × I × cos φ ÷ 1000  |  I = P × 1000 ÷ (V × cos φ)",
      assumption: `1-fazali tarmoq (V = ${voltage}V RMS). Quvvat koeffitsienti cos φ = ${pf}.`,
      pueCompliance: {
        status: "pass",
        text: `Nominal tok: ${currentA.toFixed(1)} A · Quvvat: ${pKw.toFixed(2)} kW`,
        recommendation: `Tavsiya etilgan himoya avtomati: C${recBreaker}A (1P+N yoki 2P). Kabel: ${recCable}.`,
        standardClause: "PUE 7.1.34 / IEC 60364-4-41"
      },
      details: [
        { label: "Aktiv quvvat (P)", value: `${pKw.toFixed(2)} kW` },
        { label: "To'liq quvvat (S)", value: `${sKva.toFixed(2)} kVA` },
        { label: "Reaktiv quvvat (Q)", value: `${qKvar.toFixed(2)} kVAr` },
        { label: "Hisobiy yuklama toki (I)", value: `${currentA.toFixed(1)} A` },
        { label: "Tavsiya etilgan avtomat", value: `C${recBreaker} (Nominal: ${recBreaker}A)` },
        { label: "Tavsiya etilgan kabel", value: recCable },
        { label: "UZO / RCD sezgirligi", value: "30 mA (Inson xavfsizligi, nam zonada 10 mA)" },
      ],
      standards: ["PUE 7.1", "IEC 60364-4-41", "GOST 30331"]
    };
  }

  // --------------------------------------------------------------------------
  // 2. Three-Phase Symmetrical Active, Apparent Power and Current
  // --------------------------------------------------------------------------
  if (kind === "three") {
    const voltage: number = isPos(v.voltage) ? v.voltage : 400; // Line voltage (380V or 400V)
    const pf = v.powerFactor && v.powerFactor > 0 && v.powerFactor <= 1.0 ? v.powerFactor : 0.88;
    
    let pKw = 0;
    let currentA = 0;

    if (isPos(v.powerKw)) {
      pKw = v.powerKw!;
      currentA = (pKw * 1000) / (Math.sqrt(3) * voltage * pf);
    } else if (isPos(v.current)) {
      currentA = v.current!;
      pKw = (Math.sqrt(3) * voltage * currentA * pf) / 1000;
    } else {
      throw new Error("3 fazali hisoblash uchun umumiy quvvat (kW) yoki faza toki (A) kiriting.");
    }

    const sKva = (Math.sqrt(3) * voltage * currentA) / 1000;
    const qKvar = Math.sqrt(Math.max(0, sKva * sKva - pKw * pKw));

    const standardBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];
    const recBreaker = standardBreakers.find(b => b >= currentA * 1.15) || Math.ceil(currentA * 1.15);

    let recCable = "VVGng-LS 5x2.5 mm²";
    if (recBreaker <= 16) recCable = "VVGng-LS 5x2.5 mm²";
    else if (recBreaker <= 25) recCable = "VVGng-LS 5x4.0 mm²";
    else if (recBreaker <= 32) recCable = "VVGng-LS 5x6.0 mm²";
    else if (recBreaker <= 50) recCable = "VVGng-LS 5x10.0 mm²";
    else if (recBreaker <= 63) recCable = "VVGng-LS 5x16.0 mm²";
    else if (recBreaker <= 100) recCable = "VVGng-LS 5x25.0 mm²";
    else recCable = "VVGng-LS 5x35.0 mm² yoki 5x50.0 mm²";

    return {
      kind,
      value: Number(pKw.toFixed(2)),
      unit: "kW",
      formula: "P = √3 × V_chiziqli × I × cos φ ÷ 1000  |  I = P × 1000 ÷ (√3 × V_L × cos φ)",
      assumption: `Simmetrik 3 fazali tarmoq (V_L = ${voltage}V). Faza quvvat koeffitsienti cos φ = ${pf}.`,
      pueCompliance: {
        status: "pass",
        text: `Fazadagi hisobiy tok: ${currentA.toFixed(1)} A · Umumiy aktiv quvvat: ${pKw.toFixed(2)} kW`,
        recommendation: `Tavsiya etilgan 3 qutbli avtomat: C${recBreaker} (3P yoki 4P). Kabel: ${recCable}.`,
        standardClause: "PUE 7.1.34 / IEC 60364-5-52"
      },
      details: [
        { label: "Aktiv quvvat (P)", value: `${pKw.toFixed(2)} kW` },
        { label: "To'liq quvvat (S)", value: `${sKva.toFixed(2)} kVA` },
        { label: "Reaktiv quvvat (Q)", value: `${qKvar.toFixed(2)} kVAr` },
        { label: "Har bir fazadagi tok (I)", value: `${currentA.toFixed(1)} A` },
        { label: "Tavsiya etilgan 3P/4P avtomat", value: `C${recBreaker}A (3 qutbli)` },
        { label: "Tavsiya etilgan 5 simli kabel", value: recCable },
        { label: "Neytral o'tkazgich", value: "Faza kesimi bilan teng (PUE 7.1 talabi)" },
      ],
      standards: ["PUE 7.1.34", "IEC 60364-5-52", "IEC 61439-1"]
    };
  }

  // --------------------------------------------------------------------------
  // 3. Voltage Drop (ΔU) & Line Resistance
  // --------------------------------------------------------------------------
  if (kind === "drop") {
    const voltage: number = isPos(v.voltage) ? v.voltage : (v.networkPhase === "three" ? 400 : 230);
    const length = isPos(v.length) ? v.length! : 25;
    const area = isPos(v.area) ? v.area! : 2.5;
    const current = isPos(v.current) ? v.current! : (isPos(v.powerKw) ? (v.powerKw! * 1000) / (voltage * 0.95) : 16);
    const material = v.material || "copper";
    const pf = v.powerFactor && v.powerFactor > 0 ? v.powerFactor : 0.95;
    const isThreePhase = v.networkPhase === "three";

    const rho = material === "copper" ? 0.0175 : 0.0282; // Ohm * mm^2 / m at 20°C
    const factor = isThreePhase ? Math.sqrt(3) : 2.0; // Round-trip for 1-phase (2 lines), sqrt(3) for 3-phase line drop

    const dropV = (factor * rho * length * current * pf) / area;
    const dropPercent = (dropV / voltage) * 100;
    const remainingV = voltage - dropV;

    // Permissible limits under PUE 7.1 & IEC 60364-5-52:
    // Lighting <= 3%, Sockets/General <= 5%, Max emergency <= 8%
    let status: "pass" | "warning" | "fail" = "pass";
    let complianceText = "";
    let rec = "";

    if (dropPercent <= 3.0) {
      status = "pass";
      complianceText = `Kuchlanish pasayishi: ${dropPercent.toFixed(2)}% (${dropV.toFixed(2)}V) — A'lo darajada`;
      rec = "PUE 7.1 va IEC 60364 standartlariga to'liq mos keladi. Barcha turdagi nozik elektronika va yoritish uchun xavfsiz.";
    } else if (dropPercent <= 5.0) {
      status = "warning";
      complianceText = `Kuchlanish pasayishi: ${dropPercent.toFixed(2)}% (${dropV.toFixed(2)}V) — Ruxsat etilgan chegara`;
      rec = "Maksimal ruxsat etilgan me'yor ichida (5.0%). Biroq zaxira hosil qilish uchun kabel kesimini 1 pog'ona kattalashtirish tavsiya etiladi.";
    } else {
      status = "fail";
      complianceText = `XAVFLI: Kuchlanish pasayishi: ${dropPercent.toFixed(2)}% (${dropV.toFixed(2)}V) — Me'yordan yuqori!`;
      rec = "PUE 7.1 standarti buzilgan (> 5%). Kuchlanishning haddan tashqari tushishi kabellar qizishiga va uskunalar nosozligiga olib keladi. Zudlik bilan kabel kesimini oshiring!";
    }

    const lineResistance = (factor * rho * length) / area;

    return {
      kind,
      value: Number(dropPercent.toFixed(2)),
      unit: "%",
      formula: isThreePhase
        ? "ΔV = √3 × ρ × L × I × cos φ ÷ S  |  ΔU% = (ΔV ÷ V_nom) × 100"
        : "ΔV = 2 × ρ × L × I × cos φ ÷ S  |  ΔU% = (ΔV ÷ V_nom) × 100",
      assumption: `${material === "copper" ? "Mis (Cu)" : "Alyuminiy (Al)"} kabel (ρ = ${rho} Ω·mm²/m, 20°C). ${isThreePhase ? "3-fazali" : "1-fazali"} tarmoq. PUE me'yori: ≤5.0%.`,
      pueCompliance: {
        status,
        text: complianceText,
        recommendation: rec,
        standardClause: "PUE 7.1.34 / IEC 60364-5-52 Tab. 52A"
      },
      details: [
        { label: "Kuchlanish pasayishi (V)", value: `${dropV.toFixed(2)} V` },
        { label: "Kuchlanish pasayishi (%)", value: `${dropPercent.toFixed(2)} %` },
        { label: "Iste'molchidagi kuchlanish", value: `${remainingV.toFixed(1)} V` },
        { label: "Liniya faol qarshiligi (R)", value: `${lineResistance.toFixed(3)} Ω` },
        { label: "Kabel uzunligi va kesimi", value: `${length} m · ${area} mm² (${material === "copper" ? "Mis" : "Alyuminiy"})` },
        { label: "Ruxsat etilgan PUE me'yori", value: "Maksimal 5.0% (Yoritish uchun 3.0%)" },
      ],
      standards: ["PUE 7.1", "IEC 60364-5-52", "GOST 31996"]
    };
  }

  // --------------------------------------------------------------------------
  // 4. Comprehensive Cable Sizing & Thermal Ampacity (IEC 60364-5-52)
  // --------------------------------------------------------------------------
  if (kind === "cablesizing") {
    const voltage: number = isPos(v.voltage) ? v.voltage : (v.networkPhase === "three" ? 400 : 230);
    const pf = v.powerFactor && v.powerFactor > 0 ? v.powerFactor : 0.92;
    const material = v.material || "copper";
    const isThreePhase = v.networkPhase === "three";

    let loadCurrent = 0;
    if (isPos(v.current)) {
      loadCurrent = v.current!;
    } else if (isPos(v.powerKw)) {
      loadCurrent = isThreePhase 
        ? (v.powerKw! * 1000) / (Math.sqrt(3) * voltage * pf)
        : (v.powerKw! * 1000) / (voltage * pf);
    } else {
      loadCurrent = 16;
    }

    const tempC = v.ambientTempC || 30;
    const groupCount = v.cablesInGroup || 1;
    const kTemp = getTemperatureCorrectionFactor(tempC);
    const kGroup = getGroupingCorrectionFactor(groupCount);
    const kTotal = kTemp * kGroup;

    // Required derated permissible current: I_z >= I_load / kTotal
    const reqPermissibleA = loadCurrent / kTotal;

    const table = material === "copper" ? COPPER_AMPACITY_TABLE : ALUMINIUM_AMPACITY_TABLE;
    const sections = Object.keys(table).map(Number).sort((a, b) => a - b);
    
    let selectedSection = sections[sections.length - 1];
    for (const sec of sections) {
      if (table[sec] >= reqPermissibleA) {
        selectedSection = sec;
        break;
      }
    }

    const permissibleCurrent = table[selectedSection] * kTotal;
    const standardBreakers = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160];
    const recBreaker = standardBreakers.find(b => b >= loadCurrent && b <= permissibleCurrent) || Math.floor(permissibleCurrent);

    return {
      kind,
      value: selectedSection,
      unit: "mm²",
      formula: "I_z = I_tab × k_temp × k_group ≥ I_hisob  |  S_tanlov: I_z ≥ I_b",
      assumption: `${material === "copper" ? "Mis VVGng-LS" : "Alyuminiy AVVG"}, atrof-muhit harorati ${tempC}°C, guruhda ${groupCount} ta kabel.`,
      pueCompliance: {
        status: "pass",
        text: `Tavsiya etilgan kesim: ${selectedSection} mm² (${material === "copper" ? "Mis" : "Alyuminiy"})`,
        recommendation: `Kabelning uzoq muddatli ruxsat etilgan toki: ${permissibleCurrent.toFixed(1)}A (Hisobiy tok: ${loadCurrent.toFixed(1)}A). Himoya avtomati: C${recBreaker}A.`,
        standardClause: "PUE 1.3.4 / IEC 60364-5-52 Tab. B.52.4"
      },
      details: [
        { label: "Tanlangan kabel kesimi (S)", value: `${selectedSection} mm² (${material})` },
        { label: "Hisobiy yuklama toki (I_b)", value: `${loadCurrent.toFixed(1)} A` },
        { label: "Zavod jadval toki (I_tab)", value: `${table[selectedSection]} A` },
        { label: "Harorat koeffitsienti (k_temp)", value: `${kTemp.toFixed(2)} (${tempC}°C)` },
        { label: "Guruhlash koeffitsienti (k_group)", value: `${kGroup.toFixed(2)} (${groupCount} ta kabel)` },
        { label: "Haqiqiy ruxsat etilgan tok (I_z)", value: `${permissibleCurrent.toFixed(1)} A` },
        { label: "Mos himoya avtomati (I_n)", value: `C${recBreaker} (I_b ≤ I_n ≤ I_z)` },
      ],
      standards: ["IEC 60364-5-52", "PUE 1.3", "GOST 31996"]
    };
  }

  // --------------------------------------------------------------------------
  // 5. Prospective Short-Circuit Current & Breaker Magnetic Trip Thresholds
  // --------------------------------------------------------------------------
  if (kind === "shortcircuit") {
    const voltage: number = isPos(v.voltage) ? v.voltage : 230; // Phase-neutral voltage
    const length = isPos(v.length) ? v.length! : 20;
    const area = isPos(v.area) ? v.area! : 2.5;
    const material = v.material || "copper";
    const breakerRating = isPos(v.breakerRatingA) ? v.breakerRatingA! : 16;
    const curve = v.breakerCurve || "C";

    const rho = material === "copper" ? 0.0175 : 0.0282; // Ohm * mm^2 / m
    const rLoop = (2 * rho * length) / area; // phase + neutral conductor resistance
    const rUpstream = isPos(v.gridImpedance) ? v.gridImpedance! : 0.05; // source grid / transformer impedance
    const xLoop = 2 * 0.00008 * length; // typical reactive inductive reactance (~0.08 mOhm/m)
    const zTotal = Math.hypot(rLoop + rUpstream, xLoop + 0.02);

    const ikz = voltage / zTotal;

    // Trip multiplier thresholds:
    // Curve B: 3 - 5 * In (trips instantaneous between 3 and 5 times rated current)
    // Curve C: 5 - 10 * In (trips instantaneous between 5 and 10 times rated current)
    // Curve D: 10 - 20 * In (trips instantaneous between 10 and 20 times rated current)
    const tripMultipliers = { B: 5, C: 10, D: 20 };
    const requiredTripCurrent = breakerRating * tripMultipliers[curve];
    const isSafe = ikz >= requiredTripCurrent;
    const safetyMargin = (ikz / requiredTripCurrent).toFixed(2);

    let status: "pass" | "warning" | "fail" = "pass";
    let text = "";
    let rec = "";

    if (ikz >= requiredTripCurrent * 1.3) {
      status = "pass";
      text = `Qisqa tutashuv toki: ${ikz.toFixed(0)} A (Talab: ${requiredTripCurrent} A) — Ishonchli himoya`;
      rec = `Tok ${curve}${breakerRating} avtomatining lahzali o'chirish chegarasidan ${safetyMargin} barobar yuqori. Avtomat 0.1 soniyadan kam vaqtda uziladi (PUE 1.7.79 talabiga to'liq mos).`;
    } else if (ikz >= requiredTripCurrent) {
      status = "warning";
      text = `Qisqa tutashuv toki: ${ikz.toFixed(0)} A (Talab: ${requiredTripCurrent} A) — Chegara darajasida`;
      rec = `Zaxira chegarasi past (${safetyMargin}x). Liniya uzaytirilsa yoki harorat oshsa avtomat lahzali uzilmasligi mumkin. B${breakerRating} avtomat yoki qalinroq kabel tavsiya etiladi.`;
    } else {
      status = "fail";
      text = `XAVFLI: Qisqa tutashuv toki (${ikz.toFixed(0)} A) ${curve}${breakerRating} avtomatini lahzali o'chira olmaydi!`;
      rec = `Avtomat uzilish chegarasi ${requiredTripCurrent} A, liniya oxiridagi tok esa faqat ${ikz.toFixed(0)} A. Qisqa tutashuvda kabel erib yonib ketishi mumkin! B${breakerRating} avtomat o'rnating, kabel kesimini oshiring yoki 30mA UZO/RCD o'rnating.`;
    }

    return {
      kind,
      value: Math.round(ikz),
      unit: "A",
      formula: "I_kz = V_faza ÷ Z_faza-nol  |  Z = √((R_kabel + R_tr)² + (X_kabel + X_tr)²)",
      assumption: `V = ${voltage}V, L = ${length}m, S = ${area}mm² (${material}). Avtomat: ${curve}${breakerRating}A. Z_faza-nol = ${zTotal.toFixed(3)} Ω.`,
      pueCompliance: {
        status,
        text,
        recommendation: rec,
        standardClause: "PUE 1.7.79 / IEC 60364-4-41 (0.4s TN uzilish vaqti)"
      },
      details: [
        { label: "Bir fazali Q.T. toki (I_kz)", value: `${ikz.toFixed(0)} A` },
        { label: "Avtomat lahzali uzish toki (I_a)", value: `${requiredTripCurrent} A (${curve} xarakteristika)` },
        { label: "Himoya ishonchlilik zaxirasi", value: `${safetyMargin}x (${isSafe ? "Yetarli" : "YETARSIZ"})` },
        { label: "Faza-nol halqa qarshiligi (Z_s)", value: `${zTotal.toFixed(3)} Ω` },
        { label: "Kabel faol qarshiligi (R_L)", value: `${rLoop.toFixed(3)} Ω` },
        { label: "Transformator / manba qarshiligi", value: `${rUpstream} Ω` },
      ],
      standards: ["PUE 1.7.79", "IEC 60364-4-41", "GOST 30331.3"]
    };
  }

  // --------------------------------------------------------------------------
  // 6. Earthing (Zazemleniye) Resistance & Protective Grounding Contour
  // --------------------------------------------------------------------------
  if (kind === "earthing") {
    const rho = isPos(v.soilResistivity) ? v.soilResistivity! : 100; // Ohm*m
    const L = isPos(v.rodLength) ? v.rodLength! : 2.5; // Electrode length in meters
    const d = (isPos(v.rodDiameter) ? v.rodDiameter! : 16) / 1000; // mm to meters
    const target = isPos(v.targetResistance) ? v.targetResistance! : 4.0; // PUE standard <= 4 Ohm
    const tDepth = 0.8; // bury depth from ground surface to top of rod in meters

    // Rigorous PUE / Dwight formula for single vertical ground rod buried at depth:
    // R = (rho / (2 * pi * L)) * (ln(2L / d) + 0.5 * ln((4T + L) / (4T - L)))
    const T = tDepth + L / 2;
    const term1 = Math.log((2 * L) / d);
    const term2 = 0.5 * Math.log((4 * T + L) / (4 * T - L));
    const rSingle = (rho / (2 * Math.PI * L)) * (term1 + term2);

    // Screening/utilization coefficient for group of rods connected by steel strip (PUE Tab. 1.7.3):
    // eta ≈ 0.75 - 0.85
    const eta = 0.80;
    const rodsNeeded = Math.max(1, Math.ceil(rSingle / (target * eta)));
    const actualContourR = rSingle / (rodsNeeded * eta);

    const isPass = actualContourR <= target;

    return {
      kind,
      value: Number(rSingle.toFixed(2)),
      unit: "Ω",
      formula: "R_bittalik = (ρ ÷ 2πL) × [ln(2L/d) + 0.5 ln((4T+L)/(4T-L))]  |  R_kontur = R ÷ (n × η)",
      assumption: `Grunt: ρ = ${rho} Ω·m, L = ${L}m, diametri Ø = ${v.rodDiameter || 16}mm, chuqurlik = ${tDepth}m. Me'yor: R ≤ ${target} Ω.`,
      pueCompliance: {
        status: isPass ? "pass" : "warning",
        text: `1 ta elektrod qarshiligi: ${rSingle.toFixed(1)} Ω · Kontur qarshiligi (${rodsNeeded} ta elektrod): ${actualContourR.toFixed(1)} Ω`,
        recommendation: rSingle <= target
          ? `1 ta elektrod ${target} Om lik PUE me'yorini to'liq ta'minlaydi.`
          : `${target} Om me'yoriga erishish uchun kamida ${rodsNeeded} ta elektrodni 3 metr masofada uchburchak yoki qator shaklida 40x4mm po'lat lenta bilan payvandlab ulash zarur.`,
        standardClause: "PUE 1.7.101 / GOST 12.1.030"
      },
      details: [
        { label: "1 ta vertikal elektrod qarshiligi", value: `${rSingle.toFixed(2)} Ω` },
        { label: "Talab qilingan PUE me'yori", value: `≤ ${target.toFixed(1)} Ω (220/380V tarmoq)` },
        { label: "Zarur elektrodlar soni (n)", value: `${rodsNeeded} dona (L = ${L}m)` },
        { label: "Guruhlash koeffitsienti (η)", value: `${eta}` },
        { label: "Natijaviy kontur qarshiligi", value: `${actualContourR.toFixed(2)} Ω` },
        { label: "Gorizontal ulovchi o'tkazgich", value: "Po'lat lenta 40×4 mm (ko'milish chuqurligi 0.7-0.8m)" },
      ],
      standards: ["PUE 1.7", "GOST 12.1.030", "IEC 60364-5-54"]
    };
  }

  // --------------------------------------------------------------------------
  // 7. Three-Phase Load Imbalance & Neutral Conductor Current
  // --------------------------------------------------------------------------
  if (kind === "imbalance") {
    const iA = isPos(v.loadPhaseA) ? v.loadPhaseA! : 28;
    const iB = isPos(v.loadPhaseB) ? v.loadPhaseB! : 22;
    const iC = isPos(v.loadPhaseC) ? v.loadPhaseC! : 16;

    // Vector calculation of neutral current in 3-phase system with 120-degree phase shift:
    // I_N = sqrt(Ia^2 + Ib^2 + Ic^2 - Ia*Ib - Ib*Ic - Ic*Ia)
    const inSquared = iA * iA + iB * iB + iC * iC - iA * iB - iB * iC - iC * iA;
    const neutralA = Math.sqrt(Math.max(0, inSquared));

    const avgCurrent = (iA + iB + iC) / 3;
    const maxDev = Math.max(Math.abs(iA - avgCurrent), Math.abs(iB - avgCurrent), Math.abs(iC - avgCurrent));
    const unbalancePercent = (maxDev / avgCurrent) * 100;

    let status: "pass" | "warning" | "fail" = "pass";
    let text = "";
    let rec = "";

    if (unbalancePercent <= 10.0) {
      status = "pass";
      text = `Fazalar nomutanosibligi: ${unbalancePercent.toFixed(1)}% — A'lo darajada simmetrik`;
      rec = "PUE 7.1 talablariga mos (≤15%). Neytral simi yuklanishi minimal darajada.";
    } else if (unbalancePercent <= 15.0) {
      status = "warning";
      text = `Fazalar nomutanosibligi: ${unbalancePercent.toFixed(1)}% — Ruxsat etilgan me'yor chegarasi`;
      rec = "15% li chegaraga yaqin. Yuklamalarni qayta taqsimlash orqali simmetriyani yaxshilash tavsiya etiladi.";
    } else {
      status = "fail";
      text = `XAVFLI: Fazalar asimmetriyasi ${unbalancePercent.toFixed(1)}% — 15% me'yoridan oshgan!`;
      rec = `Neytral simida ${neutralA.toFixed(1)}A tok oqadi. Bu transformator va nol simining qizishiga, 1-fazali uskunalar kuchlanishining sakrashiga olib keladi. Bir fazali guruhlarni qayta taqsimlang!`;
    }

    return {
      kind,
      value: Number(unbalancePercent.toFixed(1)),
      unit: "%",
      formula: "I_N = √(I_A² + I_B² + I_C² - I_A·I_B - I_B·I_C - I_C·I_A)  |  Asimmetriya = (ΔI_max ÷ I_o'rtacha) × 100%",
      assumption: `Faza toklari: A = ${iA}A, B = ${iB}A, C = ${iC}A. PUE bo'yicha ruxsat etilgan asimmetriya: ≤15.0%.`,
      pueCompliance: {
        status,
        text,
        recommendation: rec,
        standardClause: "PUE 7.1.36 / GOST 32144"
      },
      details: [
        { label: "Faza A toki", value: `${iA.toFixed(1)} A` },
        { label: "Faza B toki", value: `${iB.toFixed(1)} A` },
        { label: "Faza C toki", value: `${iC.toFixed(1)} A` },
        { label: "O'rtacha faza toki", value: `${avgCurrent.toFixed(1)} A` },
        { label: "Neytral (Nol) o'tkazgichdagi tok", value: `${neutralA.toFixed(1)} A` },
        { label: "Maksimal og'ish foizi", value: `${unbalancePercent.toFixed(1)} %` },
      ],
      standards: ["PUE 7.1.36", "GOST 32144-2013", "IEC 61000-4-30"]
    };
  }

  // --------------------------------------------------------------------------
  // 8. Electricity Consumption & Operating Cost Estimator
  // --------------------------------------------------------------------------
  if (kind === "energy") {
    const voltage: number = isPos(v.voltage) ? v.voltage : (v.networkPhase === "three" ? 400 : 230);
    const pf = v.powerFactor && v.powerFactor > 0 ? v.powerFactor : 0.92;
    const hours = isPos(v.hoursPerDay) ? Math.min(24, v.hoursPerDay!) : 8;
    const days = isPos(v.days) ? Math.min(365, v.days!) : 30;
    const tariff = isPos(v.tariffPerKwh) ? v.tariffPerKwh! : 450; // default 450 UZS/kWh

    let pKw = 0;
    if (isPos(v.powerKw)) {
      pKw = v.powerKw!;
    } else if (isPos(v.current)) {
      pKw = v.networkPhase === "three"
        ? (Math.sqrt(3) * voltage * v.current! * pf) / 1000
        : (voltage * v.current! * pf) / 1000;
    } else {
      pKw = 3.5;
    }

    const dailyKwh = pKw * hours;
    const totalKwh = dailyKwh * days;
    const totalCost = totalKwh * tariff;

    return {
      kind,
      value: Number(totalKwh.toFixed(1)),
      unit: "kWh",
      formula: "E = P × t  |  Qiymat = E × Tarif",
      assumption: `Aktiv quvvat P = ${pKw.toFixed(2)} kW, kuniga ${hours} soat, ${days} kun. Tarif = ${tariff.toLocaleString()} birlik/kWh.`,
      pueCompliance: {
        status: "pass",
        text: `Davr davomida energiya sarfi: ${totalKwh.toFixed(1)} kWh (${totalCost.toLocaleString()} hisob birligi)`,
        recommendation: "Energiya sarfini optimallashtirish uchun LED yoritgichlar, harakat datchiklari va reaktiv quvvat kompensatsiyasidan (KRM) foydalaning.",
        standardClause: "O'zbekiston Respublikasi Vazirlar Mahkamasi 2024 Elektr Energetikasi Me'yori"
      },
      details: [
        { label: "Aktiv quvvat (P)", value: `${pKw.toFixed(2)} kW` },
        { label: "Kunlik elektr sarfi", value: `${dailyKwh.toFixed(2)} kWh / kun` },
        { label: "Ko'rilgan davr sarfi", value: `${totalKwh.toFixed(1)} kWh (${days} kun)` },
        { label: "Bir yillik taxminiy sarf", value: `${(dailyKwh * 365).toFixed(0)} kWh` },
        { label: "Hisoblangan to'lov summasi", value: `${Math.round(totalCost).toLocaleString()}` },
      ],
      standards: ["Energiya tejamkorlik to'g'risida Qonun", "IEC 60364-8-1"]
    };
  }

  throw new Error(`Noma'lum hisoblash turi: ${kind}`);
}
