/* StudyForge R3 — lokale, uitlegbare leercoach. Geen database of AI-API. */
'use strict';
(function(){
function sfCoachRead(key,fallback){
 try{const text=localStorage.getItem(key);if(!text)return fallback;const parsed=JSON.parse(text);return parsed&&typeof parsed==='object'?parsed:fallback;}
 catch{return fallback;}
}

function sfCoachToday(now){
 const d=new Date(now);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}

function sfCoachAverage(grades){
 return grades.length?grades.reduce((sum,n)=>sum+n,0)/grades.length:null;
}

function sfCoachCollect(profile=Number(state.profile),dashboard=state.dashboard,now=Date.now()){
 if(![1,2].includes(Number(profile))||!dashboard)return [];
 const sets=(dashboard.collections||[]).filter(p=>p&&(p.type==='quiz'||p.type==='flashcards'));
 const history=(dashboard.attempts||[]).filter(a=>Number.isFinite(Number(a.grade)));
 const ratings=(dashboard.flash_progress||[]);
 const reviews=sfCoachRead('studyforge-reviews-v1:'+profile,{records:{}}).records||{};
 const learn=sfCoachRead('studyforge-learning-v1:'+profile,{});
 const examList=(typeof spReadLocal==='function'?spReadLocal(profile).exams:[])||[];
 const today=sfCoachToday(now);
 const midnight=new Date(today+'T12:00:00').getTime();
 const dayMs=86400000;
 const raw=typeof sfLocal==='function'?sfLocal().sets:[];
 return sets.map(pack=>{
   const id=Number(pack.id),source=String(pack.source_key||id);
   const tests=history.filter(a=>Number(a.collection_id)===id)
     .sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0)).slice(0,3);
   const grades=tests.map(a=>Number(a.grade)).filter(Number.isFinite);
   const average=sfCoachAverage(grades);
   const recorded=Object.values(reviews).filter(r=>r&&r.source===source&&r.type===pack.type);
   const due=recorded.filter(r=>Number.isFinite(Date.parse(r.dueAt))&&Date.parse(r.dueAt)<=now).length;
   const uncertain=recorded.filter(r=>r.quality===0||r.quality===1).length;
   const cardGrades=ratings.filter(r=>Number(r.collection_id)===id);
   const known=cardGrades.filter(r=>Number(r.known)===1).length;
   const records=[learn['guided:'+source],learn['recall:'+source]].filter(r=>r&&Number(r.total)>0);
   records.sort((a,b)=>Date.parse(b.last||0)-Date.parse(a.last||0));
   const lastLearn=records[0]||null;
   const attempted=grades.length>0||cardGrades.length>0||recorded.length>0||!!lastLearn;
   const exam=examList.filter(e=>e&&e.date>=today&&
     String(e.subject||'').toLowerCase().trim()===String(pack.subject||'').toLowerCase().trim())
     .map(e=>({...e,days:Math.round((new Date(e.date+'T12:00:00').getTime()-midnight)/dayMs)}))
     .filter(e=>e.days>=0).sort((a,b)=>a.days-b.days)[0]||null;
   const examBonus=exam?(exam.days<=3?22:exam.days<=7?15:exam.days<=14?8:0):0;
   let score=0,label='',reason='',mode='',tone='';
   if(due>0){
     score=100+Math.min(due,8)*4+examBonus;
     label='Tijd om te herhalen';tone='due';
     reason=due+' '+(due===1?'vraag staat':'vragen staan')+' klaar voor herhaling.';
     mode='review';
   }else if(pack.type==='quiz'&&average!==null&&average<6.5){
     score=75+Math.min(20,Math.round((6.5-average)*6))+examBonus;
     label='Extra oefenen';tone='focus';
     reason='Je laatste '+grades.length+' '+(grades.length===1?'oefentoets had':'oefentoetsen hadden gemiddeld')+
       ' een '+(grades.length===1?'cijfer':'cijfer van')+' '+average.toLocaleString('nl-NL',{maximumFractionDigits:1})+'.';
     mode='guided';
   }else if(uncertain>0){
     score=69+Math.min(15,uncertain*3)+examBonus;
     label='Nog onzeker';tone='focus';
     reason=uncertain+' '+(uncertain===1?'vraag of kaart verdient':'vragen of kaarten verdienen')+' extra aandacht.';
     mode=pack.type==='quiz'?'guided':'open';
   }else if(pack.type==='quiz'&&lastLearn&&Number(lastLearn.correct)/Number(lastLearn.total)<.7){
     score=66+examBonus;label='Herhaal de uitleg';tone='focus';
     reason='Bij je laatste leersessie ging '+Number(lastLearn.correct)+' van '+Number(lastLearn.total)+' meteen goed.';
     mode='guided';
   }else if(pack.type==='flashcards'&&cardGrades.length>0&&known<Number(pack.count||0)){
     score=54+examBonus;label='Kaarten oefenen';tone='practice';
     reason='Je kende '+known+' van '+Number(pack.count||0)+' kaarten bij de laatste beoordeling.';
     mode='open';
   }else if(!attempted){
     score=27+examBonus;label='Nog niet geoefend';tone='new';
     reason='Voor dit onderwerp zijn nog geen oefenresultaten vastgelegd.';
     mode=pack.type==='quiz'?'guided':'open';
   }else{
     score=15+examBonus;label='Blijf oefenen';tone='steady';
     reason=average!==null?'Je laatste '+grades.length+' '+(grades.length===1?'cijfer is ':'cijfers zijn gemiddeld ')+
        average.toLocaleString('nl-NL',{maximumFractionDigits:1})+'. Blijf regelmatig oefenen.':
       'Dit onderwerp is al geoefend. Houd je kennis bij.';
     mode=pack.type==='quiz'?'recall':'open';
   }
   if(mode==='recall'){
     const full=raw.find(x=>Number(x.id)===id&&Number(x.profile_id)===Number(profile));
     const canRecall=full?.content?.questions?.some(q=>window.sfLearning?.isRecallEligible?.(q));
     if(!canRecall)mode='guided';
   }
   const action=mode==='review'?'Herhaal dit onderwerp':mode==='guided'?'Leer in stappen':
     mode==='recall'?'Leg het uit':pack.type==='flashcards'?'Oefen flashcards':'Open oefentoets';
   return {id,source,title:pack.title,subject:pack.subject,type:pack.type,count:Number(pack.count)||0,
     score,mode,action,label,reason,tone,due,uncertain,exam,attempted,average,
     date:Date.parse(pack.created_at||0)||0};
 }).sort((a,b)=>b.score-a.score||b.date-a.date||b.id-a.id);
}

function sfCoachSummary(){
 const all=sfCoachCollect();
 return {all,focus:all.filter(x=>x.tone==='focus'||x.tone==='due').length,
   due:all.reduce((n,x)=>n+x.due,0),available:all.length};
}

function sfCoachContext(item){
 if(!item.exam)return '';
 return item.exam.days===0?'Toets voor '+item.subject+' vandaag':
   item.exam.days===1?'Toets voor '+item.subject+' morgen':
   'Toets voor '+item.subject+' over '+item.exam.days+' dagen';
}

function sfCoachDashboard(){
 const d=sfCoachSummary();
 if(!d.available)return '';
 const item=d.all[0],fresh=!d.all.some(x=>x.attempted);
 return `<section class="sf-coach-r3" aria-label="Persoonlijke leercoach">
   <div class="sf-coach-r3-intro">
      <span class="sf-eyebrow">JOUW PERSOONLIJKE LEERCOACH</span>
      <h2>${fresh?'Waar beginnen we vandaag?':d.due?'Er staat iets klaar om te herhalen':d.focus?'Dit verdient extra aandacht':'Dit kun je vandaag oefenen'}</h2>
      <p>${fresh?'Er zijn nog geen oefenresultaten. Begin met een onderwerp; daarna worden je adviezen persoonlijker.':
       'Gebaseerd op jouw lokale toetsresultaten, zelfbeoordelingen en herhaalmomenten.'}</p>
      <div class="sf-coach-r3-metrics">
        <span><b>${d.due}</b> vragen klaar voor herhaling</span>
        <span><b>${d.focus}</b> onderwerpen met extra aandacht</span>
      </div>
   </div>
   <div class="sf-coach-r3-pick">
     <div class="sf-coach-r3-chip">${htmlEscape(item.label)}</div>
     <div class="sf-coach-r3-subject">${htmlEscape(item.subject)}</div>
     <h3>${htmlEscape(item.title)}</h3>
     <p>${htmlEscape(item.reason)}</p>
     ${item.exam?`<p class="sf-coach-r3-exam">${htmlEscape(sfCoachContext(item))}</p>`:''}
     <button class="btn btn-primary" data-action="coach-action" data-id="${item.id}">${htmlEscape(item.action)} →</button>
     <button class="sf-coach-r3-link" data-action="nav" data-route="coach">Bekijk mijn leerroute</button>
   </div>
 </section>`;
}

function sfCoachPage(){
 const data=sfCoachSummary(),top=data.all.slice(0,6);
 return `<div class="page-enter sf-coach-page">
   ${sectionHeading('SLIM STUDEREN','Mijn persoonlijke leerroute',
     'Kies wat nu de meeste aandacht verdient. De adviezen komen uit jouw eigen resultaten, zonder AI of database.')}
   <div class="sf-coach-r3-overview">
     <div><b>${data.available}</b><span>Beschikbare onderwerpen</span></div>
     <div><b>${data.focus}</b><span>Extra aandacht</span></div>
     <div><b>${data.due}</b><span>Herhaalvragen klaar</span></div>
   </div>
   ${top.length?`<div class="sf-coach-r3-list">${top.map((item,i)=>`<article class="sf-coach-r3-item">
     <div class="sf-coach-r3-number">${i+1}</div>
     <div class="sf-coach-r3-body">
       <div class="sf-coach-r3-tag">${htmlEscape(item.subject)} · ${htmlEscape(item.label)}</div>
       <h2>${htmlEscape(item.title)}</h2><p>${htmlEscape(item.reason)}</p>
       ${item.exam?`<p class="sf-coach-r3-exam">${htmlEscape(sfCoachContext(item))}</p>`:''}
       <button class="btn btn-primary" data-action="coach-action" data-id="${item.id}">${htmlEscape(item.action)} →</button>
     </div></article>`).join('')}</div>`:
     '<div class="sf-empty"><b>Er is nog geen lesmateriaal.</b><p>Nieuwe lessen uit GitHub verschijnen hier vanzelf.</p></div>'}
   <div class="sf-coach-r3-explain"><b>Hoe kiest StudyForge deze route?</b>
     <p>Vragen die nu herhaald moeten worden krijgen voorrang. Daarna kijken we naar recente lage cijfers,
     onderwerpen die je bijna wist en nieuwe leerstof. Een aankomende toets geeft extra prioriteit.</p>
     <p>Dit is een oefenadvies, geen voorspelling van je toetscijfer. Alles blijft op dit apparaat;
     gebruik regelmatig Back-up en herstel.</p></div>
 </div>`;
}

async function sfCoachHandle(btn){
 const id=Number(btn?.dataset?.id),item=sfCoachCollect().find(x=>x.id===id);
 if(!item){toast('Dit onderwerp is niet meer beschikbaar.',true);return;}
 if(item.mode==='review')return window.sfReview?.start?.(item.source);
 if(item.mode==='guided'||item.mode==='recall')return window.sfLearning?.start?.(item.mode,item.id);
 return openPack(item.id);
}
window.sfCoach={collect:sfCoachCollect,summary:sfCoachSummary,dashboard:sfCoachDashboard,page:sfCoachPage,handle:sfCoachHandle};
})();
