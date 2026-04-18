require("dotenv").config()

const express = require("express")
const { colaEventos } = require("../queue/cola")

const app = express()
app.use(express.json())

app.post("/evento/:clienteId", async (req, res) => {

    const clienteId = req.params.clienteId

    console.log("🚨 Evento recibido:", clienteId)

    await colaEventos.add("evento", {
        clienteId,
        data: req.body
    })

    res.send("OK")
})

app.listen(3000, () => {
    console.log("🌐 API corriendo en puerto 3000")
})