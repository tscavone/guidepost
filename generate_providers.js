import fs from "fs";

const WEB_FILE = "data/fake_web_providers.jsonl";
const OUTPUT_FILE = "data/providers.jsonl";

const webProviders = fs
  .readFileSync(WEB_FILE, "utf-8")
  .split("\n")
  .filter(Boolean)
  .map(JSON.parse);

// ---- pick a small, diverse subset ----

// naive but effective: shuffle + slice
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

const SELECT_COUNT = 12;
const selected = shuffle(webProviders).slice(0, SELECT_COUNT);

// map into the slimmer "customer provider" shape
const customers = selected.map((p, idx) => ({
  provider_id: `cust_${String(idx + 1).padStart(3, "0")}`,
  provider_name: p.provider_name,
  attributes: {
    location: p.location,
    specialties: p.specialties,
    languages: p.languages,
    insurance_accepted: p.insurance_accepted,
    accepting_new_patients: p.accepting_new_patients,
    telehealth_available: p.telehealth_available,
  },
}));

fs.writeFileSync(
  OUTPUT_FILE,
  customers.map((c) => JSON.stringify(c)).join("\n"),
  "utf-8"
);

console.log(
  `Extracted ${customers.length} customer providers → ${OUTPUT_FILE}`
);
