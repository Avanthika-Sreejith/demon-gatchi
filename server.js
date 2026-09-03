const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Safe mode endpoint (Locks screen / Sleeps laptop)
app.post('/api/lock', (req, res) => {
  console.log('Doom meter hit 100%! Executing lock/sleep command...');
  
  const cmd = process.platform === 'win32' 
    ? 'rundll32.exe user32.dll,LockWorkStation' 
    : 'pmset sleepnow';

  exec(cmd, (err) => {
    if (err) console.error('Execution error:', err);
  });

  res.json({ status: 'Machine locked' });
});

// Hardcore mode endpoint (Actual System Shutdown)
app.post('/api/shutdown', (req, res) => {
  console.log('Doom meter hit 100%! Initiating HARD SHUTDOWN...');
  
  const cmd = process.platform === 'win32' 
    ? 'shutdown /s /f /t 0' 
    : 'shutdown -h now';

  exec(cmd, (err) => {
    if (err) console.error('Execution error:', err);
  });

  res.json({ status: 'Shutting down...' });
});

app.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`Demon-Gatchi live at http://localhost:${PORT}`);
  console.log(`=================================\n`);
});