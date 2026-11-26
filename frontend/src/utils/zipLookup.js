import api from '../api/axios';

/*
  ZIP code for a typed province + town, from the same data the admission form's
  address picker uses. Returns '' when the town has no single ZIP on record
  (districts of large cities, or a name we cannot match), so callers leave the
  field for the person to fill in.

  Lookups are cached for the page's lifetime: the province list once, and each
  province's ZIP list the first time it is asked for.
*/
let provincesPromise = null;
const zipByProvince = {};

// "City of Tagum", "Tagum City" and "tagum" are the same place.
const norm = s => (s || '').toLowerCase().replace(/\bcity of\b|\bcity\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

export async function lookupZip(province, town) {
  if (!province?.trim() || !town?.trim()) return '';
  provincesPromise ||= api.get('/enrollment/psgc/provinces/').then(r => r.data || []).catch(() => []);
  const provinces = await provincesPromise;
  const p = provinces.find(x => x.name.toLowerCase() === province.trim().toLowerCase());
  if (!p) return '';
  zipByProvince[p.slug] ||= api.get(`/enrollment/psgc/province/${p.slug}/zip/`).then(r => r.data || {}).catch(() => ({}));
  const map = await zipByProvince[p.slug];
  const want = norm(town);
  const hit = Object.keys(map).find(k => norm(k) === want);
  return hit ? map[hit] : '';
}
