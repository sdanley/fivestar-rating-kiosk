// Consolidated kiosk application script
(function(){
  const docEl=document.documentElement;
  const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent);
  // Global CAPTURE phase multi-touch guard (extra layer if default listeners race)
  ['touchstart','touchmove'].forEach(t=>{
    window.addEventListener(t,e=>{ if(e.touches && e.touches.length>1){ e.preventDefault(); } },{passive:false,capture:true});
  });
  // Pointer capture phase guard (covers some iPadOS edge cases)
  ['pointerdown','pointermove'].forEach(t=>{
    window.addEventListener(t,e=>{ if(e.pointerType==='touch' && e.isPrimary===false){ e.preventDefault(); } },{passive:false,capture:true});
  });
  // Kiosk zoom suppression (moved from index.html): prevent pinch, ctrl+wheel, double-tap
  window.addEventListener('wheel',e=>{ if(e.ctrlKey){ e.preventDefault(); } },{passive:false});
  if(isIOS){
    // Block native gesture events
    ['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
    // Block multi-touch start & move (pinch) early
    document.addEventListener('touchstart',e=>{ if(e.touches.length>1) e.preventDefault(); },{passive:false});
    document.addEventListener('touchmove',e=>{ if(e.touches.length>1) e.preventDefault(); },{passive:false});
    // Pointer-based multi-touch suppression (covers iPadOS PointerEvents path)
    (function(){
      const active=new Set();
      function clear(id){active.delete(id);}    
      window.addEventListener('pointerdown',e=>{active.add(e.pointerId); if(active.size>1){ e.preventDefault(); }},{passive:false});
      window.addEventListener('pointermove',e=>{ if(active.size>1){ e.preventDefault(); } },{passive:false});
      window.addEventListener('pointerup',e=>clear(e.pointerId),{passive:true});
      window.addEventListener('pointercancel',e=>clear(e.pointerId),{passive:true});
      window.addEventListener('pointerout',e=>clear(e.pointerId),{passive:true});
    })();
    // Double‑tap zoom guard
    let lastTouchEnd=0;document.addEventListener('touchend',e=>{const now=Date.now();if(now-lastTouchEnd<=400){e.preventDefault();}lastTouchEnd=now;},true);
    // Hard viewport lock & rotation zoom mitigation
    (function(){
      const vp=document.querySelector('meta[name=viewport]');
      if(!vp)return;
      const BASE='width=device-width,initial-scale=1,viewport-fit=cover';
      function hardLock(){
        vp.setAttribute('content', BASE+',maximum-scale=1,minimum-scale=1,user-scalable=no');
      }
      function softUnlock(){
        // Slight wiggle to defeat iOS auto text zoom heuristics then relock
        vp.setAttribute('content', BASE+',maximum-scale=1.001,minimum-scale=0.999,user-scalable=no');
      }
      // Initial enforced lock (repeat a few times to override late Safari adjustments)
      hardLock();[60,120,240,400,650,900].forEach(t=>setTimeout(hardLock,t));
      // Orientation: briefly unlock then relock
      window.addEventListener('orientationchange',()=>{
        softUnlock();
        // Multiple relocks to catch delayed adjustments
        [80,160,240,320,480,640,900].forEach(t=>setTimeout(hardLock,t));
      },{passive:true});
      // Visual viewport scale watcher
      if(window.visualViewport){
        const vv=window.visualViewport;
        vv.addEventListener('resize',()=>{
          if(Math.abs(vv.scale-1)>0.005){ hardLock(); }
        },{passive:true});
      }
      // Fallback periodic guard (lightweight)
      let guardRuns=0;const guard=setInterval(()=>{guardRuns++;hardLock();if(guardRuns>12)clearInterval(guard);},2500);
      document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') hardLock(); });
    })();
  }
  // (stray brace & duplicate wheel listener removed)
  document.addEventListener('contextmenu',e=>e.preventDefault(),{capture:true});
  document.body.classList.add('kiosk-no-select');
  try{history.replaceState({kiosk:true},'',location.href);history.pushState({kiosk:true},'',location.href);}catch{}
  window.addEventListener('popstate',e=>{if(!e.state||!e.state.kiosk){try{history.pushState({kiosk:true},'',location.href);}catch{}}});
  document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a');if(!a)return;const href=a.getAttribute('href');if(!href||href.startsWith('#'))return;try{const url=new URL(href,location.href);if(url.origin!==location.origin){e.preventDefault();}}catch{e.preventDefault();}});
  let touchStartY=null,maybePull=false;document.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;touchStartY=e.touches[0].clientY;maybePull=(window.scrollY===0);},{passive:true});
  document.addEventListener('touchmove',e=>{if(e.touches.length!==1)return;if(maybePull){const dy=e.touches[0].clientY-touchStartY;if(dy>10){e.preventDefault();}}},{passive:false});
  function rawVH(){return window.visualViewport?visualViewport.height:window.innerHeight;}
  function applyVH(){const h=rawVH();docEl.style.setProperty('--vh',h+'px');document.body.style.minHeight='var(--vh)';}
  let ticking=false;function scheduleVH(){if(ticking)return;ticking=true;requestAnimationFrame(()=>{ticking=false;applyVH();});}
  applyVH();['resize','orientationchange'].forEach(ev=>window.addEventListener(ev,()=>{setTimeout(scheduleVH,ev==='orientationchange'?250:40);},{passive:true}));
  if(window.visualViewport){visualViewport.addEventListener('resize',()=>setTimeout(scheduleVH,35));}
  const ua=navigator.userAgent;const isiPad=/iPad/.test(ua)||( /(Macintosh).*Version\/.*Safari/.test(ua)&&navigator.maxTouchPoints>1);
  if(isiPad){docEl.classList.add('ios-tablet','full-bleed');[300,900,1600,3000].forEach(t=>setTimeout(applyVH,t));let last=rawVH();setInterval(()=>{const cur=rawVH();if(Math.abs(cur-last)>25){last=cur;applyVH();}},3500);}    
  function enforceVH(){const h=rawVH();if(h>0){docEl.style.setProperty('--vh',h+'px');document.body.style.height='var(--vh)';}}
  ['resize','orientationchange'].forEach(e=>window.addEventListener(e,()=>setTimeout(enforceVH,e==='orientationchange'?300:60),{passive:true}));
  if(window.visualViewport)visualViewport.addEventListener('resize',()=>setTimeout(enforceVH,40));
  if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW reg failed',e));}
  const themeToggle=document.getElementById('themeToggle');
  const fsToggle=document.getElementById('fsToggle');
  function setButtonIcon(btn,pathDefs){const svgNS='http://www.w3.org/2000/svg';const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','28');svg.setAttribute('height','28');svg.setAttribute('aria-hidden','true');pathDefs.forEach(def=>{const p=document.createElementNS(svgNS,'path');Object.entries(def).forEach(([k,v])=>p.setAttribute(k,v));svg.appendChild(p);});btn.replaceChildren(svg);}  
  function themeIcon(){const light=docEl.classList.contains('theme-light');if(light){setButtonIcon(themeToggle,[{d:"M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79z",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linejoin":"round","stroke-linecap":"round"}]);}else{setButtonIcon(themeToggle,[{d:"M12 1v2",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M12 21v2",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M4.22 4.22 5.64 5.64",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M18.36 18.36l1.42 1.42",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M1 12h2",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M21 12h2",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M4.22 19.78l1.42-1.42",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M18.36 5.64l1.42-1.42",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z",fill:"none",stroke:"currentColor","stroke-width":"2"}]);}}
  function fsIcon(){const fs=document.fullscreenElement||document.webkitFullscreenElement;if(fs){setButtonIcon(fsToggle,[{d:"M9 9l-4-4",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M5 5h5",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M5 5v5",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M15 15l4 4",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M19 19h-5",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M19 19v-5",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M9 15l-4 4",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M5 19h5",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M5 19v-5",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M15 9l4-4",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M19 5h-5",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M19 5v5",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}]);}else{setButtonIcon(fsToggle,[{d:"M8 3H5a2 2 0 0 0-2 2v3",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M3 16v3a2 2 0 0 0 2 2h3",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M16 3h3a2 2 0 0 1 2 2v3",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"},{d:"M21 16v3a2 2 0 0 1-2 2h-3",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}]);}}
  const storedTheme=localStorage.getItem('standalone-theme');if(storedTheme==='light')docEl.classList.add('theme-light');
  themeIcon();fsIcon();
  themeToggle.addEventListener('click',()=>{docEl.classList.toggle('theme-light');localStorage.setItem('standalone-theme',docEl.classList.contains('theme-light')?'light':'dark');themeIcon();});
  fsToggle.addEventListener('click',()=>{const fs=document.fullscreenElement||document.webkitFullscreenElement;if(!fs){const r=document.documentElement;(r.requestFullscreen||r.webkitRequestFullscreen).call(r);}else{(document.exitFullscreen||document.webkitExitFullscreen).call(document);}});
  document.addEventListener('fullscreenchange',fsIcon);
  const qs=new URLSearchParams(location.search);const idParam=qs.get('m')?.trim()||'';
  const heading=document.getElementById('headingMain');
  const subtitle=document.getElementById('subtitle');
  const yourLabel=document.getElementById('yourLabel');
  const idInputWrapper=document.getElementById('idInputWrapper');
  const idInput=document.getElementById('idInput');
  const startBtn=document.getElementById('startBtn');
  const starsContainer=document.getElementById('starsContainer');
  const avgLine=document.getElementById('avgLine');
  const avgStars=document.getElementById('avgStars');
  const averageBlock=document.getElementById('averageBlock');
  const liveAnnouncer=document.getElementById('liveAnnouncer');
  const statusDiv=document.getElementById('status');
  const STAR_COUNT=5; let currentId=''; let selected=0; let hoverVal=0; let pending=0;
  function storageKey(id){return `rating:mattress:${id}`}
  function loadAgg(id){try{const raw=localStorage.getItem(storageKey(id));if(!raw)return{count:0,total:0,buckets:[0,0,0,0,0]};const p=JSON.parse(raw);if(!Array.isArray(p.buckets)||p.buckets.length!==5)p.buckets=[0,0,0,0,0];if(typeof p.count!== 'number'||typeof p.total!=='number')return{count:0,total:0,buckets:[0,0,0,0,0]};return p;}catch{return{count:0,total:0,buckets:[0,0,0,0,0]};}}
  function saveAgg(id,a){localStorage.setItem(storageKey(id),JSON.stringify(a))}
  function record(id,stars){const a=loadAgg(id);a.count++;a.total+=stars;a.buckets[stars-1]++;saveAgg(id,a);return a;}
  function fmtAvg(c,t){if(c===0)return{txt:'--',v:0};const v=t/c;return{txt:v.toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1'),v};}
  function buildStars(){starsContainer.innerHTML='';for(let i=1;i<=STAR_COUNT;i++){const b=document.createElement('button');b.className='star-btn';b.type='button';b.setAttribute('data-star',String(i));b.setAttribute('role','radio');b.setAttribute('aria-label',`${i} star${i>1?'s':''}`);b.setAttribute('aria-checked','false');b.addEventListener('pointerenter',()=>{hoverVal=i;paintStars();});b.addEventListener('pointerleave',()=>{hoverVal=0;paintStars();});b.addEventListener('click',()=>{if(!currentId){flash('Enter a name first.',true);return;}commitRating(i);});const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('star');const gBase=document.createElementNS('http://www.w3.org/2000/svg','g');gBase.classList.add('star-base');const baseUse=document.createElementNS('http://www.w3.org/2000/svg','use');baseUse.setAttribute('href','#star-shape');gBase.appendChild(baseUse);const gFill=document.createElementNS('http://www.w3.org/2000/svg','g');gFill.classList.add('star-fill');const fillUse=document.createElementNS('http://www.w3.org/2000/svg','use');fillUse.setAttribute('href','#star-shape');gFill.appendChild(fillUse);svg.append(gBase,gFill);b.append(svg);starsContainer.append(b);}}
  function commitRating(val){selected=val;pending=0;const agg=record(currentId,val);flash('Saved!',false);updateUI(agg);setTimeout(()=>{selected=0;paintStars();},2600);paintStars();if(kbdHint){kbdHint.classList.add('hidden');}}
  function paintStars(){[...starsContainer.children].forEach((b,idx)=>{const star=idx+1;const fill=b.querySelector('.star-fill');const active=(hoverVal?star<=hoverVal:(pending?star<=pending:(selected&&star<=selected)));if(fill)fill.style.opacity=active?'1':'0';b.classList.toggle('on',selected&&star<=selected);b.classList.toggle('pending',pending&&star<=pending&&!selected);b.setAttribute('aria-checked',selected===star?'true':'false');if(pending===star&&!selected)b.setAttribute('aria-checked','true');});}
  let fractionalRenderRun=0;function renderFractional(v){avgStars.innerHTML='';fractionalRenderRun++;const run=fractionalRenderRun;for(let i=1;i<=STAR_COUNT;i++){const frac=Math.min(Math.max(v-(i-1),0),1);const wrap=document.createElement('div');wrap.className='fraction-wrap';wrap.dataset.frac=String(frac);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');if(frac<=0){svg.innerHTML=`<use href='#star-shape' fill='none' stroke='var(--outline)' stroke-width='2'></use>`;}else if(frac>=1){svg.innerHTML=`<use href='#star-shape' fill='var(--accent)'></use><use href='#star-shape' fill='none' stroke='var(--accent)' stroke-width='2'></use>`;}else{const fw=(24*frac).toFixed(3);const cf=`clipF_${run}_${i}`;svg.innerHTML=`<defs><clipPath id='${cf}'><rect width='${fw}' height='24'></rect></clipPath></defs><use href='#star-shape' fill='none' stroke='var(--outline)' stroke-width='2'></use><g clip-path='url(#${cf})'><use href='#star-shape' fill='var(--accent)'></use><use href='#star-shape' fill='none' stroke='var(--accent)' stroke-width='2'></use></g>`;}wrap.append(svg);avgStars.append(wrap);}}
  function updateUI(agg){const {txt,v}=fmtAvg(agg.count,agg.total);heading.textContent=currentId;subtitle.classList.add('hidden');yourLabel.classList.remove('hidden');const ratingCount=agg.count?`with ${agg.count} Rating${agg.count===1?'':'s'}`:'be the first to rate';avgLine.innerHTML=`${txt} out of 5 Stars <small>${ratingCount}</small>`;renderFractional(v);averageBlock.classList.remove('hidden');starsContainer.classList.remove('hidden');document.querySelector('.panel')?.classList.add('rating-active');liveAnnouncer.textContent=agg.count?`Average ${txt} stars from ${agg.count} rating${agg.count===1?'':'s'}.`:'No ratings yet.';}
  function flash(msg,err){if(statusDiv){statusDiv.textContent=msg;statusDiv.style.color=err?'var(--danger)':'var(--accent)';if(!err)setTimeout(()=>{if(statusDiv.textContent===msg)statusDiv.textContent='';},2000);}if(liveAnnouncer){liveAnnouncer.textContent=msg;}}
  function initId(id){currentId=id;localStorage.setItem('last-product-name',id);buildStars();updateUI(loadAgg(id));paintStars();}
  const last=localStorage.getItem('last-product-name');if(!idParam){idInputWrapper.classList.remove('hidden');if(last)idInput.value=last;}if(idParam){initId(idParam);}startBtn.addEventListener('click',()=>{const val=idInput.value.trim();if(!val){flash('Enter a name.',true);return;}const url=new URL(location.href);url.searchParams.set('m',val);history.replaceState({},'',url.toString());idInputWrapper.classList.add('hidden');initId(val);if(statusDiv){statusDiv.textContent='';statusDiv.style.color='var(--muted)';}});
  const kbdHint=document.getElementById('kbdHint');let hintShown=false;function showHint(){if(hintShown||!kbdHint)return;kbdHint.classList.remove('hidden');hintShown=true;}
  const topBar=document.querySelector('.top-bar');let hideTopTimer=null;function scheduleHide(){if(!topBar)return;clearTimeout(hideTopTimer);hideTopTimer=setTimeout(()=>{topBar.classList.add('autohide');},2600);}function showTopBar(){if(!topBar)return;const wasHidden=topBar.classList.contains('autohide');topBar.classList.remove('autohide');clearTimeout(hideTopTimer);hideTopTimer=setTimeout(()=>{topBar.classList.add('autohide');},wasHidden?3200:2600);}let inactivityTimer=null;const INACTIVITY_MS=3500;function resetInactivity(){if(!topBar)return;clearTimeout(inactivityTimer);inactivityTimer=setTimeout(()=>{if(window.__forceShowTopBar)return;topBar.classList.add('autohide');},INACTIVITY_MS);}function userActivity(e){if(e&&e.clientY!=null&&e.clientY<70){showTopBar();}else{if(e&&e.clientY!=null&&e.clientY<140){showTopBar();}}resetInactivity();}[ 'pointerdown','pointermove','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,userActivity,{passive:true}));window.addEventListener('orientationchange',()=>{setTimeout(()=>{resetInactivity();scheduleHide();},600);});window.addEventListener('resize',()=>{resetInactivity();});window.addEventListener('load',()=>{scheduleHide();resetInactivity();});document.addEventListener('pointerdown',e=>{if(e.clientY<90){showTopBar();}});document.addEventListener('mousemove',e=>{if(e.clientY<50){showTopBar();}});topBar?.addEventListener('pointerenter',()=>{clearTimeout(hideTopTimer);});topBar?.addEventListener('pointerleave',()=>{scheduleHide();});themeToggle.addEventListener('focus',showTopBar);fsToggle.addEventListener('focus',showTopBar);themeToggle.addEventListener('blur',scheduleHide);fsToggle.addEventListener('blur',scheduleHide);document.addEventListener('keydown',e=>{if(e.key==='Escape'){showTopBar();}});
  const netStatus=document.getElementById('netStatus');function updateOnline(){if(!netStatus)return;if(navigator.onLine){netStatus.style.display='none';}else{netStatus.style.display='block';}}window.addEventListener('online',updateOnline);window.addEventListener('offline',updateOnline);updateOnline();
  const updateToast=document.getElementById('updateToast');navigator.serviceWorker?.addEventListener('message',evt=>{if(evt.data&&evt.data.type==='sw:activated'){if(updateToast){updateToast.textContent='Updated';updateToast.style.display='block';setTimeout(()=>{updateToast.style.display='none';},1800);}}if(evt.data&&evt.data.type==='sw:version'){window.__appRevision=evt.data.version;const ar=document.getElementById('adminRevision');if(ar)ar.textContent=evt.data.version;}});if(navigator.serviceWorker){navigator.serviceWorker.getRegistration().then(reg=>{if(!reg)return;if(reg.waiting){showUpdateToast(reg.waiting);}reg.addEventListener('updatefound',()=>{const nw=reg.installing;if(!nw)return;nw.addEventListener('statechange',()=>{if(nw.state==='installed'&&reg.waiting){showUpdateToast(reg.waiting);}});});});}
  function showUpdateToast(sw){if(!updateToast)return;updateToast.style.display='block';updateToast.onclick=()=>{sw.postMessage('sw:update');location.reload();}}
  (function(){if(!('serviceWorker' in navigator))return;function ask(){try{navigator.serviceWorker.controller&&navigator.serviceWorker.controller.postMessage('sw:get-version');}catch{}}if(navigator.serviceWorker.controller){ask();}navigator.serviceWorker.ready.then(()=>ask());navigator.serviceWorker.addEventListener('controllerchange',()=>{setTimeout(ask,60);});})();
  document.addEventListener('keydown',e=>{if(!currentId)return;if(['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','1','2','3','4','5'].includes(e.key))showHint();if(e.key>='1'&&e.key<='5'){commitRating(Number(e.key));return;}if(['ArrowRight','ArrowUp'].includes(e.key)){e.preventDefault();pending=pending?Math.min(5,pending+1):1;paintStars();return;}if(['ArrowLeft','ArrowDown'].includes(e.key)){e.preventDefault();if(pending>1)pending--;else if(!pending)pending=5;else pending=0;paintStars();return;}if(e.key==='Enter'&&pending){commitRating(pending);}});
  starsContainer.addEventListener('focusin',()=>{showHint();});
  function enterChangeMode(){if(!idInputWrapper)return;idInputWrapper.classList.remove('hidden');if(idInput){idInput.value=currentId;idInput.focus();}starsContainer.classList.add('hidden');averageBlock.classList.add('hidden');yourLabel.classList.add('hidden');document.querySelector('.panel')?.classList.remove('rating-active');statusDiv.textContent='Change product name';}
  let headingTapTimes=[];heading.addEventListener('click',()=>{const now=Date.now();headingTapTimes=headingTapTimes.filter(t=>now-t<1200);headingTapTimes.push(now);if(headingTapTimes.length>=3){headingTapTimes=[];enterChangeMode();}});
  let pressTimer=null;function cancelPress(){if(pressTimer){clearTimeout(pressTimer);pressTimer=null;}}
  ['touchstart','mousedown'].forEach(ev=>heading.addEventListener(ev,(e)=>{if(ev==='mousedown'&&e.button!==0)return;cancelPress();pressTimer=setTimeout(()=>{enterChangeMode();},900);},{passive:true}));
  ['touchend','touchcancel','mouseup','mouseleave','blur'].forEach(ev=>heading.addEventListener(ev,cancelPress));
  document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='c'){enterChangeMode();}});
  const adminOverlay=document.getElementById('adminOverlay');
  const wakeToggle=document.getElementById('wakeToggle');
  const wakeStatus=document.getElementById('wakeStatus');
  const adminRevision=document.getElementById('adminRevision');
  const adminProduct=document.getElementById('adminProduct');
  const adminAvg=document.getElementById('adminAvg');
  const adminCount=document.getElementById('adminCount');
  const adminOnline=document.getElementById('adminOnline');
  const adminStats=document.getElementById('adminStats');
  const diagToggle=document.getElementById('diagToggle');
  const clearBtn=document.getElementById('clearData');
  const adminClose=document.querySelector('.admin-close');
  let wakeLockObj=null; let wakeRequested=false; let adminTapTimes=[]; let hotspotPressTimer=null; const HOT_CORNER_PX=70; let fallbackVideo=null; let fallbackActive=false;
  function updateAdminStats(){if(!currentId){adminProduct.textContent='--';adminAvg.textContent='--';adminCount.textContent='0';adminStats.textContent='No product selected.';return;}adminProduct.textContent=currentId;const agg=loadAgg(currentId);const {txt,v}=fmtAvg(agg.count,agg.total);adminAvg.textContent=txt==='--'?'--':`${txt} (${(v/5*100).toFixed(1)}%)`;adminCount.textContent=String(agg.count);adminStats.textContent=agg.buckets.map((c,i)=>`${i+1}★: ${c}`).join('  |  ');}  
  function updateOnlineAdmin(){if(adminOnline)adminOnline.textContent=navigator.onLine?'Yes':'No';}
  window.addEventListener('online',updateOnlineAdmin);window.addEventListener('offline',updateOnlineAdmin);updateOnlineAdmin();
  function setRevisionAdmin(){if(window.__appRevision&&adminRevision){adminRevision.textContent=window.__appRevision;}}setRevisionAdmin();
  function startFallbackWake(){if(fallbackActive)return;const isiOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);if(!isiOS)return;const v=document.createElement('video');v.setAttribute('playsinline','');v.muted=true;v.loop=true;v.autoplay=true;v.disablePictureInPicture=true;v.controls=false;v.style.position='fixed';v.style.left='-10px';v.style.top='-10px';v.style.width='1px';v.style.height='1px';v.style.opacity='0';v.style.pointerEvents='none';v.src="data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDFpc28yYXZjMW1wNDEAAAAIZnJlZQAAAChtZGF0AAAAIGZsb2F0AAAADmlzb21pc28ybXA0MQAAAAhmcmVlAAAAEG1kYXQhEAUAAQABAAAAGG1vb3YAAABsbXZoZAAAAAB8AAABcAABAAACAAAAVAAAACoAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAABkG1kYXQAAAAYZHRyYWsAAABcdGtoZAAAAAHwAAABcAAAAgAAAACoAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAABAAAAAABkAAAAAABkAAAAAAA=";document.body.appendChild(v);const playAttempt=()=>{v.play().catch(()=>setTimeout(playAttempt,800));};playAttempt();fallbackVideo=v;fallbackActive=true;wakeRequested=true;updateWakeUI();}
  function stopFallbackWake(){if(fallbackVideo){try{fallbackVideo.pause();}catch{}fallbackVideo.remove();fallbackVideo=null;}fallbackActive=false;}
  async function acquireWake(){wakeRequested=true;if('wakeLock' in navigator){try{wakeLockObj=await navigator.wakeLock.request('screen');updateWakeUI();wakeLockObj.addEventListener('release',()=>{updateWakeUI();if(wakeRequested&&!fallbackActive)startFallbackWake();});return;}catch(err){console.warn('Wake Lock request failed, using fallback',err);}}startFallbackWake();updateWakeUI();}
  function releaseWake(){wakeRequested=false;if(wakeLockObj){wakeLockObj.release().catch(()=>{});wakeLockObj=null;}stopFallbackWake();updateWakeUI();}
  function updateWakeUI(){if(!wakeStatus||!wakeToggle)return;const on=!!wakeLockObj||fallbackActive;wakeStatus.textContent=on?(fallbackActive?'WAKE Fallback':'WAKE ON'):'WAKE OFF';wakeStatus.dataset.state=on?'on':'off';wakeToggle.textContent=on?'Disable Wake Lock':'Enable Wake Lock';}
  wakeToggle?.addEventListener('click',()=>{if(wakeLockObj)releaseWake();else acquireWake();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&wakeRequested&&!wakeLockObj&&!fallbackActive){acquireWake();}});
  function openAdmin(){adminOverlay?.classList.remove('hidden');updateAdminStats();setRevisionAdmin();}
  function closeAdmin(){adminOverlay?.classList.add('hidden');}
  adminClose?.addEventListener('click',closeAdmin);
  adminOverlay?.addEventListener('click',e=>{if(e.target===adminOverlay)closeAdmin();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!adminOverlay.classList.contains('hidden'))closeAdmin();});
  function inHotCorner(x,y){const vw=window.innerWidth,vh=window.innerHeight;return x>vw-HOT_CORNER_PX&&y>vh-HOT_CORNER_PX;}
  function registerCornerTap(){const now=Date.now();adminTapTimes=adminTapTimes.filter(t=>now-t<1500);adminTapTimes.push(now);if(adminTapTimes.length>=5){adminTapTimes=[];openAdmin();}}
  function hotspotCancel(){if(hotspotPressTimer){clearTimeout(hotspotPressTimer);hotspotPressTimer=null;}}
  document.addEventListener('click',e=>{if(inHotCorner(e.clientX,e.clientY))registerCornerTap();});
  ['touchstart','mousedown'].forEach(ev=>document.addEventListener(ev,(e)=>{const pt=ev.startsWith('touch')?(e.touches&&e.touches[0]):e;if(!pt)return;if(ev==='mousedown'&&e.button!==0)return;if(!inHotCorner(pt.clientX,pt.clientY))return;hotspotCancel();hotspotPressTimer=setTimeout(()=>{openAdmin();},900);},{passive:true}));
  ['touchend','touchcancel','mouseup','mouseleave','blur'].forEach(ev=>document.addEventListener(ev,hotspotCancel));
  clearBtn?.addEventListener('click',()=>{if(!confirm('Clear ALL rating data?'))return;Object.keys(localStorage).filter(k=>k.startsWith('rating:mattress:')).forEach(k=>localStorage.removeItem(k));flash('All data cleared',false);updateAdminStats();if(currentId){updateUI(loadAgg(currentId));paintStars();}});
  const diagBox=document.getElementById('adminDiag');function populateDiag(){if(!diagBox)return;const vv=window.visualViewport;const mem=performance&&performance.memory?performance.memory:null;const lines=[];lines.push('UserAgent: '+navigator.userAgent);lines.push('Inner: '+window.innerWidth+'x'+window.innerHeight+' DPR '+window.devicePixelRatio);if(vv)lines.push('visualViewport: '+vv.width.toFixed(1)+'x'+vv.height.toFixed(1)+' scale '+vv.scale);lines.push('Revision: '+(window.__appRevision||'--'));lines.push('Keys: '+Object.keys(localStorage).filter(k=>k.startsWith('rating:mattress:')).length);if(currentId){const agg=loadAgg(currentId);lines.push('Current '+currentId+': '+agg.count+' ratings total='+agg.total);}if(mem){lines.push('JS Heap: '+(mem.usedJSHeapSize/1048576).toFixed(1)+'MB / '+(mem.jsHeapSizeLimit/1048576).toFixed(0)+'MB');}lines.push('Time: '+new Date().toLocaleString());diagBox.textContent=lines.join('\n');}
  diagToggle?.addEventListener('click',()=>{if(!diagBox)return;diagBox.classList.toggle('hidden');if(!diagBox.classList.contains('hidden')){populateDiag();}});window.addEventListener('resize',()=>{if(diagBox&&!diagBox.classList.contains('hidden'))populateDiag();});if(window.visualViewport){visualViewport.addEventListener('resize',()=>{if(diagBox&&!diagBox.classList.contains('hidden'))populateDiag();});}
  window.addEventListener('online',()=>updateOnlineAdmin());window.addEventListener('offline',()=>updateOnlineAdmin());
  const avgObs=new MutationObserver(()=>{updateAdminStats();});avgObs.observe(avgLine,{childList:true,subtree:true});
  updateAdminStats();updateWakeUI();
  // === Manual SW Update Check (appended) ===
  (function(){
    const checkUpdateBtn=document.getElementById('checkUpdate');
    if(!checkUpdateBtn)return; if(checkUpdateBtn.dataset.enhanced)return; checkUpdateBtn.dataset.enhanced='1';
    let lastKnownVersion=window.__appRevision||'';
    navigator.serviceWorker?.addEventListener('message',evt=>{if(evt.data&&evt.data.type==='sw:version'){lastKnownVersion=evt.data.version;if(checkUpdateBtn.dataset.state==='checking'){checkUpdateBtn.textContent='Current '+lastKnownVersion;checkUpdateBtn.disabled=false;checkUpdateBtn.dataset.state='idle';}}});
    function askVersion(){try{navigator.serviceWorker.controller&&navigator.serviceWorker.controller.postMessage('sw:get-version');}catch{}}
    if(navigator.serviceWorker?.controller)askVersion();
    checkUpdateBtn.addEventListener('click',async()=>{
      if(!('serviceWorker' in navigator)){checkUpdateBtn.textContent='No SW';return;}
      checkUpdateBtn.disabled=true;checkUpdateBtn.dataset.state='checking';checkUpdateBtn.textContent='Checking...';
      const reg=await navigator.serviceWorker.getRegistration();
      if(!reg){checkUpdateBtn.textContent='No Reg';checkUpdateBtn.disabled=false;checkUpdateBtn.dataset.state='idle';return;}
      let handled=false;
      function markReady(){
        if(handled)return;
        if(reg.waiting){
          handled=true;
          checkUpdateBtn.disabled=false;
          checkUpdateBtn.dataset.state='update-ready';
          checkUpdateBtn.textContent='Update Ready - Reload';
          checkUpdateBtn.removeEventListener('click',noopDuringCheck);
          checkUpdateBtn.addEventListener('click',doReload,{once:true});
        }
      }
      function doReload(){
        try{reg.waiting && reg.waiting.postMessage('sw:update');}catch{}
        setTimeout(()=>location.reload(),120);
      }
      function noopDuringCheck(e){ e.preventDefault(); }
      checkUpdateBtn.addEventListener('click',noopDuringCheck);
      // Listen for updatefound BEFORE triggering update to catch races
      const ufHandler=()=>{
        const nw=reg.installing; if(!nw) return;
        nw.addEventListener('statechange',()=>{ if(nw.state==='installed'){ markReady(); } });
      };
      reg.addEventListener('updatefound',ufHandler,{once:false});
      try{await reg.update();}catch{}
      // Immediate check in case waiting already present
      markReady();
      if(!handled){
        // Ask for version to display while waiting/if none
        if(navigator.serviceWorker.controller){ askVersion(); }
        // Fallback: after delay, if still no update mark current
        setTimeout(()=>{
          if(!handled && checkUpdateBtn.dataset.state==='checking'){
            checkUpdateBtn.textContent= lastKnownVersion?('Current '+lastKnownVersion):'No Update';
            checkUpdateBtn.dataset.state='idle';
            checkUpdateBtn.disabled=false;
            checkUpdateBtn.removeEventListener('click',noopDuringCheck);
          }
        },1400);
      }
    });
  })();
})();
