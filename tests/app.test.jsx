import React from 'react';
import {describe,it,expect,vi} from 'vitest';
import {render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
vi.mock('../src/lib/store.js',async importOriginal=>{
 const actual=await importOriginal();
 const session={user:{id:'test-user',email:'test@example.invalid'},access_token:'valid-test-token'};
 return {...actual,cloudStore:()=>actual.demoStore(),supabase:{auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user:session.user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}};
});
const go=async(user,name)=>user.click(within(screen.getByRole('navigation',{name:'Principal'})).getByRole('button',{name:new RegExp(name)}));
describe('Koomida user flows',()=>{
 it('shows the signed-in kitchen dashboard and opens its featured meal',async()=>{
  const user=userEvent.setup();render(<App/>);
  await screen.findByRole('heading',{name:/Bienvenido a tu cocina/i});
  expect(screen.getByRole('heading',{name:'Tu despensa hoy'})).toBeTruthy();
  expect(screen.getByText('para revisar pronto')).toBeTruthy();
  expect(document.querySelector('.home-dashboard .recipe-grid')).toBeNull();
  await user.click(screen.getByRole('button',{name:'Ver esta receta'}));
  expect(screen.getByRole('dialog')).toBeTruthy();
  await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Cerrar'}));
  await user.click(screen.getByRole('button',{name:/para revisar pronto/i}));
  expect(screen.getByRole('combobox',{name:'Filtrar despensa'}).value).toBe('Próximos');
 });
 it('creates, edits and deletes an ingredient; persists across reload',async()=>{
  const user=userEvent.setup();let view=render(<App/>);await screen.findByRole('heading',{name:/Bienvenido a tu cocina/i});await go(user,'Despensa');await user.click(screen.getByRole('button',{name:'Ingrediente',exact:true}));
  await user.type(screen.getByLabelText('Ingrediente', {exact:true}),'Manzana');const quantity=screen.getByLabelText('Cantidad');await user.clear(quantity);await user.type(quantity,'3');await user.click(screen.getByRole('button',{name:'Guardar ingrediente'}));await screen.findByText('Manzana');
  view.unmount();view=render(<App/>);await screen.findByRole('heading',{name:/Bienvenido a tu cocina/i});await go(user,'Despensa');expect(screen.getByText('Manzana')).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Editar Manzana'}));await user.clear(screen.getByLabelText('Cantidad'));await user.type(screen.getByLabelText('Cantidad'),'5');await user.click(screen.getByRole('button',{name:'Guardar ingrediente'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  await user.click(screen.getByRole('button',{name:'Eliminar Manzana'}));await user.click(screen.getByRole('button',{name:'Eliminar ingrediente'}));await waitFor(()=>expect(screen.queryByText('Manzana')).toBeNull());
 });
 it('stores favorites and requires explicit confirmation before deducting stock',async()=>{
  const user=userEvent.setup();render(<App/>);await screen.findByRole('heading',{name:/Bienvenido a tu cocina/i});await go(user,'Recetas');await user.click(screen.getByRole('button',{name:'Añadir a favoritos: Garbanzos al sol'}));await go(user,'Favoritos');expect(screen.getByRole('button',{name:'Garbanzos al sol',exact:true})).toBeTruthy();await user.click(screen.getByRole('button',{name:'Garbanzos al sol',exact:true}));await user.click(screen.getByRole('button',{name:'La he preparado'}));const confirm=screen.getByRole('button',{name:'Confirmar y descontar'});expect(confirm.disabled).toBe(true);await user.click(screen.getByRole('checkbox'));await user.click(confirm);await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());const pantry=JSON.parse(localStorage.getItem('koomida-demo-v1')).pantry;expect(pantry.find(i=>i.name==='Garbanzos cocidos').quantity).toBe(0);
 });
 it('reviews a purchase before changing pantry',async()=>{
  const user=userEvent.setup();render(<App/>);await screen.findByRole('heading',{name:/Bienvenido a tu cocina/i});await go(user,'Despensa');await user.click(screen.getByRole('button',{name:'Añadir compra'}));await user.type(screen.getByRole('textbox',{name:'Ingrediente; cantidad; unidad'}),'Brócoli; 400; g');await user.click(screen.getByRole('button',{name:'Revisar compra'}));expect(localStorage.getItem('koomida-demo-v1')).toBeNull();await user.click(screen.getByRole('button',{name:'Añadir 1 ingredientes'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(screen.getByText('Brócoli')).toBeTruthy();
 });
 it('removes excluded allergen recipes from browsing and favorites',async()=>{
  const user=userEvent.setup();render(<App/>);await screen.findByRole('heading',{name:/Bienvenido a tu cocina/i});await go(user,'Ajustes');await user.click(screen.getByRole('checkbox',{name:'gluten',exact:true}));await go(user,'Recetas');expect(screen.queryByRole('button',{name:'Pasta de la huerta',exact:true})).toBeNull();expect(screen.getByRole('button',{name:'Garbanzos al sol',exact:true})).toBeTruthy();
 });
 it('shows only catalog recipes without a local server',async()=>{
  const user=userEvent.setup();render(<App/>);await screen.findByRole('heading',{name:/Bienvenido a tu cocina/i});
  await go(user,'Recetas');expect(screen.getByRole('button',{name:'Garbanzos al sol',exact:true})).toBeTruthy();
  expect(screen.queryByText(/Ollama/i)).toBeNull();
 });
});
