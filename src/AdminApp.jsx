import { useState, useEffect, useRef } from 'react'
import { db, auth } from './firebase.js'
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where
} from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth'

const G = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#F4F1EC;font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#C8C0B0;border-radius:4px}
  input,textarea,select{font-family:'Inter',sans-serif} input:focus,textarea:focus,select:focus{outline:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pop{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:768px){
    input,textarea,select{font-size:max(16px,1em)!important}
    button{min-height:44px}
  }
`

const Q_TYPES = [{id:'scale',label:'Scale',icon:'▬'},{id:'choice',label:'Multiple Choice',icon:'◉'},{id:'text',label:'Free Text',icon:'☰'}]
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const REPEATS = ['One-time','Daily','Weekly','Custom interval']
function makeCode(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return'SYLVIA-'+Array.from({length:6},()=>c[Math.floor(Math.random()*c.length)]).join('')}
function today(){return new Date().toISOString().split('T')[0]}
function useMobile(){
  const [m,setM]=useState(window.innerWidth<768)
  useEffect(()=>{const h=()=>setM(window.innerWidth<768);window.addEventListener('resize',h);return()=>window.removeEventListener('resize',h)},[])
  return m
}

const Spin = () => <div style={{width:18,height:18,border:'2px solid #E5E0D8',borderTop:'2px solid #6C63FF',borderRadius:'50%',animation:'spin .7s linear infinite',flexShrink:0}}/>
const Badge = ({status}) => { const m={active:['#1A6644','#D1FAE5'],paused:['#92400E','#FEF3C7']}; const [c,bg]=m[status]||['#374151','#F3F4F6']; return <span style={{fontSize:11,fontWeight:600,color:c,background:bg,borderRadius:20,padding:'3px 10px',textTransform:'capitalize'}}>{status}</span> }
const TBadge = ({type}) => { const m={scale:['#1D4ED8','#DBEAFE'],choice:['#6C63FF','#EDE9FE'],text:['#065F46','#D1FAE5']}; const [c,bg]=m[type]||['#374151','#F3F4F6']; const t=Q_TYPES.find(q=>q.id===type); return <span style={{fontSize:11,fontWeight:600,color:c,background:bg,borderRadius:20,padding:'3px 10px'}}>{t?.icon} {t?.label}</span> }
const RoleBadge = ({role}) => { const m={'Super Admin':['#7C3AED','#EDE9FE'],'Admin':['#1D4ED8','#DBEAFE'],'Viewer':['#374151','#F3F4F6']}; const [c,bg]=m[role]||['#374151','#F3F4F6']; return <span style={{fontSize:11,fontWeight:600,color:c,background:bg,borderRadius:20,padding:'3px 10px'}}>{role}</span> }
function makeTempPassword(){const c='ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';return Array.from({length:12},()=>c[Math.floor(Math.random()*c.length)]).join('')}
const Lbl = ({children}) => <label style={{fontSize:11,fontWeight:600,color:'#6B6888',letterSpacing:1,textTransform:'uppercase',display:'block',marginBottom:8}}>{children}</label>
const Field = ({label,children}) => <div style={{marginBottom:18}}><Lbl>{label}</Lbl>{children}</div>
const inp = {border:'1.5px solid #E5E0D8',borderRadius:12,padding:'11px 14px',fontSize:14,color:'#1A1A2E',background:'#FAFAF8',width:'100%'}
const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="44" height="44">
    <polygon points="500,150 803.1,325 803.1,675 500,850 196.9,675 196.9,325" fill="none" stroke="#684C81" strokeWidth="25" strokeLinejoin="round"/>
    <polygon points="500,150 803.1,675 196.9,675" fill="none" stroke="#CC9E63" strokeWidth="25" strokeLinejoin="round"/>
    <polygon points="803.1,325 500,850 196.9,325" fill="none" stroke="#CC9E63" strokeWidth="25" strokeLinejoin="round"/>
    <circle cx="500" cy="150" r="50" fill="#CC9E63"/>
    <circle cx="803.1" cy="325" r="50" fill="#CC9E63"/>
    <circle cx="803.1" cy="675" r="50" fill="#CC9E63"/>
    <circle cx="500" cy="850" r="50" fill="#CC9E63"/>
    <circle cx="196.9" cy="675" r="50" fill="#CC9E63"/>
    <circle cx="196.9" cy="325" r="50" fill="#CC9E63"/>
    <circle cx="500" cy="500" r="125" fill="#614131"/>
    <text x="500" y="555" fontFamily="'Playfair Display', Didot, serif" fontSize="155" fontWeight="700" fill="#EFC47A" textAnchor="middle">S</text>
  </svg>
)

// ── Admin Login ───────────────────────────────────────────────────────────────
function AdminLogin({onLogin}) {
  const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false)
  async function login() {
    setLoading(true); setErr('')
    try { await signInWithEmailAndPassword(auth, email, pw); onLogin() }
    catch(e) { setErr(e.message) }
    setLoading(false)
  }
  return (
    <div style={{minHeight:'100vh',background:'#1A1A2E',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
      <style>{G}</style>
      <div style={{background:'#fff',borderRadius:24,padding:36,width:'100%',maxWidth:400,boxShadow:'0 32px 80px rgba(0,0,0,.3)',animation:'pop .3s ease'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:28}}><Logo/><div><div style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:20,color:'#1A1A2E'}}>Sylvia</div><div style={{fontSize:11,color:'#9B98B8'}}>Admin Console</div></div></div>
        <Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" style={inp} onKeyDown={e=>e.key==='Enter'&&login()}/></Field>
        <Field label="Password"><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={inp} onKeyDown={e=>e.key==='Enter'&&login()}/></Field>
        {err&&<p style={{color:'#EF4444',fontSize:12,marginBottom:12,lineHeight:1.5}}>{err}</p>}
        <button onClick={login} disabled={loading} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?<Spin/>:'Sign In →'}</button>
      </div>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({active,setActive,onLogout,open,onClose}) {
  const isMobile=useMobile()
  useEffect(()=>{
    if(isMobile) document.body.style.overflow=open?'hidden':''
    return()=>{document.body.style.overflow=''}
  },[open,isMobile])
  const nav=[
    {id:'modules',label:'Modules',icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="12" height="14" rx="2"/><line x1="6" y1="6" x2="12" y2="6"/><line x1="6" y1="9" x2="12" y2="9"/><line x1="6" y1="12" x2="10" y2="12"/></svg>},
    {id:'schedule',label:'Schedule',icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="7"/><polyline points="9,5 9,9 12,11"/></svg>},
    {id:'clients',label:'Clients',icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="6" r="3"/><path d="M3 16c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>},
    {id:'team',label:'Team',icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6.5" cy="6" r="2.5"/><path d="M1 16c0-3 2.5-5 5.5-5"/><circle cx="12" cy="6" r="2.5"/><path d="M10.5 11c1.5-.6 4.5.2 5.5 5"/></svg>},
    {id:'invites',label:'Invites',icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="14" height="10" rx="2"/><polyline points="2,4 9,11 16,4"/></svg>},
  ]
  return (
    <>
      {isMobile&&open&&<div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:99,backdropFilter:'blur(2px)'}}/>}
      <div style={{width:230,background:'#F0E8DC',minHeight:'100vh',display:'flex',flexDirection:'column',padding:'28px 0',flexShrink:0,...(isMobile&&{position:'fixed',top:0,left:0,height:'100%',zIndex:100,transform:open?'translateX(0)':'translateX(-100%)',transition:'transform .25s ease',boxShadow:open?'4px 0 32px rgba(0,0,0,.15)':'none'})}}>
        <div style={{padding:'0 20px 28px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}><Logo/><div><div style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:22,color:'#1A0F0A',letterSpacing:-0.3}}>Sylvia</div><div style={{fontSize:11,color:'#4A3020',marginTop:2}}>Precision Health</div></div></div>
          <div style={{fontSize:10,color:'#1A0F0A',background:'rgba(0,0,0,0.08)',borderRadius:6,padding:'3px 10px',display:'inline-block',letterSpacing:1,textTransform:'uppercase'}}>Admin Console</div>
        </div>
        <div style={{flex:1,padding:'0 12px'}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>{setActive(n.id);if(isMobile)onClose()}} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:12,border:'none',cursor:'pointer',marginBottom:4,background:active===n.id?'#E8DDD4':'transparent',transition:'background .15s'}}>
              <span style={{display:'flex',flexShrink:0,color:active===n.id?'#8B3A2A':'#1A0F0A'}}>{n.icon}</span>
              <span style={{fontWeight:active===n.id?600:400,fontSize:14,color:'#1A0F0A'}}>{n.label}</span>
              {active===n.id&&<div style={{marginLeft:'auto',width:5,height:5,borderRadius:'50%',background:'#8B3A2A'}}/>}
            </button>
          ))}
        </div>
        <div style={{padding:'16px 20px 0',borderTop:'1px solid rgba(0,0,0,0.12)'}}>
          <button onClick={onLogout} style={{background:'none',border:'none',color:'#1A0F0A',fontSize:12,cursor:'pointer',padding:0}}>Sign out</button>
        </div>
      </div>
    </>
  )
}

// ── Schedule Entry Editor (reusable) ──────────────────────────────────────────
function ScheduleEntryEditor({entry, onChange}) {
  const [mode, setMode] = useState(entry.mode || 'time')
  const isMobile=useMobile()
  return (
    <div style={{background:'#FAFAF8',borderRadius:12,padding:14,border:'1px solid #E5E0D8',marginTop:10}}>
      <div style={{display:'flex',gap:8,marginBottom:12}}>
        {[['time','At a specific time'],['interval','At an interval']].map(([m,l])=>(
          <button key={m} onClick={()=>{setMode(m);onChange({...entry,mode:m})}}
            style={{flex:1,padding:'8px 10px',borderRadius:10,border:`1.5px solid ${mode===m?'#6C63FF':'#E5E0D8'}`,background:mode===m?'#EDE9FE':'#fff',color:mode===m?'#6C63FF':'#9B98B8',fontSize:12,fontWeight:600,cursor:'pointer'}}>
            {l}
          </button>
        ))}
      </div>
      {mode==='time' && (
        <div style={{display:'flex',gap:10,flexDirection:isMobile?'column':'row'}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>Send time</div>
            <input type="time" value={entry.time||'08:00'} onChange={e=>onChange({...entry,time:e.target.value,mode:'time',repeat:'Daily'})} style={{...inp,padding:'8px 10px',borderRadius:8}}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>Repeat</div>
            <select value={entry.repeat||'Daily'} onChange={e=>onChange({...entry,repeat:e.target.value})} style={{...inp,padding:'8px 10px',borderRadius:8}}>
              {REPEATS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      )}
      {mode==='interval' && (
        <div>
          <div style={{display:'flex',gap:10,marginBottom:10,flexDirection:isMobile?'column':'row'}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>Start time</div>
              <input type="time" value={entry.time||'08:00'} onChange={e=>onChange({...entry,time:e.target.value,mode:'interval',repeat:'Custom interval'})} style={{...inp,padding:'8px 10px',borderRadius:8}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>Every N hours</div>
              <input type="number" min={1} max={24} value={entry.interval||4} onChange={e=>onChange({...entry,interval:+e.target.value,repeat:'Custom interval',mode:'interval'})} style={{...inp,padding:'8px 10px',borderRadius:8}}/>
            </div>
          </div>
          <div style={{fontSize:11,color:'#9B98B8'}}>Sends every {entry.interval||4} hour{(entry.interval||4)!==1?'s':''} starting at {entry.time||'08:00'}</div>
        </div>
      )}
    </div>
  )
}


// ── Schedule Row (extracted to avoid hooks-in-map) ────────────────────────────
function ScheduleRow({s, q, saving, onSave, onToggle, onRemove}) {
  const [editing, setEditing] = useState(false)
  const [entry, setEntry] = useState({time:s.time, repeat:s.repeat, interval:s.interval, mode:s.mode||'time'})
  return (
    <div style={{background:'#fff',borderRadius:14,padding:'14px 16px',border:`1.5px solid ${s.active?'#E8E3DA':'#F0EDE8'}`,marginBottom:8,opacity:s.active?1:.6}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap'}}>
            <TBadge type={q.type}/>
            <span style={{fontSize:11,color:s.active?'#1A6644':'#92400E',background:s.active?'#D1FAE5':'#FEF3C7',borderRadius:20,padding:'2px 8px',fontWeight:600}}>{s.active?'Active':'Paused'}</span>
          </div>
          <p style={{fontSize:13,color:'#1A1A2E',fontWeight:500,margin:'0 0 6px',lineHeight:1.4}}>{q.text.length>70?q.text.slice(0,70)+'…':q.text}</p>
          <div style={{fontSize:11,color:'#9B98B8'}}>{s.mode==='interval'?`Every ${s.interval}h from ${s.time}`:`Daily at ${s.time}`}</div>
          {editing&&<ScheduleEntryEditor entry={entry} onChange={e=>setEntry(e)}/>}
        </div>
        <div style={{display:'flex',gap:5,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
          {editing?(
            <button onClick={async()=>{await onSave(s.id,entry);setEditing(false)}} style={{padding:'5px 10px',borderRadius:8,border:'none',background:'#1A1A2E',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>{saving===s.id?<Spin/>:'Save'}</button>
          ):(
            <button onClick={()=>setEditing(true)} style={{padding:'5px 10px',borderRadius:8,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:11,fontWeight:600,cursor:'pointer'}}>Edit</button>
          )}
          <button onClick={()=>onToggle(s)} style={{padding:'5px 10px',borderRadius:8,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:11,fontWeight:600,cursor:'pointer'}}>{s.active?'Pause':'Resume'}</button>
          <button onClick={()=>onRemove(s)} style={{padding:'5px 8px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:11,cursor:'pointer'}}>✕</button>
        </div>
      </div>
    </div>
  )
}

// ── Client Profile View ───────────────────────────────────────────────────────
function ClientProfileView({client, questions, onBack}) {
  const [schedules,setSchedules]=useState([])
  const [responses,setResponses]=useState([])
  const [templates,setTemplates]=useState([])
  const [loading,setLoading]=useState(true)
  const [activeTab,setActiveTab]=useState('info')
  const [showAddQ,setShowAddQ]=useState(false)
  const [addStep,setAddStep]=useState(1)
  const [addFolder,setAddFolder]=useState(null)
  const [addTemplate,setAddTemplate]=useState(null)
  const [addDurDays,setAddDurDays]=useState(15)
  const [addStartDate,setAddStartDate]=useState(today())
  const [adding,setAdding]=useState(false)
  const [addSuccess,setAddSuccess]=useState(false)
  const [toggling,setToggling]=useState(null)
  const [removing,setRemoving]=useState(null)
  const [dateFrom,setDateFrom]=useState('')
  const [dateTo,setDateTo]=useState('')

  useEffect(()=>{
    const u1=onSnapshot(query(collection(db,'schedules'),where('userId','==',client.id)),
      snap=>{setSchedules(snap.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)})
    const u2=onSnapshot(query(collection(db,'responses'),where('userId','==',client.id)),
      snap=>setResponses(snap.docs.map(d=>({id:d.id,...d.data()}))))
    const u3=onSnapshot(collection(db,'scheduleTemplates'),
      snap=>setTemplates(snap.docs.map(d=>({id:d.id,...d.data()}))))
    return()=>{u1();u2();u3()}
  },[client.id])

  function qInfo(id){return questions.find(q=>q.id===id)}

  async function deleteClient(){
    if(!window.confirm(`Permanently delete ${client.name}? This cannot be undone.`))return
    await deleteDoc(doc(db,'users',client.id))
    onBack()
  }

  function tSummary(t){
    if(!t)return''
    if(t.type==='custom_interval')return`Every ${t.intervalHours}h from ${(t.times||['08:00'])[0]}`
    if(t.type==='weekly')return`${(t.days||[]).join(', ')} at ${(t.times||['09:00'])[0]}`
    return(t.times||[]).join(' · ')
  }

  const folderMap={}
  questions.forEach(q=>{const f=q.folder||'Uncategorized';if(!folderMap[f])folderMap[f]=[];folderMap[f].push(q)})
  const folderNames=Object.keys(folderMap).sort()

  function groupAssignments(scheds){
    const groups={}
    scheds.forEach(s=>{const key=s.assignmentId||s.id;if(!groups[key])groups[key]=[];groups[key].push(s)})
    return Object.values(groups)
  }

  function groupMeta(group){
    const first=group[0]
    const endDate=first.endDate||''
    const isExpired=endDate&&endDate<today()
    const isRemoved=group.every(s=>s.removed)
    const dl=endDate?Math.max(0,Math.ceil((new Date(endDate)-new Date(today()))/86400000)+1):null
    return{
      folder:first.folder||'All Questions',
      templateName:first.templateName||'Custom',
      startDate:first.startDate||'',
      endDate,times:group.map(s=>s.time).filter(Boolean),
      active:group.some(s=>s.active),
      removed:isRemoved,expired:isExpired&&!isRemoved,
      daysLeft:dl,assignmentId:first.assignmentId||first.id,ids:group.map(s=>s.id),
      assignmentName:first.assignmentName||''
    }
  }

  const allGroups=groupAssignments(schedules)
  const activeGroups=allGroups.filter(g=>{const m=groupMeta(g);return!m.removed&&(m.endDate?m.endDate>=today():true)})
  const pastGroups=allGroups.filter(g=>{const m=groupMeta(g);return m.removed||(m.endDate&&m.endDate<today())})

  async function toggleAssignment(group){
    const meta=groupMeta(group);setToggling(meta.assignmentId)
    const newActive=!meta.active
    for(const s of group)await updateDoc(doc(db,'schedules',s.id),{active:newActive})
    setToggling(null)
  }

  async function removeAssignment(group){
    const meta=groupMeta(group)
    if(!window.confirm('Remove this assignment?'))return
    setRemoving(meta.assignmentId)
    for(const s of group)await updateDoc(doc(db,'schedules',s.id),{removed:true,active:false})
    setRemoving(null)
  }

  async function confirmAdd(){
    if(!addTemplate||!addFolder)return
    setAdding(true)
    try{
      const startDate=addStartDate||today()
      const end=new Date(startDate);end.setDate(end.getDate()+addDurDays-1)
      const endDate=end.toISOString().split('T')[0]
      const assignmentId=Date.now().toString(36)+Math.random().toString(36).slice(2,6)
      const assignmentName=`${addFolder} — ${startDate} — ${addTemplate.name}`
      let timesToCreate=[...(addTemplate.times||['09:00'])],extraFields={}
      if(addTemplate.type==='weekly'){extraFields={repeat:'Weekly',days:addTemplate.days||[]}}
      else if(addTemplate.type==='custom_interval'){
        timesToCreate=[(addTemplate.times||['08:00'])[0]]
        extraFields={mode:'interval',interval:addTemplate.intervalHours||4,repeat:'Custom interval'}
      }
      for(const time of timesToCreate){
        const ref=await addDoc(collection(db,'schedules'),{
          questionId:'__ALL__',userId:client.id,time,
          repeat:'Daily',interval:null,mode:'time',
          startDate,endDate,durationDays:addDurDays,
          active:true,removed:false,folder:addFolder,assignmentId,assignmentName,
          templateId:addTemplate.id,templateName:addTemplate.name,...extraFields
        })
        await updateDoc(doc(db,'schedules',ref.id),{id:ref.id})
      }
      setAddSuccess(true)
    }catch(e){alert('Error: '+e.message)}
    setAdding(false)
  }

  function closeAdd(){setShowAddQ(false);setAddStep(1);setAddFolder(null);setAddTemplate(null);setAddDurDays(15);setAddStartDate(today());setAddSuccess(false)}

  const clientResponses=responses.filter(r=>{
    if(r.answer==='__skipped__')return false
    if(dateFrom&&r.date<dateFrom)return false
    if(dateTo&&r.date>dateTo)return false
    return true
  }).sort((a,b)=>a.ts>b.ts?-1:1)

  function getChartData(qId){
    return clientResponses
      .filter(r=>r.questionId===qId)
      .map(r=>({date:r.date,value:+r.answer}))
      .sort((a,b)=>a.date>b.date?1:-1)
  }

  function MiniChart({data,color='#6C63FF',qId}){
    if(data.length<2)return<div style={{fontSize:12,color:'#C8C0B0',padding:'8px 0'}}>Not enough data points yet.</div>
    const W=420,H=80,PX=8,PY=10
    const vals=data.map(d=>d.value)
    const min=Math.min(...vals),max=Math.max(...vals)
    const range=max-min||1
    const xs=data.map((_,i)=>PX+(i/(data.length-1))*(W-PX*2))
    const ys=data.map(d=>PY+((max-d.value)/range)*(H-PY*2))
    const path=xs.map((x,i)=>`${i===0?'M':'L'}${x},${ys[i]}`).join(' ')
    const area=path+` L${xs[xs.length-1]},${H-PY} L${xs[0]},${H-PY} Z`
    return(
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:80}}>
          <defs>
            <linearGradient id={`cg-${qId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".25"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#cg-${qId})`}/>
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {xs.map((x,i)=>(
            <g key={i}>
              <circle cx={x} cy={ys[i]} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5"/>
              <title>{data[i].date}: {data[i].value}</title>
            </g>
          ))}
        </svg>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:2}}>
          <span style={{fontSize:10,color:'#C8C0B0'}}>{data[0]?.date}</span>
          <span style={{fontSize:10,color:'#C8C0B0'}}>{data[data.length-1]?.date}</span>
        </div>
      </div>
    )
  }

  function exportCSV(){
    if(!clientResponses.length)return
    const rows=[['Date','Time','Question','Category','Type','Answer']]
    clientResponses.forEach(r=>{
      const q=qInfo(r.questionId)
      rows.push([r.date,r.ts?new Date(r.ts).toLocaleTimeString():'',q?.text||r.questionId,q?.category||'',q?.type||'',r.answer])
    })
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob=new Blob([csv],{type:'text/csv'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a')
    a.href=url
    a.download=`${client.name.replace(/ /g,'_')}_responses_${today()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const byQuestion={}
  clientResponses.forEach(r=>{if(!byQuestion[r.questionId])byQuestion[r.questionId]=[];byQuestion[r.questionId].push(r)})
  const scaleColors=['#6C63FF','#6ECB8A','#F6C549','#F2857A','#7BB8F5','#B48FE8']
  const tabs=[{id:'info',label:'Info'},{id:'questions',label:'Questions'},{id:'responses',label:'Responses'}]

  return(
    <div style={{animation:'fadeUp .25s ease'}}>
      <button onClick={onBack} style={{background:'none',border:'1.5px solid #E5E0D8',borderRadius:10,padding:'8px 14px',fontSize:13,color:'#6B6888',cursor:'pointer',fontWeight:600,marginBottom:20}}>← Clients</button>

      <div style={{background:'#1A1A2E',borderRadius:20,padding:'24px 28px',display:'flex',alignItems:'center',gap:16,marginBottom:24}}>
        <div style={{width:52,height:52,borderRadius:16,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:20,color:'#6C63FF',flexShrink:0}}>{client.name?.split(' ').map(n=>n[0]).join('')||'?'}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:22,color:'#E8E4FF',marginBottom:2}}>{client.name}</div>
          <div style={{fontSize:13,color:'#6B6888'}}>{client.email} · Joined {client.joinedDate}</div>
        </div>
        <Badge status={client.status||'active'}/>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:24,background:'#fff',borderRadius:14,padding:4,border:'1.5px solid #E8E3DA'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{flex:1,padding:'9px 0',borderRadius:10,border:'none',background:activeTab===t.id?'#1A1A2E':'transparent',color:activeTab===t.id?'#E8E4FF':'#9B98B8',fontSize:13,fontWeight:activeTab===t.id?700:500,cursor:'pointer',transition:'all .15s'}}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab==='info'&&(
        <div style={{background:'#fff',borderRadius:20,padding:28,border:'1.5px solid #E8E3DA'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase'}}>Client Information</div>
            <button style={{padding:'7px 14px',borderRadius:10,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:12,fontWeight:600,cursor:'not-allowed',opacity:.5}}>Edit</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            {[['Name',client.name],['Email',client.email],['Joined',client.joinedDate]].map(([label,value])=>(
              <div key={label}>
                <div style={{fontSize:11,fontWeight:600,color:'#9B98B8',letterSpacing:.5,marginBottom:4,textTransform:'uppercase'}}>{label}</div>
                <div style={{fontSize:14,color:'#1A1A2E',fontWeight:500}}>{value}</div>
              </div>
            ))}
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#9B98B8',letterSpacing:.5,marginBottom:4,textTransform:'uppercase'}}>Status</div>
              <Badge status={client.status||'active'}/>
            </div>
          </div>
          <div style={{marginTop:24,paddingTop:24,borderTop:'1px solid #F0EDE8'}}>
            <button onClick={deleteClient} style={{width:'100%',padding:11,borderRadius:12,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:14,fontWeight:600,cursor:'pointer'}}>Delete Client</button>
          </div>
        </div>
      )}

      {activeTab==='questions'&&(
        <div>
          {showAddQ?(
            addSuccess?(
              <div style={{background:'#fff',borderRadius:20,padding:32,border:'1.5px solid #E8E3DA',textAlign:'center',marginBottom:20}}>
                <div style={{fontSize:36,marginBottom:10}}>✓</div>
                <div style={{fontWeight:700,fontSize:17,color:'#1A6644',marginBottom:6}}>Assignment Added</div>
                <div style={{fontSize:13,color:'#6B6888',marginBottom:20,lineHeight:1.6}}>{addFolder} · {addTemplate?.name} · {addDurDays} days</div>
                <button onClick={closeAdd} style={{padding:'10px 28px',borderRadius:12,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:14,fontWeight:700,cursor:'pointer'}}>Done</button>
              </div>
            ):(
              <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .2s ease'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#1A1A2E'}}>Add Questions</div>
                    {addStep===2&&addFolder&&<div style={{fontSize:12,color:'#6B6888',marginTop:2}}>📁 {addFolder} · {(folderMap[addFolder]||[]).length} questions</div>}
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    {addStep===2&&<button onClick={()=>{setAddStep(1);setAddFolder(null)}} style={{background:'none',border:'1.5px solid #E5E0D8',borderRadius:8,padding:'5px 10px',fontSize:12,color:'#6B6888',cursor:'pointer'}}>← Back</button>}
                    <button onClick={closeAdd} style={{background:'none',border:'1.5px solid #E5E0D8',borderRadius:8,padding:'5px 12px',fontSize:12,color:'#6B6888',cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>

                {addStep===1&&(
                  <>
                    <div style={{fontSize:10,fontWeight:700,color:'#6B6888',letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Select Module</div>
                    {folderNames.length===0&&<div style={{textAlign:'center',padding:'30px',color:'#C8C0B0',fontSize:13}}>No modules found.</div>}
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {folderNames.map(f=>(
                        <div key={f} onClick={()=>{setAddFolder(f);const def=templates.find(t=>t.isDefault)||templates[0]||null;setAddTemplate(def);setAddDurDays(def?.defaultDuration||15);setAddStep(2)}}
                          style={{background:'#FAFAF8',borderRadius:14,padding:'14px 16px',border:'1.5px solid #E8E3DA',cursor:'pointer',display:'flex',alignItems:'center',gap:12}}>
                          <div style={{width:38,height:38,borderRadius:10,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>📁</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{f}</div>
                            <div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{(folderMap[f]||[]).length} question{(folderMap[f]||[]).length!==1?'s':''}</div>
                          </div>
                          <span style={{color:'#C8C0B0',fontSize:18}}>›</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {addStep===2&&(
                  <>
                    <div style={{fontSize:10,fontWeight:700,color:'#6B6888',letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Schedule Template</div>
                    {templates.length===0&&<div style={{textAlign:'center',padding:'20px',color:'#C8C0B0',fontSize:13,marginBottom:16}}>No templates yet — create one in the Schedule tab.</div>}
                    <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:18}}>
                      {templates.map(t=>(
                        <div key={t.id} onClick={()=>{setAddTemplate(t);setAddDurDays(t.defaultDuration)}}
                          style={{background:'#FAFAF8',borderRadius:14,padding:'14px 16px',border:`1.5px solid ${addTemplate?.id===t.id?'#6C63FF':'#E8E3DA'}`,cursor:'pointer',transition:'border-color .15s'}}>
                          <div style={{display:'flex',alignItems:'center',gap:12}}>
                            <div style={{flex:1}}>
                              <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                                <span style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{t.name}</span>
                                {t.isDefault&&<span style={{fontSize:10,fontWeight:700,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'1px 7px'}}>DEFAULT</span>}
                              </div>
                              <div style={{fontSize:12,color:'#6B6888'}}>{tSummary(t)}</div>
                              <div style={{fontSize:11,color:'#9B98B8',marginTop:2}}>{t.defaultDuration} days</div>
                            </div>
                            <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${addTemplate?.id===t.id?'#6C63FF':'#D1D5DB'}`,background:addTemplate?.id===t.id?'#6C63FF':'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                              {addTemplate?.id===t.id&&<div style={{width:8,height:8,borderRadius:'50%',background:'#fff'}}/>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{marginBottom:18}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#6B6888',letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Start Date</div>
                      <input type="date" value={addStartDate} onChange={e=>setAddStartDate(e.target.value)} style={{...inp,padding:'8px 12px',borderRadius:10,width:'auto'}}/>
                    </div>
                    <div style={{marginBottom:20}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#6B6888',letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Duration</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                        {[15,30,60].map(d=>(
                          <button key={d} onClick={()=>setAddDurDays(d)} style={{padding:'7px 12px',borderRadius:10,border:`1.5px solid ${addDurDays===d?'#1A1A2E':'#E5E0D8'}`,background:addDurDays===d?'#1A1A2E':'#fff',color:addDurDays===d?'#E8E4FF':'#9B98B8',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                            {d} days
                          </button>
                        ))}
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <input type="number" min={1} max={365} value={addDurDays} onChange={e=>setAddDurDays(Math.max(1,+e.target.value))} style={{...inp,padding:'7px 10px',borderRadius:8,width:72}}/>
                          <span style={{fontSize:12,color:'#9B98B8'}}>days</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={confirmAdd} disabled={adding||!addTemplate} style={{width:'100%',padding:12,borderRadius:12,border:'none',background:addTemplate&&!adding?'#6C63FF':'#E5E0D8',color:addTemplate&&!adding?'#fff':'#9B98B8',fontSize:14,fontWeight:700,cursor:addTemplate&&!adding?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      {adding?<><Spin/> Adding…</>:'Confirm & Add'}
                    </button>
                  </>
                )}
              </div>
            )
          ):(
            <>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase'}}>Active Assignments ({activeGroups.length})</div>
                <button onClick={()=>{setShowAddQ(true);setAddStep(1);setAddFolder(null);setAddSuccess(false)}} style={{background:'#6C63FF',color:'#fff',border:'none',borderRadius:12,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer'}}>+ Add Questions</button>
              </div>

              {activeGroups.length===0&&(
                <div style={{textAlign:'center',padding:'48px 20px',color:'#C8C0B0',background:'#fff',borderRadius:20,border:'1.5px solid #E8E3DA',marginBottom:20}}>
                  <div style={{fontSize:36,marginBottom:12}}>📁</div>
                  <p style={{fontSize:15,fontWeight:500}}>No questions assigned yet</p>
                  <p style={{fontSize:13,marginTop:6}}>Click "+ Add Questions" to assign a folder with a schedule.</p>
                </div>
              )}

              {activeGroups.map(group=>{
                const meta=groupMeta(group)
                const qCount=(folderMap[meta.folder]||[]).length
                const isToggling=toggling===meta.assignmentId
                const isRemoving=removing===meta.assignmentId
                return(
                  <div key={meta.assignmentId} style={{background:'#fff',borderRadius:16,padding:'18px 20px',border:`1.5px solid ${meta.active?'#E8E3DA':'#F0EDE8'}`,marginBottom:10,opacity:meta.active?1:.7}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                      <div style={{width:42,height:42,borderRadius:12,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>📁</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}>
                          <span style={{fontWeight:700,fontSize:15,color:'#1A1A2E'}}>{meta.assignmentName||meta.folder}</span>
                          {qCount>0&&<span style={{fontSize:11,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'2px 8px',fontWeight:600}}>{qCount} question{qCount!==1?'s':''}</span>}
                          {meta.active
                            ?<span style={{fontSize:11,color:'#1A6644',background:'#D1FAE5',borderRadius:20,padding:'2px 8px',fontWeight:600}}>Active</span>
                            :<span style={{fontSize:11,color:'#92400E',background:'#FEF3C7',borderRadius:20,padding:'2px 8px',fontWeight:600}}>Paused</span>}
                          {meta.daysLeft!==null&&meta.daysLeft>0
                            ?<span style={{fontSize:11,color:'#6B6888',background:'#F4F1EC',borderRadius:20,padding:'2px 8px'}}>{meta.daysLeft} day{meta.daysLeft!==1?'s':''} left</span>
                            :meta.endDate&&<span style={{fontSize:11,color:'#EF4444',background:'#FEE2E2',borderRadius:20,padding:'2px 8px',fontWeight:600}}>Expired</span>}
                        </div>
                        <div style={{fontSize:12,color:'#6B6888',marginBottom:3}}>{meta.templateName} · {meta.times.join(' · ')}</div>
                        <div style={{fontSize:11,color:'#9B98B8'}}>{meta.startDate} → {meta.endDate}</div>
                      </div>
                      <div style={{display:'flex',gap:6,flexShrink:0}}>
                        <button onClick={()=>toggleAssignment(group)} disabled={!!toggling||!!removing} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                          {isToggling?<Spin/>:(meta.active?'Pause':'Resume')}
                        </button>
                        <button onClick={()=>removeAssignment(group)} disabled={!!toggling||!!removing} style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                          {isRemoving?<Spin/>:'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {pastGroups.length>0&&(
                <div style={{marginTop:28}}>
                  <div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Past Assignments ({pastGroups.length})</div>
                  {pastGroups.map(group=>{
                    const meta=groupMeta(group)
                    const [sc,sbg]=meta.removed?['#92400E','#FEF3C7']:['#374151','#F3F4F6']
                    return(
                      <div key={meta.assignmentId} style={{background:'#FAFAF8',borderRadius:14,padding:'14px 18px',border:'1.5px solid #F0EDE8',marginBottom:8,opacity:.65}}>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:34,height:34,borderRadius:10,background:'#F0EDE8',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>📁</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap'}}>
                              <span style={{fontWeight:600,fontSize:13,color:'#1A1A2E'}}>{meta.assignmentName||meta.folder}</span>
                              <span style={{fontSize:10,fontWeight:700,color:sc,background:sbg,borderRadius:20,padding:'1px 7px'}}>{meta.removed?'Removed':'Expired'}</span>
                            </div>
                            <div style={{fontSize:11,color:'#9B98B8'}}>{meta.templateName} · {meta.startDate} → {meta.endDate}</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab==='responses'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <span style={{fontSize:12,color:'#9B98B8'}}>From</span>
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{border:'1.5px solid #E5E0D8',borderRadius:8,padding:'6px 10px',fontSize:12,color:'#1A1A2E',background:'#fff'}}/>
              <span style={{fontSize:12,color:'#9B98B8'}}>To</span>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{border:'1.5px solid #E5E0D8',borderRadius:8,padding:'6px 10px',fontSize:12,color:'#1A1A2E',background:'#fff'}}/>
            </div>
            {clientResponses.length>0&&(
              <button onClick={exportCSV} style={{background:'#1A6644',color:'#fff',border:'none',borderRadius:12,padding:'9px 18px',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>↓ Export CSV</button>
            )}
          </div>
          {clientResponses.length===0&&(
            <div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0',background:'#fff',borderRadius:20,border:'1.5px solid #E8E3DA'}}>
              <div style={{fontSize:40,marginBottom:12}}>◈</div>
              <p style={{fontSize:15}}>No responses yet{(dateFrom||dateTo)?' in this date range':''}</p>
            </div>
          )}
          {clientResponses.length>0&&<>
            {Object.keys(byQuestion).filter(qId=>{const q=qInfo(qId);return q?.type==='scale'&&byQuestion[qId].length>=2}).length>0&&(
              <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20}}>
                <div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:16}}>Scale Trends</div>
                {Object.keys(byQuestion).filter(qId=>qInfo(qId)?.type==='scale').map((qId,idx)=>{
                  const q=qInfo(qId)
                  const data=getChartData(qId)
                  if(data.length<1)return null
                  const color=scaleColors[idx%scaleColors.length]
                  const latest=data[data.length-1]?.value
                  const avg=(data.reduce((s,d)=>s+d.value,0)/data.length).toFixed(1)
                  return(
                    <div key={qId} style={{marginBottom:24,paddingBottom:24,borderBottom:'1px solid #E8E4FF'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                        <p style={{fontSize:13,color:'#1A1A2E',fontWeight:600,margin:0,flex:1,lineHeight:1.4}}>{q?.text?.length>80?q.text.slice(0,80)+'…':q?.text}</p>
                        <div style={{display:'flex',gap:16,flexShrink:0,marginLeft:12}}>
                          <div style={{textAlign:'center'}}><div style={{fontFamily:"'Inter',sans-serif",fontWeight:700,fontSize:20,color}}>{latest}</div><div style={{fontSize:10,color:'#C8C0B0'}}>Latest</div></div>
                          <div style={{textAlign:'center'}}><div style={{fontFamily:"'Inter',sans-serif",fontWeight:700,fontSize:20,color:'#9B98B8'}}>{avg}</div><div style={{fontSize:10,color:'#C8C0B0'}}>Avg</div></div>
                        </div>
                      </div>
                      <MiniChart data={data} color={color} qId={qId}/>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA'}}>
              <div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:16}}>All Responses ({clientResponses.length})</div>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:'2px solid #E8E4FF'}}>
                      {['Date','Time','Question','Category','Answer'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'8px 12px',fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:.5,whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientResponses.map((r,i)=>{
                      const q=qInfo(r.questionId)
                      return(
                        <tr key={r.id} style={{borderBottom:'1px solid #E8E4FF',background:i%2===0?'#FAFAF8':'#fff'}}>
                          <td style={{padding:'10px 12px',color:'#6B6888',whiteSpace:'nowrap'}}>{r.date}</td>
                          <td style={{padding:'10px 12px',color:'#9B98B8',whiteSpace:'nowrap'}}>{r.ts?new Date(r.ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'-'}</td>
                          <td style={{padding:'10px 12px',color:'#1A1A2E',maxWidth:280}}><div style={{lineHeight:1.4}}>{q?.text||r.questionId}</div></td>
                          <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>{q?.category?<span style={{fontSize:11,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'2px 8px',fontWeight:600}}>{q.category}</span>:'-'}</td>
                          <td style={{padding:'10px 12px',fontWeight:600,color:'#1A1A2E',whiteSpace:'nowrap'}}>{r.answer}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>}
        </div>
      )}
    </div>
  )
}

// ── Clients View ──────────────────────────────────────────────────────────────
function ClientsView({questions}) {
  const [users,setUsers]=useState([]);const [schedules,setSchedules]=useState([]);const [loading,setLoading]=useState(true)
  const [selectedClient,setSelectedClient]=useState(null)
  const [search,setSearch]=useState('')
  useEffect(()=>{
    const u1=onSnapshot(collection(db,'users'),s=>{setUsers(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)})
    const u2=onSnapshot(collection(db,'schedules'),s=>{setSchedules(s.docs.map(d=>({id:d.id,...d.data()})))})
    return()=>{u1();u2()}
  },[])

  if(selectedClient)return<ClientProfileView client={selectedClient} questions={questions} onBack={()=>setSelectedClient(null)}/>

  return(
    <div>
      <div style={{marginBottom:28}}>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Clients</h2>
        <p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{users.length} enrolled client{users.length!==1?'s':''} · Click a client to view their profile</p>
      </div>
      {!loading&&users.length>0&&<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…" style={{...inp,marginBottom:16}}/>}
      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      {!loading&&users.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>◎</div><p style={{fontSize:15,fontWeight:500}}>No clients yet — send an invite to get started</p></div>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {(()=>{const filtered=users.filter(u=>!search||u.name?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase()));return filtered.length===0&&search?<div style={{textAlign:'center',padding:'40px 20px',color:'#C8C0B0'}}><p style={{fontSize:14,fontWeight:500}}>No clients found</p></div>:filtered.map(u=>{
          const userScheds=schedules.filter(s=>s.userId===u.id||s.userId==='all')
          const activeCount=userScheds.filter(s=>s.active).length
          return(
            <div key={u.id} style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1.5px solid #E8E3DA',display:'flex',alignItems:'center',gap:16,transition:'box-shadow .2s',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div onClick={()=>setSelectedClient(u)} style={{display:'flex',alignItems:'center',gap:16,flex:1,cursor:'pointer',minWidth:0}}>
                <div style={{width:42,height:42,borderRadius:14,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#6C63FF',flexShrink:0}}>{u.name?.split(' ').map(n=>n[0]).join('')||'?'}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:15,color:'#1A1A2E'}}>{u.name}</div>
                  <div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{u.email} · Joined {u.joinedDate}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <Badge status={u.status||'active'}/>
                  <div style={{fontSize:11,color:'#9B98B8',marginTop:5}}>{activeCount} active schedule{activeCount!==1?'s':''}</div>
                </div>
                <span style={{color:'#C8C0B0',fontSize:20}}>›</span>
              </div>
            </div>
          )
        })})()}
      </div>
    </div>
  )
}

// ── Team View ─────────────────────────────────────────────────────────────────
const ROLES = ['Super Admin', 'Admin', 'Viewer']

function TeamView() {
  const [members,setMembers]=useState([]); const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [formName,setFormName]=useState(''); const [formEmail,setFormEmail]=useState(''); const [formRole,setFormRole]=useState('Admin')
  const [creating,setCreating]=useState(false); const [createErr,setCreateErr]=useState(''); const [createDone,setCreateDone]=useState(null)
  const [editingMember,setEditingMember]=useState(null)
  const [editForm,setEditForm]=useState({role:'Admin',status:'active'})
  const [savingEdit,setSavingEdit]=useState(false)
  const [deleting,setDeleting]=useState(null)
  const [sendingReset,setSendingReset]=useState(false)
  const [resetDone,setResetDone]=useState(null)
  const seededRef=useRef(false)

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'adminUsers'),async snap=>{
      const docs=snap.docs.map(d=>({id:d.id,...d.data()}))
      setMembers(docs)
      setLoading(false)
      if(docs.length===0&&!seededRef.current){
        seededRef.current=true
        await setDoc(doc(db,'adminUsers','seed-justin-wallen'),{
          name:'Justin Wallen',email:'sylvia.precision.health@gmail.com',
          role:'Super Admin',status:'active',dateAdded:today(),addedBy:'System'
        })
      }
    })
    return unsub
  },[])

  async function saveEdit(){
    if(!editingMember)return
    setSavingEdit(true)
    await updateDoc(doc(db,'adminUsers',editingMember.id),{role:editForm.role,status:editForm.status})
    setSavingEdit(false)
    setEditingMember(null)
  }

  async function sendReset(member){
    setSendingReset(true); setResetDone(null)
    try{
      await sendPasswordResetEmail(auth, member.email)
      setResetDone({ok:true,email:member.email})
    }catch(e){
      setResetDone({ok:false,msg:e.code==='auth/user-not-found'?'No Auth account found for this email.':e.message||'Failed to send reset email.'})
    }
    setSendingReset(false)
  }

  async function removeMember(member){
    if(!window.confirm(`Remove ${member.name} from the team? This cannot be undone.`))return
    setDeleting(member.id)
    await deleteDoc(doc(db,'adminUsers',member.id))
    setDeleting(null)
    setEditingMember(null)
  }

  async function createMember(){
    if(!formName.trim()||!formEmail.includes('@'))return
    setCreating(true); setCreateErr('')
    const tempPassword=makeTempPassword()
    try{
      const res=await fetch('/api/create-team-member',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:formName.trim(),email:formEmail.trim(),role:formRole,tempPassword,addedBy:'Admin'})
      })
      const data=await res.json()
      if(!res.ok){setCreateErr(data.error||'Failed to create member');setCreating(false);return}
      setCreateDone({name:formName.trim(),email:formEmail.trim(),tempPassword})
    }catch(e){setCreateErr(e.message||'Network error')}
    setCreating(false)
  }

  function closeForm(){setShowForm(false);setFormName('');setFormEmail('');setFormRole('Admin');setCreateErr('');setCreateDone(null)}
  const formValid=formName.trim().length>1&&formEmail.includes('@')

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Team</h2>
          <p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{members.length} team member{members.length!==1?'s':''}</p>
        </div>
        <button onClick={()=>{setShowForm(true);setCreateDone(null)}} style={{background:'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer'}}>+ Add Member</button>
      </div>

      {/* Role notice banner */}
      <div style={{background:'#FEF3C7',border:'1.5px solid #FCD34D',borderRadius:14,padding:'12px 16px',marginBottom:20,display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:16}}>ℹ</span>
        <span style={{fontSize:13,color:'#92400E',lineHeight:1.5}}>Role-based permissions are coming soon. All team members currently have full access.</span>
      </div>

      {/* Add Member Form */}
      {showForm&&!createDone&&(
        <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .3s ease'}}>
          <h3 style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:16}}>Add Team Member</h3>
          <Field label="Full Name"><input value={formName} onChange={e=>setFormName(e.target.value)} placeholder="e.g. Sarah Chen" style={inp}/></Field>
          <Field label="Email"><input type="email" value={formEmail} onChange={e=>setFormEmail(e.target.value)} placeholder="sarah@example.com" style={inp}/></Field>
          <Field label="Role">
            <div style={{display:'flex',gap:8}}>
              {ROLES.map(r=>(
                <button key={r} onClick={()=>setFormRole(r)} style={{flex:1,padding:'10px 8px',borderRadius:12,border:`2px solid ${formRole===r?'#6C63FF':'#E5E0D8'}`,background:formRole===r?'#EDE9FE':'#FAFAF8',color:formRole===r?'#6C63FF':'#9B98B8',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                  {r}
                </button>
              ))}
            </div>
          </Field>
          {createErr&&<p style={{color:'#EF4444',fontSize:12,marginBottom:12,lineHeight:1.5}}>{createErr}</p>}
          <div style={{display:'flex',gap:10}}>
            <button onClick={closeForm} style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            <button onClick={createMember} disabled={!formValid||creating} style={{flex:2,padding:11,borderRadius:12,border:'none',background:formValid?'#1A1A2E':'#E5E0D8',color:formValid?'#E8E4FF':'#9B98B8',fontSize:14,fontWeight:700,cursor:formValid?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {creating?<Spin/>:'Create & Send Invite'}
            </button>
          </div>
        </div>
      )}

      {/* Success state */}
      {showForm&&createDone&&(
        <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,textAlign:'center',animation:'fadeUp .3s ease'}}>
          <div style={{fontSize:32,marginBottom:12}}>✓</div>
          <div style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:4}}>{createDone.name} added</div>
          <div style={{fontSize:13,color:'#9B98B8',marginBottom:16}}>{createDone.email}</div>
          <div style={{background:'#F4F1EC',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'inline-block'}}>
            <div style={{fontSize:11,color:'#9B98B8',marginBottom:4,letterSpacing:1}}>TEMPORARY PASSWORD</div>
            <div style={{fontFamily:'monospace',fontSize:16,fontWeight:700,color:'#1A1A2E',letterSpacing:2}}>{createDone.tempPassword}</div>
          </div>
          <p style={{fontSize:12,color:'#C8C0B0',marginBottom:16}}>A welcome email has been sent with login instructions.</p>
          <button onClick={closeForm} style={{padding:'9px 24px',borderRadius:12,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:13,fontWeight:700,cursor:'pointer'}}>Done</button>
        </div>
      )}

      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {members.map(m=>(
          editingMember?.id===m.id?(
            <div key={m.id} style={{background:'#fff',borderRadius:18,padding:22,border:'1.5px solid #6C63FF',boxShadow:'0 0 0 1px rgba(108,99,255,.12)',animation:'fadeUp .2s ease'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
                <div style={{width:42,height:42,borderRadius:14,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#6C63FF',flexShrink:0}}>{m.name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}</div>
                <div style={{flex:1}}><div style={{fontWeight:700,fontSize:15,color:'#1A1A2E'}}>{m.name}</div><div style={{fontSize:12,color:'#9B98B8'}}>{m.email}</div></div>
                <button onClick={()=>{setEditingMember(null);setResetDone(null)}} style={{background:'none',border:'1.5px solid #E5E0D8',borderRadius:8,padding:'5px 12px',fontSize:12,color:'#6B6888',cursor:'pointer'}}>Cancel</button>
              </div>
              <Field label="Role">
                <div style={{display:'flex',gap:8}}>
                  {ROLES.map(r=><button key={r} onClick={()=>setEditForm(f=>({...f,role:r}))} style={{flex:1,padding:'9px 6px',borderRadius:10,border:`2px solid ${editForm.role===r?'#6C63FF':'#E5E0D8'}`,background:editForm.role===r?'#EDE9FE':'#FAFAF8',color:editForm.role===r?'#6C63FF':'#9B98B8',fontSize:12,fontWeight:600,cursor:'pointer'}}>{r}</button>)}
                </div>
              </Field>
              <Field label="Status">
                <div style={{display:'flex',gap:8}}>
                  {['active','inactive'].map(s=><button key={s} onClick={()=>setEditForm(f=>({...f,status:s}))} style={{flex:1,padding:'9px 6px',borderRadius:10,border:`2px solid ${editForm.status===s?'#1A1A2E':'#E5E0D8'}`,background:editForm.status===s?'#1A1A2E':'#FAFAF8',color:editForm.status===s?'#E8E4FF':'#9B98B8',fontSize:12,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{s}</button>)}
                </div>
              </Field>
              <button onClick={saveEdit} disabled={savingEdit} style={{width:'100%',padding:11,borderRadius:12,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {savingEdit?<Spin/>:'Save Changes'}
              </button>
              <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid #F0EDE8',display:'flex',flexDirection:'column',gap:10}}>
                <button onClick={()=>sendReset(m)} disabled={sendingReset} style={{width:'100%',padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {sendingReset?<Spin/>:'Send Password Reset Email'}
                </button>
                {resetDone&&(
                  <div style={{borderRadius:10,padding:'9px 14px',background:resetDone.ok?'#ECFDF5':'#FEF2F2',border:`1px solid ${resetDone.ok?'#A7F3D0':'#FECACA'}`,fontSize:12,color:resetDone.ok?'#065F46':'#B91C1C',textAlign:'center'}}>
                    {resetDone.ok?`Reset email sent to ${resetDone.email}`:resetDone.msg}
                  </div>
                )}
                <button onClick={()=>removeMember(m)} disabled={deleting===m.id} style={{width:'100%',padding:11,borderRadius:12,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:14,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {deleting===m.id?<Spin/>:'Remove Member'}
                </button>
              </div>
            </div>
          ):(
            <div key={m.id} style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1.5px solid #E8E3DA',display:'flex',alignItems:'center',gap:16,boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div style={{width:42,height:42,borderRadius:14,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#6C63FF',flexShrink:0}}>
                {m.name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:15,color:'#1A1A2E'}}>{m.name}</span>
                  <RoleBadge role={m.role}/>
                  <Badge status={m.status||'active'}/>
                </div>
                <div style={{fontSize:12,color:'#9B98B8'}}>{m.email}{m.dateAdded&&<> · Added {m.dateAdded}</>}</div>
              </div>
              <button onClick={()=>{setEditingMember(m);setEditForm({role:m.role||'Admin',status:m.status||'active'})}} style={{padding:'6px 14px',borderRadius:8,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>Edit</button>
            </div>
          )
        ))}
      </div>
    </div>
  )
}

// ── Invites View ──────────────────────────────────────────────────────────────
function InvitesView() {
  const [invites,setInvites]=useState([]); const [loading,setLoading]=useState(true); const [copied,setCopied]=useState(null)
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [creating,setCreating]=useState(false); const [done,setDone]=useState(null); const [showForm,setShowForm]=useState(false); const [emailSent,setEmailSent]=useState(null)
  const [search,setSearch]=useState('')
  const [menuOpen,setMenuOpen]=useState(null)
  const [resending,setResending]=useState(null)
  const [resendResult,setResendResult]=useState({})

  useEffect(()=>{ const unsub=onSnapshot(collection(db,'invites'),snap=>{setInvites(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false)}); return unsub },[])

  async function sendWelcomeEmail(recipientName, recipientEmail, code) {
    try {
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: recipientName, email: recipientEmail, code })
      })
      const text = await res.text()
      console.log('send-invite raw response:', res.status, text)
      let data = null
      try { data = JSON.parse(text) } catch { data = null }
      if(!res.ok) {
        const msg = data?.error || text || `HTTP ${res.status}`
        console.error('send-invite error:', res.status, data ?? text)
        setEmailSent(`HTTP ${res.status}: ${msg}`)
      } else {
        console.log('Email sent:', data)
        setEmailSent('sent')
      }
    } catch(e) {
      console.error('send-invite fetch error:', e)
      setEmailSent(e.message || String(e))
    }
  }

  async function create() {
    setCreating(true); setEmailSent(null)
    const code=makeCode()
    const trimmedName=name.trim(), trimmedEmail=email.trim()
    await setDoc(doc(db,'invites',code),{code,name:trimmedName,email:trimmedEmail,used:false,userId:null,createdAt:today()})
    setDone({code,name:trimmedName,email:trimmedEmail})
    setCreating(false)
    sendWelcomeEmail(trimmedName, trimmedEmail, code)
  }

  async function deleteInvite(inv) {
    if(!window.confirm(`Delete invite for ${inv.name}? This cannot be undone.`)) return
    await deleteDoc(doc(db,'invites',inv.id))
    setMenuOpen(null)
  }

  async function resendEmail(inv){
    setResending(inv.id)
    try{
      const res=await fetch('/api/send-invite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:inv.name,email:inv.email,code:inv.code})})
      setResendResult(s=>({...s,[inv.id]:res.ok?'sent':'error'}))
      setTimeout(()=>setResendResult(s=>({...s,[inv.id]:null})),3000)
    }catch(e){setResendResult(s=>({...s,[inv.id]:'error'}))}
    setResending(null)
  }

  function copy(code){navigator.clipboard?.writeText(code); setCopied(code); setTimeout(()=>setCopied(null),2000)}
  const valid=name.trim().length>1&&email.includes('@')
  const matchesSearch=i=>!search||i.name?.toLowerCase().includes(search.toLowerCase())||i.email?.toLowerCase().includes(search.toLowerCase())
  const pending=invites.filter(i=>!i.used&&matchesSearch(i)), used=invites.filter(i=>i.used&&matchesSearch(i))

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div><h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Client Invites</h2><p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{pending.length} pending · {used.length} accepted</p></div>
        <button onClick={()=>{setShowForm(true);setDone(null);setName('');setEmail('')}} style={{background:'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer'}}>+ New Invite</button>
      </div>
      {showForm&&!done&&(
        <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .3s ease'}}>
          <h3 style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:16}}>New Invite</h3>
          <Field label="Client Name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Jordan Ellis" style={inp}/></Field>
          <Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jordan@example.com" style={inp}/></Field>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setShowForm(false)} style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            <button onClick={create} disabled={!valid||creating} style={{flex:2,padding:11,borderRadius:12,border:'none',background:valid?'#1A1A2E':'#E5E0D8',color:valid?'#E8E4FF':'#9B98B8',fontSize:14,fontWeight:700,cursor:valid?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{creating?<Spin/>:'Generate Code'}</button>
          </div>
        </div>
      )}
      {showForm&&done&&(
        <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,textAlign:'center'}}>
          <div style={{fontSize:11,color:'#9B98B8',marginBottom:6,letterSpacing:1}}>INVITE CREATED FOR</div>
          <div style={{fontWeight:700,fontSize:16,color:'#1A1A2E'}}>{done.name}</div>
          <div style={{fontSize:12,color:'#9B98B8',marginBottom:16}}>{done.email}</div>
          <div style={{background:'#1A1A2E',borderRadius:12,padding:'14px 20px',display:'inline-block',marginBottom:12}}>
            <span style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:22,color:'#A89FFF',letterSpacing:3}}>{done.code}</span>
          </div>
          <p style={{fontSize:12,color:'#C8C0B0',marginBottom:12}}>Share this code — client enters it in the Sylvia app to register</p>
          <div style={{fontSize:12,marginBottom:16,minHeight:20}}>
            {emailSent===null&&<span style={{color:'#9B98B8'}}>Sending welcome email…</span>}
            {emailSent==='sent'&&<span style={{color:'#1A6644'}}>✓ Welcome email sent to {done.email}</span>}
            {emailSent&&emailSent!=='sent'&&<span style={{color:'#EF4444'}}>Email error: {emailSent}</span>}
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}>
            <button onClick={()=>copy(done.code)} style={{padding:'8px 20px',borderRadius:10,border:'1.5px solid #E5E0D8',background:copied===done.code?'#D1FAE5':'#fff',color:copied===done.code?'#1A6644':'#6B6888',fontSize:13,fontWeight:600,cursor:'pointer'}}>{copied===done.code?'Copied!':'Copy Code'}</button>
            <button onClick={()=>{setShowForm(false);setDone(null);setEmailSent(null)}} style={{padding:'8px 20px',borderRadius:10,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:13,fontWeight:700,cursor:'pointer'}}>Done</button>
          </div>
        </div>
      )}
      {!loading&&invites.length>0&&<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…" style={{...inp,marginBottom:16}}/>}
      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      {!loading&&pending.length>0&&<><div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Pending</div>
        {pending.map(inv=>(
          <div key={inv.id} style={{background:'#fff',borderRadius:16,border:'1.5px solid #E8E3DA',marginBottom:10,overflow:'hidden'}}>
            <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:38,height:38,borderRadius:10,background:'#DBEAFE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>✉</div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{inv.name}</div><div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{inv.email} · {inv.createdAt}</div></div>
              <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                <div style={{background:'#E8E4FF',borderRadius:8,padding:'5px 10px',fontWeight:700,fontSize:12,color:'#6B6888',letterSpacing:1.5}}>{inv.code}</div>
                <button onClick={()=>setMenuOpen(menuOpen===inv.id?null:inv.id)} style={{padding:'5px 10px',borderRadius:8,border:'1.5px solid #E5E0D8',background:menuOpen===inv.id?'#F4F1EC':'#fff',color:'#6B6888',fontSize:16,fontWeight:700,cursor:'pointer',lineHeight:1}}>⋯</button>
              </div>
            </div>
            {menuOpen===inv.id&&(
              <div style={{padding:'10px 16px 14px',borderTop:'1px solid #F0EDE8',background:'#FAFAF8',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                <button onClick={()=>{copy(inv.code);setMenuOpen(null)}} style={{padding:'6px 14px',borderRadius:8,border:'1.5px solid #E5E0D8',background:copied===inv.code?'#D1FAE5':'#fff',color:copied===inv.code?'#1A6644':'#6B6888',fontSize:12,fontWeight:600,cursor:'pointer'}}>{copied===inv.code?'✓ Copied':'Copy Code'}</button>
                <button onClick={()=>resendEmail(inv)} disabled={resending===inv.id} style={{padding:'6px 14px',borderRadius:8,border:'1.5px solid #E5E0D8',background:resendResult[inv.id]==='sent'?'#D1FAE5':'#fff',color:resendResult[inv.id]==='sent'?'#1A6644':'#6B6888',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                  {resending===inv.id?<><Spin/> Sending…</>:resendResult[inv.id]==='sent'?'✓ Email Sent':'Resend Email'}
                </button>
                <button onClick={()=>deleteInvite(inv)} style={{padding:'6px 14px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:12,fontWeight:600,cursor:'pointer',marginLeft:'auto'}}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </>}
      {!loading&&used.length>0&&<div style={{marginTop:pending.length?20:0}}><div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Accepted</div>
        {used.map(inv=>(
          <div key={inv.id} style={{background:'#fff',borderRadius:16,border:'1.5px solid #E8E3DA',marginBottom:10,overflow:'hidden',opacity:.65}}>
            <div style={{padding:'14px 20px',display:'flex',alignItems:'center',gap:14}}>
              <div style={{width:38,height:38,borderRadius:10,background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>✓</div>
              <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{inv.name}</div><div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{inv.email}</div></div>
              <Badge status="active"/>
              <button onClick={()=>setMenuOpen(menuOpen===inv.id?null:inv.id)} style={{padding:'5px 10px',borderRadius:8,border:'1.5px solid #E5E0D8',background:menuOpen===inv.id?'#F4F1EC':'#fff',color:'#6B6888',fontSize:16,fontWeight:700,cursor:'pointer',lineHeight:1}}>⋯</button>
            </div>
            {menuOpen===inv.id&&(
              <div style={{padding:'10px 16px 14px',borderTop:'1px solid #F0EDE8',background:'#FAFAF8',display:'flex',gap:8}}>
                <button onClick={()=>deleteInvite(inv)} style={{padding:'6px 14px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:12,fontWeight:600,cursor:'pointer'}}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>}
    </div>
  )
}

// ── Modules View ──────────────────────────────────────────────────────────────
function ModulesView() {
  const [questions,setQuestions]=useState([]); const [moduleList,setModuleList]=useState([]); const [users,setUsers]=useState([]); const [templates,setTemplates]=useState([]); const [loading,setLoading]=useState(true)
  const [showNewModuleForm,setShowNewModuleForm]=useState(false)
  const [newModuleName,setNewModuleName]=useState(''); const [newModuleDesc,setNewModuleDesc]=useState(''); const [savingModule,setSavingModule]=useState(false)
  const [selectedModule,setSelectedModule]=useState(null)
  const [renamingModule,setRenamingModule]=useState(false); const [renameValue,setRenameValue]=useState(''); const [savingRename,setSavingRename]=useState(false)
  const [editing,setEditing]=useState(null); const [showForm,setShowForm]=useState(false)
  const [catFilter,setCatFilter]=useState('All'); const [search,setSearch]=useState('')
  const [form,setForm]=useState({type:'scale',text:'',scaleMin:0,scaleMax:100,scaleMinLabel:'Not at all',scaleMaxLabel:'More than I ever have',options:'',category:'General',mechanism:'',folder:''})
  const [saving,setSaving]=useState(false)
  const [assignTarget,setAssignTarget]=useState(null); const [assigning,setAssigning]=useState(null); const [assignSuccess,setAssignSuccess]=useState(null); const [assignSearch,setAssignSearch]=useState('')
  const [assignStep,setAssignStep]=useState(1); const [assignUser,setAssignUser]=useState(null); const [selectedTemplate,setSelectedTemplate]=useState(null); const [assignStartDate,setAssignStartDate]=useState(today())
  const isMobile=useMobile()

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'questions'),snap=>{setQuestions(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false)})
    const u2=onSnapshot(collection(db,'users'),snap=>setUsers(snap.docs.map(d=>({id:d.id,...d.data()}))))
    const u3=onSnapshot(collection(db,'scheduleTemplates'),snap=>setTemplates(snap.docs.map(d=>({id:d.id,...d.data()}))))
    const u4=onSnapshot(collection(db,'modules'),snap=>setModuleList(snap.docs.map(d=>({id:d.id,...d.data()}))))
    return()=>{u1();u2();u3();u4()}
  },[])

  const folderMap={}
  questions.forEach(q=>{const f=q.folder||'Uncategorized'; if(!folderMap[f])folderMap[f]=[]; folderMap[f].push(q)})
  const allModuleNames=Array.from(new Set([...moduleList.map(m=>m.name),...Object.keys(folderMap)])).sort()
  function getModuleDoc(name){return moduleList.find(m=>m.name===name)||null}

  async function createModule(){
    if(!newModuleName.trim())return
    setSavingModule(true)
    const ref=await addDoc(collection(db,'modules'),{name:newModuleName.trim(),description:newModuleDesc.trim(),createdAt:today()})
    await updateDoc(doc(db,'modules',ref.id),{id:ref.id})
    setSavingModule(false); setShowNewModuleForm(false); setNewModuleName(''); setNewModuleDesc('')
  }

  async function saveRename(){
    if(!renameValue.trim()||renameValue.trim()===selectedModule.name)return
    setSavingRename(true)
    const oldName=selectedModule.name; const newName=renameValue.trim()
    const modDoc=getModuleDoc(oldName)
    if(modDoc) await updateDoc(doc(db,'modules',modDoc.id),{name:newName})
    else{const ref=await addDoc(collection(db,'modules'),{name:newName,description:'',createdAt:today()}); await updateDoc(doc(db,'modules',ref.id),{id:ref.id})}
    for(const q of questions.filter(q=>q.folder===oldName)) await updateDoc(doc(db,'questions',q.id),{folder:newName,module:newName})
    setSelectedModule(s=>({...s,name:newName}))
    setRenamingModule(false); setSavingRename(false)
  }

  function openNewQuestion(){setEditing(null);setForm({type:'scale',text:'',scaleMin:0,scaleMax:100,scaleMinLabel:'Not at all',scaleMaxLabel:'More than I ever have',options:'',category:'General',mechanism:'',folder:selectedModule?.name||''});setShowForm(true)}
  function openEdit(q){setEditing(q);setForm({...q,options:q.options?.join('\n')||''});setShowForm(true)}

  async function saveQuestion(){
    if(!form.text.trim())return; setSaving(true)
    const data={...form,scaleMin:+form.scaleMin,scaleMax:+form.scaleMax,options:form.type==='choice'?form.options.split('\n').map(s=>s.trim()).filter(Boolean):[],scheduled:editing?.scheduled||[],module:form.folder}
    if(editing){await setDoc(doc(db,'questions',editing.id),data,{merge:true})}
    else{const ref=await addDoc(collection(db,'questions'),data);await updateDoc(doc(db,'questions',ref.id),{id:ref.id})}
    setShowForm(false); setSaving(false); setEditing(null)
  }

  async function delQuestion(id){await deleteDoc(doc(db,'questions',id))}

  function closeAssignModal(){setAssignTarget(null);setAssignSuccess(null);setAssignSearch('');setAssignStep(1);setAssignUser(null);setSelectedTemplate(null);setAssignStartDate(today())}

  function tSummary(t){
    if(!t)return''
    if(t.type==='custom_interval')return`Every ${t.intervalHours}h from ${(t.times||['08:00'])[0]}`
    if(t.type==='weekly')return`${(t.days||[]).join(', ')} at ${(t.times||['09:00'])[0]}`
    return(t.times||[]).join(' · ')
  }

  async function confirmAssign(){
    if(!selectedTemplate)return
    setAssigning(assignUser.id)
    try{
      const startDate=assignStartDate||today()
      const durDays=selectedTemplate.defaultDuration||15
      const end=new Date(startDate); end.setDate(end.getDate()+durDays-1)
      const endDate=end.toISOString().split('T')[0]
      const assignmentId=Date.now().toString(36)+Math.random().toString(36).slice(2,6)
      const assignmentName=`${assignTarget} — ${startDate} — ${selectedTemplate.name}`
      let timesToCreate=[...(selectedTemplate.times||['09:00'])],extraFields={}
      if(selectedTemplate.type==='weekly'){extraFields={repeat:'Weekly',days:selectedTemplate.days||[]}}
      else if(selectedTemplate.type==='custom_interval'){timesToCreate=[(selectedTemplate.times||['08:00'])[0]];extraFields={mode:'interval',interval:selectedTemplate.intervalHours||4,repeat:'Custom interval'}}
      for(const time of timesToCreate){
        const ref=await addDoc(collection(db,'schedules'),{
          questionId:'__ALL__',userId:assignUser.id,time,
          repeat:'Daily',interval:null,mode:'time',
          startDate,endDate,durationDays:durDays,
          active:true,removed:false,
          folder:assignTarget,assignmentId,assignmentName,
          templateId:selectedTemplate.id,templateName:selectedTemplate.name,...extraFields
        })
        await updateDoc(doc(db,'schedules',ref.id),{id:ref.id})
      }
      setAssignSuccess(assignUser.id)
    }catch(e){alert('Error: '+e.message)}
    setAssigning(null)
  }

  // Question Form Panel
  const FormPanel=(
    <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .3s ease'}}>
      <h3 style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:16}}>{editing?'Edit Question':'New Question'}</h3>
      <Field label="Type"><div style={{display:'flex',gap:8}}>{Q_TYPES.map(qt=><button key={qt.id} onClick={()=>setForm(f=>({...f,type:qt.id}))} style={{flex:1,padding:'10px 8px',borderRadius:12,border:`2px solid ${form.type===qt.id?'#6C63FF':'#E5E0D8'}`,background:form.type===qt.id?'#EDE9FE':'#FAFAF8',cursor:'pointer',textAlign:'center'}}><div style={{fontSize:16,marginBottom:4,color:form.type===qt.id?'#6C63FF':'#9B98B8'}}>{qt.icon}</div><div style={{fontSize:11,fontWeight:600,color:form.type===qt.id?'#6C63FF':'#9B98B8'}}>{qt.label}</div></button>)}</div></Field>
      <Field label="Question Text"><textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} rows={3} placeholder="Enter question…" style={{...inp,lineHeight:1.6,resize:'none'}}/></Field>
      {form.type==='scale'&&<div style={{background:'#FAFAF8',borderRadius:14,padding:16,border:'1px solid #E5E0D8',marginBottom:18}}><Lbl>Scale Range</Lbl><div style={{display:'flex',gap:12,marginBottom:12,flexDirection:isMobile?'column':'row'}}>{[['Min','scaleMin'],['Max','scaleMax']].map(([l,k])=><div key={k} style={{flex:1}}><div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>{l}</div><input type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{...inp,padding:'8px 10px',borderRadius:8}}/></div>)}</div><div style={{display:'flex',gap:12,flexDirection:isMobile?'column':'row'}}>{[['Min Label','scaleMinLabel','e.g. Not at all'],['Max Label','scaleMaxLabel','e.g. Extremely']].map(([l,k,p])=><div key={k} style={{flex:1}}><div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>{l}</div><input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={p} style={{...inp,padding:'8px 10px',borderRadius:8,fontSize:13}}/></div>)}</div></div>}
      {form.type==='choice'&&<Field label="Options (one per line)"><textarea value={form.options} onChange={e=>setForm(f=>({...f,options:e.target.value}))} rows={5} placeholder={'Very well\nWell\nOkay\nPoorly\nTerribly'} style={{...inp,lineHeight:1.8,resize:'none'}}/></Field>}
      <Field label="Module (folder)"><input value={form.folder||''} onChange={e=>setForm(f=>({...f,folder:e.target.value}))} placeholder="e.g. Book EMA" style={inp}/></Field>
      <Field label="Category"><input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. Cognitive Mechanisms" style={inp}/></Field>
      <Field label="Mechanism (optional)"><input value={form.mechanism} onChange={e=>setForm(f=>({...f,mechanism:e.target.value}))} placeholder="e.g. Body dissatisfaction" style={inp}/></Field>
      <div style={{display:'flex',gap:10}}>
        <button onClick={()=>{setShowForm(false);setEditing(null)}} style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
        <button onClick={saveQuestion} disabled={!form.text.trim()||saving} style={{flex:2,padding:11,borderRadius:12,border:'none',background:form.text.trim()?'#1A1A2E':'#E5E0D8',color:form.text.trim()?'#E8E4FF':'#9B98B8',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{saving?<Spin/>:(editing?'Save Changes':'Add Question')}</button>
      </div>
      {editing&&<div style={{marginTop:16,paddingTop:16,borderTop:'1px solid #F0EDE8'}}><button onClick={async()=>{if(window.confirm('Delete this question? This cannot be undone.')){await delQuestion(editing.id);setShowForm(false);setEditing(null)}}} style={{width:'100%',padding:11,borderRadius:12,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:14,fontWeight:600,cursor:'pointer'}}>Delete Question</button></div>}
    </div>
  )

  // Assign Modal (two-step: pick client → configure schedule)
  const AssignModal = assignTarget && (
    <div style={{position:'fixed',inset:0,background:'rgba(10,10,20,.7)',backdropFilter:'blur(6px)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#E8E4FF',borderRadius:24,width:'100%',maxWidth:480,boxShadow:'0 32px 80px rgba(0,0,0,.2)',animation:'pop .25s ease',maxHeight:'85vh',display:'flex',flexDirection:'column'}}>
        <div style={{background:'#1A1A2E',borderRadius:'24px 24px 0 0',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontWeight:700,fontSize:17,color:'#E8E4FF'}}>{assignStep===1?'Assign to Client':'Configure Schedule'}</div>
            <div style={{fontSize:12,color:'#6B6888',marginTop:2}}>{assignStep===1?`"${assignTarget}"`:assignUser?.name+` · "${assignTarget}"`}</div>
          </div>
          <button onClick={closeAssignModal} style={{background:'#FFFFFF1A',border:'none',color:'#E8E4FF',borderRadius:10,padding:'8px 14px',fontSize:13,cursor:'pointer'}}>Close</button>
        </div>

        {assignStep===1&&<>
          <div style={{padding:'14px 20px',borderBottom:'1px solid #D8D3F0',flexShrink:0}}>
            <input value={assignSearch} onChange={e=>setAssignSearch(e.target.value)} placeholder="Search by name or email…" style={{...inp,margin:0}}/>
          </div>
          <div style={{padding:'14px 20px',overflowY:'auto'}}>
            {users.length===0&&<div style={{textAlign:'center',padding:30,color:'#C8C0B0'}}>No clients found.</div>}
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {users.filter(u=>!assignSearch||u.name?.toLowerCase().includes(assignSearch.toLowerCase())||u.email?.toLowerCase().includes(assignSearch.toLowerCase())).map(u=>(
                <div key={u.id} style={{background:'#fff',borderRadius:14,padding:'12px 16px',border:'1.5px solid #E8E3DA',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:38,height:38,borderRadius:10,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:14,color:'#6C63FF',flexShrink:0}}>{u.name?.split(' ').map(n=>n[0]).join('')||'?'}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{u.name}</div>
                    <div style={{fontSize:12,color:'#9B98B8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                  </div>
                  <button onClick={()=>{setAssignUser(u);setAssignStep(2);setSelectedTemplate(templates.find(t=>t.isDefault)||templates[0]||null)}} style={{padding:'7px 14px',borderRadius:10,border:'none',background:'#6C63FF',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0}}>
                    Assign →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>}

        {assignStep===2&&<div style={{padding:'20px',overflowY:'auto',flex:1}}>
          {assignSuccess===assignUser?.id?(
            <div style={{textAlign:'center',padding:'32px 20px'}}>
              <div style={{fontSize:36,marginBottom:10}}>✓</div>
              <div style={{fontWeight:700,fontSize:17,color:'#1A6644',marginBottom:6}}>Schedule Assigned</div>
              <div style={{fontSize:13,color:'#6B6888',marginBottom:20,lineHeight:1.6}}>
                {assignUser.name}<br/>
                {selectedTemplate?.name} · {selectedTemplate?.defaultDuration} days
              </div>
              <button onClick={closeAssignModal} style={{padding:'10px 28px',borderRadius:12,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:14,fontWeight:700,cursor:'pointer'}}>Done</button>
            </div>
          ):(
            <>
              <div style={{fontSize:10,fontWeight:700,color:'#6B6888',letterSpacing:1,textTransform:'uppercase',marginBottom:12}}>Choose Schedule Template</div>
              {templates.length===0&&<div style={{textAlign:'center',padding:'30px 20px',color:'#C8C0B0',fontSize:13,lineHeight:1.6}}>No templates yet.<br/>Create one in the Schedule tab first.</div>}
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                {templates.map(t=>(
                  <div key={t.id} onClick={()=>setSelectedTemplate(t)} style={{background:'#fff',borderRadius:14,padding:'14px 16px',border:`1.5px solid ${selectedTemplate?.id===t.id?'#6C63FF':'#E8E3DA'}`,cursor:'pointer',transition:'border-color .15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                          <span style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{t.name}</span>
                          {t.isDefault&&<span style={{fontSize:10,fontWeight:700,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'1px 7px'}}>DEFAULT</span>}
                        </div>
                        <div style={{fontSize:12,color:'#6B6888',marginBottom:2}}>{tSummary(t)}</div>
                        <div style={{fontSize:11,color:'#9B98B8'}}>{t.defaultDuration} days</div>
                      </div>
                      <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${selectedTemplate?.id===t.id?'#6C63FF':'#D1D5DB'}`,background:selectedTemplate?.id===t.id?'#6C63FF':'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {selectedTemplate?.id===t.id&&<div style={{width:8,height:8,borderRadius:'50%',background:'#fff'}}/>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:700,color:'#6B6888',letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>Start Date</div>
                <input type="date" value={assignStartDate} onChange={e=>setAssignStartDate(e.target.value)} style={{...inp,padding:'8px 12px',borderRadius:10,width:'auto'}}/>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>{setAssignStep(1);setAssignUser(null)}} style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:14,fontWeight:600,cursor:'pointer'}}>← Back</button>
                <button onClick={confirmAssign} disabled={!!assigning||!selectedTemplate} style={{flex:2,padding:11,borderRadius:12,border:'none',background:selectedTemplate&&!assigning?'#6C63FF':'#E5E0D8',color:selectedTemplate&&!assigning?'#fff':'#9B98B8',fontSize:14,fontWeight:700,cursor:selectedTemplate&&!assigning?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {assigning===assignUser?.id?<Spin/>:'Confirm & Assign'}
                </button>
              </div>
            </>
          )}
        </div>}
      </div>
    </div>
  )

  // ── Module Detail View ────────────────────────────────────────────────────────
  if(selectedModule){
    const moduleQs=folderMap[selectedModule.name]||[]
    const cats=['All',...Array.from(new Set(moduleQs.map(q=>q.category||'General')))]
    const filtered=moduleQs.filter(q=>{
      const mc=catFilter==='All'||(q.category||'General')===catFilter
      const ms=!search||q.text?.toLowerCase().includes(search.toLowerCase())||(q.mechanism||'').toLowerCase().includes(search.toLowerCase())
      return mc&&ms
    })
    return(
      <div>
        {AssignModal}
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,flexWrap:'wrap'}}>
          <button onClick={()=>{setSelectedModule(null);setShowForm(false);setEditing(null);setRenamingModule(false)}} style={{background:'none',border:'1.5px solid #E5E0D8',borderRadius:10,padding:'8px 14px',fontSize:13,color:'#6B6888',cursor:'pointer',fontWeight:600,flexShrink:0}}>← Modules</button>
          <div style={{flex:1,minWidth:0}}>
            {renamingModule?(
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <input value={renameValue} onChange={e=>setRenameValue(e.target.value)} style={{...inp,padding:'7px 12px',fontSize:16,fontWeight:700,flex:1}} onKeyDown={e=>e.key==='Enter'&&saveRename()} autoFocus/>
                <button onClick={saveRename} disabled={savingRename} style={{padding:'7px 14px',borderRadius:10,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',gap:4}}>{savingRename?<Spin/>:'Save'}</button>
                <button onClick={()=>setRenamingModule(false)} style={{padding:'7px 12px',borderRadius:10,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:12,cursor:'pointer',flexShrink:0}}>Cancel</button>
              </div>
            ):(
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:22,color:'#1A1A2E',margin:0}}>{selectedModule.name}</h2>
                <button onClick={()=>{setRenamingModule(true);setRenameValue(selectedModule.name)}} style={{padding:'4px 10px',borderRadius:8,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:11,fontWeight:600,cursor:'pointer',flexShrink:0}}>Rename</button>
              </div>
            )}
            <p style={{fontSize:13,color:'#9B98B8',margin:'2px 0 0'}}>{filtered.length} of {moduleQs.length} questions</p>
          </div>
          <button onClick={()=>{setAssignTarget(selectedModule.name);setAssignSuccess(null);setAssignSearch('');setAssignStep(1);setAssignUser(null)}} style={{background:'#6C63FF',color:'#fff',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer',flexShrink:0}}>Assign to Client</button>
          <button onClick={openNewQuestion} style={{background:'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer',flexShrink:0}}>+ Add Question</button>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions or mechanisms…" style={{...inp,marginBottom:14}}/>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
          {cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${catFilter===c?'#1A1A2E':'#E5E0D8'}`,background:catFilter===c?'#1A1A2E':'#fff',color:catFilter===c?'#E8E4FF':'#9B98B8',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{c}</button>)}
        </div>
        {showForm&&FormPanel}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {filtered.map(q=>(
            <div key={q.id} style={{background:'#fff',borderRadius:18,padding:'20px 22px',border:'1.5px solid #E8E3DA'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}><TBadge type={q.type}/>{q.category&&q.category!=='General'&&<span style={{fontSize:11,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'3px 10px',fontWeight:600}}>{q.category}</span>}{q.mechanism&&<span style={{fontSize:11,color:'#9B98B8'}}>{q.mechanism}</span>}</div>
                  <p style={{fontSize:15,color:'#1A1A2E',lineHeight:1.5,fontWeight:500,margin:0}}>{q.text}</p>
                  {q.type==='scale'&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}><span style={{fontSize:11,color:'#9B98B8'}}>{q.scaleMinLabel||q.scaleMin}</span><div style={{width:80,height:3,background:'linear-gradient(90deg,#6C63FF,#A89FFF)',borderRadius:4}}/><span style={{fontSize:11,color:'#9B98B8'}}>{q.scaleMaxLabel||q.scaleMax}</span></div>}
                  {q.type==='choice'&&q.options?.length>0&&<div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>{q.options.map(o=><span key={o} style={{fontSize:11,color:'#6B6888',background:'#E8E4FF',borderRadius:20,padding:'3px 10px'}}>{o}</span>)}</div>}
                </div>
                <button onClick={()=>openEdit(q)} style={{padding:'7px 14px',borderRadius:10,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>Edit</button>
              </div>
            </div>
          ))}
          {filtered.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>◈</div><p style={{fontSize:15,fontWeight:500}}>{moduleQs.length===0?'No questions in this module yet — add one above':'No questions match your search'}</p></div>}
        </div>
      </div>
    )
  }

  // ── Module List View ──────────────────────────────────────────────────────────
  return(
    <div>
      {AssignModal}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Modules</h2>
          <p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{questions.length} questions · {allModuleNames.length} module{allModuleNames.length!==1?'s':''}</p>
        </div>
        <button onClick={()=>{setShowNewModuleForm(true);setNewModuleName('');setNewModuleDesc('')}} style={{background:'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer'}}>+ New Module</button>
      </div>

      {showNewModuleForm&&(
        <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .3s ease'}}>
          <h3 style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:16}}>New Module</h3>
          <Field label="Module Name"><input value={newModuleName} onChange={e=>setNewModuleName(e.target.value)} placeholder="e.g. Book EMA" style={inp} autoFocus/></Field>
          <Field label="Description (optional)"><input value={newModuleDesc} onChange={e=>setNewModuleDesc(e.target.value)} placeholder="e.g. Ecological momentary assessment for the Book study" style={inp}/></Field>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setShowNewModuleForm(false)} style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            <button onClick={createModule} disabled={!newModuleName.trim()||savingModule} style={{flex:2,padding:11,borderRadius:12,border:'none',background:newModuleName.trim()?'#1A1A2E':'#E5E0D8',color:newModuleName.trim()?'#E8E4FF':'#9B98B8',fontSize:14,fontWeight:700,cursor:newModuleName.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              {savingModule?<Spin/>:'Create Module'}
            </button>
          </div>
        </div>
      )}

      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
        {allModuleNames.map(name=>{
          const qs=folderMap[name]||[]
          const modDoc=getModuleDoc(name)
          const catCounts={}; qs.forEach(q=>{const c=q.category||'General'; catCounts[c]=(catCounts[c]||0)+1})
          const topCats=Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,2)
          return(
            <div key={name} style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',display:'flex',flexDirection:'column'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📁</div>
                <button onClick={()=>{setSelectedModule({name,...(modDoc||{})});setCatFilter('All');setSearch('');setShowForm(false);setEditing(null)}} style={{padding:'6px 14px',borderRadius:10,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:12,fontWeight:600,cursor:'pointer'}}>Edit →</button>
              </div>
              <div style={{fontWeight:700,fontSize:17,color:'#1A1A2E',marginBottom:4}}>{name}</div>
              {modDoc?.description&&<div style={{fontSize:12,color:'#9B98B8',marginBottom:6,lineHeight:1.4}}>{modDoc.description}</div>}
              <div style={{fontSize:13,color:'#9B98B8',marginBottom:12}}>{qs.length} question{qs.length!==1?'s':''}</div>
              {topCats.length>0&&<div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
                {topCats.map(([c,n])=><span key={c} style={{fontSize:10,fontWeight:600,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'2px 8px'}}>{c} · {n}</span>)}
                {Object.keys(catCounts).length>2&&<span style={{fontSize:10,color:'#C8C0B0',alignSelf:'center'}}>+{Object.keys(catCounts).length-2} more</span>}
              </div>}
              <button onClick={()=>{setAssignTarget(name);setAssignSuccess(null);setAssignSearch('');setAssignStep(1);setAssignUser(null)}}
                style={{marginTop:'auto',padding:'8px 0',borderRadius:10,border:'1.5px solid #6C63FF',background:'#EDE9FE',color:'#6C63FF',fontSize:12,fontWeight:700,cursor:'pointer',width:'100%'}}>
                Assign to Client
              </button>
            </div>
          )
        })}
      </div>
      {!loading&&allModuleNames.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>📁</div><p style={{fontSize:15,fontWeight:500}}>No modules yet — create one above</p></div>}
    </div>
  )
}

// ── Schedule View (Template Library) ──────────────────────────────────────────
function ScheduleView() {
  const [templates,setTemplates]=useState([])
  const [loading,setLoading]=useState(true)
  const [showForm,setShowForm]=useState(false)
  const [editing,setEditing]=useState(null)
  const [saving,setSaving]=useState(false)
  const [seeded,setSeeded]=useState(false)
  const [form,setForm]=useState({name:'',type:'5x_daily',times:['09:00','12:00','15:00','18:00','21:00'],days:['Mon','Wed','Fri'],intervalHours:4,defaultDuration:15,isDefault:false})
  const isMobile=useMobile()

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'scheduleTemplates'),snap=>{
      setTemplates(snap.docs.map(d=>({id:d.id,...d.data()})))
      setLoading(false)
    })
    return unsub
  },[])

  useEffect(()=>{
    if(!loading&&templates.length===0&&!seeded){
      setSeeded(true)
      addDoc(collection(db,'scheduleTemplates'),{
        name:'Standard 5× Daily',type:'5x_daily',
        times:['09:00','12:00','15:00','18:00','21:00'],
        days:[],intervalHours:4,defaultDuration:15,isDefault:true
      }).then(ref=>updateDoc(doc(db,'scheduleTemplates',ref.id),{id:ref.id}))
    }
  },[loading,templates.length])

  function changeType(t){
    const defaults={'5x_daily':['09:00','12:00','15:00','18:00','21:00'],'3x_daily':['09:00','13:00','18:00'],'1x_daily':['09:00'],'weekly':['09:00'],'custom_interval':['08:00']}
    setForm(f=>({...f,type:t,times:defaults[t]}))
  }

  async function save(){
    if(!form.name.trim()) return
    setSaving(true)
    const data={name:form.name.trim(),type:form.type,times:form.times,days:form.days,intervalHours:+form.intervalHours,defaultDuration:+form.defaultDuration,isDefault:form.isDefault}
    if(data.isDefault){
      for(const t of templates){
        if(t.id!==editing?.id&&t.isDefault) await updateDoc(doc(db,'scheduleTemplates',t.id),{isDefault:false})
      }
    }
    if(editing){
      await updateDoc(doc(db,'scheduleTemplates',editing.id),data)
    } else {
      const ref=await addDoc(collection(db,'scheduleTemplates'),data)
      await updateDoc(doc(db,'scheduleTemplates',ref.id),{id:ref.id})
    }
    setShowForm(false); setEditing(null); setSaving(false)
  }

  async function del(t){
    if(!window.confirm(`Delete "${t.name}"? This cannot be undone.`)) return
    await deleteDoc(doc(db,'scheduleTemplates',t.id))
  }

  async function setDefault(t){
    for(const tmpl of templates) await updateDoc(doc(db,'scheduleTemplates',tmpl.id),{isDefault:tmpl.id===t.id})
  }

  function openNew(){
    setEditing(null)
    setForm({name:'',type:'5x_daily',times:['09:00','12:00','15:00','18:00','21:00'],days:['Mon','Wed','Fri'],intervalHours:4,defaultDuration:15,isDefault:false})
    setShowForm(true)
  }

  function openEdit(t){
    setEditing(t)
    setForm({name:t.name,type:t.type,times:[...(t.times||[])],days:[...(t.days||[])],intervalHours:t.intervalHours||4,defaultDuration:t.defaultDuration||15,isDefault:t.isDefault||false})
    setShowForm(true)
  }

  function tLabel(type){return{'5x_daily':'5× Daily','3x_daily':'3× Daily','1x_daily':'1× Daily','weekly':'Weekly','custom_interval':'Custom Interval'}[type]||type}

  function tSummary(t){
    if(t.type==='custom_interval') return`Every ${t.intervalHours}h from ${(t.times||['08:00'])[0]}`
    if(t.type==='weekly') return`${(t.days||[]).join(', ')} at ${(t.times||['09:00'])[0]}`
    return(t.times||[]).join(' · ')
  }

  const WDAYS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const TIME_COUNT={'5x_daily':5,'3x_daily':3,'1x_daily':1,'weekly':1,'custom_interval':1}

  const FormPanel=(
    <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .3s ease'}}>
      <h3 style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:16}}>{editing?'Edit Template':'New Template'}</h3>
      <Field label="Template Name">
        <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Standard 5× Daily" style={inp}/>
      </Field>
      <Field label="Schedule Type">
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[['5x_daily','5× Daily'],['3x_daily','3× Daily'],['1x_daily','1× Daily'],['weekly','Weekly'],['custom_interval','Interval']].map(([v,l])=>(
            <button key={v} onClick={()=>changeType(v)} style={{padding:'8px 12px',borderRadius:10,border:`1.5px solid ${form.type===v?'#6C63FF':'#E5E0D8'}`,background:form.type===v?'#EDE9FE':'#FAFAF8',color:form.type===v?'#6C63FF':'#9B98B8',fontSize:12,fontWeight:600,cursor:'pointer'}}>
              {l}
            </button>
          ))}
        </div>
      </Field>

      {(form.type==='5x_daily'||form.type==='3x_daily'||form.type==='1x_daily')&&(
        <Field label="Session Times">
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {(form.times||[]).slice(0,TIME_COUNT[form.type]).map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{fontSize:12,color:'#9B98B8',width:76,flexShrink:0}}>Session {i+1}</div>
                <input type="time" value={t} onChange={e=>{const n=[...form.times];n[i]=e.target.value;setForm(f=>({...f,times:n}))}} style={{...inp,padding:'8px 10px',borderRadius:8}}/>
              </div>
            ))}
          </div>
        </Field>
      )}

      {form.type==='weekly'&&(<>
        <Field label="Days">
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {WDAYS.map(d=>(
              <button key={d} onClick={()=>setForm(f=>({...f,days:f.days.includes(d)?f.days.filter(x=>x!==d):[...f.days,d]}))} style={{padding:'6px 11px',borderRadius:8,border:`1.5px solid ${form.days.includes(d)?'#6C63FF':'#E5E0D8'}`,background:form.days.includes(d)?'#EDE9FE':'#FAFAF8',color:form.days.includes(d)?'#6C63FF':'#9B98B8',fontSize:12,fontWeight:600,cursor:'pointer'}}>
                {d}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Time">
          <input type="time" value={form.times[0]||'09:00'} onChange={e=>setForm(f=>({...f,times:[e.target.value]}))} style={{...inp,padding:'8px 10px',borderRadius:8}}/>
        </Field>
      </>)}

      {form.type==='custom_interval'&&(<>
        <div style={{display:'flex',gap:12,marginBottom:18,flexDirection:isMobile?'column':'row'}}>
          <div style={{flex:1}}>
            <Lbl>Interval (hours)</Lbl>
            <input type="number" min={1} max={24} value={form.intervalHours} onChange={e=>setForm(f=>({...f,intervalHours:+e.target.value}))} style={{...inp,padding:'8px 10px',borderRadius:8}}/>
          </div>
          <div style={{flex:1}}>
            <Lbl>Start Time</Lbl>
            <input type="time" value={form.times[0]||'08:00'} onChange={e=>setForm(f=>({...f,times:[e.target.value]}))} style={{...inp,padding:'8px 10px',borderRadius:8}}/>
          </div>
        </div>
      </>)}

      <Field label="Default Duration (days)">
        <input type="number" min={1} max={365} value={form.defaultDuration} onChange={e=>setForm(f=>({...f,defaultDuration:+e.target.value}))} style={{...inp,padding:'8px 10px',borderRadius:8,maxWidth:160}}/>
      </Field>

      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,cursor:'pointer'}} onClick={()=>setForm(f=>({...f,isDefault:!f.isDefault}))}>
        <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${form.isDefault?'#6C63FF':'#D1D5DB'}`,background:form.isDefault?'#6C63FF':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {form.isDefault&&<span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span>}
        </div>
        <span style={{fontSize:13,color:'#1A1A2E'}}>Set as default template</span>
      </div>

      <div style={{display:'flex',gap:10}}>
        <button onClick={()=>{setShowForm(false);setEditing(null)}} style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
        <button onClick={save} disabled={!form.name.trim()||saving} style={{flex:2,padding:11,borderRadius:12,border:'none',background:form.name.trim()?'#1A1A2E':'#E5E0D8',color:form.name.trim()?'#E8E4FF':'#9B98B8',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
          {saving?<Spin/>:editing?'Save Changes':'Create Template'}
        </button>
      </div>
      {editing&&<div style={{marginTop:16,paddingTop:16,borderTop:'1px solid #F0EDE8'}}><button onClick={async()=>{if(window.confirm(`Delete "${editing.name}"? This cannot be undone.`)){await del(editing);setShowForm(false);setEditing(null)}}} style={{width:'100%',padding:11,borderRadius:12,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:14,fontWeight:600,cursor:'pointer'}}>Delete Template</button></div>}
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Schedule Templates</h2>
          <p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{templates.length} template{templates.length!==1?'s':''} · Select a template when assigning schedules to clients</p>
        </div>
        <button onClick={openNew} style={{background:'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer',flexShrink:0}}>+ New Template</button>
      </div>

      {showForm&&FormPanel}

      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      {!loading&&templates.length===0&&!showForm&&(
        <div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}>
          <div style={{fontSize:40,marginBottom:12}}>◷</div>
          <p style={{fontSize:15,fontWeight:500}}>No templates yet</p>
          <p style={{fontSize:13,marginTop:6}}>Create templates to quickly assign schedules to clients</p>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {templates.map(t=>(
          <div key={t.id} style={{background:'#fff',borderRadius:18,padding:'20px 22px',border:`1.5px solid ${t.isDefault?'#6C63FF':'#E8E3DA'}`,boxShadow:t.isDefault?'0 0 0 1px rgba(108,99,255,.15)':undefined}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,flexWrap:'wrap'}}>
                  <span style={{fontSize:15,fontWeight:700,color:'#1A1A2E'}}>{t.name}</span>
                  {t.isDefault&&<span style={{fontSize:10,fontWeight:700,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'2px 9px',letterSpacing:.5,textTransform:'uppercase'}}>Default</span>}
                  <span style={{fontSize:11,fontWeight:600,color:'#6B6888',background:'#F4F1EC',borderRadius:20,padding:'2px 10px'}}>{tLabel(t.type)}</span>
                </div>
                <div style={{fontSize:13,color:'#1A1A2E',fontWeight:500,marginBottom:3}}>{tSummary(t)}</div>
                <div style={{fontSize:12,color:'#9B98B8'}}>{t.defaultDuration} day{t.defaultDuration!==1?'s':''}</div>
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0,flexWrap:'wrap',justifyContent:'flex-end'}}>
                {!t.isDefault&&<button onClick={()=>setDefault(t)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>Set Default</button>}
                <button onClick={()=>openEdit(t)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:11,fontWeight:600,cursor:'pointer'}}>Edit</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [authed,setAuthed]=useState(null); const [view,setView]=useState('modules')
  const [questions,setQuestions]=useState([])
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const isMobile=useMobile()

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,u=>setAuthed(!!u))
    return unsub
  },[])

  // Load questions globally so ClientsView shares them
  useEffect(()=>{
    if(!authed)return
    const unsub=onSnapshot(collection(db,'questions'),snap=>{setQuestions(snap.docs.map(d=>({id:d.id,...d.data()})))})
    return unsub
  },[authed])

  if(authed===null)return<div style={{minHeight:'100vh',background:'#1A1A2E',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{G}</style><Spin/></div>
  if(!authed)return<AdminLogin onLogin={()=>setAuthed(true)}/>

  return(
    <div style={{display:'flex',minHeight:'100vh',background:'#F4F1EC'}}>
      <style>{G}</style>
      <Sidebar active={view} setActive={setView} onLogout={()=>signOut(auth)} open={sidebarOpen} onClose={()=>setSidebarOpen(false)}/>
      <div style={{flex:1,overflowY:'auto',minWidth:0,padding:isMobile?0:'40px 44px'}}>
        {isMobile&&(
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'#fff',borderBottom:'1px solid #E8E3DA',position:'sticky',top:0,zIndex:50}}>
            <button onClick={()=>setSidebarOpen(true)} style={{background:'none',border:'1.5px solid #E5E0D8',borderRadius:10,padding:0,width:44,height:44,cursor:'pointer',fontSize:20,color:'#1A1A2E',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>☰</button>
            <div style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:18,color:'#1A1A2E'}}>Sylvia Admin</div>
          </div>
        )}
        <div style={{padding:isMobile?'16px':'0'}}>
          {view==='modules'&&<ModulesView/>}
          {view==='schedule'&&<ScheduleView/>}
          {view==='clients'&&<ClientsView questions={questions}/>}
          {view==='team'&&<TeamView/>}
          {view==='invites'&&<InvitesView/>}
        </div>
      </div>
    </div>
  )
}
