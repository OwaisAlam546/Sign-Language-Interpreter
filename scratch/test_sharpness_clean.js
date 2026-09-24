import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\scratch\\chrome_test_profile';
  
  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  }

  const p = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9225',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--window-size=1280,1000',
    'about:blank'
  ]);

  let connected = false;
  let listData = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9225/json/list');
      listData = await res.json();
      if (listData && listData[0]) {
        connected = true;
        break;
      }
    } catch (_) {}
  }

  if (!connected) {
    console.error('Failed to connect to Chrome on port 9225');
    p.kill();
    return;
  }

  const ws = new WebSocket(listData[0].webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise(r => {
    const cur = id++;
    const h = e => {
      const d = JSON.parse(e.data);
      if (d.id === cur) {
        ws.removeEventListener('message', h);
        r(d.result);
      }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Input.enable');

  await send('Page.navigate', { url: 'http://localhost:5173/' });
  await new Promise(r => setTimeout(r, 2000));

  // Scroll stage into view
  await send('Runtime.evaluate', {
    expression: `document.querySelector('#gestures .cursor-grab').scrollIntoView({ block: 'center', behavior: 'instant' });`
  });
  await new Promise(r => setTimeout(r, 500));

  const stageRes = await send('Runtime.evaluate', {
    expression: `(() => { const r = document.querySelector('#gestures .cursor-grab').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; })()`,
    returnByValue: true
  });
  const sRect = stageRes.result.value;

  // Hover center card
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: sRect.left + sRect.width / 2,
    y: sRect.top + sRect.height / 2
  });
  await new Promise(r => setTimeout(r, 1000));

  // Get card bounding rect
  const cardRes = await send('Runtime.evaluate', {
    expression: `(() => { const r = document.querySelector('#gestures .is-hovered').getBoundingClientRect(); return { x: Math.max(0, r.x - 15), y: Math.max(0, r.y - 15), width: r.width + 30, height: r.height + 35 }; })()`,
    returnByValue: true
  });
  const cardClip = cardRes.result.value;

  // Capture BEFORE screenshot
  const ssBefore = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { ...cardClip, scale: 1 }
  });
  fs.writeFileSync('C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\card_before.png', Buffer.from(ssBefore.data, 'base64'));
  console.log('Saved card_before.png');

  // Apply our fixes dynamically in page
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const stage = document.querySelector('#gestures .cursor-grab');
        stage.style.overflow = 'visible';
        
        const hovered = document.querySelector('#gestures .is-hovered');
        const slot = hovered.closest('[style*="rotate3d"]');
        
        slot.style.zIndex = '50';
        slot.style.backfaceVisibility = 'visible';
        slot.style.webkitBackfaceVisibility = 'visible';
        
        hovered.style.overflow = 'visible';
        hovered.style.transformStyle = 'flat';
        hovered.style.webkitTransformStyle = 'flat';
        
        // Also ensure HandSkeleton SVG inside card has high rendering fidelity
        const svg = hovered.querySelector('svg');
        if (svg) {
          svg.style.transform = 'translateZ(0)';
          svg.style.shapeRendering = 'geometricPrecision';
        }
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  // Recalculate cardClip after unclip
  const cardResAfter = await send('Runtime.evaluate', {
    expression: `(() => { const r = document.querySelector('#gestures .is-hovered').getBoundingClientRect(); return { x: Math.max(0, r.x - 15), y: Math.max(0, r.y - 15), width: r.width + 30, height: r.height + 35 }; })()`,
    returnByValue: true
  });
  const cardClipAfter = cardResAfter.result.value;

  // Capture AFTER screenshot
  const ssAfter = await send('Page.captureScreenshot', {
    format: 'png',
    clip: { ...cardClipAfter, scale: 1 }
  });
  fs.writeFileSync('C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\card_after.png', Buffer.from(ssAfter.data, 'base64'));
  console.log('Saved card_after.png');

  ws.close();
  p.kill();
}

main();
