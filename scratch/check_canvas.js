const { spawn } = require('child_process');
const http = require('http');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9227',
    '--disable-gpu',
    'http://127.0.0.1:3000/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1500));
    const tabs = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9227/json', res => {
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

    // Evaluate
    const res = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const cvs = document.getElementById('simulation-canvas');
          const ctx = cvs ? cvs.getContext('2d') : null;
          // check if pixels are drawn
          const p = ctx ? ctx.getImageData(0, 0, Math.min(100, cvs.width), Math.min(100, cvs.height)).data : null;
          let nonZero = 0;
          if (p) {
            for (let i = 0; i < p.length; i++) {
              if (p[i] !== 0) nonZero++;
            }
          }
          return {
            cvsWidth: cvs ? cvs.width : null,
            cvsHeight: cvs ? cvs.height : null,
            cvsStyleWidth: cvs ? cvs.style.width : null,
            cvsStyleHeight: cvs ? cvs.style.height : null,
            nonZeroPixels: nonZero,
            totalPixels: p ? p.length : 0,
            hasWindowObjects: {
              InvertedPendulumPhysics: typeof window.InvertedPendulumPhysics,
              PendulumRenderer: typeof window.PendulumRenderer,
              StepManager: typeof window.StepManager
            }
          };
        })()
      `,
      returnByValue: true
    });

    console.log('RESULT:', JSON.stringify(res.result.value, null, 2));

    // screenshot
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    require('fs').writeFileSync('scratch/current_screen.png', Buffer.from(ss.data, 'base64'));
    console.log('Saved scratch/current_screen.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);

