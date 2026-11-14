/* ===== ELIA v3: HQ tabs ===== */
const xH=(k)=>`<div><h2>${T(k+"_title")}</h2></div><p class="hq-sub">${T(k+"_sub")}</p>`;
const xTog=(act,a,on,dis)=>`<button class="x-tog" role="switch" aria-checked="${on?"true":"false"}" data-x="${act}" data-a="${a}"${dis?" disabled":""} aria-label="${T("toggle")}"></button>`;
function xSpark(vals,lo,hi){if(vals.length<2)return"";const w=300,h=46,mn=Math.min(...vals,lo??Infinity)*0.94,mx=Math.max(...vals,hi??-Infinity)*1.04,sx=i=>4+i*(w-8)/(vals.length-1),sy=v=>h-4-(v-mn)/(mx-mn||1)*(h-8);
  return`<svg class="x-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${hi!=null?`<line x1="0" x2="${w}" y1="${sy(hi)}" y2="${sy(hi)}" stroke="var(--warn)" stroke-dasharray="3 4" stroke-width="1"/>`:""}<polyline fill="none" stroke="var(--teal)" stroke-width="2" stroke-linejoin="round" points="${vals.map((v,i)=>`${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ")}"/>${vals.map((v,i)=>`<circle cx="${sx(i).toFixed(1)}" cy="${sy(v).toFixed(1)}" r="2.4" fill="${hi!=null&&v>=hi?"var(--warn)":"var(--teal)"}"/>`).join("")}</svg>`}
const xPill=(k,cls)=>`<span class="pill ${cls}">${T(k)}</span>`;
const xDay=d=>d===V().day?T("today"):vDay(d);

/* ----- My Circle ----- */
function hqCircle(){const v=V();let h=xH("ci");
  if(!v.consent.circle)return h+`<div class="empty">${T("c_off")}<br><button class="x-btn" data-goto="privacy" style="margin-top:10px">${T("open_privacy")}</button></div>`;
  if(!v.circles.length)h+=`<div class="empty">${T("ci_empty")}<br><button class="x-btn pri" data-x="chat" data-a="circle" style="margin-top:10px">${T("ci_start")}</button></div>`;
  v.circles.forEach(c=>{h+=`<div class="panel"><div class="x-h3"><h3>${T("c_"+c.kind)} · ${T("ci_members",{n:vJoined(c).length+1})}</h3><span class="x-row"><button class="x-btn pri" data-x="chat" data-a="chal">${T("ch_new")}</button><button class="x-btn" data-x="chat" data-a="relay">${T("r_send")}</button><button class="x-btn" data-x="chat" data-a="coord">${T("co_find")}</button></span></div>
    <ul class="x-list"><li><span class="x-av me">${esc((S.name||T("you")).charAt(0).toUpperCase())}</span><span class="x-grow"><b>${esc(S.name||T("you"))}</b><small>${T("ci_owner")}</small></span></li>
    ${c.members.map(m=>{const p=cm(m.id);return`<li><span class="x-av">${esc(nm(p).charAt(0))}</span><span class="x-grow"><b>${esc(nm(p))}</b><small>${T("rel_"+p.rel)} · ${T("ci_"+(m.blocked?"blocked":m.state))}${m.muted?" · "+T("ci_muted"):""}</small></span>
      ${m.blocked?"":`<button class="x-btn" data-x="mute" data-a="${c.id}|${m.id}">${T(m.muted?"ci_unmute":"ci_mute")}</button>`}<button class="x-btn danger" data-x="remove" data-a="${c.id}|${m.id}">${T("ci_remove")}</button><button class="x-btn danger" data-x="block" data-a="${c.id}|${m.id}">${T(m.blocked?"ci_unblock":"ci_block")}</button></li>`}).join("")}</ul>
    <div class="x-sw"><div>${T("ci_share_steps")}<small>${T("ci_share_note")}</small></div>${xTog("share",c.id,c.share==="steps")}</div>
    <div class="x-row"><button class="x-btn danger" data-x="leave" data-a="${c.id}">${T("ci_leave")}</button><span class="x-note">${T("ci_safe")}</span></div></div>`});
  const act=v.chal.filter(c=>c.state!=="declined");
  if(act.length)h+=`<div class="grid2">${act.map(ch=>{const done=ch.state==="done",n=ch.data.me.length;
    let b=`<div class="panel"><div class="x-h3"><h3>${T("tpl_"+ch.tpl)}</h3>${pill(done?"st_completed":"st_active",done?"p-good":"p-info")}</div><span class="x-note">${T("mode_"+ch.mode)} · ${T("ci_day",{d:Math.min(n,ch.days),n:ch.days})} · ${T("ver_"+V3T[ch.tpl].ver)}</span>`;
    if(ch.mode==="team"){const t_=vTeam(ch);b+=`<div class="x-row"><span class="x-big">${t_}%</span><span class="x-unit">${T("ci_team_goal")}</span></div><div class="x-bar"><i style="width:${t_}%"></i></div><ul class="x-list">${Object.keys(ch.data).map(id=>`<li><span class="x-av${id==="me"?" me":""}">${esc((id==="me"?(S.name||T("you")):nm(cm(id))).charAt(0).toUpperCase())}</span><span class="x-grow">${id==="me"?T("you"):esc(nm(cm(id)))}</span><span class="x-note">${T("ci_days_in",{n:(ch.data[id]||[]).filter(x=>x>=80).length})}</span></li>`).join("")}</ul><span class="x-note">${T("ci_team_note")}</span>`}
    else{const B=vBoard(ch);b+=`<ul class="x-list">${B.map((r,i)=>`<li><span class="x-rank">${i+1}</span><span class="x-av${r.id==="me"?" me":""}">${esc(r.name.charAt(0).toUpperCase())}</span><span class="x-grow"><b>${esc(r.name)}</b></span><div class="x-bar" style="max-width:110px"><i style="width:${Math.min(100,r.sc/1.3)}%"></i></div><b style="min-width:3.2em;text-align:end">${r.sc}%</b></li>`).join("")}</ul><span class="x-note">${T("ci_rank_note")}</span>`}
    if(!done)b+=`<div class="x-row"><button class="x-btn danger" data-x="quit" data-a="${ch.id}">${T("ci_quit")}</button></div>`;
    else if(ch.got)b+=`<div class="x-row">${vPts(ch.got)}</div>`;return b+"</div>"}).join("")}</div>`;
  if(v.plans.length)h+=`<div class="panel"><h3>${T("ci_plans")}</h3><ul class="x-list">${v.plans.map(p=>`<li><span class="x-grow">${T("ci_walk",{name:esc(nm(cm(p.who)))})}<small>${vSlotFmt(new Date(p.at))} · ${T("ci_agents")}</small></span></li>`).join("")}</ul></div>`;
  /* population challenges */
  h+=`<div><h2 style="font-size:19px">${T("pop_title")}</h2></div><p class="hq-sub">${T("pop_sub")}</p>`;
  v.pop.forEach(p=>{if(p.state==="joined"){const B=vPopBoard(p),mine=B.findIndex(r=>r.g[0]===v.gov);const show=B.filter((r,i)=>!r.sup&&(i<5||i===mine));
      h+=`<div class="panel"><div class="x-h3"><h3>${esc(pName(p))}</h3>${pill("st_active","p-info")}</div><span class="x-note">${T("pop_mine",{n:vNum(p.mine)})} · ${T("ci_day",{d:Math.min(p.days,Math.max(1,v.day-p.start+1)),n:p.days})}</span>
        <ul class="x-list">${show.map(r=>{const i=B.indexOf(r);return`<li><span class="x-rank">${i+1}</span><span class="x-grow"><b>${gName(r.g)}</b>${r.g[0]===v.gov?` <span class="x-ver v">${T("pop_yours")}</span>`:""}<small>${T("pop_part",{n:vNum(r.part)})}</small></span><div class="x-bar" style="max-width:130px"><i style="width:${Math.min(100,r.sc/1.2)}%"></i></div><b style="min-width:3.2em;text-align:end">${r.sc}%</b></li>`}).join("")}</ul>
        <span class="x-note">${T("pop_note",{n:B.filter(r=>r.sup).length})}</span><div class="x-row"><button class="x-btn danger" data-x="popquit" data-a="${p.id}">${T("pop_leave")}</button></div></div>`}
    else h+=`<div class="panel"><div class="x-h3"><h3>${esc(pName(p))}</h3>${pill(p.state==="declined"?"st_paused":"st_proposed",p.state==="declined"?"p-warn":"p-mute")}</div><span class="x-note">${T("pop_from")} · ${T("n_days",{n:p.days})}</span><div class="x-row"><button class="x-btn pri" data-x="chat" data-a="pop|${p.id}">${T("pop_view")}</button></div></div>`});
  if(v.relay.length)h+=`<div class="panel"><h3>${T("ci_relay")}</h3><ul class="x-list">${v.relay.slice(0,8).map(r=>`<li><span class="x-av">${esc(nm(cm(r.who)).charAt(0))}</span><span class="x-grow">“${esc(r.text)}”<small>${T(r.dir==="out"?"ci_to":"ci_from",{name:esc(nm(cm(r.who)))})} · ${xDay(r.d)}</small></span>${r.dir==="in"?`<button class="x-btn danger" data-x="report" data-a="${r.id}">${T(r.reported?"ci_reported":"ci_report")}</button>`:""}</li>`).join("")}</ul><span class="x-note">${T("ci_relay_note")}</span></div>`;
  return h}

/* ----- Rewards ----- */
function hqRewards(){const v=V();const today=v.pts.ledger.filter(x=>x.d===v.day&&x.pts>0&&x.ver!=="clinic"&&x.ver!=="prog").reduce((a,x)=>a+x.pts,0);
  let h=xH("rw")+`<div class="grid2"><div class="panel"><h3>${T("rw_balance")}</h3><div class="x-row"><span class="x-big">${vNum(v.pts.bal)}</span><span class="x-unit">${T("pts")}</span></div><span class="x-note">${T("rw_cap",{n:today,cap:V3CAP})}</span><div class="x-bar" style="flex:none"><i style="width:${Math.min(100,today/V3CAP*100)}%"></i></div><span class="x-note">${T("rw_nostreak")}</span></div>
    <div class="panel"><h3>${T("rw_how")}</h3><ul class="x-lines">${[["p_gap",50,"clinic"],["p_chal",40,"wear"],["p_steps",10,"wear"],["p_meal",8,"photo"],["p_gap_self",10,"self"],["p_med",2,"self"]].map(([k,n,ver])=>`<li><span>${T(k)} ${vVer(ver)}</span>${vPts(n)}</li>`).join("")}</ul><span class="x-note">${T("rw_how_note")}</span></div></div>`;
  h+=`<div class="panel"><div class="x-h3"><h3>${T("rw_catalog")}</h3><span class="ph">${T("ph_sponsor")}</span></div><ul class="x-list">${V3R.map(r=>`<li><span class="x-grow"><b>${T("rwd_"+r.id)}</b><small>${T("rwd_"+r.id+"_d")}</small></span><span class="x-pts neg">${r.cost} ${T("pts")}</span><button class="x-btn pri" data-x="redeem" data-a="${r.id}"${v.pts.bal<r.cost?" disabled":""}>${T("rw_redeem")}</button></li>`).join("")}</ul></div>`;
  if(v.redeemed.length)h+=`<div class="panel"><h3>${T("rw_mine")}</h3><ul class="x-list">${v.redeemed.map(r=>`<li><span class="x-grow"><b>${T("rwd_"+r.id)}</b><small>${xDay(r.d)}</small></span><span class="x-code">${r.code}</span></li>`).join("")}</ul></div>`;
  h+=`<div class="panel"><h3>${T("rw_ledger")}</h3><div class="x-scroll"><table class="x-table"><thead><tr><th>${T("col_date")}</th><th>${T("col_what")}</th><th>${T("col_proof")}</th><th class="n">${T("pts")}</th></tr></thead><tbody>${v.pts.ledger.map((x,i)=>[x,i]).sort((p,q)=>q[0].d-p[0].d||p[1]-q[1]).map(p=>p[0]).slice(0,14).map(x=>`<tr><td>${xDay(x.d)}</td><td>${x.k.startsWith("rwd_")?T("rw_redeemed")+": "+T(x.k):T(x.k)}</td><td>${x.ver?vVer(x.ver):""}</td><td class="n">${vPts(x.pts)}</td></tr>`).join("")}</tbody></table></div></div>`;
  return h}

/* ----- Prevention ----- */
function hqPrevention(){const v=V();const st=g=>g.status==="done"?xPill("gp_st_done","p-good"):g.status==="booked"?xPill("gp_st_booked","p-info"):g.status==="ok"?xPill("gp_st_ok","p-good"):g.status==="snoozed"?xPill("gp_st_snoozed","p-mute"):xPill(g.due<=v.day?"gp_overdue":"gp_due",g.due<=v.day?"p-warn":"p-mute");
  const open=v.gaps.filter(g=>g.status==="due").length,done=v.gaps.filter(g=>g.status==="done"||g.status==="ok").length;
  let h=xH("pv")+`<div class="x-tiles"><div class="x-tile"><b>${open}</b><span>${T("pv_open")}</span></div><div class="x-tile"><b>${v.gaps.filter(g=>g.status==="booked").length}</b><span>${T("pv_booked")}</span></div><div class="x-tile"><b>${done}/${v.gaps.length}</b><span>${T("pv_done")}</span></div></div>`;
  h+=`<div class="panel"><ul class="x-list">${v.gaps.map(g=>`<li><span class="x-grow"><b>${T("gap_"+g.id)}</b> ${st(g)}<small>${T("gap_"+g.id+"_why")}</small><small>${T("gp_basis")}: ${T("gap_"+g.id+"_src")}${g.status==="booked"?` · ${vSlotFmt(new Date(g.at))}`:""}${g.status==="done"?` · ${vVer(g.self?"self":"clinic")}`:""}</small></span>
    ${g.status==="due"||g.status==="snoozed"?`<button class="x-btn pri" data-x="chat" data-a="gap|${g.id}">${T("gp_book")}</button><button class="x-btn" data-x="gapdone" data-a="${g.id}">${T("gp_done")}</button>`:""}</li>`).join("")}</ul></div>
  <div class="min-note">${T("pv_note")}</div>`;return h}

/* ----- Medication and home readings ----- */
function hqMeds(){const v=V();let h=xH("md");
  h+=`<div class="grid2">${v.meds.map(m=>{const a=vAdh(m);return`<div class="panel"><div class="x-h3"><h3>${T("med_"+m.id)} ${m.dose}</h3>${m.refill!=null?xPill("md_refill_sent","p-info"):m.left<=7?xPill("md_low_pill","p-warn"):""}</div><span class="x-note">${T("md_sched_"+m.times)}</span>
    <div class="x-row"><span class="x-big">${a}%</span><span class="x-unit">${T("md_adh")}</span></div><div class="x-bar${a<80?" warn":""}" style="flex:none"><i style="width:${a}%"></i></div>
    <div class="x-row sp"><span class="x-note">${T("md_left",{n:m.left})}</span><span class="x-row"><button class="x-btn" data-x="chat" data-a="meds">${T("md_log")}</button><button class="x-btn pri" data-x="refill" data-a="${m.id}"${m.refill!=null?" disabled":""}>${T("md_refill")}</button></span></div></div>`}).join("")}</div>`;
  const bp=v.bp.slice(-10),gl=v.glu.slice(-10),lb=bp[bp.length-1],lg=gl[gl.length-1];
  h+=`<div class="grid2"><div class="panel"><h3>${T("rd_bp")}</h3>${lb?`<div class="x-row"><span class="x-big">${lb.sys}/${lb.dia}</span><span class="x-unit">mmHg · ${xDay(lb.d)}</span>${lb.sys>=180||lb.dia>=120?xPill("rd_p_urgent","p-bad"):lb.sys>=140||lb.dia>=90?xPill("rd_p_high","p-warn"):xPill("rd_p_ok","p-good")}</div>`:""}${xSpark(bp.map(r=>r.sys),null,140)}<span class="x-note">${T("rd_bp_note")}</span>
      <form class="x-form" data-xf="bp"><input name="v" inputmode="numeric" placeholder="128/82" aria-label="${T("rd_bp")}"><button class="x-btn pri">${T("rd_add")}</button></form></div>
    <div class="panel"><h3>${T("rd_glu")}</h3>${lg?`<div class="x-row"><span class="x-big">${lg.v}</span><span class="x-unit">mmol/L · ${xDay(lg.d)}</span>${lg.v<3.9||lg.v>=13.9?xPill("rd_p_urgent","p-bad"):lg.v>10?xPill("rd_p_high","p-warn"):xPill("rd_p_ok","p-good")}</div>`:""}${xSpark(gl.map(r=>r.v),null,10)}<span class="x-note">${T("rd_glu_note")}</span>
      <form class="x-form" data-xf="glu"><input name="v" inputmode="decimal" placeholder="6.4" aria-label="${T("rd_glu")}"><button class="x-btn pri">${T("rd_add")}</button></form></div></div>`;
  h+=`<div class="panel"><div class="x-h3"><h3>${T("esc_title")}</h3><button class="x-btn" data-x="chat" data-a="callback">${T("esc_nurse")}</button></div>${v.esc.length?`<ul class="x-list">${v.esc.slice(0,8).map(e=>`<li><span class="x-grow"><b>${T("esc_k_"+e.k)}</b><small>${xDay(e.d)} · ${T("esc_l"+e.level)}</small></span>${xPill(e.level>=4?"rd_p_urgent":"esc_logged",e.level>=4?"p-bad":"p-mute")}</li>`).join("")}</ul>`:`<span class="x-note">${T("esc_none")}</span>`}
    <span class="x-note">${T("esc_ladder")}</span></div><div class="min-note">${T("md_note")}</div>`;return h}

/* ----- Privacy and consent ----- */
function hqPrivacy(){const v=V();const C=["coach","wear","records","circle","sponsor","research"];
  let h=xH("pr")+`<div class="panel"><h3>${T("pr_consents")}</h3>${C.map(k=>`<div class="x-sw"><div><b>${T("cs_"+k)}</b><small>${T("cs_"+k+"_d")}</small></div>${xTog("consent",k,v.consent[k])}</div>`).join("")}</div>`;
  h+=`<div class="grid2"><div class="panel"><h3>${T("pr_regional")}</h3><div class="x-sw"><div><b>${T("pr_ramadan")}</b><small>${T("pr_ramadan_d")}</small></div>${xTog("ramadan","1",v.ramadan)}</div><div class="x-sw"><div><b>${T("pr_quiet")}</b><small>${T("pr_quiet_d")}</small></div>${xTog("quiet","1",v.quiet)}</div><span class="x-note">${T("pr_hijri")}: ${(()=>{try{return new Intl.DateTimeFormat((S.lang==="ar"?"ar":"en")+"-u-ca-islamic-umalqura",{day:"numeric",month:"long",year:"numeric"}).format(vDate())}catch(e){return"–"}})()}</span></div>
    <div class="panel"><h3>${T("pr_rights")}</h3><div class="x-row"><button class="x-btn pri" data-x="export">${T("pr_export")}</button><button class="x-btn danger" data-x="delete">${T(v.del?"pr_delete_sent":"pr_delete")}</button></div>${v.del?`<span class="x-note">${T("pr_delete_note")}</span>`:""}<span class="x-note">${T("pr_ai")}</span><span class="x-note">${T("pr_law")}</span></div></div>`;
  h+=`<div class="panel"><h3>${T("pr_audit")}</h3><ul class="x-list">${v.audit.slice(0,12).map(a=>`<li><span class="x-grow">${T(a.k,a.v||{})}</span><span class="x-note">${xDay(a.d)}</span></li>`).join("")}</ul><span class="x-note">${T("pr_audit_note")}</span></div>`;return h}

window.V3TABS={circle:hqCircle,rewards:hqRewards,prevention:hqPrevention,meds:hqMeds,privacy:hqPrivacy};

/* Overview: signals, points and what is due next */
function v3AfterHQ(){if(S.hqTab!=="overview"||!S.name)return;const v=V();const due=v.gaps.filter(g=>g.status==="due").sort((a,b)=>a.due-b.due)[0];const ch=v.chal.find(c=>c.state==="active");
  const sg=v.signals.slice(0,3).map(s=>`<div class="x-sig ${s.state==="resolved"?"ok":""}"><b>${T("sgt_"+s.kind)}</b><span class="x-note">${xDay(s.d)} · ${T("sgs_"+s.state)}</span></div>`).join("")||`<span class="x-note">${T("ov_nosig")}</span>`;
  const d=document.createElement("div");d.className="grid2";d.innerHTML=`<div class="panel"><div class="x-h3"><h3>${T("ov_signals")}</h3><button class="x-btn" data-x="chat" data-a="signal">${T("ov_sim_signal")}</button></div>${sg}<span class="x-note">${T("ov_sig_note")}</span></div>
    <div class="panel"><h3>${T("ov_next")}</h3><ul class="x-list">
      <li><span class="x-grow"><b>${vNum(v.pts.bal)} ${T("pts")}</b><small>${T("ov_pts_note")}</small></span><button class="x-btn" data-goto="rewards">${T("open")}</button></li>
      ${due?`<li><span class="x-grow"><b>${T("gap_"+due.id)}</b><small>${T(due.due<=v.day?"gp_overdue":"gp_due")}</small></span><button class="x-btn" data-goto="prevention">${T("open")}</button></li>`:""}
      ${ch?`<li><span class="x-grow"><b>${T("tpl_"+ch.tpl)}</b><small>${T("ci_day",{d:Math.min(ch.data.me.length,ch.days),n:ch.days})}</small></span><button class="x-btn" data-goto="circle">${T("open")}</button></li>`:`<li><span class="x-grow"><b>${T("ci_title")}</b><small>${T("ov_circle_note")}</small></span><button class="x-btn" data-goto="circle">${T("open")}</button></li>`}</ul></div>`;
  hqMain.appendChild(d)}

/* HQ actions */
function v3Find(a){const[cid,mid]=a.split("|");const c=V().circles.find(x=>x.id===cid);return{c,m:c&&c.members.find(x=>x.id===mid)}}
function v3Act(x,a,el){const v=V();
  if(x==="chat"){const[k,id]=(a||"").split("|");const c=v.circles[0];setView("chat");
    ({circle:v3CircleHome,chal:()=>c?v3ChalNew(c):v3CircleHome(),relay:()=>c?v3RelayPick(c):v3CircleHome(),coord:()=>c?v3CoordPick(c):v3CircleHome(),meds:v3MedsChat,signal:()=>v3Signal(),callback:()=>{v3Enter();v3Callback("hq")},
      gap:()=>v3GapCard(v.gaps.find(g=>g.id===id)),pop:()=>v3PopInvite(v.pop.find(p=>p.id===id))}[k]||v3Menu)();return}
  if(x==="mute"){const{m}=v3Find(a);if(m)m.muted=!m.muted}
  else if(x==="remove"){const{c,m}=v3Find(a);if(c&&m){c.members=c.members.filter(y=>y!==m);v.chal.forEach(ch=>{if(ch.circle===c.id){delete ch.data[m.id];delete ch.acc[m.id]}});v3Audit("a_remove",{name:nm(cm(m.id))})}}
  else if(x==="block"){const{c,m}=v3Find(a);if(m){m.blocked=!m.blocked;if(m.blocked){m.state="removed";v.chal.forEach(ch=>{if(ch.circle===c.id){delete ch.data[m.id];delete ch.acc[m.id]}})}else m.state="invited";v3Audit(m.blocked?"a_block":"a_unblock",{name:nm(cm(m.id))})}}
  else if(x==="share"){const c=v.circles.find(y=>y.id===a);if(c){c.share=c.share==="steps"?"prog":"steps";v3Audit("a_share",{what:T(c.share==="steps"?"c_share_steps":"c_share_prog")})}}
  else if(x==="leave"){if(el.dataset.sure){v.circles=v.circles.filter(c=>c.id!==a);v.chal=v.chal.filter(c=>c.circle!==a);v3Audit("a_leave")}else{el.dataset.sure=1;el.textContent=T("sure");return}}
  else if(x==="quit"){const ch=v.chal.find(c=>c.id===a);if(ch){ch.state="declined";v3Audit("a_quit")}}
  else if(x==="popquit"){const p=v.pop.find(y=>y.id===a);if(p){p.state="declined";p.mine=0}}
  else if(x==="report"){const r=v.relay.find(y=>y.id===a);if(r&&!r.reported){r.reported=true;v3Audit("a_report",{name:nm(cm(r.who))})}}
  else if(x==="redeem"){const r=V3R.find(y=>y.id===a);if(r&&v.pts.bal>=r.cost){v.pts.bal-=r.cost;v.pts.ledger.unshift({d:v.day,k:"rwd_"+r.id,pts:-r.cost,ver:""});const rr=vRng(r.id+Date.now());v.redeemed.unshift({id:r.id,d:v.day,code:"ELIA-"+Array.from({length:6},()=>"ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(rr()*31)]).join("")});v3Audit("a_redeem",{what:T("rwd_"+r.id)})}}
  else if(x==="gapdone"){const g=v.gaps.find(y=>y.id===a);if(g){g.status="done";g.self=true;g.doneOn=v.day;v3Pts("p_gap_self",10,"self")}}
  else if(x==="refill"){const m=v.meds.find(y=>y.id===a);if(m){m.refill=v.day;v3Audit("a_refill",{med:T("med_"+m.id)})}}
  else if(x==="consent"){v.consent[a]=!v.consent[a];v3Audit("a_consent_set",{what:T("cs_"+a),state:T(v.consent[a]?"on":"off")})}
  else if(x==="ramadan"){v.ramadan=!v.ramadan}else if(x==="quiet"){v.quiet=!v.quiet}
  else if(x==="delete"){if(v.del)return;if(el.dataset.sure){v.del=true;v3Audit("a_delete")}else{el.dataset.sure=1;el.textContent=T("sure");return}}
  else if(x==="export"){const data={exported:new Date().toISOString(),profile:{name:S.name,goal:S.goal,facts:Object.fromEntries(Object.entries(S.facts||{}).map(([k,f])=>{try{return[k,fv(f)]}catch(e){return[k,""]}}))},plan:S.plan,consents:v.consent,points:v.pts,care_gaps:v.gaps,medications:v.meds,readings:{blood_pressure:v.bp,glucose:v.glu},circles:v.circles,challenges:v.chal,relayed_messages:v.relay,escalations:v.esc,audit:v.audit};
    try{const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const l=document.createElement("a");l.href=u;l.download="elia-my-data.json";document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}catch(e){}v3Audit("a_export");}
  renderHQ()}
hqMain.addEventListener("click",e=>{const b=e.target.closest("[data-x]");if(!b||b.closest("form"))return;e.preventDefault();v3Act(b.dataset.x,b.dataset.a,b)});
hqMain.addEventListener("submit",e=>{const f=e.target.closest("[data-xf]");if(!f)return;e.preventDefault();const val=f.elements.v.value.trim();if(!val)return;setView("chat");v3Enter();user(esc((f.dataset.xf==="bp"?"BP ":"Glucose ")+val));v3Reading((f.dataset.xf==="bp"?"BP ":"glucose ")+val)});
