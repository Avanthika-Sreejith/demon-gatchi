let doomMeter = 0;
let isTriggered = false;

const batteryFill = document.getElementById('battery-fill');
const doomText = document.getElementById('doom-text');
const petSprite = document.getElementById('pet-sprite');
const feedBtn = document.getElementById('feed-btn');

// 1. Tick Loop
const gameLoop = setInterval(() => {
  if (isTriggered) return;

  //doomMeter += 5; // Slower tick for testing
  if (doomMeter > 100) doomMeter = 100;
  
  updateUI();
  checkDoomState();
}, 1000);

// 2. Action Trigger
feedBtn.addEventListener('click', () => {
  if (isTriggered) return;

  doomMeter -= 15;
  if (doomMeter < 0) doomMeter = 0;
  
  updateUI();
});

// 3. UI Update (Battery height + Green-to-Red Color Transition)
function updateUI() {
  // Update battery fill height
  batteryFill.style.height = `${doomMeter}%`;
  doomText.innerText = doomMeter;

  // Calculate Green to Red Hue Shift (120deg = Green, 0deg = Red)
  const hue = 120 - (doomMeter * 1.2); 
  batteryFill.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;

  // Update Sprite Stage & Dynamic Growth/Shake
  if (doomMeter < 30) {
    petSprite.innerText = '🥚';
  } else if (doomMeter < 75) {
    petSprite.innerText = '👿';
  } else {
    petSprite.innerText = '👹';
  }

  // Slightly enlarge demon as doom increases
  const scale = 1 + (doomMeter / 200);
  petSprite.style.transform = `scale(${scale})`;
}

// 4. System Lock Check
function checkDoomState() {
  if (doomMeter >= 100 && !isTriggered) {
    isTriggered = true;
    clearInterval(gameLoop);

    fetch('/api/lock', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => console.log('Response:', data))
      .catch((err) => console.error(err));
  }
}