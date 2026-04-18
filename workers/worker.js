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
const DVR_IP = "192.168.1.16"
const DVR_USER = "admin"
const DVR_PASS = "dario2016"

// ============================================
// GRUPO WHATSAPP
// ============================================
const GRUPO = "120363423314605028@g.us"

// Cliente Digest Auth
const client = new DigestFetch(DVR_USER, DVR_PASS)

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

        console.log("🚨 Evento detectado:", tipoEvento)

        const imagen = await snapshot()

        const resultadoIA = await analizarImagen(imagen)

        const sock = getSock()

        if (!sock) {
            console.log("❌ WhatsApp no conectado")
            return
        }

        await sock.sendMessage(
            GRUPO,
            {
                image: { url: imagen },
                caption:
`🚨 *ALERTA CCTV*

📍 Evento: ${tipoEvento}
🕒 Hora: ${new Date().toLocaleString()}

🧠 ${resultadoIA}`
            }
        )

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

            const texto = Buffer.from(value).toString()

            // Cruce de línea
            if (texto.includes("linedetection")) {
                await enviarAlerta("Cruce de línea")
            }

            // Movimiento
            if (texto.includes("VMD")) {
                await enviarAlerta("Movimiento")
            }

            // Intrusión
            if (texto.includes("fielddetection")) {
                await enviarAlerta("Intrusión")
            }
        }

    } catch (error) {
        console.log("❌ Error stream:", error.message)
    }
}

// ============================================
// INICIAR SISTEMA
// ============================================
escucharEventos()