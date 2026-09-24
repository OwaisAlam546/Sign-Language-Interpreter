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
      ws.send(JSON.stringify({ id: cur, method, params }));
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 2000));

    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const els = [];
          document.querySelectorAll('*').forEach(el => {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            // Look for any element around the wheel (y > 2000, width > 500)
            if (r.width > 500 && r.height > 150) {
              const beforeCs = getComputedStyle(el, '::before');
              const afterCs = getComputedStyle(el, '::after');
              const hasBorder = cs.borderWidth !== '0px' && cs.borderStyle !== 'none' && !cs.borderColor.includes('rgba(0, 0, 0, 0)');
              const hasBefore = beforeCs.content !== 'none' && (beforeCs.borderWidth !== '0px' || beforeCs.boxShadow !== 'none' || beforeCs.backgroundImage !== 'none');
              const hasAfter = afterCs.content !== 'none' && (afterCs.borderWidth !== '0px' || afterCs.boxShadow !== 'none' || afterCs.backgroundImage !== 'none');
              
              if (hasBorder || cs.boxShadow !== 'none' || cs.outlineWidth !== '0px' || hasBefore || hasAfter) {
                els.push({
                  tag: el.tagName,
                  id: el.id,
                  class: el.className,
                  rect: { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom },
                  border: cs.border,
                  boxShadow: cs.boxShadow,
                  beforeBorder: beforeCs.border,
                  beforeBg: beforeCs.backgroundImage,
                  beforeBoxShadow: beforeCs.boxShadow
                });
              }
            }
          });
          return els;
        })()
      `,
      returnByValue: true
    });

    console.log('Elements:');
    console.log(JSON.stringify(res.result.value, null, 2));

    ws.close();
  } catch (e) {
    console.error(e);
  } finally {
    p.kill();
  }
}

main();
