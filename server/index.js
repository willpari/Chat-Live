import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb'; // Importa MongoClient de mongodb

import { Server } from 'socket.io';
import { createServer } from 'http';

dotenv.config();

const port = process.env.PORT ?? 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {}
});

const client = new MongoClient('mongodb://localhost:27017');

async function main() {
    try {
        await client.connect();
        console.log('Conexión establecida correctamente');

        const db = client.db('tu_base_de_datos'); // Cambia 'tu_base_de_datos' por el nombre de tu base de datos

        // Crea la colección 'messages' si no existe
        await db.createCollection('messages');

        io.on('connection', async (socket) => {
            console.log('Un usuario se ha conectado!');

            socket.on('disconnect', () => {
                console.log('Un usuario se ha desconectado');
            });

            socket.on('chat message', async (msg) => {
                const username = socket.handshake.auth.username ?? 'anónimo';
                console.log({ username });

                try {
                    // Inserta el mensaje en la colección 'messages'
                    await db.collection('messages').insertOne({
                        content: msg,
                        user: username
                    });

                    // Emite el mensaje a todos los clientes conectados
                    io.emit('chat message', msg, username);
                } catch (error) {
                    console.error('Error al insertar el mensaje:', error);
                }
            });

            // Recupera los mensajes de la colección 'messages' y los emite al cliente
            const messages = await db.collection('messages').find().toArray();
            messages.forEach((message) => {
                socket.emit('chat message', message.content, message.user);
            });
        });

        app.use(logger('dev'));

        app.get('/', (req, res) => {
            res.sendFile(process.cwd() + '/client/index.html');
        });

        server.listen(port, () => {
            console.log(`Servidor en ejecución en el puerto ${port}`);
        });
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
    }
}

main();
