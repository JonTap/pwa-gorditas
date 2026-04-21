const CONFIG = {
    tel: "521234567890", 
    pGordita: 25, pBebida: 20, SECRET: 15, STAFF_PIN: "2024",
    FIREBASE_URL: "https://TU-PROYECTO.firebaseio.com/pedidos"
};

const guisados = ["Chicharrón Prensado", "Deshebrada", "Picadillo", "Nopalitos", "Rajas con Queso", "Frijol con Queso", "Asado de Puerco", "Mole", "Chicharrón de Pella", "Huevo con Chorizo", "Papa con Chorizo", "Carne Deshebrada", "Pollo", "Prensado Rojo", "Chiles Rellenos", "Picadillo Verde", "Bistec", "Cochinita", "Tinga", "Champignones"];
const bebidas = ["Coca-Cola", "Sprite", "Joyita", "Agua Natural", "Agua de Horchata", "Agua de Jamaica", "Manzanita", "Fanta", "Sidral", "Té Helado"];

let cart = {};
let mesaFinal = "N/A";
const sndNotif = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");

// Seguridad de Mesa
function validarAcceso() {
    const params = new URLSearchParams(window.location.search);
    const mUrl = params.get('mesa'), vUrl = params.get('v'), mGuardada = localStorage.getItem('sazon_mesa');

    if (mGuardada) { mesaFinal = mGuardada; } 
    else if (mUrl && vUrl && (parseInt(mUrl) * CONFIG.SECRET == parseInt(vUrl))) {
        localStorage.setItem('sazon_mesa', mUrl);
        mesaFinal = mUrl;
    } else { mesaFinal = "Mostrador"; }
    document.getElementById('mesa-label').innerText = "Mesa " + mesaFinal;
}

function solicitarCambioMesa() {
    if (prompt("Código de Personal:") === CONFIG.STAFF_PIN) {
        localStorage.clear(); location.href = "index.html";
    } else { alert("❌ PIN incorrecto"); }
}

// Menú y Carrito
function render() {
    let h = `<h2 id="sec-gorditas">Gorditas ($${CONFIG.pGordita})</h2><div class="list-group">`;
    guisados.forEach(g => h += itemHtml(g));
    h += `</div><h2 id="sec-bebidas">Bebidas ($${CONFIG.pBebida})</h2><div class="list-group">`;
    bebidas.forEach(b => h += itemHtml(b));
    document.getElementById('menu-content').innerHTML = h + '</div>';
}
function itemHtml(n) { return `<div class="item"><span class="item-name">${n}</span><div class="stepper"><button onclick="update('${n}',-1)">−</button><span id="q-${n}">0</span><button onclick="update('${n}',1)">+</button></div></div>`; }

function update(n, v) {
    cart[n] = (cart[n] || 0) + v; if (cart[n] <= 0) delete cart[n];
    document.getElementById('q-' + n).innerText = cart[n] || 0; calc();
}
function calc() {
    let t = 0; for (let k in cart) t += cart[k] * (guisados.includes(k) ? CONFIG.pGordita : CONFIG.pBebida);
    document.getElementById('total-val').innerText = '$' + t;
}

function manejarTipoEntrega() {
    const tipo = document.querySelector('input[name="via"]:checked').value;
    document.getElementById('cliente-input-container').style.display = (tipo === "Llevar") ? "block" : "none";
}

// Enviar Pedido a Firebase y WhatsApp
async function sendOrder() {
    let txt = "", itemsArr = [];
    for (let k in cart) { txt += `*${cart[k]}x* ${k}\n`; itemsArr.push(`${cart[k]}x ${k}`); }
    if (!txt) return alert("Carrito vacío");

    const tipo = document.querySelector('input[name="via"]:checked').value;
    const nombre = document.getElementById('clienteNombre').value.trim();
    const idFinal = (tipo === "Llevar") ? (nombre || "Para Llevar") : "Mesa " + mesaFinal;

    const pedidoData = { id: idFinal, tipo, items: itemsArr, timestamp: Date.now(), hora: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}), status: "preparando" };

    try {
        const res = await fetch(`${CONFIG.FIREBASE_URL}.json`, { method: "POST", body: JSON.stringify(pedidoData) });
        const data = await res.json();
        if(data.name) {
            localStorage.setItem('pedido_activo_id', data.name);
            rastrearPedidoPropio();
        }
    } catch (e) { console.error(e); }

    window.location.href = `https://wa.me/${CONFIG.tel}?text=${encodeURIComponent("*NUEVO PEDIDO*\n" + txt + "\n" + idFinal)}`;
}

// Rastreo en Tiempo Real para el Cliente
function rastrearPedidoPropio() {
    const id = localStorage.getItem('pedido_activo_id'); if (!id) return;
    let yaSoro = false;

    setInterval(async () => {
        try {
            const res = await fetch(`${CONFIG.FIREBASE_URL}/${id}.json`);
            const p = await res.json();
            const bar = document.getElementById('tracking-bar');
            if (!p) { bar.style.display = "none"; return; }
            bar.style.display = "block";
            if (p.status === "listo") {
                bar.classList.add('tracking-ready');
                document.getElementById('tracking-status').innerText = "✅ ¡LISTO! PASA POR ÉL";
                if(!yaSoro) { sndNotif.play(); if(navigator.vibrate) navigator.vibrate([200,100,200]); yaSoro = true; }
            }
        } catch (e) {}
    }, 5000);
}

validarAcceso(); render(); rastrearPedidoPropio();