const PHARMACIES_URL = './pharmacies.json';

export async function fetchPharmacyData() {
  try {
    const response = await fetch(PHARMACIES_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const pharmacies = data.pharmacies ?? data;

    if (!Array.isArray(pharmacies) || !pharmacies.length) {
      throw new Error('Empty pharmacy list in pharmacies.json');
    }

    return pharmacies;
  } catch (error) {
    console.error('Error loading pharmacies:', error);
    return [];
  }
}
