import express from 'express'
import logger from 'morgan'
import dotenv from 'dotenv'

import { createClient } from '@libsql/client'
import { Server } from 'socket.io'
import { createServer } from 'http'

dotenv.config()
const port = process.env.PORT ?? 3000

const app = express()
const server = createServer(app)
const io = new Server(server, {
    connectionStateRecovery: {
        timeout: 1000   
    }
})

const db = createClient({
    url:"libsql://real-time-chat-db-lucastonelotto1.turso.io",
    authToken: process.env.DB_TOKEN
})

await db.execute(
    `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT
    )`

)
io.on('connection', async(socket) => {
    console.log('user connected')

    socket.on('disconnect', () => {
        console.log('user disconnected')
    })

    socket.on('chat message', async (msg) => {
        let result
            try {
                result = await db.execute({
                    sql: `INSERT INTO messages (content) VALUES (:msg)`,
                    args: {msg}
            })
            } catch (e){
                console.error(e)
                return
            }
        io.emit('chat message', msg, result.lastInsertRowid.toString())
    })

    if (!socket.recovered) {
        try {
            const result = await db.execute({
                sql: `SELECT id, content FROM messages WHERE id > ? `,
                args: [0]
        })
        } catch (e){
            console.error(e)
        }
    }
})

app.use(logger('dev'))

app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/client/index.html')
})

server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
}) 