/**
 * testBot.js — Run the bot manually for a specific user
 *
 * Usage:
 *   node testBot.js <userId>
 *   node testBot.js          (uses TEST_USER_ID from .env)
 *
 * Example:
 *   node testBot.js a1b2c3d4-e5f6-7890-abcd-ef1234567890
 */

require('dotenv').config()
const { startBot } = require('./bot/bot')
const supabase = require('./lib/supabase')

async function main() {
  const userId = process.argv[2] || process.env.TEST_USER_ID

  if (!userId) {
    // Try to find user by admin email for convenience
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      console.log(`No userId provided. Looking up admin user: ${adminEmail}`)
      const { data: user } = await supabase
        .from('users')
        .select('id, email, is_active, cookie_updated_at')
        .eq('email', adminEmail)
        .single()

      if (!user) {
        console.error(`No user found for ${adminEmail}. Sign in on the frontend first.`)
        process.exit(1)
      }

      console.log(`Found user:`)
      console.log(`  ID:          ${user.id}`)
      console.log(`  Email:       ${user.email}`)
      console.log(`  Active:      ${user.is_active}`)
      console.log(`  Cookie:      ${user.cookie_updated_at ? '✓ saved' : '✗ not saved'}`)

      if (!user.is_active) {
        console.error('\nAccount not active. Go to /admin and approve your account first.')
        process.exit(1)
      }
      if (!user.cookie_updated_at) {
        console.error('\nNo session saved. Use the Chrome extension to save your AINS session first.')
        process.exit(1)
      }

      console.log(`\nRunning bot for ${user.email}...\n`)
      await runForUser(user.id)
    } else {
      console.error('Usage: node testBot.js <userId>')
      console.error('Or set TEST_USER_ID in .env')
      process.exit(1)
    }
  } else {
    await runForUser(userId)
  }
}

async function runForUser(userId) {
  const startTime = Date.now()
  try {
    const result = await startBot(userId)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log('\n─────────────────────────────')
    if (result.skipped) {
      console.log(`✓ Already complete this month. Nothing to submit.`)
    } else if (result.success) {
      const ok = result.results?.filter(r => r.status === 'success').length || 0
      const fail = result.results?.filter(r => r.status === 'failed').length || 0
      console.log(`✓ Bot finished in ${elapsed}s`)
      console.log(`  Submitted: ${ok} success, ${fail} failed`)
      if (result.results) {
        result.results.forEach(r => {
          const icon = r.status === 'success' ? '✓' : '✗'
          console.log(`  ${icon} ${r.book}${r.error ? ' — ' + r.error : ''}`)
        })
      }
    } else {
      console.log(`✗ Bot failed: ${result.reason}`)
    }
    console.log('─────────────────────────────\n')
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`\n✗ Error after ${elapsed}s: ${err.message}`)
    process.exit(1)
  }
}

main()
