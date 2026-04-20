document.addEventListener('DOMContentLoaded', () => {
  const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  let observer = null;
  const statusEl = document.getElementById('status');
  const clockEl = document.getElementById('clock');
  const gridEl = document.getElementById('planet-grid');

  // Clock
  setInterval(() => {
    clockEl.textContent = `UTC: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`;
  }, 1000);

  function init() {
    if (typeof window.Astronomy === 'undefined') {
      statusEl.textContent = '❌ Library failed to load.';
      return;
    }
    
    statusEl.textContent = '📍 Getting location...';

    const geoTimeout = setTimeout(() => {
      observer = new window.Astronomy.Observer(0, 0, 0);
      statusEl.textContent = '⏱️ Timeout • Using Equator';
      startTracker();
    }, 5000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          clearTimeout(geoTimeout);
          observer = new window.Astronomy.Observer(pos.coords.latitude, pos.coords.longitude, 0);
          statusEl.textContent = '✅ Live Tracking (v2.0)';
          startTracker();
        },
        err => {
          clearTimeout(geoTimeout);
          observer = new window.Astronomy.Observer(0, 0, 0);
          statusEl.textContent = '❌ Location Denied • Using Equator';
          startTracker();
        },
        { timeout: 4000 }
      );
    } else {
      clearTimeout(geoTimeout);
      observer = new window.Astronomy.Observer(0, 0, 0);
      statusEl.textContent = '⚠️ No Geo • Using Equator';
      startTracker();
    }
  }

  function startTracker() {
    updatePlanets();
    setInterval(updatePlanets, 60000);
  }

  function updatePlanets() {
    const now = new Date();
    gridEl.innerHTML = '';

    planets.forEach(name => {
      try {
        // 1. Get Equator coords
        const eq = window.Astronomy.Equator(name, now, observer, true, true);
        
        // 2. Get Horizon coords
        // We pass 0 if eq is null to prevent crash
        const ra = eq ? eq.ra : 0;
        const dec = eq ? eq.dec : 0;
        const hor = window.Astronomy.Horizon(now, observer, ra, dec, 'normal');

        // 3. Get Distance
        const vec = window.Astronomy.GeoVector(name, now, true);
        const dist = vec ? Math.hypot(vec.x, vec.y, vec.z) : 0;

        // 4. SAFE Formatting (The Fix)
        // We ensure everything is a number before calling toFixed
        const altVal = (hor && typeof hor.altitude === 'number') ? hor.altitude : 0;
        const azVal = (hor && typeof hor.azimuth === 'number') ? hor.azimuth : 0;
        
        // Debug log for the first planet only
        if (name === 'Mercury') {
          console.log('🔍 Raw Data Check:', { eq, hor, vec, altVal, azVal });
        }

        const card = document.createElement('div');
        card.className = 'planet-card';
        card.innerHTML = `
          <h2>${getEmoji(name)} ${name}</h2>
          <p><span>RA:</span> ${formatHMS(ra)}</p>
          <p><span>Dec:</span> ${formatDMS(dec)}</p>
          <p><span>Altitude:</span> ${altVal.toFixed(2)}°</p>
          <p><span>Azimuth:</span> ${azVal.toFixed(2)}°</p>
          <p><span>Distance:</span> ${dist.toFixed(4)} AU</p>
        `;
        gridEl.appendChild(card);

      } catch (err) {
        console.error(`❌ ${name} Error:`, err);
        gridEl.innerHTML += `<div class="planet-card"><h2>${getEmoji(name)} ${name}</h2><p style="color:red">Error</p></div>`;
      }
    });
  }

  function formatHMS(h) {
    if (typeof h !== 'number') return '0h 0m 0s';
    const hours = Math.floor(h);
    const mins = Math.floor((h - hours) * 60);
    const secs = ((h - hours) * 3600) % 60;
    return `${hours}h ${mins}m ${secs.toFixed(1)}s`;
  }

  function formatDMS(d) {
    if (typeof d !== 'number') return '0° 0\' 0"';
    const sign = d < 0 ? '-' : '+';
    const abs = Math.abs(d);
    const deg = Math.floor(abs);
    const min = Math.floor((abs - deg) * 60);
    const sec = ((abs - deg) * 3600) % 60;
    return `${sign}${deg}° ${min}' ${sec.toFixed(1)}"`;
  }

  function getEmoji(name) {
    const map = { Mercury: '☿️', Venus: '♀️', Mars: '♂️', Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆' };
    return map[name] || '🪐';
  }

  init();
});
