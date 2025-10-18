import fs from "fs";
import * as cheerio from "cheerio";

const SITE_URL = process.env.SITE_URL;
const CSV_FILE = process.env.CSV_FILE;

const COLUMN_A = process.env.COLUMN_A;
const COLUMN_B = process.env.COLUMN_B;
const COLUMN_C = process.env.COLUMN_C;
const COLUMN_D = process.env.COLUMN_D;
const COLUMN_E = process.env.COLUMN_E;
const COLUMN_F = process.env.COLUMN_F;
const COLUMN_G = process.env.COLUMN_G;

// Ensure CSV file exists and write headers
const columns = [
  COLUMN_A,
  COLUMN_B,
  COLUMN_C,
  COLUMN_D,
  COLUMN_E,
  COLUMN_F,
  COLUMN_G,
];

fs.writeFileSync(CSV_FILE, "\uFEFF" + columns.join(",") + "\n", { encoding: "utf-8" });

// Helper function to get value by label
function getValueByLabel(dom, labelText) {
  const value = dom(`td strong:contains(${labelText})`).parent().next("td").text().trim() || "-";
  return value;
}

async function fetchProjectdata(url) {
    const resp = await fetch(url);
    const html = await resp.text();
    const dom = cheerio.load(html);
    const title = dom("h1.entry-title").text();

    const row = [
      title,
      getValueByLabel(dom, COLUMN_B),
      getValueByLabel(dom, COLUMN_C),
      getValueByLabel(dom, COLUMN_D),
      getValueByLabel(dom, COLUMN_E),
      getValueByLabel(dom, COLUMN_F),
      getValueByLabel(dom, COLUMN_G),
    ];

    const safeRow = row.map((v) => `"${v.replace(/"/g, '""')}"`);
    fs.appendFileSync(CSV_FILE, safeRow.join(","), { encoding: "utf-8" });
    fs.appendFileSync(CSV_FILE, "\n", { encoding: "utf-8" });
    console.log(`✅ Saved row for project url: ${url}`);
}

async function fetchAllProjects(startUrl) {
  let currentUrl = startUrl;
  const allUrls = new Set();

  while (currentUrl) {
    console.log("Fetching:", currentUrl);
    const resp = await fetch(currentUrl);
    const html = await resp.text();
    const $ = cheerio.load(html);

    // Extract project URLs on this page
    $("article a.button").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        // Handle relative URLs
        const fullUrl = href.startsWith("http") ? href : new URL(href, currentUrl).href;
        allUrls.add(fullUrl);
      }
    });

    // Find the next page link
    const nextHref = $("a")
      .filter((_, el) => $(el).text().trim().toLowerCase().includes("next"))
      .attr("href");

    // Build next page’s absolute URL or end loop if not found
    if (nextHref) {
      currentUrl = nextHref.startsWith("http") ? nextHref : new URL(nextHref, currentUrl).href;
    } else {
      currentUrl = null; // end of pagination
    }
  }

  return Array.from(allUrls);
}

const allResults = await fetchAllProjects(SITE_URL);

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const BATCH_SIZE = 5;
for (let i = 0; i < allResults.length; i += BATCH_SIZE) {
  const batch = allResults.slice(i, i + BATCH_SIZE);

  await Promise.all(
    batch.map(async (project, idx) => {

      try {
        await fetchProjectdata(project)
      } catch (err) {
        console.error(`❌ Failed processing ${project._renderedUrl}:`, err.message);
      }
    })
  );

  await delay(1000);
}