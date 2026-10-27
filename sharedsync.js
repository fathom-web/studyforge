/* StudyForge shared progress: SQL RPC verifies profile code before DB access.
   Quiz material remains published via GitHub; private grades/plans use Supabase.
   The short shared code is convenience access, not strong authentication. */
'use strict';
(function(){
  const config=window.STUDYFORGE_SUPABASE||{};
  const enabled=!!(config.sharedMode&&config.url&&(config.publishableKey||config.anonKey));
  window.sfCloudEnabled=enabled;
  if(!enabled)return;

  const baseAdapter=window.sfAdapter;
  const shared={
    pin:null, profile:null, cache:new Map(),
    deviceId(){
      let id=localStorage.getItem('studyforge-device-id');
      if(!id){
        id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():
          'device-'+Date.now()+'-'+Math.random().toString(36).slice(2);
        localStorage.setItem('studyforge-device-id',id);
      }
      return id;
    },
    localArrays(profile){
      const d=sfLocal(),byId=new Map(d.sets.map(c=>[Number(c.id),c]));
      const device=this.deviceId();
      const attempts=d.attempts.filter(a=>Number(a.profile_id)===Number(profile))
        .filter(a=>byId.get(Number(a.collection_id))?.source_key)
        .slice(-900).map(a=>{
          const col=byId.get(Number(a.collection_id));
          return {
            client_id:device+':'+a.id,source_key:col.source_key,
            title:col.title,subject:col.subject,
            correct_count:Number(a.correct_count||0),total_count:Number(a.total_count||1),
            grade:Number(a.grade),details:a.details||[],
            created_at:a.created_at||new Date().toISOString()
          };
        });
      const reviews=d.reviews.filter(r=>Number(r.profile_id)===Number(profile))
        .filter(r=>byId.get(Number(r.collection_id))?.source_key)
        .slice(-1400).map(r=>({
          source_key:byId.get(Number(r.collection_id)).source_key,
          card_index:Number(r.card_index),known:Number(r.known||0),
          reviews:Number(r.reviews||0),
          updated_at:r.updated_at||'1970-01-01T00:00:00.000Z'
        }));
      return {attempts,reviews};
    },
    async sync(profile,plan=null){
      if(!this.pin)throw Error('Voer eerst de profielcode in.');
      profile=Number(profile);
      if(profile!==1&&profile!==2)throw Error('Onbekend profiel');
      const c=await sfClient(),local=this.localArrays(profile);
      const result=await c.rpc('sf_shared_sync',{
        p_profile:profile,p_pin:this.pin,
        p_attempts:local.attempts,p_reviews:local.reviews,p_plan:plan
      });
      if(result.error)throw Error('Cloudsynchronisatie mislukt: '+result.error.message);
      if(!result.data||!Array.isArray(result.data.attempts)||!Array.isArray(result.data.reviews))
        throw Error('Onverwacht antwoord van de database.');
      this.cache.set(profile,result.data);
      return result.data;
    },
    async enter(profile,pin){
      if(!/^[0-9]{4}$/.test(String(pin)))throw Error('Vul vier cijfers in.');
      this.pin=String(pin);
      this.profile=Number(profile);
      try{
        let data=await this.sync(profile);
        if(!data.plan&&typeof spReadLocal==='function'){
          const localPlan=spReadLocal(profile);
          if(localPlan&&Array.isArray(localPlan.exams)&&(
            localPlan.exams.length||Object.keys(localPlan.completed||{}).length||
            localPlan.goals?.targetGrade!==7||localPlan.goals?.sessionsPerWeek!==3)){
            data=await this.sync(profile,localPlan);
          }
        }
        return data;
      }catch(error){this.clear();throw error;}
    },
    clear(){this.pin=null;this.profile=null;this.cache.clear();},
    async savePlan(profile,plan){return this.sync(profile,plan);},
    async getPlan(profile){
      const row=this.cache.get(Number(profile))||await this.sync(profile);
      return row.plan||null;
    },
    async dashboard(profile,local){
      const data=await this.sync(profile);
      const byKey=new Map(sfLocal().sets
        .filter(col=>Number(col.profile_id)===Number(profile)&&col.source_key)
        .map(col=>[col.source_key,col]));
      const attempts=data.attempts.filter(row=>byKey.has(row.source_key)).map(row=>{
        const col=byKey.get(row.source_key);
        return {...row,id:row.client_id,collection_id:col.id,profile_id:Number(profile)};
      }).sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
      const reviews=data.reviews.filter(row=>byKey.has(row.source_key)).map(row=>{
        const col=byKey.get(row.source_key);
        return {...row,collection_id:col.id,profile_id:Number(profile)};
      });
      const active=new Set(local.collections.map(c=>Number(c.id)));
      return {...local,attempts:attempts.map(({details,...rest})=>rest),
        flash_progress:reviews,
        missed:sfLatestMissed(attempts).filter(m=>active.has(Number(m.collection_id)))};
    },
    afterReview(profile,collection,index){
      const d=sfLocal(),rec=d.reviews.find(r=>Number(r.profile_id)===Number(profile)
        &&Number(r.collection_id)===Number(collection)&&Number(r.card_index)===Number(index));
      if(rec){rec.updated_at=new Date().toISOString();sfPersist();}
    }
  };
  window.sfCloud=shared;
  window.sfAdapter=async function(action,b=null,params={}){
    if(action==='logout')shared.clear();
    if(action==='dashboard'){
      const local=await baseAdapter(action,b,params);
      if(shared.pin)return shared.dashboard(params.profile,local);
      return local;
    }
    if(action==='save_quiz'){
      const result=await baseAdapter(action,b,params);
      if(shared.pin)await shared.sync(Number(b.profile));
      return result;
    }
    if(action==='flash_review'){
      const result=await baseAdapter(action,b,params);
      shared.afterReview(b.profile,b.collection_id,b.index);
      if(shared.pin)await shared.sync(Number(b.profile));
      return result;
    }
    return baseAdapter(action,b,params);
  };
})();
