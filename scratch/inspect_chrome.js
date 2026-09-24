import { spawn } from 'child_process';
import fs from 'fs';

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\scratch\\chrome_profile';

  const chromeProc = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--disable-gpu',
    '--window-size=1280,1000',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const listData = await listRes.json();
    const pageWsUrl = listData[0]?.webSocketDebuggerUrl;

    const ws = new WebSocket(pageWsUrl);
    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data.result);
        callbacks.delete(data.id);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Input.enable');

    console.log('Navigating...');
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 2500));

    // Scroll gestures wheel stage into view
    const scrollRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const s = document.querySelector('#gestures .cursor-grab');
          if (s) {
            s.scrollIntoView({ block: 'center', behavior: 'instant' });
            const r = s.getBoundingClientRect();
            return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom };
          }
          return { error: 'Stage not found' };
        })()
      `,
      returnByValue: true
    });
    console.log('Gestures stage rect:', scrollRes.result.value);

    await new Promise(r => setTimeout(r, 600));

    const checkRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const s = document.querySelector('#gestures .cursor-grab');
          const r = s.getBoundingClientRect();
          return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom };
        })()
      `,
      returnByValue: true
    });
    const sRect = checkRes.result.value;
    console.log('Current stage rect:', sRect);

    // Hover center of stage
    const centerX = sRect.left + sRect.width / 2;
    const centerY = sRect.top + sRect.height / 2;
    console.log('Dispatching mouseMove at center:', centerX, centerY);

    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: centerX,
      y: centerY
    });

    await new Promise(r => setTimeout(r, 1000));

    // Check what is hovered
    const hoverData = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const hovered = document.querySelector('#gestures .is-hovered');
          const stage = document.querySelector('#gestures .cursor-grab');
          const cards = Array.from(document.querySelectorAll('#gestures .card-3d-crisp'));
          
          return {
            totalCards: cards.length,
            hasHovered: !!hovered,
            hoveredTag: hovered?.tagName,
            hoveredClass: hovered?.className,
            hoveredRect: hovered ? (() => {
              const r = hovered.getBoundingClientRect();
              return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
            })() : null,
            stageRect: stage ? (() => {
              const r = stage.getBoundingClientRect();
              return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
            })() : null,
            diffBottom: hovered && stage ? hovered.getBoundingClientRect().bottom - stage.getBoundingClientRect().bottom : null
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Hover result:', JSON.stringify(hoverData.result.value, null, 2));

    // Capture screenshot of viewport
    const ssRes = await send('Page.captureScreenshot', {
      format: 'png'
    });

    const ssPath = 'C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\hover_inspection.png';
    fs.writeFileSync(ssPath, Buffer.from(ssRes.data, 'base64'));
    console.log('Screenshot saved to:', ssPath);

    ws.close();
  } catch (err) {
    console.error('Error during inspection:', err);
  } finally {
    chromeProc.kill();
  }
}

main();
