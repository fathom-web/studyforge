/* StudyForge R1 — lokale back-up en herstel, ook van oude R0-cloudexporten.
   Geen databaseverbinding; de oorspronkelijke Supabase-database blijft onaangeroerd. */
'use strict';
(function(){
 const KEY='studyforge-cloud-migration-v1:',UNMAPPED='studyforge-cloud-unmapped-v1:';
 const parse=(v,f)=>{if(v===null||v===undefined||v==='')return f;try{const x=JSON.parse(v);return x===null?f:x;}catch{return f;}};
 const read=k=>{try{return localStorage.getItem(k);}catch{return null;}};
 const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
 const pid=()=>Number(state.profile);
 function device(){let s=read('studyforge-device-id');if(!s){s='device-'+Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem('studyforge-device-id',s);}return s;}
 function ensureId(d){d.nextId=Math.max(1,Number(d.nextId)||1,...d.sets.map(x=>(Number(x.id)||0)+1),...d.attempts.map(x=>(Number(x.id)||0)+1));}
 function mapping(d,p){return new Map(d.sets.filter(x=>Number(x.profile_id)===p&&x.source_key).map(x=>[x.source_key,x]));}
 function insertAttempt(d,p,pack,a,origin,seen){
   if(!pack||!a||!origin||seen.has(origin)||!Number.isFinite(Date.parse(a.created_at))||!Number.isFinite(Number(a.grade)))return false;
   d.attempts.push({id:d.nextId++,profile_id:p,collection_id:Number(pack.id),title:String(a.title||pack.title),
     subject:String(a.subject||pack.subject),correct_count:Number(a.correct_count)||0,total_count:Number(a.total_count)||0,
     grade:Number(a.grade),details:Array.isArray(a.details)?a.details:[],created_at:a.created_at,cloud_client_id:origin});
   seen.add(origin);return true;
 }
 function insertReview(d,p,pack,r){
   if(!pack||pack.type!=='flashcards'||!r||!Number.isInteger(Number(r.card_index))||Number(r.card_index)<0||Number(r.card_index)>=pack.count)return false;
   const index=Number(r.card_index),time=r.updated_at||r.created_at||'';
   let old=d.reviews.find(x=>Number(x.profile_id)===p&&Number(x.collection_id)===pack.id&&Number(x.card_index)===index);
   if(old&&(!Number.isFinite(Date.parse(time))||(Number.isFinite(Date.parse(old.updated_at))&&Date.parse(old.updated_at)>Date.parse(time))))return false;
   if(!old){old={profile_id:p,collection_id:pack.id,card_index:index};d.reviews.push(old);}
   old.known=Number(r.known)===1?1:0;old.reviews=Math.max(Number(old.reviews)||0,Number(r.reviews)||0);
   old.updated_at=Number.isFinite(Date.parse(time))?time:new Date().toISOString();return true;
 }
 function applyCloud(d,p,cloud,seen){
   const packs=mapping(d,p),unknown={attempts:[],reviews:[]};let attempts=0,reviews=0;
   for(const a of Array.isArray(cloud?.attempts)?cloud.attempts:[]){
     const pack=packs.get(a.source_key);
     if(!pack){unknown.attempts.push(a);continue;}
     if(insertAttempt(d,p,pack,a,String(a.client_id||''),seen))attempts++;
   }
   for(const r of Array.isArray(cloud?.reviews)?cloud.reviews:[]){
     const pack=packs.get(r.source_key);
     if(!pack){unknown.reviews.push(r);continue;}
     if(insertReview(d,p,pack,r))reviews++;
   }
   return {attempts,reviews,unknown};
 }
 function extra(p){
   const data={},prefix='studyforge-quiz-rotation-v1:'+p+':';
   for(let i=0;i<localStorage.length;i++){
     const k=localStorage.key(i);
     if(k==='studyforge-reviews-v1:'+p||k==='studyforge-learning-v1:'+p||k?.startsWith(prefix))
       data[k]=parse(read(k),null);
   }
   return data;
 }
 function build(){
   const p=pid();if(![1,2].includes(p))throw Error('Selecteer eerst een profiel.');
   const d=sfLocal(),sets=d.sets.filter(x=>Number(x.profile_id)===p),ids=new Set(sets.map(x=>Number(x.id)));
   return {schema:'studyforge-backup/v1',profile_id:p,profile_name:p===1?'Nikki':'Dean',
     created_at:new Date().toISOString(),device_id:device(),
     data:{sets,attempts:d.attempts.filter(x=>Number(x.profile_id)===p&&ids.has(Number(x.collection_id))),
       reviews:d.reviews.filter(x=>Number(x.profile_id)===p&&ids.has(Number(x.collection_id)))},
     planning:typeof spReadLocal==='function'?spReadLocal(p):null,extras:extra(p),
     cloud:null,
     unmapped:parse(read(UNMAPPED+p),{attempts:[],reviews:[]})};
 }
 function download(){
   const text=JSON.stringify(build(),null,2),url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='StudyForge-'+(pid()===1?'Nikki':'Dean')+'-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
   toast('Back-up gemaakt. Bewaar het bestand op een veilige plek.');
 }
 function mergeExtra(p,k,v){
   if(!v||typeof v!=='object'||Array.isArray(v))return;
   if(k==='studyforge-learning-v1:'+p){
     const old=parse(read(k),{});
     for(const [id,row]of Object.entries(v))if(row&&(!old[id]||Date.parse(row.last||0)>Date.parse(old[id].last||0)))old[id]=row;
     save(k,old);
   }else if(k==='studyforge-reviews-v1:'+p&&v.version===1&&v.records&&Array.isArray(v.events)){
     const old=parse(read(k),{version:1,records:{},events:[],migrated:false});
     for(const [id,row]of Object.entries(v.records))if(row&&(!old.records[id]||Date.parse(row.lastAt||0)>Date.parse(old.records[id].lastAt||0)))old.records[id]=row;
     old.events=[...new Map([...old.events,...v.events].map(e=>[JSON.stringify(e),e])).values()].slice(-1000);
     old.migrated=!!(old.migrated||v.migrated);save(k,old);
   }else if(k.startsWith('studyforge-quiz-rotation-v1:'+p+':')&&!read(k))save(k,v);
 }
 async function restoreFile(file){
   if(!file||file.size>12*1024*1024)throw Error('Ongeldig bestand (maximaal 12 MB).');
   const backup=parse(await file.text(),null),p=pid();
   if(backup?.schema!=='studyforge-backup/v1'||Number(backup.profile_id)!==p||
     !Array.isArray(backup.data?.sets)||!Array.isArray(backup.data?.attempts)||!Array.isArray(backup.data?.reviews))
       throw Error('Deze back-up is niet geldig of hoort bij het andere profiel.');
   if(!window.confirm('De back-up van '+backup.profile_name+' herstellen? Bestaande resultaten blijven staan.'))return;
   const d=sfLocal(),before=JSON.stringify(d);let attempts=0,reviews=0;
   try{
     ensureId(d);const sets=mapping(d,p),ids=new Map();
     for(const x of backup.data.sets.slice(0,1500)){
       if(Number(x.profile_id)!==p)continue;
       let current=x.source_key?sets.get(x.source_key):null;
       if(!current){
         try{
           const col={type:x.type,title:x.title,subject:x.subject,description:x.description,
             ...(x.type==='quiz'?{questions:x.content?.questions,questionsPerAttempt:x.content?.questionsPerAttempt}:{cards:x.content?.cards})};
           const valid=sfValidateImport(JSON.stringify({schema:'studyforge/v1',profile:p===1?'Nikki':'Dean',collections:[col]}));
           current={...valid.cols[0],id:d.nextId++,source_key:x.source_key||undefined,created_at:x.created_at||new Date().toISOString()};
           d.sets.push(current);if(current.source_key)sets.set(current.source_key,current);
         }catch{continue;}
       }
       ids.set(Number(x.id),current);
     }
     const dev=device(),originDevice=String(backup.device_id||'backup');
     const seen=new Set(d.attempts.filter(x=>Number(x.profile_id)===p).map(x=>x.cloud_client_id||dev+':'+x.id));
     for(const x of backup.data.attempts.slice(0,15000))
       if(insertAttempt(d,p,ids.get(Number(x.collection_id)),x,String(x.cloud_client_id||originDevice+':'+x.id),seen))attempts++;
     for(const x of backup.data.reviews.slice(0,12000))
       if(insertReview(d,p,ids.get(Number(x.collection_id)),x))reviews++;
     const from=applyCloud(d,p,backup.cloud,seen);
     attempts+=from.attempts;reviews+=from.reviews;
     sfPersist();
     // Combineer de planning zonder nieuwere, lokaal ingestelde doelen of afvinkingen te wissen.
     const incomingPlan=backup.planning?.exams?.length?backup.planning:
       (backup.cloud?.plan&&Array.isArray(backup.cloud.plan.exams)?backup.cloud.plan:backup.planning);
     if(incomingPlan&&Array.isArray(incomingPlan.exams)&&typeof spWriteLocal==='function'){
       const current=typeof spReadLocal==='function'?spReadLocal(p):{exams:[],goals:{},completed:{}};
       const hasLocal=!!parse(read('studyforge-planning-v1'),{})[p];
       const exams=[...new Map([...(incomingPlan.exams||[]),...(hasLocal?current.exams:[])]
         .filter(e=>e&&typeof e.id==='string').map(e=>[e.id,e])).values()];
       const defaultGoals=Number(current.goals?.targetGrade||7)===7&&Number(current.goals?.sessionsPerWeek||3)===3;
       spWriteLocal(p,{
         ...incomingPlan,...(hasLocal?current:{}),exams,
         goals:hasLocal&&!defaultGoals?current.goals:(incomingPlan.goals||current.goals),
         completed:{...(incomingPlan.completed||{}),...(hasLocal?current.completed||{}:{})}
       });
     }
     for(const [k,v]of Object.entries(backup.extras||{}))mergeExtra(p,k,v);
     // Bewaar ook oude cloudrecords die niet bij de huidige lespakketten passen.
     const oldUnknown=parse(read(UNMAPPED+p),{attempts:[],reviews:[]});
     const unknown=backup.unmapped||{};
     save(UNMAPPED+p,{
       attempts:[...new Map([...(oldUnknown.attempts||[]),...(unknown.attempts||[]),...from.unknown.attempts]
         .map(x=>[String(x.client_id||JSON.stringify(x)),x])).values()],
       reviews:[...new Map([...(oldUnknown.reviews||[]),...(unknown.reviews||[]),...from.unknown.reviews]
         .map(x=>[String(x.source_key)+':'+x.card_index,x])).values()]
     });
     // Alleen een geldige herstelde back-up kan de R1-migratiewaarschuwing opheffen.
     if(backup.data.attempts.length||backup.data.reviews.length||
       (backup.cloud?.attempts?.length||0)||(backup.cloud?.reviews?.length||0))
       save('studyforge-r1-restored-v1:'+p,{date:new Date().toISOString(),source:backup.created_at||null});
     if(typeof refreshDashboard==='function')await refreshDashboard();
     window.sfReview?.reimportLegacy?.();
     if(typeof state!=='undefined')state.cloudWarning=migrationWarning(p);
     if(typeof window.studyBeforeRoute==='function')await window.studyBeforeRoute('dashboard');
     if(typeof render==='function')render();
     toast('Back-up hersteld: '+attempts+' cijfers, '+reviews+' flashcards.');
     return {attempts,reviews};
   }catch(e){SF_LOCAL_DATA=JSON.parse(before);try{sfPersist();}catch{}throw e;}
 }
 function migrationWarning(p){
   p=Number(p);
   if(read(KEY+p)||read('studyforge-r1-restored-v1:'+p))return '';
   return 'Let op: eerdere cloudresultaten zijn op dit apparaat niet als overgenomen bevestigd. Importeer je R0-back-up via Meer → Back-up en herstel. Je oude databasegegevens zijn niet verwijderd.';
 }
 function page(){
   const p=pid(),d=sfLocal(),marker=parse(read(KEY+p),null);
   const restored=parse(read('studyforge-r1-restored-v1:'+p),null);
   const attempts=d.attempts.filter(x=>Number(x.profile_id)===p).length;
   const reviews=d.reviews.filter(x=>Number(x.profile_id)===p).length;
   const status=marker?'Eerdere cloudcontrole voltooid op '+new Date(marker.date).toLocaleDateString('nl-NL')+'.':
     restored?'Back-up hersteld op '+new Date(restored.date).toLocaleDateString('nl-NL')+'.':
     'Er is geen bevestigde overname van de oude cloudresultaten op dit apparaat.';
   return '<div class="page-enter">'+sectionHeading('STUDYFORGE 2.0 · R1','Back-up en herstel',
     'Deze versie gebruikt geen database. Je resultaten staan op dit apparaat.')+
     '<section class="panel" style="padding:24px"><h3>'+htmlEscape(profileName())+' — leerresultaten</h3>'+
     '<p>'+attempts+' toetsresultaten · '+reviews+' flashcardbeoordelingen</p><p>'+htmlEscape(status)+'</p>'+
     (migrationWarning(p)?'<p class="study-warning">'+htmlEscape(migrationWarning(p))+'</p>':'')+
     '<p>Maak voor Nikki en Dean afzonderlijk een back-up. Bewaar deze bestanden privé en importeer ze op een ander apparaat als je daar verder wilt oefenen.</p>'+
     '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">'+
     '<button class="btn btn-primary" data-action="backup-export">Download back-up</button>'+
     '<button class="btn btn-secondary" data-action="backup-import">Herstel back-up</button></div>'+
     '<input id="sf-backup-file" type="file" accept=".json,application/json" hidden></section>'+
     '<p class="sub" style="margin-top:16px">De oorspronkelijke database is niet gewist, maar StudyForge R1 maakt er geen verbinding meer mee. Wis geen browsergegevens zonder actuele back-up.</p></div>';
 }
 document.addEventListener('change',async e=>{
   if(e.target?.id!=='sf-backup-file')return;
   const file=e.target.files?.[0];e.target.value='';
   if(!file)return;
   try{await restoreFile(file);}catch(err){console.error(err);toast(err.message||'Herstellen mislukt.',true);}
 });
 window.sfBackup={build,page,restoreFile,migrationWarning,
   handle(action){if(action==='backup-export')download();else if(action==='backup-import')document.getElementById('sf-backup-file')?.click();}};
})();