function triggerSystemConsequence() {
  // Use '/api/lock' while building/testing!
  // Switch to '/api/shutdown' for the final demo pitch.
  fetch('/api/lock', { method: 'POST' })
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.error(err));
}