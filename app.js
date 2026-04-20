document.addEventListener('DOMContentLoaded', () => {
  const planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
  let observer = null;
  const statusEl = document.getElementById('status');
  const clockEl = document.getElementById('clock');
  const gridEl = document.getElementById('planet-grid');
  const themeToggle = document.getElementById('themeToggle');

  // 🌞 Theme Toggle
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.textContent = '🌞';
  }

  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    themeToggle.textContent = isLight ? '🌞' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });

  // ✨ Create Flying Stars
  function createShootingStars() {
    const container = document.getElementById('shootingStars');
    for (let i = 0; i < 3; i++) {
      const star = document.createElement('div');
      star.className = 'shooting-star';
      star.style.top = Math.random() * 50 + '%';
      star.style.animationDelay = Math.random() * 3 + 's';
      star.style.animationDuration = (Math.random() * 2 + 2) + 's';
      container.appendChild(star);
    }
  }
  createShootingStars();

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
          statusEl.textContent = '✅ Live Tracking with Rise/Set Times';
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

  // 🌙 Moon Phase & Position
  function updateMoon() {
    const now = new Date();
    try {
      const phaseAngle = window.Astronomy.MoonPhase(now);
      const illum = window.Astronomy.Illumination('Moon', now);
      const eq = window.Astronomy.Equator('Moon', now, observer, true, true);
      const hor = window.Astronomy.Horizon(now, observer, eq.ra, eq.dec, 'normal');
      const vec = window.Astronomy.GeoVector('Moon', now, true);
      const dist = Math.hypot(vec.x, vec.y, vec.z);

      const moonAge = (phaseAngle / 360) * 29.53;
      const phaseName = getMoonPhaseName(phaseAngle);
      const illumination = illum ? (illum.phase_fraction * 100) : 0;

      const moonCard = document.createElement('div');
      moonCard.className = 'planet-card moon-card';
      moonCard.innerHTML = `
        <h2>🌙 Moon ${phaseName}</h2>
        <p><span>Phase:</span> ${phaseAngle.toFixed(1)}°</p>
        <p><span>Illumination:</span> ${illumination.toFixed(1)}%</p>
        <p><span>Age:</span> ${moonAge.toFixed(1)} days</p>
        <p><span>Altitude:</span> ${hor.altitude.toFixed(2)}°</p>
        <p><span>Azimuth:</span> ${hor.azimuth.toFixed(2)}°</p>
        <p><span>Distance:</span> ${dist.toFixed(4)} AU</p>
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

  // 🌅 Calculate Rise/Set Times
  function getRiseSetTimes(name, now) {
    try {
      // Search for rise time (altitude = -0.833° for atmospheric refraction)
      const rise = window.Astronomy.SearchRiseSet(name, observer, now, -0.833, 1);
      const set = window.Astronomy.SearchRiseSet(name, observer, now, -0.833, -1);
      
      let riseTime = null;
      let setTime = null;
      
      if (rise && rise.time && isFinite(rise.time)) {
        riseTime = new Date(rise.time);
      }
      if (set && set.time && isFinite(set.time)) {
        setTime = new Date(set.time);
      }
      
      return { riseTime, setTime };
    } catch (e) {
      return { riseTime: null, setTime: null };
    }
  }

  function formatTime(date) {
    if (!date) return 'N/A';
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  }

  // 🪐 Planets with Rise/Set Times
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

        // 🌅 Get rise/set times
        const { riseTime, setTime } = getRiseSetTimes(name, now);

        let riseSetHTML = '';
        if (riseTime || setTime) {
          if (hor.altitude > 0) {
            riseSetHTML = `
              <div class="rise-set-info">
                <div class="rise-time">🌅 Rise: ${formatTime(riseTime)}</div>
                <div class="set-time">🌇 Set: ${formatTime(setTime)}</div>
              </div>
            `;
          } else {
            riseSetHTML = `
              <div class="rise-set-info">
                <div class="not-visible">🌑 Below horizon<br>Next rise: ${formatTime(riseTime)}</div>
              </div>
            `;
          }
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
          ${riseSetHTML}
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
