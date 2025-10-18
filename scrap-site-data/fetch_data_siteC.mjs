import fs from "fs";

const API_URL = process.env.API_URL;
const CSV_FILE = process.env.CSV_FILE;

const COLUMN_A = process.env.COLUMN_A;
const COLUMN_B = process.env.COLUMN_B;
const COLUMN_C = process.env.COLUMN_C;
const COLUMN_D = process.env.COLUMN_D;
const COLUMN_E = process.env.COLUMN_E;
const COLUMN_F = process.env.COLUMN_F;
const COLUMN_G = process.env.COLUMN_G;
const COLUMN_H = process.env.COLUMN_H;

// Ensure CSV file exists and write headers
const columns = [
  COLUMN_A,
  COLUMN_B,
  COLUMN_C,
  COLUMN_D,
  COLUMN_E,
  COLUMN_F,
  COLUMN_G,
  COLUMN_H,
];

fs.writeFileSync(CSV_FILE, "\uFEFF" + columns.join(",") + "\n", { encoding: "utf-8" });

async function fetchProjectdata(projectId) {
  const formData = new FormData();
  formData.append("method", "details");
  formData.append("id", projectId);

  const allIds = await fetch(API_URL, {
    method: "POST",
    body: formData
  });

  const data = await allIds.json();
  const row = [
    data.land,
    data.objectType,
    `${data.land} - ${data.zipCode} ${data.city} (${data.state})`,
    `${data.squareMeters} m2`,
    data.constructionType,
    data.baujahr,
    data.lueftung,
    data.display_id
  ];
  console.log('row', row);
  
  const safeRow = row.map((v) =>
    `"${String(v)
      .replace(/<br\s*\/?>/gi, '\n')  // convert <br> to newline
      .replace(/"/g, '""')            // escape quotes
      .trim()}"`                      // remove extra spaces
  );
  fs.appendFileSync(CSV_FILE, safeRow.join(","), { encoding: "utf-8" });
  fs.appendFileSync(CSV_FILE, "\n", { encoding: "utf-8" });
  console.log(`✅ Saved row for project url: ${projectId}`);
}

async function fetchAllProjects() {
  const formData = new FormData();
  formData.append("method", "shortSearch");

  const allIds = await fetch(API_URL, {
    method: "POST",
    body: formData
  });

  const data = await allIds.json();
  console.log(data);
  return data;
}

const allResults = await fetchAllProjects();
console.log('allResults', allResults);
console.log('allResults', allResults.length);


function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const BATCH_SIZE = 5;
for (let i = 0; i < allResults.length; i += BATCH_SIZE) {
  const batch = allResults.slice(i, i + BATCH_SIZE);

  await Promise.all(
    batch.map(async (projectId) => {

      try {
        await fetchProjectdata(projectId)
      } catch (err) {
        console.error(`❌ Failed processing ${projectId}:`, err.message);
      }
    })
  );

  await delay(1000);
}