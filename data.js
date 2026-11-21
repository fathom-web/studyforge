/* StudyForge R1 — volledig lokale voortgang; lesmateriaal via GitHub Pages. */
'use strict';
const SF_PROFILES = [{id:1,name:'Nikki'},{id:2,name:'Dean'}];
const SF_STORE_KEY = 'studyforge-local-v1';
let SF_LOCAL_DATA = null;
/* Afgeronde Engelse My Future-pakketten (27 oktober 2026).
   Alleen verbergen in het oefenaanbod, NIET verwijderen uit de opslag:
   historische cijfers en flashcardbeoordelingen blijven intact. */
const SF_ARCHIVED_PACK_IDS = new Set([
  'dean-engels-my-future-2026-10-27-v1',
  'dean-engels-my-future-2026-10-27-mc-extra-1-v1',
  'dean-engels-my-future-2026-10-27-mc-extra-2-v1',
  'nikki-geschiedenis-h1-jagers-boeren-egypte-2026-10-27-v1',
  'nikki-engels-unit1-unit2-2026-11-08-v1'
]);
function sfIsArchivedCollection(col){
  if(!col || typeof col.source_key!=='string')return false;
  return SF_ARCHIVED_PACK_IDS.has(col.source_key.split('::')[0]);
}

function sfMode(){return 'local';}
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
  const d=sfLocal();
  try{
    const response=await fetch('./content/library.json',{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const content=await response.text();
    if(content.length>1800000)throw Error('De gepubliceerde bibliotheek is te groot.');
    const library=JSON.parse(content);
    // StudyForge extra lespakketten: kleine afzonderlijke bestanden voorkomen
    // dat de volledige centrale bibliotheek steeds opnieuw moet worden geschreven.
    for(const extraPath of ['./content/nikki-wiskunde-deel1.json','./content/nikki-wiskunde-deel2.json','./content/nikki-frans-2026-10-29.json','./content/nikki-engels-unit1-2-2026-11-08.json']){
      try{
        const extraRes=await fetch(extraPath,{cache:'no-store'});
        if(!extraRes.ok)throw Error('HTTP '+extraRes.status);
        const extra=await extraRes.json();
        if(extra.schema==='studyforge-library/v1'&&Array.isArray(extra.packs)){
          library.packs.push(...extra.packs);
        }
      }catch(err){console.warn('Extra lespakket niet beschikbaar:',extraPath,err);}
    }
    if(library?.schema!=='studyforge-library/v1'||!Array.isArray(library.packs))throw Error('Ongeldig bibliotheekformaat.');
    if(library.packs.length>200)throw Error('Te veel lespakketten.');
    // Alleen deze gepubliceerde toetsdata mag de planning vullen;
    // leerlingen kunnen geen eigen toetsdata naar de bibliotheek schrijven.
    window.STUDYFORGE_PUBLISHED_EXAMS=Array.isArray(library.exams)?library.exams.filter(e=>
      e && (e.profile==='Nikki'||e.profile==='Dean') &&
      typeof e.id==='string' && e.id.length>0 && e.id.length<=120 &&
      typeof e.title==='string' && e.title.length>0 && e.title.length<=120 &&
      typeof e.subject==='string' && e.subject.length>0 && e.subject.length<=80 &&
      typeof e.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date)
    ).slice(0,200):[];

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
            // Pas zichtbare omschrijvingen aan zonder eerdere resultaten te wissen.
            const meta=current.title!==col.title||current.subject!==col.subject||current.description!==col.description;
            const biologyChange=source_key==='dean-biologie-unit1-organen-cellen-2026-10-28-v1::0' &&
              (current.count!==col.count||current.content?.questionsPerAttempt!==col.content.questionsPerAttempt);
            if(biologyChange){Object.assign(current,{subject:col.subject,title:col.title,description:col.description,count:col.count,content:col.content});updated++;}
            else if(meta){Object.assign(current,{subject:col.subject,title:col.title,description:col.description});updated++;}
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
/* R1: geen netwerkcalls, geen accounts en geen cloudmutaties. */
async function sfAdapter(action,b=null,params={}){
  const d=sfLocal();
  if(action==='status')return {csrf:'local',locked:false,admin:true,mode:'local'};
  if(action==='unlock')return {ok:true,csrf:'local'};
  if(action==='bootstrap')return {profiles:SF_PROFILES,csrf:'local',admin:true,mode:'local'};
  if(action==='logout')return {ok:true};
  if(action==='dashboard'){
    const pid=sfGoodProfile(params.profile);
    const sets=d.sets.filter(x=>Number(x.profile_id)===pid&&!sfIsArchivedCollection(x));
    const attempts=d.attempts.filter(x=>Number(x.profile_id)===pid)
      .slice().sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
    const allowed=new Set(sets.map(x=>Number(x.id)));
    const reviews=d.reviews.filter(x=>Number(x.profile_id)===pid&&allowed.has(Number(x.collection_id)));
    return {
      collections:sets.map(({content,...rest})=>({...rest,questions_per_attempt:content?.questionsPerAttempt||null})),
      attempts:attempts.map(({details,...rest})=>rest),
      flash_progress:reviews,
      missed:sfLatestMissed(attempts).filter(x=>allowed.has(Number(x.collection_id)))
    };
  }
  if(action==='collection'){
    const pid=sfGoodProfile(params.profile),id=Number(params.id);
    const set=d.sets.find(x=>Number(x.id)===id&&Number(x.profile_id)===pid);
    if(!set||sfIsArchivedCollection(set))throw Error('Deze oefenset is afgerond en gearchiveerd.');
    return {collection:set};
  }
  if(action==='save_quiz'){
    const pid=sfGoodProfile(b.profile),id=Number(b.collection_id);
    const col=d.sets.find(x=>Number(x.id)===id&&Number(x.profile_id)===pid&&!sfIsArchivedCollection(x));
    const result=sfCalcQuiz(col,b);
    const item={id:d.nextId++,profile_id:pid,collection_id:id,title:col.title,subject:col.subject,
      correct_count:result.correct,total_count:result.total,grade:result.grade,
      details:result.details,created_at:new Date().toISOString()};
    d.attempts.push(item);sfPersist();return result;
  }
  if(action==='flash_review'){
    const pid=sfGoodProfile(b.profile),id=Number(b.collection_id),index=Number(b.index);
    if(!Number.isInteger(index)||index<0)throw Error('Ongeldige kaart.');
    const col=d.sets.find(x=>Number(x.id)===id&&Number(x.profile_id)===pid&&!sfIsArchivedCollection(x));
    if(!col||col.type!=='flashcards'||index>=col.content.cards.length)throw Error('Flashcard niet gevonden.');
    let r=d.reviews.find(x=>Number(x.profile_id)===pid&&Number(x.collection_id)===id&&Number(x.card_index)===index);
    if(!r){r={profile_id:pid,collection_id:id,card_index:index,reviews:0};d.reviews.push(r);}
    r.known=b.known?1:0;r.reviews++;r.updated_at=new Date().toISOString();
    sfPersist();return {ok:true};
  }
  throw Error('Onbekende handeling: '+action);
}
window.sfSyncPublished=sfSyncPublished;
window.sfAdapter=sfAdapter;
window.sfMode=sfMode;
