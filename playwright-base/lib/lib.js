// Helpers do fluxo de QA com Playwright. Credenciais so de ~/.claude/multiverse-qa/demo.env (nunca no codigo).
const path = require('path'), os = require('os'), fs = require('fs');
const BASE = path.join(os.homedir(), '.claude', 'multiverse-qa');
const { chromium } = require(path.join(BASE, 'playwright', 'node_modules', 'playwright-core'));

exports.chromium = chromium;
exports.env = (() => {
  const f = path.join(BASE, 'demo.env');
  if (!fs.existsSync(f)) return {};
  return Object.fromEntries(fs.readFileSync(f, 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
})();

// Abre navegador e contexto. opts: { video: true, mobile: true, slowMo: ms, viewport, storageState }
// Visualizacao:
//   HEADED=1  abre a janela do navegador (so em maquina com tela, ex.: seu notebook)
//   CDP_URL=http://127.0.0.1:9222  usa o Chrome do seu computador (CDP_WAIT=<seg> espera o tunel abrir, padrao 120)
//   LIVE=1    transmite o navegador para 127.0.0.1:9333 (servidor sem tela; veja por tunel SSH). LIVE_WAIT=<seg> espera alguem conectar (padrao 180)
let _live = null;
exports.open = async (run, opts = {}) => {
  const live = !!process.env.LIVE, headed = !!process.env.HEADED;
  const slow = opts.slowMo || Number(process.env.SLOWMO || (live || headed || process.env.CDP_URL ? 400 : 0));
  let browser;
  if (process.env.CDP_URL) {
    // Controla o Chrome do SEU computador (aberto com --remote-debugging-port e ligado ao servidor por tunel reverso)
    const url = process.env.CDP_URL.replace(/\/$/, ''), espera = Number(process.env.CDP_WAIT || 120), t = Date.now();
    console.log(`NAVEGADOR REMOTO: aguardando o Chrome em ${url} (ate ${espera}s)...`);
    let ok = false;
    while (!ok && Date.now() - t < espera * 1000) {
      try { ok = (await fetch(url + '/json/version')).ok; } catch (e) { await new Promise(r => setTimeout(r, 2000)); }
    }
    if (!ok) throw new Error(`Nao consegui falar com o Chrome em ${url}. Confira se o Chrome esta aberto com --remote-debugging-port=9222 e se o tunel reverso esta ativo.`);
    browser = await chromium.connectOverCDP(url, { slowMo: slow });
    console.log('NAVEGADOR REMOTO: conectado, o teste vai aparecer na janela do seu Chrome');
  } else {
    browser = await chromium.launch({ headless: !headed, args: ['--no-sandbox'], slowMo: slow });
  }
  const ctxOpts = { locale: 'pt-BR', ignoreHTTPSErrors: true, viewport: opts.viewport || { width: 1366, height: 850 } };
  if (opts.mobile) Object.assign(ctxOpts, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1' });
  if (opts.video !== false) ctxOpts.recordVideo = { dir: path.join(run.dir, 'video'), size: ctxOpts.viewport };
  if (opts.storageState && fs.existsSync(opts.storageState)) ctxOpts.storageState = opts.storageState;
  const t0 = Date.now();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  if (live) {
    const port = process.env.LIVE_PORT || 9333;
    _live = require('./live');
    await _live.start(); await _live.attach(page);
    browser.on('disconnected', () => { _live && _live.stop(); });
    _live.status('Aguardando voce abrir o acompanhamento...');
    console.log(`AO VIVO: no seu computador rode  ssh -L ${port}:127.0.0.1:${port} SEU_USUARIO@IP_DO_SERVIDOR  e abra http://localhost:${port}`);
    const ok = await _live.waitViewer(Number(process.env.LIVE_WAIT || 180));
    console.log(ok ? 'AO VIVO: acompanhamento conectado' : 'AO VIVO: ninguem conectou, seguindo sem acompanhamento');
    _live.status('Iniciando o teste'); await page.waitForTimeout(1500);
    // o video comeca antes da espera: guarda o inicio util para o gerar-relatorio cortar o trecho parado
    try { const vp = await page.video().path(); fs.writeFileSync(vp + '.offset', String((Date.now() - t0) / 1000)); } catch (e) {}
  }
  return { browser, ctx, page };
};

// Uma execucao registra passos (titulo, observacao, status, captura) em ~/qa-out/<nome>/steps.json
exports.createRun = (name) => {
  const dir = path.join(process.env.QA_OUT || path.join(os.homedir(), 'qa-out'), name);
  fs.mkdirSync(path.join(dir, 'shots'), { recursive: true });
  const stepsFile = path.join(dir, 'steps.json');
  const steps = fs.existsSync(stepsFile) ? JSON.parse(fs.readFileSync(stepsFile)) : [];
  return {
    dir,
    // tipo: ok | alerta | falha
    step: async (page, id, titulo, obs = '', tipo = 'ok') => {
      const shot = `shots/${id}.png`;
      await page.screenshot({ path: path.join(dir, shot) }).catch(() => {});
      steps.push({ id, titulo, obs, tipo, url: page.url(), shot, ts: new Date().toISOString() });
      fs.writeFileSync(stepsFile, JSON.stringify(steps, null, 1));
      if (_live) _live.status(`${id} · ${titulo}`);
      console.log(`[${tipo}] ${id} ${titulo} ${obs}`);
    },
  };
};

// Espera real (digitacao com mascara exige keyboard.type, nao fill)
exports.digitar = async (page, selector, texto) => { await page.click(selector); await page.keyboard.type(texto, { delay: 40 }); };
