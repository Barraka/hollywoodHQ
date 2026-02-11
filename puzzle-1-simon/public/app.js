const ws = new WebSocket(`ws://${location.host}`);

let isMock = false;
let puzzleState = {};
let audioUnlocked = false;
let buttonConfig = [];

// DOM
const buttonGrid = document.getElementById('button-grid');
const progressDisplay = document.getElementById('progress');
const statusText = document.getElementById('status-text');
const feedbackFlash = document.getElementById('feedback-flash');
const solvedOverlay = document.getElementById('solved-overlay');
const mockControls = document.getElementById('mock-controls');
const debugState = document.getElementById('debug-state');
const startOverlay = document.getElementById('start-overlay');

// --- Audio unlock ---
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  startOverlay.classList.add('hidden');
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ready' }));
  }
}

startOverlay.addEventListener('click', unlockAudio);
document.addEventListener('keydown', unlockAudio, { once: true });

// --- Create button grid ---
function createButtons(buttons) {
  buttonGrid.innerHTML = '';
  buttonConfig = buttons;

  buttons.forEach(btn => {
    const buttonEl = document.createElement('div');
    buttonEl.className = `button ${btn.color}`;
    buttonEl.dataset.id = btn.id;

    const numberEl = document.createElement('div');
    numberEl.className = 'button-number';
    numberEl.textContent = btn.id;

    buttonEl.appendChild(numberEl);
    buttonGrid.appendChild(buttonEl);

    // Mock mode: click to simulate press
    if (isMock) {
      buttonEl.addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'buttonPress', buttonId: btn.id }));
      });
    }
  });
}

// --- WebSocket ---
ws.onopen = () => {
  console.log('[ws] Connected');
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  switch (msg.type) {
    case 'config':
      isMock = msg.mock;
      createButtons(msg.buttons);
      if (isMock) mockControls.classList.add('visible');
      break;

    case 'state':
      puzzleState = msg;
      updateProgress(msg.pressedCount, msg.totalButtons);
      updateStatus(msg.state);
      updateDebug(msg);

      // Update button locked states
      msg.pressedButtons.forEach(id => {
        const btn = document.querySelector(`[data-id="${id}"]`);
        if (btn) {
          btn.classList.add('locked');
          btn.classList.remove('lit');
        }
      });

      if (msg.state === 'solved') {
        solvedOverlay.classList.add('visible');
      } else {
        solvedOverlay.classList.remove('visible');
      }
      break;

    case 'buttonBlink':
      updateButtonBlink(msg.buttonId, msg.isLit);
      break;

    case 'ledChange':
      // Mock mode LED state change
      updateButtonBlink(msg.buttonId, msg.state);
      break;

    case 'correctPress':
      flash('correct');
      break;

    case 'wrongPress':
      flash('wrong');
      break;

    case 'hackMode':
      if (typeof HackGlitch !== 'undefined') HackGlitch.activate();
      break;

    case 'hackResolved':
      if (typeof HackGlitch !== 'undefined') HackGlitch.deactivate();
      break;
  }
};

ws.onclose = () => {
  statusText.textContent = 'Connection perdue';
};

// --- Update UI ---
function updateButtonBlink(buttonId, isLit) {
  const btn = document.querySelector(`[data-id="${buttonId}"]`);
  if (!btn) return;

  if (isLit) {
    btn.classList.add('lit');
  } else {
    btn.classList.remove('lit');
  }
}

function updateProgress(pressed, total) {
  progressDisplay.textContent = `${pressed} / ${total}`;
}

function updateStatus(state) {
  switch (state) {
    case 'inactive':
      statusText.textContent = 'En attente d\'activation';
      break;
    case 'active':
      statusText.textContent = 'Appuyez sur les boutons allumés';
      break;
    case 'solved':
      statusText.textContent = 'QG Réactivé';
      break;
  }
}

function updateDebug(state) {
  if (!debugState) return;
  debugState.textContent = `State: ${state.state} | Pressed: ${state.pressedCount}/${state.totalButtons}`;
}

// --- Feedback ---
function flash(type) {
  feedbackFlash.className = type === 'wrong' ? 'wrong-flash' : '';
  setTimeout(() => { feedbackFlash.className = ''; }, 300);
}

// --- Keyboard input ---
document.addEventListener('keydown', (e) => {
  if (!isMock) return;

  switch(e.key.toLowerCase()) {
    case 'x':
      ws.send(JSON.stringify({ type: 'activate' }));
      break;
    case 'c':
      ws.send(JSON.stringify({ type: 'reset' }));
      break;
    case 'v':
      ws.send(JSON.stringify({ type: 'forceSolve' }));
      break;

    // Number keys 0-9 for buttons 1-10
    case '1': case '2': case '3': case '4': case '5':
    case '6': case '7': case '8': case '9':
      ws.send(JSON.stringify({ type: 'buttonPress', buttonId: parseInt(e.key) }));
      break;
    case '0':
      ws.send(JSON.stringify({ type: 'buttonPress', buttonId: 10 }));
      break;
  }
});
