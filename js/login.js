/* ===============================
   ELEMENTOS - TOGGLE DE TIPO
================================ */

const tabUsuario = document.getElementById("tabUsuario");
const tabOcs = document.getElementById("tabOcs");

const formLoginUsuario = document.getElementById("formLoginUsuario");
const formLoginOcs = document.getElementById("formLoginOcs");

const loginBadge = document.getElementById("loginBadge");
const loginTitulo = document.getElementById("loginTitulo");
const loginDescricao = document.getElementById("loginDescricao");
const loginSuporte = document.getElementById("loginSuporte");

const loginRegistroTexto = document.getElementById("loginRegistroTexto");
const loginRegistroLink = document.getElementById("loginRegistroLink");


/*
 * Textos de cada modo da tela.
 * Ajustar livremente conforme a necessidade do projeto.
 */
const TEXTOS = {

    usuario: {
        badge: "Beneficiário",
        titulo: "Acesse sua conta",
        descricao:
            "Entre com seus dados para solicitar guias e acompanhar " +
            "suas solicitações no FUSEx.",
        suporte:
            "O acesso é destinado aos beneficiários cadastrados no FUSEx.",
        registroTexto: "Ainda não possui cadastro?",
        registroLabel: "Criar conta de usuário",
        registroHref: "cadastro-usuario.html"
    },

    ocs: {
        badge: "Organização Civil de Saúde",
        titulo: "Acesso da OCS",
        descricao:
            "Entre com os dados da sua organização para acessar " +
            "o sistema e validar as guias dos beneficiários.",
        suporte:
            "O acesso é destinado às organizações credenciadas ao FUSEx.",
        registroTexto: "Sua clínica ainda não possui acesso?",
        registroLabel: "Criar cadastro da OCS",
        registroHref: "cadastro-ocs.html"
    }
};


/* ===============================
   ALTERNAR ENTRE USUÁRIO E OCS
================================ */

function selecionarTipoLogin(tipo) {

    const textos = TEXTOS[tipo];

    const ehUsuario = tipo === "usuario";


    /* Botões do toggle */

    tabUsuario.classList.toggle("is-active", ehUsuario);
    tabOcs.classList.toggle("is-active", !ehUsuario);

    tabUsuario.setAttribute("aria-selected", String(ehUsuario));
    tabOcs.setAttribute("aria-selected", String(!ehUsuario));


    /* Formulários */

    formLoginUsuario.hidden = !ehUsuario;
    formLoginOcs.hidden = ehUsuario;


    /* Textos da tela */

    loginBadge.textContent = textos.badge;
    loginTitulo.textContent = textos.titulo;
    loginDescricao.textContent = textos.descricao;
    loginSuporte.textContent = textos.suporte;

    loginRegistroTexto.textContent = textos.registroTexto;
    loginRegistroLink.textContent = textos.registroLabel;
    loginRegistroLink.setAttribute("href", textos.registroHref);
}


tabUsuario.addEventListener("click", function () {
    selecionarTipoLogin("usuario");
});

tabOcs.addEventListener("click", function () {
    selecionarTipoLogin("ocs");
});


/* Tela abre no modo Usuário por padrão */
selecionarTipoLogin("usuario");


/* ===============================
   MOSTRAR / OCULTAR SENHA
================================ */

function configurarToggleSenha(botaoId, campoId) {

    const botao = document.getElementById(botaoId);
    const campo = document.getElementById(campoId);

    botao.addEventListener("click", function () {

        if (campo.type === "password") {

            campo.type = "text";
            botao.textContent = "Ocultar";

        } else {

            campo.type = "password";
            botao.textContent = "Mostrar";
        }
    });
}

configurarToggleSenha("toggleSenhaUsuario", "senhaUsuario");
configurarToggleSenha("toggleSenhaOcs", "senhaOcs");


/* ===============================
   MÁSCARA DE CNPJ
================================ */

const campoCnpj = document.getElementById("cnpj");

campoCnpj.addEventListener("input", function () {

    let valor = campoCnpj.value.replace(/\D/g, "");

    valor = valor.substring(0, 14);

    valor = valor.replace(
        /^(\d{2})(\d)/,
        "$1.$2"
    );

    valor = valor.replace(
        /^(\d{2})\.(\d{3})(\d)/,
        "$1.$2.$3"
    );

    valor = valor.replace(
        /\.(\d{3})(\d)/,
        ".$1/$2"
    );

    valor = valor.replace(
        /(\d{4})(\d)/,
        "$1-$2"
    );

    campoCnpj.value = valor;
});


/* ===============================
   IMPORTANTE:
   Ajustar estas URLs de acordo com as rotas criadas no backend.
================================ */

const LOGIN_URL_USUARIO = "http://localhost:8080/auth/login";
const LOGIN_URL_OCS = "http://localhost:8080/ocs/login";


/* ===============================
   LOGIN - USUÁRIO
================================ */

const campoEmail = document.getElementById("email");
const campoSenhaUsuario = document.getElementById("senhaUsuario");
const loginErrorUsuario = document.getElementById("loginErrorUsuario");
const botaoEntrarUsuario = formLoginUsuario.querySelector(".login-submit");


formLoginUsuario.addEventListener("submit", async function (event) {

    event.preventDefault();

    limparErro(loginErrorUsuario);


    const email = campoEmail.value.trim();
    const senha = campoSenhaUsuario.value;


    if (!email) {

        mostrarErro(loginErrorUsuario, "Informe seu e-mail.");
        return;
    }


    if (!senha) {

        mostrarErro(loginErrorUsuario, "Informe sua senha.");
        return;
    }


    const dadosLogin = {
        login: email,
        senha: senha
    };


    botaoEntrarUsuario.disabled = true;
    botaoEntrarUsuario.textContent = "Entrando...";


    try {

        const response = await fetch(
            LOGIN_URL_USUARIO,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(dadosLogin)
            }
        );


        if (response.status === 401 ||
            response.status === 403) {

            throw new Error(
                "E-mail ou senha inválidos."
            );
        }


        if (response.status === 400) {

            throw new Error(
                "Verifique os dados informados."
            );
        }


        if (!response.ok) {

            throw new Error(
                "Não foi possível realizar o login."
            );
        }


        let dadosResposta = {};

        const contentType =
            response.headers.get("content-type");


        if (
            contentType &&
            contentType.includes("application/json")
        ) {

            dadosResposta =
                await response.json();
        }


        salvarSessao(
            "sessaoUsuario",
            { email: email, ...dadosResposta }
        );


        window.location.href =
            "../index.html";


    } catch (erro) {

        console.error(
            "Erro ao realizar login:",
            erro
        );


        if (
            erro instanceof TypeError
        ) {

            mostrarErro(
                loginErrorUsuario,
                "Não foi possível conectar ao servidor."
            );

        } else {

            mostrarErro(
                loginErrorUsuario,
                erro.message
            );
        }


    } finally {

        botaoEntrarUsuario.disabled = false;
        botaoEntrarUsuario.textContent = "Entrar";
    }

});


/* ===============================
   LOGIN - OCS
================================ */

const campoSenhaOcs = document.getElementById("senhaOcs");
const loginErrorOcs = document.getElementById("loginErrorOcs");
const botaoEntrarOcs = formLoginOcs.querySelector(".login-submit");


formLoginOcs.addEventListener("submit", async function (event) {

    event.preventDefault();

    limparErro(loginErrorOcs);


    const cnpj =
        campoCnpj.value.replace(/\D/g, "");

    const senha =
        campoSenhaOcs.value;


    if (cnpj.length !== 14) {

        mostrarErro(loginErrorOcs, "Informe um CNPJ válido.");
        return;
    }


    if (!senha) {

        mostrarErro(loginErrorOcs, "Informe sua senha.");
        return;
    }


    const dadosLogin = {
        cnpj: cnpj,
        senha: senha
    };


    botaoEntrarOcs.disabled = true;
    botaoEntrarOcs.textContent = "Entrando...";


    try {

        const response = await fetch(
            LOGIN_URL_OCS,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(dadosLogin)
            }
        );


        if (response.status === 401 ||
            response.status === 403) {

            throw new Error(
                "CNPJ ou senha inválidos."
            );
        }


        if (response.status === 400) {

            throw new Error(
                "Verifique os dados informados."
            );
        }


        if (!response.ok) {

            throw new Error(
                "Não foi possível realizar o login."
            );
        }


        let dadosResposta = {};

        const contentType =
            response.headers.get("content-type");


        if (
            contentType &&
            contentType.includes("application/json")
        ) {

            dadosResposta =
                await response.json();
        }


        salvarSessao(
            "sessaoOcs",
            { cnpj: cnpj, ...dadosResposta }
        );


        window.location.href =
            "painel-ocs.html";


    } catch (erro) {

        console.error(
            "Erro ao realizar login:",
            erro
        );


        if (
            erro instanceof TypeError
        ) {

            mostrarErro(
                loginErrorOcs,
                "Não foi possível conectar ao servidor."
            );

        } else {

            mostrarErro(
                loginErrorOcs,
                erro.message
            );
        }


    } finally {

        botaoEntrarOcs.disabled = false;
        botaoEntrarOcs.textContent = "Entrar";
    }

});


/* ===============================
   SESSÃO
================================ */

function salvarSessao(chave, dados) {

    localStorage.setItem(
        chave,
        JSON.stringify(dados)
    );


    /*
     * Caso o backend devolva JWT:
     */
    if (dados.token) {

        localStorage.setItem(
            "token",
            dados.token
        );
    }
}


/* ===============================
   MENSAGENS DE ERRO
================================ */

function mostrarErro(elemento, texto) {

    elemento.textContent = texto;

    elemento.className =
        "form-feedback error";
}


function limparErro(elemento) {

    elemento.textContent = "";

    elemento.className =
        "form-feedback";
}
