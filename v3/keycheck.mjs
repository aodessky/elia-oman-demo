import fs from 'fs';
const L={en:{},ar:{},es:{}};
for(const f of ['v3-en.js','v3-ar.js','v3-es.js'])if(fs.existsSync(f))new Function('L',fs.readFileSync(f,'utf8'))(L);
const src=['v3-core.js','v3-hq.js','v3-ministry.js'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
const used=new Set();for(const m of src.matchAll(/\bT\("([a-z0-9_]+)"[,)]/g))used.add(m[1]);for(const m of src.matchAll(/"x_([a-z0-9_]+)"/g))used.add(m[1]);
for(const m of src.matchAll(/[?:]\(?"([a-z]+_[a-z0-9_]+)"/g))if(!/^(st_|p-|a_)/.test(m[1])||/^a_/.test(m[1]))used.add(m[1]);
for(const m of src.matchAll(/k:"([ap]_[a-z_]+)"/g))used.add(m[1]);for(const m of src.matchAll(/v3Audit\([^"]*"(a_[a-z_]+)"/g))used.add(m[1]);for(const m of src.matchAll(/v3Pts\("([a-z_]+)"/g))used.add(m[1]);
const dyn={c_:['family','friends','work'],ci_:['joined','invited','removed','blocked','title','sub'],cs_:['coach','wear','records','circle','sponsor','research'].flatMap(k=>[k,k+'_d']),esc_k_:['bp_crisis','bp_trend','glu_low','glu_high','callback'],esc_l:[1,2,3,4,5],
 gap_:['a1c','eye','kidney','lipid','flu','crc','bpc'].flatMap(k=>[k,k+'_why',k+'_src']).concat(['bpv']),md_sched_:[1,2],med_:['met','ator'],min_prog_:['all','dpp','htn','weight'],min_age_:['all','a1','a2','a3','a4'],min_metric_:['active','gaps','steps','ver','esc'],min_metric_note_:['active','gaps','steps','ver','esc'],
 mode_:['team','rank'],r_reply:[1,2,3],r_s:[1,2,3],rel_:['spouse','brother','sister','friend','colleague'],rwd_:['pharm','grocery','gym','charity','visit'].flatMap(k=>[k,k+'_d']),sg_:['recovery'],sgs_:['open','adjusted','watch','triage','resolved'],sgt_:['recovery'],tpl_:['steps','active','sleep','veg'],
 ver_:['wear','photo','self','clinic','phone','prog'],d:[7,14],rw_:['title','sub'],pv_:['title','sub'],md_:['title','sub'],pr_:['title','sub'],nav_:['sep','circle','rewards','prev','meds','privacy']};
for(const[p,a]of Object.entries(dyn))for(const x of a)used.add(p+x);
const skip=new Set(['st_active','st_completed','st_paused','st_proposed']);
const miss=[...used].filter(k=>!skip.has(k)&&!("x_"+k in L.en));console.log('used',used.size,'defined',Object.keys(L.en).length,'MISSING en:',miss.join(' ')||'none');
const un=Object.keys(L.en).map(k=>k.slice(2)).filter(k=>!used.has(k));console.log('unused:',un.join(' '));
for(const l of ['ar','es']){const n=Object.keys(L[l]).length;if(n){const m=Object.keys(L.en).filter(k=>!(k in L[l]));const ph=Object.keys(L.en).filter(k=>k in L[l]&&JSON.stringify((L.en[k].match(/\{\w+\}/g)||[]).sort())!==JSON.stringify((L[l][k].match(/\{\w+\}/g)||[]).sort()));console.log(l,n,'missing:',m.join(' ')||'none','| placeholder mismatch:',ph.join(' ')||'none')}}
