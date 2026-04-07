import { useState, useEffect, useRef } from 'react'
import { db, auth } from './firebase.js'
import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import {
  registerServiceWorker, requestNotificationPermission,
  scheduleSessionNotifications, listenForSessionOpen,
  startInAppScheduler, isSessionTime, nextSessionTime,
  SESSION_TIMES
} from './notifications.js'

const G = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Playfair+Display:wght@600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{display:none} body{margin:0;background:#080A16}
  textarea:focus{border-color:#6C63FF!important}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pop{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
`

const MOODS=[{label:'Radiant',score:5,emoji:'✦',color:'#F6C549',bg:'#FFF8E1'},{label:'Good',score:4,emoji:'◎',color:'#6ECB8A',bg:'#E8F9ED'},{label:'Neutral',score:3,emoji:'◈',color:'#7BB8F5',bg:'#EBF4FF'},{label:'Low',score:2,emoji:'◇',color:'#B48FE8',bg:'#F3EEFF'},{label:'Struggling',score:1,emoji:'◯',color:'#F2857A',bg:'#FFF0EE'}]
const TAGS=['Work','Rest','Exercise','Social','Family','Anxiety','Grateful','Creative','Tired','Hopeful','Nature','Food']
function fmtDate(d){return new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
function today(){return new Date().toISOString().split('T')[0]}
function nowStr(){return new Date().toISOString()}
const Spin=()=><div style={{width:20,height:20,border:'2px solid #1e2640',borderTop:'2px solid #6C63FF',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>

// ── Welcome ───────────────────────────────────────────────────────────────────
function WelcomeScreen({onLogin,onRegister}){
  return(
    <div style={{minHeight:'100vh',background:'#080A16',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{G}</style>
      <div style={{animation:'fadeUp .6s ease',textAlign:'center',maxWidth:320,width:'100%'}}>
        <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:3,textTransform:'uppercase',marginBottom:10}}>Welcome to</div>
        <h1 style={{fontFamily:"'Playfair Display',serif",color:'#E8E4FF',fontSize:42,fontWeight:800,lineHeight:1,marginBottom:8,letterSpacing:-1}}>Sylvia</h1>
        <p style={{color:'#6B6888',fontSize:14,lineHeight:1.7,marginBottom:48}}>Precision Health — your personal wellness companion, guided by your care team.</p>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <button onClick={onRegister} style={{background:'linear-gradient(135deg,#6C63FF,#4A42CC)',color:'#fff',border:'none',borderRadius:16,padding:'15px',fontSize:15,fontWeight:700,cursor:'pointer'}}>Get Started</button>
          <button onClick={onLogin} style={{background:'transparent',color:'#9B98B8',border:'1px solid #1e2640',borderRadius:16,padding:'15px',fontSize:15,cursor:'pointer'}}>Sign In</button>
        </div>
        <p style={{marginTop:24,fontSize:11,color:'#3a3a5c',lineHeight:1.6}}>You'll need an invite code from your provider to create an account.</p>
      </div>
    </div>
  )
}

// ── Register ──────────────────────────────────────────────────────────────────
function RegisterScreen({onBack,onSuccess}){
  const [step,setStep]=useState(0)
  const [code,setCode]=useState(''); const [codeErr,setCodeErr]=useState(''); const [invite,setInvite]=useState(null)
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [pw,setPw]=useState('')
  const [err,setErr]=useState(''); const [loading,setLoading]=useState(false)

  async function checkCode(){
    setLoading(true); setCodeErr('')
    try{
      const snap=await getDoc(doc(db,'invites',code.trim().toUpperCase()))
      if(!snap.exists()){setCodeErr('Code not found. Check with your provider.');setLoading(false);return}
      const inv=snap.data()
      if(inv.used){setCodeErr('This code has already been used.');setLoading(false);return}
      setInvite(inv); setName(inv.name||''); setEmail(inv.email||''); setStep(1)
    }catch(e){setCodeErr(e.message)}
    setLoading(false)
  }

  async function register(){
    setLoading(true); setErr('')
    try{
      const cred=await createUserWithEmailAndPassword(auth,email.trim(),pw)
      const uid=cred.user.uid
      const newUser={id:uid,name:name.trim(),email:email.trim(),status:'active',joinedDate:today()}
      await setDoc(doc(db,'users',uid),newUser)
      await updateDoc(doc(db,'invites',invite.code),{used:true,userId:uid})
      onSuccess(newUser)
    }catch(e){setErr(e.message)}
    setLoading(false)
  }

  const fs={width:'100%',background:'#0d1120',border:'1.5px solid #1e2640',borderRadius:12,padding:'14px 16px',color:'#E8E4FF',fontSize:14,fontFamily:"'DM Sans',sans-serif"}

  return(
    <div style={{minHeight:'100vh',background:'#080A16',display:'flex',flexDirection:'column',padding:24,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{G}</style>
      <button onClick={onBack} style={{background:'none',border:'none',color:'#6B6888',fontSize:14,cursor:'pointer',alignSelf:'flex-start',marginBottom:24,marginTop:20}}>← Back</button>
      {step===0&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',animation:'fadeUp .4s ease'}}>
          <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Step 1 of 2</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",color:'#E8E4FF',fontSize:26,marginBottom:8}}>Enter Invite Code</h2>
          <p style={{color:'#6B6888',fontSize:14,marginBottom:32,lineHeight:1.6}}>Your provider will have shared a unique code with you.</p>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="SYLVIA-XXXXXX" onKeyDown={e=>e.key==='Enter'&&checkCode()} style={{background:'#0d1120',border:`1.5px solid ${codeErr?'#F2857A':'#1e2640'}`,borderRadius:14,padding:'16px 18px',color:'#E8E4FF',fontSize:18,fontFamily:"'Playfair Display',serif",fontWeight:700,letterSpacing:3,textAlign:'center',marginBottom:codeErr?8:24,width:'100%'}}/>
          {codeErr&&<p style={{color:'#F2857A',fontSize:13,marginBottom:16,textAlign:'center'}}>{codeErr}</p>}
          <button onClick={checkCode} disabled={!code.trim()||loading} style={{background:code.trim()?'linear-gradient(135deg,#6C63FF,#4A42CC)':'#1e2640',color:code.trim()?'#fff':'#3a3a5c',border:'none',borderRadius:14,padding:15,fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?<Spin/>:'Verify Code →'}</button>
        </div>
      )}
      {step===1&&(
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',animation:'fadeUp .4s ease'}}>
          <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Step 2 of 2</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",color:'#E8E4FF',fontSize:26,marginBottom:28}}>Create Your Account</h2>
          {[['Full Name','text',name,setName,'Your name'],['Email','email',email,setEmail,'Your email'],['Password','password',pw,setPw,'Min 6 characters']].map(([l,t,v,s,p])=>(
            <div key={l} style={{marginBottom:14}}>
              <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>{l}</div>
              <input type={t} value={v} onChange={e=>s(e.target.value)} placeholder={p} style={fs}/>
            </div>
          ))}
          {err&&<p style={{color:'#F2857A',fontSize:12,marginBottom:12,lineHeight:1.5}}>{err}</p>}
          <button onClick={register} disabled={!name.trim()||!email.includes('@')||pw.length<6||loading} style={{background:name.trim()&&email.includes('@')&&pw.length>=6?'linear-gradient(135deg,#6ECB8A,#3aaa5e)':'#1e2640',color:name.trim()&&email.includes('@')&&pw.length>=6?'#0a1a10':'#3a3a5c',border:'none',borderRadius:14,padding:15,fontSize:15,fontWeight:700,cursor:'pointer',marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?<Spin/>:'Create Account ✦'}</button>
        </div>
      )}
    </div>
  )
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({onBack,onSuccess}){
  const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false)
  async function login(){
    setLoading(true); setErr('')
    try{
      const cred=await signInWithEmailAndPassword(auth,email.trim(),pw)
      const snap=await getDoc(doc(db,'users',cred.user.uid))
      onSuccess(snap.exists()?{id:snap.id,...snap.data()}:{id:cred.user.uid,name:email.split('@')[0],email:email.trim(),status:'active'})
    }catch(e){setErr('Email or password incorrect.')}
    setLoading(false)
  }
  return(
    <div style={{minHeight:'100vh',background:'#080A16',display:'flex',flexDirection:'column',padding:24,fontFamily:"'DM Sans',sans-serif"}}>
      <style>{G}</style>
      <button onClick={onBack} style={{background:'none',border:'none',color:'#6B6888',fontSize:14,cursor:'pointer',alignSelf:'flex-start',marginBottom:24,marginTop:20}}>← Back</button>
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',animation:'fadeUp .4s ease'}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",color:'#E8E4FF',fontSize:28,marginBottom:8}}>Sign In</h2>
        <p style={{color:'#6B6888',fontSize:14,marginBottom:32}}>Welcome back to Sylvia.</p>
        {[['Email','email',email,setEmail,'your@email.com'],['Password','password',pw,setPw,'••••••••']].map(([l,t,v,s,p])=>(
          <div key={l} style={{marginBottom:14}}>
            <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>{l}</div>
            <input type={t} value={v} onChange={e=>s(e.target.value)} placeholder={p} onKeyDown={e=>e.key==='Enter'&&login()} style={{width:'100%',background:'#0d1120',border:'1.5px solid #1e2640',borderRadius:12,padding:'14px 16px',color:'#E8E4FF',fontSize:14,fontFamily:"'DM Sans',sans-serif"}}/>
          </div>
        ))}
        {err&&<p style={{color:'#F2857A',fontSize:12,marginBottom:12}}>{err}</p>}
        <button onClick={login} disabled={loading} style={{background:'linear-gradient(135deg,#6C63FF,#4A42CC)',color:'#fff',border:'none',borderRadius:14,padding:15,fontSize:15,fontWeight:700,cursor:'pointer',marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?<Spin/>:'Sign In →'}</button>
      </div>
    </div>
  )
}

// ── Notification Permission Banner ────────────────────────────────────────────
function NotifBanner({onDismiss}){
  const [asking,setAsking]=useState(false)
  async function enable(){
    setAsking(true)
    await registerServiceWorker()
    const result=await requestNotificationPermission()
    if(result==='granted') await scheduleSessionNotifications()
    onDismiss()
  }
  return(
    <div style={{background:'linear-gradient(135deg,#1a1f3a,#0f1525)',border:'1px solid #6C63FF44',borderRadius:16,padding:'14px 16px',marginBottom:16,animation:'slideDown .4s ease',display:'flex',alignItems:'center',gap:12}}>
      <div style={{fontSize:22,flexShrink:0}}>🔔</div>
      <div style={{flex:1}}>
        <div style={{color:'#A89FFF',fontWeight:600,fontSize:14,marginBottom:2}}>Enable check-in reminders</div>
        <div style={{color:'#6B6888',fontSize:12,lineHeight:1.5}}>Get notified at 9am, 12pm, 3pm, 6pm and 9pm daily.</div>
      </div>
      <div style={{display:'flex',gap:8,flexShrink:0}}>
        <button onClick={onDismiss} style={{background:'none',border:'none',color:'#4a4a6a',fontSize:12,cursor:'pointer'}}>Later</button>
        <button onClick={enable} disabled={asking} style={{background:'linear-gradient(135deg,#6C63FF,#4A42CC)',color:'#fff',border:'none',borderRadius:10,padding:'7px 14px',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>{asking?<Spin/>:'Enable'}</button>
      </div>
    </div>
  )
}

// ── In-App Session Banner ─────────────────────────────────────────────────────
function SessionBanner({sessionTime, onStart}){
  return(
    <div onClick={onStart} style={{background:'linear-gradient(135deg,#6C63FF,#4A42CC)',borderRadius:16,padding:'16px 18px',marginBottom:16,cursor:'pointer',animation:'slideDown .4s ease',display:'flex',alignItems:'center',gap:12,boxShadow:'0 8px 24px #6C63FF44'}}>
      <div style={{width:40,height:40,borderRadius:12,background:'#FFFFFF22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>🔔</div>
      <div style={{flex:1}}>
        <div style={{color:'#fff',fontWeight:700,fontSize:15}}>Your {sessionTime} check-in is ready</div>
        <div style={{color:'#A89FFF',fontSize:12,marginTop:2}}>Tap to answer your questions</div>
      </div>
      <span style={{color:'#fff',fontSize:20}}>→</span>
    </div>
  )
}

// ── Question Session Flow ─────────────────────────────────────────────────────
function SessionScreen({questions, userId, sessionTime, onComplete}){
  const [idx,setIdx]     = useState(0)
  const [answer,setAnswer] = useState(null)
  const [textVal,setTextVal] = useState('')
  const [choice,setChoice]   = useState(null)
  const [scaleVal,setScaleVal] = useState(null)
  const [saving,setSaving]   = useState(false)
  const [saved,setSaved]     = useState(0) // count saved

  const q = questions[idx]
  const total = questions.length
  const pct = Math.round((idx/total)*100)

  useEffect(()=>{
    // Reset answer state when question changes
    setTextVal(''); setChoice(null)
    setScaleVal(q ? Math.round((q.scaleMin+q.scaleMax)/2) : 50)
  },[idx])

  const canNext = q?.type==='scale' || (q?.type==='text'&&textVal.trim()) || (q?.type==='choice'&&choice!==null)

  async function saveAndNext(){
    if(!q || !canNext) return
    setSaving(true)
    const ans = q.type==='scale' ? String(scaleVal) : q.type==='text' ? textVal.trim() : choice
    try {
      await addDoc(collection(db,'responses'),{
        questionId: q.id,
        userId,
        answer: ans,
        date: today(),
        ts: nowStr(),
        sessionTime: sessionTime||'manual'
      })
    } catch(e){ console.warn('Save error:',e) }
    setSaved(s=>s+1)
    setSaving(false)
    if(idx < total-1){ setIdx(i=>i+1) }
    else { onComplete(saved+1) }
  }

  async function skip(){
    try{
      await addDoc(collection(db,'responses'),{questionId:q.id,userId,answer:'__skipped__',date:today(),ts:nowStr(),sessionTime:sessionTime||'manual'})
    }catch(e){}
    if(idx < total-1){ setIdx(i=>i+1) }
    else { onComplete(saved) }
  }

  if(!q) return null

  return(
    <div style={{minHeight:'100vh',background:'#080A16',display:'flex',flexDirection:'column',fontFamily:"'DM Sans',sans-serif"}}>
      <style>{G}</style>
      {/* Header */}
      <div style={{padding:'52px 20px 16px',maxWidth:480,margin:'0 auto',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:1.5,textTransform:'uppercase'}}>Check-in · {sessionTime||today()}</div>
          <div style={{fontSize:12,color:'#6B6888'}}>{idx+1} of {total}</div>
        </div>
        {/* Progress bar */}
        <div style={{height:4,background:'#1e2640',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:'linear-gradient(90deg,#6C63FF,#A89FFF)',borderRadius:4,transition:'width .3s ease'}}/>
        </div>
      </div>

      {/* Question */}
      <div style={{flex:1,maxWidth:480,margin:'0 auto',padding:'0 20px',width:'100%',overflowY:'auto',paddingBottom:120}}>
        <div style={{animation:'fadeUp .3s ease'}}>
          {/* Type badge */}
          <div style={{marginBottom:14}}>
            {q.type==='scale'&&<span style={{fontSize:11,color:'#7BB8F5',background:'#7BB8F522',borderRadius:20,padding:'3px 10px',fontWeight:600}}>▬ Scale</span>}
            {q.type==='choice'&&<span style={{fontSize:11,color:'#B48FE8',background:'#B48FE822',borderRadius:20,padding:'3px 10px',fontWeight:600}}>◉ Choice</span>}
            {q.type==='text'&&<span style={{fontSize:11,color:'#6ECB8A',background:'#6ECB8A22',borderRadius:20,padding:'3px 10px',fontWeight:600}}>☰ Open</span>}
            {q.category&&q.category!=='General'&&<span style={{fontSize:11,color:'#A89FFF',background:'#6C63FF22',borderRadius:20,padding:'3px 10px',fontWeight:600,marginLeft:6}}>{q.category}</span>}
          </div>

          <p style={{fontFamily:"'Playfair Display',serif",color:'#E8E4FF',fontSize:20,lineHeight:1.5,fontWeight:600,marginBottom:24}}>{q.text}</p>

          {q.type==='scale'&&(
            <div style={{background:'#0d1120',borderRadius:20,padding:24,border:'1px solid #1e2640'}}>
              <div style={{display:'flex',justifyContent:'center',marginBottom:16}}>
                <span style={{fontFamily:"'Playfair Display',serif",fontSize:52,fontWeight:700,color:'#6C63FF'}}>{scaleVal}</span>
              </div>
              <input type="range" min={q.scaleMin} max={q.scaleMax} value={scaleVal} onChange={e=>setScaleVal(+e.target.value)} style={{width:'100%',accentColor:'#6C63FF',marginBottom:10}}/>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:12,color:'#6B6888'}}>{q.scaleMinLabel||q.scaleMin}</span>
                <span style={{fontSize:12,color:'#6B6888'}}>{q.scaleMaxLabel||q.scaleMax}</span>
              </div>
            </div>
          )}

          {q.type==='choice'&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {q.options?.map(o=>(
                <button key={o} onClick={()=>setChoice(o)} style={{padding:'16px 18px',borderRadius:14,border:`2px solid ${choice===o?'#6C63FF':'#1e2640'}`,background:choice===o?'#6C63FF22':'#0d1120',color:choice===o?'#A89FFF':'#9B98B8',fontSize:15,cursor:'pointer',textAlign:'left',fontFamily:"'DM Sans',sans-serif",fontWeight:choice===o?600:400,transition:'all .15s'}}>{o}</button>
              ))}
            </div>
          )}

          {q.type==='text'&&(
            <textarea value={textVal} onChange={e=>setTextVal(e.target.value)} rows={4} placeholder="Type your response here…" style={{width:'100%',background:'#0d1120',border:'1.5px solid #1e2640',borderRadius:14,padding:'14px 16px',color:'#E8E4FF',fontSize:14,fontFamily:"'DM Sans',sans-serif",lineHeight:1.6,resize:'none'}}/>
          )}
        </div>
      </div>

      {/* Bottom actions — fixed */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(8,10,22,.97)',borderTop:'1px solid #1e2640',padding:'16px 20px 32px'}}>
        <div style={{maxWidth:480,margin:'0 auto',display:'flex',gap:10}}>
          <button onClick={skip} style={{flex:1,padding:'14px',borderRadius:14,border:'1px solid #1e2640',background:'transparent',color:'#4a4a6a',fontSize:14,cursor:'pointer'}}>Skip</button>
          <button onClick={saveAndNext} disabled={!canNext||saving} style={{flex:3,padding:'14px',borderRadius:14,border:'none',background:canNext?'linear-gradient(135deg,#6C63FF,#4A42CC)':'#1e2640',color:canNext?'#fff':'#3a3a5c',fontSize:15,fontWeight:700,cursor:canNext?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',gap:8,transition:'all .2s'}}>
            {saving ? <Spin/> : idx < total-1 ? 'Next Question →' : 'Complete Session ✦'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Session Complete Screen ───────────────────────────────────────────────────
function SessionCompleteScreen({answered, total, onHome}){
  return(
    <div style={{minHeight:'100vh',background:'#080A16',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,fontFamily:"'DM Sans',sans-serif",textAlign:'center'}}>
      <style>{G}</style>
      <div style={{animation:'fadeUp .5s ease'}}>
        <div style={{fontSize:64,marginBottom:20}}>✦</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",color:'#E8E4FF',fontSize:28,fontWeight:700,marginBottom:8}}>Session Complete</h2>
        <p style={{color:'#6B6888',fontSize:15,lineHeight:1.7,marginBottom:8}}>You answered {answered} of {total} questions.</p>
        <p style={{color:'#4a4a6a',fontSize:13,marginBottom:40}}>Next check-in: {nextSessionTime()}</p>
        <button onClick={onHome} style={{background:'linear-gradient(135deg,#6C63FF,#4A42CC)',color:'#fff',border:'none',borderRadius:16,padding:'16px 40px',fontSize:16,fontWeight:700,cursor:'pointer'}}>Back to Home</button>
      </div>
    </div>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({entries}){
  const W=220,H=60,P=8; if(entries.length<2)return null
  const pts=entries.slice(-14)
  const xs=pts.map((_,i)=>P+(i/(pts.length-1))*(W-P*2))
  const ys=pts.map(e=>P+(1-(e.mood-1)/4)*(H-P*2))
  const path=xs.map((x,i)=>`${i===0?'M':'L'}${x},${ys[i]}`).join(' ')
  const area=path+` L${xs[xs.length-1]},${H-P} L${xs[0]},${H-P} Z`
  return(<svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%',height:60}}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6ECB8A" stopOpacity=".35"/><stop offset="100%" stopColor="#6ECB8A" stopOpacity="0"/></linearGradient></defs><path d={area} fill="url(#sg)"/><path d={path} fill="none" stroke="#6ECB8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>{xs.map((x,i)=><circle key={i} cx={x} cy={ys[i]} r="3" fill={MOODS.find(m=>m.score===pts[i].mood)?.color||'#6ECB8A'} stroke="#fff" strokeWidth="1.5"/>)}</svg>)
}

// ── Check-in Modal ────────────────────────────────────────────────────────────
function CheckInModal({onSave,onClose,existing}){
  const [step,setStep]=useState(0); const [mood,setMood]=useState(existing?.mood||null)
  const [tags,setTags]=useState(existing?.tags||[]); const [note,setNote]=useState(existing?.note||'')
  const steps=['How are you feeling?','What\'s been part of your day?','Anything else?']
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(8,10,22,.85)',backdropFilter:'blur(8px)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#111827',borderRadius:28,padding:28,width:'100%',maxWidth:420,boxShadow:'0 40px 80px rgba(0,0,0,.6)',border:'1px solid #1e2640',animation:'pop .25s ease'}}>
        <div style={{display:'flex',gap:6,marginBottom:24}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:4,background:i<=step?'#6C63FF':'#1e2640',transition:'background .4s'}}/>)}</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",color:'#E8E4FF',fontSize:20,margin:'0 0 20px',fontWeight:700}}>{steps[step]}</h2>
        {step===0&&<div style={{display:'flex',flexDirection:'column',gap:10}}>{MOODS.map(m=><button key={m.score} onClick={()=>setMood(m.score)} style={{display:'flex',alignItems:'center',gap:14,background:mood===m.score?m.bg+'22':'#0d1120',border:`2px solid ${mood===m.score?m.color:'#1e2640'}`,borderRadius:14,padding:'13px 16px',cursor:'pointer',transition:'all .2s'}}><span style={{fontSize:20,color:m.color}}>{m.emoji}</span><span style={{color:mood===m.score?m.color:'#9B98B8',fontWeight:600,fontSize:14}}>{m.label}</span>{mood===m.score&&<span style={{marginLeft:'auto',color:m.color,fontSize:12}}>✓</span>}</button>)}</div>}
        {step===1&&<div style={{display:'flex',flexWrap:'wrap',gap:8}}>{TAGS.map(t=><button key={t} onClick={()=>setTags(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t])} style={{background:tags.includes(t)?'#6C63FF22':'#0d1120',border:`1.5px solid ${tags.includes(t)?'#6C63FF':'#1e2640'}`,color:tags.includes(t)?'#A89FFF':'#6B6888',borderRadius:20,padding:'8px 16px',fontSize:13,cursor:'pointer'}}>{t}</button>)}</div>}
        {step===2&&<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional — write a few words…" rows={4} style={{width:'100%',background:'#0d1120',border:'1.5px solid #1e2640',borderRadius:14,padding:'13px 15px',color:'#C8C4E8',fontSize:14,fontFamily:"'DM Sans',sans-serif",lineHeight:1.6,resize:'none'}}/>}
        <div style={{display:'flex',gap:10,marginTop:22}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:'#0d1120',border:'1.5px solid #1e2640',color:'#9B98B8',borderRadius:12,padding:'12px',fontSize:14,fontWeight:600,cursor:'pointer'}}>Back</button>}
          {step<2?<button onClick={()=>setStep(s=>s+1)} disabled={step===0&&!mood} style={{flex:2,background:step===0&&!mood?'#1e2640':'linear-gradient(135deg,#6C63FF,#4A42CC)',color:step===0&&!mood?'#3a3a5c':'#fff',borderRadius:12,padding:'12px',fontSize:14,fontWeight:600,border:'none',cursor:'pointer'}}>Continue →</button>
          :<button onClick={()=>onSave({mood,tags,note})} style={{flex:2,background:'linear-gradient(135deg,#6ECB8A,#3aaa5e)',color:'#0a1a10',borderRadius:12,padding:'12px',fontSize:14,fontWeight:700,border:'none',cursor:'pointer'}}>Save ✦</button>}
        </div>
        <button onClick={onClose} style={{display:'block',margin:'12px auto 0',background:'none',border:'none',color:'#4a4a6a',fontSize:13,cursor:'pointer'}}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
function MainApp({user,onLogout}){
  const [tab,setTab]           = useState('home')
  const [entries,setEntries]   = useState([])
  const [questions,setQuestions] = useState([])
  const [schedules,setSchedules] = useState([])
  const [responses,setResponses] = useState({})
  const [showModal,setShowModal] = useState(false)
  const [editEntry,setEditEntry] = useState(null)
  const [selectedEntry,setSelected] = useState(null)

  // Session state
  const [sessionActive,setSessionActive]   = useState(false)
  const [sessionTime,setSessionTime]       = useState(null)
  const [sessionComplete,setSessionComplete] = useState(null) // {answered,total}
  const [sessionBanner,setSessionBanner]   = useState(null)  // time string

  // Notification state
  const [showNotifBanner,setShowNotifBanner] = useState(false)

  useEffect(()=>{
    const u1=onSnapshot(collection(db,'questions'),s=>{setQuestions(s.docs.map(d=>({id:d.id,...d.data()})))})
    const u2=onSnapshot(collection(db,'schedules'),s=>{setSchedules(s.docs.map(d=>({id:d.id,...d.data()})))})
    const u3=onSnapshot(query(collection(db,'moodEntries'),where('userId','==',user.id),orderBy('date','asc')),s=>{setEntries(s.docs.map(d=>({id:d.id,...d.data()})))})
    const u4=onSnapshot(query(collection(db,'responses'),where('userId','==',user.id),where('date','==',today())),s=>{
      const r={}; s.docs.forEach(d=>{const data=d.data(); if(!r[data.questionId])r[data.questionId]=data.answer}); setResponses(r)
    })
    return()=>{u1();u2();u3();u4()}
  },[user.id])

  // Set up notifications + in-app scheduler
  useEffect(()=>{
    // Show permission banner if not yet granted
    if('Notification' in window && Notification.permission==='default'){
      setTimeout(()=>setShowNotifBanner(true), 2000)
    }
    // Register SW for already-granted
    if('Notification' in window && Notification.permission==='granted'){
      registerServiceWorker().then(()=>scheduleSessionNotifications())
    }
    // Listen for SW open-session message
    const unsub = listenForSessionOpen(()=>startSession('notification'))
    // In-app scheduler
    const stopScheduler = startInAppScheduler(time=>{
      setSessionBanner(time)
      setTimeout(()=>setSessionBanner(null), 30*60*1000) // hide after 30min
    })
    // If app opened at session time, show banner
    if(isSessionTime()){
      const now=new Date()
      const t=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      setSessionBanner(t)
    }
    // Check URL param (from notification click)
    if(window.location.search.includes('session=1')) startSession('notification')
    return()=>{unsub(); stopScheduler()}
  },[])

  function startSession(time){
    setSessionTime(time)
    setSessionActive(true)
    setSessionBanner(null)
    setTab('home')
  }

  function completeSession(answered){
    setSessionActive(false)
    setSessionComplete({answered, total:sessionQuestions.length})
  }

  // All questions for a session — respect endDate (15-day window)
  const mySchedules = schedules.filter(s=>{
    if(!s.active) return false
    if(s.userId!=='all' && s.userId!==user.id) return false
    if(s.endDate && today() > s.endDate) return false // expired
    return true
  })
  const hasAllSchedule = mySchedules.some(s=>s.questionId==='__ALL__'||s.isDefaultSession)
  const myQIds = [...new Set(mySchedules.filter(s=>s.questionId!=='__ALL__').map(s=>s.questionId))]
  const sessionQuestions = hasAllSchedule
    ? questions
    : myQIds.length>0
      ? questions.filter(q=>myQIds.includes(q.id))
      : questions

  // Days remaining in schedule
  const defaultSchedule = mySchedules.find(s=>s.isDefaultSession)
  const daysRemaining = defaultSchedule?.endDate
    ? Math.max(0, Math.ceil((new Date(defaultSchedule.endDate) - new Date(today())) / 86400000) + 1)
    : null
  const scheduleExpired = defaultSchedule?.endDate && today() > defaultSchedule.endDate

  const todayAnsweredCount = Object.keys(responses).filter(k=>responses[k]!=='__skipped__').length
  const sessionsDoneToday  = SESSION_TIMES.filter(t=>{
    // rough check — if most questions answered, assume session done
    return false // placeholder, not tracking per-session completion
  }).length

  async function saveEntry({mood,tags,note}){
    const entry={userId:user.id,date:today(),mood,tags,note,updatedAt:nowStr()}
    if(editEntry){await setDoc(doc(db,'moodEntries',editEntry.id),entry,{merge:true})}
    else{await addDoc(collection(db,'moodEntries'),entry)}
    setShowModal(false); setEditEntry(null)
  }
  async function deleteEntry(id){await deleteDoc(doc(db,'moodEntries',id))}

  const todayEntry=entries.find(e=>e.date===today())
  const avgMood=entries.length?(entries.reduce((s,e)=>s+e.mood,0)/entries.length).toFixed(1):'--'
  const streak=(()=>{let s=0,d=new Date();for(let i=0;i<30;i++){const ds=d.toISOString().split('T')[0];if(entries.find(e=>e.date===ds))s++;else break;d.setDate(d.getDate()-1)}return s})()
  const tagFreq={};entries.forEach(e=>e.tags?.forEach(t=>{tagFreq[t]=(tagFreq[t]||0)+1}))
  const topTags=Object.entries(tagFreq).sort((a,b)=>b[1]-a[1]).slice(0,5)
  const firstName=user.name?.split(' ')[0]||'there'

  // ── Session screens ──
  if(sessionActive && sessionQuestions.length>0){
    return <SessionScreen questions={sessionQuestions} userId={user.id} sessionTime={sessionTime} onComplete={completeSession}/>
  }
  if(sessionComplete){
    return <SessionCompleteScreen answered={sessionComplete.answered} total={sessionComplete.total} onHome={()=>setSessionComplete(null)}/>
  }

  return(
    <div style={{minHeight:'100vh',background:'#080A16',fontFamily:"'DM Sans',sans-serif",paddingBottom:90}}>
      <style>{G}</style>
      <div style={{padding:'52px 20px 16px',maxWidth:480,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>Sylvia Precision Health</div>
            <h1 style={{fontFamily:"'Playfair Display',serif",color:'#E8E4FF',fontSize:26,margin:0,fontWeight:700}}>
              {tab==='home'&&`Hello, ${firstName}`}{tab==='log'&&'Mood Log'}{tab==='insights'&&'Insights'}
            </h1>
          </div>
          {tab==='home'&&<button onClick={()=>{setEditEntry(null);setShowModal(true)}} style={{background:'linear-gradient(135deg,#6C63FF,#4A42CC)',color:'#fff',border:'none',borderRadius:16,padding:'10px 18px',fontSize:14,fontWeight:600,cursor:'pointer'}}>+ Check in</button>}
          {tab==='insights'&&<button onClick={onLogout} style={{background:'none',border:'1px solid #1e2640',color:'#6B6888',borderRadius:10,padding:'8px 14px',fontSize:12,cursor:'pointer'}}>Sign out</button>}
        </div>
      </div>

      <div style={{maxWidth:480,margin:'0 auto',padding:'0 20px'}}>

        {tab==='home'&&<>
          {/* Notification permission banner */}
          {showNotifBanner&&<NotifBanner onDismiss={()=>setShowNotifBanner(false)}/>}

          {/* In-app session banner */}
          {sessionBanner&&<SessionBanner sessionTime={sessionBanner} onStart={()=>startSession(sessionBanner)}/>}

          {/* Manual start session button */}
          {!sessionBanner&&sessionQuestions.length>0&&!scheduleExpired&&(
            <div style={{background:'#0d1120',border:'1px solid #1e2640',borderRadius:20,padding:'16px 18px',marginBottom:18,display:'flex',alignItems:'center',gap:14}}>
              <div style={{flex:1}}>
                <div style={{color:'#E8E4FF',fontWeight:600,fontSize:14,marginBottom:2}}>{sessionQuestions.length} questions ready</div>
                <div style={{color:'#6B6888',fontSize:12}}>
                  Next scheduled: {nextSessionTime()}
                  {daysRemaining!==null&&<span style={{color:'#A89FFF',marginLeft:8}}>· {daysRemaining} day{daysRemaining!==1?'s':''} remaining</span>}
                </div>
              </div>
              <button onClick={()=>startSession('manual')} style={{background:'linear-gradient(135deg,#6C63FF,#4A42CC)',color:'#fff',border:'none',borderRadius:12,padding:'10px 16px',fontSize:13,fontWeight:700,cursor:'pointer',flexShrink:0}}>Start Now</button>
            </div>
          )}

          {/* Schedule expired notice */}
          {scheduleExpired&&(
            <div style={{background:'#0d1120',border:'1px solid #1e2640',borderRadius:20,padding:'16px 18px',marginBottom:18}}>
              <div style={{color:'#F6C549',fontWeight:600,fontSize:14,marginBottom:4}}>✦ Study complete</div>
              <div style={{color:'#6B6888',fontSize:13,lineHeight:1.6}}>Your 15-day check-in period has ended. Thank you for your participation. Please contact your care provider if you have questions.</div>
            </div>
          )}

          {/* Today stats */}
          {todayAnsweredCount>0&&(
            <div style={{background:'#0d1120',border:'1px solid #6ECB8A33',borderRadius:16,padding:'12px 16px',marginBottom:18,display:'flex',alignItems:'center',gap:10}}>
              <span style={{color:'#6ECB8A',fontSize:18}}>✓</span>
              <span style={{color:'#9B98B8',fontSize:13}}>{todayAnsweredCount} question{todayAnsweredCount!==1?'s':''} answered today</span>
            </div>
          )}

          {/* Today mood card */}
          <div style={{background:todayEntry?MOODS.find(m=>m.score===todayEntry.mood)?.bg+'18':'#0d1120',border:`1px solid ${todayEntry?MOODS.find(m=>m.score===todayEntry.mood)?.color+'44':'#1e2640'}`,borderRadius:24,padding:22,marginBottom:18}}>
            <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:1.5,textTransform:'uppercase',marginBottom:8}}>Today · {fmtDate(today())}</div>
            {todayEntry?(
              <>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <span style={{fontSize:36,color:MOODS.find(m=>m.score===todayEntry.mood)?.color}}>{MOODS.find(m=>m.score===todayEntry.mood)?.emoji}</span>
                  <div><div style={{color:'#E8E4FF',fontWeight:700,fontSize:18,fontFamily:"'Playfair Display',serif"}}>{MOODS.find(m=>m.score===todayEntry.mood)?.label}</div>{todayEntry.tags?.length>0&&<div style={{display:'flex',gap:6,marginTop:5,flexWrap:'wrap'}}>{todayEntry.tags.map(t=><span key={t} style={{fontSize:11,color:'#9B98B8',background:'#1e2640',borderRadius:20,padding:'3px 10px'}}>{t}</span>)}</div>}</div>
                </div>
                {todayEntry.note&&<p style={{color:'#7B78A0',fontSize:13,margin:'12px 0 0',lineHeight:1.6,fontStyle:'italic'}}>"{todayEntry.note}"</p>}
                <button onClick={()=>{setEditEntry(todayEntry);setShowModal(true)}} style={{marginTop:14,background:'none',border:'1px solid #1e2640',color:'#6B6888',borderRadius:10,padding:'6px 14px',fontSize:12,cursor:'pointer'}}>Edit</button>
              </>
            ):(
              <div style={{textAlign:'center',padding:'14px 0'}}>
                <div style={{fontSize:32,marginBottom:8}}>◌</div>
                <p style={{color:'#4a4a6a',fontSize:14,margin:'0 0 14px'}}>No mood check-in yet today.</p>
                <button onClick={()=>setShowModal(true)} style={{background:'linear-gradient(135deg,#6C63FF,#4A42CC)',color:'#fff',border:'none',borderRadius:14,padding:'10px 22px',fontSize:14,fontWeight:600,cursor:'pointer'}}>Start Check-in</button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:18}}>
            {[{label:'Avg Mood',value:avgMood,unit:'/5',color:'#6ECB8A'},{label:'Streak',value:streak,unit:'d',color:'#F6C549'},{label:'Entries',value:entries.length,unit:'',color:'#7BB8F5'}].map(s=>(
              <div key={s.label} style={{background:'#0d1120',border:'1px solid #1e2640',borderRadius:18,padding:'16px 12px',textAlign:'center'}}>
                <div style={{color:s.color,fontWeight:700,fontSize:22,fontFamily:"'Playfair Display',serif"}}>{s.value}<span style={{fontSize:12,color:'#4a4a6a'}}>{s.unit}</span></div>
                <div style={{color:'#4a4a6a',fontSize:11,marginTop:4}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Sparkline */}
          <div style={{background:'#0d1120',border:'1px solid #1e2640',borderRadius:20,padding:'18px 18px 14px'}}>
            <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:1.5,textTransform:'uppercase',marginBottom:10}}>Last 14 Days</div>
            <Sparkline entries={entries}/>
          </div>
        </>}

        {tab==='log'&&<>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:16}}><button onClick={()=>{setEditEntry(null);setShowModal(true)}} style={{background:'linear-gradient(135deg,#6C63FF,#4A42CC)',color:'#fff',border:'none',borderRadius:14,padding:'10px 18px',fontSize:14,fontWeight:600,cursor:'pointer'}}>+ Add Entry</button></div>
          {[...entries].reverse().map(e=>{
            const m=MOODS.find(x=>x.score===e.mood)
            return(<div key={e.id} onClick={()=>setSelected(selectedEntry?.id===e.id?null:e)} style={{background:'#0d1120',border:`1px solid ${selectedEntry?.id===e.id?m?.color+'55':'#1e2640'}`,borderRadius:18,padding:'16px 18px',marginBottom:12,cursor:'pointer'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:24,color:m?.color}}>{m?.emoji}</span>
                <div style={{flex:1}}><div style={{display:'flex',alignItems:'center',gap:8}}><span style={{color:'#E8E4FF',fontWeight:600,fontSize:15}}>{m?.label}</span><span style={{color:'#3a3a5c',fontSize:12}}>·</span><span style={{color:'#4a4a6a',fontSize:12}}>{fmtDate(e.date)}</span></div>{e.tags?.length>0&&<div style={{display:'flex',gap:5,marginTop:5,flexWrap:'wrap'}}>{e.tags.map(t=><span key={t} style={{fontSize:10,color:'#9B98B8',background:'#1e2640',borderRadius:20,padding:'2px 8px'}}>{t}</span>)}</div>}</div>
                <span style={{color:'#3a3a5c',fontSize:16}}>{selectedEntry?.id===e.id?'▲':'▽'}</span>
              </div>
              {selectedEntry?.id===e.id&&e.note&&<p style={{color:'#7B78A0',fontSize:13,margin:'12px 0 0',lineHeight:1.6,fontStyle:'italic',borderTop:'1px solid #1e2640',paddingTop:12}}>"{e.note}"</p>}
              {selectedEntry?.id===e.id&&<div style={{display:'flex',gap:8,marginTop:12}}>
                <button onClick={ev=>{ev.stopPropagation();setEditEntry(e);setShowModal(true)}} style={{background:'none',border:'1px solid #1e2640',color:'#9B98B8',borderRadius:10,padding:'6px 14px',fontSize:12,cursor:'pointer'}}>Edit</button>
                <button onClick={ev=>{ev.stopPropagation();deleteEntry(e.id);setSelected(null)}} style={{background:'none',border:'1px solid #F2857A44',color:'#F2857A',borderRadius:10,padding:'6px 14px',fontSize:12,cursor:'pointer'}}>Delete</button>
              </div>}
            </div>)
          })}
          {entries.length===0&&<div style={{textAlign:'center',padding:'60px 20px',color:'#4a4a6a'}}><p>No entries yet. Start your first check-in!</p></div>}
        </>}

        {tab==='insights'&&<>
          <div style={{background:'#0d1120',border:'1px solid #1e2640',borderRadius:20,padding:20,marginBottom:18}}>
            <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:1.5,textTransform:'uppercase',marginBottom:14}}>Mood Distribution</div>
            {MOODS.map(m=>{const cnt=entries.filter(e=>e.mood===m.score).length;const pct=entries.length?(cnt/entries.length)*100:0;return(
              <div key={m.score} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <span style={{color:m.color,width:18,textAlign:'center'}}>{m.emoji}</span>
                <span style={{color:'#9B98B8',fontSize:12,width:70}}>{m.label}</span>
                <div style={{flex:1,background:'#1e2640',borderRadius:4,height:8,overflow:'hidden'}}><div style={{width:`${pct}%`,background:m.color,height:'100%',borderRadius:4}}/></div>
                <span style={{color:'#4a4a6a',fontSize:12,width:24,textAlign:'right'}}>{cnt}</span>
              </div>
            )})}
          </div>
          {topTags.length>0&&<div style={{background:'#0d1120',border:'1px solid #1e2640',borderRadius:20,padding:20}}>
            <div style={{fontSize:11,color:'#4a4a6a',letterSpacing:1.5,textTransform:'uppercase',marginBottom:14}}>Top Themes</div>
            {topTags.map(([tag,cnt],i)=>(
              <div key={tag} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <span style={{color:'#4a4a6a',fontSize:12,width:16}}>{i+1}</span>
                <span style={{color:'#E8E4FF',fontSize:14,flex:1,fontWeight:500}}>{tag}</span>
                <div style={{background:'#1e2640',borderRadius:4,height:6,width:80,overflow:'hidden'}}><div style={{width:`${(cnt/topTags[0][1])*100}%`,background:'#6C63FF',height:'100%',borderRadius:4}}/></div>
                <span style={{color:'#6B6888',fontSize:12}}>{cnt}×</span>
              </div>
            ))}
          </div>}
        </>}
      </div>

      {/* Bottom Nav — 3 tabs (removed Questions tab, session is now flow-based) */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(8,10,22,.95)',backdropFilter:'blur(16px)',borderTop:'1px solid #1e2640',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',zIndex:50}}>
        {[{id:'home',emoji:'◎',label:'Home'},{id:'log',emoji:'▣',label:'Log'},{id:'insights',emoji:'✦',label:'Insights'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'4px 24px'}}>
            <span style={{fontSize:20,color:tab===t.id?'#6C63FF':'#3a3a5c'}}>{t.emoji}</span>
            <span style={{fontSize:10,color:tab===t.id?'#A89FFF':'#3a3a5c',letterSpacing:.5}}>{t.label}</span>
          </button>
        ))}
      </div>

      {showModal&&<CheckInModal existing={editEntry} onSave={saveEntry} onClose={()=>{setShowModal(false);setEditEntry(null)}}/>}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function UserApp(){
  const [screen,setScreen]=useState('loading')
  const [user,setUser]=useState(null)

  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async u=>{
      if(u){
        const snap=await getDoc(doc(db,'users',u.uid))
        setUser(snap.exists()?{id:snap.id,...snap.data()}:{id:u.uid,name:u.email?.split('@')[0]||'User',email:u.email,status:'active'})
        setScreen('app')
      }else{setScreen('welcome')}
    })
    return unsub
  },[])

  async function logout(){await signOut(auth); setUser(null); setScreen('welcome')}

  if(screen==='loading')return<div style={{minHeight:'100vh',background:'#080A16',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{G}</style><Spin/></div>
  if(screen==='welcome')return<WelcomeScreen onLogin={()=>setScreen('login')} onRegister={()=>setScreen('register')}/>
  if(screen==='register')return<RegisterScreen onBack={()=>setScreen('welcome')} onSuccess={u=>{setUser(u);setScreen('app')}}/>
  if(screen==='login')return<LoginScreen onBack={()=>setScreen('welcome')} onSuccess={u=>{setUser(u);setScreen('app')}}/>
  if(screen==='app'&&user)return<MainApp user={user} onLogout={logout}/>
  return null
}
