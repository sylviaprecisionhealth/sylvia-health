import { useState, useEffect } from 'react'
import { db, auth } from './firebase.js'
import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy
} from 'firebase/firestore'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'

const G = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{background:#F4F1EC;font-family:'DM Sans',sans-serif}
  ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#C8C0B0;border-radius:4px}
  input,textarea,select{font-family:'DM Sans',sans-serif} input:focus,textarea:focus,select:focus{outline:none}
  @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pop{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
`

const Q_TYPES = [{id:'scale',label:'Scale',icon:'▬'},{id:'choice',label:'Multiple Choice',icon:'◉'},{id:'text',label:'Free Text',icon:'☰'}]
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const REPEATS = ['One-time','Daily','Weekly','Custom interval']
function makeCode(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return'SYLVIA-'+Array.from({length:6},()=>c[Math.floor(Math.random()*c.length)]).join('')}
function today(){return new Date().toISOString().split('T')[0]}

const Spin = () => <div style={{width:18,height:18,border:'2px solid #E5E0D8',borderTop:'2px solid #6C63FF',borderRadius:'50%',animation:'spin .7s linear infinite',flexShrink:0}}/>
const Badge = ({status}) => { const m={active:['#1A6644','#D1FAE5'],paused:['#92400E','#FEF3C7']}; const [c,bg]=m[status]||['#374151','#F3F4F6']; return <span style={{fontSize:11,fontWeight:600,color:c,background:bg,borderRadius:20,padding:'3px 10px',textTransform:'capitalize'}}>{status}</span> }
const TBadge = ({type}) => { const m={scale:['#1D4ED8','#DBEAFE'],choice:['#6D28D9','#EDE9FE'],text:['#065F46','#D1FAE5']}; const [c,bg]=m[type]||['#374151','#F3F4F6']; const t=Q_TYPES.find(q=>q.id===type); return <span style={{fontSize:11,fontWeight:600,color:c,background:bg,borderRadius:20,padding:'3px 10px'}}>{t?.icon} {t?.label}</span> }
const Lbl = ({children}) => <label style={{fontSize:11,fontWeight:600,color:'#6B6888',letterSpacing:1,textTransform:'uppercase',display:'block',marginBottom:8}}>{children}</label>
const Field = ({label,children}) => <div style={{marginBottom:18}}><Lbl>{label}</Lbl>{children}</div>
const inp = {border:'1.5px solid #E5E0D8',borderRadius:12,padding:'11px 14px',fontSize:14,color:'#1A1A2E',background:'#FAFAF8',width:'100%'}
const Logo = () => <svg width="36" height="36" viewBox="0 0 44 44" fill="none"><rect width="44" height="44" rx="11" fill="#6C63FF" fillOpacity=".18"/><circle cx="22" cy="22" r="8" stroke="#A89FFF" strokeWidth="1.5" fill="none"/><circle cx="22" cy="22" r="3" fill="#A89FFF"/><line x1="22" y1="9" x2="22" y2="14" stroke="#6C63FF" strokeWidth="1.5" strokeLinecap="round"/><line x1="22" y1="30" x2="22" y2="35" stroke="#6C63FF" strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="22" x2="14" y2="22" stroke="#6C63FF" strokeWidth="1.5" strokeLinecap="round"/><line x1="30" y1="22" x2="35" y2="22" stroke="#6C63FF" strokeWidth="1.5" strokeLinecap="round"/></svg>

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
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:28}}><Logo/><div><div style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:20,color:'#1A1A2E'}}>Sylvia</div><div style={{fontSize:11,color:'#9B98B8'}}>Admin Console</div></div></div>
        <Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@example.com" style={inp} onKeyDown={e=>e.key==='Enter'&&login()}/></Field>
        <Field label="Password"><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={inp} onKeyDown={e=>e.key==='Enter'&&login()}/></Field>
        {err&&<p style={{color:'#EF4444',fontSize:12,marginBottom:12,lineHeight:1.5}}>{err}</p>}
        <button onClick={login} disabled={loading} style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?<Spin/>:'Sign In →'}</button>
      </div>
    </div>
  )
}

function Sidebar({active,setActive,onLogout}) {
  const nav=[{id:'questions',label:'Questions',icon:'◈'},{id:'schedule',label:'Schedule',icon:'◷'},{id:'users',label:'Users',icon:'◎'},{id:'invites',label:'Invites',icon:'✉'}]
  return (
    <div style={{width:230,background:'#1A1A2E',minHeight:'100vh',display:'flex',flexDirection:'column',padding:'28px 0',flexShrink:0}}>
      <div style={{padding:'0 20px 28px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}><Logo/><div><div style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:22,color:'#E8E4FF',letterSpacing:-0.3}}>Sylvia</div><div style={{fontSize:11,color:'#6B6888',marginTop:2}}>Precision Health</div></div></div>
        <div style={{fontSize:10,color:'#4A4A72',background:'#FFFFFF0A',borderRadius:6,padding:'3px 10px',display:'inline-block',letterSpacing:1,textTransform:'uppercase'}}>Admin Console</div>
      </div>
      <div style={{flex:1,padding:'0 12px'}}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setActive(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'11px 14px',borderRadius:12,border:'none',cursor:'pointer',marginBottom:4,background:active===n.id?'#FFFFFF12':'transparent',transition:'background .15s'}}>
            <span style={{fontSize:16,color:active===n.id?'#A89FFF':'#4A4A72'}}>{n.icon}</span>
            <span style={{fontWeight:active===n.id?600:400,fontSize:14,color:active===n.id?'#E8E4FF':'#6B6888'}}>{n.label}</span>
            {active===n.id&&<div style={{marginLeft:'auto',width:5,height:5,borderRadius:'50%',background:'#A89FFF'}}/>}
          </button>
        ))}
      </div>
      <div style={{padding:'16px 20px 0',borderTop:'1px solid #FFFFFF0A'}}>
        <button onClick={onLogout} style={{background:'none',border:'none',color:'#4A4A72',fontSize:12,cursor:'pointer',padding:0}}>Sign out</button>
      </div>
    </div>
  )
}

function InvitesView() {
  const [invites,setInvites]=useState([]); const [loading,setLoading]=useState(true); const [copied,setCopied]=useState(null)
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [creating,setCreating]=useState(false); const [done,setDone]=useState(null); const [showForm,setShowForm]=useState(false)

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'invites'),snap=>{setInvites(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false)})
    return unsub
  },[])

  async function create() {
    setCreating(true)
    const code=makeCode()
    const inv={code,name:name.trim(),email:email.trim(),used:false,userId:null,createdAt:today()}
    await setDoc(doc(db,'invites',code),inv)
    setDone(inv); setCreating(false)
  }

  function copy(code){navigator.clipboard?.writeText(code); setCopied(code); setTimeout(()=>setCopied(null),2000)}
  const valid=name.trim().length>1&&email.includes('@')
  const pending=invites.filter(i=>!i.used), used=invites.filter(i=>i.used)

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div><h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Patient Invites</h2><p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{pending.length} pending · {used.length} accepted</p></div>
        <button onClick={()=>{setShowForm(true);setDone(null);setName('');setEmail('')}} style={{background:'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer'}}>+ New Invite</button>
      </div>
      {showForm&&!done&&(
        <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .3s ease'}}>
          <h3 style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:16}}>New Invite</h3>
          <Field label="Patient Name"><input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Jordan Ellis" style={inp}/></Field>
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
            <span style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:22,color:'#A89FFF',letterSpacing:3}}>{done.code}</span>
          </div>
          <p style={{fontSize:12,color:'#C8C0B0',marginBottom:16}}>Share this code — patient enters it in the Sylvia app to register</p>
          <div style={{display:'flex',gap:10,justifyContent:'center'}}>
            <button onClick={()=>copy(done.code)} style={{padding:'8px 20px',borderRadius:10,border:'1.5px solid #E5E0D8',background:copied===done.code?'#D1FAE5':'#fff',color:copied===done.code?'#1A6644':'#6B6888',fontSize:13,fontWeight:600,cursor:'pointer'}}>{copied===done.code?'Copied!':'Copy Code'}</button>
            <button onClick={()=>{setShowForm(false);setDone(null)}} style={{padding:'8px 20px',borderRadius:10,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:13,fontWeight:700,cursor:'pointer'}}>Done</button>
          </div>
        </div>
      )}
      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      {!loading&&pending.length>0&&<>
        <div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Pending</div>
        {pending.map(inv=>(
          <div key={inv.id} style={{background:'#fff',borderRadius:16,padding:'16px 20px',border:'1.5px solid #E8E3DA',marginBottom:10,display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:38,height:38,borderRadius:10,background:'#DBEAFE',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>✉</div>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{inv.name}</div><div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{inv.email} · {inv.createdAt}</div></div>
            <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
              <div style={{background:'#F4F1EC',borderRadius:8,padding:'5px 10px',fontWeight:700,fontSize:12,color:'#6B6888',letterSpacing:1.5}}>{inv.code}</div>
              <button onClick={()=>copy(inv.code)} style={{padding:'5px 10px',borderRadius:8,border:'1.5px solid #E5E0D8',background:copied===inv.code?'#D1FAE5':'#fff',color:copied===inv.code?'#1A6644':'#6B6888',fontSize:11,fontWeight:600,cursor:'pointer'}}>{copied===inv.code?'✓':'Copy'}</button>
            </div>
          </div>
        ))}
      </>}
      {!loading&&used.length>0&&<div style={{marginTop:pending.length?20:0}}>
        <div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Accepted</div>
        {used.map(inv=>(
          <div key={inv.id} style={{background:'#fff',borderRadius:16,padding:'14px 20px',border:'1.5px solid #E8E3DA',marginBottom:10,display:'flex',alignItems:'center',gap:14,opacity:.65}}>
            <div style={{width:38,height:38,borderRadius:10,background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>✓</div>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:'#1A1A2E'}}>{inv.name}</div><div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{inv.email}</div></div>
            <Badge status="active"/>
          </div>
        ))}
      </div>}
    </div>
  )
}

function QuestionsView() {
  const [questions,setQuestions]=useState([]); const [loading,setLoading]=useState(true)
  const [editing,setEditing]=useState(null); const [showForm,setShowForm]=useState(false)
  const [catFilter,setCatFilter]=useState('All'); const [search,setSearch]=useState('')
  const [form,setForm]=useState({type:'scale',text:'',scaleMin:0,scaleMax:100,scaleMinLabel:'Not at all',scaleMaxLabel:'More than I ever have',options:'',category:'General',mechanism:''}); const [saving,setSaving]=useState(false)

  useEffect(()=>{
    const unsub=onSnapshot(collection(db,'questions'),snap=>{setQuestions(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false)})
    return unsub
  },[])

  function openNew(){setEditing(null);setForm({type:'scale',text:'',scaleMin:0,scaleMax:100,scaleMinLabel:'Not at all',scaleMaxLabel:'More than I ever have',options:'',category:'General',mechanism:''});setShowForm(true)}
  function openEdit(q){setEditing(q);setForm({...q,options:q.options?.join('\n')||''});setShowForm(true)}

  async function save() {
    if(!form.text.trim())return; setSaving(true)
    const data={...form,scaleMin:+form.scaleMin,scaleMax:+form.scaleMax,options:form.type==='choice'?form.options.split('\n').map(s=>s.trim()).filter(Boolean):[],scheduled:editing?.scheduled||[]}
    if(editing){await setDoc(doc(db,'questions',editing.id),data,{merge:true})}
    else{const ref=await addDoc(collection(db,'questions'),data);await updateDoc(doc(db,'questions',ref.id),{id:ref.id})}
    setShowForm(false); setSaving(false)
  }

  async function del(id){await deleteDoc(doc(db,'questions',id))}

  const cats=['All',...Array.from(new Set(questions.map(q=>q.category||'General')))]
  const filtered=questions.filter(q=>{const mc=catFilter==='All'||(q.category||'General')===catFilter;const ms=!search||q.text?.toLowerCase().includes(search.toLowerCase())||(q.mechanism||'').toLowerCase().includes(search.toLowerCase());return mc&&ms})

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
        <div><h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Question Bank</h2><p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{filtered.length} of {questions.length} questions</p></div>
        <button onClick={openNew} style={{background:'#1A1A2E',color:'#E8E4FF',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:'pointer'}}>+ New Question</button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search questions or mechanisms…" style={{...inp,marginBottom:14}}/>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
        {cats.map(c=><button key={c} onClick={()=>setCatFilter(c)} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${catFilter===c?'#1A1A2E':'#E5E0D8'}`,background:catFilter===c?'#1A1A2E':'#fff',color:catFilter===c?'#E8E4FF':'#9B98B8',fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{c}</button>)}
      </div>
      {showForm&&(
        <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .3s ease'}}>
          <h3 style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:16}}>{editing?'Edit Question':'New Question'}</h3>
          <Field label="Type"><div style={{display:'flex',gap:8}}>{Q_TYPES.map(qt=><button key={qt.id} onClick={()=>setForm(f=>({...f,type:qt.id}))} style={{flex:1,padding:'10px 8px',borderRadius:12,border:`2px solid ${form.type===qt.id?'#6C63FF':'#E5E0D8'}`,background:form.type===qt.id?'#F0EEFF':'#FAFAF8',cursor:'pointer',textAlign:'center'}}><div style={{fontSize:16,marginBottom:4,color:form.type===qt.id?'#6C63FF':'#9B98B8'}}>{qt.icon}</div><div style={{fontSize:11,fontWeight:600,color:form.type===qt.id?'#6C63FF':'#9B98B8'}}>{qt.label}</div></button>)}</div></Field>
          <Field label="Question Text"><textarea value={form.text} onChange={e=>setForm(f=>({...f,text:e.target.value}))} rows={3} placeholder="Enter question…" style={{...inp,lineHeight:1.6,resize:'none'}}/></Field>
          {form.type==='scale'&&<div style={{background:'#FAFAF8',borderRadius:14,padding:16,border:'1px solid #E5E0D8',marginBottom:18}}><Lbl>Scale Range</Lbl><div style={{display:'flex',gap:12,marginBottom:12}}>{[['Min','scaleMin'],['Max','scaleMax']].map(([l,k])=><div key={k} style={{flex:1}}><div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>{l}</div><input type="number" value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{...inp,padding:'8px 10px',borderRadius:8}}/></div>)}</div><div style={{display:'flex',gap:12}}>{[['Min Label','scaleMinLabel','e.g. Not at all'],['Max Label','scaleMaxLabel','e.g. Extremely']].map(([l,k,p])=><div key={k} style={{flex:1}}><div style={{fontSize:11,color:'#9B98B8',marginBottom:4}}>{l}</div><input value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={p} style={{...inp,padding:'8px 10px',borderRadius:8,fontSize:13}}/></div>)}</div></div>}
          {form.type==='choice'&&<Field label="Options (one per line)"><textarea value={form.options} onChange={e=>setForm(f=>({...f,options:e.target.value}))} rows={5} placeholder={'Very well\nWell\nOkay\nPoorly\nTerribly'} style={{...inp,lineHeight:1.8,resize:'none'}}/></Field>}
          <Field label="Category"><input value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. Cognitive Mechanisms" style={inp}/></Field>
          <Field label="Mechanism (optional)"><input value={form.mechanism} onChange={e=>setForm(f=>({...f,mechanism:e.target.value}))} placeholder="e.g. Body dissatisfaction" style={inp}/></Field>
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setShowForm(false)} style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            <button onClick={save} disabled={!form.text.trim()||saving} style={{flex:2,padding:11,borderRadius:12,border:'none',background:form.text.trim()?'#1A1A2E':'#E5E0D8',color:form.text.trim()?'#E8E4FF':'#9B98B8',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{saving?<Spin/>:(editing?'Save Changes':'Create Question')}</button>
          </div>
        </div>
      )}
      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {filtered.map(q=>(
          <div key={q.id} style={{background:'#fff',borderRadius:18,padding:'20px 22px',border:'1.5px solid #E8E3DA'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,flexWrap:'wrap'}}><TBadge type={q.type}/>{q.category&&q.category!=='General'&&<span style={{fontSize:11,color:'#6D28D9',background:'#EDE9FE',borderRadius:20,padding:'3px 10px',fontWeight:600}}>{q.category}</span>}{q.mechanism&&<span style={{fontSize:11,color:'#9B98B8'}}>{q.mechanism}</span>}</div>
                <p style={{fontSize:15,color:'#1A1A2E',lineHeight:1.5,fontWeight:500,margin:0}}>{q.text}</p>
                {q.type==='scale'&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}><span style={{fontSize:11,color:'#9B98B8'}}>{q.scaleMinLabel||q.scaleMin}</span><div style={{width:80,height:3,background:'linear-gradient(90deg,#6C63FF,#A89FFF)',borderRadius:4}}/><span style={{fontSize:11,color:'#9B98B8'}}>{q.scaleMaxLabel||q.scaleMax}</span></div>}
                {q.type==='choice'&&q.options?.length>0&&<div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>{q.options.map(o=><span key={o} style={{fontSize:11,color:'#6B6888',background:'#F4F1EC',borderRadius:20,padding:'3px 10px'}}>{o}</span>)}</div>}
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>openEdit(q)} style={{padding:'7px 14px',borderRadius:10,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:12,fontWeight:600,cursor:'pointer'}}>Edit</button>
                <button onClick={()=>del(q.id)} style={{padding:'7px 12px',borderRadius:10,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:12,fontWeight:600,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          </div>
        ))}
        {!loading&&filtered.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>◈</div><p style={{fontSize:15,fontWeight:500}}>{questions.length===0?'No questions yet — create your first one above':'No questions match your filter'}</p></div>}
      </div>
    </div>
  )
}

function ScheduleView() {
  const [questions,setQuestions]=useState([]); const [users,setUsers]=useState([]); const [schedules,setSchedules]=useState([]); const [loading,setLoading]=useState(true); const [showForm,setShowForm]=useState(false); const [saving,setSaving]=useState(false)
  const [form,setForm]=useState({questionId:'',userId:'all',time:'08:00',repeat:'Daily',days:[],interval:4,startDate:today()})

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'questions'),s=>{setQuestions(s.docs.map(d=>({id:d.id,...d.data()})))})
    const u2=onSnapshot(collection(db,'users'),s=>{setUsers(s.docs.map(d=>({id:d.id,...d.data()})))})
    const u3=onSnapshot(collection(db,'schedules'),s=>{setSchedules(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)})
    return()=>{u1();u2();u3()}
  },[])

  useEffect(()=>{if(questions.length&&!form.questionId)setForm(f=>({...f,questionId:questions[0]?.id||''}))},[questions])

  async function addSched(){
    setSaving(true)
    const ref=await addDoc(collection(db,'schedules'),{...form,interval:form.repeat==='Custom interval'?+form.interval:null,active:true})
    await updateDoc(doc(db,'schedules',ref.id),{id:ref.id})
    setShowForm(false); setSaving(false)
  }
  async function toggle(id,active){await updateDoc(doc(db,'schedules',id),{active:!active})}
  async function del(id){await deleteDoc(doc(db,'schedules',id))}
  function toggleDay(d){setForm(f=>({...f,days:f.days.includes(d)?f.days.filter(x=>x!==d):[...f.days,d]}))}
  function qText(id){return questions.find(q=>q.id===id)?.text||'Unknown question'}
  function qType(id){return questions.find(q=>q.id===id)?.type||'scale'}
  function uLabel(id){return id==='all'?'All users':users.find(u=>u.id===id)?.name||id}
  function rLabel(s){if(s.repeat==='Custom interval')return`Every ${s.interval}h`;if(s.repeat==='Weekly'&&s.days?.length)return`Weekly · ${s.days.join(', ')}`;return s.repeat}
  const active=schedules.filter(s=>s.active),paused=schedules.filter(s=>!s.active)

  const SCard=({s,isActive})=>(
    <div style={{background:'#fff',borderRadius:16,padding:'16px 18px',border:`1.5px solid ${isActive?'#E8E3DA':'#F0EDE8'}`,opacity:isActive?1:.6,marginBottom:10}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:6,flexWrap:'wrap'}}><TBadge type={qType(s.questionId)}/><span style={{fontSize:11,color:isActive?'#1A6644':'#92400E',background:isActive?'#D1FAE5':'#FEF3C7',borderRadius:20,padding:'2px 8px',fontWeight:600}}>{isActive?'Active':'Paused'}</span></div>
          <p style={{fontSize:14,color:'#1A1A2E',fontWeight:500,marginBottom:8,lineHeight:1.4}}>{qText(s.questionId).slice(0,80)}{qText(s.questionId).length>80?'…':''}</p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>{[{i:'◷',v:`${s.time} · ${rLabel(s)}`},{i:'◎',v:uLabel(s.userId)},{i:'▷',v:`From ${s.startDate}`}].map(({i,v})=><span key={v} style={{fontSize:11,color:'#9B98B8',display:'flex',alignItems:'center',gap:4}}><span style={{color:'#C8C0B0'}}>{i}</span>{v}</span>)}</div>
        </div>
        <div style={{display:'flex',gap:6,flexShrink:0}}>
          <button onClick={()=>toggle(s.id,s.active)} style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #E5E0D8',background:'#fff',color:'#6B6888',fontSize:11,fontWeight:600,cursor:'pointer'}}>{isActive?'Pause':'Resume'}</button>
          <button onClick={()=>del(s.id)} style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #FEE2E2',background:'#fff',color:'#EF4444',fontSize:11,cursor:'pointer'}}>✕</button>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div><h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Schedule</h2><p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{active.length} active · {paused.length} paused</p></div>
        <button onClick={()=>setShowForm(true)} disabled={!questions.length} style={{background:questions.length?'#1A1A2E':'#E5E0D8',color:questions.length?'#E8E4FF':'#9B98B8',border:'none',borderRadius:14,padding:'11px 20px',fontSize:14,fontWeight:700,cursor:questions.length?'pointer':'default'}}>+ Add Schedule</button>
      </div>
      {showForm&&(
        <div style={{background:'#fff',borderRadius:20,padding:24,border:'1.5px solid #E8E3DA',marginBottom:20,animation:'fadeUp .3s ease'}}>
          <h3 style={{fontWeight:700,fontSize:16,color:'#1A1A2E',marginBottom:16}}>New Schedule</h3>
          <Field label="Question"><select value={form.questionId} onChange={e=>setForm(f=>({...f,questionId:e.target.value}))} style={inp}>{questions.map(q=><option key={q.id} value={q.id}>{q.text?.length>60?q.text.slice(0,60)+'…':q.text}</option>)}</select></Field>
          <Field label="Send To"><select value={form.userId} onChange={e=>setForm(f=>({...f,userId:e.target.value}))} style={inp}><option value="all">All Active Users</option>{users.filter(u=>u.status==='active').map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <div style={{display:'flex',gap:12,marginBottom:18}}>{[['Send Time','time','time'],['Start Date','date','startDate']].map(([l,t,k])=><div key={k} style={{flex:1}}><Lbl>{l}</Lbl><input type={t} value={form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={inp}/></div>)}</div>
          <Field label="Repeat"><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{REPEATS.map(r=><button key={r} onClick={()=>setForm(f=>({...f,repeat:r}))} style={{padding:'10px 12px',borderRadius:10,border:`1.5px solid ${form.repeat===r?'#6C63FF':'#E5E0D8'}`,background:form.repeat===r?'#F0EEFF':'#FAFAF8',color:form.repeat===r?'#6C63FF':'#9B98B8',fontSize:13,fontWeight:600,cursor:'pointer'}}>{r}</button>)}</div></Field>
          {form.repeat==='Weekly'&&<Field label="Days"><div style={{display:'flex',gap:6}}>{DAYS.map(d=><button key={d} onClick={()=>toggleDay(d)} style={{flex:1,padding:'8px 4px',borderRadius:8,border:`1.5px solid ${form.days.includes(d)?'#6C63FF':'#E5E0D8'}`,background:form.days.includes(d)?'#6C63FF':'#FAFAF8',color:form.days.includes(d)?'#fff':'#9B98B8',fontSize:11,fontWeight:600,cursor:'pointer'}}>{d}</button>)}</div></Field>}
          {form.repeat==='Custom interval'&&<Field label="Every N Hours"><div style={{display:'flex',alignItems:'center',gap:12}}><input type="range" min={1} max={24} value={form.interval} onChange={e=>setForm(f=>({...f,interval:e.target.value}))} style={{flex:1,accentColor:'#6C63FF'}}/><span style={{fontWeight:700,fontSize:16,color:'#1A1A2E',minWidth:40}}>{form.interval}h</span></div></Field>}
          <div style={{display:'flex',gap:10}}>
            <button onClick={()=>setShowForm(false)} style={{flex:1,padding:11,borderRadius:12,border:'1.5px solid #E5E0D8',background:'#fff',color:'#9B98B8',fontSize:14,fontWeight:600,cursor:'pointer'}}>Cancel</button>
            <button onClick={addSched} disabled={saving} style={{flex:2,padding:11,borderRadius:12,border:'none',background:'#1A1A2E',color:'#E8E4FF',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{saving?<Spin/>:'Add to Schedule'}</button>
          </div>
        </div>
      )}
      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      {!loading&&schedules.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>◷</div><p style={{fontSize:15,fontWeight:500}}>No schedules yet</p></div>}
      {active.length>0&&<><div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Active</div>{active.map(s=><SCard key={s.id} s={s} isActive={true}/>)}</>}
      {paused.length>0&&<div style={{marginTop:active.length?20:0}}><div style={{fontSize:11,fontWeight:700,color:'#9B98B8',letterSpacing:1.5,textTransform:'uppercase',marginBottom:12}}>Paused</div>{paused.map(s=><SCard key={s.id} s={s} isActive={false}/>)}</div>}
    </div>
  )
}

function UsersView() {
  const [users,setUsers]=useState([]); const [schedules,setSchedules]=useState([]); const [loading,setLoading]=useState(true)
  useEffect(()=>{
    const u1=onSnapshot(collection(db,'users'),s=>{setUsers(s.docs.map(d=>({id:d.id,...d.data()})));setLoading(false)})
    const u2=onSnapshot(collection(db,'schedules'),s=>{setSchedules(s.docs.map(d=>({id:d.id,...d.data()})))})
    return()=>{u1();u2()}
  },[])
  return (
    <div>
      <div style={{marginBottom:28}}><h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:800,fontSize:24,color:'#1A1A2E'}}>Users</h2><p style={{fontSize:13,color:'#9B98B8',marginTop:4}}>{users.length} enrolled patient{users.length!==1?'s':''}</p></div>
      {loading&&<div style={{display:'flex',justifyContent:'center',padding:40}}><Spin/></div>}
      {!loading&&users.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#C8C0B0'}}><div style={{fontSize:40,marginBottom:12}}>◎</div><p style={{fontSize:15,fontWeight:500}}>No users yet — send an invite to get started</p></div>}
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {users.map(u=>{
          const qc=schedules.filter(s=>(s.userId===u.id||s.userId==='all')&&s.active).length
          return(<div key={u.id} style={{background:'#fff',borderRadius:18,padding:'18px 22px',border:'1.5px solid #E8E3DA',display:'flex',alignItems:'center',gap:16}}>
            <div style={{width:42,height:42,borderRadius:14,background:'#F0EEFF',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#6C63FF',flexShrink:0}}>{u.name?.split(' ').map(n=>n[0]).join('')||'?'}</div>
            <div style={{flex:1}}><div style={{fontWeight:600,fontSize:15,color:'#1A1A2E'}}>{u.name}</div><div style={{fontSize:12,color:'#9B98B8',marginTop:2}}>{u.email} · Joined {u.joinedDate}</div></div>
            <div style={{textAlign:'right',flexShrink:0}}><Badge status={u.status||'active'}/><div style={{fontSize:11,color:'#9B98B8',marginTop:5}}>{qc} active question{qc!==1?'s':''}</div></div>
          </div>)
        })}
      </div>
    </div>
  )
}

export default function AdminApp() {
  const [authed,setAuthed]=useState(null); const [view,setView]=useState('questions')
  useEffect(()=>{const unsub=onAuthStateChanged(auth,u=>setAuthed(!!u)); return unsub},[])
  if(authed===null)return<div style={{minHeight:'100vh',background:'#1A1A2E',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{G}</style><Spin/></div>
  if(!authed)return<AdminLogin onLogin={()=>setAuthed(true)}/>
  return(
    <div style={{display:'flex',minHeight:'100vh',background:'#F4F1EC'}}>
      <style>{G}</style>
      <Sidebar active={view} setActive={setView} onLogout={()=>signOut(auth)}/>
      <div style={{flex:1,padding:'40px 44px',overflowY:'auto'}}>
        {view==='questions'&&<QuestionsView/>}
        {view==='schedule'&&<ScheduleView/>}
        {view==='users'&&<UsersView/>}
        {view==='invites'&&<InvitesView/>}
      </div>
    </div>
  )
}
