import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from 'baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'

// When packaged into an .exe, keep config/session next to the executable, not inside the snapshot.
const BASE_DIR = process.pkg ? path.dirname(process.execPath) : process.cwd()
const CONFIG_PATH = path.join(BASE_DIR, 'config.json')
const AUTH_DIR = path.join(BASE_DIR, 'wa-session')
const LOG_PATH = path.join(BASE_DIR, 'whatsapp-sender.log')

// Make the Windows console use UTF-8 so Cyrillic text shows correctly in cmd/PowerShell.
if (process.platform === 'win32') {
  try {
    execSync('chcp 65001', { stdio: 'ignore' })
  } catch {}
  process.title = 'WhatsApp розсилка'
}

// libsignal (used by Baileys) dumps internal session objects via console.info/warn/error.
// Our own output goes through console.log only, so silence the rest to keep the terminal readable.
console.info = console.warn = console.error = console.debug = () => {}

const DEFAULT_CONFIG = {
  recipients: ['380XXXXXXXXX'],
  message: 'Щогодинне нагадування ({time})',
  intervalMinutes: 60,
  sendOnStart: true,
}

// Formatted by hand: the packaged Node may lack full ICU, so toLocaleString('uk-UA') isn't reliable.
function formatDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function log(...args) {
  const line = `[${formatDate()}] ${args.join(' ')}`
  console.log(line)
  try {
    // UTF-8 BOM so old Notepad versions open the Cyrillic log correctly.
    if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, '\uFEFF')
    fs.appendFileSync(LOG_PATH, line + '\n')
  } catch {}
}

function waitForEnterAndExit(code) {
  console.log('\nНатисніть Enter, щоб закрити це вікно...')
  const rl = readline.createInterface({ input: process.stdin })
  rl.on('line', () => process.exit(code))
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2))
    log(`Створено файл ${CONFIG_PATH}. Вкажіть у ньому номери отримувачів і текст повідомлення, потім запустіть програму знову.`)
    return null
  }
  const config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }
  const recipients = [].concat(config.recipients).map((n) => String(n).replace(/\D/g, '')).filter(Boolean)
  if (!recipients.length || recipients.some((n) => n.includes('XXX') || n.length < 8)) {
    log('config.json: у "recipients" мають бути повні номери телефонів з кодом країни, наприклад "380501234567".')
    return null
  }
  if (!(config.intervalMinutes > 0)) {
    log('config.json: "intervalMinutes" має бути додатним числом.')
    return null
  }
  return { ...config, recipients }
}

const config = (() => {
  try {
    return loadConfig()
  } catch (err) {
    log('Не вдалося прочитати config.json:', err.message)
    return null
  }
})()

let sock = null
let connected = false
let pendingSend = false
let sendTimer = null

// The next send is counted from the previous one (not from program start),
// so sends stay evenly spaced even if login or a reconnect delayed one of them.
function scheduleNextSend() {
  clearTimeout(sendTimer)
  sendTimer = setTimeout(sendToAll, config.intervalMinutes * 60_000)
}

async function sendToAll() {
  if (!connected) {
    log(`Зараз немає з'єднання; повідомлення буде надіслано, щойно з'єднання відновиться.`)
    pendingSend = true
    return
  }
  pendingSend = false
  scheduleNextSend()
  const text = config.message.replaceAll('{time}', formatDate())
  for (const number of config.recipients) {
    try {
      const [result] = await sock.onWhatsApp(number)
      if (!result?.exists) {
        log(`Номер ${number} не зареєстрований у WhatsApp, пропускаємо.`)
        continue
      }
      await sock.sendMessage(result.jid, { text })
      log(`Надіслано на ${number}: ${text}`)
    } catch (err) {
      log(`Не вдалося надіслати на ${number}:`, err.message)
      pendingSend = true
    }
  }
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    browser: Browsers.windows('Chrome'),
    logger: pino({ level: 'silent' }),
    markOnlineOnConnect: false,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      log(`Відскануйте цей QR-код у WhatsApp на телефоні: Налаштування > Пов'язані пристрої > Прив'язати пристрій`)
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      connected = true
      log('Підключено до WhatsApp.')
      if (pendingSend) sendToAll()
    }

    if (connection === 'close') {
      connected = false
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        log(`Пристрій відв'язано від WhatsApp. Збережену сесію видалено, зараз буде показано новий QR-код.`)
        fs.rmSync(AUTH_DIR, { recursive: true, force: true })
      } else {
        log(`З'єднання закрито (${lastDisconnect?.error?.message ?? 'невідома причина'}). Перепідключення...`)
      }
      setTimeout(() => connect().catch(onConnectError), 3000)
    }
  })
}

function onConnectError(err) {
  log(`Помилка з'єднання:`, err.message, '- повторна спроба через 30 секунд.')
  setTimeout(() => connect().catch(onConnectError), 30_000)
}

if (!config) {
  waitForEnterAndExit(1)
} else {
  log(
    `Запуск. Повідомлення для ${config.recipients.join(', ')} надсилатимуться кожні ${config.intervalMinutes} хв.`,
    'Не закривайте це вікно: якщо його закрити, надсилання припиниться.',
  )
  pendingSend = config.sendOnStart
  if (!pendingSend) scheduleNextSend()
  connect().catch(onConnectError)
}
