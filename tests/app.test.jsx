import React from 'react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {snackIntent,snackRecipe,meatIntent,meatRecipe} from './aiFixtures.js';
import {recipes} from '../src/data/recipes.js';
import App from '../src/App.jsx';
const go=async(user,name)=>user.click(within(screen.getByRole('navigation',{name:'Principal'})).getByRole('button',{name:new RegExp(name)}));
describe('Koomida user flows',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 it('creates, edits and deletes an ingredient; persists across reload',async()=>{
  const user=userEvent.setup();let view=render(<App/>);await screen.findByText('¿Qué cocinamos');await go(user,'Despensa');await user.click(screen.getByRole('button',{name:'Ingrediente',exact:true}));
  await user.type(screen.getByLabelText('Ingrediente', {exact:true}),'Manzana');const quantity=screen.getByLabelText('Cantidad');await user.clear(quantity);await user.type(quantity,'3');await user.click(screen.getByRole('button',{name:'Guardar ingrediente'}));await screen.findByText('Manzana');
  view.unmount();view=render(<App/>);await screen.findByText('¿Qué cocinamos');await go(user,'Despensa');expect(screen.getByText('Manzana')).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Editar Manzana'}));await user.clear(screen.getByLabelText('Cantidad'));await user.type(screen.getByLabelText('Cantidad'),'5');await user.click(screen.getByRole('button',{name:'Guardar ingrediente'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  await user.click(screen.getByRole('button',{name:'Eliminar Manzana'}));await user.click(screen.getByRole('button',{name:'Eliminar ingrediente'}));await waitFor(()=>expect(screen.queryByText('Manzana')).toBeNull());
 });
 it('stores favorites and requires explicit confirmation before deducting stock',async()=>{
  const user=userEvent.setup();render(<App/>);await screen.findByText('¿Qué cocinamos');await go(user,'Recetas');await user.click(screen.getByRole('button',{name:'Añadir a favoritos: Garbanzos al sol'}));await go(user,'Favoritos');expect(screen.getByRole('button',{name:'Garbanzos al sol',exact:true})).toBeTruthy();await user.click(screen.getByRole('button',{name:'Garbanzos al sol',exact:true}));await user.click(screen.getByRole('button',{name:'La he preparado'}));const confirm=screen.getByRole('button',{name:'Confirmar y descontar'});expect(confirm.disabled).toBe(true);await user.click(screen.getByRole('checkbox'));await user.click(confirm);await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());const pantry=JSON.parse(localStorage.getItem('koomida-demo-v1')).pantry;expect(pantry.find(i=>i.name==='Garbanzos cocidos').quantity).toBe(0);
 });
 it('reviews a purchase before changing pantry',async()=>{
  const user=userEvent.setup();render(<App/>);await screen.findByText('¿Qué cocinamos');await go(user,'Despensa');await user.click(screen.getByRole('button',{name:'Añadir compra'}));await user.type(screen.getByRole('textbox',{name:'Ingrediente; cantidad; unidad'}),'Brócoli; 400; g');await user.click(screen.getByRole('button',{name:'Revisar compra'}));expect(localStorage.getItem('koomida-demo-v1')).toBeNull();await user.click(screen.getByRole('button',{name:'Añadir 1 ingredientes'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(screen.getByText('Brócoli')).toBeTruthy();
 });
 it('removes excluded allergen recipes from browsing and favorites',async()=>{
  const user=userEvent.setup();render(<App/>);await screen.findByText('¿Qué cocinamos');await go(user,'Ajustes');await user.click(screen.getByRole('checkbox',{name:'gluten',exact:true}));await go(user,'Recetas');expect(screen.queryByRole('button',{name:'Pasta de la huerta',exact:true})).toBeNull();expect(screen.getByRole('button',{name:'Garbanzos al sol',exact:true})).toBeTruthy();
 });
 it('sends the snack query and saved key, displays only model selections and lets you ask again',async()=>{
  const mock=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({recipes:[recipes.find(r=>r.id==='demo-avena')]}))).mockResolvedValueOnce(new Response(JSON.stringify({recipes:[]})));
  vi.stubGlobal('fetch',mock);sessionStorage.setItem('koomida-local-key','test-key');
  const user=userEvent.setup();render(<App/>);await screen.findByText('¿Qué cocinamos');await user.click(screen.getByRole('button',{name:'Pedir una idea'}));
  const dialog=within(screen.getByRole('dialog'));const input=dialog.getByRole('textbox');await user.type(input,'quiero un snack');await user.click(dialog.getByRole('button',{name:'Elegir con Ollama'}));
  const results=within(await screen.findByRole('region',{name:'Resultados de Ollama'}));expect(results.getByText('Buenos días, avena')).toBeTruthy();expect(results.queryByText('Garbanzos al sol')).toBeNull();expect(results.getByText(/No registrados: Copos de avena/)).toBeTruthy();
  expect(results.getByRole('button',{name:'Ver receta: Buenos días, avena'}).classList.contains('full')).toBe(false);
  expect(JSON.parse(mock.mock.calls[0][1].body).preferences).toBe('quiero un snack');expect(mock.mock.calls[0][1].headers['X-Koomida-Key']).toBe('test-key');
  await user.clear(input);await user.type(input,'un postre de chocolate');expect(screen.queryByRole('region',{name:'Resultados de Ollama'})).toBeNull();await user.click(dialog.getByRole('button',{name:'Elegir con Ollama'}));
  expect(await dialog.findByText(/No se pudieron generar opciones/)).toBeTruthy();expect(dialog.queryByText('Buenos días, avena')).toBeNull();
 });
 it('shows multiple model results in their order and opens the canonical recipe',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({recipes:[{id:'demo-pasta',steps:['invented']},{id:'demo-garbanzos'}]}))));
  const user=userEvent.setup();render(<App/>);await screen.findByText('¿Qué cocinamos');await user.click(screen.getByRole('button',{name:'Pedir una idea'}));await user.click(screen.getByRole('button',{name:'Elegir con Ollama'}));
  const results=within(await screen.findByRole('region',{name:'Resultados de Ollama'}));expect(results.getAllByRole('heading').map(h=>h.textContent)).toEqual(['Pasta de la huerta','Garbanzos al sol']);
  await user.click(results.getByRole('button',{name:'Ver receta: Pasta de la huerta'}));const detail=within(screen.getByRole('dialog'));expect(detail.getByText('Lava las verduras. Corta el calabacín en medias lunas y el tomate en dados.')).toBeTruthy();expect(detail.queryByText('invented')).toBeNull();
 });

 it('opens and cooks a generated snack with missing chocolate without adding it to stock',async()=>{
  const generated={...snackRecipe,id:'ai-test-snack',source:'ai'};
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({selection:'ollama-generated',intent:snackIntent,recipes:[generated]}))));
  const user=userEvent.setup();render(<App/>);await screen.findByText('¿Qué cocinamos');await user.click(screen.getByRole('button',{name:'Pedir una idea'}));await user.type(screen.getByRole('textbox'),'quiero un scnack de chocolate y frambuesa');await user.click(screen.getByRole('button',{name:'Elegir con Ollama'}));
  const results=within(await screen.findByRole('region',{name:'Resultados de Ollama'}));expect(results.getByText(/No registrados: Copos de avena, Chocolate negro, Frambuesas/)).toBeTruthy();
  await user.click(results.getByRole('button',{name:'Ver receta: Avena con chocolate y frambuesa'}));const detail=within(screen.getByRole('dialog'));expect(detail.getByText('PROPUESTA DE OLLAMA')).toBeTruthy();expect(detail.getByText(snackRecipe.steps[0])).toBeTruthy();
  await user.click(detail.getByRole('button',{name:'La he preparado'}));await user.click(detail.getByRole('checkbox'));await user.click(detail.getByRole('button',{name:'Confirmar y descontar'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  expect(JSON.parse(localStorage.getItem('koomida-demo-v1')).pantry.some(i=>i.name==='Chocolate negro')).toBe(false);
 });
 it('queries with an empty pantry for planned meat',async()=>{
  localStorage.setItem('koomida-demo-v1',JSON.stringify({pantry:[],favorites:[],saved:[]}));
  const mock=vi.fn().mockResolvedValue(new Response(JSON.stringify({selection:'ollama-generated',intent:meatIntent,recipes:[{...meatRecipe,id:'ai-meat'}]})));vi.stubGlobal('fetch',mock);
  const user=userEvent.setup();render(<App/>);await screen.findByText('¿Qué cocinamos');await user.click(screen.getByRole('button',{name:'Pedir una idea'}));const query=screen.getByRole('button',{name:'Elegir con Ollama'});expect(query.disabled).toBe(true);await user.type(screen.getByRole('textbox'),'Carne Molina');expect(query.disabled).toBe(false);await user.click(query);
  expect(await screen.findByRole('button',{name:'Ver receta: Carne picada con tomate'})).toBeTruthy();expect(JSON.parse(mock.mock.calls[0][1].body).pantry).toEqual([]);
 });

 it('deducts registered tomato and onion but never invents missing meat stock',async()=>{
  const pantry=[{id:'tomato',name:'Tomate',quantity:250,unit:'g',category:'Verduras',expires_on:null},{id:'onion',name:'Cebolla',quantity:2,unit:'ud',category:'Verduras',expires_on:null}];
  localStorage.setItem('koomida-demo-v1',JSON.stringify({pantry,favorites:[],saved:[]}));
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({selection:'ollama-generated',intent:meatIntent,recipes:[{...meatRecipe,id:'ai-meat'}]}))));
  const user=userEvent.setup();render(<App/>);await screen.findByText('¿Qué cocinamos');await user.click(screen.getByRole('button',{name:'Pedir una idea'}));await user.type(screen.getByRole('textbox'),'Carne Molina');await user.click(screen.getByRole('button',{name:'Elegir con Ollama'}));
  await user.click(await screen.findByRole('button',{name:'Ver receta: Carne picada con tomate'}));const detail=within(screen.getByRole('dialog'));await user.click(detail.getByRole('button',{name:'La he preparado'}));await user.click(detail.getByRole('checkbox'));await user.click(detail.getByRole('button',{name:'Confirmar y descontar'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  const stock=JSON.parse(localStorage.getItem('koomida-demo-v1')).pantry;expect(stock.map(i=>i.quantity)).toEqual([50,1]);expect(stock).toHaveLength(2);
 });

});
