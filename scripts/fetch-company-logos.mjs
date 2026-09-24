/**
 * Downloads real company brand marks into public/logos/.
 * Run with: node scripts/fetch-company-logos.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'logos');

/** slug -> the company's primary domain, whose favicon is its official mark */
const COMPANIES = {
  google: 'google.com',
  amazon: 'amazon.com',
  microsoft: 'microsoft.com',
  apple: 'apple.com',
  meta: 'meta.com',
  netflix: 'netflix.com',
  tesla: 'tesla.com',
  uber: 'uber.com',
  airbnb: 'airbnb.com',
  salesforce: 'salesforce.com',
  adobe: 'adobe.com',
  ibm: 'ibm.com',
  oracle: 'oracle.com',
  sap: 'sap.com',
  accenture: 'accenture.com',
  deloitte: 'deloitte.com',
  infosys: 'infosys.com',
  tcs: 'tcs.com',
  wipro: 'wipro.com',
  flipkart: 'flipkart.com',
  cognizant: 'cognizant.com',
  capgemini: 'capgemini.com',
  hcltech: 'hcltech.com',
  techmahindra: 'techmahindra.com',
  nvidia: 'nvidia.com',
  intel: 'intel.com',
  cisco: 'cisco.com',
  paypal: 'paypal.com',
  stripe: 'stripe.com',
  atlassian: 'atlassian.com',
  spotify: 'spotify.com',
  linkedin: 'linkedin.com',
  github: 'github.com',
  x: 'x.com',
  goldmansachs: 'goldmansachs.com',
  jpmorgan: 'jpmorganchase.com',
  swiggy: 'swiggy.com',
  zomato: 'zomato.com',
  paytm: 'paytm.com',
  zoho: 'zoho.com',
  openai: 'openai.com',
};

const sources = (domain) => [
  `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
  `https://icons.duckduckgo.com/ip3/${domain}.ico`,
];

async function download(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Google returns a tiny generic globe when it has nothing for the domain.
  if (buf.length < 300) throw new Error(`suspiciously small (${buf.length}b)`);
  return buf;
}

/** Falls back to the official Simple Icons brand path when no favicon is available. */
async function fromSimpleIcons(slug) {
  const simpleIcons = await import('simple-icons');
  const icon = simpleIcons[`si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`];
  if (!icon) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#${icon.hex}"><title>${icon.title}</title><path d="${icon.path}"/></svg>`;
}

await mkdir(OUT_DIR, { recursive: true });

const manifest = {};
const failed = [];

for (const [slug, domain] of Object.entries(COMPANIES)) {
  let saved = false;

  for (const url of sources(domain)) {
    try {
      const buf = await download(url);
      await writeFile(join(OUT_DIR, `${slug}.png`), buf);
      manifest[slug] = `/logos/${slug}.png`;
      console.log(`✓ ${slug.padEnd(14)} ${buf.length}b  (favicon)`);
      saved = true;
      break;
    } catch {
      /* try next source */
    }
  }

  if (!saved) {
    const svg = await fromSimpleIcons(slug);
    if (svg) {
      await writeFile(join(OUT_DIR, `${slug}.svg`), svg, 'utf8');
      manifest[slug] = `/logos/${slug}.svg`;
      console.log(`✓ ${slug.padEnd(14)} ${svg.length}b  (simple-icons)`);
      saved = true;
    }
  }

  if (!saved) {
    failed.push(slug);
    console.log(`✗ ${slug.padEnd(14)} no source returned a usable mark`);
  }
}

await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`\n${Object.keys(manifest).length}/${Object.keys(COMPANIES).length} logos saved to public/logos`);
if (failed.length) console.log(`Missing: ${failed.join(', ')}`);
