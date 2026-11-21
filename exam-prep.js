/* StudyForge R4: local exam planning and parent insight calculations.
 No network or database calls; data is always scoped to the requested learner. */
'use strict';
(function(){
function sfExamDate(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||'')))return null;
  const d=new Date(date+'T12:00:00');
  if(Number.isNaN(d.getTime())||`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`!==date)return null;
  return d;
}

function sfExamLocalToday(now=new Date()){
  const d=new Date(now);
  return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}

function sfExamSubject(s){
  return String(s||'').trim().toLocaleLowerCase('nl-NL');
}

function sfExamFindPacks(subject,dashboard){
  return (dashboard?.collections||[]).filter(c=>c&&
    ['quiz','flashcards'].includes(c.type)&&sfExamSubject(c.subject)===sfExamSubject(subject));
}

function sfExamPlans(exam,profile,dashboard,plan,now=new Date(),limit=10){
  const day=sfExamDate(exam?.date),today=sfExamLocalToday(now),start=sfExamDate(today);
  const saved=sfExamDate(plan?.scheduleStarts?.[exam.id]);
  // Eenmaal gestart blijft de planning op dezelfde kalenderdagen staan.
  const anchor=saved&&saved.getTime()<=day?.getTime()?saved:start;
  const empty={items:[],complete:0,total:0,next:null,days:null,available:0};
  if(!day||!start||!sfExamSubject(exam.subject))return empty;
  const daysRemaining=Math.round((day.getTime()-start.getTime())/86400000);
  const days=Math.round((day.getTime()-anchor.getTime())/86400000);
  if(daysRemaining<0||days<0)return {...empty,days:daysRemaining};
  const packs=sfExamFindPacks(exam.subject,dashboard),allowed=new Map(packs.map(p=>[Number(p.id),p]));
  const ranked=window.sfCoach?.collect?.(profile,dashboard,new Date(now).getTime())||[];
  const rankedPacks=ranked.filter(p=>allowed.has(Number(p.id)));
  for(const pack of packs)if(!rankedPacks.some(r=>Number(r.id)===Number(pack.id)))
    rankedPacks.push({id:Number(pack.id),source:String(pack.source_key||pack.id),mode:pack.type==='quiz'?'guided':'open',
      type:pack.type,reason:'Er is nog geen oefenresultaat voor dit lespakket.',score:0});
  // Bij een verre toets oefenen we nu een keer en in de laatste dagen intensiever.
  const size=Math.min(Math.max(1,Number(limit)||10),10,days+1);
  const offsets=days<size?[...Array(days+1).keys()]:
    days<=14?[...Array(size).keys()].map(i=>Math.round(i*days/Math.max(1,size-1))):
      [0,...[...Array(size-1).keys()].map(i=>days-(size-2)+i)];
  const items=offsets.map((offset,i)=>{
    const d=new Date(anchor);
    d.setDate(d.getDate()+offset);
    const date=sfExamLocalToday(d),selection=rankedPacks.length?rankedPacks[i%rankedPacks.length]:null;
    const pack=selection?allowed.get(Number(selection.id)):null;
    let mode=selection?.mode||'guided';
    if(pack?.type==='flashcards')mode=mode==='review'?'review':'flashcards';
    if(pack?.type==='quiz'&&!['review','guided','recall'].includes(mode))mode='quiz';
    if(!pack)mode='';
    const label=mode==='review'?'Herhaal de moeilijke vragen':mode==='guided'?'Leer in stappen':
      mode==='recall'?'Leg het uit':mode==='flashcards'?'Oefen flashcards':mode==='quiz'?'Maak een oefentoets':
      'Geen oefenmateriaal voor dit vak';
    const key=String(exam.id)+'|'+date;
    return {date,key,index:i,pack,mode,label,reason:selection?.reason||'',
      completed:!!plan?.completed?.[key],isToday:date===today};
  });
  const complete=items.filter(x=>x.completed).length,next=items.find(x=>!x.completed)||null;
  return {items,complete,total:items.length,next,days:daysRemaining,available:packs.length};
}

function sfExamParent(profile,dashboard,plan,now=new Date()){
  const today=sfExamLocalToday(now),sets=(dashboard?.collections||[]);
  const attempts=(dashboard?.attempts||[]).filter(a=>Number.isFinite(Number(a.grade)))
    .sort((a,b)=>Date.parse(b.created_at||0)-Date.parse(a.created_at||0));
  const recent=attempts.slice(0,3),older=attempts.slice(3,6);
  const average=v=>v.length?v.reduce((s,a)=>s+Number(a.grade),0)/v.length:null;
  const avg=average(recent),previous=average(older),trend=recent.length===3&&older.length===3?avg-previous:null;
  const coach=window.sfCoach?.collect?.(profile,dashboard,new Date(now).getTime())||[];
  const focus=coach.filter(x=>x.tone==='focus'||x.tone==='due').length;
  const due=coach.reduce((sum,x)=>sum+Number(x.due||0),0);
  const exams=(plan?.exams||[]).filter(e=>e&&sfExamDate(e.date)&&e.date>=today)
    .sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  const upcoming=exams.map(e=>({exam:e,schedule:sfExamPlans(e,profile,dashboard,plan,now)}));
  const mostRecent=attempts[0]||null;
  const activePacks=sets.filter(p=>p?.type==='quiz'||p?.type==='flashcards').length;
  return {profile,avg,trend,recent:recent.length,count:attempts.length,mostRecent,
    focus,due,upcoming,topRecommendation:coach[0]||null,activePacks};
}
window.sfExamPrep={date:sfExamDate,today:sfExamLocalToday,subject:sfExamSubject,
  packs:sfExamFindPacks,plan:sfExamPlans,parent:sfExamParent};
})();
