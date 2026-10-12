// Browser zoom stays available; the installed Home Screen app keeps a fixed viewport.
const standalone=window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone===true;
if(standalone){
 const preventZoom=event=>event.preventDefault();
 document.addEventListener('gesturestart',preventZoom,{passive:false});
 document.addEventListener('gesturechange',preventZoom,{passive:false});
 document.addEventListener('touchmove',event=>{
  if(event.touches.length>1)event.preventDefault();
 },{passive:false});
}
