export const ALLERGENS=['gluten','leche','huevo','pescado','crustáceos','moluscos','cacahuetes','frutos secos','soja','apio','mostaza','sésamo','altramuces','sulfitos'];
export const SAFETY_SOURCE='https://www.dsca.gob.es/es/consumo/novedades/recomendaciones/recomendaciones-alimentarias/alimentacion-embarazo';
export const AESAN_SOURCE='https://www.aesan.gob.es/AECOSAN/docs/documentos/para_consumidor/alimentacion_segura_embarazo.pdf';
export const safetyNotes=[
 'Lava manos, utensilios y verduras; separa alimentos crudos y cocinados.',
 'Usa lácteos pasteurizados. Cocina por completo carne, pescado y huevos; sigue los pasos de la receta.',
 'Comprueba etiqueta, conservación y caducidad. La app no puede comprobar el estado real del alimento.',
 'Los filtros se basan en los ingredientes de la receta: revisa también alérgenos y trazas del envase.',
];
export function eligibleRecipes(recipes,excluded=[]) { return recipes.filter(r=>r.reviewVersion&&Array.isArray(r.allergens)&&!r.allergens.some(a=>excluded.includes(a))); }

export function parseExclusions(value=''){const result=String(value).split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);if(result.some(v=>!ALLERGENS.includes(v)))throw new Error('Hay un alérgeno no reconocido en la configuración del hogar.');return [...new Set(result)];}
