const cron = require('node-cron')
const supabase = require('../lib/supabase')
const { startBot } = require('../bot/bot')

// Runs every day at 09:00 AM Malaysia time (UTC+8 → 01:00 UTC)
cron.schedule('0 1 * * *', async () => {
  const today = new Date()
  const dayOfMonth = today.getDate()
  const month = today.getMonth() + 1
  const year = today.getFullYear()

  console.log(`[cron] Daily check — day ${dayOfMonth}, ${month}/${year}`)

  try {
    // Find all active users whose schedule_day matches today
    const { data: settingsList, error } = await supabase
      .from('settings')
      .select('user_id, schedule_day, auto_schedule, users!inner(id, is_active, ains_cookie_encrypted, email)')
      .eq('auto_schedule', true)
      .eq('schedule_day', dayOfMonth)
      .eq('users.is_active', true)

    if (error) {
      console.error('[cron] Error fetching settings:', error.message)
      return
    }

    if (!settingsList || settingsList.length === 0) {
      console.log('[cron] No users scheduled for today.')
      return
    }

    console.log(`[cron] ${settingsList.length} user(s) scheduled today.`)

    // Run each user sequentially to avoid overloading the server
    for (const s of settingsList) {
      const user = s.users
      if (!user?.ains_cookie_encrypted) {
        console.log(`[cron] Skipping ${user?.email}: no AINS credentials saved.`)
        continue
      }

      console.log(`[cron] Running bot for ${user.email}`)
      try {
        await startBot(user.id)
      } catch (err) {
        console.error(`[cron] Failed for ${user.email}: ${err.message}`)
      }

      // Wait 10s between users
      await new Promise(r => setTimeout(r, 10000))
    }

    console.log('[cron] Daily run complete.')
  } catch (err) {
    console.error('[cron] Fatal error:', err.message)
  }
})

console.log('[cron] Scheduler initialized — runs daily at 09:00 AM MYT.')
