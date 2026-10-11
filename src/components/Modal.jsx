import React,{useEffect,useRef} from 'react';
import Icon from './Icon.jsx';
export default function Modal({title,onClose,children,wide=false}) {
 const ref=useRef(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const dialog=ref.current,previous=document.activeElement;dialog.showModal();const cancel=e=>{e.preventDefault();close.current();};dialog.addEventListener('cancel',cancel);document.body.style.overflow='hidden';return()=>{dialog.removeEventListener('cancel',cancel);dialog.close();document.body.style.overflow='';previous?.focus();};},[]);
 return <dialog ref={ref} className={`modal ${wide?'wide':''}`} aria-labelledby="modal-title"><div className="modal-head"><h2 id="modal-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar"><Icon name="close"/></button></div>{children}</dialog>;
}
