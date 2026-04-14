// ============================================================
// AES-256-GCM symmetric encryption for storing credentials.
// Key: INTEGRATION_ENCRYPTION_KEY env var (32-byte base64).
// Format: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
// ============================================================

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

function getKey(): Buffer {
    const raw = process.env.INTEGRATION_ENCRYPTION_KEY
    if (!raw) {
        throw new Error(
            'INTEGRATION_ENCRYPTION_KEY env var is not set. ' +
            'Generate one with: openssl rand -base64 32'
        )
    }
    const key = Buffer.from(raw, 'base64')
    if (key.length !== 32) {
        throw new Error('INTEGRATION_ENCRYPTION_KEY must be a 32-byte base64-encoded string')
    }
    return key
}

export function encrypt(plaintext: string): string {
    const key = getKey()
    const iv = randomBytes(12)               // 96-bit IV for GCM
    const cipher = createCipheriv('aes-256-gcm', key, iv)

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ])
    const authTag = cipher.getAuthTag()

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':')
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted format — expected iv:authTag:ciphertext')
    }
    const [ivHex, authTagHex, encryptedHex] = parts
    const key = getKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    return Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]).toString('utf8')
}
