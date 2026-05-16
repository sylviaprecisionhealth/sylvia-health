import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function initAdmin() {
  if (getApps().length > 0) return
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  initializeApp({ credential: cert(serviceAccount) })
}

export default async function handler(req, res) {
  console.log('[create-team-member] method:', req.method)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, role, tempPassword, addedBy } = req.body || {}
  console.log('[create-team-member] payload:', { name, email, role, addedBy })

  if (!name || !email || !role || !tempPassword) {
    return res.status(400).json({ error: 'Missing required fields: name, email, role, tempPassword' })
  }

  try {
    initAdmin()
    const adminAuth = getAuth()
    const adminDb = getFirestore()

    // Create Firebase Auth user
    let userRecord
    try {
      userRecord = await adminAuth.createUser({
        email,
        password: tempPassword,
        displayName: name,
      })
    } catch (authErr) {
      console.error('[create-team-member] auth error:', authErr.code, authErr.message)
      const msg = authErr.code === 'auth/email-already-exists'
        ? 'An account with this email already exists.'
        : authErr.message
      return res.status(400).json({ error: msg })
    }

    // Save to adminUsers Firestore collection
    const memberData = {
      uid: userRecord.uid,
      name,
      email,
      role,
      status: 'active',
      dateAdded: new Date().toISOString().split('T')[0],
      addedBy: addedBy || 'Admin',
    }
    await adminDb.collection('adminUsers').doc(userRecord.uid).set(memberData)

    // Send welcome email via Resend
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@sylviaprecision.health',
          to: email,
          subject: `You've been added to the Sylvia Admin team`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;">
              <h2 style="font-size:22px;color:#1A1A2E;margin:0 0 8px;">Welcome to Sylvia Admin, ${name}</h2>
              <p style="font-size:15px;color:#6B6888;line-height:1.6;margin:0 0 24px;">
                You've been added to the Sylvia Precision Health admin team as <strong style="color:#1A1A2E;">${role}</strong>.
              </p>
              <p style="font-size:14px;color:#1A1A2E;margin:0 0 8px;font-weight:600;">Your temporary password:</p>
              <div style="background:#1A1A2E;border-radius:12px;padding:16px 24px;display:inline-block;margin-bottom:24px;">
                <span style="font-size:18px;font-weight:800;color:#A89FFF;letter-spacing:2px;font-family:monospace;">${tempPassword}</span>
              </div>
              <p style="font-size:14px;color:#6B6888;line-height:1.6;margin:0 0 24px;">
                Please sign in and change your password after your first login.
              </p>
              <a href="https://sylvia-health.vercel.app/admin" style="display:inline-block;background:#6C63FF;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:12px;">
                Open Admin Console →
              </a>
              <p style="font-size:12px;color:#C8C0B0;margin-top:32px;">Sylvia Precision Health</p>
            </div>
          `
        })
      })
      if (!emailRes.ok) {
        const body = await emailRes.text()
        console.warn('[create-team-member] welcome email failed:', emailRes.status, body)
      } else {
        console.log('[create-team-member] welcome email sent to', email)
      }
    } catch (emailErr) {
      console.warn('[create-team-member] welcome email exception:', emailErr.message)
    }

    return res.status(200).json({ success: true, uid: userRecord.uid })

  } catch (err) {
    console.error('[create-team-member] exception:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
