import { fetchPharmacyData } from './pharmacies.js';

const errorAlert = document.getElementById('errorAlert');
const map = L.map('map');

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function showError(message) {
  errorAlert.textContent = message;
  errorAlert.classList.remove('d-none');
}

function renderPharmacyPopup(item, isNearest = false) {
  const badge = isNearest
    ? '<h6 class="m-0"><span class="badge bg-danger mb-2">LA MÁS CERCANA</span></h6>'
    : '';

  return `
    <div class="text-center">
      ${badge}
      <h5 class="m-0${isNearest ? ' mb-2' : ''}"><b>${item.pharmacy.nombre}</b></h5>
      <h6 class="m-0 mb-2">${item.pharmacy.direccion}</h6>
      <h6 class="m-0 mb-2"><i class="bi bi-telephone-fill" style="margin-right:.5rem; color: #505050"></i>${item.pharmacy.telefono}</h6>
      <h6${isNearest ? '' : ' class="m-0"'}> A ${item.distance.toFixed(2)} km</h6>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${item.pharmacy.geo.lat},${item.pharmacy.geo.long}"
        style="color:white"
        target="_blank"
        class="btn btn-primary btn-sm mt-2">
        ¿Cómo ir?
      </a>
    </div>
  `;
}

function setupMapWithPharmacies(pharmacies) {
  const markers = pharmacies.map((pharmacy) => ({
    marker: L.marker([pharmacy.geo.lat, pharmacy.geo.long]).addTo(map),
    pharmacy,
  }));

  map.setView([pharmacies[0].geo.lat, pharmacies[0].geo.long], 10);

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLon = position.coords.longitude;

      L.marker([userLat, userLon], {
        icon: L.divIcon({
          className: 'custom-div-icon',
          html: '<div style="background-color:blue;width:15px;height:15px;border-radius:50%;"></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      }).addTo(map);

      const sortedMarkers = markers
        .map(({ marker, pharmacy }) => ({
          marker,
          pharmacy,
          distance: calculateDistance(
            userLat,
            userLon,
            parseFloat(pharmacy.geo.lat),
            parseFloat(pharmacy.geo.long),
          ),
        }))
        .sort((a, b) => a.distance - b.distance);

      sortedMarkers.forEach((item) => {
        item.marker.bindPopup(renderPharmacyPopup(item));
      });

      const nearestPharmacy = sortedMarkers[0];
      if (nearestPharmacy) {
        nearestPharmacy.marker.bindPopup(renderPharmacyPopup(nearestPharmacy, true));
        nearestPharmacy.marker.openPopup();
      }

      document.getElementById('pharmacyListBody').innerHTML = sortedMarkers.map((item, index) => `
        <div class="card mb-2 ${index === 0 ? 'border-primary' : ''}">
          <div class="card-body position-relative">
            <h5 class="card-title">
              ${item.pharmacy.nombre}
              ${index === 0 ? '<span class="badge bg-danger" style="font-size:.8rem">LA MÁS CERCANA</span>' : ''}
            </h5>
            <p class="card-text"><b>${item.pharmacy.direccion}</b></p>
            <p class="card-text">
              <i class="bi bi-telephone-fill" style="margin-right:.5rem"></i>${item.pharmacy.telefono}<br>
              A ${item.distance.toFixed(2)} km
            </p>
            <a style="width:100%" href="https://www.google.com/maps/dir/?api=1&destination=${item.pharmacy.geo.lat},${item.pharmacy.geo.long}"
              target="_blank"
              class="btn btn-primary btn-sm text-white">
              ¿Cómo ir?
            </a>
          </div>
        </div>
      `).join('');

      document.getElementById('tableBody').innerHTML = sortedMarkers.map((item, index) => `
        <tr>
          <td>${item.pharmacy.nombre} ${index === 0 ? '<span class="badge bg-danger">LA MÁS CERCANA</span>' : ''}</td>
          <td>${item.pharmacy.direccion}</td>
          <td>${item.pharmacy.telefono}</td>
          <td>${item.pharmacy.zona}</td>
          <td>${item.distance.toFixed(2)} km</td>
          <td>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${item.pharmacy.geo.lat},${item.pharmacy.geo.long}" class="btn btn-primary">¿Cómo ir?</a>
          </td>
        </tr>
      `).join('');

      const group = new L.featureGroup([nearestPharmacy.marker]);
      map.fitBounds(group.getBounds(), { padding: [150, 150], maxZoom: 15 });
    },
    (error) => {
      console.error('Error getting location', error);
      map.setView([pharmacies[0].geo.lat, pharmacies[0].geo.long], 10);
    },
  );
}

function setupViewToggle() {
  document.getElementById('mapViewBtn').addEventListener('click', () => {
    document.getElementById('mapContainer').classList.remove('d-none');
    document.getElementById('listContainerDesktop').classList.add('d-none');
    document.getElementById('listContainerMobile').classList.add('d-none');
    document.getElementById('mapViewBtn').classList.add('active', 'btn-primary');
    document.getElementById('mapViewBtn').classList.remove('btn-outline-primary');
    document.getElementById('listViewBtn').classList.remove('active', 'btn-primary');
    document.getElementById('listViewBtn').classList.add('btn-outline-primary');
  });

  document.getElementById('listViewBtn').addEventListener('click', () => {
    document.getElementById('mapContainer').classList.add('d-none');
    document.getElementById('listContainerDesktop').classList.remove('d-none');
    document.getElementById('listContainerMobile').classList.remove('d-none');
    document.getElementById('mapViewBtn').classList.remove('active', 'btn-primary');
    document.getElementById('mapViewBtn').classList.add('btn-outline-primary');
    document.getElementById('listViewBtn').classList.add('active', 'btn-primary');
    document.getElementById('listViewBtn').classList.remove('btn-outline-primary');
  });
}

function setupInstallPrompt() {
  let deferredPrompt;
  const installButton = document.getElementById('buttonInstall');

  window.addEventListener('beforeinstallprompt', (e) => {
    deferredPrompt = e;
    installButton.style.opacity = 1;
    installButton.style.cursor = 'pointer';
    installButton.removeAttribute('disabled');
  });

  async function triggerInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.style.opacity = 0.5;
    installButton.style.cursor = 'not-allowed';
    installButton.setAttribute('disabled', 'true');
  }

  window.addEventListener('appinstalled', () => {
    console.log('App installed successfully');
  });

  if (window.matchMedia('(display-mode: standalone)').matches) {
    installButton.style.opacity = 0.5;
    installButton.style.cursor = 'not-allowed';
    installButton.setAttribute('disabled', 'true');
  }

  installButton.addEventListener('click', triggerInstall);
}

async function init() {
  setupViewToggle();
  setupInstallPrompt();

  const pharmacies = await fetchPharmacyData();
  if (!pharmacies.length) {
    showError('No se pudieron cargar las farmacias de turno. Intentá de nuevo más tarde.');
    return;
  }

  setupMapWithPharmacies(pharmacies);
}

init();
