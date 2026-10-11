export const UNITS = ['g', 'kg', 'ml', 'l', 'ud'];
export const CATEGORIES = ['Verduras', 'Frutas', 'Legumbres', 'Cereales', 'Proteínas', 'Lácteos', 'Básicos'];
export const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
export function validItem(item) {
  if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80) throw new Error('Escribe un ingrediente de hasta 80 caracteres.');
  if (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0 || Number(item.quantity) > 100000) throw new Error('Revisa la cantidad (entre 0 y 100.000).');
  if (!UNITS.includes(item.unit)) throw new Error('Selecciona una unidad válida.');
  if (!CATEGORIES.includes(item.category)) throw new Error('Selecciona una categoría válida.');
  if (item.expires_on && (!/^\d{4}-\d{2}-\d{2}$/.test(item.expires_on) || Number.isNaN(Date.parse(item.expires_on)))) throw new Error('Revisa la fecha.');
  return { ...item, name: item.name.trim(), quantity: Number(item.quantity), expires_on: item.expires_on || null };
}
const base = { g: ['mass', 1], kg: ['mass', 1000], ml: ['volume', 1], l: ['volume', 1000], ud: ['count', 1] };
export function convert(quantity, from, to) {
  if (!base[from] || !base[to] || base[from][0] !== base[to][0]) return null;
  return quantity * base[from][1] / base[to][1];
}
export function localDay(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function expiry(item, today = localDay()) {
  if (!item.expires_on) return 'none';
  const days = Math.round((Date.parse(item.expires_on) - Date.parse(today)) / 86400000);
  return days < 0 ? 'past' : days <= 3 ? 'soon' : 'fresh';
}
export function ingredientStatus(ingredient, pantry, today = localDay()) {
  const candidates = pantry.filter(p => normalize(p.name) === normalize(ingredient.name) && p.quantity > 0 && expiry(p, today) !== 'past');
  const comparable = candidates.map(p => convert(p.quantity, p.unit, ingredient.unit)).filter(v => v !== null);
  const available = comparable.reduce((sum, v) => sum + v, 0);
  return { available, enough: available >= ingredient.quantity, present: candidates.length > 0, comparable: comparable.length > 0 };
}
export function recipeMatch(recipe, pantry) {
  const required = recipe.ingredients.filter(i => !i.optional);
  const present = required.filter(i => ingredientStatus(i, pantry).present).length;
  return { present, total: required.length, percent: required.length ? Math.round(present / required.length * 100) : 0 };
}
export function rankRecipes(recipes, pantry) { return [...recipes].sort((a,b) => recipeMatch(b,pantry).percent - recipeMatch(a,pantry).percent || a.minutes - b.minutes); }
export function deductionPreview(recipe, pantry) {
  let next = pantry.map(p => ({ ...p }));
  const warnings = [];
  for (const ingredient of recipe.ingredients) {
    let remaining = ingredient.quantity;
    const candidates = next.filter(p => normalize(p.name) === normalize(ingredient.name) && expiry(p) !== 'past' && convert(1,p.unit,ingredient.unit) !== null).sort((a,b) => (a.expires_on || '9999').localeCompare(b.expires_on || '9999'));
    for (const p of candidates) {
      const used = Math.min(p.quantity, convert(remaining,ingredient.unit,p.unit));
      p.quantity = Math.max(0,Math.round((p.quantity-used)*1000)/1000);
      remaining = Math.max(0, remaining-convert(used,p.unit,ingredient.unit));
    }
    if (remaining > 0.001 && !ingredient.optional) warnings.push(ingredient.name);
  }
  return { pantry: next, warnings };
}
export function parsePurchase(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length || lines.length > 40) throw new Error('Añade entre 1 y 40 líneas.');
  return lines.map((line, index) => {
    const parts = line.split(';').map(s => s.trim());
    if (parts.length !== 3) throw new Error(`Línea ${index + 1}: usa ingrediente;cantidad;unidad.`);
    return validItem({ name: parts[0], quantity: Number(parts[1].replace(',', '.')), unit: parts[2], category: 'Básicos', expires_on: null });
  });
}
