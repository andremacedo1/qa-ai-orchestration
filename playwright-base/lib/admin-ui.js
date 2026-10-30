// Navegacao do Admin Panorama (sprint). Menus: sistema (Vendas, Faturamento...) > item > subitem.
const L = require('./lib');
exports.login = async (page) => {
  const { SPRINT_URL, SPRINT_USER, SPRINT_PASS } = L.env;
  if (!SPRINT_URL || !SPRINT_USER || !SPRINT_PASS) throw new Error('Preencha SPRINT_URL/SPRINT_USER/SPRINT_PASS em ~/.claude/multiverse-qa/demo.env');
  if (!/sprint/i.test(SPRINT_URL)) throw new Error('SPRINT_URL nao parece ser sprint. Producao e so consulta: nao automatize escrita.');
  await page.goto(SPRINT_URL, { waitUntil: 'networkidle' });
  await page.fill('input[name=email]', SPRINT_USER);
  await page.fill('input[type=password]', SPRINT_PASS);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForTimeout(7000);
  await exports.dismiss(page);
};
// Fecha avisos "OK" que bloqueiam a tela
exports.dismiss = async (page) => {
  for (let i = 0; i < 3; i++) {
    const ok = page.getByRole('button', { name: 'OK', exact: true }).locator('visible=true').first();
    if (await ok.count() && await ok.isVisible().catch(() => false)) { await ok.click().catch(() => {}); await page.waitForTimeout(600); } else break;
  }
};
exports.sys = async (page, name) => {
  await exports.dismiss(page);
  await page.locator('a.item-menu-system').first().click(); await page.waitForTimeout(600);
  await page.locator('.item-menu-name:visible', { hasText: new RegExp('^' + name + '$') }).first().click();
  await page.waitForTimeout(1800);
};
exports.menu = async (page, ...caminho) => {
  await exports.dismiss(page);
  for (let i = 0; i < caminho.length; i++) {
    if (i < caminho.length - 1 && await page.locator('.item-menu-name:visible').filter({ hasText: new RegExp('^' + caminho[i + 1] + '$') }).count()) continue;
    const loc = page.locator('.item-menu-name:visible').filter({ hasText: new RegExp('^' + caminho[i] + '$') }).last();
    await loc.scrollIntoViewIfNeeded().catch(() => {}); await loc.hover().catch(() => {}); await page.waitForTimeout(300);
    await loc.click(); await page.waitForTimeout(1500);
  }
  await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
};
// Filtra o grid pelo campo "Codigo" e atualiza
exports.filtrarCodigo = async (page, codigo) => {
  await page.locator('input[type=text]:visible').nth(1).fill(String(codigo));
  await page.getByRole('button', { name: 'Atualizar' }).click(); await page.waitForTimeout(3500);
  return page.locator('tr', { hasText: String(codigo) }).first();
};
