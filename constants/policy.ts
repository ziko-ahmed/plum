// constants/policy.ts

export const POLICY = {
  id: "PLUM_OPD_2024",
  annual_limit: 50000,
  per_claim_limit: 5000,
  family_floater_limit: 150000,
  minimum_claim_amount: 500,
  submission_deadline_days: 30,
  pre_auth_threshold: 10000, // MRI/CT above this needs pre-auth

  consultation: {
    covered: true,
    sub_limit: 2000,
    copay_percentage: 10,
    network_discount_percentage: 20,
  },

  diagnostic: {
    covered: true,
    sub_limit: 10000,
    tests_needing_preauth: ["MRI", "CT Scan", "CT"],
  },

  pharmacy: {
    covered: true,
    sub_limit: 15000,
    branded_drug_copay: 30,
  },

  dental: {
    covered: true,
    sub_limit: 10000,
    covered_procedures: ["filling", "extraction", "root canal", "cleaning", "root canal treatment"],
    excluded_procedures: ["whitening", "cosmetic", "teeth whitening", "bleaching", "veneers"],
  },

  vision: {
    covered: true,
    sub_limit: 5000,
    excluded: ["lasik", "lasik surgery"],
  },

  alternative_medicine: {
    covered: true,
    sub_limit: 8000,
    covered_systems: ["ayurveda", "homeopathy", "unani", "ayurvedic"],
  },

  waiting_periods: {
    initial_days: 30,
    pre_existing_days: 365,
    maternity_days: 270,
    specific: {
      diabetes: 90,
      "type 2 diabetes": 90,
      "type 1 diabetes": 90,
      hypertension: 90,
      "high blood pressure": 90,
      joint_replacement: 730,
    } as Record<string, number>,
  },

  exclusions: [
    "cosmetic procedure",
    "cosmetic procedures",
    "weight loss",
    "bariatric",
    "obesity treatment",
    "infertility",
    "experimental treatment",
    "self-inflicted",
    "adventure sports",
    "war",
    "nuclear",
    "hiv",
    "aids",
    "alcoholism",
    "drug abuse",
    "vitamins",
    "supplements",
  ],

  network_hospitals: [
    "Apollo Hospitals",
    "Fortis Healthcare",
    "Max Healthcare",
    "Manipal Hospitals",
    "Narayana Health",
  ],

  cashless_instant_limit: 5000,

  fraud_flags: {
    max_claims_same_day: 2,
    high_value_manual_review_threshold: 25000,
    low_confidence_threshold: 0.7,
  },
} as const;

// Doctor registration number regex patterns by state
export const DOCTOR_REG_PATTERNS = [
  /^[A-Z]{1,4}\/\d{3,6}\/\d{4}$/,           // Standard: KA/45678/2015
  /^AYUR\/[A-Z]{2}\/\d{3,6}\/\d{4}$/,        // Ayurveda: AYUR/KL/2345/2019
  /^HOM\/[A-Z]{2}\/\d{3,6}\/\d{4}$/,         // Homeopathy
  /^\d{5,8}$/,                               // Numeric only
];