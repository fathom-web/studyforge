/* StudyForge — begeleid leren en actief ophalen voor Nikki en Dean.
   Inhoud komt uit de gepubliceerde oefenbibliotheek, niet uit externe AI.
   Voortgang staat uitsluitend in deze browser. */
'use strict';
(function(){
 const KEY_BASE='studyforge-learning-v1:';
 const storageKey=()=>KEY_BASE+String(state.profile||0);
 const kinds={
   guided:{title:'Leer in stappen',label:'Methode 03',verb:'Stap voor stap',desc:'Eerst begrijpen, dan een kleine opdracht. Bij iedere stap krijg je meteen uitleg.',icon:'book'},
   recall:{title:'Leg het uit',label:'Methode 04',verb:'Actief onthouden',desc:'Geef zelf antwoord zonder keuzes. Vergelijk daarna met het modelantwoord en herhaal wat lastig is.',icon:'spark'}
 };
 let session=null;
 const esc=String;
 const store=()=>{
   try{const v=JSON.parse(localStorage.getItem(storageKey())||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}
 };
 function stats(kind,pack){
   const record=store()[kind+':'+String(pack.source_key||pack.id)];
   return record&&typeof record==='object'?record:null;
 }
 function save(){
   if(!session||session.recorded)return;
   const data=store(),id=session.kind+':'+String(session.pack.source_key||session.pack.id);
   const previous=data[id]||{};
   data[id]={sessions:(previous.sessions||0)+1,correct:session.firstPassCorrect,
     total:session.originalTotal,last:new Date().toISOString()};
   try{localStorage.setItem(storageKey(),JSON.stringify(data));}catch(e){console.warn('Voortgang van leermethode niet opgeslagen',e);}
   session.recorded=true;
 }
 function recallPrompt(q){
 return typeof q?.recallQuestion==='string'&&q.recallQuestion.trim()?q.recallQuestion.trim():String(q?.question||'');
}
 function isRecallEligible(q){
 if(!q||!String(q.question||'').trim())return false;
 const answer=q.type==='open'?q.answer:q?.options?.[q.correct];
 if(!String(q.recallAnswer||answer||'').trim())return false;
 if(typeof q.recallQuestion==='string'&&q.recallQuestion.trim())return true;
 if(q.type==='open')return true;
 if(q.type!=='mc'||q.audioText||q.passage)return false;
 const t=q.question.trim();
 if(!/^(wat|hoe|waarom|waar|wanneer|hoeveel|noem|geef|leg uit|beschrijf|bereken|schrijf|vertaal|in welk jaar|rond welk jaar)\b/i.test(t))return false;
 if(/\b(luister|fragment|hieronder|hierboven|onderstaande|volgende|afbeelding|plaatje|foto|antwoordopties|meerkeuze|juiste zin|juiste antwoord|het beste|de tekst|deze tekst|kolom|schema)\b/i.test(t))return false;
 return true;
}
 function learningEligible(kind,q){
 if(kind==='recall')return isRecallEligible(q);
 return !!q&&['mc','open'].includes(q.type)&&!!String(q.question||'').trim();
}
 function fullPack(summary){
 return typeof sfLocal==='function'?sfLocal().sets.find(x=>Number(x.id)===Number(summary.id)&&Number(x.profile_id)===Number(state.profile)):null;
}
 function catalog(kind){
 const k=kinds[kind];if(!k)return '';
 const packs=collections().filter(c=>c.type==='quiz');
 return `<div class="page-enter sf-method-page">
   <button class="back-link" data-action="nav" data-route="dashboard">← Terug naar start</button>
   <header class="sf-page-intro"><span class="sf-eyebrow">${k.label} · ${htmlEscape(profileName())}</span>
     <h1>${k.title}</h1><p>${k.desc}</p></header>
   <div class="sf-mini-guide"><span class="sf-mini-mark">${ic(k.icon,23)}</span>
     <div><b>${kind==='guided'?'Eerst begrijpen en dan proberen':'Zelf uitleggen zonder antwoordopties'}</b>
       <p>${kind==='guided'?'We gebruiken alleen aanwijzingen en uitleg uit het lespakket. Als een uitgebreide uitleg ontbreekt, geven we dat aan.':'Alleen vragen die zonder meerkeuzeopties zelfstandig te beantwoorden zijn. Beoordeel jezelf eerlijk.'}</p></div></div>
   <h2 class="sf-section-label">Kies een onderwerp</h2>
   ${packs.length?`<div class="sf-subject-grid">${packs.map(p=>{
     const st=stats(kind,p),pack=fullPack(p);
     const available=(pack?.content?.questions||[]).filter(q=>learningEligible(kind,q)).length;
     return `<button class="sf-subject-card" ${available?`data-action="learn-start" data-kind="${kind}" data-id="${Number(p.id)}"`:'disabled aria-disabled="true"'}>
       <span class="sf-subject-top"><span class="sf-subject-icon">${ic(k.icon,24)}</span><span class="sf-subject-tag">${htmlEscape(p.subject)}</span></span>
       <strong>${htmlEscape(p.title)}</strong>
       <span class="sf-subject-description">${htmlEscape(p.description||'Oefen dit onderwerp op jouw tempo.')}</span>
       <span class="sf-subject-meta">${available?available+' geschikte vragen':'Geen zelfstandige vragen beschikbaar'}${st?' · Laatste keer '+st.correct+'/'+st.total+' goed':''}
         <b>${available?'Start →':'Niet beschikbaar'}</b></span>
     </button>`;}).join('')}</div>`:
       '<div class="sf-empty"><b>Nog geen leerstof</b><p>Nieuwe oefenpakketten verschijnen hier zodra ze zijn toegevoegd.</p></div>'}
 </div>`;
}
 function originalQuestion(){return session?.pack?.content?.questions?.[session.queue[session.index]];}
 function model(q){
 if(!q)return 'Geen modelantwoord beschikbaar.';
 if(typeof q.recallAnswer==='string'&&q.recallAnswer.trim())return q.recallAnswer.trim();
 if(q.type==='mc')return String(q.options?.[q.correct]||'Geen antwoord');
 return String(q.answer||'Geen modelantwoord');
}
 function explanation(q){return q?.explanation||q?.hint||'Bekijk wat het juiste antwoord betekent en probeer het straks opnieuw.';}
 function title(){
   const s=session,k=kinds[s.kind];
   return `<div class="sf-learning-top"><button class="back-link" data-action="learn-exit">← Onderwerpen</button>
       <span class="sf-eyebrow">${k.label.toUpperCase()}</span></div>
       <header class="sf-learning-heading"><div><span class="sf-subject-tag">${htmlEscape(s.pack.subject)}</span>
         <h1>${htmlEscape(s.pack.title)}</h1></div>
         <span class="sf-step-count">${Math.min(s.index+1,s.queue.length)} / ${s.queue.length}</span></header>
       <div class="sf-progress-track"><span style="width:${Math.round(100*s.index/Math.max(1,s.queue.length))}%"></span></div>`;
 }
 function completed(){
   save();
   const s=session;
   return `<div class="sf-learning-complete"><span class="sf-complete-icon">✦</span>
     <span class="sf-eyebrow">${kinds[s.kind].label.toUpperCase()} · AFGEROND</span>
     <h1>Goed bezig, ${htmlEscape(profileName())}!</h1><p>Je hebt actief gewerkt aan ${htmlEscape(s.pack.title)}. Herhaling maakt het verschil.</p>
     <div class="sf-complete-score"><strong>${s.firstPassCorrect} / ${s.originalTotal}</strong>
       <span>direct goed of zelf gekend</span></div>
     <div class="sf-complete-actions"><button class="btn btn-primary" data-action="learn-restart">Nog een ronde ↗</button>
       <button class="btn btn-outline" data-action="learn-exit">Ander onderwerp</button>
       <button class="btn btn-outline" data-action="nav" data-route="dashboard">Naar start</button></div></div>`;
 }
 function ratingButtons(){
 return `<p class="sf-learning-note">Beoordeel jezelf eerlijk. Lastige vragen komen straks nog eens terug.</p>
  <div class="sf-rate-row">
   <button class="btn btn-outline" data-action="learn-rate" data-quality="0">Nog oefenen</button>
   <button class="btn btn-outline" data-action="learn-rate" data-quality="1">Bijna goed</button>
   <button class="btn btn-primary" data-action="learn-rate" data-quality="2">Goed</button>
  </div>`;
}
 function passageFromSource(q){
 if(!q?.passage)return '';
 return `<div class="sf-source-text"><b>Tekst bij de opgave</b><p>${htmlEscape(String(q.passage))}</p></div>`;
}
 function learningTeaching(q){
 const full=typeof q.learn==='string'&&q.learn.trim()?q.learn.trim():'';
 const hint=typeof q.hint==='string'&&q.hint.trim()?q.hint.trim():'';
 const label=full?'UITLEG UIT HET LESMATERIAAL':hint?'AANWIJZING UIT HET OEFENMATERIAAL':'GEEN UITLEG VOORAF';
 const info=full||hint||'Voor deze vraag is nog geen uitleg vooraf aangeleverd. Na het oefenen zie je de toelichting uit het lespakket.';
 return `<div class="sf-step-kicker"><span>01</span> EERST BEGRIJPEN</div>
   <h2>${htmlEscape(q.lessonTitle||'Lees de aanwijzing')}</h2>
   <div class="sf-teach-panel"><span class="sf-teach-label">${label}</span><p>${htmlEscape(info)}</p>
   ${q.example?`<div class="sf-teach-example"><b>Voorbeeld uit het lesmateriaal</b><p>${htmlEscape(q.example)}</p></div>`:''}</div>
   <button class="btn btn-primary sf-wide-btn" data-action="learn-practice">Zelf proberen →</button>`;
}
 function learningPractice(q,s){
 return `<div class="sf-step-kicker"><span>02</span> NU ZELF PROBEREN</div>
  ${passageFromSource(q)}<h2>${htmlEscape(q.question)}</h2>
  ${q.type==='mc'?`<div class="sf-choice-list">${q.options.map((o,i)=>`<button class="sf-choice" data-action="learn-answer" data-value="${i}"><span>${String.fromCharCode(65+i)}</span>${htmlEscape(o)}</button>`).join('')}</div>`:
    `<label class="sf-answer-label" for="sf-learning-text">Jouw antwoord (schrijf of zeg het hardop)</label>
     <textarea id="sf-learning-text" class="sf-answer-field" maxlength="2500" rows="4" placeholder="Wat denk je?">${htmlEscape(s.typed||'')}</textarea>
     <button class="btn btn-primary sf-wide-btn" data-action="learn-reveal">Bekijk het modelantwoord →</button>`}`;
}
 function learningFeedback(q,s){
 const open=q.type==='open',correct=s.result===true,answer=model(q),exp=explanation(q),same=exp.trim().toLowerCase()===answer.trim().toLowerCase();
 return `<div class="sf-step-kicker"><span>03</span> WAT HEB JE GELEERD?</div>
   <h2>${open?'Vergelijk je antwoord':correct?'Goed gedaan!':'Zo zit het'}</h2>
   ${open&&s.typed.trim()?`<div class="sf-your-answer"><b>Jouw antwoord</b><p>${htmlEscape(s.typed)}</p></div>`:''}
   <div class="sf-feedback ${correct||open?'good':'retry'}"><b>Modelantwoord uit je oefenmateriaal</b><p>${htmlEscape(answer)}</p>
    ${exp&&!same?`<b>Waarom?</b><p>${htmlEscape(exp)}</p>`:''}</div>
   ${open&&s.result===null?ratingButtons():
     `<p class="sf-learning-note">${correct?'Op naar de volgende vraag.':'Deze vraag komt één keer terug aan het einde van de ronde.'}</p>
      <button class="btn btn-primary sf-wide-btn" data-action="learn-next">Volgende stap →</button>`}`;
}
 function learningRecall(q,s){
 if(s.phase==='answer')return `<div class="sf-step-kicker"><span>✦</span> HAAL HET UIT JE GEHEUGEN</div>
  ${passageFromSource(q)}<h2>${htmlEscape(recallPrompt(q))}</h2>
  <p class="sf-learning-note">Zonder antwoordopties. Probeer eerst zelf te antwoorden.</p>
  <label class="sf-answer-label" for="sf-learning-text">Jouw uitleg (schrijf of zeg het hardop)</label>
  <textarea id="sf-learning-text" class="sf-answer-field" rows="5" maxlength="2500" placeholder="Wat weet je nog?">${htmlEscape(s.typed||'')}</textarea>
  <button class="btn btn-primary sf-wide-btn" data-action="learn-reveal">Vergelijk met het antwoord →</button>`;
 const ans=model(q),why=explanation(q),same=why.trim().toLowerCase()===ans.trim().toLowerCase();
 return `<div class="sf-step-kicker"><span>✓</span> VERGELIJK EN BEOORDEEL</div>
   <h2>Hoe goed had je het?</h2>
   ${s.typed.trim()?`<div class="sf-your-answer"><b>Jouw antwoord</b><p>${htmlEscape(s.typed)}</p></div>`:''}
   <div class="sf-feedback good"><b>Modelantwoord</b><p>${htmlEscape(ans)}</p>
    ${why&&!same?`<b>Toelichting uit het oefenmateriaal</b><p>${htmlEscape(why)}</p>`:''}</div>
   ${ratingButtons()}`;
}
 function renderMethod(){
 if(!session)return '<div class="sf-empty">Kies eerst een onderwerp.</div>';
 if(session.stage==='complete')return completed();
 const q=originalQuestion(),s=session;
 if(!q)return '<div class="sf-empty">Deze oefening is niet beschikbaar.</div>';
 const body=s.kind==='guided'?(s.phase==='explain'?learningTeaching(q):s.phase==='practice'?learningPractice(q,s):learningFeedback(q,s)):learningRecall(q,s);
 return `<div class="sf-learning-screen">${title()}<section class="sf-learning-card">${body}</section>
   <p class="sf-learning-foot">Regelmatig oefenen en jezelf terugvragen helpen de stof te onthouden.</p></div>`;
}
 // Eigen vragenrotatie per leerling en leermethode: oefentoetsrotatie blijft intact.
 function nextRound(kind,pack,total){
   const count=Math.min(12,total),key='studyforge-learning-round-v1:'+state.profile+':'+kind+':'+String(pack.source_key||pack.id);
   let old=null;try{old=JSON.parse(localStorage.getItem(key)||'null');}catch{}
   const valid=old?.count===total&&Array.isArray(old.remaining)&&old.remaining.every(i=>Number.isInteger(i)&&i>=0&&i<total)&&new Set(old.remaining).size===old.remaining.length;
   let remaining=valid?old.remaining.slice():[];
   if(remaining.length<count){
     const exclude=new Set(valid&&Array.isArray(old.last)?old.last:[]);
     const candidates=[...Array(total).keys()].filter(i=>!remaining.includes(i));
     for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
     candidates.sort((a,b)=>Number(exclude.has(a))-Number(exclude.has(b)));
     remaining.push(...candidates);
   }
   const selected=remaining.slice(0,count);
   try{localStorage.setItem(key,JSON.stringify({count:total,remaining:remaining.slice(count),last:selected}));}catch{}
   return selected;
 }
 async function start(kind,id){
   if(!kinds[kind])return;
   const summary=collections().find(p=>p.type==='quiz'&&Number(p.id)===Number(id));
   if(!summary){toast('Dit onderwerp is niet gevonden.',true);return;}
   const result=await api('collection',null,{profile:state.profile,id:summary.id});
   const pack=result?.collection,questions=pack?.content?.questions;
   if(!Array.isArray(questions)||!questions.length){toast('Dit onderwerp bevat nog geen vragen.',true);return;}
   // Beperk de leerroute tot 12 stappen per sessie; alle originele vragen blijven beschikbaar.
   const selected=nextRound(kind,pack,questions.length);
   session={kind,pack,queue:selected,index:0,originalTotal:selected.length,
     firstPassCorrect:0,seen:new Set(),retried:new Set(),phase:kind==='guided'?'explain':'answer',
     stage:'run',result:null,typed:'',recorded:false};
   state.route='learning-run';render();window.scrollTo({top:0,behavior:'instant'});
 }
 function setResult(known){
   const s=session;if(!s||s.stage!=='run')return;
   const number=s.queue[s.index];
   if(!s.seen.has(number)){
     s.seen.add(number);if(known)s.firstPassCorrect++;
     window.sfReview?.record({pack:s.pack,index:number,item:originalQuestion(),quality:known?2:0,mode:s.kind==='guided'?'leer-in-stappen':'leg-het-uit'});
   }
   if(s.kind==='recall'&&!known&&!s.retried.has(number)){
     s.retried.add(number);s.queue.push(number);
   }
 }
 function next(){
   const s=session;if(!s)return;
   s.index++;s.typed='';s.result=null;
   if(s.index>=s.queue.length){s.stage='complete';save();}
   else s.phase=s.kind==='guided'?'explain':'answer';
   render();window.scrollTo({top:0,behavior:'instant'});
 }
 async function handle(action,btn){
   if(action==='learn-start')return start(btn.dataset.kind,btn.dataset.id);
   if(action==='learn-exit'){
     const kind=session?.kind||'guided';session=null;return navigate(kind==='guided'?'learning-guided':'learning-recall');
   }
   if(action==='learn-restart')return start(session.kind,session.pack.id);
   if(!session)return;
   if(action==='learn-practice'&&session.kind==='guided'&&session.phase==='explain'){session.phase='practice';return render();}
   if(action==='learn-answer'&&session.kind==='guided'&&session.phase==='practice'){
     const q=originalQuestion(),n=Number(btn.dataset.value);
     if(q.type!=='mc'||!Number.isInteger(n)||n<0||n>=q.options.length)return;
     session.result=n===q.correct;session.phase='feedback';setResult(session.result);return render();
   }
   if(action==='learn-reveal'&&['answer','practice'].includes(session.phase)){
     session.typed=document.getElementById('sf-learning-text')?.value||'';
     if(session.kind==='guided'){session.phase='feedback';session.result=null;}
     else session.phase='review';
     return render();
   }
   if(action==='learn-rate'&&((session.kind==='guided'&&session.phase==='feedback')||(session.kind==='recall'&&session.phase==='review'))){
     setResult(btn.dataset.known==='1');return next();
   }
   if(action==='learn-next'&&session.kind==='guided'&&session.phase==='feedback')return next();
 }
 document.addEventListener('input',e=>{if(e.target?.id==='sf-learning-text'&&session)session.typed=e.target.value;});
 window.sfLearning={catalog,render:renderMethod,start,handle,stats,progress:store,reset:()=>{session=null;}};
})();
