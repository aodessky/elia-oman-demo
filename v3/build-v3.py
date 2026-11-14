# Builds the v3 prototype page: the first demo's hosted page plus the v3 module (circles, rewards, prevention, medication, privacy, ministry view).
import sys,os
here=os.path.dirname(os.path.abspath(__file__))
s=open(os.path.join(here,'base-index.html')).read()
def rep(a,b,n=1):
    global s
    assert s.count(a)>=1,('missing',a[:70]); s=s.replace(a,b,n)
def ic(d): return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+d+'</svg>'
def nb(tab,key,label,d): return '<button data-tab="'+tab+'">'+ic(d)+'<span data-t="x_nav_'+key+'">'+label+'</span></button>'
nav=('<div class="x-sep" data-t="x_nav_sep">New in v3</div>'
 +nb('circle','circle','My Circle','<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3 20a6 6 0 0 1 12 0M15.5 14.6A4.6 4.6 0 0 1 21 19"/>')
 +nb('rewards','rewards','Rewards','<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>')
 +nb('prevention','prev','Prevention','<path d="M12 2.5 4.5 5.5v6c0 4.6 3.2 8.6 7.5 9.9 4.3-1.3 7.5-5.3 7.5-9.9v-6z"/><path d="m9 12 2.2 2.2L15.2 10"/>')
 +nb('meds','meds','Medication','<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/>')
 +nb('privacy','privacy','Privacy','<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>')+'\n        ')
rep('<div class="auth"><span class="uav" id="uAv">',nav+'<div class="auth"><span class="uav" id="uAv">')
rep('insurance:hqInsurance}[S.hqTab]();','insurance:hqInsurance,...(window.V3TABS||{})}[S.hqTab]();if(window.v3AfterHQ)v3AfterHQ();')
rep('[t("hq_btn"),()=>{setView("hq");coreReplies()},{silent:true}]])}','[t("hq_btn"),()=>{setView("hq");coreReplies()},{silent:true}],[t("x_m_more"),()=>v3Menu(),{silent:true}]])}')
rep('simStep({type:"USER_TEXT",text:x},{dropUserEcho:x});return}','simStep({type:"USER_TEXT",text:x},{dropUserEcho:x});return}\n  if(typeof v3Route==="function"&&v3Route(x))return;')
rep('<title>ELIA by Prime Health</title>','<title>ELIA v3 Prototype</title>')
red='<script>if(location.hostname==="elia-demo.onrender.com")location.replace("https://elia-oman-demo.onrender.com/"+location.hash)</script>\n'
if red in s: s=s.replace(red,'')
css=open(os.path.join(here,'v3.css')).read()
js='\n'.join(open(os.path.join(here,f)).read() for f in ['v3-en.js','v3-ar.js','v3-es.js','v3-core.js','v3-hq.js','v3-ministry.js'] if os.path.exists(os.path.join(here,f)))
assert '</script>' not in js and '</style>' not in css
rep('\n\n</body>\n</html>',f'\n<style>\n{css}</style>\n<script>\n{js}\n</script>\n\n</body>\n</html>')
out=sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'index.html')
open(out,'w').write(s); print('wrote',out,len(s))
