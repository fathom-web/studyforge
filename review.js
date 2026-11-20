'use strict';
// Slim herhalen per leerling. Laat bestaande toetsresultaten en cloudtabellen ongemoeid.
(function(){
 const KEY_BASE='studyforge-reviews-v1:',DAY=86400000;
 const storageKey=()=>KEY_BASE+String(state.profile||0);
 let session=null;
 const safe=x=>htmlEscape(String(x??''));
 function read(){try{const x=JSON.parse(localStorage.getItem(storageKey())||'null');
   if(x?.version===1&&x.records&&Array.isArray(x.events))return x;}catch{}
   return {version:1,migrated:false,records:{},events:[]};}
 function write(x){try{localStorage.setItem(storageKey(),JSON.stringify(x));return true;}catch(e){console.warn('Opslaan mislukt',e);return false;}}
 function hash(str){let h=2166136261;for(const c of String(str)){h=Math.imul(h^c.charCodeAt(0),16777619);}return (h>>>0).toString(36);}
 function key(pack,index,item){const src=String(pack.source_key||pack.id),type=pack.type==='flashcards'?'flashcards':'quiz';
   const name=String(type==='flashcards'?item?.front:item?.question||'');
   return type+'|'+src+'|'+(item?.id!==undefined?String(item.id):hash(name));}
 function apply(x,pack,index,item,quality,mode,when,track){
   if(!pack||!item||!Number.isInteger(Number(index))||![0,1,2].includes(Number(quality)))return false;
   const prompt=pack.type==='flashcards'?item.front:item.question;
   if(typeof prompt!=='string'||!prompt.trim())return false;
   const dt=new Date(when||Date.now());if(!Number.isFinite(dt.getTime()))return false;
   const k=key(pack,index,item),previous=x.records[k],q=Number(quality);
   const streak=q===2?Math.min(5,(previous?.streak||0)+1):0;
   const wait=q===0?20*60000:q===1?DAY:[3,7,14,30,60][streak-1]*DAY;
   x.records[k]={key:k,type:pack.type,source:String(pack.source_key||pack.id),collectionId:Number(pack.id),
     index:Number(index),subject:String(pack.subject||''),title:String(pack.title||''),
     streak,quality:q,attempts:(previous?.attempts||0)+1,lastAt:dt.toISOString(),
     dueAt:new Date(dt.getTime()+wait).toISOString()};
   if(track){x.events.push({at:dt.toISOString(),quality:q,mode:String(mode||'oefenen').slice(0,30)});
     x.events=x.events.slice(-1000);}
   return true;
 }
 function record({pack,index,item,quality,mode='oefenen'}={}){
   const x=read();if(!apply(x,pack,index,item,quality,mode,null,true))return false;
   const entries=Object.entries(x.records);if(entries.length>1000){
     entries.sort((a,b)=>Date.parse(a[1].lastAt)-Date.parse(b[1].lastAt));
     for(const [k] of entries.slice(0,entries.length-1000))delete x.records[k];
   }
   return write(x);
 }
 function importLegacy(){
   const profile=Number(state.profile),x=read();if(!profile||x.migrated)return;
   try{
     const local=typeof sfLocal==='function'?sfLocal():null;
     const visible=collections().filter(p=>p.profile_id===profile);
     const byId=new Map((local?.sets||[]).filter(p=>Number(p.profile_id)===profile).map(p=>[Number(p.id),p]));
     const bySource=new Map(visible.map(p=>[String(p.source_key||p.id),byId.get(Number(p.id))]).filter(([,p])=>!!p));
     let imported=0;
     // Zowel offline-resultaten als de reeds opgehaalde (gedeelde) cloudresultaten gebruiken.
     const cloud=window.sfCloud?.cache?.get(profile);
     const rows=[...(local?.attempts||[]).filter(a=>Number(a.profile_id)===profile).map(a=>({attempt:a,pack:byId.get(Number(a.collection_id))})),
       ...(cloud?.attempts||[]).map(a=>({attempt:a,pack:bySource.get(String(a.source_key))}))];
     rows.sort((a,b)=>Date.parse(b.attempt.created_at||0)-Date.parse(a.attempt.created_at||0));
     for(const {attempt:a,pack} of rows){
       if(pack?.type!=='quiz')continue;
       for(const d of a.details||[]){
         const item=pack.content?.questions?.[d.index];
         if(!item||typeof d.correct!=='boolean'||x.records[key(pack,d.index,item)])continue;
         if(apply(x,pack,d.index,item,d.correct?2:0,'eerdere toets',a.created_at,false))imported++;
         if(imported>=600)break;
       }
       if(imported>=600)break;
     }
     const oldReviews=[...(local?.reviews||[]).filter(r=>Number(r.profile_id)===profile).map(r=>({review:r,pack:byId.get(Number(r.collection_id))})),
       ...(cloud?.reviews||[]).map(r=>({review:r,pack:bySource.get(String(r.source_key))}))];
     oldReviews.sort((a,b)=>Date.parse(b.review.updated_at||b.review.created_at||0)-Date.parse(a.review.updated_at||a.review.created_at||0));
     for(const {review:r,pack} of oldReviews){
       if(imported>=700)break;
       const index=Number(r.card_index),item=pack?.content?.cards?.[index];
       if(pack?.type!=='flashcards'||!item||x.records[key(pack,index,item)])continue;
       if(apply(x,pack,index,item,r.known?2:0,'eerdere flashcard',r.updated_at||r.created_at||new Date().toISOString(),false))imported++;
     }
     // Ook foutenvragen die via de gedeelde dashboardadapter binnenkomen.
     for(const m of state.dashboard?.missed||[]){
       if(imported>=700)break;
       const pack=byId.get(Number(m.collection_id)),index=Number(m.index),item=pack?.content?.questions?.[index];
       if(pack?.type!=='quiz'||!item||x.records[key(pack,index,item)])continue;
       if(apply(x,pack,index,item,0,'eerdere fout',new Date(Date.now()-21*60000).toISOString(),false))imported++;
     }
   }catch(e){console.warn('Eerdere oefenresultaten niet ingelezen',e);}
   x.migrated=true;write(x);
 }
 function dueData(at=new Date()){
   const time=new Date(at).getTime();
   const map=new Map((typeof collections==='function'?collections():[])
     .map(p=>[p.type+'|'+String(p.source_key||p.id),p]));
   const items=Object.values(read().records).filter(r=>map.has(r.type+'|'+r.source))
     .map(r=>({...r,pack:map.get(r.type+'|'+r.source)}));
   const dueItems=items.filter(r=>Date.parse(r.dueAt)<=time).sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
   const future=items.filter(r=>Date.parse(r.dueAt)>time).sort((a,b)=>Date.parse(a.dueAt)-Date.parse(b.dueAt));
   const today=new Date(time).toDateString();
   const done=read().events.filter(e=>new Date(e.at).toDateString()===today);
   return {due:dueItems.length,dueItems,upcoming:future.length,nextAt:future[0]?.dueAt||null,
     practicedToday:done.length,tracked:items.length};
 }
 function when(iso){if(!iso)return 'nog niet gepland';const d=new Date(iso);
   const now=new Date();if(d.toDateString()===now.toDateString())return 'vandaag';
   const tomorrow=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
   if(d.toDateString()===tomorrow.toDateString())return 'morgen';
   return d.toLocaleDateString('nl-NL',{day:'numeric',month:'long'});
 }
 function dashboard(){
   const s=dueData(),available=collections().some(c=>c.type==='quiz');
   return `<section class="sf-coach">
     <div><span class="sf-eyebrow">JOUW PERSOONLIJKE LEERCOACH</span>
       <h2>${s.due?`${s.due} ${s.due===1?'vraag is':'vragen zijn'} klaar voor herhaling`:
         s.tracked?'Je herhalingen staan gepland!':'Begin met een onderwerp'}</h2>
       <p>${s.due?'Oefen nu wat je nog niet helemaal onthoudt.':
         s.tracked?`Je volgende herhaling is ${when(s.nextAt)}.`:
         'Begin met leren of een toets. Daarna plant StudyForge automatisch herhalingen.'}</p>
       <button class="btn btn-primary" data-action="${s.due?'review-start':'nav'}"
         ${s.due?'':`data-route="${available?'learning-guided':'library'}"`}>${s.due?'Start mijn herhaling':'Begin met leren'} →</button>
     </div><div class="sf-coach-metrics"><div><b>${s.due}</b><span>Herhalen</span></div>
       <div><b>${s.practicedToday}</b><span>Vandaag geoefend</span></div></div>
   </section>`;
 }
 function catalog(){
   const s=dueData(),subjects=new Map();
   for(const item of s.dueItems)subjects.set(item.subject,(subjects.get(item.subject)||0)+1);
   return `<div class="page-enter sf-review-page"><button class="back-link" data-action="nav" data-route="dashboard">← Start</button>
     <span class="sf-eyebrow">HERHAAL SLIM</span><h1>Herhalen op het juiste moment</h1>
     <p>Je hoeft niet alles opnieuw te doen. StudyForge laat vragen terugkomen die aandacht verdienen.</p>
     <div class="sf-review-stats"><div><b>${s.due}</b><span>Nu aan de beurt</span></div>
       <div><b>${s.upcoming}</b><span>Later gepland</span></div><div><b>${s.practicedToday}</b><span>Vandaag geoefend</span></div></div>
     <section class="sf-review-panel"><h2>${s.due?'Jouw herhaling':'Je bent bijgewerkt!'}</h2>
       ${s.due?`${[...subjects].map(([name,n])=>`<p><b>${safe(name)}</b> · ${n} ${n===1?'vraag':'vragen'}</p>`).join('')}
         <button class="btn btn-primary" data-action="review-start">Start 12 vragen of minder →</button>`:
         `<p>${s.upcoming?`Je volgende herhaling is ${when(s.nextAt)}.`:'Begin eerst met een oefentoets, flashcards of leerstappen.'}</p>
         <button class="btn btn-secondary" data-action="nav" data-route="learning-guided">Nieuw onderwerp leren →</button>`}</section>
     <p class="sf-review-help">Fout: na 20 minuten · Bijna: morgen · Goed: na 3, 7, 14, 30 of 60 dagen.
       De herhaalplanning wordt voorlopig op dit apparaat bewaard en synchroniseert nog niet via Supabase.</p>
   </div>`;
 }
 async function start(){
   const list=dueData().dueItems.slice(0,12);
   if(!list.length){toast('Geen herhalingen open.');return navigate('review');}
   const queue=[],cache=new Map();
   for(const task of list){
     try{
       let p=cache.get(task.pack.id);
       if(!p){p=(await api('collection',null,{id:task.pack.id,profile:state.profile}))?.collection;
         cache.set(task.pack.id,p);}
       const item=p?.type==='flashcards'?p.content?.cards?.[task.index]:p?.content?.questions?.[task.index];
       if(item&&key(p,task.index,item)===task.key)queue.push({pack:p,index:task.index,item});
     }catch(e){console.warn('Herhaalvraag niet beschikbaar',e);}
   }
   if(!queue.length){toast('De oude stof is veranderd. Oefen het onderwerp opnieuw.',true);return navigate('review');}
   session={queue,index:0,phase:'answer',done:0,typed:''};
   state.route='review-run';render();window.scrollTo({top:0,behavior:'instant'});
 }
 function runner(){
   if(!session)return catalog();
   const s=session;
   if(s.index>=s.queue.length)return `<div class="sf-review-complete"><span class="sf-eyebrow">KLAAR!</span>
     <h1>Goed gewerkt, ${safe(profileName())}!</h1><p>Je hebt ${s.done} vragen herhaald. De volgende momenten zijn gepland.</p>
     <button class="btn btn-primary" data-action="review-exit">Terug naar overzicht →</button></div>`;
   const x=s.queue[s.index],q=x.item,front=x.pack.type==='flashcards'?q.front:q.question;
   const answer=x.pack.type==='flashcards'?q.back:q.type==='mc'?q.options?.[q.correct]:q.answer;
   return `<div class="page-enter sf-learning-screen">
     <button class="back-link" data-action="review-exit">← Herhalingen</button>
     <div class="sf-learning-heading"><h1>${safe(x.pack.title)}</h1><span class="sf-step-count">${s.index+1}/${s.queue.length}</span></div>
     <div class="sf-progress-track"><span style="width:${Math.round(100*s.index/s.queue.length)}%"></span></div>
     <section class="sf-learning-card"><div class="sf-step-kicker"><span>✳</span> UIT JE HOOFD</div>
       <h2>${safe(front)}</h2>
       ${s.phase==='answer'?`<p class="sf-learning-note">Denk zelf na, zonder antwoordopties.</p>
         <label class="sf-answer-label" for="sf-review-text">Jouw antwoord</label>
         <textarea id="sf-review-text" class="sf-answer-field" rows="4">${safe(s.typed)}</textarea>
         <button class="btn btn-primary" data-action="review-reveal">Toon modelantwoord →</button>`:
         `<div class="sf-feedback good"><b>Modelantwoord</b><p>${safe(answer)}</p>
           ${q.explanation?`<b>Waarom?</b><p>${safe(q.explanation)}</p>`:''}</div>
         <p class="sf-learning-note">Hoe goed wist jij dit?</p><div class="sf-rate-row">
           <button class="btn btn-red" data-action="review-rate" data-quality="0">Nog niet</button>
           <button class="btn btn-outline" data-action="review-rate" data-quality="1">Bijna</button>
           <button class="btn btn-primary" data-action="review-rate" data-quality="2">Goed!</button></div>`}
     </section></div>`;
 }
 async function handle(action,btn){
   if(action==='review-start')return start();
   if(action==='review-exit'){session=null;return navigate('review');}
   if(!session)return;
   if(action==='review-reveal'&&session.phase==='answer'){
     session.typed=String(document.getElementById('sf-review-text')?.value||'').slice(0,2500);
     session.phase='reveal';return render();
   }
   if(action==='review-rate'&&session.phase==='reveal'){
     const quality=Number(btn.dataset.quality);if(![0,1,2].includes(quality))return;
     const x=session.queue[session.index];
     if(!record({...x,quality,mode:'herhaling'}))toast('Herhaalresultaat kon niet worden opgeslagen.',true);
     session.index++;session.done++;session.phase='answer';session.typed='';return render();
   }
 }
 document.addEventListener('input',ev=>{if(ev.target?.id==='sf-review-text'&&session)session.typed=ev.target.value;});
 window.sfReview={record,importLegacy,summary:dueData,dashboard,catalog,start,runner,handle,key,reset:()=>{session=null;}};
})();
