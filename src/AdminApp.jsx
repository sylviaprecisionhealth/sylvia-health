import { useState, useEffect } from 'react'
import { db, auth } from './firebase.js'
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where
} from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

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
  const nav=[{id:'questions',label:'Questions',icon:'◈'},{id:'schedule',label:'Schedule',icon:'◷'},{id:'default',label:'Default Schedule',icon:'★'},{id:'users',label:'Users',icon:'◎'},{id:'responses',label:'Responses',icon:'◉'},{id:'invites',label:'Invites',icon:'✉'}]
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
              <span style={{fontSize:16,color:active===n.id?'#8B3A2A':'#1A0F0A'}}>{n.icon}</span>
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

// ── Default Schedule View ─────────────────────────────────────────────────────
function DefaultScheduleView({questions}) {
  const [items, setItems] = useState([]) // [{questionId, time, mode, interval, repeat}]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [saved, setSaved] = useState(false)

  useEffect(()=>{
    const unsub = onSnapshot(doc(db,'config','defaultSchedule'), snap=>{
      if(snap.exists()) setItems(snap.data().items || [])
      setLoading(false)
    })
    return unsub
  },[])

  async function saveDefault() {
    setSaving(true)
    await setDoc(doc(db,'config','defaultSchedule'), {items, updatedAt: new Date().toISOString()})
    setSaved(true); setTimeout(()=>setSaved(false), 2000)
    setSaving(false)
  }

  function isSelected(qId) { return items.some(i=>i.questionId===qId) }

  function toggleQuestion(q) {
    if(isSelected(q.id)) {
      setItems(prev=>prev.filter(i=>i.questionId!==q.id))
    } else {
      setItems(prev=>[...prev,{questionId:q.id,time:'08:00',repeat:'Daily',mode:'time',interval:4}])
    }
  }

  function updateEntry(qId, entry) {
    setItems(prev=>prev.map(i=>i.questionId===qId?{...i,...entry}:i))
  }

  const cats = ['All',...Array.from(new Set(questions.map(q=>q.category||'General')))]
  const filtered = questions.filter(q=>{
    const mc = catFilter==='All'||(q.category||'General')===catFilter
    const ms = !search||q.text?.toLowerCase().includes(search.toLowerCase())
    return mc&&ms
  })

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Default Schedule</h2>
          <p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{items.length} questions selected · Apply to any user in one click from the Users tab</p>
        </div>
        <button onClick={saveDefault} disabled={saving} style={{background:saved?'#1A6644':'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          {saving?<Spin/>:saved?'Saved ✓':'Save Default'}
        </button>
      </div>

      <div style={{background:'#DBEAFE',borderRadius:12,padding:'12px 16px',marginBottom:20}}>
        <div style={{fontSize:12,color:'#1D4ED8',fontWeight:600,marginBottom:2}}>How this works</div>
        <div style={{fontSize:12,color:'#1D4ED8',lineHeight:1.6}}>Select questions below and set a time or interval for each. Save, then go to Users → click a client → "Apply Default Schedule" to assign this bundle to them instantly.</div>
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions…" style={{...inp,marginBottom:12}}/>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
        {cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} style={{padding:'5px 12px',borderRadius:20,border:`1.5px solid ${catFilter===c?'#1A1A2E':'#E5E0D8'}`,background:catFilter===c?'#1A1A2E':'#fff',color:catFilter===c?'#E8E4FF':'#9B98B8',fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{c}</button>)}
      </div>

      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(q=>{
          const selected = isSelected(q.id)
          const entry = items.find(i=>i.questionId===q.id)
          return (
            <div key={q.id} style={{background:'#fff',borderRadius:16,padding:'16px 18px',border:`1.5px solid ${selected?'#6C63FF':'#E8E3DA'}`,transition:'border-color .2s'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                <div onClick={()=>toggleQuestion(q)} style={{width:22,height:22,borderRadius:6,border:`2px solid ${selected?'#6C63FF':'#D1D5DB'}`,background:selected?'#6C63FF':'#fff',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0,marginTop:2}}>
                  {selected&&<span style={{color:'#fff',fontSize:13,fontWeight:700}}>✓</span>}
                </div>
                <div style={{flex:1}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
                    <TBadge type={q.type}/>
                    {q.category&&q.category!=='General'&&<span style={{fontSize:11,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'2px 8px',fontWeight:600}}>{q.category}</span>}
                  </div>
                  <p style={{fontSize:14,color:'#1A1A2E',lineHeight:1.4,fontWeight:500,margin:0,cursor:'pointer'}} onClick={()=>toggleQuestion(q)}>{q.text}</p>
                  {selected&&entry&&<ScheduleEntryEditor entry={entry} onChange={e=>updateEntry(q.id,e)}/>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
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

// ── User Profile Modal ────────────────────────────────────────────────────────
function UserProfileModal({user, questions, onClose}) {
  const [liveSchedules, setLiveSchedules] = useState([])
  const [applying, setApplying] = useState(false)
  const [saving, setSaving] = useState(null)
  const [applySuccess, setApplySuccess] = useState(false)
  const [tab, setTab] = useState('active')
  const [addSearch, setAddSearch] = useState('')

  useEffect(()=>{
    const unsub = onSnapshot(
      query(collection(db,'schedules'), where('userId','==',user.id)),
      snap => setLiveSchedules(snap.docs.map(d=>({id:d.id,...d.data()})))
    )
    return unsub
  },[user.id])

  const userSchedules  = liveSchedules
  const DEFAULT_TIMES  = ['09:00','12:00','15:00','18:00','21:00']
  const assignedQIds   = new Set(userSchedules.map(s=>s.questionId))
  const availableToAdd = questions.filter(q=>
    !assignedQIds.has(q.id) &&
    (!addSearch || q.text.toLowerCase().includes(addSearch.toLowerCase()))
  )
  const defaultSched = userSchedules.find(s=>s.isDefaultSession)
  const daysLeft = defaultSched?.endDate
    ? Math.max(0, Math.ceil((new Date(defaultSched.endDate)-new Date(today()))/86400000)+1)
    : null

  async function applyDefault() {
    if(!questions.length){ alert('No questions found in the database.'); return }
    setApplying(true)
    try {
      for(const s of userSchedules) {
        await deleteDoc(doc(db,'schedules',s.id))
      }
      const startDate = today()
      const end = new Date()
      end.setDate(end.getDate() + 14)
      const endDate = end.toISOString().split('T')[0]
      for(const time of DEFAULT_TIMES) {
        const ref = await addDoc(collection(db,'schedules'),{
          questionId:'__ALL__', userId:user.id, time,
          repeat:'Daily', interval:null, mode:'time',
          startDate, endDate, durationDays:15,
          active:true, isDefaultSession:true
        })
        await updateDoc(doc(db,'schedules',ref.id),{id:ref.id})
      }
      setApplySuccess(true)
      setTimeout(()=>setApplySuccess(false), 4000)
    } catch(e) { alert('Error: ' + e.message) }
    setApplying(false)
  }

  async function toggleSchedule(s){ await updateDoc(doc(db,'schedules',s.id),{active:!s.active}) }
  async function removeSchedule(s){ await deleteDoc(doc(db,'schedules',s.id)) }
  async function addQuestion(q){
    const ref = await addDoc(collection(db,'schedules'),{
      questionId:q.id, userId:user.id, time:'08:00',
      repeat:'Daily', interval:null, mode:'time',
      startDate:today(), active:true
    })
    await updateDoc(doc(db,'schedules',ref.id),{id:ref.id})
  }
  async function saveScheduleEdit(sId, edits){ setSaving(sId); await updateDoc(doc(db,'schedules',sId),edits); setSaving(null) }
  function qInfo(id){ return questions.find(q=>q.id===id) }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(10,10,20,.7)',backdropFilter:'blur(6px)',zIndex:200,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,overflowY:'auto'}}>
      <div style={{background:'#E8E4FF',borderRadius:24,width:'100%',maxWidth:620,boxShadow:'0 32px 80px rgba(0,0,0,.2)',animation:'pop .25s ease',marginTop:20,marginBottom:20}}>
        <div style={{background:'#1A1A2E',borderRadius:'24px 24px 0 0',padding:'24px 28px'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:46,height:46,borderRadius:14,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:18,color:'#6C63FF',flexShrink:0}}>{user.name?.split(' ').map(n=>n[0]).join('')||'?'}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Inter',sans-serif",fontWeight:700,fontSize:20,color:'#E8E4FF'}}>{user.name}</div>
              <div style={{fontSize:12,color:'#6B6888',marginTop:2}}>{user.email} · Joined {user.joinedDate}</div>
            </div>
            <button onClick={onClose} style={{background:'#FFFFFF1A',border:'none',color:'#E8E4FF',borderRadius:10,padding:'8px 14px',fontSize:13,cursor:'pointer'}}>Close</button>
          </div>
          <button onClick={applyDefault} disabled={applying} style={{marginTop:16,width:'100%',background:applySuccess?'#1A6644':'linear-gradient(135deg,#6C63FF,#4A42CC)',color:'#fff',border:'none',borderRadius:12,padding:'11px',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'background .3s'}}>
            {applying?<><Spin/> Applying…</>:applySuccess?'✓ Applied — 5×/day for 15 days':'⚡ Apply Default Schedule (15 days · 5×/day · all 92 questions)'}
          </button>
          {defaultSched&&daysLeft!==null&&<div style={{marginTop:8,fontSize:12,color:'#A89FFF',textAlign:'center'}}>{daysLeft>0?`${daysLeft} day${daysLeft!==1?'s':''} remaining · ends ${defaultSched.endDate}`:'Schedule has ended'}</div>}
        </div>

        <div style={{padding:'20px 24px'}}>
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {[['active',`Active Schedule (${userSchedules.length})`],['add','Add Questions']].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'10px',borderRadius:12,border:`1.5px solid ${tab===t?'#1A1A2E':'#E5E0D8'}`,background:tab===t?'#1A1A2E':'#fff',color:tab===t?'#E8E4FF':'#9B98B8',fontSize:13,fontWeight:600,cursor:'pointer'}}>{l}</button>
            ))}
          </div>

          {tab==='active'&&<>
            {userSchedules.length===0&&<div style={{textAlign:'center',padding:'40px 20px',color:'#C8C0B0'}}><p style={{fontSize:15}}>No schedule assigned yet.</p><p style={{fontSize:13,marginTop:4}}>Click the button above to apply the default schedule.</p></div>}
            {userSchedules.length>0&&<>
              <div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:10}}>
                {userSchedules.some(s=>s.isDefaultSession)?'Default Schedule (All 92 Questions)':'Individual Schedules'}
              </div>
              {userSchedules.filter(s=>s.isDefaultSession).length>0&&(
                <div style={{background:'#fff',borderRadius:14,padding:'16px',border:'1.5px solid #E8E3DA',marginBottom:12}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>All 92 Questions · 5 sessions/day</div>
                      <div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>9:00 AM · 12:00 PM · 3:00 PM · 6:00 PM · 9:00 PM</div>
                    </div>
                    <span style={{fontSize:11,color:'#1A6644',background:'#D1FAE5',borderRadius:20,padding:'3px 10px',fontWeight:600}}>Active</span>
                  </div>
                  {defaultSched&&<div style={{fontSize:12,color:'#9B98B8',marginBottom:12}}>{defaultSched.startDate} → {defaultSched.endDate} ({daysLeft>0?`${daysLeft} days left`:'ended'})</div>}
                  <button onClick={()=>{ if(window.confirm('Remove this schedule?')) userSchedules.forEach(s=>removeSchedule(s)) }} style={{padding:'6px 14px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:12,fontWeight:600,cursor:'pointer'}}>Remove Schedule</button>
                </div>
              )}
              {userSchedules.filter(s=>!s.isDefaultSession).map(s=>{
                const q=qInfo(s.questionId)
                if(!q)return null
                return <ScheduleRow key={s.id} s={s} q={q} saving={saving} onSave={saveScheduleEdit} onToggle={toggleSchedule} onRemove={removeSchedule}/>
              })}
            </>}
          </>}

          {tab==='add'&&<>
            <input value={addSearch} onChange={e=>setAddSearch(e.target.value)} placeholder="Search questions to add…" style={{...inp,marginBottom:12}}/>
            <p style={{fontSize:12,color:'#9B98B8',marginBottom:14}}>Click any question to add it to this client's schedule.</p>
            <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:400,overflowY:'auto'}}>
              {availableToAdd.map(q=>(
                <div key={q.id} onClick={()=>addQuestion(q)} style={{background:'#fff',borderRadius:12,padding:'12px 14px',border:'1.5px solid #E8E3DA',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap'}}><TBadge type={q.type}/>{q.category&&q.category!=='General'&&<span style={{fontSize:11,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'2px 8px',fontWeight:600}}>{q.category}</span>}</div>
                    <p style={{fontSize:13,color:'#1A1A2E',fontWeight:500,margin:0,lineHeight:1.4}}>{q.text.length>80?q.text.slice(0,80)+'…':q.text}</p>
                  </div>
                  <span style={{color:'#6C63FF',fontSize:20,flexShrink:0}}>+</span>
                </div>
              ))}
              {availableToAdd.length===0&&<div style={{textAlign:'center',padding:30,color:'#C8C0B0'}}><p>No more questions to add.</p></div>}
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}

// ── Users View ────────────────────────────────────────────────────────────────
function UsersView({questions}) {
  const [users,setUsers]=useState([]); const [schedules,setSchedules]=useState([]); const [loading,setLoading]=useState(true)
  const [selectedUser,setSelectedUser]=useState(null)
  const [defaultSchedule,setDefaultSchedule]=useState(null)

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'users'),s=>{setUsers(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)})
    const u2=onSnapshot(collection(db,'schedules'),s=>{setSchedules(s.docs.map(d=>({id:d.id,...d.data()})))})
    const u3=onSnapshot(doc(db,'config','defaultSchedule'),snap=>{if(snap.exists())setDefaultSchedule(snap.data())})
    return()=>{u1();u2();u3()}
  },[])

  async function deleteUser(u) {
    if(!window.confirm(`Delete ${u.name}? This cannot be undone.`)) return
    await deleteDoc(doc(db,'users',u.id))
  }

  return (
    <div>
      <div style={{marginBottom:28}}>
        <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Users</h2>
        <p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{users.length} enrolled client{users.length!==1?'s':''} · Click a user to manage their schedule</p>
      </div>
      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      {!loading&&users.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>◎</div><p style={{fontSize:15,fontWeight:500}}>No users yet — send an invite to get started</p></div>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {users.map(u=>{
          const userScheds=schedules.filter(s=>s.userId===u.id||s.userId==='all')
          const activeCount=userScheds.filter(s=>s.active).length
          return(
            <div key={u.id} style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1.5px solid #E8E3DA',display:'flex',alignItems:'center',gap:16,transition:'box-shadow .2s',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}>
              <div onClick={()=>setSelectedUser(u)} style={{display:'flex',alignItems:'center',gap:16,flex:1,cursor:'pointer',minWidth:0}}>
                <div style={{width:42,height:42,borderRadius:14,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#6C63FF',flexShrink:0}}>{u.name?.split(' ').map(n=>n[0]).join('')||'?'}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:15,color:'#1A1A2E'}}>{u.name}</div>
                  <div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{u.email} · Joined {u.joinedDate}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <Badge status={u.status||'active'}/>
                  <div style={{fontSize:11,color:'#9B98B8',marginTop:5}}>{activeCount} active question{activeCount!==1?'s':''}</div>
                </div>
                <span style={{color:'#C8C0B0',fontSize:20}}>›</span>
              </div>
              <button onClick={e=>{e.stopPropagation();deleteUser(u)}} style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:12,cursor:'pointer',flexShrink:0}}>✕</button>
            </div>
          )
        })}
      </div>
      {selectedUser&&(
        <UserProfileModal
          user={selectedUser}
          questions={questions}
          onClose={()=>setSelectedUser(null)}
        />
      )}
    </div>
  )
}

// ── Invites View ──────────────────────────────────────────────────────────────
function InvitesView() {
  const [invites,setInvites]=useState([]); const [loading,setLoading]=useState(true); const [copied,setCopied]=useState(null)
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [creating,setCreating]=useState(false); const [done,setDone]=useState(null); const [showForm,setShowForm]=useState(false); const [emailSent,setEmailSent]=useState(null)

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
  }

  function copy(code){navigator.clipboard?.writeText(code); setCopied(code); setTimeout(()=>setCopied(null),2000)}
  const valid=name.trim().length>1&&email.includes('@')
  const pending=invites.filter(i=>!i.used), used=invites.filter(i=>i.used)

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
      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      {!loading&&pending.length>0&&<><div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Pending</div>
        {pending.map(inv=>(
          <div key={inv.id} style={{background:'#fff',borderRadius:16,padding:'16px 20px',border:'1.5px solid #E8E3DA',marginBottom:10,display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:38,height:38,borderRadius:10,background:'#DBEAFE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>✉</div>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{inv.name}</div><div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{inv.email} · {inv.createdAt}</div></div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <div style={{background:'#E8E4FF',borderRadius:8,padding:'5px 10px',fontWeight:700,fontSize:12,color:'#6B6888',letterSpacing:1.5}}>{inv.code}</div>
              <button onClick={()=>copy(inv.code)} style={{padding:'5px 10px',borderRadius:8,border:'1.5px solid #E5E0D8',background:copied===inv.code?'#D1FAE5':'#fff',color:copied===inv.code?'#1A6644':'#6B6888',fontSize:11,fontWeight:600,cursor:'pointer'}}>{copied===inv.code?'✓':'Copy'}</button>
              <button onClick={()=>deleteInvite(inv)} style={{padding:'5px 8px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:11,cursor:'pointer'}}>✕</button>
            </div>
          </div>
        ))}
      </>}
      {!loading&&used.length>0&&<div style={{marginTop:pending.length?20:0}}><div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Accepted</div>
        {used.map(inv=>(
          <div key={inv.id} style={{background:'#fff',borderRadius:16,padding:'14px 20px',border:'1.5px solid #E8E3DA',marginBottom:10,display:'flex',alignItems:'center',gap:14,opacity:.65}}>
            <div style={{width:38,height:38,borderRadius:10,background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>✓</div>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{inv.name}</div><div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{inv.email}</div></div>
            <Badge status="active"/>
            <button onClick={()=>deleteInvite(inv)} style={{padding:'5px 8px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:11,cursor:'pointer'}}>✕</button>
          </div>
        ))}
      </div>}
    </div>
  )
}

// ── Questions View ────────────────────────────────────────────────────────────
function QuestionsView() {
  const [questions,setQuestions]=useState([]); const [users,setUsers]=useState([]); const [loading,setLoading]=useState(true)
  const [selectedFolder,setSelectedFolder]=useState(null)
  const [editing,setEditing]=useState(null); const [showForm,setShowForm]=useState(false)
  const [catFilter,setCatFilter]=useState('All'); const [search,setSearch]=useState('')
  const [form,setForm]=useState({type:'scale',text:'',scaleMin:0,scaleMax:100,scaleMinLabel:'Not at all',scaleMaxLabel:'More than I ever have',options:'',category:'General',mechanism:'',folder:'Book EMA'})
  const [saving,setSaving]=useState(false)
  const [assignTarget,setAssignTarget]=useState(null); const [assigning,setAssigning]=useState(null); const [assignSuccess,setAssignSuccess]=useState(null); const [assignSearch,setAssignSearch]=useState('')
  const [assignStep,setAssignStep]=useState(1); const [assignUser,setAssignUser]=useState(null); const [selectedTemplate,setSelectedTemplate]=useState(null)
  const [templates,setTemplates]=useState([])
  const isMobile=useMobile()

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'questions'),snap=>{setQuestions(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false)})
    const u2=onSnapshot(collection(db,'users'),snap=>{setUsers(snap.docs.map(d=>({id:d.id,...d.data()})))})
    const u3=onSnapshot(collection(db,'scheduleTemplates'),snap=>{setTemplates(snap.docs.map(d=>({id:d.id,...d.data()})))})
    return()=>{u1();u2();u3()}
  },[])

  // Build folder map
  const folderMap={}
  questions.forEach(q=>{const f=q.folder||'Uncategorized'; if(!folderMap[f])folderMap[f]=[]; folderMap[f].push(q)})
  const folderNames=Object.keys(folderMap).sort()

  function openNew(){
    setEditing(null)
    setForm({type:'scale',text:'',scaleMin:0,scaleMax:100,scaleMinLabel:'Not at all',scaleMaxLabel:'More than I ever have',options:'',category:'General',mechanism:'',folder:selectedFolder||'Book EMA'})
    setShowForm(true)
  }
  function openEdit(q){setEditing(q);setForm({...q,options:q.options?.join('\n')||''});setShowForm(true)}

  async function save(){
    if(!form.text.trim())return; setSaving(true)
    const data={...form,scaleMin:+form.scaleMin,scaleMax:+form.scaleMax,options:form.type==='choice'?form.options.split('\n').map(s=>s.trim()).filter(Boolean):[],scheduled:editing?.scheduled||[]}
    if(editing){await setDoc(doc(db,'questions',editing.id),data,{merge:true})}
    else{const ref=await addDoc(collection(db,'questions'),data);await updateDoc(doc(db,'questions',ref.id),{id:ref.id})}
    setShowForm(false); setSaving(false)
  }

  async function del(id){await deleteDoc(doc(db,'questions',id))}

  function closeAssignModal(){
    setAssignTarget(null); setAssignSuccess(null); setAssignSearch('')
    setAssignStep(1); setAssignUser(null); setSelectedTemplate(null)
  }

  async function confirmAssign(){
    if(!selectedTemplate) return
    setAssigning(assignUser.id)
    try{
      const existingSnap=await getDocs(query(collection(db,'schedules'),where('userId','==',assignUser.id)))
      for(const d of existingSnap.docs) await deleteDoc(doc(db,'schedules',d.id))
      const startDate=today()
      const durDays=selectedTemplate.defaultDuration||15
      const end=new Date(); end.setDate(end.getDate()+durDays-1)
      const endDate=end.toISOString().split('T')[0]
      let timesToCreate=[...(selectedTemplate.times||['09:00'])],extraFields={}
      if(selectedTemplate.type==='weekly'){
        extraFields={repeat:'Weekly',days:selectedTemplate.days||[]}
      } else if(selectedTemplate.type==='custom_interval'){
        timesToCreate=[(selectedTemplate.times||['08:00'])[0]]
        extraFields={mode:'interval',interval:selectedTemplate.intervalHours||4,repeat:'Custom interval'}
      }
      for(const time of timesToCreate){
        const ref=await addDoc(collection(db,'schedules'),{
          questionId:'__ALL__',userId:assignUser.id,time,
          repeat:'Daily',interval:null,mode:'time',
          startDate,endDate,durationDays:durDays,
          active:true,isDefaultSession:true,
          templateId:selectedTemplate.id,templateName:selectedTemplate.name,
          ...extraFields
        })
        await updateDoc(doc(db,'schedules',ref.id),{id:ref.id})
      }
      setAssignSuccess(assignUser.id)
      setTimeout(()=>setAssignSuccess(null),3000)
    }catch(e){alert('Error: '+e.message)}
    setAssigning(null)
  }

  // Shared form panel
  const FormPanel=(
    <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .3s ease'}}>
      <h3 style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:16}}>{editing?'Edit Question':'New Question'}</h3>
      <Field label="Type"><div style={{display:'flex',gap:8}}>{Q_TYPES.map(qt=><button key={qt.id} onClick={()=>setForm(f=>({...f,type:qt.id}))} style={{flex:1,padding:'10px 8px',borderRadius:12,border:`2px solid ${form.type===qt.id?'#6C63FF':'#E5E0D8'}`,background:form.type===qt.id?'#EDE9FE':'#FAFAF8',cursor:'pointer',textAlign:'center'}}><div style={{fontSize:16,marginBottom:4,color:form.type===qt.id?'#6C63FF':'#9B98B8'}}>{qt.icon}</div><div style={{fontSize:11,fontWeight:600,color:form.type===qt.id?'#6C63FF':'#9B98B8'}}>{qt.label}</div></button>)}</div></Field>
      <Field label="Question Text"><textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} rows={3} placeholder="Enter question…" style={{...inp,lineHeight:1.6,resize:'none'}}/></Field>
      {form.type==='scale'&&<div style={{background:'#FAFAF8',borderRadius:14,padding:16,border:'1px solid #E5E0D8',marginBottom:18}}><Lbl>Scale Range</Lbl><div style={{display:'flex',gap:12,marginBottom:12,flexDirection:isMobile?'column':'row'}}>{[['Min','scaleMin'],['Max','scaleMax']].map(([l,k])=><div key={k} style={{flex:1}}><div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>{l}</div><input type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{...inp,padding:'8px 10px',borderRadius:8}}/></div>)}</div><div style={{display:'flex',gap:12,flexDirection:isMobile?'column':'row'}}>{[['Min Label','scaleMinLabel','e.g. Not at all'],['Max Label','scaleMaxLabel','e.g. Extremely']].map(([l,k,p])=><div key={k} style={{flex:1}}><div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>{l}</div><input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={p} style={{...inp,padding:'8px 10px',borderRadius:8,fontSize:13}}/></div>)}</div></div>}
      {form.type==='choice'&&<Field label="Options (one per line)"><textarea value={form.options} onChange={e=>setForm(f=>({...f,options:e.target.value}))} rows={5} placeholder={'Very well\nWell\nOkay\nPoorly\nTerribly'} style={{...inp,lineHeight:1.8,resize:'none'}}/></Field>}
      <Field label="Folder"><input value={form.folder||''} onChange={e=>setForm(f=>({...f,folder:e.target.value}))} placeholder="e.g. Book EMA" style={inp}/></Field>
      <Field label="Category"><input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. Cognitive Mechanisms" style={inp}/></Field>
      <Field label="Mechanism (optional)"><input value={form.mechanism} onChange={e=>setForm(f=>({...f,mechanism:e.target.value}))} placeholder="e.g. Body dissatisfaction" style={inp}/></Field>
      <div style={{display:'flex',gap:10}}>
        <button onClick={()=>setShowForm(false)} style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
        <button onClick={save} disabled={!form.text.trim()||saving} style={{flex:2,padding:11,borderRadius:12,border:'none',background:form.text.trim()?'#1A1A2E':'#E5E0D8',color:form.text.trim()?'#E8E4FF':'#9B98B8',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{saving?<Spin/>:(editing?'Save Changes':'Create Question')}</button>
      </div>
    </div>
  )

  // ── Assign Modal (two-step: pick client → configure schedule) ────────────────
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
              {templates.length===0&&(
                <div style={{textAlign:'center',padding:'30px 20px',color:'#C8C0B0',fontSize:13,lineHeight:1.6}}>
                  No templates yet.<br/>Create one in the Schedule tab first.
                </div>
              )}
              <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                {templates.map(t=>(
                  <div key={t.id} onClick={()=>setSelectedTemplate(t)} style={{background:'#fff',borderRadius:14,padding:'14px 16px',border:`1.5px solid ${selectedTemplate?.id===t.id?'#6C63FF':'#E8E3DA'}`,cursor:'pointer',transition:'border-color .15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                          <span style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{t.name}</span>
                          {t.isDefault&&<span style={{fontSize:10,fontWeight:700,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'1px 7px'}}>DEFAULT</span>}
                        </div>
                        <div style={{fontSize:12,color:'#6B6888',marginBottom:2}}>{t.type==='custom_interval'?`Every ${t.intervalHours}h from ${(t.times||['08:00'])[0]}`:t.type==='weekly'?`${(t.days||[]).join(', ')} at ${(t.times||['09:00'])[0]}`:(t.times||[]).join(' · ')}</div>
                        <div style={{fontSize:11,color:'#9B98B8'}}>{t.defaultDuration} days</div>
                      </div>
                      <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${selectedTemplate?.id===t.id?'#6C63FF':'#D1D5DB'}`,background:selectedTemplate?.id===t.id?'#6C63FF':'transparent',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        {selectedTemplate?.id===t.id&&<div style={{width:8,height:8,borderRadius:'50%',background:'#fff'}}/>}
                      </div>
                    </div>
                  </div>
                ))}
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

  // ── Folder List View ──────────────────────────────────────────────────────────
  if(!selectedFolder){
    return(
      <div>
        {AssignModal}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Question Bank</h2>
            <p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{questions.length} questions · {folderNames.length} folder{folderNames.length!==1?'s':''}</p>
          </div>
          <button onClick={openNew} style={{background:'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer'}}>+ New Question</button>
        </div>
        {showForm&&FormPanel}
        {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
          {folderNames.map(f=>{
            const qs=folderMap[f]||[]
            const catCounts={}; qs.forEach(q=>{const c=q.category||'General'; catCounts[c]=(catCounts[c]||0)+1})
            const topCats=Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).slice(0,2)
            return(
              <div key={f} onClick={()=>{setSelectedFolder(f);setCatFilter('All');setSearch('');setShowForm(false)}}
                style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',cursor:'pointer',display:'flex',flexDirection:'column'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
                  <div style={{width:44,height:44,borderRadius:12,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>📁</div>
                  <span style={{color:'#C8C0B0',fontSize:18}}>→</span>
                </div>
                <div style={{fontWeight:700,fontSize:17,color:'#1A1A2E',marginBottom:4}}>{f}</div>
                <div style={{fontSize:13,color:'#9B98B8',marginBottom:12}}>{qs.length} question{qs.length!==1?'s':''}</div>
                {topCats.length>0&&<div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:14}}>
                  {topCats.map(([c,n])=><span key={c} style={{fontSize:10,fontWeight:600,color:'#6C63FF',background:'#EDE9FE',borderRadius:20,padding:'2px 8px'}}>{c} · {n}</span>)}
                  {Object.keys(catCounts).length>2&&<span style={{fontSize:10,color:'#C8C0B0',alignSelf:'center'}}>+{Object.keys(catCounts).length-2} more</span>}
                </div>}
                <button onClick={e=>{e.stopPropagation();setAssignTarget(f);setAssignSuccess(null);setAssignSearch('');setAssignStep(1);setAssignUser(null)}}
                  style={{marginTop:'auto',padding:'8px 0',borderRadius:10,border:'1.5px solid #6C63FF',background:'#EDE9FE',color:'#6C63FF',fontSize:12,fontWeight:700,cursor:'pointer',width:'100%'}}>
                  Assign to Client
                </button>
              </div>
            )
          })}
        </div>
        {!loading&&folderNames.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>📁</div><p style={{fontSize:15,fontWeight:500}}>No questions yet</p></div>}
      </div>
    )
  }

  // ── Folder Detail View ────────────────────────────────────────────────────────
  const folderQs=folderMap[selectedFolder]||[]
  const cats=['All',...Array.from(new Set(folderQs.map(q=>q.category||'General')))]
  const filtered=folderQs.filter(q=>{
    const mc=catFilter==='All'||(q.category||'General')===catFilter
    const ms=!search||q.text?.toLowerCase().includes(search.toLowerCase())||(q.mechanism||'').toLowerCase().includes(search.toLowerCase())
    return mc&&ms
  })

  return(
    <div>
      {AssignModal}

      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:24,flexWrap:'wrap'}}>
        <button onClick={()=>{setSelectedFolder(null);setShowForm(false)}} style={{background:'none',border:'1.5px solid #E5E0D8',borderRadius:10,padding:'8px 14px',fontSize:13,color:'#6B6888',cursor:'pointer',fontWeight:600,flexShrink:0}}>← Folders</button>
        <div style={{flex:1,minWidth:0}}>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:22,color:'#1A1A2E',margin:0}}>{selectedFolder}</h2>
          <p style={{fontSize:13,color:'#9B98B8',margin:'2px 0 0'}}>{filtered.length} of {folderQs.length} questions</p>
        </div>
        <button onClick={()=>{setAssignTarget(selectedFolder);setAssignSuccess(null);setAssignSearch('');setAssignStep(1);setAssignUser(null)}} style={{background:'#6C63FF',color:'#fff',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer',flexShrink:0}}>Assign to Client</button>
        <button onClick={openNew} style={{background:'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer',flexShrink:0}}>+ New Question</button>
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
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>openEdit(q)} style={{padding:'7px 14px',borderRadius:10,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:12,fontWeight:600,cursor:'pointer'}}>Edit</button>
                <button onClick={()=>del(q.id)} style={{padding:'7px 12px',borderRadius:10,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:12,fontWeight:600,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>◈</div><p style={{fontSize:15,fontWeight:500}}>{folderQs.length===0?'No questions in this folder yet':'No questions match your search'}</p></div>}
      </div>
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
                <button onClick={()=>del(t)} style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:11,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Responses View ────────────────────────────────────────────────────────────
function ResponsesView({questions}) {
  const [users,setUsers]       = useState([])
  const [responses,setResponses] = useState([])
  const [loading,setLoading]   = useState(true)
  const [selectedUser,setSelectedUser] = useState(null)
  const [dateFrom,setDateFrom] = useState('')
  const [dateTo,setDateTo]     = useState('')

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'users'),s=>{setUsers(s.docs.map(d=>({id:d.id,...d.data()})))})
    const u2=onSnapshot(collection(db,'responses'),s=>{setResponses(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)})
    return()=>{u1();u2()}
  },[])

  function qInfo(id){return questions.find(q=>q.id===id)}

  // Filter responses for selected user + date range
  const userResponses = selectedUser
    ? responses.filter(r=>{
        if(r.userId!==selectedUser.id) return false
        if(r.answer==='__skipped__') return false
        if(dateFrom && r.date < dateFrom) return false
        if(dateTo   && r.date > dateTo)   return false
        return true
      }).sort((a,b)=>a.ts>b.ts?-1:1)
    : []

  // Group by question for chart data (scale questions only)
  function getChartData(qId) {
    return userResponses
      .filter(r=>r.questionId===qId)
      .map(r=>({date:r.date, value:+r.answer}))
      .sort((a,b)=>a.date>b.date?1:-1)
  }

  // Simple SVG line chart
  function MiniChart({data, color='#6C63FF', q}) {
    if(data.length < 2) return <div style={{fontSize:12,color:'#C8C0B0',padding:'8px 0'}}>Not enough data points yet.</div>
    const W=420, H=80, PX=8, PY=10
    const vals = data.map(d=>d.value)
    const min = Math.min(...vals), max = Math.max(...vals)
    const range = max-min || 1
    const xs = data.map((_,i)=>PX+(i/(data.length-1))*(W-PX*2))
    const ys = data.map(d=>PY+((max-d.value)/range)*(H-PY*2))
    const path = xs.map((x,i)=>`${i===0?'M':'L'}${x},${ys[i]}`).join(' ')
    const area = path+` L${xs[xs.length-1]},${H-PY} L${xs[0]},${H-PY} Z`
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

  // CSV export
  function exportCSV() {
    if(!selectedUser||!userResponses.length) return
    const rows = [['Date','Time','Question','Category','Type','Answer']]
    userResponses.forEach(r=>{
      const q=qInfo(r.questionId)
      rows.push([
        r.date,
        r.ts ? new Date(r.ts).toLocaleTimeString() : '',
        q?.text||r.questionId,
        q?.category||'',
        q?.type||'',
        r.answer
      ])
    })
    const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${selectedUser.name.replace(/ /g,'_')}_responses_${today()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Group userResponses by question
  const byQuestion = {}
  userResponses.forEach(r=>{
    if(!byQuestion[r.questionId]) byQuestion[r.questionId]=[]
    byQuestion[r.questionId].push(r)
  })

  const scaleColors = ['#6C63FF','#6ECB8A','#F6C549','#F2857A','#7BB8F5','#B48FE8']

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div>
          <h2 style={{fontFamily:"'Inter',sans-serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Responses</h2>
          <p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>Click a client to view their response history</p>
        </div>
        {selectedUser&&userResponses.length>0&&(
          <button onClick={exportCSV} style={{background:'#1A6644',color:'#fff',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8}}>
            ↓ Export CSV
          </button>
        )}
      </div>

      {/* User list */}
      {!selectedUser&&<>
        {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
        {!loading&&users.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>◎</div><p style={{fontSize:15}}>No users yet</p></div>}
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {users.map(u=>{
            const count=responses.filter(r=>r.userId===u.id&&r.answer!=='__skipped__').length
            const last=responses.filter(r=>r.userId===u.id).sort((a,b)=>a.ts>b.ts?-1:1)[0]
            return(
              <div key={u.id} onClick={()=>setSelectedUser(u)} style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1.5px solid #E8E3DA',display:'flex',alignItems:'center',gap:16,cursor:'pointer'}}>
                <div style={{width:42,height:42,borderRadius:14,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#6C63FF',flexShrink:0}}>{u.name?.split(' ').map(n=>n[0]).join('')||'?'}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:15,color:'#1A1A2E'}}>{u.name}</div>
                  <div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{count} response{count!==1?'s':''}{last?` · Last: ${last.date}`:' · No responses yet'}</div>
                </div>
                <span style={{color:'#C8C0B0',fontSize:20}}>›</span>
              </div>
            )
          })}
        </div>
      </>}

      {/* User detail view */}
      {selectedUser&&<>
        {/* Back + filters */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20,flexWrap:'wrap'}}>
          <button onClick={()=>{setSelectedUser(null);setDateFrom('');setDateTo('')}} style={{background:'none',border:'1.5px solid #E5E0D8',borderRadius:10,padding:'8px 14px',fontSize:13,color:'#6B6888',cursor:'pointer',fontWeight:600}}>← All Users</button>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'#fff',borderRadius:12,padding:'8px 14px',border:'1.5px solid #E5E0D8'}}>
            <div style={{width:36,height:36,borderRadius:10,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'#6C63FF'}}>{selectedUser.name?.split(' ').map(n=>n[0]).join('')||'?'}</div>
            <div><div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{selectedUser.name}</div><div style={{fontSize:11,color:'#9B98B8'}}>{userResponses.length} response{userResponses.length!==1?'s':''}</div></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
            <div style={{fontSize:12,color:'#9B98B8'}}>From</div>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{border:'1.5px solid #E5E0D8',borderRadius:8,padding:'6px 10px',fontSize:12,color:'#1A1A2E',background:'#fff'}}/>
            <div style={{fontSize:12,color:'#9B98B8'}}>To</div>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{border:'1.5px solid #E5E0D8',borderRadius:8,padding:'6px 10px',fontSize:12,color:'#1A1A2E',background:'#fff'}}/>
          </div>
        </div>

        {userResponses.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>◈</div><p style={{fontSize:15}}>No responses yet{(dateFrom||dateTo)?' in this date range':''}</p></div>}

        {userResponses.length>0&&<>
          {/* Charts — scale questions only */}
          {Object.keys(byQuestion).filter(qId=>{
            const q=qInfo(qId); return q?.type==='scale' && byQuestion[qId].length>=2
          }).length>0&&(
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
                    <MiniChart data={data} color={color} q={q} qId={qId}/>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full response table */}
          <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA'}}>
            <div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:16}}>All Responses ({userResponses.length})</div>
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
                  {userResponses.map((r,i)=>{
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
      </>}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [authed,setAuthed]=useState(null); const [view,setView]=useState('questions')
  const [questions,setQuestions]=useState([])
  const [sidebarOpen,setSidebarOpen]=useState(false)
  const isMobile=useMobile()

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,u=>setAuthed(!!u))
    return unsub
  },[])

  // Load questions globally so UsersView and DefaultScheduleView share them
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
          {view==='questions'&&<QuestionsView/>}
          {view==='schedule'&&<ScheduleView/>}
          {view==='default'&&<DefaultScheduleView questions={questions}/>}
          {view==='users'&&<UsersView questions={questions}/>}
          {view==='responses'&&<ResponsesView questions={questions}/>}
          {view==='invites'&&<InvitesView/>}
        </div>
      </div>
    </div>
  )
}
