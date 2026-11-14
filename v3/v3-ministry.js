/* ===== ELIA v3: ministry and sponsor view (aggregated, de-identified, synthetic figures) ===== */
const MIN={prog:"all",age:"all",metric:"active",open:false,list:null};
const MIN_PROG={all:1,dpp:0.34,htn:0.27,weight:0.39},MIN_AGE={all:1,a1:0.22,a2:0.36,a3:0.30,a4:0.12},MIN_CELL=50;
function minRows(){return V3G.map(g=>{const r=vRng("min|"+g[0]+"|"+MIN.prog+"|"+MIN.age);const n=Math.round(g[3]*MIN_PROG[MIN.prog]*MIN_AGE[MIN.age]);
  return{g,n,sup:n<MIN_CELL,active:Math.round(48+r()*24),gaps:Math.round(22+r()*25),steps:Math.round(5200+r()*2700),high:Math.round(13+r()*11),rising:Math.round(27+r()*10),ver:Math.round((3+r()*3)*10)/10,esc:Math.round(6+r()*8)}})}
function minPops(){const v=V();return v.pop}
function minRender(){const el=$("#minView");if(!el||el.hidden)return;const R=minRows(),ok=R.filter(r=>!r.sup);const tot=ok.reduce((a,r)=>a+r.n,0);const w=k=>tot?ok.reduce((a,r)=>a+r[k]*r.n,0)/tot:0;
  const gapsClosed=Math.round(tot*w("gaps")/100*1.7),verified=Math.round(tot*w("active")/100*w("ver")),high=w("high"),rising=w("rising"),low=100-high-rising;
  const M={active:["%",100],gaps:["%",60],steps:["",9000],ver:["",7],esc:["",16]};const mx=M[MIN.metric][1];
  const trend=Array.from({length:12},(_,i)=>{const r=vRng("tr|"+i+MIN.prog+MIN.age);return Math.round(w("active")-11+i*1+r()*3)});
  const sel=(id,cur,opts)=>`<select data-min="${id}">${opts.map(o=>`<option value="${o}"${o===cur?" selected":""}>${T("min_"+id+"_"+o)}</option>`).join("")}</select>`;
  const pops=minPops();
  el.innerHTML=`<div class="min-wrap">
    <div class="min-head"><div><div class="min-role"><span class="x-vtag">${T("min_tag")}</span><span>${T("min_role")}</span></div><h1>${T("min_title")}</h1><p>${T("min_sub")}</p></div>
      <div class="x-row"><button class="x-btn" data-min-act="csv">${T("min_csv")}</button><button class="x-btn pri" data-min-act="close">${T("min_close")}</button></div></div>
    <div class="min-filters"><label>${T("min_f_prog")} ${sel("prog",MIN.prog,Object.keys(MIN_PROG))}</label><label>${T("min_f_age")} ${sel("age",MIN.age,Object.keys(MIN_AGE))}</label><span>${T("min_asof",{when:vFmt(vDate(),{day:"numeric",month:"long",year:"numeric"})})}</span></div>
    <div class="x-tiles">
      <div class="x-tile"><b>${vNum(tot)}</b><span>${T("min_k_enrolled")}</span></div>
      <div class="x-tile"><b>${Math.round(w("active"))}%</b><span>${T("min_k_active")}</span><em>+${trend[11]-trend[7]} ${T("min_pp")}</em></div>
      <div class="x-tile"><b>${vNum(verified)}</b><span>${T("min_k_verified")}</span></div>
      <div class="x-tile"><b>${vNum(gapsClosed)}</b><span>${T("min_k_gaps")}</span></div>
      <div class="x-tile"><b>${Math.round(high)}%</b><span>${T("min_k_high")}</span></div>
      <div class="x-tile"><b>${vNum(Math.round(gapsClosed*14.5/100)*100)}</b><span>${T("min_k_cost")}</span></div>
    </div>
    <div class="min-grid">
      <div class="panel"><div class="x-h3"><h3>${T("min_by_gov")}</h3>${sel("metric",MIN.metric,Object.keys(M))}</div>
        <div class="min-bars">${R.map(r=>r.sup?`<div><span>${gName(r.g)}</span><span class="sup">${T("min_sup",{n:MIN_CELL})}</span></div>`:`<div><span>${gName(r.g)}</span><div class="x-bar"><i style="width:${Math.min(100,r[MIN.metric]/mx*100)}%"></i></div><span class="v">${MIN.metric==="steps"?vNum(r.steps):r[MIN.metric]}${M[MIN.metric][0]}</span></div>`).join("")}</div>
        <span class="x-note">${T("min_metric_note_"+MIN.metric)}</span></div>
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div class="panel"><h3>${T("min_risk")}</h3><div class="min-stack"><i style="width:${low}%;background:var(--good)"></i><i style="width:${rising}%;background:var(--warn)"></i><i style="width:${high}%;background:var(--bad)"></i></div>
          <div class="min-leg"><span style="--c:var(--good)">${T("min_r_low")} ${Math.round(low)}%</span><span style="--c:var(--warn)">${T("min_r_rising")} ${Math.round(rising)}%</span><span style="--c:var(--bad)">${T("min_r_high")} ${Math.round(high)}%</span></div><span class="x-note">${T("min_risk_note")}</span></div>
        <div class="panel"><h3>${T("min_trend")}</h3>${xSpark(trend)}<span class="x-note">${T("min_trend_note")}</span></div>
        <div class="panel"><h3>${T("min_equity")}</h3><div class="min-bars">${[["min_e_w",52],["min_e_m",48],["min_age_a1",17],["min_age_a2",35],["min_age_a3",33],["min_age_a4",15]].map(([k,n])=>`<div><span>${T(k)}</span><div class="x-bar"><i style="width:${n}%"></i></div><span class="v">${n}%</span></div>`).join("")}</div><span class="x-note">${T("min_equity_note")}</span></div>
      </div>
    </div>
    <div class="panel"><div class="x-h3"><h3>${T("min_pop")}</h3></div>
      <div class="x-scroll"><table class="x-table"><thead><tr><th>${T("min_c_name")}</th><th>${T("min_c_metric")}</th><th class="n">${T("min_c_days")}</th><th class="n">${T("min_c_inv")}</th><th class="n">${T("min_c_join")}</th><th>${T("min_c_lead")}</th></tr></thead><tbody>
      ${pops.map(p=>{const B=vPopBoard(p).filter(r=>!r.sup);const inv=Math.round(V3G.reduce((a,g)=>a+g[3],0)*0.81),r=vRng("pj|"+p.id);const join=Math.round(inv*(p.id==="omanwalks"?0.27:0.02+r()*0.03));return`<tr><td><b>${esc(pName(p))}</b></td><td>${T("tpl_"+p.metric)}</td><td class="n">${p.days}</td><td class="n">${vNum(inv)}</td><td class="n">${vNum(join)}</td><td>${gName(B[0].g)} · ${B[0].sc}%</td></tr>`}).join("")}</tbody></table></div>
      <form class="min-form" id="minForm"><label>${T("min_c_name")}<input name="name" required maxlength="60" placeholder="${T("min_ph_name")}"></label>
        <label>${T("min_c_metric")}<select name="metric">${Object.keys(V3T).map(k=>`<option value="${k}">${T("tpl_"+k)}</option>`).join("")}</select></label>
        <label>${T("min_c_days")}<select name="days"><option>14</option><option selected>30</option><option>60</option></select></label>
        <label>${T("min_c_reward")}<select name="pts"><option>100</option><option selected>150</option><option>250</option></select></label>
        <button class="x-btn pri">${T("min_create")}</button></form>
      <span class="x-note">${T("min_pop_note")}</span></div>
    <div class="min-note">${T("min_protect",{n:MIN_CELL})}</div></div>`}
function minOpen(){let el=$("#minView");if(!el){el=document.createElement("div");el.id="minView";el.setAttribute("role","dialog");el.setAttribute("aria-label","Ministry view");$("#app").appendChild(el);
    el.addEventListener("change",e=>{const s=e.target.closest("[data-min]");if(s){MIN[s.dataset.min]=s.value;minRender()}});
    el.addEventListener("click",e=>{const b=e.target.closest("[data-min-act]");if(!b)return;if(b.dataset.minAct==="close"){el.hidden=true;return}
      if(b.dataset.minAct==="csv"){const R=minRows();const rows=[["governorate","enrolled","weekly_active_pct","care_gaps_closed_pct","avg_daily_steps","verified_actions_per_member_week","high_risk_pct","escalations_per_1000"],...R.map(r=>r.sup?[r.g[1],"suppressed","","","","","",""]:[r.g[1],r.n,r.active,r.gaps,r.steps,r.ver,r.high,r.esc])];
        try{const u=URL.createObjectURL(new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"}));const l=document.createElement("a");l.href=u;l.download="elia-programme-aggregate.csv";document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}catch(e){}v3Audit("a_min_export")}});
    el.addEventListener("submit",e=>{if(e.target.id!=="minForm")return;e.preventDefault();const f=e.target.elements;const name=f.name.value.trim();if(!name)return;const p={id:"p"+Date.now(),name:{en:name,ar:name},by:"moh",metric:f.metric.value,days:+f.days.value,state:"invited",start:V().day,pts:+f.pts.value,mine:0};V().pop.unshift(p);v3Audit("a_min_pop",{name});minRender();
      /* the member sees the invitation in chat (only when they allow programme messages) */
      el.hidden=true;v3PopInvite(p)})}
  el.hidden=false;v3Audit("a_min_view");minRender();el.scrollTop=0}

/* ----- wiring: header, quick actions, language ----- */
(function(){
  const top=document.querySelector("header.top"),pt=$("#presToggle");
  if(top&&pt){const b=document.createElement("button");b.className="pbtn";b.id="minBtn";b.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V10M19 21V10M9 21v-7M15 21v-7M2 10l10-6 10 6"/></svg><span data-t="x_min_btn"></span>`;pt.after(b);b.onclick=minOpen;
    const d=document.createElement("button");d.className="pbtn";d.id="dayBtn";d.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4l10 8-10 8zM19 5v14"/></svg><span data-t="x_next_day"></span>`;b.after(d);d.onclick=()=>{if(!S.name){loadPersona();S.langChosen=true}v3NextDay(1)};
    const tag=document.createElement("span");tag.className="x-vtag";tag.textContent="v3 prototype";d.after(tag)}
  const pr=$("#presenter"),rs=$("#pReset");
  if(pr&&rs){[["x_p_circle",()=>v3CircleHome()],["x_p_incoming",()=>v3Incoming()],["x_p_signal",()=>v3Signal()],["x_p_gap",()=>v3GapsChat()],["x_p_meds",()=>v3MedsChat()],["x_p_reading",()=>v3AskReading()],["x_p_week",()=>v3Week()],["x_p_pop",()=>v3PopInvite()],["x_p_week7",()=>v3NextDay(7)]].forEach(([k,fn])=>{const b=document.createElement("button");b.dataset.t=k;b.textContent=t(k);b.onclick=()=>{if(!S.name){loadPersona();S.langChosen=true}fn()};pr.insertBefore(b,rs)})}
  document.querySelectorAll("[data-t^='x_']").forEach(e=>{e.textContent=t(e.dataset.t)});
  $("#langSeg").addEventListener("click",()=>setTimeout(minRender,0));
})();
