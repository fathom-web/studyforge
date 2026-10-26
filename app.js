/* StudyForge — volledig lokaal werkende oefenlogica; geen externe API's. */
'use strict';
const $ = (sel) => document.querySelector(sel);
const htmlEscape = (x) => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const int = n => Number(n)||0;
const fmtDate = iso => new Date(String(iso).replace(' ','T')).toLocaleDateString('nl-NL',{day:'numeric',month:'short'});
const gradeFmt = n => Number(n).toLocaleString('nl-NL',{minimumFractionDigits:1,maximumFractionDigits:1});
const ICONS = {
  home:'<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  spark:'<path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3Z"/><path d="m19 17 .7 1.3L21 19l-1.3.7L19 21l-.7-1.3L17 19l1.3-.7L19 17Z"/>',
  cards:'<rect width="14" height="17" x="7" y="4" rx="2"/><path d="M3 8v11a2 2 0 0 0 2 2h11"/><path d="M11 9h6M11 13h4"/>',
  exam:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3"/>',
  chart:'<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-7"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  library:'<path d="M4 6h4v15H4zM9 3h5v18H9zM16 8l3-1 3 13-3 1z"/>',
  lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.9 1.9-.06-.06a1.7 1.7 0 0 0-1.88-.34l-.12.05a1.7 1.7 0 0 0-1.04 1.55V21h-2.7v-.1a1.7 1.7 0 0 0-1.04-1.55l-.12-.05a1.7 1.7 0 0 0-1.88.34l-.06.06-1.9-1.9.06-.06A1.7 1.7 0 0 0 6.6 15a1.7 1.7 0 0 0-1.55-1.04H5v-2.7h.1a1.7 1.7 0 0 0 1.55-1.04l.05-.12a1.7 1.7 0 0 0-.34-1.88L6.3 8.2l1.9-1.9.06.06a1.7 1.7 0 0 0 1.88.34l.12-.05A1.7 1.7 0 0 0 11.3 5.1V5h2.7v.1a1.7 1.7 0 0 0 1.04 1.55l.12.05a1.7 1.7 0 0 0 1.88-.34l.06-.06 1.9 1.9-.06.06a1.7 1.7 0 0 0-.34 1.88l.05.12a1.7 1.7 0 0 0 1.55 1.04h.1v2.7h-.1A1.7 1.7 0 0 0 19.4 15Z"/>',
  arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back:'<path d="M19 12H5m6 6-6-6 6-6"/>',
  check:'<path d="m5 12 5 5L20 7"/>',
  x:'<path d="M18 6 6 18M6 6l12 12"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5"/><path d="M4 15v5h16v-5"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  swap:'<path d="M7 7h14l-4-4M17 17H3l4 4"/>',
  bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7V2Z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trophy:'<path d="M7 3h10v8a5 5 0 0 1-10 0V3ZM7 5H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4M12 16v4m-4 1h8"/>',
  eye:'<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  trash:'<path d="M4 7h16M10 4h4m-8 3 1 14h10l1-14M10 11v6m4-6v6"/>',
  book:'<path d="M12 7c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V6c-3-1-6-1-9 1Zm0 0v14"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  shield:'<path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/>'
};
function ic(name,size=21) { return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.spark}</svg>`; }
const state = {csrf:'',admin:false,profiles:[],profile:null,route:'choose',dashboard:null,active:null,quiz:null,flash:null,libraryFilter:'all',search:'',importText:'',importMessage:null,authMode:null};
let toastTimer;
function toast(msg,bad=false) {const el=$('#toast');el.textContent=msg;el.className='toast show'+(bad?' bad':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='toast',4200);}
async function api(action, data=null, params={}) {
  try { return await window.sfAdapter(action,data,params); }
  catch (err) { throw new Error(err?.message || 'De aanvraag is mislukt.'); }
}
async function init() {
  try {
    const status=await api('status');state.csrf=status.csrf;state.admin=status.admin; const badge=$('#demobadge');if(badge)badge.textContent=window.sfMode()==='supabase'?'STUDYFORGE · SUPABASE':'STUDYFORGE · LOKALE VERSIE';
    if(status.locked){state.route='unlock';render();return;}
    await window.sfSyncPublished?.();
    await boot();
  } catch(e){renderFatal(e.message);}
}
async function boot() {
  const data=await api('bootstrap');state.profiles=data.profiles;state.admin=data.admin;state.csrf=data.csrf;
  state.route='choose';state.profile=null;state.dashboard=null;render();
}
function renderFatal(message) {$('#app').innerHTML=`<div class="fatal"><h1>We kunnen StudyForge niet openen.</h1><p>${htmlEscape(message)}</p><button class="btn btn-primary" data-action="reload">Opnieuw proberen</button></div>`;}
function brand(){return `<div class="brand"><span class="brand-glyph">${ic('book',25)}</span><span>STUDY<span class="brand-accent">FORGE</span></span></div>`;}
function profileName() {return state.profiles.find(x=>+x.id===+state.profile)?.name||'';}
function sectionHeading(kicker,title,desc='') {return `<div class="section-heading"><div><div class="eyebrow">${htmlEscape(kicker)}</div><h1>${htmlEscape(title)}</h1>${desc?`<p class="sub">${htmlEscape(desc)}</p>`:''}</div></div>`;}
function render(){
  if(state.route==='unlock'){renderUnlock();return;}
  if(state.route==='choose'){renderChoose();return;}
  const navItems=[['dashboard','home','Dashboard'],['quizzes','exam','Oefentoetsen'],['flashcards','cards','Flashcards'],['progress','chart','Progressie'],['library','library','Bibliotheek'],['planning','book','Mijn toetsen'],['ready','spark','Toetsklaar'],['parent','chart','Ouderoverzicht']];
  $('#app').innerHTML=`<div class="app-layout"><aside class="sidebar">${brand()}<div class="sidebar-label">JOUW LEEROMGEVING</div><nav class="nav-list">${navItems.map(([r,i,t])=>`<button class="nav-link ${state.route===r?'active':''}" data-action="nav" data-route="${r}">${ic(i)}<span>${t}</span>${state.route===r?`<span class="nav-active-dot"></span>`:''}</button>`).join('')}</nav><div class="sidebar-bottom"><button class="nav-link" data-action="change-profile">${ic('swap')}<span>Wissel profiel</span></button><button class="nav-link ${state.route==='admin'?'active':''}" data-action="admin">${ic('gear')}<span>Ouderbeheer</span></button><button class="nav-link" data-action="logout">${ic('lock')}<span>${window.sfMode()==='supabase'?'Uitloggen':'Startscherm'}</span></button><div class="tiny sidebar-foot">GEMAAKT VOOR NIKKI & DEAN</div></div></aside><div class="main-column"><header class="topbar"><button class="mobile-brand" data-action="change-profile">${ic('swap',18)} ${brand()}</button><span class="topbar-breadcrumb">STUDYFORGE <span>/</span> ${htmlEscape(state.route==='dashboard'?'OVERZICHT':state.route==='admin'?'OUDERBEHEER':state.route.toUpperCase())}</span><div class="topbar-right"><span class="online-indicator"></span><span class="online-text">${window.sfMode()==='supabase'?'Cloudopslag':'Lokaal opgeslagen'}</span><button class="profile-chip" data-action="change-profile"><span class="avatar small ${profileName().toLowerCase()}">${htmlEscape(profileName()[0])}</span><span>${htmlEscape(profileName())}</span>${ic('swap',15)}</button><button class="topbar-admin" title="Ouderbeheer" aria-label="Ouderbeheer" data-action="admin">${ic('gear',20)}</button></div></header><main class="main-content">${routeContent()}</main><nav class="bottom-nav">${navItems.slice(0,4).map(([r,i,t])=>`<button class="bottom-link ${state.route===r?'active':''}" data-action="nav" data-route="${r}">${ic(i,21)}<span>${t==='Oefentoetsen'?'Toetsen':t}</span></button>`).join('')}<button class="bottom-link ${state.route==='more'?'active':''}" data-action="nav" data-route="more">${ic('menu',21)}<span>Meer</span></button></nav></div></div>`;
}
function renderUnlock(){
  $('#app').innerHTML=`<main class="welcome-shell"><div class="welcome-orb one"></div><div class="welcome-orb two"></div><div class="welcome-content unlock-content">${brand()}<div class="unlock-icon">${ic('lock',30)}</div><div class="eyebrow">JULLIE PRIVÉ LEERPLEK</div><h1>Welkom terug<span class="accent-dot">.</span></h1><p class="welcome-lead">Log in op jullie Supabase-account om StudyForge te openen en resultaten tussen apparaten te synchroniseren.</p><form id="unlockForm" class="sign-in-form"><label for="family-email" class="field-label">E-mailadres</label><input id="family-email" type="email" autocomplete="username" required placeholder="jouw@email.nl"><label for="family-password" class="field-label">Wachtwoord</label><input id="family-password" type="password" autocomplete="current-password" required placeholder="Wachtwoord"><button type="submit" class="btn btn-primary btn-wide">Log in ${ic('arrow',18)}</button></form><p class="tiny">Gebruik een Supabase Auth-account dat je zelf hebt aangemaakt. Jouw wachtwoord staat niet op GitHub.</p></div></main>`;
}
function renderChoose(){
  $('#app').innerHTML=`<main class="welcome-shell"><div class="welcome-orb one"></div><div class="welcome-orb two"></div><div class="welcome-content">${brand()}<div class="welcome-copy"><div class="eyebrow"><span class="eyebrow-line"></span> JOUW PERSOONLIJKE STUDYSPACE</div><h1>Jouw tempo.<br><span class="gradient-text">Jouw progressie.</span></h1><p class="welcome-lead">Flashcards, oefentoetsen en je eigen voortgang. Alles op één plek.</p><p class="pick-label">WIE GAAT ER VANDAAG LEREN?</p><div class="pick-cards">${state.profiles.map((p,i)=>`<button class="pick-card p-${htmlEscape(p.name.toLowerCase())}" data-action="select-profile" data-id="${+p.id}"><span class="pick-avatar ${htmlEscape(p.name.toLowerCase())}">${htmlEscape(p.name[0])}</span><span class="pick-details"><span class="pick-name">${htmlEscape(p.name)}</span><span class="pick-sub">Open mijn dashboard</span></span><span class="pick-arrow">${ic('arrow',24)}</span></button>`).join('')}</div><div class="welcome-bottom">${ic('shield',15)} ${window.sfMode()==='supabase'?'Privé opslag via Supabase':'Je gegevens blijven voorlopig op dit apparaat'} ${window.sfMode()==='supabase'?'<button data-action="logout" class="text-btn">Uitloggen</button>':''}</div></div></div><div class="welcome-art" aria-hidden="true"><img class="owl-hero-image" src="owl-study.webp" alt=""><div class="floating-label float-1">${ic('cards')} FLASHCARDS</div><div class="floating-label float-2">${ic('exam')} OEFENTOETSEN</div><div class="floating-label float-3">${ic('chart')} PROGRESSIE</div></div></main>`;
}
function routeContent(){
  if(state.route==='dashboard') return dashboardContent();
  if(state.route==='quizzes') return listContent('quiz');
  if(state.route==='flashcards') return listContent('flashcards');
  if(state.route==='library') return libraryContent();
  if(state.route==='progress') return progressContent();
  if(state.route==='planning') return window.studyPlanContent();
  if(state.route==='ready') return window.studyReadyContent();
  if(state.route==='parent') return window.studyParentContent();
  if(state.route==='more') return moreContent();
  if(state.route==='quiz-run') return quizContent();
  if(state.route==='quiz-result') return quizResultContent();
  if(state.route==='flash-run') return flashContent();
  if(state.route==='admin') return adminContent();
  return dashboardContent();
}
function moreContent(){
  const items=[['planning','book','Mijn toetsen','Toetsdata en leerplanning'],['ready','spark','Toetsklaar','Check wat je nog moet oefenen'],['progress','chart','Progressie','Bekijk je cijfers'],['library','library','Bibliotheek','Je oefenmateriaal'],['parent','chart','Ouderoverzicht','Beide kinderen in beeld']];
  return '<div class="page-enter">'+sectionHeading('ALLE FUNCTIES','Meer mogelijkheden','Kies waar je naartoe wilt.')+
    '<div class="pack-grid">'+items.map(([route,icon,title,desc])=>'<button class="pack-card" data-action="nav" data-route="'+route+'"><div class="pack-top"><span class="pack-icon">'+ic(icon,23)+'</span></div><h3>'+htmlEscape(title)+'</h3><p>'+htmlEscape(desc)+'</p></button>').join('')+'</div></div>';
}
const collections=()=>state.dashboard?.collections||[];
const attempts=()=>state.dashboard?.attempts||[];
const flashes=()=>state.dashboard?.flash_progress||[];
const missed=()=>state.dashboard?.missed||[];
function stats(){
 const tests=attempts();const scores=tests.map(t=>Number(t.grade));
 return {packs:collections().length, exams:collections().filter(x=>x.type==='quiz').length,cards:collections().filter(x=>x.type==='flashcards').reduce((a,x)=>a+x.count,0), done:tests.length, avg:scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length):null,known:flashes().filter(p=>+p.known===1).length};
}
function dashboardContent(){
 const s=stats();const last=collections().slice(0,3);
 const grades=attempts().slice(0,4);
 return `<div class="page-enter">${window.studyDashboardWidget?.()||''}<div class="dashboard-hero"><div class="hero-copy"><div class="eyebrow"><span class="hero-dot"></span> JOUW DASHBOARD</div><h1>Hoi ${htmlEscape(profileName())}<span class="wave-dot">.</span></h1><p>Klaar om iets nieuws te leren? Kies wat je vandaag wilt oefenen en ontdek hoeveel je al weet.</p><button class="btn btn-white" data-action="nav" data-route="quizzes">Begin met oefenen ${ic('arrow',18)}</button></div><div class="hero-decoration owl-cutout" aria-hidden="true"><img src="owl-study.webp" alt="" loading="lazy"></div></div>
 <div class="metric-grid"><div class="metric-card"><span class="metric-icon mint">${ic('exam',21)}</span><span class="metric-number">${s.done}</span><span class="metric-label">Toetsen gemaakt</span></div><div class="metric-card"><span class="metric-icon purple">${ic('cards',21)}</span><span class="metric-number">${s.known}<small> / ${s.cards}</small></span><span class="metric-label">Flashcards gekend</span></div><div class="metric-card"><span class="metric-icon peach">${ic('trophy',21)}</span><span class="metric-number">${s.avg===null?'–':gradeFmt(s.avg)}</span><span class="metric-label">Gemiddeld cijfer</span></div><div class="metric-card"><span class="metric-icon blue">${ic('target',21)}</span><span class="metric-number">${missed().length}</span><span class="metric-label">Nog eens oefenen</span></div></div>
 <div class="section-top"><div><div class="eyebrow">KIES JOUW ACTIVITEIT</div><h2>Wat gaan we doen?</h2></div></div>
 <div class="activity-grid"><button class="activity-card activity-exams" data-action="nav" data-route="quizzes"><span class="activity-icon">${ic('exam',28)}</span><span class="activity-title">Oefenexamens</span><span class="activity-desc">Test je kennis met uitdagende vragen.</span><span class="activity-more">Start een toets ${ic('arrow',18)}</span></button><button class="activity-card activity-flash" data-action="nav" data-route="flashcards"><span class="activity-icon">${ic('cards',28)}</span><span class="activity-title">Flashcards</span><span class="activity-desc">Leer begrippen op een slimme manier.</span><span class="activity-more">Kaarten oefenen ${ic('arrow',18)}</span></button><button class="activity-card activity-progress" data-action="nav" data-route="progress"><span class="activity-icon">${ic('chart',28)}</span><span class="activity-title">Mijn progressie</span><span class="activity-desc">Bekijk hoe goed je bezig bent.</span><span class="activity-more">Mijn resultaten ${ic('arrow',18)}</span></button><button class="activity-card activity-mistakes" data-action="practice-mistakes"><span class="activity-icon">${ic('target',28)}</span><span class="activity-title">Fouten oefenen</span><span class="activity-desc">Maak moeilijke vragen nog een keer.</span><span class="activity-more">Opnieuw proberen ${ic('arrow',18)}</span></button></div>
 <div class="dashboard-lower"><section class="panel"><div class="panel-heading"><div><div class="eyebrow">VERS TOEGEVOEGD</div><h3>Mijn leermateriaal</h3></div><button class="text-link" data-action="nav" data-route="library">Bekijk alles ${ic('arrow',15)}</button></div>${last.length?`<div class="material-list">${last.map(item=>packRow(item)).join('')}</div>`:emptyState('library','Er staat nog geen lesmateriaal klaar.','Vraag de beheerder om een toets of flashcards te importeren.')}</section><section class="panel"><div class="panel-heading"><div><div class="eyebrow">JOUW RESULTATEN</div><h3>Recent geoefend</h3></div><button class="text-link" data-action="nav" data-route="progress">Progressie ${ic('arrow',15)}</button></div>${grades.length?`<div class="results-list">${grades.map(a=>`<div class="result-row"><div class="result-medal">${ic('exam',19)}</div><div class="result-info"><b>${htmlEscape(a.title)}</b><span>${htmlEscape(a.subject)} · ${fmtDate(a.created_at)}</span></div><span class="grade-pill ${+a.grade>=5.5?'pass':'fail'}">${gradeFmt(a.grade)}</span></div>`).join('')}</div>`:emptyState('chart','Nog geen cijfers','Je eerste resultaat verschijnt hier na het afronden van een toets.')}</section></div></div>`;
}
function emptyState(icon,title,desc){return `<div class="empty-state">${ic(icon,32)}<h3>${htmlEscape(title)}</h3><p>${htmlEscape(desc)}</p></div>`;}
function packRow(item){return `<button class="material-row" data-action="open-pack" data-id="${item.id}"><span class="material-icon ${item.type==='quiz'?'exam-tile':'flash-tile'}">${ic(item.type==='quiz'?'exam':'cards',21)}</span><span class="material-info"><b>${htmlEscape(item.title)}</b><span>${htmlEscape(item.subject)} <span class="bullet">·</span> ${item.count} ${item.type==='quiz'?'vragen':'kaarten'}</span></span><span class="material-chevron">${ic('chevron',18)}</span></button>`;}
function listContent(type){
 const available=collections().filter(c=>c.type===type);
 const subjectList=[...new Set(available.map(c=>c.subject))];
 return `<div class="page-enter">${sectionHeading(type==='quiz'?'TEST JE KENNIS':'LEREN IN JE EIGEN TEMPO',type==='quiz'?'Oefenexamens':'Flashcards',type==='quiz'?'Maak een toets, krijg direct een cijfer en ontdek wat je nog kunt oefenen.':'Draai kaarten om en onthoud steeds een beetje meer.')}
 <div class="page-stats"><span class="badge-soft">${ic(type==='quiz'?'exam':'cards',16)} ${available.length} sets beschikbaar</span><span class="badge-soft">${ic('book',16)} ${subjectList.length} vakken</span></div>
 ${available.length?`<div class="pack-grid">${available.map(c=>packCard(c)).join('')}</div>`:emptyState(type==='quiz'?'exam':'cards',type==='quiz'?'Nog geen oefenexamens':'Nog geen flashcards','Zodra er een importbestand is toegevoegd, vind je het hier terug.')}</div>`;
}
function packCard(c){
 const progress=c.type==='flashcards'?flashes().filter(p=>+p.collection_id===c.id && +p.known===1).length:0;
 const total=c.count;const recent=attempts().find(a=>+a.collection_id===c.id);
 return `<button class="pack-card" data-action="open-pack" data-id="${c.id}"><div class="pack-top"><span class="pack-icon ${c.type==='quiz'?'exam-tile':'flash-tile'}">${ic(c.type==='quiz'?'exam':'cards',23)}</span><span class="pack-tag">${htmlEscape(c.subject)}</span></div><h3>${htmlEscape(c.title)}</h3><p>${htmlEscape(c.description||'Klaar om te oefenen?')}</p><div class="pack-bottom"><span>${ic(c.type==='quiz'?'exam':'cards',16)} ${total} ${c.type==='quiz'?'vragen':'kaarten'}</span><span>${c.type==='quiz'&&recent?'Laatste: '+gradeFmt(recent.grade):c.type==='flashcards'?progress+' geleerd':'Start nu'} ${ic('arrow',17)}</span></div></button>`;
}
function libraryContent(){
 const items=collections();const subjects=[...new Set(items.map(c=>c.subject))];
 const filtered=items.filter(x=>(state.libraryFilter==='all'||x.subject===state.libraryFilter)&&(!state.search||`${x.title} ${x.subject} ${x.description}`.toLowerCase().includes(state.search.toLowerCase())));
 return `<div class="page-enter">${sectionHeading('ALLES BIJ ELKAAR','Mijn bibliotheek','Al je oefentoetsen en flashcards op één plek.')}
 <div class="library-tools"><div class="search-wrap">${ic('search',19)}<input id="library-search" placeholder="Zoek lesmateriaal..." value="${htmlEscape(state.search)}" aria-label="Zoek lesmateriaal"></div><div class="filter-pills"><button class="filter-pill ${state.libraryFilter==='all'?'on':''}" data-action="filter" data-value="all">Alles</button>${subjects.map(s=>`<button class="filter-pill ${state.libraryFilter===s?'on':''}" data-action="filter" data-value="${htmlEscape(s)}">${htmlEscape(s)}</button>`).join('')}</div></div>
 ${filtered.length?`<div class="library-list">${filtered.map(packRow).join('')}</div>`:emptyState('library','Geen lesmateriaal gevonden','Pas je zoekopdracht aan of voeg een importbestand toe.')}</div>`;
}
function progressContent(){
 const s=stats();const as=attempts();const profilesubjects=[...new Set(as.map(a=>a.subject))];
 return `<div class="page-enter">${sectionHeading('JE WORDT ELKE DAG BETER','Mijn progressie','Bekijk je resultaten en ontdek hoe je vooruitgaat.')}
 <div class="metric-grid"><div class="metric-card"><span class="metric-icon peach">${ic('trophy',21)}</span><span class="metric-number">${s.avg===null?'–':gradeFmt(s.avg)}</span><span class="metric-label">Gemiddeld cijfer</span></div><div class="metric-card"><span class="metric-icon mint">${ic('exam',21)}</span><span class="metric-number">${s.done}</span><span class="metric-label">Toetsen gemaakt</span></div><div class="metric-card"><span class="metric-icon purple">${ic('cards',21)}</span><span class="metric-number">${s.known}<small> / ${s.cards}</small></span><span class="metric-label">Kaarten gekend</span></div><div class="metric-card"><span class="metric-icon blue">${ic('target',21)}</span><span class="metric-number">${missed().length}</span><span class="metric-label">Vragen om te herhalen</span></div></div>
 <div class="dashboard-lower"><section class="panel"><div class="panel-heading"><div><div class="eyebrow">PER VAK</div><h3>Hoe gaat het?</h3></div></div>${profilesubjects.length?`<div class="subject-bars">${profilesubjects.map(subject=>{const grades=as.filter(x=>x.subject===subject);const avg=grades.reduce((a,x)=>a+Number(x.grade),0)/grades.length;return `<div class="subject-item"><div class="subject-line"><b>${htmlEscape(subject)}</b><span>${gradeFmt(avg)} gemiddeld</span></div><div class="bar-track"><span style="width:${Math.max(0,Math.min(100,(avg-1)/9*100))}%"></span></div><span class="bar-meta">${grades.length} toets${grades.length===1?'':'en'} gemaakt</span></div>`;}).join('')}</div>`:emptyState('chart','Nog geen voortgang','Zodra je een oefentoets maakt, zie je hier jouw voortgang.')}</section>
 <section class="panel"><div class="panel-heading"><div><div class="eyebrow">ALLE RESULTATEN</div><h3>Jouw cijfers</h3></div></div>${as.length?`<div class="results-list">${as.map(a=>`<div class="result-row"><div class="result-medal">${ic('trophy',19)}</div><div class="result-info"><b>${htmlEscape(a.title)}</b><span>${htmlEscape(a.subject)} · ${a.correct_count}/${a.total_count} goed · ${fmtDate(a.created_at)}</span></div><span class="grade-pill ${+a.grade>=5.5?'pass':'fail'}">${gradeFmt(a.grade)}</span></div>`).join('')}</div>`:emptyState('exam','Nog geen resultaten','Begin met een oefentoets en zie hier je cijfers.')}</section></div>
 <div class="bottom-cta"><span class="bottom-cta-icon">${ic('target',24)}</span><div><h3>Oefenen maakt je sterker</h3><p>${missed().length?'Je hebt '+missed().length+' vragen die je opnieuw kunt proberen.':'Je hebt op dit moment geen gemiste vragen.'}</p></div><button class="btn btn-secondary" data-action="practice-mistakes">Fouten oefenen ${ic('arrow',17)}</button></div></div>`;
}
function quizContent(){
 const qz=state.quiz;if(!qz)return emptyState('exam','Geen toets geselecteerd','');
 if(qz.index>=qz.indices.length){return '<p>Toets afronden...</p>';}
 const originalIndex=qz.indices[qz.index];const q=qz.content.questions[originalIndex];const a=qz.answers[qz.index]||{};
 const isMC=q.type==='mc';const answered=isMC?Number.isInteger(a.selected):a.self_grade!==undefined;
 const opts=isMC?`<div class="answer-list">${q.options.map((opt,i)=>{
 const has=Number.isInteger(a.selected);const good=has&&i===q.correct;const wrong=has&&i===a.selected&&i!==q.correct;
 return `<button class="answer-option ${good?'correct':''} ${wrong?'incorrect':''}" data-action="select-answer" data-index="${i}" ${has?'disabled':''}><span class="option-letter">${String.fromCharCode(65+i)}</span><span>${htmlEscape(opt)}</span>${good?ic('check',20):wrong?ic('x',20):''}</button>`;
 }).join('')}</div>`:`<div class="open-answer"><label for="open-text">Jouw antwoord</label><textarea id="open-text" rows="5" placeholder="Typ hier je antwoord..." ${a.revealed?'readonly':''}>${htmlEscape(a.typed||'')}</textarea>${a.revealed?`<div class="answer-feedback good"><b>${ic('eye',18)} Modelantwoord</b><p>${htmlEscape(q.answer)}</p>${q.explanation?`<p>${htmlEscape(q.explanation)}</p>`:''}</div><p class="rate-prompt">Heb je de vraag goed beantwoord?</p><div class="rate-buttons"><button class="btn ${a.self_grade===true?'btn-primary':'btn-outline'}" data-action="self-grade" data-known="1">${ic('check')} Ja, ik wist het</button><button class="btn ${a.self_grade===false?'btn-red':'btn-outline'}" data-action="self-grade" data-known="0">${ic('refresh')} Nog oefenen</button></div>`:`<button class="btn btn-secondary reveal-btn" data-action="reveal-answer">${ic('eye',18)} Bekijk modelantwoord</button>`}</div>`;
 return `<div class="page-enter focus-page"><button class="back-link" data-action="quit-quiz">${ic('back',18)} Terug naar toetsen</button><div class="focus-header"><div><div class="eyebrow">${htmlEscape(qz.pack.subject)} <span class="bullet">·</span> ${qz.isMistakes?'FOUTEN OEFENEN':'OEFENTOETS'}</div><h2>${htmlEscape(qz.pack.title)}</h2></div><span class="step-count">Vraag ${qz.index+1} <span>/ ${qz.indices.length}</span></span></div>
 <div class="step-bar"><div style="width:${(qz.index/qz.indices.length)*100}%"></div></div><div class="question-card"><div class="question-label"><span class="question-nr">${String(qz.index+1).padStart(2,'0')}</span><span>${isMC?'MULTIPLECHOICE':'OPEN VRAAG'}</span></div><h2>${htmlEscape(q.question)}</h2>${opts}
 ${q.hint?`<div class="hint-section"><button class="hint-button" data-action="hint">${ic('spark',17)} ${qz.hint?'Verberg hint':'Ik wil een hint'}</button>${qz.hint?`<div class="hint-content">${htmlEscape(q.hint)}</div>`:''}</div>`:''}
 ${isMC&&answered?`<div class="answer-feedback ${a.selected===q.correct?'good':'wrong'}"><b>${ic(a.selected===q.correct?'check':'info',19)} ${a.selected===q.correct?'Goed gedaan!':'Dit antwoord klopt nog niet.'}</b><p>${htmlEscape(q.explanation||('Goede antwoord: '+q.options[q.correct]))}</p></div>`:''}
 </div><div class="question-footer"><button class="btn btn-outline" data-action="quiz-prev" ${qz.index===0?'disabled':''}>${ic('back',17)} Vorige</button><button class="btn btn-primary" data-action="quiz-next" ${!answered?'disabled':''}>${qz.index===qz.indices.length-1?'Rond toets af':'Volgende vraag'} ${ic('arrow',18)}</button></div><p class="question-footnote">${isMC?'Kies één antwoord. Daarna krijg je direct uitleg.':'Beoordeel je antwoord eerlijk na het bekijken van het modelantwoord.'}</p></div>`;
}
function quizResultContent(){
 const r=state.quiz?.result;if(!r)return '';
 const fraction=r.correct/r.total;return `<div class="page-enter result-page"><div class="result-spark">✳</div><div class="eyebrow">OEFENTOETS AFGEROND</div><h1>${fraction>=.8?'Super gedaan!':fraction>=.55?'Lekker gewerkt!':'Goed dat je geoefend hebt!'}</h1><p>Je hebt je toets afgerond. Bekijk je resultaat en ga weer aan de slag!</p><div class="result-big-grade ${r.grade>=5.5?'pass':'fail'}"><span class="result-grade-label">JOUW CIJFER</span><span class="result-grade-number">${gradeFmt(r.grade)}</span><span>${r.correct} van ${r.total} vragen goed</span></div><div class="result-stats"><span>${ic('check',19)} ${r.correct} goed</span><span>${ic('target',19)} ${r.total-r.correct} nog oefenen</span></div><div class="result-buttons"><button class="btn btn-primary" data-action="restart-quiz">${ic('refresh',18)} Nog een keer</button><button class="btn btn-outline" data-action="nav" data-route="progress">Bekijk progressie ${ic('arrow',18)}</button><button class="btn btn-outline" data-action="nav" data-route="dashboard">Dashboard</button></div></div>`;
}
function flashContent(){
 const f=state.flash;if(!f)return '';
 if(f.index>=f.order.length) {
  const known=f.sessionKnown;return `<div class="page-enter result-page"><div class="result-spark">✳</div><div class="eyebrow">FLASHCARDS AFGEROND</div><h1>Weer wat geleerd!</h1><p>Goed bezig, ${htmlEscape(profileName())}. Iedere keer oefenen helpt je vooruit.</p><div class="result-big-grade"><span class="result-grade-label">KAARTEN DIE JE KENDE</span><span class="result-grade-number">${known}</span><span>van ${f.order.length} kaarten</span></div><div class="result-buttons"><button class="btn btn-primary" data-action="restart-flash">${ic('refresh',18)} Opnieuw oefenen</button><button class="btn btn-outline" data-action="nav" data-route="flashcards">Alle flashcards ${ic('arrow',18)}</button></div></div>`;
 }
 const id=f.order[f.index];const card=f.content.cards[id];
 return `<div class="page-enter focus-page flash-page"><button class="back-link" data-action="nav" data-route="flashcards">${ic('back',18)} Terug naar flashcards</button><div class="focus-header"><div><div class="eyebrow">${htmlEscape(f.pack.subject)} <span class="bullet">·</span> FLASHCARDS</div><h2>${htmlEscape(f.pack.title)}</h2></div><span class="step-count">Kaart ${f.index+1} <span>/ ${f.order.length}</span></span></div><div class="step-bar"><div style="width:${f.index/f.order.length*100}%"></div></div><button class="flip-card ${f.flipped?'flipped':''}" data-action="flip"><span class="flip-inner"><span class="flip-label">${f.flipped?'ANTWOORD':'VRAAG'}</span><span class="flip-text">${htmlEscape(f.flipped?card.back:card.front)}</span><span class="flip-tip">${ic('refresh',17)} Tik om ${f.flipped?'de vraag':'het antwoord'} te zien</span></span></button><div class="flash-controls">${f.flipped?`<button class="btn btn-red" data-action="rate-flash" data-known="0">${ic('refresh',18)} Nog oefenen</button><button class="btn btn-primary" data-action="rate-flash" data-known="1">${ic('check',18)} Ik weet het!</button>`:`<button class="btn btn-secondary" data-action="flip">Draai kaart om ${ic('arrow',18)}</button>`}</div></div>`;
}
function adminContent(){
 if(!state.admin) return `<div class="page-enter admin-login">${sectionHeading('ALLEEN VOOR OUDERS','Ouderbeheer','Importeer nieuwe oefentoetsen en flashcards vanuit ChatGPT.')}
 <div class="panel auth-panel"><div class="auth-icon">${ic('lock',27)}</div><h2>Beveiligde toegang</h2><p>Bevestig je accountwachtwoord opnieuw om toetsen toe te voegen of te verwijderen.</p><form id="adminForm"><label class="sr-only" for="adminPass">Accountwachtwoord</label><input id="adminPass" type="password" autocomplete="current-password" required placeholder="Accountwachtwoord"><button type="submit" class="btn btn-primary btn-wide">Open ouderbeheer ${ic('arrow',18)}</button></form></div></div>`;
 const all=collections();
 return `<div class="page-enter">${sectionHeading('OUDEROMGEVING','Ouderbeheer','Lesmateriaal wordt in ChatGPT gemaakt en hier als JSON geïmporteerd.')}
 <div class="admin-grid"><section class="panel"><div class="panel-heading"><div><div class="eyebrow">STAP 1</div><h3>Importeer leerstof</h3></div><span class="tag-muted">${ic('shield',15)} Beheeromgeving</span></div><p class="body-muted">Maak hier in ChatGPT een StudyForge-importbestand voor Nikki of Dean. Kies daarna het JSON-bestand of plak de inhoud hieronder.</p><div class="import-zone"><input id="jsonFile" type="file" accept=".json,application/json" class="sr-only"><button class="import-file-btn" data-action="choose-file">${ic('upload',25)}<b>Kies JSON-bestand</b><span>Of plak de JSON hieronder</span></button></div><label class="field-label" for="importText">JSON-inhoud</label><textarea id="importText" class="import-editor" placeholder='{"schema":"studyforge/v1","profile":"Dean",...}' spellcheck="false">${htmlEscape(state.importText)}</textarea><button class="btn btn-primary btn-wide" data-action="import">${ic('plus',18)} Importeer in StudyForge</button>${state.importMessage?`<div class="notice ${state.importMessage.bad?'error':'success'}">${htmlEscape(state.importMessage.text)}</div>`:''}<p class="tiny">Maximaal 1,8 MB per importbestand. Er worden geen afbeeldingen, PDF's of Word-documenten opgeslagen.</p></section>
 <section class="panel"><div class="panel-heading"><div><div class="eyebrow">STAP 2</div><h3>Beheer sets</h3></div><span class="tag-muted">${all.length} sets</span></div><p class="body-muted">Verwijder een set als je een nieuwe versie wilt importeren. Let op: bij verwijderen verdwijnen ook de bijbehorende resultaten.</p>${all.length?`<div class="admin-list">${all.map(c=>`<div class="admin-row"><span class="material-icon ${c.type==='quiz'?'exam-tile':'flash-tile'}">${ic(c.type==='quiz'?'exam':'cards',18)}</span><span class="admin-info"><b>${htmlEscape(c.title)}</b><span>${htmlEscape(c.subject)} · ${htmlEscape(state.profiles.find(p=>+p.id===c.profile_id)?.name||'')}</span></span><button class="icon-button danger" title="Set verwijderen" aria-label="Verwijder ${htmlEscape(c.title)}" data-action="delete" data-id="${c.id}">${ic('trash',18)}</button></div>`).join('')}</div>`:emptyState('library','Nog geen sets','Importeer je eerste set om deze hier te zien.')}<div class="admin-actions"><button class="btn btn-outline" data-action="admin-logout">${ic('lock',18)} Ouderbeheer sluiten</button></div></section></div></div>`;
}
async function selectProfile(id){state.profile=id;await refreshDashboard();await window.studyBeforeRoute?.('dashboard');state.route='dashboard';render();}
async function refreshDashboard(){if(!state.profile)return;state.dashboard=await api('dashboard',null,{profile:state.profile});}
async function navigate(route){if(!state.profile){state.route='choose';render();return;}if(route==='dashboard'||route==='progress')await refreshDashboard();if(['planning','ready','parent','dashboard'].includes(route))await window.studyBeforeRoute?.(route);state.route=route;render();window.scrollTo({top:0,behavior:'instant'});}
async function openPack(id){
 const pack=collections().find(c=>c.id===+id);if(!pack){toast('Set niet gevonden.',true);return;}
 const result=await api('collection',null,{id:pack.id,profile:state.profile});state.active=result.collection;
 if(pack.type==='quiz')startQuiz();else startFlash();
}
// Kies bij toetsen met een vragenlimiet steeds een andere ronde.
 // De eerste vier rondes van 25 bestrijken samen alle 100 vragen,
 // zonder herhaling binnen die reeks. Fouten oefenen blijft apart.
function quizRoundIndices(pack, count, size){
 const key='studyforge-quiz-rotation-v1:'+state.profile+':'+(pack.source_key||pack.id);
 let prior=null;
 try{prior=JSON.parse(localStorage.getItem(key)||'null');}catch(e){}
 const valid=prior&&prior.count===count&&Array.isArray(prior.remaining)&&
   new Set(prior.remaining).size===prior.remaining.length&&
   prior.remaining.every(i=>Number.isInteger(i)&&i>=0&&i<count);
 let remaining=valid?prior.remaining.slice():[];
 if(remaining.length<size){
   const previous=valid&&Array.isArray(prior.last)?prior.last:[];
   const recent=new Set(previous);
   remaining=[...Array(count).keys()];
   for(let i=remaining.length-1;i>0;i--){
     const j=Math.floor(Math.random()*(i+1));
     [remaining[i],remaining[j]]=[remaining[j],remaining[i]];
   }
   // Start van een nieuwe cyclus: vermijd vragen uit de vorige ronde.
   if(count>=size*2&&recent.size){
     remaining=remaining.filter(i=>!recent.has(i)).concat(remaining.filter(i=>recent.has(i)));
   }
 }
 const picked=remaining.slice(0,size);
 try{localStorage.setItem(key,JSON.stringify({count,remaining:remaining.slice(size),last:picked}));}catch(e){}
 return picked;
}
function startQuiz(indices=null){
 const pack=state.active;const questions=pack.content.questions;
 const size=Number(pack.content.questionsPerAttempt);
 const ordered=indices?indices:(Number.isInteger(size)&&size>0&&size<questions.length?quizRoundIndices(pack,questions.length,size):[...questions.keys()]);
 state.quiz={pack,content:pack.content,indices:ordered,index:0,answers:ordered.map(()=>({})),hint:false,result:null,isMistakes:indices!==null};
 state.route='quiz-run';render();window.scrollTo(0,0);
}
function startFlash(){
 const pack=state.active;const cards=pack.content.cards;
 const progress=flashes().filter(p=>+p.collection_id===pack.id);
 const status=new Map(progress.map(p=>[+p.card_index,+p.known]));
 const order=[...cards.keys()].sort((a,b)=>(status.get(a)||0)-(status.get(b)||0));
 state.flash={pack,content:pack.content,order,index:0,flipped:false,sessionKnown:0};state.route='flash-run';render();window.scrollTo(0,0);
}
async function practiceMistakes(){
 if(!missed().length){toast('Geen openstaande fouten. Goed bezig!');return;}
 const grouped=new Map();for(const a of missed()){if(!grouped.has(a.collection_id))grouped.set(a.collection_id,[]);grouped.get(a.collection_id).push(a.index);}
 const [id,indices]=grouped.entries().next().value;
 const result=await api('collection',null,{id,profile:state.profile});state.active=result.collection;
 startQuiz(indices);
 if(grouped.size>1)toast('We beginnen met de fouten uit één toets. Daarna kun je de andere oefenen.');
}
async function finishQuiz(){
 const q=state.quiz;
 const r=await api('save_quiz',{profile:state.profile,collection_id:q.pack.id,answers:q.answers,mode:q.isMistakes?'mistakes':'all',indices:q.indices});
 q.result=r;await refreshDashboard();state.route='quiz-result';render();window.scrollTo(0,0);
}
async function flashRate(known){
 const f=state.flash;const cardIndex=f.order[f.index];
 await api('flash_review',{profile:state.profile,collection_id:f.pack.id,index:cardIndex,known});
 if(known)f.sessionKnown++;f.index++;f.flipped=false;
 if(f.index===f.order.length)await refreshDashboard();render();
}
async function importJson(){
 const el=$('#importText');const text=el?.value||'';state.importText=text;if(!text.trim()){toast('Selecteer een bestand of plak JSON.',true);return;}
 const r=await api('import',{text});state.importMessage={bad:false,text:`${r.imported} set(s) toegevoegd voor ${r.profile}.${r.duplicates?' '+r.duplicates+' dubbele set(s) overgeslagen.':''}`};state.importText='';await refreshDashboard();render();toast('Import afgerond!');
}
async function deletePack(id){
 const col=collections().find(c=>c.id===+id);if(!col)return;
 if(!window.confirm(`Weet je zeker dat je "${col.title}" wilt verwijderen? Bijbehorende resultaten worden ook verwijderd.`))return;
 await api('delete',{id:+id});await refreshDashboard();render();toast('Set verwijderd.');
}
function handleError(e){console.error(e);toast(e?.message||'Er ging iets mis.',true);if(e?.message?.includes('uitgelogd')){state.route='unlock';render();}}
document.addEventListener('click',async ev=>{
 const btn=ev.target.closest('[data-action]');if(!btn||btn.disabled)return;
 const action=btn.dataset.action;
 try {
  if(action.startsWith('study-')){await window.studyHandleAction(action,btn);return;}
  switch(action){
   case 'reload': location.reload();break;
   case 'select-profile':await selectProfile(+btn.dataset.id);break;
   case 'change-profile':state.profile=null;state.route='choose';state.dashboard=null;render();break;
   case 'nav':await navigate(btn.dataset.route);break;
   case 'admin':await navigate('admin');break;
   case 'logout':await api('logout',{});state.route=window.sfMode()==='supabase'?'unlock':'choose';state.profile=null;state.admin=window.sfMode()==='local';render();break;
   case 'open-pack':await openPack(btn.dataset.id);break;
   case 'practice-mistakes':await practiceMistakes();break;
   case 'quit-quiz':if(window.confirm('Wil je de toets verlaten? Je huidige antwoorden worden niet opgeslagen.')){state.quiz=null;await navigate('quizzes');}break;
   case 'select-answer':{const q=state.quiz;const a=q.answers[q.index];if(Number.isInteger(a.selected))break;a.selected=+btn.dataset.index;render();break;}
   case 'hint':state.quiz.hint=!state.quiz.hint;render();break;
   case 'reveal-answer':state.quiz.answers[state.quiz.index].revealed=true;render();break;
   case 'self-grade':state.quiz.answers[state.quiz.index].self_grade=btn.dataset.known==='1';render();break;
   case 'quiz-prev':if(state.quiz.index>0){state.quiz.index--;state.quiz.hint=false;render();}break;
   case 'quiz-next':if(state.quiz.index<state.quiz.indices.length-1){state.quiz.index++;state.quiz.hint=false;render();window.scrollTo(0,0);}else await finishQuiz();break;
   case 'restart-quiz':startQuiz(state.quiz.isMistakes?state.quiz.indices:null);break;
   case 'flip':state.flash.flipped=!state.flash.flipped;render();break;
   case 'rate-flash':await flashRate(btn.dataset.known==='1');break;
   case 'restart-flash':startFlash();break;
   case 'filter':state.libraryFilter=btn.dataset.value;render();break;
   case 'choose-file':$('#jsonFile')?.click();break;
   case 'import':await importJson();break;
   case 'delete':await deletePack(btn.dataset.id);break;
   case 'admin-logout':await api('admin_logout',{});state.admin=false;render();break;
  }
 }catch(e){handleError(e);}
});
document.addEventListener('submit',async ev=>{
 const form=ev.target;if(!['unlockForm','adminForm'].includes(form.id))return;ev.preventDefault();
 try{
  if(form.id==='unlockForm') {const r=await api('unlock',{email:$('#family-email').value,password:$('#family-password').value});state.csrf=r.csrf;await window.sfSyncPublished?.();await boot();}
  else {const r=await api('admin_login',{password:$('#adminPass').value});state.admin=true;state.csrf=r.csrf;render();toast('Ouderbeheer geopend.');}
 }catch(e){handleError(e);}
});
document.addEventListener('input',ev=>{
 if(ev.target.id==='open-text'&&state.quiz)state.quiz.answers[state.quiz.index].typed=ev.target.value;
 if(ev.target.id==='importText')state.importText=ev.target.value;
 if(ev.target.id==='library-search') {
  state.search=ev.target.value;
  const selStart=ev.target.selectionStart;
  const target=document.querySelector('.library-list');
  // Update alleen de resultaten, zodat de cursor niet verspringt.
  const items=collections().filter(x=>(state.libraryFilter==='all'||x.subject===state.libraryFilter)&&`${x.title} ${x.subject} ${x.description}`.toLowerCase().includes(state.search.toLowerCase()));
  if(target)target.innerHTML=items.map(packRow).join('')||emptyState('search','Geen resultaten','Probeer iets anders te zoeken.');
  else {render();const f=$('#library-search');if(f){f.focus();f.setSelectionRange(selStart,selStart);}}
 }
});
document.addEventListener('change',async ev=>{
 if(ev.target.id!=='jsonFile')return;
 const file=ev.target.files?.[0];if(!file)return;
 if(file.size>1800000){toast('Dit bestand is te groot (maximaal 1,8 MB).',true);return;}
 try{const content=await file.text();state.importText=content;const txt=$('#importText');if(txt)txt.value=content;toast('JSON-bestand ingelezen. Klik op importeren.');}catch(e){handleError(e);}
});
init();
