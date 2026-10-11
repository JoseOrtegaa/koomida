import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
if(typeof window!=='undefined'){
 window.scrollTo=vi.fn();
 if(window.HTMLDialogElement){HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};}
 afterEach(()=>{cleanup();localStorage.clear();sessionStorage.clear();});
}
