export default async function handler(req, res) {
  console.log('[send-invite] method:', req.method)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, code } = req.body || {}
  console.log('[send-invite] payload:', { name, email, code })

  if (!name || !email || !code) {
    return res.status(400).json({ error: 'Missing required fields: name, email, code' })
  }

  let resendStatus
  let resendBody
  let data

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: email,
        subject: `Welcome to Sylvia, ${name} — Your Invitation Code`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff;">
            <h2 style="font-size:22px;color:#1A1A2E;margin:0 0 8px;">Welcome to Sylvia, ${name}</h2>
            <p style="font-size:15px;color:#6B6888;line-height:1.6;margin:0 0 24px;">
              Sylvia is a daily wellness check-in app that helps you track how you're feeling over time. Your care team will use your responses to better support you.
            </p>
            <p style="font-size:14px;color:#1A1A2E;margin:0 0 8px;font-weight:600;">Your invite code:</p>
            <div style="background:#1A1A2E;border-radius:12px;padding:16px 24px;display:inline-block;margin-bottom:24px;">
              <span style="font-size:24px;font-weight:800;color:#A89FFF;letter-spacing:4px;">${code}</span>
            </div>
            <p style="font-size:14px;color:#6B6888;line-height:1.6;margin:0 0 24px;">
              Enter this code when you open the app to create your account. Get started at the link below.
            </p>
            <a href="https://sylvia-health.vercel.app" style="display:inline-block;background:#6C63FF;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 28px;border-radius:12px;">
              Get Started →
            </a>
            <p style="font-size:12px;color:#C8C0B0;margin-top:32px;">Sylvia Precision Health</p>
          </div>
        `
      })
    })

    resendStatus = response.status
    resendBody = await response.text()
    console.log('[send-invite] Resend status:', resendStatus)
    console.log('[send-invite] Resend body:', resendBody)

    try {
      data = JSON.parse(resendBody)
    } catch {
      data = { raw: resendBody }
    }

    if (!response.ok) {
      const msg = data?.message || data?.name || resendBody || 'Resend API error'
      return res.status(resendStatus).json({ error: msg, details: data })
    }

    return res.status(200).json({ success: true, id: data.id })

  } catch (err) {
    console.error('[send-invite] exception:', err)
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
