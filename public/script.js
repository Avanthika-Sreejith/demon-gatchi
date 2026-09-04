let doomMeter = 0;
let hasHatched = false;
let isEvolving = false;
let currentStage = 1;
let moodTimeout = null;
let tickRate = 1000;
let gameLoopInterval = null;

let startTime = null;
let survivalSeconds = 0;

const petSprite = document.getElementById('pet-sprite');
const petContainer = document.getElementById('pet-container');
const batteryFill = document.getElementById('battery-fill');
const doomText = document.getElementById('doom-text');
const moodText = document.getElementById('mood-text');
const warningOverlay = document.getElementById('warning-overlay');
const diffDesc = document.getElementById('difficulty-desc');

const btnFeed = document.getElementById('btn-feed');
const btnPet = document.getElementById('btn-pet');
const btnDistract = document.getElementById('btn-distract');
const modeBtns = document.querySelectorAll('.mode-btn');

// Dynamic Asset Helper
function getAsset(fileName) {
  return `/assets/imp/${fileName}`;
}

const cooldowns = {
  feed: { btn: btnFeed, bar: document.getElementById('cooldown-feed'), time: 7000, active: false },
  pet: { btn: btnPet, bar: document.getElementById('cooldown-pet'), time: 6000, active: false },
  distract: { btn: btnDistract, bar: document.getElementById('cooldown-distract'), time: 7000, active: false }
};

let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(freq, type = 'sine', duration = 0.1) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

let isTempMoodActive = false;

function setMood(text, temporary = false) {
  if (!moodText) return;
  moodText.innerText = text;
  
  if (temporary) {
    isTempMoodActive = true;
    if (moodTimeout) clearTimeout(moodTimeout);
    
    moodTimeout = setTimeout(() => {
      isTempMoodActive = false;
      updateBaseMood();
    }, 1500);
  }
}

function updateBaseMood() {
  if (isTempMoodActive) return;

  if (!hasHatched) setMood("STATUS: DORMANT");
  else if (currentStage === 2) setMood(doomMeter > 50 ? "MOOD: RESTLESS" : "MOOD: CALM");
  else if (currentStage === 3) setMood("MOOD: ENRAGED");
}

function triggerActionAnimation(tempSrc, duration = 1200) {
  if (!hasHatched || isEvolving) return;
  petSprite.src = tempSrc;
  petSprite.classList.remove('hatching');
  void petSprite.offsetWidth;
  petSprite.classList.add('hatching');
  setTimeout(() => {
    if (!isEvolving) petSprite.src = (currentStage === 3) ? getAsset('stage3.png') : getAsset('stage2.png');
  }, duration);
}

function triggerCooldown(key) {
  const cd = cooldowns[key];
  cd.active = true;
  cd.btn.disabled = true;
  cd.bar.style.width = '100%';
  cd.bar.style.transition = 'none';

  setTimeout(() => {
    cd.bar.style.transition = `width ${cd.time}ms linear`;
    cd.bar.style.width = '0%';
  }, 10);

  setTimeout(() => {
    cd.active = false;
    if (hasHatched) cd.btn.disabled = false;
  }, cd.time);
}

// Action Logic
const actionMap = {
  feed: () => {
    if (!hasHatched || cooldowns.feed.active) return;
    
    if (Math.random() < 0.50) {
      playSound(150, 'sawtooth', 0.2);
      setMood("STATUS: REJECTED! (0%)", true);
      triggerActionAnimation(getAsset('stage2_reject.png'), 1200);
      triggerCooldown('feed');
      updateUI();
      return;
    }

    doomMeter = Math.max(0, doomMeter - 10);
    playSound(350, 'sine', 0.1);
    setMood("STATUS: STUFFED (-10%)", true);
    triggerActionAnimation(getAsset('stage2_feed.png'));
    triggerCooldown('feed');
    updateUI();
  },

  pet: () => {
    if (!hasHatched || cooldowns.pet.active) return;

    if (currentStage === 3) {
      doomMeter = Math.min(100, doomMeter + 10);
      playSound(100, 'sawtooth', 0.3);
      setMood("STATUS: BITTEN IN RAGE! (+10%)", true);
      triggerActionAnimation(getAsset('stage3_reject.png'), 1200);
      triggerCooldown('pet');
      updateUI();
      return;
    }

    if (Math.random() < 0.50) {
      playSound(150, 'sawtooth', 0.2);
      setMood("STATUS: BITTEN! (0%)", true);
      triggerActionAnimation(getAsset('stage2_bitten.png'), 1200);
      triggerCooldown('pet');
      updateUI();
      return;
    }

    doomMeter = Math.max(0, doomMeter - 5);
    playSound(450, 'sine', 0.1);
    setMood("STATUS: SQUISHED (-5%)", true);
    triggerActionAnimation(getAsset('stage2_pet.png'));
    triggerCooldown('pet');
    updateUI();
  },

  distract: () => {
    if (!hasHatched || cooldowns.distract.active) return;

    if (Math.random() < 0.50) {
      playSound(150, 'sawtooth', 0.2);
      setMood("STATUS: IGNORED! (0%)", true);
      triggerActionAnimation(getAsset('stage2_ignore.png'), 1200);
      petSprite.classList.add('raging');
      setTimeout(() => {
        if (doomMeter < 75) petSprite.classList.remove('raging');
      }, 400);
      triggerCooldown('distract');
      updateUI();
      return;
    }

    doomMeter = Math.max(0, doomMeter - 15);
    playSound(550, 'sine', 0.1);
    setMood("STATUS: HYPNOTIZED (-15%)", true);
    triggerActionAnimation(getAsset('stage2_distract.png'));
    triggerCooldown('distract');
    updateUI();
  }
};

// Tap to Hatch
petSprite.addEventListener('click', () => {
  initAudio();
  if (!hasHatched && !isEvolving) {
    isEvolving = true;
    petSprite.classList.remove('tappable');
    const promptEl = document.getElementById('hatch-prompt');
    if (promptEl) promptEl.remove();

    petSprite.classList.add('hatching');
    setTimeout(() => { petSprite.src = getAsset('stage1_cracked.png'); }, 300);

    setTimeout(() => {
      hasHatched = true;
      startTime = Date.now();
      currentStage = 2;
      doomMeter = 0;
      petSprite.src = getAsset('stage2.png');
      petContainer.className = 'stage-imp-glow';
      petSprite.classList.remove('size-stage1');
      petSprite.classList.add('size-stage2');
      petSprite.classList.remove('hatching');

      btnFeed.disabled = false;
      btnPet.disabled = false;
      btnDistract.disabled = false;
      isEvolving = false;
      updateUI();
    }, 700);
  }
});

// Drag and Drop
const draggableIcons = document.querySelectorAll('.pixel-icon-large');

draggableIcons.forEach(icon => {
  icon.addEventListener('dragstart', (e) => {
    const action = icon.getAttribute('data-action');
    if (!hasHatched || cooldowns[action].active) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', action);
  });
});

petContainer.addEventListener('dragover', (e) => e.preventDefault());
petContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  const action = e.dataTransfer.getData('text/plain');
  if (action && actionMap[action]) {
    actionMap[action]();
  }
});

// Mobile Touch Drag
let activeTouchAction = null;
let dragProxy = null;

draggableIcons.forEach(icon => {
  icon.addEventListener('touchstart', (e) => {
    const action = icon.getAttribute('data-action');
    if (!hasHatched || cooldowns[action].active) return;

    activeTouchAction = action;
    const touch = e.touches[0];

    dragProxy = icon.cloneNode(true);
    dragProxy.className = 'pixel-icon-large';
    dragProxy.style.position = 'fixed';
    dragProxy.style.pointerEvents = 'none';
    dragProxy.style.zIndex = '1000';
    dragProxy.style.width = '48px';
    dragProxy.style.height = '48px';
    dragProxy.style.left = `${touch.clientX - 24}px`;
    dragProxy.style.top = `${touch.clientY - 24}px`;
    document.body.appendChild(dragProxy);
  }, { passive: true });

  icon.addEventListener('touchmove', (e) => {
    if (!dragProxy) return;
    const touch = e.touches[0];
    dragProxy.style.left = `${touch.clientX - 24}px`;
    dragProxy.style.top = `${touch.clientY - 24}px`;
  }, { passive: true });

  icon.addEventListener('touchend', (e) => {
    if (!dragProxy) return;
    const touch = e.changedTouches[0];
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);

    if (targetEl && (targetEl === petContainer || petContainer.contains(targetEl))) {
      if (activeTouchAction && actionMap[activeTouchAction]) {
        actionMap[activeTouchAction]();
      }
    }

    dragProxy.remove();
    dragProxy = null;
    activeTouchAction = null;
  });
});

// Difficulty Mode Selection
modeBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    initAudio();
    playSound(600, 'triangle', 0.05);

    modeBtns.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');

    const speedAttr = e.target.getAttribute('data-speed');
    if (speedAttr === 'custom') {
      const userInput = prompt("Enter tick interval in seconds (e.g. 0.5, 1.5, 3):", "1.5");
      const parsedSeconds = parseFloat(userInput);
      if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
        tickRate = parsedSeconds * 1000;
        diffDesc.innerText = `CUSTOM: +1% / ${parsedSeconds}s`;
      } else {
        tickRate = 1000;
        diffDesc.innerText = "CUSTOM: +1% / 1s (Defaulted)";
      }
    } else {
      tickRate = parseInt(speedAttr);
      diffDesc.innerText = e.target.getAttribute('data-desc');
    }
    startGameLoop();
  });
});

function updateUI() {
  batteryFill.style.height = `${doomMeter}%`;
  doomText.innerText = doomMeter;
  batteryFill.style.backgroundColor = `hsl(${120 - (doomMeter * 1.2)}, 100%, 50%)`;

  if (hasHatched) {
    const promptEl = document.getElementById('hatch-prompt');
    if (promptEl) promptEl.remove();
  }

  updateBaseMood();

  if (isEvolving) return;

  if (hasHatched) {
    if (doomMeter < 75) {
      if (currentStage !== 2) {
        currentStage = 2;
        petSprite.src = getAsset('stage2.png');
        petContainer.className = 'stage-imp-glow';
        petSprite.classList.remove('size-stage1', 'size-stage3');
        petSprite.classList.add('size-stage2');
      }
      petSprite.classList.remove('raging');
    } else {
      if (currentStage !== 3) {
        currentStage = 3;
        petSprite.src = getAsset('stage3.png');
        petContainer.className = 'stage-beast-glow';
        petSprite.classList.remove('size-stage1', 'size-stage2');
        petSprite.classList.add('size-stage3');
      }
      petSprite.classList.add('raging');
    }
  }

  if (doomMeter >= 90) {
    warningOverlay.classList.add('active');
    document.body.classList.add('screen-shake');
  } else {
    warningOverlay.classList.remove('active');
    document.body.classList.remove('screen-shake');
  }
}

function triggerGameOver() {
  const endTime = Date.now();
  
  // Guard against missing startTime if game ends before hatch
  const start = startTime || Date.now();
  survivalSeconds = Math.floor((endTime - start) / 1000);
  
  const playerName = prompt(`GAME OVER! You survived ${survivalSeconds} seconds. Enter initials (3 letters):`, "AVA");
  
  if (playerName) {
    const formattedName = playerName.substring(0, 3).toUpperCase();
    submitScore(formattedName, survivalSeconds, "imp");
  }

  // Trigger OS lock mechanism
  fetch('/api/lock', { method: 'POST' }).catch(err => console.error(err));
}

function startGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval);
  gameLoopInterval = setInterval(() => {
    if (hasHatched && doomMeter < 100) {
      doomMeter++;
      updateUI();
      
      if (doomMeter === 100) {
        clearInterval(gameLoopInterval); // Stop loop on game over
        triggerGameOver();
      }
    }
  }, tickRate);
}
startGameLoop();

// Initialize Supabase Client
const SUPABASE_URL = 'https://qgjgjlfjsrhwlmbytfuy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnamdqbGZqc3Jod2xtYnl0ZnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NTk4MTMsImV4cCI6MjEwNDAzNTgxM30.SP-EdsegGzFdOULnWq2rpz5l2aJxlHaXJjEISanPK8k';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function submitScore(playerName, time, character) {
  const { data, error } = await supabaseClient
    .from('leaderboards')
    .insert([{ player_name: playerName, survival_time: time, character: character }]);

  if (error) {
    console.error('Supabase Insert Error:', error.message, error.details);
  } else {
    console.log('Score submitted successfully:', data);
    loadLeaderboard();
  }
}

async function loadLeaderboard() {
  const { data, error } = await supabaseClient
    .from('leaderboards')
    .select('player_name, survival_time')
    .order('survival_time', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Supabase Fetch Error:', error.message);
    return;
  }

  const listElement = document.getElementById('leaderboard-list');
  if (listElement && data) {
    listElement.innerHTML = data.map((entry, idx) => `
      <li>
        <span>${idx + 1}. ${(entry.player_name || '---').padEnd(3, ' ')}</span>
        <span>${entry.survival_time}s</span>
      </li>
    `).join('');
  }
}

// Initial fetch on app start
loadLeaderboard();