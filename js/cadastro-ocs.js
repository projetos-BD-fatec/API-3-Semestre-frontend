const form = document.getElementById("formCadastroOcs");

const mensagem = document.getElementById("mensagemCadastro");

const btnCadastrar = document.getElementById("btnCadastrar");


const campoCnpj = document.getElementById("cnpj");
const campoCep = document.getElementById("cep");
const campoCpfResponsavel = document.getElementById("cpfResponsavel");
const campoTelefoneResponsavel = document.getElementById("telefoneResponsavel");

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
   MÁSCARA CNPJ
========================= */

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


/* =========================
   MÁSCARA CEP
========================= */

campoCep.addEventListener("input", function () {

    let valor = campoCep.value.replace(/\D/g, "");

    valor = valor.substring(0, 8);

    valor = valor.replace(
        /(\d{5})(\d)/,
        "$1-$2"
    );

    campoCep.value = valor;
});


/* =========================
   MÁSCARA CPF (responsável)
========================= */

campoCpfResponsavel.addEventListener("input", function () {

    let valor = campoCpfResponsavel.value.replace(/\D/g, "");

    valor = valor.substring(0, 11);

    valor = valor.replace(
        /(\d{3})(\d)/,
        "$1.$2"
    );

    valor = valor.replace(
        /(\d{3})(\d)/,
        "$1.$2"
    );

    valor = valor.replace(
        /(\d{3})(\d{1,2})$/,
        "$1-$2"
    );

    campoCpfResponsavel.value = valor;
});


/* =========================
   MÁSCARA TELEFONE (responsável)
========================= */

campoTelefoneResponsavel.addEventListener("input", function () {

    let valor =
        campoTelefoneResponsavel.value.replace(/\D/g, "");

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


    campoTelefoneResponsavel.value = valor;
});


/* =========================
   IMPORTANTE:
   Ajustar esta URL de acordo com a rota criada no backend.
========================= */

const CADASTRO_OCS_URL = "http://localhost:8080/ocs";


/* =========================
   ENVIO DO FORMULÁRIO
========================= */

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    limparMensagem();


    /*
     * Estrutura enviada ao backend.
     *
     * Segue o modelo PRESTADOR (dados da OCS) +
     * USUARIO (responsável pelo acesso, vinculado ao prestador).
     */
    const cadastroOcs = {

        prestador: {

            nomePrestador:
                document
                    .getElementById("nomePrestador")
                    .value
                    .trim(),

            nomeFantasia:
                document
                    .getElementById("nomeFantasia")
                    .value
                    .trim(),

            tipoDocumento: "CNPJ",

            cnpj:
                campoCnpj
                    .value
                    .replace(/\D/g, ""),

            endereco: {

                cep:
                    campoCep
                        .value
                        .replace(/\D/g, ""),

                logradouro:
                    document
                        .getElementById("logradouro")
                        .value
                        .trim(),

                numero:
                    document
                        .getElementById("numero")
                        .value
                        .trim(),

                complemento:
                    document
                        .getElementById("complemento")
                        .value
                        .trim(),

                bairro:
                    document
                        .getElementById("bairro")
                        .value
                        .trim(),

                cidade:
                    document
                        .getElementById("cidade")
                        .value
                        .trim(),

                uf:
                    document
                        .getElementById("uf")
                        .value
            }
        },

        responsavel: {

            nomeUsuario:
                document
                    .getElementById("nomeResponsavel")
                    .value
                    .trim(),

            cpf:
                campoCpfResponsavel
                    .value
                    .replace(/\D/g, ""),

            telefone:
                campoTelefoneResponsavel
                    .value
                    .replace(/\D/g, ""),

            email:
                document
                    .getElementById("email")
                    .value
                    .trim(),

            senha:
                campoSenha.value
        }
    };


    if (cadastroOcs.prestador.cnpj.length !== 14) {

        mostrarErro(
            "O CNPJ deve possuir exatamente 14 números."
        );

        return;
    }


    if (cadastroOcs.prestador.endereco.cep.length !== 8) {

        mostrarErro(
            "O CEP deve possuir exatamente 8 números."
        );

        return;
    }


    if (!cadastroOcs.prestador.endereco.uf) {

        mostrarErro(
            "Selecione o estado (UF) da OCS."
        );

        return;
    }


    if (cadastroOcs.responsavel.cpf.length !== 11) {

        mostrarErro(
            "O CPF do responsável deve possuir exatamente 11 números."
        );

        return;
    }


    btnCadastrar.disabled = true;

    btnCadastrar.textContent =
        "Cadastrando...";


    try {

        const response = await fetch(
            CADASTRO_OCS_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(cadastroOcs)
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
            "Cadastro da OCS realizado com sucesso."
        );


        form.reset();

        toggleSenha.textContent =
            "Mostrar";


    } catch (erro) {

        console.error(
            "Erro no cadastro da OCS:",
            erro
        );


        if (erro instanceof TypeError) {

            mostrarErro(
                "Não foi possível conectar ao servidor."
            );

        } else {

            mostrarErro(
                erro.message ||
                "Não foi possível realizar o cadastro."
            );
        }

    } finally {

        btnCadastrar.disabled = false;

        btnCadastrar.textContent =
            "Criar cadastro da OCS";
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
