-- StudyForge: gedeelde cloudvoortgang zonder e-mailaccounts.
-- Uitvoeren in Supabase SQL Editor. Houd deze tabellen afgeschermd.
-- De publiek zichtbare profielcode is een eenvoudige toegangsdrempel,
-- GEEN sterke beveiliging voor gevoelige of vertrouwelijke gegevens.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.sf_shared_gate (
  profile_id smallint primary key check(profile_id in (1,2)),
  pin_hash text not null
);
insert into public.sf_shared_gate(profile_id,pin_hash)
values
  (1,extensions.crypt('2007',extensions.gen_salt('bf'))),
  (2,extensions.crypt('2007',extensions.gen_salt('bf')))
on conflict(profile_id) do update set pin_hash=excluded.pin_hash;

create table if not exists public.sf_shared_progress (
  profile_id smallint primary key check(profile_id in (1,2)),
  attempts jsonb not null default '[]'::jsonb,
  reviews jsonb not null default '[]'::jsonb,
  plan jsonb,
  updated_at timestamptz not null default now(),
  constraint shared_attempts_array check(jsonb_typeof(attempts)='array'),
  constraint shared_reviews_array check(jsonb_typeof(reviews)='array')
);
insert into public.sf_shared_progress(profile_id) values(1),(2) on conflict do nothing;

-- Geen rechtstreekse tabeltoegang voor bezoekers.
alter table public.sf_shared_gate enable row level security;
alter table public.sf_shared_progress enable row level security;
revoke all on public.sf_shared_gate,public.sf_shared_progress from public, anon, authenticated;

-- Eén gecontroleerde RPC voor lezen, toevoegen en samenvoegen van voortgang.
create or replace function public.sf_shared_sync(
  p_profile smallint,
  p_pin text,
  p_attempts jsonb default '[]'::jsonb,
  p_reviews jsonb default '[]'::jsonb,
  p_plan jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_row public.sf_shared_progress%rowtype;
  v_item jsonb;
  v_existing jsonb;
  v_rest jsonb;
  v_attempts jsonb;
  v_reviews jsonb;
  v_plan jsonb;
  v_key text;
  v_newtime timestamptz;
  v_oldtime timestamptz;
begin
  if p_profile not in(1,2) or p_pin is null or length(p_pin)<>4 then
    raise exception 'Ongeldige profielcode';
  end if;
  select pin_hash into v_hash from public.sf_shared_gate where profile_id=p_profile;
  if v_hash is null or extensions.crypt(p_pin,v_hash)<>v_hash then
    raise exception 'Ongeldige profielcode';
  end if;
  if jsonb_typeof(p_attempts)<>'array' or jsonb_typeof(p_reviews)<>'array'
    or jsonb_array_length(p_attempts)>1000 or jsonb_array_length(p_reviews)>1500
    or length(p_attempts::text)>500000 or length(p_reviews::text)>250000
    or (p_plan is not null and (jsonb_typeof(p_plan)<>'object' or length(p_plan::text)>40000))
  then raise exception 'Voortgang bevat te veel gegevens'; end if;

  select * into v_row from public.sf_shared_progress where profile_id=p_profile for update;
  if not found then
    insert into public.sf_shared_progress(profile_id) values(p_profile);
    select * into v_row from public.sf_shared_progress where profile_id=p_profile for update;
  end if;
  v_attempts:=v_row.attempts;
  v_reviews:=v_row.reviews;
  v_plan:=v_row.plan;

  -- Vragenronde krijgt een stabiele client_id; opnieuw synchroniseren geeft geen duplicaten.
  for v_item in select value from jsonb_array_elements(p_attempts) loop
    v_key:=v_item->>'client_id';
    if v_key is null or length(v_key)<5 or length(v_key)>160
      or coalesce(length(v_item::text),0)>8000
      or coalesce((v_item->>'grade')::numeric,0)<1
      or coalesce((v_item->>'grade')::numeric,0)>10
    then continue; end if;
    if not exists(
      select 1 from jsonb_array_elements(v_attempts) a
      where a->>'client_id'=v_key
    ) then v_attempts:=v_attempts||jsonb_build_array(v_item); end if;
  end loop;

  -- Flashcards op pakket-id en kaartnummer; nieuwste beoordeling wint.
  for v_item in select value from jsonb_array_elements(p_reviews) loop
    v_key:=v_item->>'source_key';
    if v_key is null or length(v_key)>200 or length(v_key)<3
      or coalesce((v_item->>'card_index')::integer,-1)<0
      or coalesce((v_item->>'card_index')::integer,-1)>250
      or (v_item->>'known') not in ('0','1')
    then continue; end if;
    select value into v_existing from jsonb_array_elements(v_reviews)
    where value->>'source_key'=v_key and value->>'card_index'=v_item->>'card_index' limit 1;
    v_newtime:=coalesce(nullif(v_item->>'updated_at','')::timestamptz,'epoch'::timestamptz);
    v_oldtime:=coalesce(nullif(v_existing->>'updated_at','')::timestamptz,'epoch'::timestamptz);
    if v_existing is null or v_newtime>v_oldtime then
      select coalesce(jsonb_agg(value),'[]'::jsonb) into v_rest
      from jsonb_array_elements(v_reviews)
      where not (value->>'source_key'=v_key and value->>'card_index'=v_item->>'card_index');
      v_reviews:=v_rest||jsonb_build_array(v_item);
    end if;
    v_existing:=null;
  end loop;

  -- Bestaand leerplan nooit automatisch overschrijven. Nieuwe planwijziging is expliciet.
  if p_plan is not null then v_plan:=p_plan; end if;
  update public.sf_shared_progress set
    attempts=v_attempts, reviews=v_reviews, plan=v_plan, updated_at=now()
  where profile_id=p_profile;
  return jsonb_build_object(
    'attempts',v_attempts,
    'reviews',v_reviews,
    'plan',v_plan,
    'updated_at',now()
  );
end;
$$;
revoke all on function public.sf_shared_sync(smallint,text,jsonb,jsonb,jsonb) from public;
grant execute on function public.sf_shared_sync(smallint,text,jsonb,jsonb,jsonb) to anon, authenticated;
