/* StudyForge 2.0 — veilige lokale back-up en cloudmigratie (R0).
   Bestaande cloudgegevens blijven onaangeroerd. */
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
 function captureCloud(p){
   const cloud=window.sfCloud;
   if(!cloud?.online||Number(cloud.profile)!==Number(p))return null;
   const data=cloud.cache?.get(Number(p));
   if(!data||!Array.isArray(data.attempts)||!Array.isArray(data.reviews))return null;
   const d=sfLocal(),before=JSON.stringify(d),localDevice=device();
   try{
     ensureId(d);
     const seen=new Set(d.attempts.filter(x=>Number(x.profile_id)===Number(p)).map(x=>x.cloud_client_id||localDevice+':'+x.id));
     const result=applyCloud(d,Number(p),data,seen);
     if(result.attempts||result.reviews)sfPersist();
     const old=parse(read(UNMAPPED+p),{attempts:[],reviews:[]});
     const unknown={attempts:[...new Map([...(old.attempts||[]),...result.unknown.attempts].map(x=>[String(x.client_id),x])).values()],
       reviews:[...new Map([...(old.reviews||[]),...result.unknown.reviews].map(x=>[String(x.source_key)+':'+x.card_index,x])).values()]};
     save(UNMAPPED+p,unknown);
     if(data.plan&&Array.isArray(data.plan.exams)&&typeof spWriteLocal==='function')spWriteLocal(p,data.plan);
     const marker={date:new Date().toISOString(),attempts:data.attempts.length,reviews:data.reviews.length,
       missing:unknown.attempts.length+unknown.reviews.length};
     save(KEY+p,marker);return marker;
   }catch(e){
     SF_LOCAL_DATA=JSON.parse(before);
     console.warn('Studiegegevens lokaal overnemen mislukt',e);return null;
   }
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
   const cache=window.sfCloud?.cache?.get(p);
   return {schema:'studyforge-backup/v1',profile_id:p,profile_name:p===1?'Nikki':'Dean',
     created_at:new Date().toISOString(),device_id:device(),
     data:{sets,attempts:d.attempts.filter(x=>Number(x.profile_id)===p&&ids.has(Number(x.collection_id))),
       reviews:d.reviews.filter(x=>Number(x.profile_id)===p&&ids.has(Number(x.collection_id)))},
     planning:typeof spReadLocal==='function'?spReadLocal(p):null,extras:extra(p),
     migration:parse(read(KEY+p),null),
     cloud:cache&&Number(window.sfCloud?.profile)===p?cache:null,
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
     if(backup.planning&&Array.isArray(backup.planning.exams)&&typeof spWriteLocal==='function')spWriteLocal(p,backup.planning);
     for(const [k,v]of Object.entries(backup.extras||{}))mergeExtra(p,k,v);
     const unknown=backup.unmapped;
     if(unknown&&Array.isArray(unknown.attempts)&&Array.isArray(unknown.reviews))save(UNMAPPED+p,unknown);
     // R0-back-ups bevatten de cloudgegevens, maar soms nog geen apart migratiemerk.
     if(backup.migration&&typeof backup.migration==='object')save(KEY+p,backup.migration);
     else if(Array.isArray(backup.cloud?.attempts)&&Array.isArray(backup.cloud?.reviews))
       save(KEY+p,{date:new Date().toISOString(),attempts:backup.cloud.attempts.length,
         reviews:backup.cloud.reviews.length,missing:(unknown?.attempts||[]).length+(unknown?.reviews||[]).length});
     if(typeof refreshDashboard==='function')await refreshDashboard();
     if(typeof window.studyBeforeRoute==='function')await window.studyBeforeRoute('dashboard');
     if(typeof render==='function')render();
     toast('Back-up hersteld: '+attempts+' cijfers, '+reviews+' flashcards.');
     return {attempts,reviews};
   }catch(e){SF_LOCAL_DATA=JSON.parse(before);try{sfPersist();}catch{}throw e;}
 }
 function recoveryUrl(legacy){
   const u=new URL(window.location.href);
   if(legacy)u.searchParams.set('legacy-cloud','1');
   else u.searchParams.delete('legacy-cloud');
   return u.pathname+u.search+u.hash;
 }
 function marker(p){return parse(read(KEY+p),null);}
 function notice(){
   const p=pid();
   if(![1,2].includes(p))return '';
   if(window.sfCloudEnabled)
     return '<div class="study-warning">Je gebruikt de tijdelijke herstelmodus voor oude resultaten. '+
       '<button class="text-link" data-action="nav" data-route="backup">Back-up en terug naar lokaal</button></div>';
   if(marker(p))return '';
   return '<div class="study-warning" role="status">Oude cloudresultaten zijn op dit apparaat nog niet gecontroleerd. '+
     'Dit heeft geen invloed op nieuwe oefeningen. '+
     '<button class="text-link" data-action="nav" data-route="backup">Oude cijfers ophalen / back-up maken</button></div>';
 }
 function page(){
   const p=pid(),d=sfLocal(),stamp=marker(p),cloud=!!window.sfCloudEnabled;
   const attempts=d.attempts.filter(x=>Number(x.profile_id)===p).length;
   const reviews=d.reviews.filter(x=>Number(x.profile_id)===p).length;
   const status=cloud?(stamp?
     'Cloudresultaten opgehaald op '+new Date(stamp.date).toLocaleDateString('nl-NL')+
     '. Nog niet gekoppeld: '+Number(stamp.missing||0)+'.':
     'Cloudgegevens zijn nog niet bevestigd als lokaal overgenomen.'):
     stamp?'Deze browser heeft eerder cloudgegevens overgenomen of een back-up met cloudhistorie hersteld.':
     'Op dit apparaat is nog niet vastgesteld dat alle oude cloudresultaten zijn overgenomen.';
   const action=cloud?
      '<button class="btn btn-secondary" data-action="backup-exit-legacy">Terug naar lokale versie</button>':
      '<button class="btn btn-secondary" data-action="backup-open-legacy">Haal oude cloudresultaten op</button>';
   const help=cloud?'Je bent in de eenmalige cloudherstelmodus. Download een back-up vóór je teruggaat naar de lokale versie.':
     'StudyForge werkt zonder database. Met de herstelknop open je tijdelijk de oude cloud om eerdere resultaten op te halen. Daarna ga je weer terug naar de lokale versie.';
   return '<div class="page-enter">'+sectionHeading('STUDYFORGE 2.0','Back-up en herstel',
     'Bewaar jouw cijfers, flashcards, leerresultaten en planning als een privé JSON-bestand.')+
     '<section class="panel" style="padding:24px"><div class="eyebrow">LEERLING '+htmlEscape(profileName())+'</div>'+
     '<h3>Jouw leerresultaten</h3>'+
     '<p>'+attempts+' toetsresultaten · '+reviews+' flashcardbeoordelingen (lokaal)</p>'+
     '<p>'+htmlEscape(status)+'</p><p>'+htmlEscape(help)+'</p>'+
     '<p>Maak twee aparte back-ups, één voor Nikki en één voor Dean. Bij een ander apparaat ontbreken lokale resultaten totdat je hun back-up importeert.</p>'+
     '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px">'+
     '<button class="btn btn-primary" data-action="backup-export">Download back-up</button>'+
     '<button class="btn btn-secondary" data-action="backup-import">Herstel back-up</button>'+
     action+'</div><input id="sf-backup-file" type="file" accept=".json,application/json" hidden></section>'+
     '<p class="sub" style="margin-top:16px">Back-upbestanden kunnen persoonlijke leerresultaten bevatten: bewaar ze privé. De oude cloudgegevens worden niet gewist.</p></div>';
 }

 document.addEventListener('change',async e=>{
   if(e.target?.id!=='sf-backup-file')return;
   const file=e.target.files?.[0];e.target.value='';
   if(!file)return;
   try{await restoreFile(file);}catch(err){console.error(err);toast(err.message||'Herstellen mislukt.',true);}
 });
 window.sfBackup={captureCloud,build,page,restoreFile,
   handle(action){if(action==='backup-export')download();
     else if(action==='backup-import')document.getElementById('sf-backup-file')?.click();
     else if(action==='backup-open-legacy')window.location.assign(recoveryUrl(true));
     else if(action==='backup-exit-legacy')window.location.assign(recoveryUrl(false));},notice};
})();