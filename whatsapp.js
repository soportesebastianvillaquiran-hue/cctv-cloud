const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} = require("@whiskeysockets/baileys")

const qrcode = require("qrcode-terminal")

let sockGlobal = null

async function iniciarWhatsApp() {

    console.log("🚀 Iniciando WhatsApp...")

    const { version } = await fetchLatestBaileysVersion()
    const { state, saveCreds } = await useMultiFileAuthState("session")

    const sock = makeWASocket({
        version,
        auth: state,
        browser: Browsers.windows("Chrome")
    })

    sockGlobal = sock

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {

        if (qr) {
            console.log("📲 Escanea este QR:")
            qrcode.generate(qr, { small: true })
        }

        if (connection === "open") {
            console.log("✅ WhatsApp conectado")
        }

        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            console.log("❌ Reconectando...", shouldReconnect)

            if (shouldReconnect) iniciarWhatsApp()
        }
    })
}

function getSock() {
    return sockGlobal
}

module.exports = {
    iniciarWhatsApp,
    getSock
}