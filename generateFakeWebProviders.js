import fs from "fs";

const OUTPUT_FILE = "data/fake_web_providers.jsonl";
fs.mkdirSync("data", { recursive: true });

// ---- controlled vocabularies ----

const FIRST_NAMES = [
  "Ethan",
  "Sophia",
  "Ava",
  "Liam",
  "Noah",
  "Isabella",
  "Lucas",
  "Mia",
  "Daniel",
  "Olivia",
  "Michael",
  "Emma",
  "James",
  "Amelia",
  "Benjamin",
  "Charlotte",
  "Elijah",
  "Harper",
  "Henry",
  "Evelyn",
];

const LAST_NAMES = [
  "Patel",
  "Nguyen",
  "Garcia",
  "Martinez",
  "Kim",
  "Shah",
  "Rossi",
  "Bianchi",
  "OConnor",
  "Hassan",
  "Lee",
  "Doyle",
  "Klein",
  "Fischer",
  "Alvarez",
  "Santos",
  "Rahman",
  "Chen",
  "Kapoor",
  "Brooks",
];

const SPECIALTIES = [
  "Dermatology",
  "Cardiology",
  "Family Medicine",
  "Internal Medicine",
  "Endocrinology",
  "Orthopedics",
  "Neurology",
  "Psychiatry",
  "Pulmonology",
  "Gastroenterology",
];

const LANGUAGES = [
  "English",
  "Spanish",
  "French",
  "Portuguese",
  "Mandarin",
  "Hindi",
  "Arabic",
  "Italian",
  "Vietnamese",
];

const INSURANCE = [
  "UnitedHealthcare",
  "Blue Cross Blue Shield",
  "Aetna",
  "Cigna",
  "Tufts Health Plan",
  "Harvard Pilgrim Health Care",
  "MassHealth",
  "Medicare",
];

const CITIES = [
  "Boston",
  "Cambridge",
  "Somerville",
  "Newton",
  "Medford",
  "Quincy",
  "Malden",
  "Watertown",
  "Revere",
  "Brookline",
];

const SOURCES = [
  "healthgrades.com",
  "zocdoc.com",
  "vitals.com",
  "hospital-site.org",
  "clinic-directory.net",
];

// ---- helpers ----

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randSubset(arr, min = 1, max = 3) {
  const size = Math.floor(Math.random() * (max - min + 1)) + min;
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, size);
}

// ---- generation ----

const TOTAL_PROVIDERS = 300;
const rows = [];

for (let i = 0; i < TOTAL_PROVIDERS; i++) {
  const provider = {
    provider_name: `${rand(FIRST_NAMES)} ${rand(LAST_NAMES)}`,
    specialties: randSubset(SPECIALTIES, 1, 2),
    location: {
      city: rand(CITIES),
      state: "MA",
    },
    languages: randSubset(LANGUAGES, 1, 2),
    insurance_accepted: randSubset(INSURANCE, 1, 3),
    accepting_new_patients: Math.random() < 0.7,
    telehealth_available: Math.random() < 0.6,
    source: rand(SOURCES),
  };

  rows.push(JSON.stringify(provider));
}

// ---- write JSONL ----

fs.writeFileSync(OUTPUT_FILE, rows.join("\n"), "utf-8");

console.log(`Generated ${TOTAL_PROVIDERS} fake web providers → ${OUTPUT_FILE}`);
