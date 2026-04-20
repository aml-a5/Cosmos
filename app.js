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
          statusEl.textContent = '✅ Live Tracking with Moon & Transit Times';
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
    updateMoon();
    updatePlanets();
    setInterval(() => {
      updateMoon();
      updatePlanets();
    }, 60000);
  }

  // 🌙 Moon Phase & Position (FIXED)
  function updateMoon() {
    const now = new Date();
    try {
      const phase = window.Astronomy.MoonPhase(now);
      const illumination = window.Astronomy.Illumination('Moon', now).phase_fraction;
      const eq = window.Astronomy.Equator('Moon', now, observer, true, true);
      const hor = window.Astronomy.Horizon(now, observer, eq.ra, eq.dec, 'normal');
      const vec = window.Astronomy.GeoVector('Moon', now, true);
      const dist = Math.hypot(vec.x, vec.y, vec.z);

      const phaseAngle = window.Astronomy.MoonPhase(now);
      const moonAge = (phaseAngle / 360) * 29.53;
      const phaseName = getMoonPhaseName(phaseAngle);

      // 🔧 FIXED: Safer transit calculation
      let transitHTML = '';
      try {
        const transit = window.Astronomy.SearchHourAngle('Moon', observer, now, 0);
        if (transit && transit.time && isFinite(transit.time)) {
          const transitTime = new Date(transit.time);
          transitHTML = `<div class="transit-info"><span class="best-time">🌟 Best viewing: ${formatTime(transitTime)}</span></div>`;
        }
      } catch (e) {
        // Silently fail - transit not available
        console.log('Moon transit not available');
      }

      const moonCard = document.createElement('div');
      moonCard.className = 'planet-card moon-card';
      moonCard.innerHTML = `
        <h2>🌙 Moon ${phaseName}</h2>
        <p><span>Phase:</span> ${phaseAngle.toFixed(1)}°</p>
        <p><span>Illumination:</span> ${(illumination * 100).toFixed(1)}%</p>
        <p><span>Age:</span> ${moonAge.toFixed(1)} days</p>
        <p><span>Altitude:</span> ${hor.altitude.toFixed(2)}°</p>
        <p><span>Azimuth:</span> ${hor.azimuth.toFixed(2)}°</p>
        <p><span>Distance:</span> ${dist.toFixed(4)} AU</p>
        ${transitHTML}
      `;
      
      if (gridEl.firstChild) {
        gridEl.insertBefore(moonCard, gridEl.firstChild);
      } else {
        gridEl.appendChild(moonCard);
      }
    } catch (err) {
      console.error('❌ Moon Error:', err);
    }
  }

  function getMoonPhaseName(angle) {
    if (angle < 10 || angle > 350) return '(New)';
    if (angle < 80) return '(Waxing Crescent)';
    if (angle < 100) return '(First Quarter)';
    if (angle < 170) return '(Waxing Gibbous)';
    if (angle < 190) return '(Full)';
    if (angle < 260) return '(Waning Gibbous)';
    if (angle < 280) return '(Last Quarter)';
    return '(Waning Crescent)';
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  }

  // 🪐 Planets with Transit Times (FIXED)
  function updatePlanets() {
    const now = new Date();
    
    const moonCard = gridEl.querySelector('.moon-card');
    gridEl.innerHTML = '';
    if (moonCard) gridEl.appendChild(moonCard);

    planets.forEach(name => {
      try {
        const eq = window.Astronomy.Equator(name, now, observer, true, true);
        const hor = window.Astronomy.Horizon(now, observer, eq.ra, eq.dec, 'normal');
        const vec = window.Astronomy.GeoVector(name, now, true);
        const dist = Math.hypot(vec.x, vec.y, vec.z);

        // 🔧 FIXED: Safer transit calculation
        let transitInfo = '';
        try {
          const transit = window.Astronomy.SearchHourAngle(name, observer, now, 0);
          if (transit && transit.time && isFinite(transit.time)) {
            const transitTime = new Date(transit.time);
            const hoursUntilTransit = (transitTime - now) / (1000 * 60 * 60);
            
            if (hor.altitude > 0) {
              if (hoursUntilTransit > -2 && hoursUntilTransit < 2) {
                transitInfo = `<div class="transit-info"><span class="best-time">🌟 Transiting now!</span></div>`;
              } else if (hoursUntilTransit > 0 && hoursUntilTransit < 12) {
                transitInfo = `<div class="transit-info"><span class="best-time">🌟 Best viewing: ${formatTime(transitTime)}</span></div>`;
              } else {
                transitInfo = `<div class="transit-info"><span>Next transit: ${formatTime(transitTime)}</span></div>`;
              }
            } else {
              transitInfo = `<div class="transit-info"><span class="not-visible">🌑 Below horizon</span></div>`;
            }
          }
        } catch (e) {
          // Transit calculation failed - just show planet data
          transitInfo = '';
        }

        const card = document.createElement('div');
        card.className = 'planet-card';
        card.innerHTML = `
          <h2>${getEmoji(name)} ${name}</h2>
          <p><span>RA:</span> ${formatHMS(eq.ra)}</p>
          <p><span>Dec:</span> ${formatDMS(eq.dec)}</p>
          <p><span>Altitude:</span> ${hor.altitude.toFixed(2)}°</p>
          <p><span>Azimuth:</span> ${hor.azimuth.toFixed(2)}°</p>
          <p><span>Distance:</span> ${dist.toFixed(4)} AU</p>
          ${transitInfo}
        `;
        gridEl.appendChild(card);

      } catch (err) {
        console.error(`❌ ${name} Error:`, err);
      }
    });
  }

  function formatHMS(h) {
    const hours = Math.floor(h);
    const mins = Math.floor((h - hours) * 60);
    const secs = ((h - hours) * 3600) % 60;
    return `${hours}h ${mins}m ${secs.toFixed(1)}s`;
  }

  function formatDMS(d) {
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
