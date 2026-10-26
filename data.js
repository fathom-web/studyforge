/* StudyForge data layer: local browser storage by default, optional Supabase Auth + RLS. */
'use strict';
const SF_PROFILES = [{id:1,name:'Nikki'},{id:2,name:'Dean'}];
const SF_CONFIG = window.STUDYFORGE_SUPABASE || {};
const SF_REMOTE = !!(SF_CONFIG.url && (SF_CONFIG.publishableKey || SF_CONFIG.anonKey));
const SF_STORE_KEY = 'studyforge-local-v1';
let SF_CLIENT = null;
let SF_ADMIN = false;
let SF_LOCAL_DATA = null;

async function sfClient(){
  if(!SF_REMOTE) return null;
  if(!SF_CLIENT){
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.95.2');
    SF_CLIENT = createClient(SF_CONFIG.url, SF_CONFIG.publishableKey || SF_CONFIG.anonKey, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });
  }
  return SF_CLIENT;
}
function sfError(res){if(res?.error)throw new Error(res.error.message||String(res.error));return res?.data;}
function sfMode(){return SF_REMOTE?'supabase':'local';}
function sfFresh(){
  return {sets:[],attempts:[],reviews:[],hiddenPublished:[],nextId:1};
}
const SF_ORIGINAL_DEMOS = new Set([
  '1|quiz|Demo · De cel',
  '1|flashcards|Demo · Celonderdelen',
  '2|quiz|Demo · Media en informatie',
  '2|flashcards|Demo · Begrippen media'
]);
function sfCleanFormerDemos(data){
  const removed=new Set(data.sets.filter(s=>SF_ORIGINAL_DEMOS.has(s.profile_id+'|'+s.type+'|'+s.title)).map(s=>s.id));
  if(removed.size){
    data.sets=data.sets.filter(s=>!removed.has(s.id));
    data.attempts=data.attempts.filter(a=>!removed.has(a.collection_id));
    data.reviews=data.reviews.filter(r=>!removed.has(r.collection_id));
  }
  if(!Array.isArray(data.hiddenPublished))data.hiddenPublished=[];
  return removed.size>0;
}
function sfLocal(){
  if(SF_LOCAL_DATA)return SF_LOCAL_DATA;
  try {
    const saved=localStorage.getItem(SF_STORE_KEY);
    if(saved){
      const parsed=JSON.parse(saved);
      if(Array.isArray(parsed.sets)&&Array.isArray(parsed.attempts)&&Array.isArray(parsed.reviews)){
        SF_LOCAL_DATA=parsed;if(sfCleanFormerDemos(SF_LOCAL_DATA))sfPersist();return SF_LOCAL_DATA;
      }
    }
  }catch(e){console.warn('StudyForge: lokale opslag niet beschikbaar',e);}
  SF_LOCAL_DATA=sfFresh();sfPersist();return SF_LOCAL_DATA;
}
function sfPersist(){try{localStorage.setItem(SF_STORE_KEY,JSON.stringify(SF_LOCAL_DATA));}catch(e){throw Error('Opslagruimte in de browser is vol. Verwijder oude oefensets.');}}

/* Lees de door ChatGPT in GitHub gepubliceerde originele oefensets in.
   De browser bewaart zijn eigen scores; bestanden worden niet door leerlingen geüpload. */
async function sfSyncPublished(){
  const d=SF_REMOTE?null:sfLocal();
  try{
    const response=await fetch('./content/library.json',{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const content=await response.text();
    if(content.length>1800000)throw Error('De gepubliceerde bibliotheek is te groot.');
    const library=JSON.parse(content);
    if(library?.schema!=='studyforge-library/v1'||!Array.isArray(library.packs))throw Error('Ongeldig bibliotheekformaat.');
    if(library.packs.length>200)throw Error('Te veel lespakketten.');
    if(SF_REMOTE){
      const user=await sfRemoteUser();
      if(!user)return {added:0,mode:'supabase',error:'Log in om de lessen te synchroniseren'};
      const client=await sfClient();
      const [rowsRes,hidesRes]=await Promise.all([
        client.from('sf_collections').select('id,source_key,count,content').not('source_key','is',null),
        client.from('sf_hidden_publications').select('source_key')
      ]);
      if(rowsRes.error)throw rowsRes.error;
      if(hidesRes.error)throw hidesRes.error;
      const existing=new Set((rowsRes.data||[]).map(r=>r.source_key));
      const hidden=new Set((hidesRes.data||[]).map(r=>r.source_key));
      const inserts=[],updates=[],seen=new Set();
      for(const pack of library.packs){
        if(!pack||typeof pack.id!=='string'||!pack.id.trim()||seen.has(pack.id))continue;
        seen.add(pack.id);
        try{
          const {cols}=sfValidateImport(JSON.stringify({schema:'studyforge/v1',profile:pack.profile,collections:pack.collections}));
          for(const [i,col] of cols.entries()){
            const source_key=pack.id+'::'+i;
            if(hidden.has(source_key))continue;
            if(existing.has(source_key)){
              if(source_key==='dean-biologie-unit1-organen-cellen-2026-10-28-v1::0'){
                const previous=(rowsRes.data||[]).find(r=>r.source_key===source_key);
                if(previous && (previous.count!==col.count||previous.content?.questionsPerAttempt!==col.content.questionsPerAttempt))
                  updates.push({id:previous.id,col});
              }
              continue;
            }
            inserts.push({...col,source_key,owner_id:user.id});
            existing.add(source_key);
          }
        }catch(error){console.warn('Lespakket overgeslagen',pack.id,error);}
      }
      if(inserts.length){
        const res=await client.from('sf_collections').insert(inserts);
        if(res.error)throw res.error;
      }
      for(const u of updates){
        const res=await client.from('sf_collections').update({content:u.col.content,count:u.col.count,description:u.col.description}).eq('id',u.id);
        if(res.error)throw res.error;
      }
      return {added:inserts.length,updated:updates.length,mode:'supabase'};
    }
    let added=0,updated=0;
    const seen=new Set(),hidden=new Set(d.hiddenPublished||[]);
    for(const pack of library.packs){
      if(!pack||typeof pack.id!=='string'||!pack.id.trim()||pack.id.length>120||seen.has(pack.id))continue;
      seen.add(pack.id);
      try{
        const {cols}=sfValidateImport(JSON.stringify({schema:'studyforge/v1',profile:pack.profile,collections:pack.collections}));
        for(const [i,col] of cols.entries()){
          const source_key=pack.id+'::'+i;
          if(hidden.has(source_key))continue;
          const current=d.sets.find(s=>s.source_key===source_key);
          if(current){
            // Werk alleen de gepubliceerde Biologie-vragen bij. Bewaar dezelfde
            // collectie-ID, eerdere cijfers, fouten en beoordelingen.
            if(source_key==='dean-biologie-unit1-organen-cellen-2026-10-28-v1::0' &&
              (current.count!==col.count||current.content?.questionsPerAttempt!==col.content.questionsPerAttempt)){
              Object.assign(current,{subject:col.subject,title:col.title,description:col.description,count:col.count,content:col.content});
              updated++;
            }
            continue;
          }
          d.sets.push({id:d.nextId++,...col,source_key,created_at:new Date().toISOString()});
          added++;
        }
      }catch(err){console.warn('StudyForge: lespakket overgeslagen',pack.id,err);}
    }
    if(added||updated)sfPersist();
    return {added,updated};
  }catch(err){console.warn('StudyForge: gepubliceerde lessen niet bereikbaar',err);return {added:0,error:err.message};}
}
function sfGoodProfile(id){id=Number(id);if(id!==1&&id!==2)throw Error('Onbekend profiel.');return id;}
function sfLatestMissed(attempts){
  const seen=new Set(),out=[];
  for(const a of attempts){
    for(const d of a.details||[]){
      const key=`${a.collection_id}:${d.index}`;
      if(seen.has(key))continue;
      seen.add(key);
      if(d.correct===false)out.push({collection_id:a.collection_id,index:d.index});
    }
  }
  return out;
}
function sfCalcQuiz(col,b){
  if(!col||col.type!=='quiz')throw Error('De oefentoets is niet gevonden.');
  const questions=col.content?.questions;
  const indices=Array.isArray(b.indices)?b.indices:questions.map((_,i)=>i);
  if(b.mode!=='mistakes' && Number.isInteger(col.content?.questionsPerAttempt) && indices.length!==Math.min(col.content.questionsPerAttempt,questions.length))
    throw Error('Deze oefentoets moet het ingestelde aantal vragen bevatten.');
  if(!Array.isArray(indices)||!indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=questions.length)||new Set(indices).size!==indices.length)throw Error('Ongeldige selectie vragen.');
  if(!Array.isArray(b.answers)||b.answers.length!==indices.length)throw Error('Niet alle antwoorden zijn ontvangen.');
  let correct=0;
  const details=indices.map((idx,i)=>{
    const q=questions[idx],a=b.answers[i]||{};
    const ok=q.type==='mc'?(a.selected===q.correct):(a.self_grade===true);
    if(ok)correct++;
    return {index:idx,correct:ok};
  });
  const total=indices.length;
  return {grade:Math.round((1+9*correct/total)*10)/10,correct,total,details};
}
function sfValidateImport(text){
  if(text.length>1800000)throw Error('Importbestand te groot (maximaal 1,8 MB).');
  let parsed;try{parsed=JSON.parse(text);}catch{throw Error('Dit is geen geldige JSON.');}
  if(!['learning-hub/v1','studyforge/v1'].includes(parsed?.schema))throw Error('Onbekend importformaat. Gebruik studyforge/v1.');
  const profile=SF_PROFILES.find(p=>p.name===parsed.profile);
  if(!profile)throw Error('Kies profiel Nikki of Dean in het importbestand.');
  if(!Array.isArray(parsed.collections)||!parsed.collections.length||parsed.collections.length>50)throw Error('Geef 1 tot 50 sets op.');
  const cols=parsed.collections.map((c)=>{
    if(!['quiz','flashcards'].includes(c.type))throw Error('Onbekend type: gebruik quiz of flashcards.');
    const fields=['subject','title'];for(const k of fields)if(typeof c[k]!=='string'||!c[k].trim()||c[k].length>150)throw Error(`Ongeldige ${k}.`);
    const isQuiz=c.type==='quiz';const rows=isQuiz?c.questions:c.cards;
    if(!Array.isArray(rows)||rows.length<1||rows.length>250)throw Error('Elke set moet 1 tot 250 vragen of kaarten hebben.');
    if(isQuiz&&c.questionsPerAttempt!==undefined&&(!Number.isInteger(c.questionsPerAttempt)||c.questionsPerAttempt<1||c.questionsPerAttempt>rows.length))throw Error('Ongeldig aantal vragen per oefenronde.');
    for(const q of rows){
      if(!q||typeof q!=='object')throw Error('Een vraag of kaart is ongeldig.');
      if(isQuiz){
        if(!['mc','open'].includes(q.type)||typeof q.question!=='string'||!q.question.trim())throw Error('Ongeldige toetsvraag.');
        if(q.type==='mc' && (!Array.isArray(q.options)||q.options.length<2||q.options.length>6||q.options.some(t=>typeof t!=='string'||!t.trim())||!Number.isInteger(q.correct)||q.correct<0||q.correct>=q.options.length))throw Error('Ongeldige multiplechoicevraag.');
        if(q.type==='open' && (typeof q.answer!=='string'||!q.answer.trim()))throw Error('Open vragen hebben een modelantwoord nodig.');
      } else if(typeof q.front!=='string'||!q.front.trim()||typeof q.back!=='string'||!q.back.trim())throw Error('Een flashcard mist een vraag of antwoord.');
    }
    return {profile_id:profile.id,type:c.type,subject:c.subject.trim(),title:c.title.trim(),description:String(c.description||'').slice(0,500),count:rows.length,content:isQuiz?{questions:rows,...(c.questionsPerAttempt?{questionsPerAttempt:c.questionsPerAttempt}:{})}:{cards:rows}};
  });
  return {profile,cols};
}
async function sfRemoteUser(){const c=await sfClient();const {data,error}=await c.auth.getUser();if(error&&!['Auth session missing!','Auth session missing'].includes(error.message))throw Error(error.message);return data?.user||null;}
async function sfRemoteRows(table,profile){
  const c=await sfClient();
  return sfError(await c.from(table).select('*').eq('profile_id',profile).order('created_at',{ascending:false}));
}
async function sfAdapter(action,b=null,params={}){
  const d=SF_REMOTE?null:sfLocal();
  if(action==='status'){
    if(!SF_REMOTE)return {csrf:'local',locked:false,admin:true,mode:'local'};
    return {csrf:'supabase',locked:!(await sfRemoteUser()),admin:SF_ADMIN,mode:'supabase'};
  }
  if(action==='unlock'){
    if(!SF_REMOTE)return {ok:true,csrf:'local'};
    const c=await sfClient();sfError(await c.auth.signInWithPassword({email:String(b.email||'').trim(),password:String(b.password||'')}));
    SF_ADMIN=false;return {ok:true,csrf:'supabase'};
  }
  if(action==='bootstrap'){
    if(SF_REMOTE&&!(await sfRemoteUser()))throw Error('Log eerst in bij Supabase.');
    return {profiles:SF_PROFILES,csrf:SF_REMOTE?'supabase':'local',admin:SF_REMOTE?SF_ADMIN:true,mode:sfMode()};
  }
  if(action==='logout'){
    if(SF_REMOTE){const c=await sfClient();sfError(await c.auth.signOut());}
    SF_ADMIN=false;return {ok:true};
  }
  if(SF_REMOTE&&!(await sfRemoteUser()))throw Error('Je bent uitgelogd. Log opnieuw in.');
  if(action==='dashboard'){
    const pid=sfGoodProfile(params.profile);
    let sets,attempts,reviews;
    if(SF_REMOTE){
      [sets,attempts,reviews]=await Promise.all([sfRemoteRows('sf_collections',pid),sfRemoteRows('sf_attempts',pid),sfRemoteRows('sf_reviews',pid)]);
    }else{
      sets=d.sets.filter(s=>s.profile_id===pid);
      attempts=d.attempts.filter(s=>s.profile_id===pid).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      reviews=d.reviews.filter(s=>s.profile_id===pid);
    }
    const exists=new Set(sets.map(s=>s.id));
    return {collections:sets.map(({content,...rest})=>({...rest,questions_per_attempt:content?.questionsPerAttempt||null})),attempts:attempts.map(({details,...rest})=>rest),
      flash_progress:reviews,missed:sfLatestMissed(attempts).filter(m=>exists.has(m.collection_id))};
  }
  if(action==='collection'){
    const pid=sfGoodProfile(params.profile);const id=Number(params.id);
    let set;
    if(SF_REMOTE){const c=await sfClient();set=sfError(await c.from('sf_collections').select('*').eq('id',id).eq('profile_id',pid).maybeSingle());}
    else set=d.sets.find(s=>s.id===id&&s.profile_id===pid);
    if(!set)throw Error('Oefenset niet gevonden.');return {collection:set};
  }
  if(action==='save_quiz'){
    const pid=sfGoodProfile(b.profile);const id=Number(b.collection_id);
    let col;
    if(SF_REMOTE){const c=await sfClient();col=sfError(await c.from('sf_collections').select('*').eq('id',id).eq('profile_id',pid).maybeSingle());}
    else col=d.sets.find(s=>s.id===id&&s.profile_id===pid);
    const result=sfCalcQuiz(col,b);
    const item={profile_id:pid,collection_id:id,title:col.title,subject:col.subject,correct_count:result.correct,
      total_count:result.total,grade:result.grade,details:result.details,created_at:new Date().toISOString()};
    if(SF_REMOTE){const c=await sfClient();const u=await sfRemoteUser();sfError(await c.from('sf_attempts').insert({...item,owner_id:u.id}));}
    else{d.attempts.push({id:d.nextId++,...item});sfPersist();}
    return result;
  }
  if(action==='flash_review'){
    const pid=sfGoodProfile(b.profile);const id=Number(b.collection_id);const index=Number(b.index);
    if(!Number.isInteger(index)||index<0)throw Error('Ongeldige kaart.');
    if(SF_REMOTE){
      const c=await sfClient(),u=await sfRemoteUser();
      const col=sfError(await c.from('sf_collections').select('id,content,type').eq('id',id).eq('profile_id',pid).maybeSingle());
      if(!col||col.type!=='flashcards'||index>=col.content.cards.length)throw Error('Flashcard niet gevonden.');
      const old=sfError(await c.from('sf_reviews').select('reviews').eq('collection_id',id).eq('profile_id',pid).eq('card_index',index).maybeSingle());
      sfError(await c.from('sf_reviews').upsert({owner_id:u.id,profile_id:pid,collection_id:id,card_index:index,known:b.known?1:0,reviews:(old?.reviews||0)+1,created_at:new Date().toISOString()}, {onConflict:'owner_id,collection_id,card_index'}));
    }else{
      const col=d.sets.find(s=>s.id===id&&s.profile_id===pid);
      if(!col||col.type!=='flashcards'||index>=col.content.cards.length)throw Error('Flashcard niet gevonden.');
      let r=d.reviews.find(r=>r.profile_id===pid&&r.collection_id===id&&r.card_index===index);
      if(!r){r={profile_id:pid,collection_id:id,card_index:index,reviews:0};d.reviews.push(r);}
      r.known=b.known?1:0;r.reviews++;sfPersist();
    }
    return {ok:true};
  }
  throw Error(`Onbekende handeling: ${action}`);
}
window.sfSyncPublished=sfSyncPublished;
window.sfAdapter=sfAdapter;
window.sfMode=sfMode;
