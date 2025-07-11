import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:admin@yourdomain.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { title, body, url } = await req.json()

    // Φέρε όλα τα subscriptions από τη βάση
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    // Ετοίμασε το payload
    const payload = JSON.stringify({
      title,
      body,
      url
    })

    // Στείλε notification σε κάθε subscription
    const results = await Promise.allSettled(
      (subscriptions || []).map(async (row: any) => {
        try {
          await webpush.sendNotification(row.subscription, payload)
          return { success: true }
        } catch (err) {
          return { success: false, error: err instanceof Error ? err.message : String(err) }
        }
      })
    )

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 