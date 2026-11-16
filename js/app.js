const URL_PACIENTES = "data/pacientes.json";
const TEMPO_SAIDA_MS = 350;
const TEMPO_TOAST_MS = 2600;
const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

const FAIXAS_IMC = [
  { limite: 18.5, rotulo: "Abaixo do peso", classe: "abaixo" },
  { limite: 25, rotulo: "Peso normal", classe: "normal" },
  { limite: 30, rotulo: "Sobrepeso", classe: "sobrepeso" },
  { limite: 35, rotulo: "Obesidade grau I", classe: "ob1" },
  { limite: 40, rotulo: "Obesidade grau II", classe: "ob2" },
  { limite: Infinity, rotulo: "Obesidade grau III", classe: "ob3" },
];

const pacientesIniciais = [
  { nome: "Paulo", peso: 100, altura: 2.0, gordura: 10 },
  { nome: "João", peso: 80, altura: 1.72, gordura: 40 },
  { nome: "Erica", peso: 54, altura: 1.64, gordura: 14 },
  { nome: "Douglas", peso: 85, altura: 1.73, gordura: 24 },
  { nome: "Tatiana", peso: 46, altura: 1.55, gordura: 19 },
];

const tabela = document.querySelector("#tabela-pacientes");
const form = document.querySelector("#form-adiciona");
const listaErros = document.querySelector("#mensagens-erro");
const campoFiltro = document.querySelector("#filtrar-tabela");
const botaoBuscar = document.querySelector("#buscar-pacientes");
const erroAjax = document.querySelector("#erro-ajax");
const avisoVazio = document.querySelector("#vazio");
const toast = document.querySelector("#toast");
const previaValor = document.querySelector("#previa-valor");
const previaBadge = document.querySelector("#previa-badge");
const stat = (nome) => document.querySelector(`[data-stat="${nome}"]`);

const calcularImc = (peso, altura) => peso / (altura * altura);
const classificarImc = (imc) => FAIXAS_IMC.find((faixa) => imc < faixa.limite);
const formatar = (valor, casas = 2) => valor.toFixed(casas).replace(".", ",");

// aceita vírgula ou ponto; vazio vira NaN (e não 0)
const lerNumero = (texto) => {
  const limpo = String(texto).trim().replace(",", ".");
  return limpo === "" ? NaN : Number(limpo);
};

function validarPaciente({ nome, peso, altura, gordura }) {
  const erros = [];
  if (!nome || nome.length > 80) erros.push("Informe um nome de até 80 caracteres.");
  if (!Number.isFinite(peso) || peso <= 0 || peso > 635) erros.push("Peso inválido.");
  if (!Number.isFinite(altura) || altura <= 0 || altura > 2.99) erros.push("Altura inválida (use metros, ex.: 1,75).");
  if (!Number.isFinite(gordura) || gordura < 0 || gordura > 100) erros.push("Gordura deve estar entre 0 e 100.");
  return erros;
}

function criarCelula(texto, classe, rotulo) {
  const td = document.createElement("td");
  td.textContent = texto;
  td.className = classe;
  td.dataset.label = rotulo;
  return td;
}

function criarBadge(faixa) {
  const badge = document.createElement("span");
  badge.className = `badge badge--${faixa.classe}`;
  badge.textContent = faixa.rotulo;
  return badge;
}

function criarLinha({ nome, peso, altura, gordura }) {
  const imc = calcularImc(peso, altura);
  const faixa = classificarImc(imc);
  const tr = document.createElement("tr");
  tr.className = "paciente";
  tr.dataset.imc = imc;
  tr.dataset.classe = faixa.classe;

  const tdClassificacao = document.createElement("td");
  tdClassificacao.dataset.label = "Classificação";
  tdClassificacao.append(criarBadge(faixa));

  const botaoRemover = document.createElement("button");
  botaoRemover.type = "button";
  botaoRemover.className = "botao-remover";
  botaoRemover.textContent = "Remover";
  botaoRemover.setAttribute("aria-label", `Remover paciente ${nome}`);
  const tdAcoes = document.createElement("td");
  tdAcoes.append(botaoRemover);

  tr.append(
    criarCelula(nome, "info-nome", "Nome"),
    criarCelula(formatar(peso, 1), "info-peso", "Peso (kg)"),
    criarCelula(formatar(altura), "info-altura", "Altura (m)"),
    criarCelula(formatar(gordura, 1), "info-gordura", "Gordura (%)"),
    criarCelula(formatar(imc), "info-imc", "IMC"),
    tdClassificacao,
    tdAcoes,
  );
  return tr;
}

const nomeJaExiste = (nome) =>
  [...tabela.querySelectorAll(".info-nome")].some(
    (td) => td.textContent.toLowerCase() === nome.toLowerCase(),
  );

// números do resumo contam de forma animada
function animarNumero(elemento, destino, casas = 0, sufixo = "") {
  const inicio = Number(elemento.dataset.valor || 0);
  elemento.dataset.valor = destino;
  if (reduzMovimento || inicio === destino) {
    elemento.textContent = formatar(destino, casas) + sufixo;
    return;
  }
  const duracao = 600;
  const t0 = performance.now();
  const passo = (agora) => {
    const progresso = Math.min((agora - t0) / duracao, 1);
    const suave = 1 - (1 - progresso) ** 3;
    elemento.textContent = formatar(inicio + (destino - inicio) * suave, casas) + sufixo;
    if (progresso < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

function atualizarResumo() {
  const linhas = [...tabela.querySelectorAll(".paciente:not(.saindo)")];
  const total = linhas.length;
  const imcMedio = total ? linhas.reduce((soma, l) => soma + Number(l.dataset.imc), 0) / total : 0;
  const normais = linhas.filter((l) => l.dataset.classe === "normal").length;
  animarNumero(stat("total"), total);
  animarNumero(stat("imc"), imcMedio, 1);
  animarNumero(stat("normal"), total ? (normais / total) * 100 : 0, 0, "%");
}

function atualizarVazio() {
  const visiveis = tabela.querySelectorAll(".paciente:not(.invisivel):not(.saindo)").length;
  avisoVazio.classList.toggle("invisivel", visiveis > 0);
}

let temporizadorToast;
function mostrarToast(mensagem) {
  toast.textContent = mensagem;
  toast.classList.add("mostrar");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.remove("mostrar"), TEMPO_TOAST_MS);
}

function adicionarPaciente(paciente) {
  tabela.append(criarLinha(paciente));
  atualizarResumo();
  atualizarVazio();
}

function mostrarErros(erros) {
  listaErros.replaceChildren(
    ...erros.map((mensagem) => {
      const li = document.createElement("li");
      li.textContent = mensagem;
      return li;
    }),
  );
  if (!erros.length) return;
  listaErros.classList.remove("tremer");
  void listaErros.offsetWidth; // reinicia a animação
  listaErros.classList.add("tremer");
}

// prévia do IMC enquanto digita
function atualizarPrevia() {
  const peso = lerNumero(form.elements.peso.value);
  const altura = lerNumero(form.elements.altura.value);
  const valido = peso > 0 && peso <= 635 && altura > 0 && altura <= 2.99;
  if (!valido) {
    previaValor.textContent = "--";
    previaBadge.className = "badge badge--neutro";
    previaBadge.textContent = "Preencha peso e altura";
    return;
  }
  const imc = calcularImc(peso, altura);
  const faixa = classificarImc(imc);
  previaValor.textContent = formatar(imc);
  previaBadge.className = `badge badge--${faixa.classe}`;
  previaBadge.textContent = faixa.rotulo;
}

form.elements.peso.addEventListener("input", atualizarPrevia);
form.elements.altura.addEventListener("input", atualizarPrevia);

form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const dados = new FormData(form);
  const paciente = {
    nome: String(dados.get("nome")).trim(),
    peso: lerNumero(dados.get("peso")),
    altura: lerNumero(dados.get("altura")),
    gordura: lerNumero(dados.get("gordura")),
  };

  const erros = validarPaciente(paciente);
  if (paciente.nome && nomeJaExiste(paciente.nome)) erros.push("Paciente já cadastrado.");
  mostrarErros(erros);
  if (erros.length) return;

  adicionarPaciente(paciente);
  mostrarToast(`${paciente.nome} adicionado(a)`);
  form.reset();
  atualizarPrevia();
  form.elements.nome.focus();
});

// closest("tr") evita remover o tbody inteiro
tabela.addEventListener("click", (evento) => {
  const botao = evento.target.closest(".botao-remover");
  if (!botao) return;
  const linha = botao.closest("tr");
  linha.classList.add("saindo");
  setTimeout(() => {
    linha.remove();
    atualizarResumo();
    atualizarVazio();
  }, TEMPO_SAIDA_MS);
});

// comparação por texto puro: sem RegExp, sem crash e sem ReDoS
campoFiltro.addEventListener("input", () => {
  const termo = campoFiltro.value.trim().toLowerCase();
  tabela.querySelectorAll(".paciente").forEach((linha) => {
    const nome = linha.querySelector(".info-nome").textContent.toLowerCase();
    linha.classList.toggle("invisivel", !nome.includes(termo));
  });
  atualizarVazio();
});

botaoBuscar.addEventListener("click", async () => {
  erroAjax.classList.add("invisivel");
  botaoBuscar.disabled = true;
  try {
    const resposta = await fetch(URL_PACIENTES);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const lista = await resposta.json();
    const novos = lista
      .map((p) => ({
        nome: String(p.nome).trim(),
        peso: Number(p.peso),
        altura: Number(p.altura),
        gordura: Number(p.gordura),
      }))
      .filter((p) => validarPaciente(p).length === 0 && !nomeJaExiste(p.nome));
    novos.forEach(adicionarPaciente);
    mostrarToast(novos.length ? `${novos.length} paciente(s) importado(s)` : "Nenhum paciente novo");
  } catch (erro) {
    console.error(erro);
    erroAjax.classList.remove("invisivel");
  } finally {
    botaoBuscar.disabled = false;
  }
});

// revela as seções ao rolar a página
const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add("visivel");
      observador.unobserve(entrada.target);
    });
  },
  { threshold: 0.12 },
);
document.querySelectorAll(".reveal").forEach((el) => observador.observe(el));

document.querySelector("#ano").textContent = new Date().getFullYear();
pacientesIniciais.forEach(adicionarPaciente);