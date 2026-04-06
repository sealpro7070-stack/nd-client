const cron = require('node-cron')

// Monthly email reminders — coming soon
// Scheduled for day at 09:00 AM MYT (01:00 UTC)
cron.schedule('0 1 * * *', () => {
  // TODO: enable once SMTP env vars are configured
  // See backend/lib/email.js for implementation
})

console.log('[cron] Scheduler initialized (reminders coming soon).')
