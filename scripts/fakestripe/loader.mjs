// Lets plain Node load the app's lib/ and app/ files (extensionless imports, @/ paths). Used by money.mjs.
import { register } from 'node:module';
register('data:text/javascript,' + encodeURIComponent(`
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = ${JSON.stringify(new URL('../../', import.meta.url).pathname)};
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@/')) spec = pathToFileURL(ROOT + spec.slice(2)).href;
  if ((spec.startsWith('.') || spec.startsWith('file:')) && !/\\.(m?js|json|jsx)$/.test(spec)) {
    const base = new URL(spec, ctx.parentURL || pathToFileURL(ROOT).href);
    if (existsSync(fileURLToPath(base) + '.js')) spec = base.href + '.js';
  }
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.startsWith('file://' + ROOT) && !url.includes('/node_modules/') && url.endsWith('.js')) return next(url, { ...ctx, format: 'module' });
  return next(url, ctx);
}
`));
