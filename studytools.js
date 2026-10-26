/* StudyForge — planning, doelen, indicatieve toetsgereedheid en ouderoverzicht */
'use strict';
const SP_KEY='studyforge-planning-v1';
const SP_EMPTY=()=>({exams:[],goals:{sessionsPerWeek:3,targetGrade:7},completed:{}});
let spCurrent=SP_EMPTY(),spProfile=null,spParentData=null,spSelectedExam=null,spCloudWarning='';
const spDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const spMidnight=(s)=>new Date(s+'T12:00:00');
const spDaysUntil=(d)=>Math.round((spMidnight(d)-spMidnight(spDate()))/86400000);
const spDayLabel=(d)=>spMidnight(d).toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'});
function spReadLocal(profile){
  try{const all=JSON.parse(localStorage.getItem(SP_KEY)||'{}'),one=all[profile]; if(one&&Array.isArray(one.exams))return {...SP_EMPTY(),...one,goals:{...SP_EMPTY().goals,...one.goals}};}
  catch(err){console.warn('StudyForge planning ophalen',err)}
  return SP_EMPTY();
}
function spWriteLocal(profile,record){
  const all=JSON.parse(localStorage.getItem(SP_KEY)||'{}');all[profile]=record;
  localStorage.setItem(SP_KEY,JSON.stringify(all));
}
async function spLoad(profile){
  let val=spReadLocal(profile);
  spCloudWarning='';
  if(window.sfMode?.()==='supabase'){
    try{
      const client=await sfClient(),res=await client.from('sf_study_state').select('payload').eq('profile_id',profile).maybeSingle();
      if(res.error)throw res.error;
      if(res.data?.payload&&Array.isArray(res.data.payload.exams))val={...SP_EMPTY(),...res.data.payload,goals:{...SP_EMPTY().goals,...res.data.payload.goals}};
      spWriteLocal(profile,val);
    }catch(err){spCloudWarning='Planning wordt nog lokaal bewaard. Activeer later de aanvullende Supabase-tabel.';console.warn('StudyForge planning cloud',err)}
  }
  // Publicatie My Future: toon Deans toets éénmalig in 'Mijn toetsen'.
  // Bewaar de markering zodat handmatig verwijderen niet ongedaan wordt gemaakt.
  if(Number(profile)===2 && spDate()<='2026-10-27' && !val.autoAddedEnglish20261027){
    const already=val.exams.some(e=>String(e.date)==='2026-10-27' && String(e.subject).trim().toLowerCase()==='engels');
    if(!already){
      val.exams.push({id:'dean-engels-my-future-2026-10-27',title:'Engels — My Future',subject:'Engels',date:'2026-10-27',targetGrade:Number(val.goals?.targetGrade||7)});
    }
    val.autoAddedEnglish20261027=true;
    try{await spSave(profile,val);}catch(err){console.warn('StudyForge: toetsdatum opslaan mislukt',err);}
  }
  // Biologie Unit 1 — eenmalig de toets van woensdag 28 oktober toevoegen.
  // Een reeds geplande toets wordt niet dubbel aangemaakt.
  if(Number(profile)===2 && spDate()<='2026-10-28' && !val.autoAddedBiology20261028){
    const already=val.exams.some(e=>String(e.date)==='2026-10-28' && String(e.subject).trim().toLowerCase()==='biologie');
    if(!already){
      val.exams.push({id:'dean-biologie-unit1-2026-10-28',title:'Biologie — Unit 1: Organen en cellen',subject:'Biologie',date:'2026-10-28',targetGrade:Number(val.goals?.targetGrade||7)});
    }
    val.autoAddedBiology20261028=true;
    try{await spSave(profile,val);}catch(err){console.warn('StudyForge: biologietoets opslaan mislukt',err);}
  }
  const published=(window.STUDYFORGE_PUBLISHED_EXAMS||[]).filter(e=>e.profile===(Number(profile)===1?'Nikki':'Dean'));
  let revised=false;
  for(const exam of published){
    const normalized={id:exam.id,title:exam.title,subject:exam.subject,date:exam.date,
      targetGrade:Number(exam.targetGrade)>0&&Number(exam.targetGrade)<=10?Number(exam.targetGrade):Number(val.goals?.targetGrade||7)};
    const i=val.exams.findIndex(e=>e.id===exam.id);
    if(i===-1){val.exams.push(normalized);revised=true}
    else if(JSON.stringify(val.exams[i])!==JSON.stringify(normalized)){val.exams[i]=normalized;revised=true}
  }
  if(revised)await spSave(profile,val);
  return val;
}
async function spSave(profile,val){
  spWriteLocal(profile,val);
  if(window.sfMode?.()==='supabase'){
    try{
      const client=await sfClient(),user=await sfRemoteUser();
      if(!user)throw Error('Nog niet ingelogd');
      const res=await client.from('sf_study_state').upsert({owner_id:user.id,profile_id:profile,payload:val,updated_at:new Date().toISOString()},{onConflict:'owner_id,profile_id'});
      if(res.error)throw res.error;
      spCloudWarning='';
    }catch(err){spCloudWarning='Op dit apparaat opgeslagen. Cloud synchronisatie wacht op de Supabase-inrichting.';toast(spCloudWarning,true)}
  }
}
async function studyBeforeRoute(route){
  if(route==='parent'){
    const ids=[1,2];
    const rows=await Promise.all(ids.map(id=>api('dashboard',null,{profile:id})));
    const plans=await Promise.all(ids.map(id=>spLoad(id)));
    spParentData=ids.map((id,i)=>({id,name:id===1?'Nikki':'Dean',dashboard:rows[i],plan:plans[i]}));
    spCurrent=await spLoad(state.profile);
    spProfile=state.profile;
  }else if(spProfile!==state.profile||route==='planning'||route==='ready'||route==='dashboard'){
    spCurrent=await spLoad(state.profile);spProfile=state.profile;
  }
}
function spBySubject(subject){
  const matching=collections().filter(c=>c.subject.toLowerCase().trim()===String(subject).toLowerCase().trim());
  return {quizzes:matching.filter(c=>c.type==='quiz'),cards:matching.filter(c=>c.type==='flashcards')};
}
function spReadiness(exam,db=state.dashboard,goal=spCurrent.goals){
  const sets=(db?.collections||[]).filter(c=>c.subject.toLowerCase().trim()===String(exam.subject).toLowerCase().trim());
  const quizzes=sets.filter(c=>c.type==='quiz'),cards=sets.filter(c=>c.type==='flashcards');
  const ids=new Set(quizzes.map(c=>Number(c.id)));
  const attempts=(db?.attempts||[]).filter(a=>ids.has(Number(a.collection_id)));
  const marks=attempts.slice(0,3).map(a=>Number(a.grade));
  const avg=marks.length?marks.reduce((a,b)=>a+b,0)/marks.length:null;
  const cardIds=new Set(cards.map(c=>Number(c.id)));
  const known=(db?.flash_progress||[]).filter(p=>cardIds.has(Number(p.collection_id))&&Number(p.known)===1).length;
  const totalCards=cards.reduce((n,c)=>n+Number(c.count||0),0);
  const missed=(db?.missed||[]).filter(m=>ids.has(Number(m.collection_id))).length;
  const target=Number(exam.targetGrade||goal?.targetGrade||7);
  const enough=attempts.length>=2&&avg!==null&&avg>=target&&missed===0&&(!totalCards||known/totalCards>=.8);
  const close=attempts.length>=1&&avg!==null&&avg>=target-1&&missed<=3;
  const label=enough?'Toetsklaar':close?'Goed op weg':attempts.length?'Nog oefenen':'Nog niet gemeten';
  return {label,enough,avg,missed,known,totalCards,attempts:attempts.length,target,quizzes,cards};
}
function spDueExams(arr=spCurrent.exams){
  return [...arr].filter(e=>e.date>=spDate()).sort((a,b)=>a.date.localeCompare(b.date));
}
function spExamSelect(){
  const due=spDueExams();
  if(!due.length)return null;
  return due.find(e=>e.id===spSelectedExam)||due[0];
}
function spExamCard(exam,compact=false){
  const m=spReadiness(exam),days=spDaysUntil(exam.date);
  return '<article class="study-exam">'+
    '<div class="study-exam-top"><span class="study-subject">'+htmlEscape(exam.subject)+'</span><span class="study-chip">'+(days===0?'Vandaag':days===1?'Morgen':'Over '+days+' dagen')+'</span></div>'+
    '<h3>'+htmlEscape(exam.title)+'</h3><p>'+htmlEscape(spDayLabel(exam.date))+' · Streefcijfer '+htmlEscape(m.target.toLocaleString('nl-NL'))+'</p>'+
    '<div class="study-readiness">'+htmlEscape(m.label)+(m.avg!==null?' · gemiddeld '+gradeFmt(m.avg):'')+'</div>'+
    '<div class="study-actions"><button class="study-button" data-action="study-open-ready" data-id="'+htmlEscape(exam.id)+'">Toetsklaar bekijken</button>'+
    '</div></article>';
}
function studyDashboardWidget(){
  const upcoming=spDueExams();
  return '<section class="study-dashboard-strip"><div><div class="eyebrow">JOUW LEERPLANNING</div><h2>'+(upcoming.length?'Binnenkort: '+htmlEscape(upcoming[0].title):'Nog geen toetsen gepland')+'</h2><p>'+(upcoming.length?'Nog '+spDaysUntil(upcoming[0].date)+' dagen · '+htmlEscape(upcoming[0].subject):'Toetsdata en nieuw lesmateriaal worden via het Huiswerk-project toegevoegd.')+'</p></div><button class="study-button" data-action="nav" data-route="planning">Mijn toetsen →</button></section>';
}
function spWeekProgress(db=state.dashboard,goal=spCurrent.goals){
  const d=spMidnight(spDate()),day=(d.getDay()+6)%7;
  const start=new Date(d);start.setDate(d.getDate()-day);
  const startDate=[start.getFullYear(),String(start.getMonth()+1).padStart(2,'0'),String(start.getDate()).padStart(2,'0')].join('-');
  const count=(db?.attempts||[]).filter(a=>String(a.created_at||'').slice(0,10)>=startDate).length;
  const target=Number(goal?.sessionsPerWeek||3);
  return {count,target};
}
function studyPlanContent(){
  const upcoming=spDueExams();
  const goals=spCurrent.goals;
  const weekly=spWeekProgress();
  return '<div class="page-enter">'+sectionHeading('JOUW PLANNING','Mijn toetsen','Bekijk je toetsdata en oefenschema. Nieuwe toetsen komen uit het Huiswerk-project.')+
  (spCloudWarning?'<p class="study-warning">'+htmlEscape(spCloudWarning)+'</p>':'')+
  '<section class="study-panel"><h2>Mijn leerdoelen</h2><p>We kijken naar gemaakte oefentoetsen. Dit zijn doelen, geen voorspelde cijfers.</p><p><b>Deze week: '+weekly.count+' van '+weekly.target+' geplande oefensessies</b> (gemaakte oefentoetsen).</p>'+
  '<div class="study-form"><label>Oefensessies per week<input type="number" id="study-weekly-goal" min="1" max="14" value="'+Number(goals.sessionsPerWeek||3)+'"></label>'+
  '<label>Algemeen streefcijfer<input type="number" id="study-general-target" min="1" max="10" step="0.5" value="'+Number(goals.targetGrade||7)+'"></label></div>'+
  '<button class="study-button secondary" data-action="study-save-goals">Doelen opslaan</button></section>'+
  '<section class="study-section"><h2>Geplande toetsen</h2><div class="study-exam-grid">'+(upcoming.length?upcoming.map(e=>spExamCard(e)).join(''):'<p class="study-muted">Er zijn nog geen toetsen gepland. Nieuwe toetsdata worden via het Huiswerk-project toegevoegd.</p>')+'</div></section></div>';
}
function spGenerateSessions(exam,limit=10){
 const dates=[],count=Math.min(Math.max(spDaysUntil(exam.date)+1,1),14),start=spMidnight(spDate());
 const m=spBySubject(exam.subject),packs=[...m.quizzes,...m.cards];
 for(let i=0;i<count&&dates.length<limit;i++){
   const d=new Date(start);d.setDate(start.getDate()+i);
   const key=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
   if(key>exam.date)break;
   const pack=packs.length?packs[i%packs.length]:null;
   dates.push({key,label:spDayLabel(key),pack,title:pack?(pack.type==='quiz'?'Maak oefentoets':'Oefen flashcards'):'Herhaal de lesstof'});
 }
 return dates;
}
function studyReadyContent(){
 const exam=spExamSelect();
 if(!exam)return '<div class="page-enter">'+sectionHeading('TOETSKLAAR','Toetsklaar','Zodra er een toetsdatum via het Huiswerk-project is toegevoegd, verschijnt hier jouw leeradvies.')</div>';
 const m=spReadiness(exam),sessions=spGenerateSessions(exam);
 return '<div class="page-enter">'+sectionHeading('HOE STA JE ERVOOR?','Toetsklaar · '+exam.title,'Op basis van je eigen oefeningen. Geen garantie voor je toetscijfer.')+
 '<div class="study-summary"><div><span class="study-big-label">'+htmlEscape(m.label)+'</span><h2>'+htmlEscape(exam.subject)+'</h2><p>'+spDayLabel(exam.date)+' · Streefcijfer '+m.target+'</p></div><div class="study-score">'+(m.avg===null?'—':gradeFmt(m.avg))+'<small>Gemiddelde laatste toetsen</small></div></div>'+
 '<div class="study-metrics"><div><b>'+m.attempts+'</b><span>Oefentoetsen gemaakt</span></div><div><b>'+m.missed+'</b><span>Openstaande fouten</span></div><div><b>'+m.known+'/'+m.totalCards+'</b><span>Flashcards gekend</span></div></div>'+
 '<section class="study-panel"><h2>Jouw oefenschema</h2><p>Per dag één gerichte oefensessie. Je kunt zelf afvinken wat je hebt gedaan.</p><div class="study-timeline">'+sessions.map(s=>{
   const done=!!spCurrent.completed[exam.id+'|'+s.key];
   return '<div class="study-day"><button class="study-check '+(done?'done':'')+'" data-action="study-toggle-day" data-id="'+htmlEscape(exam.id)+'" data-date="'+s.key+'" aria-label="Oefensessie afvinken">'+(done?'✓':'○')+'</button><div><b>'+htmlEscape(s.label)+'</b><p>'+htmlEscape(s.title)+(s.pack?' · '+htmlEscape(s.pack.title):'')+'</p></div>'+(s.pack?'<button class="study-link" data-action="study-open-pack" data-id="'+s.pack.id+'">Start →</button>':'')+'</div>';
 }).join('')+'</div></section>'+
 '<button class="study-button secondary" data-action="nav" data-route="planning">Andere toets bekijken</button></div>';
}
function studyParentContent(){
 if(!spParentData)return '<div class="page-enter">'+sectionHeading('OVERZICHT','Ouderoverzicht','Gegevens ophalen...')+'</div>';
 return '<div class="page-enter">'+sectionHeading('VOOR HET GEZIN','Ouderoverzicht','De leerresultaten en komende toetsen van Nikki en Dean op één plek.')+
 '<div class="study-parent-grid">'+spParentData.map(p=>{
   const recent=p.dashboard.attempts||[],grades=recent.map(a=>Number(a.grade)),average=grades.length?grades.reduce((a,b)=>a+b,0)/grades.length:null;
   const upcoming=spDueExams(p.plan.exams);
   return '<section class="study-panel"><div class="study-person"><span class="avatar small '+p.name.toLowerCase()+'">'+p.name[0]+'</span><h2>'+p.name+'</h2></div>'+
   '<div class="study-metrics"><div><b>'+recent.length+'</b><span>Toetsen gemaakt</span></div><div><b>'+(average===null?'—':gradeFmt(average))+'</b><span>Gemiddeld cijfer</span></div></div>'+
   '<h3>Komende toetsen</h3>'+(upcoming.length?upcoming.map(e=>{
     const m=spReadiness(e,p.dashboard,p.plan.goals);
     return '<div class="study-parent-exam"><b>'+htmlEscape(e.title)+'</b><span>'+spDayLabel(e.date)+' · '+htmlEscape(m.label)+'</span></div>';
   }).join(''):'<p class="study-muted">Nog geen toetsen gepland</p>')+'</section>';
 }).join('')+'</div><p class="study-muted">Resultaten worden voorlopig in deze browser bewaard. Synchronisatie tussen apparaten komt beschikbaar zodra Supabase met een gezinsaccount is gekoppeld.</p></div>';
}
async function studyHandleAction(action,btn){
 if(action==='study-save-goals'){
   const sessions=Number(document.querySelector('#study-weekly-goal')?.value),grade=Number(document.querySelector('#study-general-target')?.value);
   if(!Number.isInteger(sessions)||sessions<1||sessions>14||!Number.isFinite(grade)||grade<1||grade>10){toast('Controleer je leerdoelen.',true);return;}
   spCurrent.goals={sessionsPerWeek:sessions,targetGrade:grade};
   await spSave(state.profile,spCurrent);render();toast('Leerdoelen opgeslagen.');
 }
 else if(action==='study-open-ready'){
   spSelectedExam=btn.dataset.id;await navigate('ready');
 }
 else if(action==='study-toggle-day'){
   const key=btn.dataset.id+'|'+btn.dataset.date;
   spCurrent.completed[key]=!spCurrent.completed[key];
   await spSave(state.profile,spCurrent);render();
 }
 else if(action==='study-open-pack'){await openPack(btn.dataset.id)}
}
window.studyBeforeRoute=studyBeforeRoute;
window.studyDashboardWidget=studyDashboardWidget;
window.studyPlanContent=studyPlanContent;
window.studyReadyContent=studyReadyContent;
window.studyParentContent=studyParentContent;
window.studyHandleAction=studyHandleAction;
