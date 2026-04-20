document.addEventListener('DOMContentLoaded', () => {
  const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  let observer = null;
  const statusEl = document.getElementById('status');
  const clockEl = document.getElementById('clock');
  const gridEl = document.getElementById('planet-grid');

  // Live UTC clock
  setInterval(() => {
    clockEl.textContent = `UTC: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`;
  }, 1000);

  function init() {
    console.log('🔍 Checking astronomy engine...');
    
    // 1. Verify library loaded
    if (typeof window.Astronomy === 'undefined') {
      statusEl.textContent = '❌ Astronomy engine blocked or failed to load. Check network/CDN.';
      console.error('Astronomy global not found. CDN may be blocked.');
      return;
    }

    statusEl.textContent = '📍 Requesting location access...';

    // 2. Geolocation with hard timeout
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
          console.log('📍 Location acquired:', pos.coords);
          startTracker();
        },
        err => {
          clearTimeout(geoTimeout);
          observer = new window.Astronomy.Observer(0, 0, 0);
          statusEl.textContent = `📍 Location: ${err.message || 'Denied'} • Using equator`;
          console.warn('📍 Location error:', err.code, err.message);
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
    console.log('🪐 Starting planetary tracking...');
    updatePlanets();
    setInterval(updatePlanets, 60000);
  }

  function updatePlanets() {
    const now = new Date();
    gridEl.innerHTML = '';

    planets.forEach(name => {
      try {
        const eq = window.Astronomy.Equator(name, now, observer, true, true);
        const hor = window.Astronomy.Horizon(now, observer, eq.ra, eq.dec, 'normal');
        const vec = window.Astronomy.GeoVector(name, now, true);
        const dist = vec.length;

        const card = document.createElement('div');
        card.className = 'planet-card';
        card.innerHTML = `
          <h2>${emoji(name)} ${name}</h2>
          <p><span>RA:</span> ${formatHMS(eq.ra)}</p>
          <p><span>Dec:</span> ${formatDMS(eq.dec)}</p>
          <p><span>Altitude:</span> ${hor.altitude.toFixed(2)}°</p>
          <p><span>Azimuth:</span> ${hor.azimuth.toFixed(2)}°</p>
          <p><span>Distance:</span> ${dist.toFixed(4)} AU</p>
        `;
        gridEl.appendChild(card);
      } catch (err) {
        console.warn(`⚠️ ${name} calculation failed:`, err.message);
        const card = document.createElement('div');
        card.className = 'planet-card';
        card.innerHTML = `<h2>${emoji(name)} ${name}</h2><p style="color:#f87171">Calculation error</p>`;
        gridEl.appendChild(card);
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
