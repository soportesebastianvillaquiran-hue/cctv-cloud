require("dotenv").config()

const fs = require("fs")
const DigestFetch = require("digest-fetch").default

const { iniciarWhatsApp, getSock } = require("../whatsapp")
const { analizarImagen } = require("../utils/ia")

// 🚀 Iniciar WhatsApp
iniciarWhatsApp()

// ============================================
// CONFIGURACIÓN DVR
// ============================================
const DVR_IP = process.env.DVR_IP || "192.168.1.16"
const DVR_USER = process.env.DVR_USER || "admin"
const DVR_PASS = process.env.DVR_PASS || "dario2016"

// ============================================
// GRUPO WHATSAPP
// ============================================
const GRUPO = process.env.WHATSAPP_GROUP_ID || "120363423314605028@g.us"

// Cliente Digest Auth
const client = new DigestFetch(DVR_USER, DVR_PASS)

// Control anti spam
let ultimaAlerta = 0
const COOLDOWN = 30000 // 30 segundos

// ============================================
// 📷 SNAPSHOT
// ============================================
async function snapshot() {
    try {
        const url = `http://${DVR_IP}/ISAPI/Streaming/channels/101/picture`

        const response = await client.fetch(url)

        if (!response.ok) {
            throw new Error("No se pudo descargar snapshot")
        }

        const arrayBuffer = await response.arrayBuffer()

        const ruta = "./evento.jpg"

        fs.writeFileSync(ruta, Buffer.from(arrayBuffer))

        console.log("📷 Snapshot descargado")

        return ruta

    } catch (error) {
        console.log("❌ Error snapshot:", error.message)
        throw error
    }
}

// ============================================
// 📲 ENVIAR ALERTA
// ============================================
async function enviarAlerta(tipoEvento) {
    try {
        const ahora = Date.now()

        if (ahora - ultimaAlerta < COOLDOWN) {
            console.log("⏳ Alerta ignorada por cooldown")
            return
        }

        ultimaAlerta = ahora

        console.log("🚨 Evento detectado:", tipoEvento)

        const imagen = await snapshot()

        const resultadoIA = await analizarImagen(imagen)

        const sock = getSock()

        if (!sock) {
            console.log("❌ WhatsApp no conectado")
            return
        }

        await sock.sendMessage(GRUPO, {
            image: { url: imagen },
            caption:
`🚨 *ALERTA CCTV*

📍 Evento: ${tipoEvento}
🕒 Hora: ${new Date().toLocaleString("es-CO")}

🧠 ${resultadoIA}`
        })

        console.log("📲 Alerta enviada al grupo")

    } catch (error) {
        console.log("❌ Error enviando alerta:", error.message)
    }
}

// ============================================
// 👂 ESCUCHAR EVENTOS DVR
// ============================================
async function escucharEventos() {
    try {
        const url = `http://${DVR_IP}/ISAPI/Event/notification/alertStream`

        const response = await client.fetch(url)

        if (!response.ok) {
            throw new Error("No se pudo conectar al alertStream")
        }

        console.log("👂 Escuchando eventos Hikvision...")

        const reader = response.body.getReader()

        while (true) {
            const { done, value } = await reader.read()

            if (done) break

            const texto = Buffer.from(value).toString().toLowerCase()

            if (texto.includes("linedetection")) {
                await enviarAlerta("Cruce de línea")
            }

            if (texto.includes("vmd")) {
                await enviarAlerta("Movimiento")
            }

            if (texto.includes("fielddetection")) {
                await enviarAlerta("Intrusión")
            }
        }

    } catch (error) {
        console.log("❌ Error stream:", error.message)

        console.log("🔁 Reintentando en 15 segundos...")

        setTimeout(escucharEventos, 15000)
    }
}

// ============================================
// 🧪 PRUEBA AUTOMÁTICA AL INICIAR
// ============================================
setTimeout(async () => {
    await enviarAlerta("🚨 PRUEBA MANUAL DESDE WORKER")
}, 15000)

// ============================================
// INICIAR SISTEMA
// ============================================
escucharEventos()