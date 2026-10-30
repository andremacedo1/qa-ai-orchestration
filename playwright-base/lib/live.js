// Transmissão ao vivo do navegador do teste (MJPEG via CDP screencast) em 127.0.0.1:PORT (padrão 9333). Acesso só por túnel SSH.
// Uso: const live=require('./live'); await live.start(); await live.attach(page); live.status('texto'); await live.waitViewer(120);
const http = require('http');
const PORT = Number(process.env.LIVE_PORT || 9333);
let frame = null, clients = new Set(), status = 'aguardando', everConnected = false, srv = null;
const PAGE = `<!doctype html><meta charset=utf-8><title>Acompanhamento ao vivo</title>
<style>body{margin:0;background:#10141c;color:#e6e9f0;font:15px system-ui;display:flex;flex-direction:column;height:100vh}
#bar{padding:10px 16px;background:#171c27;border-bottom:1px solid #2a3140;display:flex;gap:12px;align-items:center}
#dot{width:10px;height:10px;border-radius:50%;background:#59c88a}#st{font-weight:600}
#w{flex:1;display:flex;align-items:center;justify-content:center;min-height:0}img{max-width:100%;max-height:100%;object-fit:contain}</style>
<div id=bar><span id=dot></span><span id=st>conectando…</span></div><div id=w><img id=v></div>
<script>var v=document.getElementById('v');function go(){v.src='/stream?'+Date.now()}v.onerror=function(){setTimeout(go,800)};go();
setInterval(function(){fetch('/status').then(function(r){return r.text()}).then(function(t){document.getElementById('st').textContent=t}).catch(function(){})},700)</script>`;
exports.start = () => new Promise(res => {
  srv = http.createServer((req, rsp) => {
    if (req.url.startsWith('/status')) { rsp.end(status); return; }
    if (req.url.startsWith('/stream')) {
      rsp.writeHead(200, {'Content-Type':'multipart/x-mixed-replace; boundary=f','Cache-Control':'no-cache','Connection':'close'});
      clients.add(rsp); everConnected = true; if (frame) push(rsp, frame);
      req.on('close', () => clients.delete(rsp)); return;
    }
    rsp.writeHead(200, {'Content-Type':'text/html; charset=utf-8'}); rsp.end(PAGE);
  });
  srv.on('error', e => { console.log('LIVE erro', e.code); res(); });
  srv.listen(PORT, '127.0.0.1', () => { console.log(`LIVE http://127.0.0.1:${PORT}`); res(); });
});
const push = (r, b) => { try { r.write(`--f\r\nContent-Type: image/jpeg\r\nContent-Length: ${b.length}\r\n\r\n`); r.write(b); r.write('\r\n'); } catch (e) {} };
exports.attach = async (page) => {
  const cdp = await page.context().newCDPSession(page);
  cdp.on('Page.screencastFrame', async f => { frame = Buffer.from(f.data, 'base64'); clients.forEach(c => push(c, frame)); cdp.send('Page.screencastFrameAck', {sessionId: f.sessionId}).catch(()=>{}); });
  await cdp.send('Page.startScreencast', {format:'jpeg', quality:65, maxWidth:1366, maxHeight:900, everyNthFrame:1});
};
exports.status = s => { status = s; };
exports.waitViewer = async (sec) => { const t = Date.now(); while (!clients.size && Date.now() - t < sec*1000) await new Promise(r => setTimeout(r, 500)); return clients.size > 0; };
exports.stop = () => new Promise(r => { clients.forEach(c => { try { c.end(); } catch(e){} }); srv ? srv.close(() => r()) : r(); setTimeout(r, 500); });
