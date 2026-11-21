/* =====================================================
   Página: assinar guia (beneficiário)

   Mostra o código de 6 dígitos de cada guia utilizada que está
   aguardando a assinatura do beneficiário. Ele diz o código à OCS,
   que o digita na tela dela. A lista se atualiza sozinha.

   Depende de: api.js (listarAssinaturasPendentes) e formatters.js (escapeHtml)
===================================================== */

const INTERVALO_ATUALIZACAO_MS = 8000;

const el = {
    lista: document.getElementById("assinar-lista"),
    vazio: document.getElementById("assinar-vazio"),
    erro: document.getElementById("assinar-erro"),
    carregando: document.getElementById("assinar-carregando")
};

let pendentes = [];          // última lista recebida (com segundosRestantes do servidor)
let recebidoEm = 0;          // quando recebeu, para contar o tempo restante no navegador
let consultando = false;


/** "123456" -> "123 456" (mais fácil de ler e ditar). */
function agruparCodigo(codigo) {
    return String(codigo || "").replace(/^(\d{3})(\d{3})$/, "$1 $2");
}

function formatarTempo(segundos) {
    const minutos = Math.floor(segundos / 60);
    const resto = String(segundos % 60).padStart(2, "0");

    return `${minutos}:${resto}`;
}

/** Segundos que ainda faltam, descontando o tempo desde que a lista chegou. */
function segundosRestantes(item) {
    const passados = Math.floor((Date.now() - recebidoEm) / 1000);

    return Math.max(0, item.segundosRestantes - passados);
}


/* ===============================
   RENDERIZAÇÃO
================================ */

function renderizar() {
    const ativos = pendentes.filter(function (item) {
        return segundosRestantes(item) > 0;
    });

    // .empty-state começa com display:none; o JS escolhe quando mostrar
    el.vazio.style.display = ativos.length > 0 ? "none" : "flex";

    el.lista.innerHTML = ativos.map(function (item) {
        const procedimentos = (item.procedimentos || []).map(function (nome) {
            return `<li>${escapeHtml(nome)}</li>`;
        }).join("");

        return `
            <article class="assinar-card" data-id="${item.idGuia}">
                <p class="assinar-guia">
                    Guia <span class="assinar-mono">${escapeHtml(item.codigoGuia || "#" + item.idGuia)}</span>
                    ${item.nomePrestador ? "· " + escapeHtml(item.nomePrestador) : ""}
                </p>

                <p class="assinar-rotulo">Seu código de assinatura</p>
                <p class="assinar-codigo" aria-label="Código ${escapeHtml(item.codigo)}">${escapeHtml(agruparCodigo(item.codigo))}</p>
                <p class="assinar-tempo" data-tempo="${item.idGuia}">
                    Expira em ${formatarTempo(segundosRestantes(item))}
                </p>

                <p class="assinar-rotulo">Procedimentos desta guia</p>
                <ul class="assinar-procedimentos">${procedimentos}</ul>
            </article>
        `;
    }).join("");
}

/** A cada segundo só atualiza o relógio; quando algum código vence, redesenha. */
function atualizarRelogios() {
    let algumVenceu = false;

    pendentes.forEach(function (item) {
        const restante = segundosRestantes(item);
        const campo = el.lista.querySelector(`[data-tempo="${item.idGuia}"]`);

        if (campo) {
            if (restante <= 0) {
                algumVenceu = true;
            } else {
                campo.textContent = `Expira em ${formatarTempo(restante)}`;
            }
        }
    });

    if (algumVenceu) {
        renderizar();
    }
}


/* ===============================
   CARREGAR / ATUALIZAR
================================ */

async function carregar() {
    if (consultando) {
        return;
    }

    consultando = true;

    try {
        const lista = await listarAssinaturasPendentes();

        pendentes = Array.isArray(lista) ? lista : [];
        recebidoEm = Date.now();

        el.erro.hidden = true;
        renderizar();

    } catch (error) {
        console.error("Erro ao carregar guias para assinar:", error);

        // Mantém o que já está na tela; só avisa
        el.erro.textContent = error instanceof TypeError
            ? "Não foi possível conectar ao servidor. Tentando novamente..."
            : (error.message || "Não foi possível carregar as guias para assinar.");
        el.erro.hidden = false;

    } finally {
        el.carregando.hidden = true;
        consultando = false;
    }
}

carregar();

// Quando a OCS gera o código, ele aparece sem o beneficiário precisar recarregar
setInterval(carregar, INTERVALO_ATUALIZACAO_MS);
setInterval(atualizarRelogios, 1000);
