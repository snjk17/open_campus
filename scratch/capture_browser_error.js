const { spawn } = require('child_process');
const http = require('http');

async function main() {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chrome = spawn(chromePath, [
    '--headless',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    'http://127.0.0.1:3000/index.html'
  ]);

  try {
    await new Promise(r => setTimeout(r, 1500));
    const tabs = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9226/json', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const pageTab = tabs.find(t => t.url.includes('3000'));
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    ws.addEventListener('message', (msg) => {
      const data = JSON.parse(msg.data);
      if (data.method === 'Runtime.exceptionThrown') {
        const ex = data.params.exceptionDetails;
        console.error('EX:', ex.text, ex.exception ? ex.exception.description : '', ex.stackTrace);
      }
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', data.params.type, data.params.args.map(a => a.value || a.description));
      }
    });

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
    await send('Page.enable');
    await send('Page.reload');

    await new Promise(r => setTimeout(r, 2000));
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(console.error);

