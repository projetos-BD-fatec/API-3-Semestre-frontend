const inputFile = document.getElementById("encaminhamento");
const fileInfo = document.getElementById("file-info");
const fileError = document.getElementById("file-error");
const fileUpload = document.querySelector(".file-upload");
const form = document.getElementById("request-form");
const inputExam = document.getElementById("exame");
const inputClinic = document.getElementById("clinica");
const formError = document.getElementById("form-error");
const confirmation = document.getElementById("confirmation");
const confirmationExam = document.getElementById("confirmation-exam");
const confirmationClinic = document.getElementById("confirmation-clinic");
const confirmationFile = document.getElementById("confirmation-file");
const cancelConfirmation = document.getElementById("cancel-confirmation");
const confirmSubmit = document.getElementById("confirm-submit");

const MAX_SIZE = 10 * 1024 * 1024;

const PERMITTED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png"
];

inputFile.addEventListener("change", function () {
    fileInfo.textContent = "";
    fileError.textContent = "";

    const file = inputFile.files[0];

    if (!file) {
        return;
    }

    if (!PERMITTED_TYPES.includes(file.type)) {
        fileError.textContent = "Tipo de arquivo inválido!";
        fileUpload.classList.add("has-error");
        inputFile.value = "";
        return;
    }

    if(file.size > MAX_SIZE) {
        fileError.textContent = "O arquivo deve ter no máximo 10MB.";
        fileUpload.classList.add("has-error");
        inputFile.value = "";
        return;
    }

    const sizeMB = (file.size / (1024 * 1024).toFixed(2));
    fileInfo.textContent = `${file.name} - ${sizeMB} MB`;
});

form.addEventListener("submit", function (event) {
    event.preventDefault();

    formError.textContent = "";

    let validForm = true;

    if (!inputFile.files[0]) {
        validForm = false;
    }

    if (!inputExam.value) {
        validForm = false;
        inputExam.classList.add("has-error");
    } else {
        inputExam.classList.remove("has-error");
    }

    if (!inputClinic.value) {
        validForm = false;
        inputClinic.classList.add("has-error");
    } else {
        inputClinic.classList.remove("has-error");
    }

    if (!validForm) {
        formError.textContent = "Corrija os campos destacados antes de continuar.";
        return;
    }

    confirmationExam.textContent = inputExam.options[inputExam.selectedIndex].text;
    confirmationClinic.textContent = inputClinic.options[inputClinic.selectedIndex].text;
    confirmationFile.textContent = inputFile.files[0].name;
    confirmation.classList.add("show");
});

cancelConfirmation.addEventListener("click", function () {
    confirmation.classList.remove("show");
});

confirmSubmit.addEventListener("click", function () {

    console.log("Solicitação confirmada!");

});