import { useState, useEffect } from 'react'
import { db, auth } from './firebase.js'
import {
  collection, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where
} from 'firebase/firestore'
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from 'firebase/auth'
import {
  registerServiceWorker, requestNotificationPermission,
  scheduleSessionNotifications, listenForSessionOpen,
  startInAppScheduler, isSessionTime, nextSessionTime,
  SESSION_TIMES
} from './notifications.js'

const G = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
  ::-webkit-scrollbar{display:none} body{margin:0;background:#F5EFE8}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pop{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes slideDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:translateY(0)}}
`

function today(){ return new Date().toISOString().split('T')[0] }
function nowStr(){ return new Date().toISOString() }
function fmtTime(ts){ return ts ? new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '' }
function fmtDate(d){ return new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) }

const Spin = () => <div style={{width:20,height:20,border:'2px solid rgba(255,255,255,.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>

const Logo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="72" height="72">
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

// ── Welcome ───────────────────────────────────────────────────────────────────
function WelcomeScreen({onLogin, onRegister}) {
  return (
    <div style={{minHeight:'100vh',background:'#1A0F0A',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"}}>
      <style>{G}</style>
      <div style={{animation:'fadeUp .6s ease',textAlign:'center',maxWidth:420,width:'100%'}}>
        <div style={{display:'flex',justifyContent:'center',marginBottom:20}}><Logo/></div>
        <div style={{fontSize:11,color:'#6B4C30',letterSpacing:3,textTransform:'uppercase',marginBottom:8}}>Welcome to</div>
        <h1 style={{color:'#CC9E63',fontSize:42,fontWeight:800,lineHeight:1,marginBottom:8,letterSpacing:-1}}>Sylvia</h1>
        <p style={{color:'#6B4C30',fontSize:14,lineHeight:1.7,marginBottom:48}}>Precision Health — your personal wellness companion, guided by your care team.</p>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <button onClick={onRegister} style={{background:'#8B3A2A',color:'#fff',border:'none',borderRadius:16,padding:'15px',fontSize:15,fontWeight:700,cursor:'pointer'}}>Get Started</button>
          <button onClick={onLogin} style={{background:'transparent',color:'#CC9E63',border:'1px solid #4A3020',borderRadius:16,padding:'15px',fontSize:15,cursor:'pointer'}}>Sign In</button>
        </div>
        <p style={{marginTop:24,fontSize:11,color:'#3D2810',lineHeight:1.6}}>You'll need an invite code from your provider to create an account.</p>
      </div>
    </div>
  )
}

// ── Register ──────────────────────────────────────────────────────────────────
function RegisterScreen({onBack, onSuccess}) {
  const [step,setStep] = useState(0)
  const [code,setCode] = useState(''); const [codeErr,setCodeErr] = useState(''); const [invite,setInvite] = useState(null)
  const [name,setName] = useState(''); const [email,setEmail] = useState(''); const [pw,setPw] = useState('')
  const [err,setErr] = useState(''); const [loading,setLoading] = useState(false)

  async function checkCode() {
    setLoading(true); setCodeErr('')
    try {
      const snap = await getDoc(doc(db,'invites',code.trim().toUpperCase()))
      if(!snap.exists()){ setCodeErr('Code not found. Check with your provider.'); setLoading(false); return }
      const inv = snap.data()
      if(inv.used){ setCodeErr('This code has already been used.'); setLoading(false); return }
      setInvite(inv); setName(inv.name||''); setEmail(inv.email||''); setStep(1)
    } catch(e){ setCodeErr(e.message) }
    setLoading(false)
  }

  async function register() {
    setLoading(true); setErr('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw)
      const uid = cred.user.uid
      const newUser = {id:uid, name:name.trim(), email:email.trim(), status:'active', joinedDate:today()}
      await setDoc(doc(db,'users',uid), newUser)
      await updateDoc(doc(db,'invites',invite.code), {used:true, userId:uid})
      onSuccess(newUser)
    } catch(e){ setErr(e.message) }
    setLoading(false)
  }

  const fs = {width:'100%',background:'#FAFAF8',border:'1.5px solid #E5E0D8',borderRadius:12,padding:'14px 16px',color:'#1A0F0A',fontSize:14,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"}

  return (
    <div style={{minHeight:'100vh',background:'#F5EFE8',display:'flex',justifyContent:'center',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"}}>
      <style>{G}</style>
      <div style={{maxWidth:420,width:'100%',display:'flex',flexDirection:'column',padding:24}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:'#8B7355',fontSize:14,cursor:'pointer',alignSelf:'flex-start',marginBottom:24,marginTop:20}}>← Back</button>
      {step===0 && (
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',animation:'fadeUp .4s ease'}}>
          <div style={{fontSize:11,color:'#8B7355',letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Step 1 of 2</div>
          <h2 style={{color:'#1A0F0A',fontSize:26,marginBottom:8}}>Enter Invite Code</h2>
          <p style={{color:'#4A3020',fontSize:14,marginBottom:32,lineHeight:1.6}}>Your provider will have shared a unique code with you.</p>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="SYLVIA-XXXXXX" onKeyDown={e=>e.key==='Enter'&&checkCode()} style={{background:'#FAFAF8',border:`1.5px solid ${codeErr?'#EF4444':'#E5E0D8'}`,borderRadius:14,padding:'16px 18px',color:'#1A0F0A',fontSize:18,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",fontWeight:700,letterSpacing:3,textAlign:'center',marginBottom:codeErr?8:24,width:'100%'}}/>
          {codeErr && <p style={{color:'#EF4444',fontSize:13,marginBottom:16,textAlign:'center'}}>{codeErr}</p>}
          <button onClick={checkCode} disabled={!code.trim()||loading} style={{background:code.trim()?'#8B3A2A':'#E5E0D8',color:code.trim()?'#fff':'#8B7355',border:'none',borderRadius:14,padding:15,fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?<Spin/>:'Verify Code →'}</button>
        </div>
      )}
      {step===1 && (
        <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',animation:'fadeUp .4s ease'}}>
          <div style={{fontSize:11,color:'#8B7355',letterSpacing:2,textTransform:'uppercase',marginBottom:8}}>Step 2 of 2</div>
          <h2 style={{color:'#1A0F0A',fontSize:26,marginBottom:28}}>Create Your Account</h2>
          {[['Full Name','text',name,setName,'Your name'],['Email','email',email,setEmail,'Your email'],['Password','password',pw,setPw,'Min 6 characters']].map(([l,t,v,s,p])=>(
            <div key={l} style={{marginBottom:14}}>
              <div style={{fontSize:11,color:'#8B7355',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>{l}</div>
              <input type={t} value={v} onChange={e=>s(e.target.value)} placeholder={p} style={fs}/>
            </div>
          ))}
          {err && <p style={{color:'#EF4444',fontSize:12,marginBottom:12,lineHeight:1.5}}>{err}</p>}
          <button onClick={register} disabled={!name.trim()||!email.includes('@')||pw.length<6||loading} style={{background:name.trim()&&email.includes('@')&&pw.length>=6?'#8B3A2A':'#E5E0D8',color:name.trim()&&email.includes('@')&&pw.length>=6?'#fff':'#8B7355',border:'none',borderRadius:14,padding:15,fontSize:15,fontWeight:700,cursor:'pointer',marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?<Spin/>:'Create Account ✦'}</button>
        </div>
      )}
      </div>
    </div>
  )
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({onBack, onSuccess}) {
  const [email,setEmail] = useState(''); const [pw,setPw] = useState(''); const [err,setErr] = useState(''); const [loading,setLoading] = useState(false)
  async function login() {
    setLoading(true); setErr('')
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pw)
      const snap = await getDoc(doc(db,'users',cred.user.uid))
      onSuccess(snap.exists()?{id:snap.id,...snap.data()}:{id:cred.user.uid,name:email.split('@')[0],email:email.trim(),status:'active'})
    } catch(e){ setErr('Email or password incorrect.') }
    setLoading(false)
  }
  return (
    <div style={{minHeight:'100vh',background:'#F5EFE8',display:'flex',justifyContent:'center',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"}}>
      <style>{G}</style>
      <div style={{maxWidth:420,width:'100%',display:'flex',flexDirection:'column',padding:24}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:'#8B7355',fontSize:14,cursor:'pointer',alignSelf:'flex-start',marginBottom:24,marginTop:20}}>← Back</button>
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',animation:'fadeUp .4s ease'}}>
        <h2 style={{color:'#1A0F0A',fontSize:28,marginBottom:8}}>Sign In</h2>
        <p style={{color:'#4A3020',fontSize:14,marginBottom:32}}>Welcome back to Sylvia.</p>
        {[['Email','email',email,setEmail,'your@email.com'],['Password','password',pw,setPw,'••••••••']].map(([l,t,v,s,p])=>(
          <div key={l} style={{marginBottom:14}}>
            <div style={{fontSize:11,color:'#8B7355',letterSpacing:1,textTransform:'uppercase',marginBottom:6}}>{l}</div>
            <input type={t} value={v} onChange={e=>s(e.target.value)} placeholder={p} onKeyDown={e=>e.key==='Enter'&&login()} style={{width:'100%',background:'#FAFAF8',border:'1.5px solid #E5E0D8',borderRadius:12,padding:'14px 16px',color:'#1A0F0A',fontSize:14,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"}}/>
          </div>
        ))}
        {err && <p style={{color:'#EF4444',fontSize:12,marginBottom:12}}>{err}</p>}
        <button onClick={login} disabled={loading} style={{background:'#8B3A2A',color:'#fff',border:'none',borderRadius:14,padding:15,fontSize:15,fontWeight:700,cursor:'pointer',marginTop:8,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>{loading?<Spin/>:'Sign In →'}</button>
      </div>
      </div>
    </div>
  )
}

// ── Notification Permission Banner ────────────────────────────────────────────
function NotifBanner({onDismiss}) {
  const [asking,setAsking] = useState(false)
  async function enable() {
    setAsking(true)
    await registerServiceWorker()
    const result = await requestNotificationPermission()
    if(result==='granted') await scheduleSessionNotifications()
    onDismiss()
  }
  return (
    <div style={{background:'#fff',border:'1.5px solid #E5E0D8',borderRadius:16,padding:'14px 16px',marginBottom:16,animation:'slideDown .4s ease',display:'flex',alignItems:'center',gap:12}}>
      <div style={{fontSize:22,flexShrink:0}}>🔔</div>
      <div style={{flex:1}}>
        <div style={{color:'#1A0F0A',fontWeight:600,fontSize:14,marginBottom:2}}>Enable check-in reminders</div>
        <div style={{color:'#4A3020',fontSize:12,lineHeight:1.5}}>Get notified at 9am, 12pm, 3pm, 6pm and 9pm daily.</div>
      </div>
      <div style={{display:'flex',gap:8,flexShrink:0}}>
        <button onClick={onDismiss} style={{background:'none',border:'none',color:'#8B7355',fontSize:12,cursor:'pointer'}}>Later</button>
        <button onClick={enable} disabled={asking} style={{background:'#8B3A2A',color:'#fff',border:'none',borderRadius:10,padding:'7px 14px',fontSize:12,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>{asking?<Spin/>:'Enable'}</button>
      </div>
    </div>
  )
}

// ── Session Banner ────────────────────────────────────────────────────────────
function SessionBanner({sessionTime, onStart}) {
  return (
    <div onClick={onStart} style={{background:'#8B3A2A',borderRadius:16,padding:'16px 18px',marginBottom:16,cursor:'pointer',animation:'slideDown .4s ease',display:'flex',alignItems:'center',gap:12,boxShadow:'0 8px 24px rgba(139,58,42,.25)'}}>
      <div style={{width:40,height:40,borderRadius:12,background:'rgba(255,255,255,.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>🔔</div>
      <div style={{flex:1}}>
        <div style={{color:'#fff',fontWeight:700,fontSize:15}}>Your {sessionTime} check-in is ready</div>
        <div style={{color:'rgba(255,255,255,.7)',fontSize:12,marginTop:2}}>Tap to answer your questions</div>
      </div>
      <span style={{color:'#fff',fontSize:20}}>→</span>
    </div>
  )
}

// ── Session Screen ────────────────────────────────────────────────────────────
function SessionScreen({questions, userId, sessionTime, resumeIdx, onComplete, onExit}) {
  const [idx,setIdx]           = useState(resumeIdx||0)
  const [textVal,setTextVal]   = useState('')
  const [choice,setChoice]     = useState(null)
  const [scaleVal,setScaleVal] = useState(null)
  const [scaleTouched,setScaleTouched] = useState(false)
  const [saving,setSaving]     = useState(false)
  const [answered,setAnswered] = useState(resumeIdx||0)

  const q     = questions[idx]
  const total = questions.length
  const pct   = Math.round((idx/total)*100)

  useEffect(()=>{
    setTextVal(''); setChoice(null); setScaleTouched(false)
    if(q) setScaleVal(Math.round((q.scaleMin+q.scaleMax)/2))
  },[idx])

  const canNext = (q?.type==='scale'&&scaleTouched) || (q?.type==='text'&&textVal.trim()) || (q?.type==='choice'&&choice!==null)

  async function saveAndNext() {
    if(!q||!canNext) return
    setSaving(true)
    const ans = q.type==='scale' ? String(scaleVal) : q.type==='text' ? textVal.trim() : choice
    try {
      await addDoc(collection(db,'responses'),{
        questionId:q.id, userId, answer:ans,
        date:today(), ts:nowStr(), sessionTime:sessionTime||'manual'
      })
    } catch(e){ console.warn(e) }
    const newAnswered = answered+1
    setAnswered(newAnswered)
    setSaving(false)
    if(idx<total-1){ setIdx(i=>i+1) }
    else { onComplete(newAnswered, total) }
  }

  async function skip() {
    try { await addDoc(collection(db,'responses'),{questionId:q.id,userId,answer:'__skipped__',date:today(),ts:nowStr(),sessionTime:sessionTime||'manual'}) } catch(e){}
    if(idx<total-1){ setIdx(i=>i+1) }
    else { onComplete(answered, total) }
  }

  if(!q) return null

  return (
    <div style={{minHeight:'100vh',background:'#F5EFE8',display:'flex',flexDirection:'column',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"}}>
      <style>{G}</style>
      <div style={{padding:'52px 20px 16px',maxWidth:480,margin:'0 auto',width:'100%'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <button onClick={onExit} style={{background:'none',border:'1px solid #E5E0D8',borderRadius:10,padding:'6px 14px',color:'#8B7355',fontSize:13,cursor:'pointer'}}>← Save & Exit</button>
          <div style={{fontSize:12,color:'#8B7355'}}>{idx+1} of {total}</div>
        </div>
        <div style={{height:4,background:'#E5E0D8',borderRadius:4,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${pct}%`,background:'#8B3A2A',borderRadius:4,transition:'width .3s'}}/>
        </div>
      </div>

      <div style={{flex:1,maxWidth:480,margin:'0 auto',padding:'0 20px',width:'100%',overflowY:'auto',paddingBottom:120}}>
        <div style={{animation:'fadeUp .3s ease'}}>
          <div style={{marginBottom:14}}>
            {q.type==='scale'&&<span style={{fontSize:11,color:'#1D4ED8',background:'#DBEAFE',borderRadius:20,padding:'3px 10px',fontWeight:600}}>▬ Scale</span>}
            {q.type==='choice'&&<span style={{fontSize:11,color:'#7C3AED',background:'#EDE9FE',borderRadius:20,padding:'3px 10px',fontWeight:600}}>◉ Choice</span>}
            {q.type==='text'&&<span style={{fontSize:11,color:'#065F46',background:'#D1FAE5',borderRadius:20,padding:'3px 10px',fontWeight:600}}>☰ Open</span>}
          </div>
          <p style={{color:'#1A0F0A',fontSize:20,lineHeight:1.5,fontWeight:600,marginBottom:24}}>{q.text}</p>

          {q.type==='scale'&&(
            <div style={{background:'#fff',borderRadius:20,padding:24,border:`1.5px solid ${scaleTouched?'#8B3A2A':'#E5E0D8'}`}}>
              <div style={{display:'flex',justifyContent:'center',marginBottom:16}}>
                <span style={{fontSize:52,fontWeight:700,color:scaleTouched?'#8B3A2A':'#C8C0B0'}}>{scaleVal}</span>
              </div>
              <input type="range" min={q.scaleMin} max={q.scaleMax} value={scaleVal||0}
                onChange={e=>{ setScaleVal(+e.target.value); setScaleTouched(true) }}
                style={{width:'100%',accentColor:'#8B3A2A',marginBottom:4}}/>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                {[0,0.25,0.5,0.75,1].map((f,i)=>{
                  const v=Math.round(q.scaleMin+(q.scaleMax-q.scaleMin)*f)
                  return(
                    <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                      <div style={{width:1,height:4,background:'#E5E0D8',borderRadius:1}}/>
                      {i>0&&i<4&&<span style={{fontSize:10,color:'#C8C0B0'}}>{v}</span>}
                    </div>
                  )
                })}
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span style={{fontSize:12,color:'#8B7355'}}>{q.scaleMinLabel||q.scaleMin}</span>
                <span style={{fontSize:12,color:'#8B7355'}}>{q.scaleMaxLabel||q.scaleMax}</span>
              </div>
              {!scaleTouched&&<p style={{fontSize:12,color:'#C8C0B0',textAlign:'center',marginTop:12}}>Move the slider to answer</p>}
            </div>
          )}
          {q.type==='choice'&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {q.options?.map(o=>(
                <button key={o} onClick={()=>setChoice(o)} style={{padding:'16px 18px',borderRadius:14,border:`2px solid ${choice===o?'#8B3A2A':'#E5E0D8'}`,background:choice===o?'#FFF5F2':'#fff',color:choice===o?'#8B3A2A':'#1A0F0A',fontSize:15,cursor:'pointer',textAlign:'left',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",fontWeight:choice===o?600:400}}>{o}</button>
              ))}
            </div>
          )}
          {q.type==='text'&&(
            <textarea value={textVal} onChange={e=>setTextVal(e.target.value)} rows={4} placeholder="Type your response here…" style={{width:'100%',background:'#fff',border:'1.5px solid #E5E0D8',borderRadius:14,padding:'14px 16px',color:'#1A0F0A',fontSize:14,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",lineHeight:1.6,resize:'none'}}/>
          )}
        </div>
      </div>

      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'rgba(245,239,232,.97)',borderTop:'1px solid #E5E0D8',padding:'16px 20px 32px'}}>
        <div style={{maxWidth:480,margin:'0 auto',display:'flex',gap:10}}>
          <button onClick={skip} style={{flex:1,padding:'14px',borderRadius:14,border:'1px solid #E5E0D8',background:'#fff',color:'#8B7355',fontSize:14,cursor:'pointer'}}>Skip</button>
          <button onClick={saveAndNext} disabled={!canNext||saving} style={{flex:3,padding:'14px',borderRadius:14,border:'none',background:canNext?'#8B3A2A':'#E5E0D8',color:canNext?'#fff':'#8B7355',fontSize:15,fontWeight:700,cursor:canNext?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {saving?<Spin/>:idx<total-1?'Next Question →':'Complete Session ✦'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Session Complete ───────────────────────────────────────────────────────────
function SessionCompleteScreen({answered, total, onHome}) {
  return (
    <div style={{minHeight:'100vh',background:'#F5EFE8',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",textAlign:'center'}}>
      <style>{G}</style>
      <div style={{animation:'fadeUp .5s ease'}}>
        <div style={{fontSize:64,marginBottom:20}}>✦</div>
        <h2 style={{color:'#1A0F0A',fontSize:28,fontWeight:700,marginBottom:8}}>Session Complete</h2>
        <p style={{color:'#4A3020',fontSize:15,lineHeight:1.7,marginBottom:8}}>You answered {answered} of {total} questions.</p>
        <p style={{color:'#8B7355',fontSize:13,marginBottom:40}}>Next session: {nextSessionTime()}</p>
        <button onClick={onHome} style={{background:'#8B3A2A',color:'#fff',border:'none',borderRadius:16,padding:'16px 40px',fontSize:16,fontWeight:700,cursor:'pointer'}}>Back to Home</button>
      </div>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
function MainApp({user, onLogout}) {
  const [tab,setTab]                         = useState('home')
  const [questions,setQuestions]             = useState([])
  const [schedules,setSchedules]             = useState([])
  const [responses,setResponses]             = useState({})
  const [sessions,setSessions]               = useState([])
  const [showNotifBanner,setShowNotifBanner] = useState(false)
  const [sessionBanner,setSessionBanner]     = useState(null)
  const [sessionActive,setSessionActive]     = useState(false)
  const [sessionTime,setSessionTime]         = useState(null)
  const [sessionComplete,setSessionComplete] = useState(null)
  const [resumeIdx,setResumeIdx]             = useState(0)

  useEffect(()=>{
    const u1 = onSnapshot(collection(db,'questions'),s=>{setQuestions(s.docs.map(d=>({id:d.id,...d.data()})))})
    const u2 = onSnapshot(collection(db,'schedules'),s=>{setSchedules(s.docs.map(d=>({id:d.id,...d.data()})))})
    const u3 = onSnapshot(query(collection(db,'responses'),where('userId','==',user.id)),s=>{
      const r={}; s.docs.forEach(d=>{const data=d.data(); if(data.date===today()&&!r[data.questionId])r[data.questionId]=data.answer})
      setResponses(r)
    })
    const u4 = onSnapshot(query(collection(db,'sessionLog'),where('userId','==',user.id)),s=>{
      setSessions(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.startedAt<b.startedAt?1:-1))
    })
    return()=>{u1();u2();u3();u4()}
  },[user.id])

  useEffect(()=>{
    if('Notification' in window && Notification.permission==='default') setTimeout(()=>setShowNotifBanner(true),2000)
    if('Notification' in window && Notification.permission==='granted') registerServiceWorker().then(()=>scheduleSessionNotifications())
    const unsub = listenForSessionOpen(()=>startSession('notification'))
    const stopSched = startInAppScheduler(time=>{ setSessionBanner(time); setTimeout(()=>setSessionBanner(null),30*60*1000) })
    if(isSessionTime()){ const n=new Date(); setSessionBanner(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`) }
    if(window.location.search.includes('session=1')) startSession('notification')
    return()=>{ unsub(); stopSched() }
  },[])

  const mySchedules       = schedules.filter(s=>{ if(!s.active)return false; if(s.userId!=='all'&&s.userId!==user.id)return false; if(s.endDate&&today()>s.endDate)return false; return true })
  const hasAllSchedule    = mySchedules.some(s=>s.questionId==='__ALL__'||s.isDefaultSession)
  const hasFolderSchedule = mySchedules.some(s=>s.isFolderSession)
  const folderSessionName = mySchedules.find(s=>s.isFolderSession)?.folder
  const myQIds            = [...new Set(mySchedules.filter(s=>s.questionId!=='__ALL__'&&!s.isFolderSession).map(s=>s.questionId))]
  const sessionQuestions  = hasAllSchedule ? questions : hasFolderSchedule ? questions.filter(q=>q.folder===folderSessionName) : myQIds.length>0 ? questions.filter(q=>myQIds.includes(q.id)) : questions
  const defaultSchedule  = mySchedules.find(s=>s.isDefaultSession)
  const daysRemaining    = defaultSchedule?.endDate ? Math.max(0,Math.ceil((new Date(defaultSchedule.endDate)-new Date(today()))/86400000)+1) : null
  const scheduleExpired  = defaultSchedule?.endDate && today()>defaultSchedule.endDate
  const activeSessionQs  = sessionQuestions.length>0 ? sessionQuestions : questions
  const todayAnswered    = Object.keys(responses).filter(k=>responses[k]!=='__skipped__').length

  function getResumeKey(time){ return `sylvia_resume_${user.id}_${today()}_${time||'manual'}` }

  async function startSession(time) {
    const saved = localStorage.getItem(getResumeKey(time))
    const startIdx = saved ? parseInt(saved,10) : 0
    try {
      const existing = sessions.find(s=>s.date===today()&&s.sessionTime===time)
      if(!existing) await addDoc(collection(db,'sessionLog'),{userId:user.id,date:today(),sessionTime:time||'manual',startedAt:nowStr(),completed:false,answeredCount:0,totalCount:activeSessionQs.length})
    } catch(e){}
    setResumeIdx(startIdx); setSessionTime(time); setSessionActive(true); setSessionBanner(null)
  }

  function exitSession() {
    localStorage.setItem(getResumeKey(sessionTime), String(resumeIdx))
    setSessionActive(false)
  }

  async function completeSession(answered, total) {
    localStorage.removeItem(getResumeKey(sessionTime))
    try {
      const existing = sessions.find(s=>s.date===today()&&s.sessionTime===sessionTime)
      if(existing) await updateDoc(doc(db,'sessionLog',existing.id),{completed:answered>=total,answeredCount:answered,completedAt:nowStr()})
    } catch(e){}
    setSessionActive(false); setSessionComplete({answered,total})
  }

  if(sessionActive && activeSessionQs.length>0){
    return <SessionScreen questions={activeSessionQs} userId={user.id} sessionTime={sessionTime} resumeIdx={resumeIdx} onComplete={completeSession} onExit={exitSession}/>
  }
  if(sessionComplete){
    return <SessionCompleteScreen answered={sessionComplete.answered} total={sessionComplete.total} onHome={()=>setSessionComplete(null)}/>
  }

  const firstName = user.name?.split(' ')[0]||'there'

  return (
    <div style={{minHeight:'100vh',background:'#F5EFE8',fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",paddingBottom:80}}>
      <style>{G}</style>
      <div style={{padding:'52px 20px 20px',maxWidth:480,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:11,color:'#8B7355',letterSpacing:2,textTransform:'uppercase',marginBottom:4}}>Sylvia Precision Health</div>
            <h1 style={{color:'#1A0F0A',fontSize:26,margin:0,fontWeight:700}}>
              {tab==='home'?`Hello, ${firstName}`:tab==='log'?'Session History':'Settings'}
            </h1>
          </div>
        </div>
      </div>

      <div style={{maxWidth:480,margin:'0 auto',padding:'0 20px'}}>
        {tab==='home'&&<>
          {showNotifBanner&&<NotifBanner onDismiss={()=>setShowNotifBanner(false)}/>}
          {sessionBanner&&<SessionBanner sessionTime={sessionBanner} onStart={()=>startSession(sessionBanner)}/>}

          {!scheduleExpired&&mySchedules.length>0&&!sessionBanner&&(()=>{
            const resumeKey = getResumeKey('manual')
            const savedIdx = localStorage.getItem(resumeKey)
            const resumePos = savedIdx ? parseInt(savedIdx,10) : 0
            const isResume = !!savedIdx && resumePos > 0
            const remaining = activeSessionQs.length - resumePos
            return (
              <div style={{background:'#fff',border:'1.5px solid #E5E0D8',borderRadius:20,padding:'18px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:14}}>
                <div style={{flex:1}}>
                  <div style={{color:'#1A0F0A',fontWeight:700,fontSize:15,marginBottom:4}}>
                    {isResume ? `${remaining} question${remaining!==1?'s':''} remaining` : `${activeSessionQs.length} questions ready`}
                  </div>
                  <div style={{color:'#4A3020',fontSize:12}}>
                    {isResume ? <span style={{color:'#8B3A2A'}}>Session in progress · tap to continue</span> : <>Sessions at 9am · 12pm · 3pm · 6pm · 9pm{daysRemaining!==null&&<span style={{color:'#8B3A2A',marginLeft:8}}>· {daysRemaining} day{daysRemaining!==1?'s':''} left</span>}</>}
                  </div>
                </div>
                <button onClick={()=>startSession('manual')} style={{background:'#8B3A2A',color:'#fff',border:'none',borderRadius:12,padding:'11px 18px',fontSize:14,fontWeight:700,cursor:'pointer',flexShrink:0}}>
                  {isResume ? 'Resume' : 'Start Now'}
                </button>
              </div>
            )
          })()}

          {mySchedules.length===0&&schedules.length>0&&(
            <div style={{background:'#fff',border:'1.5px solid #E5E0D8',borderRadius:16,padding:'14px 16px',marginBottom:16}}>
              <div style={{color:'#8B7355',fontSize:13}}>No active schedule assigned. Contact your care provider.</div>
            </div>
          )}

          {scheduleExpired&&(
            <div style={{background:'#fff',border:'1.5px solid #E5E0D8',borderRadius:20,padding:'16px 18px',marginBottom:16}}>
              <div style={{color:'#CC9E63',fontWeight:600,fontSize:14,marginBottom:4}}>✦ Study complete</div>
              <div style={{color:'#4A3020',fontSize:13,lineHeight:1.6}}>Your 15-day check-in period has ended. Thank you for your participation.</div>
            </div>
          )}

          {todayAnswered>0&&(
            <div style={{background:'#fff',border:'1.5px solid #D1FAE5',borderRadius:14,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:10}}>
              <span style={{color:'#6ECB8A',fontSize:16}}>✓</span>
              <span style={{color:'#4A3020',fontSize:13}}>{todayAnswered} question{todayAnswered!==1?'s':''} answered today</span>
            </div>
          )}
        </>}

        {tab==='settings'&&(
          <div style={{animation:'fadeUp .4s ease',paddingTop:8}}>
            <div style={{background:'#fff',border:'1.5px solid #E5E0D8',borderRadius:20,padding:'24px 20px',marginBottom:16,display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:52,height:52,borderRadius:16,background:'#8B3A2A',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:20,color:'#fff',flexShrink:0}}>
                {user.name?.split(' ').map(n=>n[0]).join('').slice(0,2)||'?'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:16,color:'#1A0F0A',marginBottom:3}}>{user.name}</div>
                <div style={{fontSize:13,color:'#4A3020',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
              </div>
            </div>
            <button onClick={onLogout} style={{width:'100%',background:'#fff',border:'1.5px solid #FEE2E2',borderRadius:16,padding:'15px',color:'#EF4444',fontSize:15,fontWeight:600,cursor:'pointer',textAlign:'left',paddingLeft:20}}>
              Sign Out
            </button>
          </div>
        )}

        {tab==='log'&&<>
          {sessions.length===0&&(
            <div style={{textAlign:'center',padding:'60px 20px',color:'#8B7355'}}>
              <div style={{fontSize:40,marginBottom:12}}>◷</div>
              <p style={{fontSize:15}}>No sessions yet. Complete your first check-in to see history here.</p>
            </div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {sessions.map(s=>(
              <div key={s.id} style={{background:'#fff',border:`1.5px solid ${s.completed?'#D1FAE5':'#E5E0D8'}`,borderRadius:16,padding:'16px 18px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <div style={{fontWeight:600,fontSize:14,color:'#1A0F0A'}}>{fmtDate(s.date)}</div>
                  <span style={{fontSize:11,fontWeight:600,color:s.completed?'#1A6644':'#92400E',background:s.completed?'#D1FAE5':'#FEF3C7',borderRadius:20,padding:'3px 10px'}}>{s.completed?'Completed':'In Progress'}</span>
                </div>
                <div style={{fontSize:12,color:'#4A3020',display:'flex',gap:16,flexWrap:'wrap'}}>
                  <span>🕐 {s.sessionTime==='manual'?'Manual start':s.sessionTime}</span>
                  <span>✓ {s.answeredCount||0} of {s.totalCount||0} answered</span>
                  {s.completedAt&&<span>Finished {fmtTime(s.completedAt)}</span>}
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>

      {/* Bottom Nav */}
      <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#F5EFE8',borderTop:'1px solid #E5E0D8',display:'flex',justifyContent:'space-around',padding:'10px 0 24px',zIndex:50}}>
        {[
          {id:'home',label:'Home',icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L9 4l6 5.5"/><path d="M5 8V15h3v-3.5h2V15h3V8"/></svg>},
          {id:'log',label:'History',icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="7"/><polyline points="9,5 9,9 12,11"/></svg>},
          {id:'settings',label:'Settings',icon:<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="2.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"/></svg>},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'4px 24px',color:tab===t.id?'#8B3A2A':'#8B7355'}}>
            {t.icon}
            <span style={{fontSize:11,letterSpacing:.5}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function UserApp() {
  const [screen,setScreen] = useState('loading')
  const [user,setUser]     = useState(null)

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async u=>{
      if(u){
        const snap = await getDoc(doc(db,'users',u.uid))
        setUser(snap.exists()?{id:snap.id,...snap.data()}:{id:u.uid,name:u.email?.split('@')[0]||'User',email:u.email,status:'active'})
        setScreen('app')
      } else { setScreen('welcome') }
    })
    return unsub
  },[])

  async function logout(){ await signOut(auth); setUser(null); setScreen('welcome') }

  if(screen==='loading') return <div style={{minHeight:'100vh',background:'#1A0F0A',display:'flex',alignItems:'center',justifyContent:'center'}}><style>{G}</style><Spin/></div>
  if(screen==='welcome') return <WelcomeScreen onLogin={()=>setScreen('login')} onRegister={()=>setScreen('register')}/>
  if(screen==='register') return <RegisterScreen onBack={()=>setScreen('welcome')} onSuccess={u=>{setUser(u);setScreen('app')}}/>
  if(screen==='login') return <LoginScreen onBack={()=>setScreen('welcome')} onSuccess={u=>{setUser(u);setScreen('app')}}/>
  if(screen==='app'&&user) return <MainApp user={user} onLogout={logout}/>
  return null
}
