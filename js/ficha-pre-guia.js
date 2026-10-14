/* =====================================================
   Ficha da pré-guia (modal grande)

   Mostra TODOS os dados que chegam ao funcionário do FUSEx.
   Dois modos:
     - "visualizar": consulta de uma pré-guia já enviada
     - "confirmar":  revisão antes do envio (botões Voltar / Confirmar)

   O próprio script cria o HTML do modal; as páginas só precisam
   carregar este arquivo (depois de api.js e formatters.js).

   Uso:
     FichaPreGuia.abrir(ficha, { modo: "visualizar" });
     FichaPreGuia.abrir(ficha, { modo: "confirmar", aoConfirmar: async () => {...} });

   Formato do objeto "ficha":
     {
       codigo, dataSolicitacao, status,
       beneficiario: { nome, precCp },
       arquivo: { nome, obterUrl: async () => url } | null,
       itens: [{ codTuss, nome, prestador, enderecoLinhas, valor, status }]
     }
===================================================== */

const FichaPreGuia = (function () {

    const PLACEHOLDER_CODIGO = "Gerado ao enviar";
    const PLACEHOLDER_DATA = "Registrada ao enviar";

    let overlay = null;
    let elementoAnterior = null;
    let opcoesAtuais = {};
    let ocupado = false;


    // ==============================
    // DOM e teclado
    // ==============================

    function garantirDom() {
        if (overlay) {
            return;
        }

        overlay = document.createElement("div");
        overlay.className = "ficha-overlay";
        overlay.hidden = true;

        // Clique fora da ficha fecha
        overlay.addEventListener("mousedown", function (event) {
            if (event.target === overlay && !ocupado) {
                fechar();
            }
        });

        document.body.appendChild(overlay);
        document.addEventListener("keydown", aoPressionarTecla);
    }

    function aoPressionarTecla(event) {
        if (!overlay || overlay.hidden) {
            return;
        }

        if (event.key === "Escape" && !ocupado) {
            fechar();
            return;
        }

        if (event.key === "Tab") {
            prenderFoco(event);
        }
    }

    /** Mantém o Tab circulando dentro do modal. */
    function prenderFoco(event) {
        const focaveis = overlay.querySelectorAll(
            'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        );

        if (focaveis.length === 0) {
            return;
        }

        const primeiro = focaveis[0];
        const ultimo = focaveis[focaveis.length - 1];

        if (event.shiftKey && document.activeElement === primeiro) {
            event.preventDefault();
            ultimo.focus();
        } else if (!event.shiftKey && document.activeElement === ultimo) {
            event.preventDefault();
            primeiro.focus();
        }
    }


    // ==============================
    // Renderização
    // ==============================

    function campo(rotulo, valor, { mono = false, placeholder = false } = {}) {
        const vazio = valor === null || valor === undefined || valor === "";
        const classes = [];

        if (mono && !vazio) {
            classes.push("ficha-mono");
        }

        if (vazio || placeholder) {
            classes.push("ficha-vazio");
        }

        return `
            <div class="ficha-campo">
                <dt>${escapeHtml(rotulo)}</dt>
                <dd class="${classes.join(" ")}">
                    ${vazio ? "—" : escapeHtml(valor)}
                </dd>
            </div>
        `;
    }

    function renderizarExame(item, indice) {
        const endereco = (item.enderecoLinhas || [])
            .map(escapeHtml)
            .join("<br>");

        const valor = (item.valor === null || item.valor === undefined)
            ? null
            : formatCurrency(item.valor);

        return `
            <li class="ficha-exame">
                <div class="ficha-exame-topo">
                    <span class="ficha-exame-numero">Exame ${indice + 1}</span>
                    ${item.status
                        ? `<span class="status ${getStatusClass(item.status)}">
                               ${escapeHtml(getStatusLabel(item.status))}
                           </span>`
                        : ""}
                </div>

                <strong class="ficha-exame-nome">${escapeHtml(item.nome)}</strong>

                <dl class="ficha-campos ficha-campos-exame">
                    ${campo("Código TUSS", item.codTuss, { mono: true })}
                    ${campo("Valor contratual", valor, { mono: true })}
                </dl>

                <div class="ficha-clinica">
                    <span class="ficha-rotulo">Clínica</span>
                    <span class="ficha-clinica-nome">${escapeHtml(item.prestador || "—")}</span>
                    <address class="ficha-endereco">${endereco || "—"}</address>
                </div>
            </li>
        `;
    }

    /** Soma dos valores; null se algum exame estiver sem valor. */
    function calcularTotal(itens) {
        if (itens.length === 0) {
            return null;
        }

        let total = 0;

        for (const item of itens) {
            const numero = Number(item.valor);

            if (item.valor === null || item.valor === undefined || Number.isNaN(numero)) {
                return null;
            }

            total += numero;
        }

        return total;
    }

    function montarHtml(ficha, modo) {
        const rascunho = modo === "confirmar";
        const itens = ficha.itens || [];
        const beneficiario = ficha.beneficiario || {};
        const total = calcularTotal(itens);

        const badge = ficha.status
            ? `<span class="status ${getStatusClass(ficha.status)}">
                   ${escapeHtml(getStatusLabel(ficha.status))}
               </span>`
            : "";

        const arquivoHtml = ficha.arquivo
            ? `<div class="ficha-arquivo">
                   <span class="ficha-arquivo-nome">${escapeHtml(ficha.arquivo.nome)}</span>
                   <button type="button" class="ficha-botao-arquivo" data-acao="ver-arquivo">
                       Visualizar arquivo
                   </button>
               </div>`
            : `<p class="ficha-vazio">Nenhum arquivo anexado.</p>`;

        const rodape = rascunho
            ? `<button type="button" class="secondary-button" data-acao="cancelar">
                   Voltar
               </button>
               <button type="button" class="primary-button" data-acao="confirmar">
                   Confirmar envio
               </button>`
            : `<button type="button" class="secondary-button" data-acao="fechar">
                   Fechar
               </button>`;

        return `
            <div class="ficha" role="dialog" aria-modal="true"
                 aria-labelledby="ficha-titulo" tabindex="-1">

                <header class="ficha-cabecalho">
                    <div>
                        <h2 id="ficha-titulo">
                            ${rascunho ? "Confirmar solicitação" : "Ficha da pré-guia"}
                        </h2>
                        <p class="ficha-subtitulo">
                            ${rascunho
                                ? "Revise os dados abaixo. É isto que o FUSEx receberá para gerar a guia oficial."
                                : "Dados completos da solicitação."}
                        </p>
                    </div>

                    <div class="ficha-cabecalho-lado">
                        ${badge}
                        <button type="button" class="ficha-fechar"
                                data-acao="fechar" aria-label="Fechar">×</button>
                    </div>
                </header>

                <div class="ficha-corpo">

                    <section class="ficha-secao">
                        <h3>Solicitação</h3>
                        <dl class="ficha-campos">
                            ${campo("Código da solicitação",
                                    ficha.codigo || (rascunho ? PLACEHOLDER_CODIGO : null),
                                    { mono: true, placeholder: !ficha.codigo })}
                            ${campo("Data da solicitação",
                                    ficha.dataSolicitacao
                                        ? formatDateTime(ficha.dataSolicitacao)
                                        : (rascunho ? PLACEHOLDER_DATA : null),
                                    { placeholder: !ficha.dataSolicitacao })}
                        </dl>
                    </section>

                    <section class="ficha-secao">
                        <h3>Beneficiário</h3>
                        <dl class="ficha-campos">
                            ${campo("Nome", beneficiario.nome)}
                            ${campo("PREC-CP", beneficiario.precCp, { mono: true })}
                        </dl>
                    </section>

                    <section class="ficha-secao">
                        <h3>Encaminhamento</h3>
                        ${arquivoHtml}
                    </section>

                    <section class="ficha-secao">
                        <h3>Exames (${itens.length})</h3>
                        <ol class="ficha-exames">
                            ${itens.map(renderizarExame).join("")}
                        </ol>
                        ${total !== null
                            ? `<div class="ficha-total">
                                   <span>Total contratual</span>
                                   <strong>${escapeHtml(formatCurrency(total))}</strong>
                               </div>`
                            : ""}
                    </section>

                </div>

                <footer class="ficha-rodape">
                    <p class="form-error ficha-erro" id="ficha-erro" role="alert" hidden></p>
                    <div class="ficha-acoes">
                        ${rodape}
                    </div>
                </footer>
            </div>
        `;
    }


    // ==============================
    // Ações
    // ==============================

    function mostrarErro(mensagem) {
        const elemento = overlay && overlay.querySelector("#ficha-erro");

        if (elemento) {
            elemento.textContent = mensagem;
            elemento.hidden = false;
        }
    }

    function esconderErro() {
        const elemento = overlay && overlay.querySelector("#ficha-erro");

        if (elemento) {
            elemento.textContent = "";
            elemento.hidden = true;
        }
    }

    /**
     * Abre o anexo em outra aba.
     * A aba é aberta ANTES do download (ainda dentro do clique) para o
     * navegador não bloquear como pop-up; depois ela recebe a URL do arquivo.
     */
    async function visualizarArquivo(botao, arquivo) {
        esconderErro();

        const janela = window.open("", "_blank");

        if (!janela) {
            mostrarErro("O navegador bloqueou a nova aba. Permita pop-ups para este site e tente de novo.");
            return;
        }

        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = "Abrindo...";

        try {
            const url = await arquivo.obterUrl();

            janela.location.href = url;

            // Libera a memória do blob depois de um tempo
            setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 5 * 60 * 1000);

        } catch (error) {
            janela.close();
            mostrarErro(error.message || "Não foi possível abrir o arquivo.");

        } finally {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }
    }

    async function confirmar(botao) {
        if (ocupado || typeof opcoesAtuais.aoConfirmar !== "function") {
            return;
        }

        ocupado = true;
        esconderErro();

        const textoOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = "Enviando...";

        try {
            await opcoesAtuais.aoConfirmar();

            ocupado = false;
            fechar();

        } catch (error) {
            console.error("Erro ao confirmar envio:", error);

            ocupado = false;
            botao.disabled = false;
            botao.textContent = textoOriginal;

            mostrarErro(error.message || "Não foi possível concluir o envio. Tente novamente.");
        }
    }

    function ligarEventos(ficha) {
        overlay
            .querySelectorAll('[data-acao="fechar"], [data-acao="cancelar"]')
            .forEach(function (botao) {
                botao.addEventListener("click", function () {
                    if (!ocupado) {
                        fechar();
                    }
                });
            });

        const botaoArquivo = overlay.querySelector('[data-acao="ver-arquivo"]');

        if (botaoArquivo && ficha.arquivo) {
            botaoArquivo.addEventListener("click", function () {
                visualizarArquivo(botaoArquivo, ficha.arquivo);
            });
        }

        const botaoConfirmar = overlay.querySelector('[data-acao="confirmar"]');

        if (botaoConfirmar) {
            botaoConfirmar.addEventListener("click", function () {
                confirmar(botaoConfirmar);
            });
        }
    }


    // ==============================
    // API pública
    // ==============================

    function abrir(ficha, opcoes = {}) {
        garantirDom();

        opcoesAtuais = opcoes;
        ocupado = false;
        elementoAnterior = document.activeElement;

        const modo = opcoes.modo === "confirmar" ? "confirmar" : "visualizar";

        overlay.innerHTML = montarHtml(ficha, modo);
        ligarEventos(ficha);

        overlay.hidden = false;
        document.body.classList.add("modal-aberto");

        // Foco no próprio diálogo (e não no botão de confirmar,
        // para um Enter acidental não enviar a solicitação)
        overlay.querySelector(".ficha").focus();
    }

    function fechar() {
        if (!overlay || overlay.hidden) {
            return;
        }

        overlay.hidden = true;
        overlay.innerHTML = "";
        ocupado = false;

        document.body.classList.remove("modal-aberto");

        if (elementoAnterior && typeof elementoAnterior.focus === "function") {
            elementoAnterior.focus();
        }
    }

    return { abrir, fechar };

})();


/**
 * Converte uma PreGuiaResponse (API) no formato da ficha.
 * @param {object} preGuia      resposta de /pre-guias
 * @param {object} beneficiario { nome, precCp } vindo de buscarBeneficiario()
 *
 * Se o backend passar a enviar o beneficiário dentro da própria pré-guia
 * (necessário para a tela do funcionário), esses campos têm prioridade.
 */
function fichaDePreGuiaApi(preGuia, beneficiario) {
    const daPreGuia = lerBeneficiario(preGuia);
    const doUsuario = beneficiario || lerBeneficiario(null);

    return {
        codigo: codigoSolicitacao(preGuia.idPreGuia),
        dataSolicitacao: preGuia.criadoEm,
        status: preGuia.status,

        beneficiario: {
            nome: daPreGuia.nome ?? doUsuario.nome,
            precCp: daPreGuia.precCp ?? doUsuario.precCp
        },

        arquivo: preGuia.nmArquivo
            ? {
                nome: preGuia.nmArquivo,
                obterUrl: function () {
                    return obterUrlArquivoPreGuia(preGuia.idPreGuia);
                }
            }
            : null,

        itens: (preGuia.itens || []).map(function (item) {
            return {
                codTuss: item.codTuss ?? null,
                nome: item.nmExame,
                prestador: item.nmPrestador,
                enderecoLinhas: buildAddressLines(item),
                valor: item.valor ?? null,
                status: item.status
            };
        })
    };
}
