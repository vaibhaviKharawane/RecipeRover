import fs from 'fs';
import path from 'path';
import { MongoStorage } from '../mongoStorage';
import { connectToDatabase } from '../db';

// Simple token overlap fuzzy match: number of shared tokens / total tokens
function tokenScore(a: string, b: string) {
  const ta = a.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const tb = b.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const setB = new Set(tb);
  const common = ta.filter(t => setB.has(t)).length;
  return common / Math.max(1, Math.max(ta.length, tb.length));
}

// This script expects a CSV file at server/scripts/recipes-with-names.csv
// with a header and a column 'name' that roughly matches recipe names in DB.
// It will fetch a photo via /api/photo semantics (unsplash query by name),
// save the cached image under uploads/cache and set the recipe.image_url via the storage adapter.

async function main() {
  const db = await connectToDatabase();
  const storage = new MongoStorage();

  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const provided = argv.find(a => !a.startsWith('-'));
  const csvPath = provided ? path.resolve(provided) : path.join(__dirname, 'recipes-with-names.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found:', csvPath);
    process.exit(1);
  }

  const data = fs.readFileSync(csvPath, 'utf8');
  const lines = data.split('\n').map(l => l.trim()).filter(Boolean);
  const header = lines.shift();
  const colsHeader = header?.split(',').map(h => h.trim());
  const nameIndex = colsHeader?.findIndex(h => h.toLowerCase() === 'name');
  // find possible image column names
  const imageColCandidates = ['image', 'image_url', 'imageurl', 'image link', 'image_link', 'photo', 'image_src', 'image-src', 'imageurl', 'imageURL', 'imagePath', 'image_path'];
  let imageIndex = -1;
  if (colsHeader) {
    for (const cand of imageColCandidates) {
      const idx = colsHeader.findIndex(h => h.toLowerCase() === cand.toLowerCase());
      if (idx >= 0) { imageIndex = idx; break; }
    }
  }
  if (!header || nameIndex === undefined || nameIndex < 0) {
    console.error('CSV must have a header with a `name` column');
    process.exit(1);
  }

  for (const line of lines) {
  const cols = line.split(',');
  const name = cols[nameIndex].trim();
  const providedImage = (imageIndex >= 0 && cols[imageIndex]) ? cols[imageIndex].trim() : '';
    if (!name) continue;

    // Find best-matching recipe by fuzzy token overlap
    const recipes = await storage.getRecipes();
    let best: any = null;
    let bestScore = 0;
    for (const r of recipes) {
      const s = tokenScore(r.name, name);
      if (s > bestScore) { bestScore = s; best = r; }
    }

    if (!best || bestScore < 0.35) {
      console.log(`No good match for "${name}" (bestScore=${bestScore.toFixed(2)})`);
      continue;
    }

    const match = best;
    console.log(`Matched dataset "${name}" -> DB "${match.name}" (score=${bestScore.toFixed(2)})`);

    // Prepare cache dir
    const cacheDir = path.join(__dirname, '..', '..', 'uploads', 'cache');
    try { fs.mkdirSync(cacheDir, { recursive: true }); } catch (e) {}

    const crypto = await import('crypto');
    const w = '1200';
    const h = '800';

    let imageUrl = '';

    // If dataset provides an image URL, try to download and cache it
    if (providedImage && (providedImage.startsWith('http://') || providedImage.startsWith('https://'))) {
      try {
        const key = crypto.createHash('sha1').update(`${providedImage}|${w}|${h}`).digest('hex');
        const filename = `${key}.jpg`;
        const cachedPath = path.join(cacheDir, filename);
        if (!fs.existsSync(cachedPath)) {
          // @ts-ignore: optional dependency
          const fetchFn: any = (global as any).fetch || (await import('node-fetch')).default;
          const resp = await fetchFn(providedImage);
          if (resp && resp.ok) {
            const ab = await resp.arrayBuffer();
            fs.writeFileSync(cachedPath, Buffer.from(ab));
            console.log('Cached provided image for', name);
          } else {
            console.warn('Failed to download provided image for', name, '- falling back to Unsplash');
          }
        }
        if (fs.existsSync(cachedPath)) {
          imageUrl = `/uploads/cache/${filename}`;
        }
      } catch (err) {
        console.warn('Error downloading provided image for', name, err);
      }
    }

    // If no imageUrl yet, fall back to Unsplash
    if (!imageUrl) {
      const q = name;
      const key = crypto.createHash('sha1').update(`${q}|${w}|${h}`).digest('hex');
      const filename = `${key}.jpg`;
      const cachedPath = path.join(cacheDir, filename);
      if (!fs.existsSync(cachedPath)) {
        try {
          const unsplash = `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(q)}`;
          // @ts-ignore: optional dependency
          const fetchFn: any = (global as any).fetch || (await import('node-fetch')).default;
          const resp = await fetchFn(unsplash);
          if (!resp.ok) {
            console.warn('Failed to fetch for', q);
            continue;
          }
          const ab = await resp.arrayBuffer();
          fs.writeFileSync(cachedPath, Buffer.from(ab));
          console.log('Cached', cachedPath);
        } catch (err) {
          console.warn('Error fetching image for', q, err);
          continue;
        }
      }
      imageUrl = `/uploads/cache/${filename}`;
    }
    if (dryRun) {
      console.log('[dry-run] would set image for', match.name, '->', imageUrl);
    } else {
      await storage.setRecipeImageUrl(match.mongoId, imageUrl);
      console.log('Set image for', match.name, '->', imageUrl);
    }
  }

  console.log('Migration complete');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
