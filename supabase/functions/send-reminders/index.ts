import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.5.4";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Set your VAPID keys here
webpush.setVapidDetails(
  "mailto:admin@yourdomain.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

function getTimeWindow(minutes: number) {
  const now = new Date();
  const from = new Date(now.getTime() + (minutes - 5) * 60 * 1000); // 5 λεπτά πριν
  const to = new Date(now.getTime() + (minutes + 5) * 60 * 1000);   // 5 λεπτά μετά
  return { from, to };
}

serve(async (_req) => {
  // 1. Υπενθύμιση 1 μέρα πριν
  const { from: from1d, to: to1d } = getTimeWindow(24 * 60);
  // 2. Υπενθύμιση 1 ώρα πριν
  const { from: from1h, to: to1h } = getTimeWindow(60);

  // Βρες ραντεβού για 1 μέρα πριν
  const { data: appointments1d } = await supabase
    .from("appointments")
    .select("id, user_id, date, time, reminder_1d_sent")
    .eq("status", "confirmed")
    .eq("reminder_1d_sent", false)
    .gte("date", from1d.toISOString().slice(0, 10))
    .lte("date", to1d.toISOString().slice(0, 10));

  // Βρες ραντεβού για 1 ώρα πριν
  const { data: appointments1h } = await supabase
    .from("appointments")
    .select("id, user_id, date, time, reminder_1h_sent")
    .eq("status", "confirmed")
    .eq("reminder_1h_sent", false);

  // Φιλτράρισμα 1 ώρα πριν (date = σήμερα, time μέσα στο παράθυρο)
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const fromTime = from1h.toTimeString().slice(0, 5);
  const toTime = to1h.toTimeString().slice(0, 5);

  const filtered1h = (appointments1h || []).filter((apt) =>
    apt.date === today &&
    apt.time >= fromTime &&
    apt.time <= toTime
  );

  // Συνδύασε όλα τα reminders
  const reminders = [
    ...(appointments1d || []).map((apt) => ({
      ...apt,
      type: "1d",
    })),
    ...filtered1h.map((apt) => ({
      ...apt,
      type: "1h",
    })),
  ];

  let sent = 0;
  for (const apt of reminders) {
    // Βρες το subscription του χρήστη
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", apt.user_id);

    if (!subs || subs.length === 0) continue;

    // Ετοίμασε το μήνυμα
    const payload =
      apt.type === "1d"
        ? { title: "Υπενθύμιση Ραντεβού", body: "Έχετε ραντεβού αύριο!" }
        : { title: "Υπενθύμιση Ραντεβού", body: "Έχετε ραντεβού σε 1 ώρα!" };

    // Στείλε notification σε όλα τα subscriptions του χρήστη
    for (const sub of subs) {
      try {
        await webpush.sendNotification(sub.subscription, JSON.stringify(payload));
        sent++;
      } catch (err) {
        // Αν το subscription είναι invalid, μπορείς να το διαγράψεις από τη βάση
      }
    }

    // Ενημέρωσε το flag
    if (apt.type === "1d") {
      await supabase
        .from("appointments")
        .update({ reminder_1d_sent: true })
        .eq("id", apt.id);
    } else {
      await supabase
        .from("appointments")
        .update({ reminder_1h_sent: true })
        .eq("id", apt.id);
    }
  }

  return new Response(
    JSON.stringify({ sent, total: reminders.length }),
    { headers: { "Content-Type": "application/json" } }
  );
}); 