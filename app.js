document.addEventListener('DOMContentLoaded', () => {
  const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  let observer = null;
  const statusEl = document.getElementById('status');
  const clockEl = document.getElementById('clock');
  const gridEl = document.getElementById('planet-grid');

  setInterval(() => {
    clockEl.textContent = `UTC: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`;
  }, 1000);

  function init() {
    if (typeof window.Astronomy === 'undefined') {
      statusEl.textContent = '❌ Astronomy engine blocked or failed to load.';
      return;
    }
    statusEl.textContent = '📍 Requesting location...';

    const geoTimeout = setTimeout(() => {
      observer = new window.Astronomy.Observer(0, 0, 0);
      statusEl.textContent = '⏱️ Location timed out • Using equator (0,0)';
      startTracker();
    }, 5000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          clearTimeout(geoTimeout);
          observer = new window.Astronomy.Observer(pos.coords.latitude, pos.coords.longitude, 0);
          statusEl.textContent = '📍 Tracking from your location • Updates every 60s';
          startTracker();
        },
        err => {
          clearTimeout(geoTimeout);
          observer = new window.Astronomy.Observer(0, 0, 0);
          statusEl.textContent = `📍 Location: ${err.message || 'Denied'} • Using equator`;
          startTracker();
        },
        { timeout: 4000, enableHighAccuracy: false }
      );
    } else {
      clearTimeout(geoTimeout);
      observer = new window.Astronomy.Observer(0, 0, 0);
      statusEl.textContent = '📍 Geolocation unsupported • Using equator';
      startTracker();
    }
  }

  function startTracker() {
    updatePlanets();
    setInterval(updatePlanets, 60000);
  }

  let debugLogged = false;
  function updatePlanets() {
    const now = new Date();
    gridEl.innerHTML = '';

    planets.forEach((name, i) => {
      try {
        const eq = window.Astronomy.Equator(name, now, observer, true, true);
        const hor = window.Astronomy.Horizon(now, observer, eq?.ra ?? 0, eq?.dec ?? 0, 'normal');
        const vec = window.Astronomy.GeoVector(name, now, true);

        // 🔍 One-time debug dump
        if (i === 0 && !debugLogged) {
          console.log('📦 Library Output Debug:', { eq, hor, vec });
          debugLogged = true;
        }

        // Safe extraction (handles v2 naming quirks)
        const ra = eq?.ra ?? 0;
        const dec = eq?.dec ?? 0;
        const alt = hor?.altitude ?? hor?.alt ?? 0;
        const az = hor?.azimuth ?? hor?.az ?? 0;
        const dist = Math.hypot(vec?.x ?? 0, vec?.y ?? 0, vec?.z ?? 0);

        const card = document.createElement('div');
        card.className = 'planet-card';
        card.innerHTML = `
          <h2>${emoji(name)} ${name}</h2>
          <p><span>RA:</span> ${formatHMS(ra)}</p>
          <p><span>Dec:</span> ${formatDMS(dec)}</p>
          <p><span>Altitude:</span> ${Number(alt).toFixed(2)}°</p>
          <p><span>Azimuth:</span> ${Number(az).toFixed(2)}°</p>
          <p><span>Distance:</span> ${dist.toFixed(4)} AU</p>
        `;
        gridEl.appendChild(card);
      } catch (err) {
        console.warn(`⚠️ ${name} failed:`, err.message);
        gridEl.innerHTML += `<div class="planet-card"><h2>${emoji(name)} ${name}</h2><p style="color:#f87171">Error: ${err.message}</p></div>`;
      }
    });
  }

  function formatHMS(hours) {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = ((hours - h) * 3600) % 60;
    return `${h}h ${m}m ${s.toFixed(1)}s`;
  }

  function formatDMS(deg) {
    const sign = deg < 0 ? '-' : '+';
    const abs = Math.abs(deg);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d) * 3600) % 60;
    return `${sign}${d}° ${m}' ${s.toFixed(1)}"`;
  }

  function emoji(name) {
    const map = { Mercury: '☿️', Venus: '♀️', Mars: '♂️', Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆' };
    return map[name] || '🪐';
  }

  init();
});
