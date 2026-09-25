const form = document.getElementById("formCadastroUsuario");
const mensagem = document.getElementById("mensagemCadastro");
const btnCadastrar = document.getElementById("btnCadastrar");
const campoCpf = document.getElementById("cpf");
const campoTelefone = document.getElementById("telefone");
const campoSenha = document.getElementById("senha");
const toggleSenha = document.getElementById("toggleSenha");


/* =========================
   MOSTRAR / OCULTAR SENHA
========================= */

toggleSenha.addEventListener("click", function () {
    if (campoSenha.type === "password") {
        campoSenha.type = "text";
        toggleSenha.textContent = "Ocultar";
    } else {
        campoSenha.type = "password";
        toggleSenha.textContent = "Mostrar";
    }
});


/* =========================
   MÁSCARA CPF
========================= */

campoCpf.addEventListener("input", function () {
    let valor = campoCpf.value.replace(/\D/g, "");
    valor = valor.substring(0, 11);
    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");

    valor = valor.replace(/(\d{3})(\d)/, "$1.$2");

    valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    campoCpf.value = valor;
});


/* =========================
   MÁSCARA TELEFONE
========================= */

campoTelefone.addEventListener("input", function () {

    let valor =
        campoTelefone.value.replace(/\D/g, "");

    valor = valor.substring(0, 11);


    if (valor.length <= 10) {

        valor = valor.replace(
            /(\d{2})(\d)/,
            "($1) $2"
        );

        valor = valor.replace(
            /(\d{4})(\d)/,
            "$1-$2"
        );

    } else {

        valor = valor.replace(
            /(\d{2})(\d)/,
            "($1) $2"
        );

        valor = valor.replace(
            /(\d{5})(\d)/,
            "$1-$2"
        );
    }


    campoTelefone.value = valor;
});


/* =========================
   ENVIO DO FORMULÁRIO
========================= */

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    limparMensagem();


    const usuario = {

        nomeUsuario:
            document
                .getElementById("nomeUsuario")
                .value
                .trim(),

        email:
            document
                .getElementById("email")
                .value
                .trim(),

        cpf:
            campoCpf
                .value
                .replace(/\D/g, ""),

        precCp:
            document
                .getElementById("precCp")
                .value
                .trim(),

        telefone:
            campoTelefone
                .value
                .replace(/\D/g, ""),

        senha:
            campoSenha.value
    };


    if (usuario.cpf.length !== 11) {

        mostrarErro(
            "O CPF deve possuir exatamente 11 números."
        );

        return;
    }


    btnCadastrar.disabled = true;

    btnCadastrar.textContent =
        "Cadastrando...";


    try {

        const response = await fetch(
            "http://localhost:8080/usuarios",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(usuario)
            }
        );


        if (!response.ok) {

            let mensagemErro =
                "Não foi possível realizar o cadastro.";


            try {

                const dadosErro =
                    await response.json();

                mensagemErro =
                    dadosErro.message ||
                    mensagemErro;

            } catch {

                const texto =
                    await response.text();

                if (texto) {
                    mensagemErro = texto;
                }
            }


            throw new Error(mensagemErro);
        }


        mostrarSucesso(
            "Usuário cadastrado com sucesso."
        );


        form.reset();

        toggleSenha.textContent =
            "Mostrar";


    } catch (erro) {

        console.error(
            "Erro no cadastro:",
            erro
        );


        mostrarErro(
            erro.message ||
            "Não foi possível conectar ao servidor."
        );

    } finally {

        btnCadastrar.disabled = false;

        btnCadastrar.textContent =
            "Criar conta";
    }

});


function mostrarSucesso(texto) {

    mensagem.className =
        "form-feedback success";

    mensagem.textContent =
        texto;
}


function mostrarErro(texto) {

    mensagem.className =
        "form-feedback error";

    mensagem.textContent =
        texto;
}


function limparMensagem() {

    mensagem.className =
        "form-feedback";

    mensagem.textContent =
        "";
}