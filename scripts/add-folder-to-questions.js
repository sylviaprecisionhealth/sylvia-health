import admin from 'firebase-admin'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../sylvia-health-firebase-adminsdk-fbsvc-9fcd9340c0.json'), 'utf8')
)

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

async function run() {
  const snap = await db.collection('questions').get()
  console.log(`Found ${snap.size} questions`)

  const docs = snap.docs
  const chunks = []
  for (let i = 0; i < docs.length; i += 500) {
    chunks.push(docs.slice(i, i + 500))
  }

  let updated = 0
  for (const chunk of chunks) {
    const batch = db.batch()
    for (const d of chunk) {
      batch.update(d.ref, { folder: 'Book EMA' })
    }
    await batch.commit()
    updated += chunk.length
    console.log(`Updated ${updated}/${snap.size}`)
  }

  console.log('Done.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
