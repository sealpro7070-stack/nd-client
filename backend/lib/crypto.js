const crypto = require('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

function getKey() {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY not set')
  // Accept hex string (64 chars) or raw 32-char string
  if (key.length === 64) return Buffer.from(key, 'hex')
  if (key.length === 32) return Buffer.from(key, 'utf8')
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars or 32 utf8 chars)')
}

function encrypt(plaintext) {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv:tag:encrypted (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(ciphertext) {
  const key = getKey()
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !encryptedHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

module.exports = { encrypt, decrypt }
