const PHARMACY_SOURCE_URL = 'https://www.colfarmalp.org.ar/turnos-la-plata/';
const PHARMACY_CACHE_KEY = 'deturno-pharmacies';

const DEFAULT_GEO = { lat: '-34.920494', long: '-57.953568' };

function getEndOfDayTimestamp() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

function readPharmacyCache({ allowExpired = false } = {}) {
  try {
    const raw = localStorage.getItem(PHARMACY_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const { expiresAt, pharmacies } = JSON.parse(raw);
    if (!Array.isArray(pharmacies) || !pharmacies.length) {
      return null;
    }

    if (!allowExpired && Date.now() > expiresAt) {
      return null;
    }

    return pharmacies;
  } catch (_) {
    localStorage.removeItem(PHARMACY_CACHE_KEY);
    return null;
  }
}

function isValidPharmacyHtml(html) {
  return html.includes('class="turnos"') || html.includes("class='turnos'");
}

function writePharmacyCache(pharmacies) {
  try {
    localStorage.setItem(PHARMACY_CACHE_KEY, JSON.stringify({
      expiresAt: getEndOfDayTimestamp(),
      pharmacies,
    }));
  } catch (error) {
    console.warn('Unable to cache pharmacy data:', error);
  }
}

function cleanCellText(text, label) {
  return text.replace(/\n/g, '').replace(/\t/g, '').replace(label, '').trim();
}

function titleCase(str) {
  return str.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function assertValidPharmacyHtml(html, source) {
  if (!isValidPharmacyHtml(html)) {
    throw new Error(`${source}: response is not a pharmacy page`);
  }
  return html;
}

async function fetchHtml(url) {
  const attempts = [
    async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`direct: ${response.status}`);
      return assertValidPharmacyHtml(await response.text(), 'direct');
    },
    async () => {
      const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error(`allorigins raw: ${response.status}`);
      return assertValidPharmacyHtml(await response.text(), 'allorigins raw');
    },
    async () => {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error(`allorigins get: ${response.status}`);
      const data = await response.json();
      if (!data.contents) throw new Error('allorigins get: empty contents');
      return assertValidPharmacyHtml(data.contents, 'allorigins get');
    },
    async () => {
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
      if (!response.ok) throw new Error(`corsproxy: ${response.status}`);
      return assertValidPharmacyHtml(await response.text(), 'corsproxy');
    },
  ];

  let lastError;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to fetch pharmacy data');
}

function parsePharmacyRow(row) {
  const cells = row.querySelectorAll('.td');
  if (cells.length < 5) {
    return null;
  }

  const data = {
    nombre: titleCase(cleanCellText(cells[0].textContent, 'Farmacia')),
    direccion: cleanCellText(cells[1].textContent, 'Dirección'),
    zona: cleanCellText(cells[2].textContent, 'Zona'),
    telefono: cleanCellText(cells[3].textContent, 'Teléfono'),
    geo: { lat: '', long: '' },
    osde: {},
  };

  const geoLink = cells[4].querySelector('a');
  if (geoLink) {
    const match = geoLink.href.match(/destination=([^,&]+),([^&]+)/);
    if (match) {
      const lat = match[1];
      const long = match[2];
      if (lat === '0' && long === '0') {
        data.geo = { ...DEFAULT_GEO };
      } else {
        data.geo.lat = lat;
        data.geo.long = long;
      }
    }
  }

  return data;
}

async function fetchPharmacyDataFromSource() {
  const html = await fetchHtml(PHARMACY_SOURCE_URL);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const turnos = doc.querySelector('.turnos');

  if (!turnos) {
    throw new Error('No pharmacy list found in the response.');
  }

  const rows = turnos.querySelectorAll(':scope > .tr');
  const pharmacies = [];

  for (const row of rows) {
    const pharmacy = parsePharmacyRow(row);
    if (pharmacy) {
      pharmacies.push(pharmacy);
    }
  }

  return pharmacies;
}

export async function fetchPharmacyData() {
  const cached = readPharmacyCache();
  if (cached) {
    return cached;
  }

  try {
    const pharmacies = await fetchPharmacyDataFromSource();
    if (pharmacies.length) {
      writePharmacyCache(pharmacies);
    }
    return pharmacies;
  } catch (error) {
    console.error('Error fetching or processing data:', error);
    const stale = readPharmacyCache({ allowExpired: true });
    if (stale) {
      console.warn('Using expired pharmacy cache after fetch failure');
      return stale;
    }
    return [];
  }
}
