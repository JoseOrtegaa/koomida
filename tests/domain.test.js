import {describe,it,expect} from 'vitest';
import {convert,ingredientStatus,deductionPreview,parsePurchase,recipeMatch,expiry} from '../shared/domain.js';
import {recipes,demoPantry} from '../src/data/recipes.js';
import {eligibleRecipes} from '../shared/safety.js';
import {uuid} from '../shared/uuid.js';
const item=(id,quantity,unit='g',expires_on=null)=>({id,name:'Tomate',quantity,unit,expires_on,category:'Verduras'});
describe('inventory approximations',()=>{
 it('converts only compatible quantities',()=>{expect(convert(1,'kg','g')).toBe(1000);expect(convert(500,'ml','l')).toBe(.5);expect(convert(1,'ud','g')).toBeNull();});
 it('combines lots and excludes expired items',()=>{const result=ingredientStatus({name:'Tomate',quantity:600,unit:'g'},[item('1',.5,'kg'),item('2',150),item('3',900,'g','2020-01-01')]);expect(result.available).toBe(650);expect(result.enough).toBe(true);});
 it('deducts soonest lot first and never crosses dimensional units',()=>{const pantry=[item('later',1,'kg','2099-02-01'),item('first',250,'g','2099-01-01'),item('count',2,'ud'),item('expired',250,'g','2020-01-01')];const {pantry:next,warnings}=deductionPreview({ingredients:[{name:'Tomate',quantity:400,unit:'g'}]},pantry);expect(next.map(i=>i.quantity)).toEqual([.85,0,2,250]);expect(warnings).toEqual([]);expect(pantry[0].quantity).toBe(1);});
 it('never creates negative inventory when stock is missing',()=>{const result=deductionPreview({ingredients:[{name:'Tomate',quantity:900,unit:'g'}]},[item('1',200)]);expect(result.pantry[0].quantity).toBe(0);expect(result.warnings).toEqual(['Tomate']);});
 it('distinguishes approximate presence from enough quantity',()=>{expect(recipeMatch({ingredients:[{name:'Tomate',quantity:500,unit:'g'}]},[item('1',1,'ud')]).percent).toBe(100);expect(ingredientStatus({name:'Tomate',quantity:500,unit:'g'},[item('1',1,'ud')]).enough).toBe(false);});
 it('validates a purchase without accepting malformed rows',()=>{expect(parsePurchase('Tomate;0,5;kg')[0].quantity).toBe(.5);expect(()=>parsePurchase('Tomate;-1;g')).toThrow();expect(()=>parsePurchase('Tomate;2;bananas')).toThrow();expect(()=>parsePurchase('Tomate;2')).toThrow();expect(()=>parsePurchase(Array(41).fill('Tomate;1;g').join('\n'))).toThrow();});
 it('handles same-day dates consistently',()=>{expect(expiry(item('1',1,'g','2026-10-11'),'2026-10-11')).toBe('soon');expect(expiry(item('1',1,'g','2026-10-10'),'2026-10-11')).toBe('past');});
 it('provides usable demo recipes and separates allergen restrictions',()=>{expect(recipeMatch(recipes[0],demoPantry()).percent).toBe(100);expect(eligibleRecipes(recipes,['gluten','huevo','leche']).map(r=>r.id)).not.toContain('demo-pasta');expect(eligibleRecipes([{...recipes[0],reviewVersion:null}],[])).toEqual([]);});
 it('creates UUIDs without crypto.randomUUID (iPhone LAN HTTP)',()=>{expect(uuid()).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);expect(uuid()).not.toBe(uuid());});
});
