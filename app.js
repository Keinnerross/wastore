const { Client, ClientInfo, LocalAuth, NoAuth, MessageMedia, WAState } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { profile } = require('console');
const bodyParser = require('body-parser');


//Server
const app = express();
const corsOptions = {
    origin: 'woocommercevanilla.local', // Cambia esto por el dominio de WordPress
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));  // Configura el límite a 10 MB
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const server = http.createServer(app);
const port = 3000;

// ✅ Sirve la carpeta 'public' correctamente
app.use(express.static('public'));

// Motor de plantillas
app.set('view engine', 'ejs');


// Socket.io
const io = socketIo(server, {
    maxHttpBufferSize: 30 * 1024 * 1024 // 30 MB, ajusta según necesites
});



app.use(bodyParser.json());


//Rutas Post

app.post('/api/checkout', (req, res) => {
    console.log('Solicitud recibida en /api/checkout');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);

    const data = req.body;
    sendNotification(data);


    // Responder al cliente
    res.status(200).send('Datos recibidos correctamente');
});


// Rutas
app.get('/', (req, res) => {
    res.render('pages/login', { title: "Login" });
});


app.get('/login', (req, res) => {
    res.render('pages/login', { title: 'Login' });
});


app.get('/dashboard', (req, res) => {
    res.render('pages/dashboard', { title: 'Dashboard' });
});

// WhatsApp Client
const client = new Client({
    authStrategy: new NoAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--unhandled-rejections=strict'],
    }
});

//Credenciales Admin
const STATIC_USERNAME = "admin";
const STATIC_PASSWORD = "123456";
const SECRET_KEY = 'admin123456';


//Funciones (Controllers)

let status = "Desconectado";
let isLoadingGroups = "Desconectado";



function formatDate(dateString) {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        console.error('Fecha no válida:', dateString);
        return 'Fecha no válida';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}









const sendNotification = (messageObj) => {
    try {

        console.log('Datos recibidos:', messageObj);

        const myID = client.info.wid._serialized;
        const prefijoTelefono = "56"

        let productosComprados = messageObj.products.map(product => product.product_name).join(', ');

        const cliente = {
            nombre: messageObj.user.user_name,
            telefono: prefijoTelefono + messageObj.user.user_phone,
        }


        const orden = {
            id: messageObj.order.order_id,
            productosComprados: messageObj.products.map(product => product.product_name).join(', '),
            fechaEntrega: formatDate(messageObj.order.shipping_address_2)
        }





        const notiTemplateCliente = `Bienvenid@ *${cliente.nombre}*🌹✨
Esperamos que nuestras flores, puedan transmitir tus emociones!

Tus flores y regalos🌻

*Tu numero de orden es: ${orden.id}*
*El producto que compraste es: ${orden.productosComprados}*
*La entrega de tu pedido sera: ${orden.fechaEntrega}*
`;

const notiTemplateTienda = `¡Haz recibido un *nuevo pedido!*
*Número de orden es: ${orden.id}*
*Producto: ${orden.productosComprados}*
*Fecha de entrega: ${orden.fechaEntrega}*
`;


        client.sendMessage(cliente.telefono, notiTemplateCliente);
        client.sendMessage(myID, notiTemplateTienda);



    } catch (e) {
        console.log("Ocurrio un error en programar mensaje")
        io.emit('messageProgramatedState', "Error");

    }


};


let isProcessingEndSession = false;
let readyForEndSession = false;
let isProcessing = false;
let alreadyClientReady = false;





const forcedSessionEnd = async () => {

    if (!isProcessingEndSession && readyForEndSession) {

        isProcessingEndSession = true;

        console.log("Cerrando cliente...");
        await client.destroy();
        console.log("Cliente cerrado, reiniciando...");

        status = "Desconectado";
        groups = [];
        isLoadingGroups = "Desconectado";
        io.emit('status', status);
        io.emit('isLoadingGroups', isLoadingGroups);
        io.emit('groups-updated', groups);


        try {
            client.initialize();
            console.log("Cliente reiniciado");
        } catch (error) {
            console.error("Error al reiniciar el cliente:", error);
        }

        isProcessingEndSession = false;
        alreadyClientReady = false;

    }

    readyForEndSession = false;


};


const resetDisconnected = () => {
    status = "Desconectado";
    groups = [];
    isLoadingGroups = "Desconectado";
    io.emit('status', status);
    io.emit('isLoadingGroups', isLoadingGroups);
    io.emit('groups-updated', groups);
    io.emit('whatsapp-disconnected-forced', true);
}

//Eventos de WhatsApp



// Evento de conexión

//Cliente Whatsapp
client.on('qr', async (qr) => {

    if (!alreadyClientReady) {
        console.log('QR recibido, enviando al frontend...');
        const qrImage = await QRCode.toDataURL(qr);
        io.emit('qr', qrImage);
        readyForEndSession = true;
    }

});








// Evento de conexión
client.on('ready', async () => {
    if (!isProcessing && !alreadyClientReady) {
        isProcessing = true;
        try {
            console.log('Cliente WhatsApp Conectado');
            status = "Conectado";
            io.emit('status', status);
            io.emit('groups-updated', groups);
            alreadyClientReady = true;
        } catch (error) {
            console.error("Error en client.on('ready'):", error);
        } finally {
            isProcessing = false; // Resetear siempre
        }
    }
});

// Evento de desconexión
client.on('disconnected', async () => {
    if (!isProcessing) {
        isProcessing = true;
        try {
            console.log("Cliente WhatsApp Desconectado");
            resetDisconnected();
            alreadyClientReady = false;
        } catch (error) {
            console.error("Error en client.on('disconnected'):", error);
        } finally {
            isProcessing = false;
        }
    }
});








//Eventos de socket.io
io.on('connection', (socket) => {
    console.log('Cliente conectado a WebSocket');
    setTimeout(() => {
        socket.emit('status', status);
    }, 1000)


    //Sockets cerrar
    socket.on('cerrar', async () => {
        await forcedSessionEnd()

    });





    socket.on('login-connection', (data) => {

        const { username, password } = data;

        if (username === STATIC_USERNAME && password === STATIC_PASSWORD) {
            // Generar un token JWT
            const token = jwt.sign({ username: username }, SECRET_KEY, { expiresIn: '1h' });

            socket.emit('login-success', {
                message: 'Login exitoso',
                token: token
            });
            console.log("usuario Logeado!")
        } else {
            socket.emit('login-error', { message: 'Usuario o contraseña incorrectos' });
        }
    });

    //Socket Disconnected
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});


// Inicializar el cliente de WhatsApp (No signfica que esté el dispositivo conectado.)
client.initialize();

// Iniciar el servidor
server.listen(port, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
});