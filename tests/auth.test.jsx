import React from 'react';
import {beforeEach,describe,it,expect,vi} from 'vitest';
import {render,screen,within,waitFor,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import {PasswordForm} from '../src/components/Forms.jsx';
const state=vi.hoisted(()=>({session:null,callback:null,load:vi.fn(),signIn:vi.fn(),signOut:vi.fn(),getUser:vi.fn(),updateUser:vi.fn()}));
vi.mock('../src/lib/store.js',()=>({
 cloudStore:()=>({load:state.load}),
 supabase:{auth:{
  getSession:async()=>({data:{session:state.session}}),
  getUser:state.getUser,
  updateUser:state.updateUser,
  onAuthStateChange:callback=>{state.callback=callback;return {data:{subscription:{unsubscribe(){}}}};},
  signInWithPassword:state.signIn,
  signOut:state.signOut,
 }}
}));
const session={user:{id:'account-a',email:'account-a@example.invalid'},access_token:'token-a'};
beforeEach(()=>{
 vi.clearAllMocks();state.session=null;state.callback=null;
 state.load.mockResolvedValue({pantry:[],favorites:[],saved:[]});
 state.getUser.mockResolvedValue({data:{user:session.user}});
 state.updateUser.mockResolvedValue({error:null});
 state.signOut.mockImplementation(async(options)=>{if(options?.scope==='others')return {error:null};state.session=null;state.callback('SIGNED_OUT',null);return {error:null};});
 state.signIn.mockImplementation(async()=>{state.session=session;state.callback('SIGNED_IN',session);return {data:{session}};});
});
describe('public and private boundaries',()=>{
 it('requires the current password before updating and revokes other refresh sessions',async()=>{
  state.signIn.mockResolvedValue({data:{session},error:null});
  const user=userEvent.setup();render(<PasswordForm onClose={()=>{}}/>);
  await user.type(screen.getByLabelText('Contraseña actual'),'old-test-only');
  await user.type(screen.getByLabelText('Nueva contraseña'),'new-test-only-strong');
  await user.type(screen.getByLabelText('Repetir nueva contraseña'),'new-test-only-strong');
  await user.click(screen.getByRole('button',{name:'Guardar contraseña'}));
  await screen.findByText(/Contraseña actualizada/);
  expect(state.signIn).toHaveBeenCalledWith({email:session.user.email,password:'old-test-only'});
  expect(state.updateUser).toHaveBeenCalledWith({password:'new-test-only-strong',current_password:'old-test-only'});
  expect(state.signOut).toHaveBeenCalledWith({scope:'others'});
 });
 it('never changes the password when current credentials are rejected',async()=>{
  state.signIn.mockResolvedValue({data:{session:null},error:new Error('invalid credentials')});
  const user=userEvent.setup();render(<PasswordForm onClose={()=>{}}/>);
  await user.type(screen.getByLabelText('Contraseña actual'),'wrong-test-only');
  await user.type(screen.getByLabelText('Nueva contraseña'),'new-test-only-strong');
  await user.type(screen.getByLabelText('Repetir nueva contraseña'),'new-test-only-strong');
  await user.click(screen.getByRole('button',{name:'Guardar contraseña'}));
  await screen.findByRole('alert');expect(state.updateUser).not.toHaveBeenCalled();
 });

 it('offers public recipes without loading or exposing private controls',async()=>{
  const user=userEvent.setup();render(<App/>);await screen.findByRole('button',{name:'Iniciar sesión'});
  for(const name of ['Despensa','Favoritos','Ajustes','Pedir una idea'])expect(screen.queryByRole('button',{name,exact:true})).toBeNull();
  expect(state.load).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button',{name:'Garbanzos al sol',exact:true}));
  expect(screen.queryByRole('button',{name:'La he preparado'})).toBeNull();
  expect(screen.queryByText(/No registrado:/)).toBeNull();
  await user.click(screen.getByRole('button',{name:'Entrar para cocinar con mi despensa'}));
  expect(screen.getByLabelText('Contraseña')).toBeTruthy();
 });
 it('explains rejected credentials and reveals the entered password on request',async()=>{
  state.signIn.mockResolvedValue({data:{session:null},error:{code:'invalid_credentials',status:400}});
  const user=userEvent.setup();render(<App/>);await user.click(await screen.findByRole('button',{name:'Iniciar sesión'}));
  await user.type(screen.getByLabelText('Correo electrónico'),'account-a@example.invalid');
  await user.type(screen.getByLabelText('Contraseña'),'wrong-test-only');
  await user.click(screen.getByRole('button',{name:'Mostrar contraseña'}));
  expect(screen.getByLabelText('Contraseña').type).toBe('text');
  await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Iniciar sesión'}));
  expect((await screen.findByRole('alert')).textContent).toContain('no coinciden');
  expect(state.signIn).toHaveBeenCalledWith({email:'account-a@example.invalid',password:'wrong-test-only'});
 });
 it('logs in, logs out and removes private UI and local pairing key',async()=>{
  const user=userEvent.setup();render(<App/>);await user.click(await screen.findByRole('button',{name:'Iniciar sesión'}));
  await user.type(screen.getByLabelText('Correo electrónico'),'account-a@example.invalid');await user.type(screen.getByLabelText('Contraseña'),'test-only-password');
  await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Iniciar sesión'}));
  await screen.findByText('¿Qué cocinamos');expect(state.load).toHaveBeenCalledOnce();
  sessionStorage.setItem('koomida-local-key','test-key');
  await user.click(within(screen.getByRole('navigation',{name:'Principal'})).getByRole('button',{name:'Ajustes'}));
  await user.click(screen.getByRole('button',{name:'Cerrar sesión'}));
  await screen.findByRole('button',{name:'Iniciar sesión'});expect(screen.queryByRole('navigation',{name:'Principal'})).toBeNull();
  expect(sessionStorage.getItem('koomida-local-key')).toBeNull();
 });
 it('fails closed for a cached session rejected by Auth',async()=>{
  state.session=session;state.getUser.mockResolvedValue({data:{user:null},error:new Error('expired')});
  render(<App/>);await screen.findByRole('button',{name:'Iniciar sesión'});expect(state.load).not.toHaveBeenCalled();
 });
 it('separates account preferences and clears private content when auth expires',async()=>{
  state.session=session;localStorage.setItem('koomida-preferences:account-a',JSON.stringify({excluded:['gluten'],model:'qwen3:4b'}));
  const user=userEvent.setup();render(<App/>);await screen.findByText('¿Qué cocinamos');
  await user.click(within(screen.getByRole('navigation',{name:'Principal'})).getByRole('button',{name:'Recetas'}));
  expect(screen.queryByRole('button',{name:'Pasta de la huerta',exact:true})).toBeNull();
  const next={user:{id:'account-b',email:'account-b@example.invalid'},access_token:'token-b'};
  await act(async()=>state.callback('SIGNED_IN',next));await screen.findByText('¿Qué cocinamos');
  await user.click(within(screen.getByRole('navigation',{name:'Principal'})).getByRole('button',{name:'Recetas'}));
  expect(screen.getByRole('button',{name:'Pasta de la huerta',exact:true})).toBeTruthy();
  await act(async()=>state.callback('SIGNED_OUT',null));
  await waitFor(()=>expect(screen.queryByRole('navigation',{name:'Principal'})).toBeNull());
 });
});
