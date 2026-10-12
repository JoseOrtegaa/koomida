import {ALLERGENS} from './safety.js';
import {normalize,UNITS} from './domain.js';
export const MEAL_TYPES=['snack','desayuno','comida','cena','cualquiera'];
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const object=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const strings=(v,max)=>Array.isArray(v)&&v.length<=max&&v.every(s=>text(s,80));
export function validateIntent(value){
 if(!object(value,['meal_type','required_ingredients','avoid_ingredients'])||!MEAL_TYPES.includes(value.meal_type)||!strings(value.required_ingredients,6)||!strings(value.avoid_ingredients,6))throw new Error('Ollama no interpretó correctamente tu petición. Vuelve a consultar.');
 return value;
}
const canonical=v=>normalize(v).replace(/carne (molida|molina)/g,'carne picada').replace(/frambuesas/g,'frambuesa');
export function ingredientMatches(name,wanted){
 const tokens=canonical(wanted).split(' ').filter(t=>!['de','del','con'].includes(t));
 const actual=canonical(name).split(' ');
 return tokens.length>0&&tokens.every(t=>actual.includes(t)||actual.includes(t+'s'));
}
// Extra detection helps catch undeclared common allergens; labels/traces still require a person.
const allergenPatterns={gluten:/\b(trigo|avena|pan|pasta|harina|cebada|centeno)\b/,leche:/\b(leche|yogur|yogurt|queso|mantequilla|nata)\b/,huevo:/\bhuevos?\b/,pescado:/\b(pescado|salmon|atun|merluza|sardina|bacalao)\b/,'crustáceos':/\b(gamba|gambas|langostino|cangrejo|camaron|camarones)\b/,moluscos:/\b(mejillon|mejillones|almeja|pulpo|calamar)\b/,cacahuetes:/\b(cacahuete|cacahuetes|mani)\b/,'frutos secos':/\b(almendra|almendras|nuez|nueces|avellana|pistacho|anacardo)\b/,soja:/\b(soja|tofu)\b/,apio:/\bapio\b/,mostaza:/\bmostaza\b/,'sésamo':/\b(sesamo|tahini)\b/,altramuces:/\baltramuces?\b/,sulfitos:/\b(vino|vinagre)\b/};
export function validateGeneratedRecipe(r,{intent,excluded=[],id='ai-preview'}={}){
 if(!object(r,['title','description','minutes','servings','meal_type','ingredients','steps','allergens'])||!text(r.title,100)||!text(r.description,350)||!Number.isInteger(r.minutes)||r.minutes<1||r.minutes>180||r.servings!==2||!MEAL_TYPES.includes(r.meal_type)||r.meal_type==='cualquiera'||!Array.isArray(r.ingredients)||r.ingredients.length<1||r.ingredients.length>16||!Array.isArray(r.steps)||r.steps.length<2||r.steps.length>8||!r.steps.every(s=>text(s,600))||!Array.isArray(r.allergens)||r.allergens.some(a=>!ALLERGENS.includes(a)))throw new Error('Ollama devolvió una receta incompleta. Vuelve a consultar.');
 for(const i of r.ingredients)if(!object(i,['name','quantity','unit','optional'])||!text(i.name,80)||!Number.isFinite(i.quantity)||i.quantity<=0||i.quantity>100000||!UNITS.includes(i.unit)||typeof i.optional!=='boolean')throw new Error('Ollama devolvió ingredientes no válidos. Vuelve a consultar.');
 if(new Set(r.ingredients.map(i=>normalize(i.name))).size!==r.ingredients.length)throw new Error('Ollama repitió ingredientes. Vuelve a consultar.');
 if(intent){
  if(intent.meal_type!=='cualquiera'&&r.meal_type!==intent.meal_type)throw new Error('La receta no coincide con el tipo de comida pedido. Vuelve a consultar.');
  for(const wanted of intent.required_ingredients)if(!r.ingredients.some(i=>!i.optional&&ingredientMatches(i.name,wanted)))throw new Error(`La propuesta no incluye ${wanted}. Vuelve a consultar.`);
  for(const avoid of intent.avoid_ingredients)if(r.ingredients.some(i=>ingredientMatches(i.name,avoid)))throw new Error(`La propuesta incluye ${avoid}, que pediste evitar. Vuelve a consultar.`);
 }
 const claims=normalize([r.title,r.description,...r.steps].join(' '));
 if(/\b(sin riesgos?|segur[oa]s? para (el embarazo|embarazadas)|garantiz[ao][a-z]*|apt[oa]s? para embarazadas)\b/.test(claims))throw new Error('La propuesta incluye una garantía de salud que no podemos verificar. Vuelve a consultar.');
 const names=normalize(r.ingredients.map(i=>i.name).join(' '));
 const allergens=[...new Set([...r.allergens,...Object.entries(allergenPatterns).filter(([,pattern])=>pattern.test(names)).map(([a])=>a)])];
 if(allergens.some(a=>excluded.includes(a)))throw new Error('La propuesta contiene un alérgeno excluido. Prueba otra petición compatible con tus filtros.');
 if(/\b(alcohol|vino|cerveza|ron|licor|leche cruda|atun rojo|pez espada|tiburon|lucio|brotes crudos)\b/.test(names)||/\b(tartar|carpaccio|sushi|ceviche|huevo crudo|carne cruda|carne poco hecha)\b/.test(normalize([r.title,...r.steps].join(' '))))throw new Error('La propuesta no cumple las precauciones de preparación de Koomida. Prueba otra petición.');
 return {...r,id,source:'ai',reviewVersion:null,allergens,mealTypes:[r.meal_type],category:r.meal_type==='snack'?'Snacks':r.meal_type==='desayuno'?'Desayunos':'Ideas de Ollama',art:['snack','desayuno'].includes(r.meal_type)?'oats':'bowl'};
}
const arrayStrings={type:'array',maxItems:6,items:{type:'string',minLength:1,maxLength:80}};
export const intentSchema={type:'object',additionalProperties:false,required:['meal_type','required_ingredients','avoid_ingredients'],properties:{meal_type:{type:'string',enum:MEAL_TYPES},required_ingredients:arrayStrings,avoid_ingredients:arrayStrings}};
const recipeProperties={title:{type:'string',minLength:1,maxLength:100},description:{type:'string',minLength:1,maxLength:350},minutes:{type:'integer',minimum:1,maximum:180},servings:{type:'integer',enum:[2]},meal_type:{type:'string',enum:MEAL_TYPES.filter(t=>t!=='cualquiera')},ingredients:{type:'array',minItems:1,maxItems:16,items:{type:'object',additionalProperties:false,required:['name','quantity','unit','optional'],properties:{name:{type:'string',minLength:1,maxLength:80},quantity:{type:'number',exclusiveMinimum:0,maximum:100000},unit:{type:'string',enum:UNITS},optional:{type:'boolean'}}}},steps:{type:'array',minItems:2,maxItems:8,items:{type:'string',minLength:1,maxLength:600}},allergens:{type:'array',maxItems:14,uniqueItems:true,items:{type:'string',enum:ALLERGENS}}};
export const generationSchema={type:'object',additionalProperties:false,required:['recipes'],properties:{recipes:{type:'array',minItems:1,maxItems:2,items:{type:'object',additionalProperties:false,required:Object.keys(recipeProperties),properties:recipeProperties}}}};
