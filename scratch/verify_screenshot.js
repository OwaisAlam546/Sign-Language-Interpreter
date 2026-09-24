import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\scratch\\chrome_verify_profile';
  const port = 9444;

  if (fs.existsSync(userDataDir)) {
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (_) {}
  }

  const p = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--window-size=1280,1000',
    'about:blank'
  ]);

  let connected = false;
  let listData = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      listData = await res.json();
      if (listData && listData[0]) {
        connected = true;
        break;
      }
    } catch (_) {}
  }

  if (!connected) {
    console.error('Could not connect to Chrome');
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
  await new Promise(r => setTimeout(r, 2200));

  // Scroll stage into view
  await send('Runtime.evaluate', {
    expression: `document.querySelector('#gestures .cursor-grab').scrollIntoView({ block: 'center', behavior: 'instant' });`
  });
  await new Promise(r => setTimeout(r, 600));

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

  // Capture full section screenshot
  const ssRes = await send('Page.captureScreenshot', {
    format: 'png'
  });
  const ssPath = 'C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\hover_fixed.png';
  fs.writeFileSync(ssPath, Buffer.from(ssRes.data, 'base64'));
  console.log('Saved hover_fixed.png');

  ws.close();
  p.kill();
}

main();
