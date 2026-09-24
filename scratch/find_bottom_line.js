import { spawn } from 'child_process';

async function main() {
  const p = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\csc\\.gemini\\antigravity-ide\\brain\\cc44edf1-7275-4bb1-90cf-34b7b7cc0060\\scratch\\chrome_profile',
    '--disable-gpu',
    '--window-size=1280,1000',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
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
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 2000));

    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const section = document.querySelector('#gestures');
          const stage = document.querySelector('#gestures .cursor-grab');
          const sRect = stage.getBoundingClientRect();
          
          // Let's find every element in #gestures that overlaps the vertical range [sRect.bottom - 40, sRect.bottom + 40]
          const overlapping = [];
          section.querySelectorAll('*').forEach(el => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            if (Math.abs(r.bottom - sRect.bottom) < 20 || Math.abs(r.top - sRect.bottom) < 20) {
              overlapping.push({
                tag: el.tagName,
                class: el.className,
                rect: { top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height },
                border: cs.border,
                borderTop: cs.borderTop,
                borderBottom: cs.borderBottom,
                boxShadow: cs.boxShadow,
                bg: cs.backgroundImage || cs.backgroundColor,
                zIndex: cs.zIndex
              });
            }
          });
          return { sRect, overlapping };
        })()
      `,
      returnByValue: true
    });

    console.log(JSON.stringify(res.result.value, null, 2));

    ws.close();
  } catch (e) {
    console.error(e);
  } finally {
    p.kill();
  }
}

main();
