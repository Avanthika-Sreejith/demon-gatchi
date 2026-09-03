// Game State
let doomMeter = 0;
let currentStage = 1;
let isEvolving = false;
let hasHatched = false; // Prevents timer until first tap

// DOM Elements
const batteryFill = document.getElementById('battery-fill');
const doomText = document.getElementById('doom-text');
const warningOverlay = document.getElementById('warning-overlay');
const petContainer = document.getElementById('pet-container');
const petSprite = document.getElementById('pet-sprite');

const btnFeed = document.getElementById('btn-feed');
const btnPet = document.getElementById('btn-pet');
const btnDistract = document.getElementById('btn-distract');

// Enable action buttons initially disabled until hatch
btnFeed.disabled = true;
btnPet.disabled = true;
btnDistract.disabled = true;

// Mark sprite as tappable initially
petSprite.classList.add('tappable');

// Audio Context Setup
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playSound(freq, type = 'square', duration = 0.15) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playEvolutionSound() {
  playSound(261, 'square', 0.1);
  setTimeout(() => playSound(329, 'square', 0.1), 100);
  setTimeout(() => playSound(392, 'square', 0.1), 200);
  setTimeout(() => playSound(523, 'square', 0.25), 300);
}

// Interactive Tap-To-Hatch Logic
// Interactive Tap-To-Hatch Logic
petSprite.addEventListener('click', () => {
  initAudio();

  if (!hasHatched && !isEvolving) {
    isEvolving = true;
    petSprite.classList.remove('tappable');
    
    // 1. Play wobble and evolution sound
    playEvolutionSound();
    petSprite.classList.remove('hatching');
    void petSprite.offsetWidth; // Force DOM reflow
    petSprite.classList.add('hatching');

    // 2. Show cracked egg sprite halfway through wobble (300ms)
    setTimeout(() => {
      petSprite.src = '/assets/stage1_cracked.png';
    }, 300);

    // 3. Complete hatch sequence into Stage 2 Imp (700ms)
    setTimeout(() => {
      hasHatched = true;
      currentStage = 2;
      
      // Keep doom meter at 0% when hatched
      doomMeter = 0; 

      petSprite.src = '/assets/stage2.png';
      petContainer.className = 'stage-imp-glow';
      petSprite.classList.remove('size-stage1');
      petSprite.classList.add('size-stage2');
      petSprite.classList.remove('hatching');

      // Enable action buttons
      btnFeed.disabled = false;
      btnPet.disabled = false;
      btnDistract.disabled = false;

      isEvolving = false;
      updateUI(); 
    }, 700);
  }
});

// Cooldown Helper
function triggerCooldown(button, originalText, cooldownSeconds) {
  button.disabled = true;
  let remaining = cooldownSeconds;
  button.innerText = `WAIT (${remaining}s)`;

  const interval = setInterval(() => {
    remaining--;
    if (remaining > 0) {
      button.innerText = `WAIT (${remaining}s)`;
    } else {
      clearInterval(interval);
      button.disabled = false;
      button.innerText = originalText;
    }
  }, 1000);
}

function lockOS() {
  fetch('/api/lock', { method: 'POST' })
    .catch(err => console.error('Lock command failed:', err));
}

// Stage Evolution Trigger (For 30% -> 75% transition)
function triggerEvolution(targetStage, newImageSrc, newGlowClass, newSizeClass) {
  isEvolving = true;
  currentStage = targetStage;

  playEvolutionSound();

  petSprite.classList.remove('hatching');
  void petSprite.offsetWidth;
  petSprite.classList.add('hatching');

  setTimeout(() => {
    petSprite.src = newImageSrc;
    petContainer.className = newGlowClass;
    
    petSprite.classList.remove('size-stage1', 'size-stage2', 'size-stage3');
    petSprite.classList.add(newSizeClass);

    petSprite.classList.remove('hatching');
    isEvolving = false;
  }, 600);
}

function updateUI() {
  batteryFill.style.height = `${doomMeter}%`;
  doomText.innerText = doomMeter;

  const hue = 120 - (doomMeter * 1.2);
  batteryFill.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
  if (hasHatched) {
    const promptEl = document.getElementById('hatch-prompt');
    if (promptEl) promptEl.remove();
  }

  if (isEvolving) return;

  if (hasHatched) {
    if (doomMeter < 75) {
      if (currentStage !== 2) {
        currentStage = 2;
        petSprite.src = '/assets/stage2.png';
        petContainer.className = 'stage-imp-glow';
        petSprite.classList.remove('size-stage1', 'size-stage3');
        petSprite.classList.add('size-stage2');
      }
      petSprite.classList.remove('raging');
    } else {
      if (currentStage !== 3) {
        triggerEvolution(3, '/assets/stage3.png', 'stage-beast-glow', 'size-stage3');
      }
      petSprite.classList.add('raging');
    }
  }

  if (doomMeter >= 90) {
    warningOverlay.classList.add('active');
  } else {
    warningOverlay.classList.remove('active');
  }
}

// Action Button Listeners
btnFeed.addEventListener('click', () => {
  if (!hasHatched) return;
  doomMeter = Math.max(0, doomMeter - 15);
  playSound(440, 'sine', 0.1);
  updateUI();
});

btnPet.addEventListener('click', () => {
  if (!hasHatched) return;
  doomMeter = Math.max(0, doomMeter - 10);
  playSound(587, 'sine', 0.1);
  triggerCooldown(btnPet, 'PET DEMON (-10%)', 2);
  updateUI();
});

btnDistract.addEventListener('click', () => {
  if (!hasHatched) return;
  doomMeter = Math.max(0, doomMeter - 25);
  playSound(330, 'triangle', 0.2);
  triggerCooldown(btnDistract, 'DISTRACT DEMON (-25%)', 5);
  updateUI();
});

// Master Game Loop
setInterval(() => {
  // Only start incrementing Doom Meter AFTER hatching
  if (hasHatched && doomMeter < 100) {
    doomMeter+=5;
    updateUI();

    if (doomMeter === 100) {
      lockOS();
    }
  }
}, 1000);

const hatchPrompt = document.getElementById('hatch-prompt');

petSprite.addEventListener('click', () => {
  initAudio();

  if (!hasHatched && !isEvolving) {
    isEvolving = true;
    petSprite.classList.remove('tappable');
    const promptEl = document.getElementById('hatch-prompt');
    if (promptEl) {
      promptEl.remove(); 
    }
    
    // Hide the retro text prompt smoothly
    

    playEvolutionSound();
    petSprite.classList.remove('hatching');
    void petSprite.offsetWidth;
    petSprite.classList.add('hatching');

    setTimeout(() => {
      petSprite.src = '/assets/stage1_cracked.png';
    }, 300);

    setTimeout(() => {
      hasHatched = true;
      currentStage = 2;
      doomMeter = 0; 

      petSprite.src = '/assets/stage2.png';
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