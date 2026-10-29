const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9223',
    '--disable-gpu',
    '--window-size=240,700',
    'http://127.0.0.1:3000/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1500));
    const tabs = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9223/json', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const pageTab = tabs.find(t => t.url.includes('3000'));
    if (!pageTab) {
      console.log('No page tab found');
      return;
    }

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

    // Enable console & log
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 230,
      height: 700,
      deviceScaleFactor: 1,
      mobile: true
    });

    ws.addEventListener('message', (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', data.params.type, data.params.args);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.log('EXCEPTION:', data.params.exceptionDetails);
      }
    });

    // Evaluate DOM elements geometry
    const evalRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const getBox = (el) => {
            if (!el) return null;
            const b = el.getBoundingClientRect();
            return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
          };
          return {
            window: { w: window.innerWidth, h: window.innerHeight },
            canvas: getBox(document.getElementById('simulation-canvas')),
            canvasContainer: getBox(document.querySelector('.canvas-container')),
            simulatorPane: getBox(document.querySelector('.simulator-pane')),
            controlsPane: getBox(document.querySelector('.controls-pane')),
            monitorBar: getBox(document.querySelector('.monitor-bar')),
            header: getBox(document.querySelector('header')),
            bodyChildren: Array.from(document.body.children).map(c => ({
              tag: c.tagName,
              cls: c.className,
              box: getBox(c)
            }))
          };
        })()
      `,
      returnByValue: true
    });

    console.log('LAYOUT EVAL:', JSON.stringify(evalRes.result.value, null, 2));

    // Capture screenshot
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/screenshot_headless.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved scratch/screenshot_headless.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);
