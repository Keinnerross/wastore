

// Sockets
const socket = io();

const delayLoading = 5000






// QR Code Settings
socket.on('qr', (qrImage) => {
    localStorage.setItem('whatsapp-qr', qrImage);
    document.getElementById('qrImage').src = qrImage;
});


// Status
socket.on('status', (status) => {
    Alpine.store("services").status = status;
});

// Status
socket.on('whatsapp-disconnected-forced', (res) => {
    setTimeout(() => {
        location.reload();
    }, 1500)
});




socket.on('messageProgramatedState', (state) => {
    if (state == "Programado") {
        Alpine.store("services").isSendProgramated = false;



        setTimeout(() => {
            Alpine.store('services').modalSucesfulMsjProgramated = true;
        }, 1500)


        setTimeout(() => {
            Alpine.store('services').modalSucesfulMsjProgramated = false;

        }, 4500)

        document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            checkbox.checked = false;
        });

        Alpine.store("services").message = ""
        Alpine.store("services").files = []
        Alpine.store("services").groupsSelected = []

    } else if (state == "FechaPasada") {
        alert("⚠️ La hora ya pasó, no se puede programar el mensaje.")
    } else {
        alert("⚠️Ocurrio un error a programar mensaje")
    }
});


let msjResponse;
socket.on('messageState', (state) => {
    if (state) {
        setTimeout(() => {
            Alpine.store('services').modalSucesfulMsj = true;
        }, 1500)

        setTimeout(() => {
            Alpine.store('services').modalSucesfulMsj = false;
        }, 4500)

    } else {
        alert("Algo Salió Mal")
    }

    document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        checkbox.checked = false; // Desmarcar cada checkbox
    });

    Alpine.store("services").message = ""
    Alpine.store("services").files = []
    Alpine.store("services").groupsSelected = []



});


//Login Socket
socket.on('login-success', (data) => {
    const { token } = data;
    if (token) {
        localStorage.setItem('jwtToken', token);

        window.location.href = '/dashboard';
    } else {
        console.error("No se recibió un token válido.");
    }
});

socket.on('login-error', () => {
    alert('Credenciales incorrectas');
    localStorage.removeItem('jwtToken'); // Eliminar el token expirado
});


// let Idgroups = [];




const showGroups = (data) => {
    const groupTableBody = document.querySelector("#groupTable tbody");
    groupTableBody.innerHTML = ""; // Limpiar las filas anteriores

    // Almacenar todos los grupos actualizados
    let groupsToDisplay = [];

    // Determinar qué grupos mostrar si todos o filtrados
    const query = Alpine.store('services').searchQuery;

    if (query) {
        // Convertir la consulta a string y asegurarse de que sea un string válido
        const queryString = String(query).toLowerCase();

        // Filtrar los grupos que coincidan con la consulta
        groupsToDisplay = data.filter(group => {
            // Convertir el nombre del grupo a string y asegurarse de que sea un string válido
            const groupName = String(group.name || "").toLowerCase();
            return groupName.includes(queryString);
        });
    } else {
        // Si no hay consulta, mostrar todos los grupos
        groupsToDisplay = data;
    }

    // Obtener los grupos seleccionados antes de renderizar
    const selectedGroups = Alpine.store("services").groupsSelected;

    if (groupsToDisplay.length > 0) {
        groupsToDisplay.forEach(group => {
            const profilePicUrl = group.profilePicUrl || "/assets/group-profile.png";
            const row = document.createElement("div");
            row.className = "hover:bg-[#FAFAFA] flex items-center w-full cursor-pointer rounded-lg";

            // Verificar si el grupo está seleccionado
            const isChecked = selectedGroups.includes(group.id);

            row.innerHTML = `
                <td>
                    <label for="group-${group.id}" class="px-4 py-1 w-full cursor-pointer">
                        <div class="flex items-center gap-2 py-2">
                            <div class="w-10 h-10 rounded-full overflow-hidden">
                                <img src="${profilePicUrl}" alt="${group.name || ""}" class="object-cover w-full h-full" />
                            </div>
                            <span class="text-gray-700">${group.name || "Grupo sin Nombre"}</span>
                        </div>
                    </label>
                </td>
                <td class="text-right">
                    <input id="group-${group.id}" type="checkbox" ${isChecked ? "checked" : ""
                } x-on:change="$store.services.handleGroupsSelected('${group.id}')" />
                </td>
            `;

            groupTableBody.appendChild(row);
        });
    } else {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="2" class="text-center py-2">No se encontraron grupos.</td>`;
        groupTableBody.appendChild(row);
    }
};

let groups = [];

//Get Groups
socket.on("groups-updated", (data) => {
    setTimeout(() => {
        groups = data;
        // console.log(groups);
        showGroups(groups);
    }, delayLoading);
});






//Send Message
function sendMessage() {

    const messageObj = {
        message: Alpine.store("services").message,
        files: Alpine.store("services").files,
        recipients: Alpine.store("services").groupsSelected,
    }


    // console.log(messageObj.message);



    if (Alpine.store("services").groupsSelected.length === 0) {
        alert("no has seleccionado ningún destinatario")

    } else {
        Alpine.store("services").modalSendMsj = false;
        socket.emit("handleMessage", messageObj);
    }
}


//Autentificacación
function isAuthenticated() {
    const token = localStorage.getItem('jwtToken');
    return !!token;
}

function checkAuth() {
    const publicRoutes = ['/', '/login'];

    if (isAuthenticated() && publicRoutes.includes(window.location.pathname)) {
        window.location.href = '/dashboard'; // Redirige al dashboard si está autenticado y en una ruta pública
    } else if (!isAuthenticated() && !publicRoutes.includes(window.location.pathname)) {
        window.location.href = '/login'; // Redirige al login si no está autenticado y no está en una ruta pública
    }
}



// Funcion pegado de imagen al chat desde el portapapeles
document.addEventListener("paste", (event) => {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    const files = [];

    for (const item of items) {
        if (item.type.includes("image")) {
            const file = item.getAsFile();
            files.push(file);
        }
    }

    if (files.length > 0) {

        if (Alpine.store("services").files.length <= 4) {
            Alpine.store("services").files.push(...files);
        } else {
            alert("Solo se pueden agregar un máximo de 5 imagenes, elimina una para agregar otra.")
        }
    }
});




//Fuse Buscador







//isLoading

socket.on('isLoadingGroups', (isLoadingGroups) => {

    const loadingElement = document.getElementById('isLoadingGroups');
    const groupTable = document.getElementById('groupTable');
    const serachBar = document.getElementById('search-bar');

    if (isLoadingGroups === 'Cargando') {
        // console.log("estado Cargando")
        loadingElement.classList.remove('hidden');
        groupTable.classList.add('hidden');
        serachBar.classList.add('hidden');


        loadingElement.innerHTML = `
        <div class="w-full h-full flex justify-center items-center pt-10">
            <div class="flex flex-col items-center">
                <span class="loader"></span>
                <div class="w-[300px] pt-8 text-center text-gray-700">
                <swiper-container autoplay="true" loop="true">
                         <swiper-slide>🐱 Reuniendo stickers de gatitos... ¡Miau!</swiper-slide>
                        <swiper-slide>👀 Espiando los grupos de la familia... ¡Cuidado con los tíos!</swiper-slide>
                        <swiper-slide>🚀 Preparando el despegue de los gurpos...</swiper-slide>
                </swiper-container>

                </div>
            </div>
        </div>
        `;


    } else if (isLoadingGroups === 'Desconectado') {
        // Caso Cargando
        // // console.log("estado Desconectado")

        loadingElement.classList.remove('hidden');
        groupTable.classList.add('hidden');
        serachBar.classList.add('hidden');

        loadingElement.innerHTML = `<div class="flex h-full justify-center items-center">
        <div class="flex flex-col justify-center h-full items-center text-gray-400">
             <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="150px" width="150px" xmlns="http://www.w3.org/2000/svg">
             // <path d="M5 9.897c0 -1.714 1.46 -3.104 3.26 -3.104c.275 -1.22 1.255 -2.215 2.572 -2.611c1.317 -.397 2.77 -.134 3.811 .69c1.042 .822 1.514 2.08 1.239 3.3h.693a2.42 2.42 0 0 1 2.425 2.414a2.42 2.42 0 0 1 -2.425 2.414h-8.315c-1.8 0 -3.26 -1.39 -3.26 -3.103z"></path>
             // <path d="M12 13v3"></path><path d="M12 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
             // <path d="M14 18h7"></path>
             // <path d="M3 18h7"></path></svg>
             <h3 class="w-[80%] text-center text-sm font-medium">Escanee el Código QR para Comenzar</h3>
        </div>
    </div>`;

    } else if (isLoadingGroups === 'Finalizado') {

        // // console.log("Estado Finalizado")
        loadingElement.classList.remove('hidden');
        groupTable.classList.add('hidden');
        serachBar.classList.add('hidden');


        loadingElement.innerHTML = `
        <div class="w-full h-full flex justify-center items-center pt-10">
            <div class="flex flex-col items-center">
                <span class="loader"></span>
                <div class="w-[300px] pt-8 text-center text-gray-700">
                    <swiper-container autoplay="true" loop="true">
                        <swiper-slide>🐱 Reuniendo stickers de gatitos... ¡Miau!</swiper-slide>
                        <swiper-slide>👀 Espiando los grupos de la familia... ¡Cuidado con los tíos!</swiper-slide>
                        <swiper-slide>🚀 Preparando el despegue de los gurpos...</swiper-slide>
                    </swiper-container>
                </div>
            </div>
        </div>
        `;

        setTimeout(() => {
            loadingElement.classList.add('hidden');
            groupTable.classList.remove('hidden');
            serachBar.classList.remove('hidden');


        }, delayLoading)


    } else {
        // Caso por defecto
        loadingElement.innerHTML = 'Error al cargar grupos';
    }
});






//////////////////////////////////////////
/////////////Varaibles AlpineJS /////////
////////////////////////////////////////
document.addEventListener('alpine:init', () => {
    Alpine.store('services', {
        searchQuery: "",
        message: "",
        groupsSelected: [],
        files: [],
        ifShowImages: false,
        isPicker: false,
        status: "Desconectado",
        modalSendMsj: false,
        modalSucesfulMsj: false,
        isMessageProgramated: false,
        modalSucesfulMsjProgramated: false,
        isSendProgramated: false,
        time: "",
        date: "",
        username: "",
        userPassword: "",

        handleLogin() {


            const userData = {
                username: Alpine.store("services").username,
                password: Alpine.store("services").userPassword
            }
            socket.emit('login-connection', userData);


            // // console.log(Alpine.store("services").username, Alpine.store("services").userPassword);
        },

        handleMessageProgramated() {

            const messageObj = {
                message: Alpine.store("services").message,
                files: Alpine.store("services").files,
                recipients: Alpine.store("services").groupsSelected,
                hora: Alpine.store("services").time,
                fecha: Alpine.store("services").date,
            }
            // console.log('handleMessageProgramated: ', messageObj)

            if (Alpine.store("services").groupsSelected.length === 0) {
                alert("no has seleccionado ningún destinatario")

            } else {
                socket.emit('handleMessageProgramated', messageObj);
            }





        },

        // Maneja la selección de grupos
        handleGroupsSelected(groupSelected) {
            let groups = Alpine.store("services").groupsSelected;

            if (groups.includes(groupSelected)) {
                // Modificamos el array original con splice (sin reasignar)
                groups.splice(groups.indexOf(groupSelected), 1);
            } else {
                groups.push(groupSelected);
            }

            // console.log(groups);
        },

        // Maneja la carga de archivos
        handleFileUpload(event) {
            const selectedFiles = Array.from(event.target.files);
            const totalSize = selectedFiles.reduce((total, file) => total + file.size, 0);

            // Validaciones
            if (selectedFiles.length > 5) {
                alert("Solo puedes seleccionar un máximo de 5 imágenes.");
                return;
            }
            if (totalSize > 20 * 1024 * 1024) { // 20MB
                alert("El tamaño total de las imágenes no puede exceder los 20 MB.");
                return;
            }

            // Filtrar archivos válidos (solo .jpg y .png)
            const validFiles = selectedFiles.filter(file => {
                const fileType = file.type;
                return fileType === "image/jpeg" || fileType === "image/png";
            });

            // Actualizar la lista de archivos seleccionados
            Alpine.store('services').files = validFiles;
            Alpine.store("services").files = validFiles;


            if (Alpine.store('services').files.length > 0) {
                // console.log("Archivos cargados correctamente:", Alpine.store('services').files);

            } else {
                // console.log("No se seleccionaron archivos válidos.");
            }
        },

        // Eliminar archivo de la lista
        removeFile(index) {
            Alpine.store('services').files.splice(index, 1);
        },


        // Enviar el mensaje
        sendMessage() {
            sendMessage();
        },

        //Filtrar grupos desde el buscador
        filterGroups() {
            const query = Alpine.store('services').searchQuery;
            showGroups(groups); //Aqui usamos la variable global groups;
        },


        // Cerrar sesión
        cerrar() {
            socket.emit("cerrar");

            setTimeout(() => {
                location.reload();

            }, 2000)
        },
        cerrarSessionUsuario() {
            localStorage.removeItem('jwtToken');
            window.location.href = '/login';


        },
    });



});






document.addEventListener("DOMContentLoaded", function () {




    checkAuth(); // Verifica la autenticación en las rutas protegidas




    const storedQr = localStorage.getItem('whatsapp-qr');
    if (storedQr) {
        document.getElementById('qrImage').src = storedQr;
    }


    // Emoji Picker
    const pickerOptions = {
        onEmojiSelect: emoji => {
            const inputMessage = document.getElementById('input-message');
            if (!inputMessage) return; // Evita errores si el input no existe

            const cursorPosition = inputMessage.selectionStart ?? inputMessage.value.length; // Manejo de compatibilidad
            const textBefore = inputMessage.value.slice(0, cursorPosition);
            const textAfter = inputMessage.value.slice(cursorPosition);

            // Inserta el emoji en la posición del cursor
            inputMessage.value = `${textBefore}${emoji.native}${textAfter}`;

            // Reposicionar cursor después del emoji
            const newPosition = cursorPosition + emoji.native.length;
            inputMessage.setSelectionRange(newPosition, newPosition);

            // Mantener el foco en el input
            inputMessage.focus();

            inputMessage.dispatchEvent(new Event('input', { bubbles: true }));
        }
    };


    const picker = new EmojiMart.Picker(pickerOptions);
    document.getElementById('emoji-picker').appendChild(picker);
    picker.style.position = 'relative';


    //loader
    const swiperContainer = document.querySelector('swiper-container');
    if (swiperContainer) {
        Object.assign(swiperContainer, {
            autoplay: {
                delay: 0,
                disableOnInteraction: false, // No se detiene al interactuar
            },
            loop: true,
        });
        swiperContainer.initialize();
    }


});
