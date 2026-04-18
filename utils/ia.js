const OpenAI = require("openai")
const fs = require("fs")

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

async function analizarImagen(ruta) {

    const base64 = fs.readFileSync(ruta, "base64")

    const res = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [{
            role: "user",
            content: [
                {
                    type: "input_text",
                    text: `Sistema CCTV. Responde corto:

👤 Detección:
⚠️ Riesgo:
📝 Observación (máx 8 palabras)`
                },
                {
                    type: "input_image",
                    image_url: `data:image/jpeg;base64,${base64}`
                }
            ]
        }]
    })

    return res.output_text
}

module.exports = { analizarImagen }