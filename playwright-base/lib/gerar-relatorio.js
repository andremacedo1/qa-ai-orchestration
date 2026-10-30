#!/usr/bin/env node
// Gera o relatorio visual (HTML com capturas + videos, e PDF) de uma execucao do Playwright.
// Uso: node gerar-relatorio.js <pasta-da-execucao> --titulo "Titulo" [--subtitulo "texto"] [--saida <pasta>] [--max-mb 14]
// A pasta da execucao e a criada por lib.createRun (steps.json, shots/, video/). Saida padrao: <pasta>/relatorio.
// Publicar o HTML como Artifact e feito pelo Claude Code (ferramenta Artifact): copie a saida para a pasta scratchpad da sessao.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const L = require('./lib');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; };
const dir = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2].replace(/^~/, os.homedir())) : null;
if (!dir || !fs.existsSync(path.join(dir, 'steps.json'))) { console.log('Uso: node gerar-relatorio.js <pasta-da-execucao> --titulo "Titulo"\n(a pasta precisa ter steps.json)'); process.exit(1); }
const titulo = arg('titulo', 'Relatório de teste'), subtitulo = arg('subtitulo', '');
const out = path.resolve((arg('saida', path.join(dir, 'relatorio'))).replace(/^~/, os.homedir()));
const MAXB = Number(arg('max-mb', '14')) * 1024 * 1024;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ffmpegBin = () => {
  try { cp.execSync('ffmpeg -version', { stdio: 'ignore' }); return 'ffmpeg'; } catch (e) {}
  const base = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(base)) for (const d of fs.readdirSync(base).filter(d => d.startsWith('ffmpeg')).sort().reverse()) {
    const f = path.join(base, d, 'ffmpeg-linux'); if (fs.existsSync(f)) return f; }
  return null;
};
const ff = ffmpegBin();
const duracao = f => { try { const r = cp.spawnSync(ff, ['-i', f], { encoding: 'utf8' }).stderr; const m = r.match(/Duration: (\d+):(\d+):(\d+\.?\d*)/); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0; } catch (e) { return 0; } };

// videos: corta o inicio parado (offset gravado pelo LIVE) e comprime/divide para caber no limite do Artifact
const videos = [];
const prepararVideos = () => {
  const vd = path.join(dir, 'video'); if (!fs.existsSync(vd)) return;
  const arqs = fs.readdirSync(vd).filter(f => f.endsWith('.webm')).map(f => path.join(vd, f)).sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
  let n = 0;
  for (const f of arqs) {
    const off = fs.existsSync(f + '.offset') ? Math.max(0, parseFloat(fs.readFileSync(f + '.offset', 'utf8')) - 1) : 0;
    const dur = ff ? duracao(f) - off : 0;
    const tamanho = fs.statSync(f).size;
    if (!ff || (off === 0 && tamanho <= MAXB)) {
      if (tamanho > MAXB) console.log(`AVISO: ${path.basename(f)} tem ${(tamanho / 1e6).toFixed(1)} MB e nao ha ffmpeg para reduzir`);
      const dst = `video-${++n}.webm`; fs.copyFileSync(f, path.join(out, dst)); videos.push({ file: dst, dur }); continue;
    }
    const partes = Math.max(1, Math.ceil(tamanho / MAXB / 0.8));
    const durParte = dur / partes;
    const br = Math.max(150e3, Math.floor((MAXB * 8 * 0.85) / Math.max(durParte, 1)));
    for (let i = 0; i < partes; i++) {
      const dst = `video-${++n}.webm`;
      const args = ['-y', '-ss', String(off + i * durParte), '-t', String(durParte), '-i', f, '-c:v', 'libvpx', '-b:v', String(Math.min(br, 900e3)), '-an', path.join(out, dst)];
      cp.spawnSync(ff, args, { stdio: 'ignore' });
      if (fs.existsSync(path.join(out, dst))) videos.push({ file: dst, dur: durParte, parte: partes > 1 ? `${i + 1}/${partes}` : '' });
    }
  }
};

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const steps = JSON.parse(fs.readFileSync(path.join(dir, 'steps.json'), 'utf8'));
  prepararVideos();
  // capturas PNG -> JPEG (Chromium, sem dependencias extras)
  const browser = await L.chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage(); await page.goto('about:blank');
  const jpg = async (png) => page.evaluate(async (b64) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
    const w = Math.min(1100, im.width), h = Math.round(im.height * w / im.width);
    const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.74);
  }, fs.readFileSync(png).toString('base64'));
  const cards = [];
  for (const [i, s] of steps.entries()) {
    const f = path.join(dir, s.shot); const src = fs.existsSync(f) ? await jpg(f) : '';
    const lab = { ok: 'OK', alerta: 'Atenção', falha: 'Falha' }[s.tipo] || 'OK';
    cards.push(`<article class="step" data-t="${s.tipo}" id="p${i + 1}"><div class="shot">${src ? `<img loading="lazy" src="${src}" alt="Tela do passo ${i + 1}">` : ''}</div><div class="txt"><div class="meta"><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="pill ${s.tipo}">${lab}</span></div><h3>${esc(s.titulo)}</h3>${s.obs ? `<p>${esc(s.obs)}</p>` : ''}</div></article>`);
  }
  const cont = t => steps.filter(s => s.tipo === t).length;
  const atencao = steps.map((s, i) => ({ s, i })).filter(x => x.s.tipo !== 'ok');
  const t0 = new Date(steps[0].ts), t1 = new Date(steps[steps.length - 1].ts);
  const dur = Math.max(1, Math.round((t1 - t0) / 1000)); const durTxt = dur >= 60 ? `${Math.floor(dur / 60)} min ${dur % 60} s` : `${dur} s`;
  const css = fs.readFileSync(path.join(__dirname, 'relatorio.css'), 'utf8');
  const resultado = cont('falha') ? `${cont('falha')} falha(s) e ${cont('alerta')} ponto(s) de atenção em ${steps.length} passos.` : cont('alerta') ? `Concluído com ${cont('alerta')} ponto(s) de atenção em ${steps.length} passos.` : `Concluído sem falhas em ${steps.length} passos.`;
  const html = `<title>${esc(titulo)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
<style>${css}</style>
<div class="wrap">
<div class="eyebrow">Evidências de teste com Playwright · ${t0.toLocaleDateString('pt-BR')}</div>
<h1>${esc(titulo)}</h1>
${subtitulo ? `<p class="lead">${esc(subtitulo)}</p>` : ''}
<div class="result" style="${cont('falha') ? 'background:var(--bad-bg);color:var(--bad)' : cont('alerta') ? 'background:var(--warn-bg);color:var(--warn)' : ''}">${esc(resultado)}</div>
<div class="facts"><div class="fact"><b>Passos</b><span>${steps.length} (${cont('ok')} ok · ${cont('alerta')} atenção · ${cont('falha')} falhas)</span></div><div class="fact"><b>Duração</b><span>${durTxt}</span></div><div class="fact"><b>Vídeos</b><span>${videos.length}</span></div></div>
${atencao.length ? `<h2>Pontos de atenção</h2><ul class="att">${atencao.map(x => `<li><span class="pill ${x.s.tipo}">${x.s.tipo === 'falha' ? 'Falha' : 'Atenção'}</span><div><a href="#p${x.i + 1}">Passo ${x.i + 1}: ${esc(x.s.titulo)}</a>${x.s.obs ? `<span class="d">${esc(x.s.obs)}</span>` : ''}</div></li>`).join('')}</ul>` : ''}
${videos.length ? `<h2>Vídeo</h2><div class="vids">${videos.map((v, i) => `<figure><video controls preload="metadata" src="${v.file}"></video><figcaption>Gravação ${i + 1}${v.parte ? ` (parte ${v.parte})` : ''}${v.dur ? ` · ${Math.round(v.dur)} s` : ''}</figcaption></figure>`).join('')}</div>` : ''}
<h2>Passo a passo</h2>
<div class="tabs" role="group" aria-label="Filtrar passos"><button type="button" data-f="all" aria-pressed="true">Todos (${steps.length})</button><button type="button" data-f="alerta" aria-pressed="false">Atenção</button><button type="button" data-f="falha" aria-pressed="false">Falhas</button></div>
<div class="steps">${cards.join('')}</div>
</div>
<script>(function(){var b=document.querySelectorAll(".tabs button");b.forEach(function(x){x.addEventListener("click",function(){var f=x.dataset.f;b.forEach(function(y){y.setAttribute("aria-pressed",String(y===x))});document.querySelectorAll(".step").forEach(function(s){s.hidden=!(f==="all"||s.dataset.t===f)})})})})();</script>`;
  fs.writeFileSync(path.join(out, 'index.html'), html);
  // PDF (sem os videos)
  const pg = await browser.newPage(); await pg.emulateMedia({ media: 'print', colorScheme: 'light' });
  await pg.goto('file://' + path.join(out, 'index.html'), { waitUntil: 'load' }); await pg.waitForTimeout(1500);
  await pg.addStyleTag({ content: '.vids,.vids+*{} .vids{display:none}' });
  await pg.pdf({ path: path.join(out, 'relatorio.pdf'), format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
  await browser.close();
  const mb = f => (fs.statSync(path.join(out, f)).size / 1e6).toFixed(1) + ' MB';
  console.log('Relatorio em', out);
  for (const f of fs.readdirSync(out).sort()) console.log('  ', f, mb(f));
  console.log('Proximo passo: copie a pasta para o scratchpad da sessao e publique index.html (+ videos) como Artifact privado.');
})().catch(e => { console.log('ERRO', e.message.split('\n')[0]); process.exit(1); });
