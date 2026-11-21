/* StudyForge — planning, doelen, indicatieve toetsgereedheid en ouderoverzicht */
'use strict';
const SP_KEY='studyforge-planning-v1';
const SP_EMPTY=()=>({exams:[],goals:{sessionsPerWeek:3,targetGrade:7},completed:{},scheduleStarts:{}});
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
  if(window.sfCloudEnabled&&window.sfCloud?.pin){
    const cloudPlan=await window.sfCloud.getPlan(profile);
    if(cloudPlan&&Array.isArray(cloudPlan.exams)){
      val={...SP_EMPTY(),...cloudPlan,goals:{...SP_EMPTY().goals,...cloudPlan.goals}};
      spWriteLocal(profile,val);
    }
  }
  if(window.sfMode?.()==='supabase'){
    try{
      const client=await sfClient(),res=await client.from('sf_study_state').select('payload').eq('profile_id',profile).maybeSingle();
      if(res.error)throw res.error;
      if(res.data?.payload&&Array.isArray(res.data.payload.exams))val={...SP_EMPTY(),...res.data.payload,goals:{...SP_EMPTY().goals,...res.data.payload.goals}};
      spWriteLocal(profile,val);
    }catch(err){spCloudWarning='Planning wordt nog lokaal bewaard. Activeer later de aanvullende Supabase-tabel.';console.warn('StudyForge planning cloud',err)}
  }
  // Afronden Engels: ruim alleen de eerder automatisch geplande My Future-toets op.
  // Alle gemaakte toetsen, cijfers en leerstatistieken blijven behouden.
  if(Number(profile)===2){
    const before=val.exams.length;
    val.exams=val.exams.filter(e=>e.id!=='dean-engels-my-future-2026-10-27');
    val.autoAddedEnglish20261027=true; // voorkomt opnieuw toevoegen door een oude versie
    if(before!==val.exams.length){
      try{await spSave(profile,val);}catch(err){console.warn('StudyForge: afgeronde Engelse toets verbergen mislukt',err);}
    }
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
  val.scheduleStarts=val.scheduleStarts&&typeof val.scheduleStarts==='object'?val.scheduleStarts:{};
  let anchorsAdded=false;
  for(const exam of val.exams){
    if(exam&&window.sfExamPrep?.date?.(exam.date)&&exam.date>=spDate()&&!val.scheduleStarts[exam.id]){
      val.scheduleStarts[exam.id]=spDate();
      anchorsAdded=true;
    }
  }
  if(revised||anchorsAdded)await spSave(profile,val);
  return val;
}
async function spSave(profile,val){
  spWriteLocal(profile,val);
  if(window.sfCloudEnabled&&window.sfCloud?.pin){
    try{
      await window.sfCloud.savePlan(profile,val);
      spCloudWarning='';
    }catch(err){spCloudWarning='Planning lokaal bewaard, maar cloud synchronisatie is mislukt.';toast(spCloudWarning,true);}
  }
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
 const schedule=window.sfExamPrep.plan(exam,state.profile,state.dashboard,spCurrent);
 return '<article class="study-exam">'+
   '<div class="study-exam-top"><span class="study-subject">'+htmlEscape(exam.subject)+'</span><span class="study-chip">'+(days===0?'Vandaag':days===1?'Morgen':'Over '+days+' dagen')+'</span></div>'+
   '<h3>'+htmlEscape(exam.title)+'</h3><p>'+htmlEscape(spDayLabel(exam.date))+' · Streefcijfer '+htmlEscape(m.target.toLocaleString('nl-NL'))+'</p>'+
   '<div class="study-readiness">'+htmlEscape(m.label)+(m.avg!==null?' · gemiddeld '+gradeFmt(m.avg):'')+'</div>'+
   '<p>'+schedule.complete+' van '+schedule.total+' geplande oefensessies afgevinkt</p>'+
   '<div class="study-actions"><button class="study-button" data-action="study-open-ready" data-id="'+htmlEscape(exam.id)+'">Toetsklaar bekijken</button>'+
   (String(exam.id||'').startsWith('local-exam-')?'<button class="study-button secondary" data-action="study-delete-exam" data-id="'+htmlEscape(exam.id)+'">Verwijderen</button>':'')+
   '</div></article>';
}
function studyDashboardWidget(){
 const upcoming=spDueExams();
 const first=upcoming[0],schedule=first?window.sfExamPrep.plan(first,state.profile,state.dashboard,spCurrent):null;
 return '<section class="study-dashboard-strip"><div><div class="eyebrow">JOUW LEERPLANNING</div><h2>'+
   (first?'Binnenkort: '+htmlEscape(first.title):'Nog geen toetsen gepland')+'</h2>'+
   '<p>'+(first?'Nog '+spDaysUntil(first.date)+' dagen · '+htmlEscape(first.subject)+
     ' · '+schedule.complete+'/'+schedule.total+' oefensessies afgevinkt':
     'Voeg een toetsdatum toe om een gericht oefenschema te maken.')+'</p></div>'+
   (first?'<button class="study-button" data-action="study-open-ready" data-id="'+htmlEscape(first.id)+'">Bekijk voorbereiding →</button>':
     '<button class="study-button" data-action="nav" data-route="planning">Toets plannen →</button>')+'</section>';
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
  const upcoming=spDueExams(),goals=spCurrent.goals,weekly=spWeekProgress();
  const subjects=[...new Set(collections().map(c=>String(c.subject||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'nl'));
  return '<div class="page-enter">'+sectionHeading('JOUW PLANNING','Mijn toetsen','Voeg zelf een toets toe of gebruik de toetsdata uit het Huiswerk-project.')+
    (spCloudWarning?'<p class="study-warning">'+htmlEscape(spCloudWarning)+'</p>':'')+
    '<section class="study-panel"><h2>Mijn leerdoelen</h2><p>Deze doelen zijn geen voorspelling van je echte toetscijfer.</p>'+
    '<p><b>Deze week: '+weekly.count+' van '+weekly.target+' geplande oefentoetsen</b> (alleen afgeronde oefentoetsen worden hier meegeteld).</p>'+
    '<div class="study-form"><label>Oefentoetsen per week<input type="number" id="study-weekly-goal" min="1" max="14" value="'+Number(goals.sessionsPerWeek||3)+'"></label>'+
    '<label>Algemeen streefcijfer<input type="number" id="study-general-target" min="1" max="10" step="0.5" value="'+Number(goals.targetGrade||7)+'"></label></div>'+
    '<button class="study-button secondary" data-action="study-save-goals">Doelen opslaan</button></section>'+
    '<section class="study-panel"><h2>Nieuwe toets plannen</h2>'+
    '<p>Je mag ook een toets invoeren waarvoor nog geen lesstof op StudyForge staat. Het oefenschema wordt dan aangevuld zodra dat materiaal is gepubliceerd.</p>'+
    '<div class="study-form study-form-r4">'+
      '<label>Naam toets<input id="study-new-title" type="text" maxlength="120" placeholder="Bijvoorbeeld Hoofdstuk 2" autocomplete="off"></label>'+
      '<label>Vak<input id="study-new-subject" type="text" list="study-subject-list" maxlength="80" placeholder="Bijvoorbeeld Wiskunde" autocomplete="off">'+
      '<datalist id="study-subject-list">'+subjects.map(x=>'<option value="'+htmlEscape(x)+'"></option>').join('')+'</datalist></label>'+
      '<label>Toetsdatum<input id="study-new-date" type="date" min="'+spDate()+'"></label>'+
      '<label>Streefcijfer<input id="study-new-target" type="number" min="1" max="10" step="0.5" value="'+Number(goals.targetGrade||7)+'"></label>'+
    '</div><button class="study-button" data-action="study-add-exam">Toets toevoegen</button></section>'+
    '<section class="study-section"><h2>Geplande toetsen</h2><div class="study-exam-grid">'+
    (upcoming.length?upcoming.map(e=>spExamCard(e)).join(''):
      '<p class="study-muted">Nog geen toetsen gepland. Vul hierboven een datum in om een persoonlijk oefenschema te maken.</p>')+
    '</div></section></div>';
}
function spGenerateSessions(exam,limit=10){
  return window.sfExamPrep.plan(exam,state.profile,state.dashboard,spCurrent,new Date(),limit).items;
}
function studyReadyContent(){
  const exam=spExamSelect();
  if(!exam)return '<div class="page-enter">'+sectionHeading('TOETSKLAAR','Toetsvoorbereiding','Voeg eerst een toetsdatum toe bij Mijn toetsen.')+
    '<section class="study-panel"><p>Er is nog geen aankomende toets ingepland. Je kunt zelf de datum en het vak invoeren.</p>'+
    '<button class="study-button" data-action="nav" data-route="planning">Nieuwe toets plannen →</button></section></div>';
  const m=spReadiness(exam),schedule=window.sfExamPrep.plan(exam,state.profile,state.dashboard,spCurrent),next=schedule.next;
  const percentage=schedule.total?Math.round(100*schedule.complete/schedule.total):0;
  const link=(item,label='Start →')=>item?.pack?'<button class="study-link" data-action="study-start-session" data-id="'+Number(item.pack.id)+
    '" data-mode="'+htmlEscape(item.mode)+'" data-source="'+htmlEscape(String(item.pack.source_key||item.pack.id))+'">'+htmlEscape(label)+'</button>':'';
  const timeline=schedule.items.map(item=>{
    const action=link(item,'Oefenen →');
    const when=item.date===spDate()?'Vandaag':spDayLabel(item.date);
    return '<div class="study-day">'+
      '<button class="study-check '+(item.completed?'done':'')+'" data-action="study-toggle-day" data-id="'+htmlEscape(exam.id)+
        '" data-date="'+item.date+'" aria-pressed="'+(item.completed?'true':'false')+
        '" aria-label="Oefensessie '+htmlEscape(when)+' '+(item.completed?'opnieuw openen':'afvinken')+'">'+(item.completed?'✓':'○')+'</button>'+
      '<div><b>'+htmlEscape(when)+'</b><p>'+htmlEscape(item.label)+(item.pack?' · '+htmlEscape(item.pack.title):'')+'</p>'+
      (item.reason?'<p class="study-reason">'+htmlEscape(item.reason)+'</p>':'')+'</div>'+action+'</div>';
  }).join('');
  const nextAction=next?.pack?'<div class="study-next-action"><span class="study-chip">VOLGENDE STAP</span>'+
    '<h3>'+htmlEscape(next.label)+' · '+htmlEscape(next.pack.title)+'</h3>'+
    '<p>'+htmlEscape(next.reason||'Oefen dit onderwerp op jouw eigen tempo.')+'</p>'+
    '<p>'+htmlEscape(next.date===spDate()?'Vandaag':spDayLabel(next.date))+'</p>'+link(next,'Begin direct →')+'</div>':'';
  return '<div class="page-enter">'+sectionHeading('HOE STA JE ERVOOR?','Toetsklaar · '+exam.title,'Een oefenadvies op basis van jouw eigen leerresultaten. Geen voorspelling van je echte cijfer.')+
    '<div class="study-summary"><div><span class="study-big-label">'+htmlEscape(m.label)+'</span>'+
    '<h2>'+htmlEscape(exam.subject)+'</h2><p>'+spDayLabel(exam.date)+' · Streefcijfer '+Number(m.target).toLocaleString('nl-NL')+'</p></div>'+
    '<div class="study-score">'+(m.avg===null?'—':gradeFmt(m.avg))+'<small>Gemiddelde laatste oefentoetsen</small></div></div>'+
    '<div class="study-metrics"><div><b>'+m.attempts+'</b><span>Oefentoetsen gemaakt</span></div><div><b>'+m.missed+'</b><span>Nog fout beantwoorde vragen</span></div>'+
    '<div><b>'+m.known+'/'+m.totalCards+'</b><span>Flashcards gekend</span></div></div>'+
    '<section class="study-panel"><h2>Jouw persoonlijke voorbereiding</h2>'+
    '<p>De planning geeft prioriteit aan lastige en nog niet geoefende stof. Je kunt iedere oefening zelf starten en afvinken.</p>'+
    '<div class="study-progress-row"><b>'+schedule.complete+' van '+schedule.total+' sessies afgevinkt</b><span>'+percentage+'%</span></div>'+
    '<div class="study-progress-track"><span style="width:'+percentage+'%"></span></div>'+
    (schedule.available?nextAction:
      '<p class="study-warning">Er staat nog geen oefenmateriaal voor '+htmlEscape(exam.subject)+
      ' op StudyForge. Het schema kan wel worden afgevinkt; voor gerichte oefeningen moet de lesstof eerst via het Huiswerk-project worden toegevoegd.</p>')+
    '<div class="study-timeline">'+timeline+'</div></section>'+
    '<button class="study-button secondary" data-action="nav" data-route="planning">Andere toets bekijken</button></div>';
}
function studyParentContent(){
  if(!spParentData)return '<div class="page-enter">'+sectionHeading('OVERZICHT','Ouderoverzicht','Gegevens ophalen...')+'</div>';
  return '<div class="page-enter">'+sectionHeading('VOOR HET GEZIN','Ouderoverzicht',
    'De voortgang en toetsvoorbereiding van Nikki en Dean op dit apparaat.')+
    '<p class="study-warning">Dit overzicht gebruikt alleen gegevens die in deze browser staan. Oefeningen op een andere telefoon of computer zijn pas zichtbaar nadat een back-up is hersteld.</p>'+
    '<div class="study-parent-grid">'+spParentData.map(p=>{
      const snap=window.sfExamPrep.parent(p.id,p.dashboard,p.plan),name=htmlEscape(p.name);
      const trend=snap.trend===null?'Nog geen vergelijking':snap.trend>0.15?'Stijging van '+gradeFmt(snap.trend)+' punt':snap.trend<-.15?
        'Daling van '+gradeFmt(Math.abs(snap.trend))+' punt':'Nagenoeg gelijk';
      const last=snap.mostRecent&&Number.isFinite(Date.parse(snap.mostRecent.created_at||''))?
        'Laatste oefentoets: '+htmlEscape(snap.mostRecent.title)+' · '+htmlEscape(snap.mostRecent.created_at.slice(0,10)):'Nog geen lokale toetsresultaten';
      const reco=snap.topRecommendation;
      return '<section class="study-panel study-parent-card"><div class="study-person"><span class="avatar small '+p.name.toLowerCase()+'">'+p.name[0]+'</span><h2>'+name+'</h2></div>'+
        '<div class="study-metrics study-parent-metrics"><div><b>'+snap.count+'</b><span>Oefentoetsen gemaakt</span></div>'+
        '<div><b>'+(snap.avg===null?'—':gradeFmt(snap.avg))+'</b><span>Gemiddelde laatste 3 toetsen</span></div>'+
        '<div><b>'+snap.due+'</b><span>Herhaalvragen klaar</span></div>'+
        '<div><b>'+snap.focus+'</b><span>Lespakketten met extra aandacht</span></div></div>'+
        '<p class="study-muted">'+last+'</p>'+
        (snap.trend!==null?'<p class="study-muted">Vergelijking laatste 3 met vorige 3: '+htmlEscape(trend)+'</p>':'')+
        '<div class="study-parent-focus"><b>Aandacht voor de volgende oefening</b>'+
          (reco?'<p>'+htmlEscape(reco.subject)+' · '+htmlEscape(reco.title)+'</p>'+
            '<p>'+htmlEscape(reco.reason)+'</p>':
            '<p>Nog onvoldoende lokale gegevens om een onderwerp aan te bevelen.</p>')+'</div>'+
        '<h3>Komende toetsen</h3>'+(snap.upcoming.length?snap.upcoming.map(x=>{
          const m=spReadiness(x.exam,p.dashboard,p.plan.goals);
          return '<div class="study-parent-exam"><div><b>'+htmlEscape(x.exam.title)+'</b>'+
            '<p>'+htmlEscape(x.exam.subject)+' · '+htmlEscape(spDayLabel(x.exam.date))+'</p></div>'+
            '<span>'+htmlEscape(m.label)+' · '+x.schedule.complete+'/'+x.schedule.total+' voorbereid</span></div>';
        }).join(''):'<p class="study-muted">Nog geen toets gepland in deze browser</p>')+
        '</section>';
    }).join('')+'</div></div>';
}
async function studyHandleAction(action,btn){
 if(action==='study-save-goals'){
   const sessions=Number(document.querySelector('#study-weekly-goal')?.value);
   const grade=Number(document.querySelector('#study-general-target')?.value);
   if(!Number.isInteger(sessions)||sessions<1||sessions>14||!Number.isFinite(grade)||grade<1||grade>10){
     toast('Controleer je leerdoelen.',true);return;
   }
   spCurrent.goals={sessionsPerWeek:sessions,targetGrade:grade};
   await spSave(state.profile,spCurrent);render();toast('Leerdoelen opgeslagen.');
 }
 else if(action==='study-add-exam'){
   const title=String(document.querySelector('#study-new-title')?.value||'').trim();
   const subject=String(document.querySelector('#study-new-subject')?.value||'').trim();
   const date=String(document.querySelector('#study-new-date')?.value||'').trim();
   const target=Number(document.querySelector('#study-new-target')?.value);
   if(title.length<2||title.length>120||subject.length<2||subject.length>80||
      !window.sfExamPrep.date(date)||date<spDate()||!Number.isFinite(target)||target<1||target>10){
     toast('Vul een toetsnaam, vak, geldige toekomstige datum en streefcijfer van 1 tot 10 in.',true);return;
   }
   if(spCurrent.exams.some(e=>e.date===date&&window.sfExamPrep.subject(e.subject)===window.sfExamPrep.subject(subject)&&
      String(e.title||'').trim().toLowerCase()===title.toLowerCase())){
     toast('Deze toets staat al in je planning.',true);return;
   }
   const id='local-exam-'+state.profile+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
   spCurrent.exams.push({id,title,subject,date,targetGrade:target});
   spCurrent.scheduleStarts=spCurrent.scheduleStarts||{};
   spCurrent.scheduleStarts[id]=spDate();
   await spSave(state.profile,spCurrent);spSelectedExam=id;render();toast('Toets toegevoegd. Het oefenschema is beschikbaar.');
 }
 else if(action==='study-delete-exam'){
   const id=String(btn.dataset.id||'');
   if(!id.startsWith('local-exam-')||!spCurrent.exams.some(e=>e.id===id))return;
   if(!window.confirm('Deze geplande toets verwijderen? Bestaande cijfers en leerresultaten blijven bewaard.'))return;
   spCurrent.exams=spCurrent.exams.filter(e=>e.id!==id);
   if(spSelectedExam===id)spSelectedExam=null;
   await spSave(state.profile,spCurrent);render();toast('Toets uit de planning verwijderd.');
 }
 else if(action==='study-start-session'){
   const id=Number(btn.dataset.id),mode=String(btn.dataset.mode||''),source=String(btn.dataset.source||'');
   const pack=collections().find(x=>Number(x.id)===id);
   if(!pack){toast('Het oefenmateriaal is niet meer beschikbaar.',true);return;}
   if(mode==='review'){
     const due=window.sfReview?.summary?.().dueItems||[];
     if(due.some(x=>x.source===source))return window.sfReview.start(source);
     if(pack.type==='flashcards')return openPack(id);
     return window.sfLearning.start('guided',id);
   }
   if(mode==='guided'||mode==='recall')return window.sfLearning.start(mode,id);
   return openPack(id);
 }
 else if(action==='study-open-ready'){
   spSelectedExam=btn.dataset.id;await navigate('ready');
 }
 else if(action==='study-toggle-day'){
   const key=btn.dataset.id+'|'+btn.dataset.date;
   spCurrent.completed=spCurrent.completed||{};
   spCurrent.completed[key]=!spCurrent.completed[key];
   await spSave(state.profile,spCurrent);render();
 }
 else if(action==='study-open-pack'){await openPack(btn.dataset.id);}
}
window.studyBeforeRoute=studyBeforeRoute;
window.studyDashboardWidget=studyDashboardWidget;
window.studyPlanContent=studyPlanContent;
window.studyReadyContent=studyReadyContent;
window.studyParentContent=studyParentContent;
window.studyHandleAction=studyHandleAction;
