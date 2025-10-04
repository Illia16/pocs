import fs from "fs";
import * as cheerio from "cheerio";

const SITE_URL = process.env.SITE_URL;
const API_URL = process.env.API_URL;
const OUTPUT_FILE_META = process.env.OUTPUT_FILE_META;
const CSV_FILE = process.env.CSV_FILE;

const COLUMN_A = process.env.COLUMN_A;
const COLUMN_B = process.env.COLUMN_B;
const COLUMN_C = process.env.COLUMN_C;
const COLUMN_D = process.env.COLUMN_D;
const COLUMN_E = process.env.COLUMN_E;
const COLUMN_F = process.env.COLUMN_F;
const COLUMN_G = process.env.COLUMN_G;
const COLUMN_H = process.env.COLUMN_H;
const COLUMN_I = process.env.COLUMN_I;
const COLUMN_J = process.env.COLUMN_J;
const COLUMN_K = process.env.COLUMN_K;

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
  COLUMN_I,
  COLUMN_J,
  COLUMN_K,
];

fs.writeFileSync(CSV_FILE, "\uFEFF" + columns.join(",") + "\n", { encoding: "utf-8" });

function decodeHtmlEntities(str) {
  if (!str) return "";
  return str
    .replace(/&sup2;/g, "²")
    .replace(/&sup3;/g, "³")
    .replace(/&deg;/g, "°")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

// Helper function to get value by label
function getValueByLabel(dom, labelText) {
  const li = dom("li").filter((i, el) => dom(el).find(".label").text().trim() === labelText);
  const value = li.find(".value").html()?.trim() || "-"; // use .html() instead of .text() to preserve entities
  return decodeHtmlEntities(value);
}

// Helper function to extract _renderedUrl
function addRenderedUrl(results) {
  return results.map((item) => {
    let match = item.rendered.match(/<a[^>]+href="([^"]+)"/);
    let renderedUrl = match ? SITE_URL + match[1] : null;
    return {
      ...item,
      _renderedUrl: renderedUrl,
    };
  });
}

async function fetchAllProjects() {
  let allResults = [];

  try {
    // First request to get total pages
    const firstResp = await fetch(`${API_URL}?_page=1&_limit=10`);
    const firstData = await firstResp.json();
    const totalPages = firstData.meta.totalPages;
    console.log(`Total pages: ${totalPages}`);

    let processedResults = addRenderedUrl(firstData.results);
    allResults = allResults.concat(processedResults);

    fs.writeFileSync(OUTPUT_FILE_META, JSON.stringify(firstData.meta, null, 2), "utf-8");

    // Fetch all other pages
    for (let page = 2; page <= totalPages; page++) {
      console.log(`Fetching page ${page} of ${totalPages}...`);
      const resp = await fetch(`${API_URL}?_page=${page}&_limit=10`);
      const data = await resp.json();
      let processed = addRenderedUrl(data.results);
      allResults = allResults.concat(processed);
    }

    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    const BATCH_SIZE = 5;
    for (let i = 0; i < allResults.length; i += BATCH_SIZE) {
      const batch = allResults.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (project, idx) => {
          if (!project._renderedUrl) return;

          try {
            const resp = await fetch(project._renderedUrl);
            const html = await resp.text();
            const dom = cheerio.load(html);

            const row = [
              project.title || "",
              getValueByLabel(dom, COLUMN_B),
              getValueByLabel(dom, COLUMN_C),
              getValueByLabel(dom, COLUMN_D),
              getValueByLabel(dom, COLUMN_E),
              getValueByLabel(dom, COLUMN_F),
              getValueByLabel(dom, COLUMN_G),
              getValueByLabel(dom, COLUMN_H),
              getValueByLabel(dom, COLUMN_I),
              getValueByLabel(dom, COLUMN_J),
              getValueByLabel(dom, COLUMN_K),
            ];

            const safeRow = row.map((v) => `"${v.replace(/"/g, '""')}"`);
            fs.appendFileSync(CSV_FILE, safeRow.join(","), { encoding: "utf-8" });
            fs.appendFileSync(CSV_FILE, "\n", { encoding: "utf-8" });

            console.log(`✅ Saved row for project ${i + idx + 1}: ${project.title}`);
          } catch (err) {
            console.error(`❌ Failed processing ${project._renderedUrl}:`, err.message);
          }
        })
      );

      await delay(1000);
    };

    console.log(`🎉 Finished writing CSV: ${CSV_FILE}`);
  } catch (err) {
    console.error("❌ Error fetching data:", err.message);
  }
}

fetchAllProjects();