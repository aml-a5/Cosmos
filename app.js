document.addEventListener('DOMContentLoaded', () => {
  const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  let observer = null;
  const statusEl = document.getElementById('status');
  const clockEl = document.getElementById('clock');
  const gridEl = document.getElementById('planet-grid');

  // Live clock
  setInterval(() => {
    clockEl.textContent = `UTC: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`;
  }, 1000);

  function init() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          observer = new Astronomy.Observer(pos.coords.latitude, pos.coords.longitude, 0);
          statusEl.textContent = '📍 Tracking from your location • Updates every 60s';
          startTracker();
        },
        () => {
          observer = new Astronomy.Observer(0, 0, 0);
          statusEl.textContent = '📍 Location denied • Using equator default • Updates every 60s';
          startTracker();
        }
      );
    } else {
      observer = new Astronomy.Observer(0, 0, 0);
      statusEl.textContent = '📍 Geolocation unsupported • Using equator default';
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
        const eq = Astronomy.Equator(name, now, observer, true, true);
        const hor = Astronomy.Horizon(now, observer, eq.ra, eq.dec, 'normal');
        const vec = Astronomy.GeoVector(name, now, true);
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
        console.warn(`Skipping ${name}:`, err.message);
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
