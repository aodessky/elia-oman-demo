/* ===== ELIA v3 prototype module =====
   Adds the requirement areas from the consolidated requirements (v3.1) on top of the first demo:
   proactive detection, verified actions, incentives, behaviour loop, preventive care gaps, medication and
   home monitoring, escalation, privacy and consent, wellness circles, challenges, agent-relayed messages,
   leaderboards, population challenges and the ministry view. Everything here runs on simulated data. */
const T=(k,v)=>t("x_"+k,v);
const V3C=[
  {id:"fatma",n:{en:"Fatma",ar:"فاطمة"},rel:"spouse",base:5400},
  {id:"salim",n:{en:"Salim",ar:"سالم"},rel:"brother",base:7800},
  {id:"maryam",n:{en:"Maryam",ar:"مريم"},rel:"sister",base:4600},
  {id:"khalid",n:{en:"Khalid",ar:"خالد"},rel:"friend",base:9100},
  {id:"yusuf",n:{en:"Yusuf",ar:"يوسف"},rel:"colleague",base:6900}];
const cm=id=>V3C.find(c=>c.id===id);
const nm=c=>c?(c.n[S.lang]||c.n.en):"";
const V3T={steps:{ver:"wear"},active:{ver:"wear"},sleep:{ver:"wear"},veg:{ver:"photo"}};
const V3R=[{id:"pharm",cost:200},{id:"grocery",cost:300},{id:"gym",cost:150},{id:"charity",cost:100},{id:"visit",cost:400}];
const V3CAP=60;
function vRng(seed){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return((h>>>0)%100000)/100000}}
function vDate(off=0){return new Date(Date.now()+(V().day+off)*864e5)}
function vFmt(d,o){return d.toLocaleDateString(LOCALE[S.lang],o||{weekday:"short",day:"numeric",month:"short"})}
function vDay(i){return vFmt(new Date(Date.now()+i*864e5),{day:"numeric",month:"short"})}
function vNum(n){return Math.round(n).toLocaleString(LOCALE[S.lang])}
function vAge(){const f=S.facts&&S.facts.age;const a=f?parseInt(fv(f),10):NaN;return a>0?a:47}
function vDiab(){const r=S.record;const c=r&&JSON.stringify(r.conditions||r.problems||"");return c&&/diabet/i.test(c)?"t2d":"pre"}
function vWear(){return Object.keys(S.wear||{}).length>0}
function V(){if(!S.v3)S.v3=v3Fresh();return S.v3}
function v3Fresh(){
  const w=typeof wearInputs==="function"?wearInputs():{};const base=Math.round((w.steps||6200)/100)*100;
  const v={day:0,base,target:Math.round(base*1.1/100)*100,steps:[],pts:{bal:0,ledger:[]},redeemed:[],signals:[],gaps:[],meds:[],bp:[],glu:[],esc:[],circles:[],chal:[],relay:[],plans:[],pop:[],
    consent:{coach:true,wear:true,records:true,circle:true,sponsor:true,research:false},audit:[],ramadan:false,quiet:true,proDay:-9,await:null,ret:null,draft:null,relayDay:{d:0,n:0},gov:"muscat",del:false};
  const r=vRng("me|"+base);
  for(let i=-13;i<=-1;i++)v.steps.push({d:i,n:Math.round(base*(0.72+r()*0.55))});
  for(let i=-9;i<=-1;i+=2){v.bp.push({d:i,sys:Math.round(128+r()*14),dia:Math.round(80+r()*9)});v.glu.push({d:i,v:Math.round((5.9+r()*1.5)*10)/10})}
  v.meds=[{id:"met",dose:"500 mg",times:2,left:6,log:{}},{id:"ator",dose:"20 mg",times:1,left:19,log:{}}];
  v.meds.forEach(m=>{for(let i=-13;i<=-1;i++)m.log[i]=Array.from({length:m.times},()=>r()>0.16)});
  const age=vAge(),dz=vDiab();
  v.gaps=[{id:"a1c",status:"due",due:-20},{id:"eye",status:dz==="t2d"?"due":"na",due:14},{id:"kidney",status:dz==="t2d"?"due":"na",due:30},{id:"lipid",status:"due",due:-5},{id:"flu",status:"due",due:10},
    {id:"crc",status:age>=45?"due":"na",due:60},{id:"bpc",status:"ok",due:300}].filter(g=>g.status!=="na");
  v.pts.ledger=[{d:-6,k:"p_steps",pts:10,ver:"wear"},{d:-4,k:"p_meal",pts:8,ver:"photo"},{d:-3,k:"p_steps",pts:10,ver:"wear"},{d:-2,k:"p_med",pts:2,ver:"self"},{d:-1,k:"p_welcome",pts:100,ver:"prog"}];
  v.pts.bal=v.pts.ledger.reduce((a,x)=>a+x.pts,0);
  v.pop=[{id:"omanwalks",name:{en:"Oman Walks: one billion steps in 30 days",ar:"عُمان تمشي: مليار خطوة في ٣٠ يومًا"},by:"moh",metric:"steps",days:30,state:"invited",start:0,pts:150,mine:0}];
  v.audit=[{d:-1,k:"a_consent"}];
  return v}
function v3Audit(k,vars){V().audit.unshift({d:V().day,k,v:vars||{}});V().audit=V().audit.slice(0,40)}
function v3Pts(k,pts,ver){const v=V();let got=pts;
  if(pts>0&&ver!=="clinic"&&ver!=="prog"){const today=v.pts.ledger.filter(x=>x.d===v.day&&x.pts>0&&x.ver!=="clinic"&&x.ver!=="prog").reduce((a,x)=>a+x.pts,0);got=Math.max(0,Math.min(pts,V3CAP-today))}
  if(!got)return 0;v.pts.ledger.unshift({d:v.day,k,pts:got,ver});v.pts.bal+=got;return got}
const vVer=ver=>`<span class="x-ver ${ver==="self"?"s":"v"}">${T("ver_"+ver)}</span>`;
const vPts=n=>`<span class="x-pts${n<0?" neg":""}">${n>0?"+":""}${n} ${T("pts")}</span>`;
/* Entering a v3 flow from the middle of another one: remember the open question so it can be restored afterwards */
function v3Enter(){const v=V();setView("chat");if(!v.ret){v.ret={r:S.curReplies,a:S.await};S.await=null}v.await=null}
function v3End(){const v=V(),r=v.ret;v.ret=null;v.await=null;if(typeof renderHQ==="function")renderHQ();
  if(S.sim)return;if(S.coreDone){coreReplies();return}
  if(r&&(r.a||r.r)){S.await=r.a;if(r.r)replies(r.r);return}
  replies([[T("m_more"),v3Menu,{silent:true}]])}
function v3Leave(){const v=V();if(v.ret){S.await=v.ret.a}v.ret=null;v.await=null}
function v3Go(tab){S.hqTab=tab;setView("hq");renderHQ();if(V().ret)v3End()}
function v3Menu(){v3Enter();bot(T("menu"));replies([[T("m_circle"),v3CircleHome],[T("m_gaps"),v3GapsChat],[T("m_meds"),v3MedsChat],[T("m_reading"),v3AskReading],[T("m_week"),v3Week],[T("m_rewards"),()=>v3Go("rewards"),{silent:true}],[T("m_back"),v3End,{silent:true}]])}

/* ---------- Circles ---------- */
const vJoined=c=>c.members.filter(m=>m.state==="joined");
function v3AutoCircle(){const v=V();const c={id:"c"+Date.now(),kind:"family",share:"prog",members:[{id:"fatma",state:"joined"},{id:"salim",state:"joined"},{id:"maryam",state:"joined"}],made:v.day};v.circles.unshift(c);v3Audit("a_circle",{n:3});sys(T("c_auto"));return c}
function v3CircleHome(){v3Enter();const v=V();
  if(!v.consent.circle){bot(T("c_off"));replies([[T("open_privacy"),()=>v3Go("privacy"),{silent:true}],[T("m_back"),v3End,{silent:true}]]);return}
  if(!v.circles.length){bot(T("c_intro"));replies([[T("c_family"),()=>v3CirclePick("family")],[T("c_friends"),()=>v3CirclePick("friends")],[T("c_work"),()=>v3CirclePick("work")],[T("notnow"),v3End]]);return}
  const c=v.circles[0];bot(T("c_home",{name:T("c_"+c.kind),n:vJoined(c).length}));
  replies([[T("ch_new"),()=>v3ChalNew(c)],[T("r_send"),()=>v3RelayPick(c)],[T("co_find"),()=>v3CoordPick(c)],[T("c_board"),()=>v3Go("circle"),{silent:true}],[T("m_back"),v3End,{silent:true}]])}
function v3CirclePick(kind){const v=V();v.draft={kind,pick:[]};const d=v.draft;bot(T("c_who"));
  const show=()=>setReplies([...V3C.map(m=>[`${nm(m)} · ${T("rel_"+m.rel)}`,()=>{const i=d.pick.indexOf(m.id);if(i<0){if(d.pick.length<12)d.pick.push(m.id)}else d.pick.splice(i,1);show()},{keep:true,on:d.pick.includes(m.id)}]),
    [T("c_invite_go"),()=>{if(!d.pick.length){bot(T("c_pick_one"));later(show);return}v3CircleShare()},{cls:"go"}]]);
  later(show)}
function v3CircleShare(){bot(T("c_share_q"));replies([[T("c_share_prog"),()=>v3CircleCreate("prog")],[T("c_share_steps"),()=>v3CircleCreate("steps")]])}
function v3CircleCreate(share){const v=V(),d=v.draft;const c={id:"c"+Date.now(),kind:d.kind,share,members:d.pick.map(id=>({id,state:"invited"})),made:v.day};v.circles.unshift(c);v.draft=null;v3Audit("a_circle",{n:c.members.length});
  bot(T("c_sent",{n:c.members.length}));
  c.members.forEach((m,i)=>{if(i<Math.max(1,c.members.length-1))m.state="joined"});
  sys(T("c_joined",{who:vJoined(c).map(m=>nm(cm(m.id))).join(", ")}));
  bot(T("c_next"));renderHQ();replies([[T("ch_new"),()=>v3ChalNew(c)],[T("later_btn"),v3End]])}

/* ---------- Challenges ---------- */
function v3ChalNew(c){v3Enter();if(!vJoined(c).length){bot(T("ch_nobody"));v3End();return}bot(T("ch_pick"));replies(Object.keys(V3T).map(k=>[T("tpl_"+k),()=>v3ChalDur(c,k)]))}
function v3ChalDur(c,k){bot(T("ch_dur"));replies([[T("d7"),()=>v3ChalMode(c,k,7)],[T("d14"),()=>v3ChalMode(c,k,14)]])}
function v3ChalMode(c,k,days){bot(T("ch_mode"));replies([[T("mode_team"),()=>v3ChalDraft(c,k,days,"team")],[T("mode_rank"),()=>v3ChalDraft(c,k,days,"rank")]])}
function v3ChalDraft(c,k,days,mode){const who=vJoined(c).map(m=>nm(cm(m.id))).join(", ");
  bot(`<div class="x-card"><span class="x-eyebrow">${T("ch_draft")}</span><b>${T("tpl_"+k)}</b><div class="x-kv"><span>${T("k_with")}</span><span>${esc(who)}</span><span>${T("k_len")}</span><span>${T("d"+days)}</span><span>${T("k_mode")}</span><span>${T("mode_"+mode)}</span><span>${T("k_proof")}</span><span>${T("ver_"+V3T[k].ver)}</span></div><p class="x-note">${T("ch_fair")}</p></div>`);
  replies([[T("approve_send"),()=>v3ChalSend(c,k,days,mode),{cls:"go"}],[T("change"),()=>v3ChalNew(c)],[T("cancel"),v3End]])}
function v3ChalSend(c,k,days,mode){const v=V(),ids=vJoined(c).map(m=>m.id);
  const ch={id:"h"+Date.now(),circle:c.id,tpl:k,days,mode,start:v.day,state:"active",by:"me",who:["me",...ids],acc:{},data:{me:[]}};
  ids.forEach((id,i)=>{ch.acc[id]=(i===ids.length-1&&ids.length>1)?"wait":"yes";if(ch.acc[id]==="yes")ch.data[id]=[]});v.chal.unshift(ch);v3Audit("a_chal",{name:T("tpl_"+k)});
  bot(T("ch_sent"));sys(T("ch_acc",{who:ids.filter(id=>ch.acc[id]==="yes").map(id=>nm(cm(id))).join(", ")}));
  bot(T("ch_starts"));replies([[T("next_day"),()=>v3NextDay(1),{silent:true}],[T("c_board"),()=>v3Go("circle"),{silent:true}],[T("m_back"),v3End,{silent:true}]])}
function v3Incoming(){v3Enter();const v=V();const c=v.circles[0]||v3AutoCircle();const from=vJoined(c)[Math.min(1,vJoined(c).length-1)];if(!from){v3End();return}const name=nm(cm(from.id));
  const used=v.chal.map(h=>h.tpl),k=["active","sleep","veg","steps"].find(x=>!used.includes(x))||"active";
  bot(`<div class="x-card x-agent"><span class="x-eyebrow">${T("via_agent",{name:esc(name)})}</span><p>${T("in_chal",{name:esc(name),what:T("tpl_"+k)})}</p><div class="x-kv"><span>${T("k_len")}</span><span>${T("d7")}</span><span>${T("k_mode")}</span><span>${T("mode_team")}</span><span>${T("k_shared")}</span><span>${T("shared_prog")}</span></div></div>`);
  replies([[T("accept"),()=>{const ids=vJoined(c).map(m=>m.id);const ch={id:"h"+Date.now(),circle:c.id,tpl:k,days:7,mode:"team",start:v.day,state:"active",by:from.id,who:["me",...ids],acc:{},data:{me:[]}};ids.forEach(id=>{ch.acc[id]="yes";ch.data[id]=[]});v.chal.unshift(ch);
      bot(T("in_yes",{name:esc(name)}));replies([[T("next_day"),()=>v3NextDay(1),{silent:true}],[T("c_board"),()=>v3Go("circle"),{silent:true}],[T("m_back"),v3End,{silent:true}]])},{cls:"go",react:"achievement"}],
    [T("decline"),()=>{bot(T("in_no",{name:esc(name)}));v3End()}],[T("later_btn"),()=>{bot(T("in_later"));v3End()}]])}
/* score of one participant: average % of their own daily goal, capped at 130 so one huge day can't decide it */
function vScore(ch,id){const a=ch.data[id]||[];if(!a.length)return 0;return Math.round(a.reduce((s,x)=>s+Math.min(130,x),0)/a.length)}
function vTeam(ch){const ids=Object.keys(ch.data);const done=ids.reduce((s,id)=>s+(ch.data[id]||[]).reduce((a,x)=>a+Math.min(130,x),0),0);return Math.min(100,Math.round(done/(ids.length*ch.days*100)*100))}
function vBoard(ch){return Object.keys(ch.data).map(id=>({id,name:id==="me"?T("you"):nm(cm(id)),sc:vScore(ch,id)})).sort((a,b)=>b.sc-a.sc)}
function v3ChalTick(ch,events){const v=V();Object.keys(ch.acc).forEach(id=>{if(ch.acc[id]==="wait"){ch.acc[id]="yes";ch.data[id]=[];events.push(T("ev_joined",{name:nm(cm(id)),what:T("tpl_"+ch.tpl)}))}});
  const n=ch.data.me.length;const y=v.steps[v.steps.length-1];
  Object.keys(ch.data).forEach(id=>{const r=vRng(ch.id+"|"+id+"|"+n);const pct=id==="me"?(ch.tpl==="steps"?Math.round(y.n/v.target*100):Math.round(70+r()*50)):Math.round(58+r()*62);ch.data[id].push(pct)});
  if(ch.data.me.length>=ch.days){ch.state="done";const team=vTeam(ch),me=vScore(ch,"me");const ok=ch.mode==="team"?team>=80:me>=80;const got=ok?v3Pts("p_chal",40,V3T[ch.tpl].ver):0;ch.got=got;
    events.push(T(ch.mode==="team"?(ok?"ev_done_team":"ev_miss_team"):(ok?"ev_done_rank":"ev_miss_rank"),{what:T("tpl_"+ch.tpl),pct:ch.mode==="team"?team:me})+(got?` ${vPts(got)}`:""))}
  else events.push(T(ch.mode==="team"?"ev_prog_team":"ev_prog_rank",{what:T("tpl_"+ch.tpl),day:ch.data.me.length,days:ch.days,pct:ch.mode==="team"?vTeam(ch):vScore(ch,"me")}))}

/* ---------- Agent-relayed messages ---------- */
const V3_HEALTH=/\b(diabet|glucose|sugar|a1c|blood pressure|bp\b|metformin|insulin|diagnos|cancer|depress|anxiety|medic|pill|weigh|kg\b|pregnan)|سكر|ضغط|دواء|تشخيص|اكتئاب|وزن/i;
const V3_ABUSE=/\b(stupid|idiot|fat|lazy|loser|hate you|shut up|ugly|pathetic)\b|غبي|سمين|كسول|فاشل/i;
function v3RelayPick(c){v3Enter();const J=vJoined(c);if(!J.length){bot(T("ch_nobody"));v3End();return}bot(T("r_who"));replies(J.map(m=>[nm(cm(m.id)),()=>v3RelayWhat(m.id)]))}
function v3RelayWhat(id){const v=V(),name=nm(cm(id));if(v.relayDay.d!==v.day)v.relayDay={d:v.day,n:0};
  if(v.relayDay.n>=5){bot(T("r_limit"));v3End();return}
  const mem=v.circles.flatMap(c=>c.members).find(m=>m.id===id);if(mem&&mem.muted){bot(T("r_muted",{name:esc(name)}));v3End();return}
  bot(T("r_what",{name:esc(name)}));v.await={k:"relay",id};replies([1,2,3].map(i=>[T("r_s"+i),()=>v3RelayDraft(id,T("r_s"+i))]))}
function v3RelayDraft(id,text,o={}){const v=V(),name=nm(cm(id));v.await=null;clearReplies();
  if(V3_ABUSE.test(text)){bot(T("r_abuse"));v.await={k:"relay",id};replies([[T("cancel"),v3End]]);return}
  if(V3_HEALTH.test(text)&&!o.ok){bot(T("r_health"));replies([[T("r_health_ok"),()=>v3RelayDraft(id,text,{ok:true})],[T("r_rewrite"),()=>{bot(T("r_what",{name:esc(name)}));v.await={k:"relay",id}}],[T("cancel"),v3End]]);return}
  bot(`<div class="x-card x-agent"><span class="x-eyebrow">${T("r_draft",{name:esc(name)})}</span><p>“${esc(text)}”</p><div class="x-kv"><span>${T("k_shared")}</span><span>${T("r_only")}</span><span>${T("k_notshared")}</span><span>${T("r_never")}</span><span>${T("k_when")}</span><span>${T("r_goodtime",{name:esc(name)})}</span></div></div>`);
  replies([[T("approve_send"),()=>v3RelaySend(id,text),{cls:"go"}],[T("r_rewrite"),()=>{bot(T("r_what",{name:esc(name)}));v.await={k:"relay",id}}],[T("cancel"),v3End]])}
function v3RelaySend(id,text){const v=V(),name=nm(cm(id));v.relayDay.n++;const m={id:"r"+Date.now(),who:id,text,d:v.day,dir:"out",state:"delivered"};v.relay.unshift(m);v3Audit("a_relay",{name});
  sys(T("r_delivered",{name:esc(name)}));const rep=T("r_reply"+(1+v.relay.length%3));
  later(()=>new Promise(r=>setTimeout(r,reduced?50:900)));sys(T("sim_later"));
  bot(`<div class="x-card x-agent"><span class="x-eyebrow">${T("via_agent",{name:esc(name)})}</span><p>“${esc(rep)}”</p></div>`);
  v.relay.unshift({id:"r"+Date.now()+"b",who:id,text:rep,d:v.day,dir:"in",state:"delivered"});
  replies([[T("r_again"),()=>v3RelayWhat(id)],[T("co_find"),()=>v3CoordFind(id)],[T("m_back"),v3End,{silent:true}]])}
/* ---------- Agent-to-agent scheduling ---------- */
function vSlots(){const mk=(add,h,m)=>{const d=vDate(add);d.setHours(h,m,0,0);return d};return[mk(1,18,20),mk(2,6,0),mk(3,17,30)]}
const vSlotFmt=d=>d.toLocaleString(LOCALE[S.lang],{weekday:"long",hour:"numeric",minute:"2-digit"});
function v3CoordPick(c){v3Enter();const J=vJoined(c);if(!J.length){bot(T("ch_nobody"));v3End();return}bot(T("co_who"));replies(J.map(m=>[nm(cm(m.id)),()=>v3CoordFind(m.id)]))}
function v3CoordFind(id){const name=nm(cm(id));bot(T("co_working",{name:esc(name)}),{delay:900});const sl=vSlots();
  bot(`<div class="x-card x-agent"><span class="x-eyebrow">${T("co_found",{name:esc(name)})}</span><ul class="x-lines">${sl.map(d=>`<li><span>${vSlotFmt(d)}</span></li>`).join("")}</ul><p class="x-note">${T("co_privacy")}</p></div>`);
  replies([...sl.map(d=>[vSlotFmt(d),()=>v3CoordBook(id,d)]),[T("cancel"),v3End]])}
function v3CoordBook(id,d){const v=V(),name=nm(cm(id));v.plans.unshift({who:id,at:d.getTime(),what:"walk"});v3Audit("a_coord",{name});
  bot(T("co_done",{name:esc(name),when:vSlotFmt(d)}));addUpdate(()=>T("up_walk",{name:nm(cm(id)),when:vSlotFmt(d)}));flashHQ();v3End()}

/* ---------- Proactive detection ---------- */
function v3Signal(kind){v3Enter();const v=V();
  if(!v.consent.coach||!v.consent.wear){bot(T("sg_consent"));replies([[T("open_privacy"),()=>v3Go("privacy"),{silent:true}],[T("m_back"),v3End,{silent:true}]]);return}
  if(v.proDay===v.day){sys(T("sg_cap"));v3End();return}
  v.proDay=v.day;const sg={id:"s"+Date.now(),kind:kind||"recovery",d:v.day,state:"open"};v.signals.unshift(sg);
  sys(T("sim_morning",{when:vFmt(vDate())}));
  bot(`<div class="x-card x-alert"><span class="x-eyebrow">${T("sg_eyebrow")}</span><p>${T("sg_"+sg.kind,{name:esc(S.name||"")})}</p><ul class="x-lines"><li><span>${T("sg_rhr")}</span><b>+8 ${T("bpm")}</b></li><li><span>${T("sg_sleep")}</span><b>−50 ${T("min")}</b></li><li><span>${T("sg_hrv")}</span><b>−18%</b></li></ul><p class="x-note">${T("sg_src",{src:T(vWear()?"src_wear":"src_sim")})}</p></div>`);
  bot(T("sg_q"));
  replies([[T("sg_fine"),()=>v3SigAns(sg,"fine")],[T("sg_off"),()=>v3SigAns(sg,"off")],[T("sg_sym"),()=>{sg.state="triage";v3Leave();pickSymptom()}],[T("sg_why"),()=>{bot(T("sg_why_msg"));replies([[T("sg_fine"),()=>v3SigAns(sg,"fine")],[T("sg_off"),()=>v3SigAns(sg,"off")]])}]])}
function v3SigAns(sg,a){sg.state=a==="fine"?"adjusted":"watch";bot(T(a==="fine"?"sg_fine_msg":"sg_off_msg"));
  replies([[T("sg_easy"),()=>{sg.easy=true;bot(T("sg_easy_msg"));addUpdate(()=>T("up_easy"));flashHQ();v3End()},{cls:"go"}],[T("sg_keep"),()=>{bot(T("sg_keep_msg"));v3End()}],...(a==="off"?[[T("sg_sym"),()=>{sg.state="triage";v3Leave();pickSymptom()}]]:[])])}

/* ---------- Medication and home readings ---------- */
function vAdh(m,days=14){let a=0,n=0;for(let i=V().day-days;i<V().day;i++){const l=m.log[i];if(l){n+=l.length;a+=l.filter(Boolean).length}}return n?Math.round(a/n*100):0}
function v3MedsChat(){v3Enter();const v=V();const m=v.meds[0];
  bot(`<div class="x-card"><span class="x-eyebrow">${T("md_eyebrow")}</span><b>${T("med_"+m.id)} ${m.dose}</b><p>${T(v.ramadan?"md_when_ram":"md_when")}</p><p class="x-note">${T("md_safe")}</p></div>`);
  replies([[T("md_taken"),()=>v3MedTaken(m),{cls:"go"}],[T("md_skip"),()=>v3MedSkip(m)],[T("m_reading"),v3AskReading],[T("md_open"),()=>v3Go("meds"),{silent:true}]])}
function v3MedTaken(m){const v=V();const l=m.log[v.day]||(m.log[v.day]=[]);if(l.length<m.times)l.push(true);m.left=Math.max(0,m.left-1);const got=v3Pts("p_med",2,"self");
  bot(T("md_taken_msg")+(got?` ${vPts(got)}`:""));
  if(m.left<=7&&!m.refill){bot(T("md_low",{n:m.left,med:T("med_"+m.id)}));replies([[T("md_refill"),()=>v3Refill(m),{cls:"go"}],[T("later_btn"),v3End]]);return}v3End()}
function v3Refill(m){m.refill=V().day;v3Audit("a_refill",{med:T("med_"+m.id)});bot(`<div class="x-card"><span class="x-eyebrow">${T("ph_pharm")}</span><p>${T("md_refill_msg",{med:T("med_"+m.id)})}</p></div>`);renderHQ();if(V().ret||S.coreDone)v3End()}
function v3MedSkip(m){const v=V();const l=m.log[v.day]||(m.log[v.day]=[]);if(l.length<m.times)l.push(false);bot(T("md_skip_q"));
  replies([[T("md_r_forgot"),()=>{bot(T("md_forgot_msg"));v3End()}],[T("md_r_side"),()=>{bot(T("md_side_msg"));replies([[T("esc_nurse"),()=>v3Callback("side"),{cls:"go"}],[T("notnow"),v3End]])}],[T("md_r_out"),()=>v3Refill(m)],[T("md_r_fast"),()=>{bot(T("md_fast_msg"));replies([[T("esc_nurse"),()=>v3Callback("fast"),{cls:"go"}],[T("notnow"),v3End]])}]])}
function v3AskReading(){v3Enter();bot(T("rd_ask"));V().await={k:"reading"};replies([["BP 128/82",()=>v3Reading("BP 128/82")],["BP 164/101",()=>v3Reading("BP 164/101")],["BP 186/122",()=>v3Reading("BP 186/122")],[T("rd_g1"),()=>v3Reading("glucose 6.1")],[T("rd_g2"),()=>v3Reading("glucose 14.8")],[T("m_back"),v3End,{silent:true}]])}
const V3_BP=/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/;
const V3_GLU=/(?:glu[ck]os[ea]?|sugar|az[uú]car|سكر|جلوكوز)\D{0,14}(\d{1,3}(?:[.,]\d)?)/i;
function v3Reading(x){const v=V();v.await=null;clearReplies();const b=x.match(V3_BP),g=!b&&x.match(V3_GLU);
  if(b){const sys_=+b[1],dia=+b[2];if(sys_<60||sys_>260||dia<30||dia>160){bot(T("rd_bad"));v.await={k:"reading"};return true}
    v.bp.push({d:v.day,sys:sys_,dia});v3Pts("p_reading",2,"self");
    if(sys_>=180||dia>=120){v3Esc(4,"bp_crisis");bot(`<div class="x-card x-urgent"><span class="x-eyebrow">${T("esc_urgent")}</span><p>${T("rd_bp_crisis",{v:`${sys_}/${dia}`})}</p></div>`);replies([[T("rd_recheck"),v3AskReading],[T("sg_sym"),()=>{v3Leave();pickSymptom()}],[T("esc_nurse"),()=>v3Callback("bp")]]);return true}
    const high=sys_>=140||dia>=90;const hi7=v.bp.filter(r=>r.d>v.day-7&&(r.sys>=140||r.dia>=90)).length;
    if(high&&hi7>=3){v3Esc(3,"bp_trend");bot(T("rd_bp_trend",{v:`${sys_}/${dia}`,n:hi7}));replies([[T("gp_book"),()=>v3Book({id:"bpv",status:"due"}),{cls:"go"}],[T("esc_nurse"),()=>v3Callback("bp")],[T("notnow"),v3End]]);return true}
    bot(T(high?"rd_bp_high":"rd_bp_ok",{v:`${sys_}/${dia}`}));v3End();return true}
  if(g){let val=parseFloat(g[1].replace(",","."));if(val>40)val=Math.round(val/18*10)/10;if(val<1||val>40){bot(T("rd_bad"));v.await={k:"reading"};return true}
    v.glu.push({d:v.day,v:val});v3Pts("p_reading",2,"self");
    if(val<3.9){v3Esc(val<3?4:3,"glu_low");bot(`<div class="x-card ${val<3?"x-urgent":"x-alert"}"><span class="x-eyebrow">${T(val<3?"esc_urgent":"esc_act")}</span><p>${T(val<3?"rd_glu_vlow":"rd_glu_low",{v:val})}</p></div>`);replies([[T("rd_recheck"),v3AskReading],[T("esc_nurse"),()=>v3Callback("glu")]]);return true}
    if(val>=16.7){v3Esc(4,"glu_high");bot(`<div class="x-card x-urgent"><span class="x-eyebrow">${T("esc_urgent")}</span><p>${T("rd_glu_vhigh",{v:val})}</p></div>`);replies([[T("sg_sym"),()=>{v3Leave();pickSymptom()}],[T("esc_nurse"),()=>v3Callback("glu")],[T("rd_recheck"),v3AskReading]]);return true}
    if(val>=13.9){v3Esc(2,"glu_high");bot(T("rd_glu_high",{v:val}));replies([[T("esc_nurse"),()=>v3Callback("glu")],[T("rd_recheck"),v3AskReading],[T("notnow"),v3End]]);return true}
    bot(T(val>10?"rd_glu_above":"rd_glu_ok",{v:val}));v3End();return true}
  bot(T("rd_bad"));v.await={k:"reading"};return true}
/* ---------- Escalation ---------- */
function v3Esc(level,k){V().esc.unshift({d:V().day,level,k,state:"open"});v3Audit("a_esc",{level})}
function v3Callback(why){const v=V();bot(T("esc_share_q"));
  const go=share=>{v.esc.unshift({d:v.day,level:3,k:"callback",state:"requested",share});v3Audit(share?"a_share_nurse":"a_callback");
    bot(`<div class="x-card"><span class="x-eyebrow">${T("ph_nurse")}</span><p>${T("esc_cb_msg")}</p><p class="x-note">${T(share?"esc_cb_shared":"esc_cb_notshared")}</p></div>`);v3End()};
  replies([[T("esc_share_yes"),()=>go(true),{cls:"go"}],[T("esc_share_no"),()=>go(false)],[T("cancel"),v3End]])}

/* ---------- Preventive care gaps ---------- */
function v3GapsChat(){v3Enter();const v=V();const g=v.gaps.filter(x=>x.status==="due").sort((a,b)=>a.due-b.due)[0];
  if(!g){bot(T("gp_none"));v3End();return}v3GapCard(g)}
function v3GapCard(g){v3Enter();bot(`<div class="x-card"><span class="x-eyebrow">${T(g.due<=V().day?"gp_overdue":"gp_due")}</span><b>${T("gap_"+g.id)}</b><p>${T("gap_"+g.id+"_why")}</p><p class="x-note">${T("gp_basis")}: ${T("gap_"+g.id+"_src")}. ${T("gp_reward")}</p></div>`);
  replies([[T("gp_book"),()=>v3Book(g),{cls:"go"}],[T("gp_done"),()=>v3GapDone(g)],[T("gp_later"),()=>{g.status="snoozed";g.snooze=V().day+14;bot(T("gp_later_msg"));v3End()}],[T("gp_all"),()=>v3Go("prevention"),{silent:true}]])}
function v3Book(g){const sl=vSlots().map((d,i)=>{const x=new Date(d);x.setHours([9,11,15][i],[10,40,15][i]);return x});bot(T("gp_slots"));
  replies([...sl.map((d,i)=>[vSlotFmt(d),()=>{const real=V().gaps.find(x=>x.id===g.id);if(real){real.status="booked";real.appt=V().day+i+1;real.at=d.getTime()}
      if(S.record&&S.record.appointments)S.record.appointments.unshift({resourceType:"Appointment",id:"ap-elia-"+Date.now(),meta:{source:"elia"},_org:"elia",status:"booked",start:d.toISOString().slice(0,19),description:real?T("gap_"+g.id):T("gap_bpv")});
      v3Audit("a_book");bot(`<div class="x-card"><span class="x-eyebrow">${T("ph_sched")}</span><b>${real?T("gap_"+g.id):T("gap_bpv")}</b><p>${vSlotFmt(d)}</p><p class="x-note">${T("gp_booked_note")}</p></div>`);addUpdate(()=>T("up_booked",{what:real?T("gap_"+g.id):T("gap_bpv")}));flashHQ();v3End()}]),[T("cancel"),v3End]])}
function v3GapDone(g){bot(T("gp_done_q"));const fin=k=>{g.status="done";g.self=true;g.doneOn=V().day;const got=v3Pts("p_gap_self",10,"self");bot(T("gp_done_msg")+(got?` ${vPts(got)}`:""));v3End()};
  replies([[T("gp_w1"),()=>fin(1)],[T("gp_w2"),()=>fin(2)],[T("gp_w3"),()=>{bot(T("gp_old_msg"));v3GapCard(g)}]])}

/* ---------- Weekly review (behaviour loop) ---------- */
function v3Week(){v3Enter();const v=V();const a=v.steps.slice(-7),b=v.steps.slice(-14,-7);const avg=x=>x.length?x.reduce((s,y)=>s+y.n,0)/x.length:0;const A=avg(a),B=avg(b);const hit=a.filter(x=>x.n>=v.target).length;
  const adh=Math.round(v.meds.reduce((s,m)=>s+vAdh(m,7),0)/v.meds.length);const pts=v.pts.ledger.filter(x=>x.d>v.day-7&&x.pts>0).reduce((s,x)=>s+x.pts,0);
  bot(`<div class="x-card"><span class="x-eyebrow">${T("wk_eyebrow")}</span><ul class="x-lines"><li><span>${T("wk_steps")}</span><b>${vNum(A)}</b></li><li><span>${T("wk_days",{t:vNum(v.target)})}</span><b>${hit}/7</b></li><li><span>${T("wk_meds")}</span><b>${adh}%</b></li><li><span>${T("wk_pts")}</span><b>${pts}</b></li></ul><p>${T(A>=B?"wk_up":"wk_down",{d:vNum(Math.abs(A-B))})}</p><p class="x-note">${T("wk_nostreak")}</p></div>`);
  bot(T(hit>=5?"wk_q_hard":hit<=2?"wk_q_easy":"wk_q_keep"));
  const set=f=>{v.target=Math.max(2000,Math.round(v.target*f/100)*100);bot(T("wk_set",{t:vNum(v.target)}));addUpdate(()=>T("up_target",{t:vNum(v.target)}));flashHQ();v3End()};
  replies([[T("wk_keep"),()=>{bot(T("wk_keep_msg"));v3End()}],[T("wk_easier"),()=>set(0.9)],[T("wk_harder"),()=>set(1.1)]])}

/* ---------- Population challenges (member side) ---------- */
const V3G=[["muscat","Muscat","مسقط",41200],["dhofar","Dhofar","ظفار",12800],["nbatinah","Al Batinah North","شمال الباطنة",22100],["sbatinah","Al Batinah South","جنوب الباطنة",13900],["dakhiliyah","Ad Dakhiliyah","الداخلية",14700],["nsharqiyah","Ash Sharqiyah North","شمال الشرقية",8200],["ssharqiyah","Ash Sharqiyah South","جنوب الشرقية",9100],["dhahirah","Ad Dhahirah","الظاهرة",6400],["buraimi","Al Buraimi","البريمي",3900],["musandam","Musandam","مسندم",1450],["wusta","Al Wusta","الوسطى",1280]];
const gName=g=>S.lang==="ar"?g[2]:g[1];
const pName=p=>p.name[S.lang]||p.name.en;
function v3PopInvite(p){v3Enter();const v=V();p=p||v.pop.find(x=>x.state==="invited");if(!p){bot(T("pop_none"));v3End();return}
  if(!v.consent.sponsor){sys(T("pop_blocked"));v3End();return}
  bot(`<div class="x-card x-agent"><span class="x-eyebrow">${T("pop_from")}</span><b>${esc(pName(p))}</b><p>${T("pop_invite")}</p><div class="x-kv"><span>${T("k_team")}</span><span>${gName(V3G.find(g=>g[0]===v.gov))}</span><span>${T("k_len")}</span><span>${T("n_days",{n:p.days})}</span><span>${T("k_shared")}</span><span>${T("pop_shared")}</span><span>${T("k_notshared")}</span><span>${T("pop_never")}</span></div></div>`);
  replies([[T("pop_join"),()=>{p.state="joined";p.start=v.day;v3Audit("a_pop",{name:pName(p)});bot(T("pop_joined",{team:gName(V3G.find(g=>g[0]===v.gov))}));replies([[T("pop_board"),()=>v3Go("circle"),{silent:true}],[T("next_day"),()=>v3NextDay(1),{silent:true}],[T("m_back"),v3End,{silent:true}]])},{cls:"go",react:"achievement"}],
    [T("decline"),()=>{p.state="declined";bot(T("pop_declined"));v3End()}],[T("pop_stop"),()=>{v.consent.sponsor=false;p.state="declined";v3Audit("a_consent");bot(T("pop_stopped"));v3End()}]])}
/* governorate standings for a population challenge: average % of personal goal, small groups hidden */
function vPopBoard(p){const v=V();const day=Math.max(1,v.day-p.start+1);return V3G.map(g=>{const r=vRng(p.id+"|"+g[0]);const part=Math.round(g[3]*(0.18+r()*0.2));const sc=Math.round(62+r()*30+Math.min(6,day*0.4)*(r()-0.3));return{g,part,sc:Math.max(40,Math.min(118,sc)),sup:part<50||g[3]<1400}}).sort((a,b)=>(a.sup-b.sup)||(b.sc-a.sc))}

/* ---------- Day simulation ---------- */
function v3NextDay(n=1){v3Enter();const v=V();const events=[];let y;
  for(let i=0;i<n;i++){const r=vRng("d|"+v.day+"|"+v.base);const boost=v.chal.some(c=>c.state==="active")?1.08:1;const easy=v.signals.some(s=>s.easy&&s.d===v.day)?0.7:1;
    y={d:v.day,n:Math.round(v.base*(0.78+r()*0.52)*boost*easy)};v.steps.push(y);const last=i===n-1;const ev=[];
    v.meds.forEach(m=>{if(!m.log[v.day]||m.log[v.day].length<m.times){const l=m.log[v.day]||(m.log[v.day]=[]);while(l.length<m.times){l.push(r()>0.14);m.left=Math.max(0,m.left-1)}}});
    if(y.n>=v.target)v3Pts("p_steps",10,vWear()?"wear":"phone");
    v.chal.filter(c=>c.state==="active").forEach(c=>v3ChalTick(c,ev));
    v.pop.filter(p=>p.state==="joined").forEach(p=>{p.mine+=y.n});
    v.day++;
    v.circles.forEach(c=>c.members.forEach(m=>{if(m.state==="invited"&&!m.blocked){m.state="joined";ev.push(T("c_joined",{who:nm(cm(m.id))}))}}));
    v.gaps.forEach(g=>{if(g.status==="booked"&&v.day>=g.appt){g.status="done";g.self=false;g.doneOn=v.day;const got=v3Pts("p_gap",50,"clinic");ev.push(T("ev_gap",{what:T("gap_"+g.id)})+` ${vPts(got)}`)}if(g.status==="snoozed"&&v.day>=g.snooze)g.status="due"});
    v.signals.forEach(s=>{if((s.state==="adjusted"||s.state==="watch")&&v.day>s.d){s.state="resolved";ev.push(T("ev_signal"))}});
    v.meds.forEach(m=>{if(m.refill!=null&&v.day>m.refill){m.left+=30;m.refill=null;ev.push(T("ev_refill",{med:T("med_"+m.id)}))}});
    if(last)events.push(...ev);else ev.filter(e=>/x-pts/.test(e)).forEach(e=>events.push(e))}
  sys(T("sim_day",{when:vFmt(vDate())}));
  const ok=y.n>=v.target;
  bot(`<div class="x-card"><span class="x-eyebrow">${T("mu_eyebrow")}</span><ul class="x-lines"><li><span>${T("mu_steps",{n:vNum(y.n)})} ${vVer(vWear()?"wear":"phone")}</span>${ok?vPts(10):""}</li>${events.map(e=>`<li><span>${e}</span></li>`).join("")}</ul><p class="x-note">${T(ok?"mu_hit":"mu_miss",{t:vNum(v.target)})}</p></div>`);
  renderHQ();flashHQ();
  const due=v.gaps.find(g=>g.status==="due"&&g.due<=v.day&&!g.nudged);const low=v.meds.find(m=>m.left<=5&&m.refill==null&&!m.nudged);
  if(low){low.nudged=true;bot(T("md_low",{n:low.left,med:T("med_"+low.id)}));replies([[T("md_refill"),()=>v3Refill(low),{cls:"go"}],[T("later_btn"),v3End]]);return}
  if(due&&v.day%2===0){due.nudged=true;v3GapCard(due);return}
  replies([[T("next_day"),()=>v3NextDay(1),{silent:true}],[T("next_week"),()=>v3NextDay(7),{silent:true}],[T("c_board"),()=>v3Go("circle"),{silent:true}],[T("m_back"),v3End,{silent:true}]])}

/* ---------- Free-text routing for the new flows ---------- */
function v3Route(x){const v=V();
  if(v.await&&v.await.k==="relay"){v3RelayDraft(v.await.id,x.trim().slice(0,280));return true}
  if(v.await&&v.await.k==="reading")return v3Reading(x);
  if(S.await||S.sim)return false;
  if((/\b(bp|blood pressure|presi[oó]n)\b|ضغط/i.test(x)&&V3_BP.test(x))||V3_GLU.test(x)){v3Enter();return v3Reading(x)}
  if(/\b(circle|c[ií]rculo)\b|دائرت|دائرة/i.test(x)){v3CircleHome();return true}
  if(/\b(challenge|reto|desaf[ií]o)\b|تحد/i.test(x)){const c=v.circles[0];c?v3ChalNew(c):v3CircleHome();return true}
  if(/\b(rewards?|points?|puntos|recompensas?)\b|نقاط|مكاف/i.test(x)){bot(T("rw_bal",{n:v.pts.bal}));v3Go("rewards");return true}
  if(/\b(screening|vaccine|check-?up|care gaps?|vacuna)\b|فحص|لقاح|تطعيم/i.test(x)){v3GapsChat();return true}
  if(/\b(medication|medicine|refill|pills?|medicamento)\b|دواء|أدوية/i.test(x)){v3MedsChat();return true}
  return false}
