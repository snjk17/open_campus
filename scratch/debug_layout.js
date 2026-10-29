const { spawn } = require('child_process');
const http = require('http');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--window-size=1200,800',
    'http://127.0.0.1:3000/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1500));
    const tabs = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9224/json', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const pageTab = tabs.find(t => t.url.includes('3000'));
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const curId = id++;
        const handler = (msg) => {
          const data = JSON.parse(msg.data);
          if (data.id === curId) {
            ws.removeEventListener('message', handler);
            resolve(data.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await send('Runtime.enable');

    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sim = document.querySelector('.simulator-pane');
          const ctrl = document.querySelector('.controls-pane');
          const cvs = document.getElementById('simulation-canvas');
          const mon = document.querySelector('.monitor-bar');
          const main = document.querySelector('.main-content');
          
          const cs = (el) => {
            if (!el) return null;
            const style = window.getComputedStyle(el);
            const r = el.getBoundingClientRect();
            return {
              tag: el.tagName,
              rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              display: style.display,
              position: style.position,
              flexDirection: style.flexDirection,
              order: style.order,
              width: style.width,
              height: style.height,
              overflow: style.overflow,
              visibility: style.visibility,
              opacity: style.opacity,
              zIndex: style.zIndex
            };
          };

          return {
            window: { w: window.innerWidth, h: window.innerHeight },
            main: cs(main),
            sim: cs(sim),
            ctrl: cs(ctrl),
            cvs: cs(cvs),
            mon: cs(mon),
            canvasSize: cvs ? { w: cvs.width, h: cvs.height } : null
          };
        })()
      `,
      returnByValue: true
    });

    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);

