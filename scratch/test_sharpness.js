import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\scratch\\chrome_profile_sharp';
  const port = 9333;

  const p = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--window-size=1280,1000',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1500));

  try {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
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
    await new Promise(r => setTimeout(r, 600));

    // Get stage rect
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

    // Take BEFORE screenshot of hovered card (zoomed in on card)
    const cardRes = await send('Runtime.evaluate', {
      expression: `(() => { const r = document.querySelector('#gestures .is-hovered').getBoundingClientRect(); return { x: Math.max(0, r.x - 15), y: Math.max(0, r.y - 15), width: r.width + 30, height: r.height + 30 }; })()`,
      returnByValue: true
    });
    const cardClip = cardRes.result.value;

    const ssBefore = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { ...cardClip, scale: 1 }
    });
    fs.writeFileSync('C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\card_before.png', Buffer.from(ssBefore.data, 'base64'));
    console.log('Saved card_before.png');

    // Apply fixes dynamically
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
        })()
      `
    });
    await new Promise(r => setTimeout(r, 500));

    const ssAfter = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { ...cardClip, scale: 1 }
    });
    fs.writeFileSync('C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\card_after.png', Buffer.from(ssAfter.data, 'base64'));
    console.log('Saved card_after.png');

    ws.close();
  } catch (e) {
    console.error(e);
  } finally {
    p.kill();
  }
}

main();
