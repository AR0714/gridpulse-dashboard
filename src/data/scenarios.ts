// Fault scenarios for the simulated transformer (UNIT-07).
// Gas values are ppm dissolved in the oil. Interpretations follow IEC 60599:2022 and
// IEEE C57.104-2019. Model figures come from the transformer-health-dga project.

export type GasKey = 'H2' | 'CH4' | 'C2H6' | 'C2H4' | 'C2H2' | 'CO' | 'CO2'
export type Gases = Record<GasKey, number>
export type ScenarioCode = 'N' | 'PD' | 'T1' | 'T3' | 'D2'

export const GAS_KEYS: GasKey[] = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2', 'CO', 'CO2']

/** Combustible gases that make up TDCG (everything except CO₂). */
export const COMBUSTIBLE: GasKey[] = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2', 'CO']

export const GAS_INFO: Record<GasKey, { name: string; formula: string }> = {
  H2: { name: 'Hydrogen', formula: 'H₂' },
  CH4: { name: 'Methane', formula: 'CH₄' },
  C2H6: { name: 'Ethane', formula: 'C₂H₆' },
  C2H4: { name: 'Ethylene', formula: 'C₂H₄' },
  C2H2: { name: 'Acetylene', formula: 'C₂H₂' },
  CO: { name: 'Carbon monoxide', formula: 'CO' },
  CO2: { name: 'Carbon dioxide', formula: 'CO₂' },
}

/** IEC 60599 typical concentration limits (ppm). */
export const IEC_LIMITS: Gases = { H2: 150, CH4: 130, C2H6: 90, C2H4: 90, C2H2: 3, CO: 600, CO2: 5700 }

export const MODEL = {
  name: 'XGBoost (calibrated)',
  accuracy: 0.8,
  duvalAccuracy: 0.571,
  testSamples: 70,
  eceBefore: 0.15,
  eceAfter: 0.1,
}

export type ShapDriver = { feature: string; value: number } // + pushes toward this fault, − away

export type Scenario = {
  code: ScenarioCode
  name: string
  pill: string // short label for the Diagnosis pill
  health: number // Health Index at the nominal gas levels
  confidence: number // model confidence, 0..1
  gases: Gases // nominal levels; live values jitter ±4% around these
  shap: ShapDriver[]
  fleetRisk: number // probability × severity
  nextSample: string
  duval: string // what the Duval triangle calls this sample
  keyGas: GasKey // the gas that matters most for this fault
  interpretation: string
  actions: [string, string, string]
}

export const SCENARIOS: Record<ScenarioCode, Scenario> = {
  N: {
    code: 'N',
    name: 'Normal operation',
    pill: 'N · Healthy',
    health: 92,
    confidence: 0.94,
    gases: { H2: 50, CH4: 25, C2H6: 15, C2H4: 18, C2H2: 0.5, CO: 280, CO2: 1500 },
    shap: [
      { feature: 'C₂H₂', value: -0.42 },
      { feature: 'C₂H₄/C₂H₆', value: -0.28 },
      { feature: 'H₂', value: -0.19 },
    ],
    fleetRisk: 0.06,
    nextSample: 'in 12 days',
    duval: 'T1',
    keyGas: 'C2H2',
    interpretation:
      'All seven gases sit inside IEC 60599 typical limits and acetylene is almost absent, so the oil and paper insulation are ageing normally.',
    actions: [
      'Keep the routine oil-sampling schedule.',
      'Trend CO and CO₂ to follow normal paper ageing.',
      'Check oil level, moisture and the breather silica gel at the next visit.',
    ],
  },
  PD: {
    code: 'PD',
    name: 'Partial discharge',
    pill: 'PD · Partial discharge',
    health: 68,
    confidence: 0.82,
    gases: { H2: 850, CH4: 45, C2H6: 20, C2H4: 25, C2H2: 2, CO: 310, CO2: 1600 },
    shap: [
      { feature: 'H₂', value: 0.61 },
      { feature: 'CH₄/H₂', value: 0.34 },
      { feature: 'C₂H₂', value: -0.23 },
    ],
    fleetRisk: 1.64,
    nextSample: 'in 1 month → re-sample now',
    duval: 'PD',
    keyGas: 'H2',
    interpretation:
      'Hydrogen at 850 ppm with little else is the signature of partial discharge: low-energy corona in gas-filled voids or wet insulation.',
    actions: [
      'Re-sample the oil now to confirm the hydrogen trend.',
      'Run online PD (UHF or acoustic) measurements to locate the source.',
      'Test oil moisture and insulation power factor; dry out the insulation if it is wet.',
    ],
  },
  T1: {
    code: 'T1',
    name: 'Thermal fault < 300 °C',
    pill: 'T1 · Thermal < 300 °C',
    health: 55,
    confidence: 0.78,
    gases: { H2: 60, CH4: 180, C2H6: 120, C2H4: 45, C2H2: 1, CO: 650, CO2: 3200 },
    shap: [
      { feature: 'CH₄/H₂', value: 0.58 },
      { feature: 'CO', value: 0.41 },
      { feature: 'C₂H₆', value: 0.29 },
    ],
    fleetRisk: 2.34,
    nextSample: 'in 2 weeks',
    duval: 'T1',
    keyGas: 'CH4',
    interpretation:
      'Methane and ethane above their limits, with CO at 650 ppm, point to a low-temperature hot spot below 300 °C that is also heating the paper insulation.',
    actions: [
      'Check loading and cooling: fans, pumps, radiators and oil flow.',
      'Take an infrared scan of the tank, radiators and bushings for hot spots.',
      'Re-sample in 2 weeks and trend the CO₂/CO ratio for paper degradation.',
    ],
  },
  T3: {
    code: 'T3',
    name: 'Thermal fault > 700 °C',
    pill: 'T3 · Thermal > 700 °C',
    health: 35,
    confidence: 0.87,
    gases: { H2: 95, CH4: 420, C2H6: 85, C2H4: 680, C2H2: 18, CO: 890, CO2: 4100 },
    shap: [
      { feature: 'C₂H₄/C₂H₆', value: 0.67 },
      { feature: 'C₂H₄', value: 0.45 },
      { feature: 'CH₄', value: 0.31 },
    ],
    fleetRisk: 3.48,
    nextSample: 'weekly',
    duval: 'T3',
    keyGas: 'C2H4',
    interpretation:
      'Ethylene at 680 ppm and a high C₂H₄/C₂H₆ ratio mean a hot spot above 700 °C, typically circulating currents in the core or an overheated joint or contact.',
    actions: [
      'Reduce load and sample weekly to track the gassing rate.',
      'Measure winding resistance and turns ratio; check the tap-changer contacts.',
      'Plan an internal inspection of the core ground and the connections.',
    ],
  },
  D2: {
    code: 'D2',
    name: 'High-energy arcing',
    pill: 'D2 · Arcing',
    health: 12,
    confidence: 0.93,
    gases: { H2: 2400, CH4: 350, C2H6: 60, C2H4: 890, C2H2: 420, CO: 520, CO2: 2800 },
    shap: [
      { feature: 'C₂H₂', value: 0.74 },
      { feature: 'C₂H₂/C₂H₄', value: 0.48 },
      { feature: 'H₂', value: 0.31 },
    ],
    fleetRisk: 4.65,
    nextSample: 'online, continuous',
    duval: 'D2',
    keyGas: 'C2H2',
    interpretation:
      'Acetylene above 400 ppm means power arcing inside the tank: a high-energy discharge between windings, leads or to ground.',
    actions: [
      'De-energize and isolate the transformer.',
      'Carry out an internal inspection of windings, leads and core for arc tracks.',
      'Check the on-load tap changer and the bushings before any re-energization.',
    ],
  },
}

export const SCENARIO_ORDER: ScenarioCode[] = ['N', 'PD', 'T1', 'T3', 'D2']
