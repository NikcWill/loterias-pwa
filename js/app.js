const BASE_URL = "https://loteriascaixa-api.herokuapp.com/api";

/* =========================
   UTIL
========================= */
function formatCurrency(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

function resultadoTexto(acumulou) {
  return acumulou ? 'Não houve ganhadores' : 'Houve ganhadores';
}

function formatarNumeros(numeros, tipo) {
  if (!Array.isArray(numeros)) return '';

  let html = '';
  numeros.forEach((num, index) => {
    html += num.toString().padStart(2, '0') + ' ';

    if (tipo === 'Lotofácil' && (index + 1) % 5 === 0) {
      html += '<br>';
    }
  });

  return html;
}

/* =========================
   API
========================= */
async function fetchUltimo(tipo) {
  const res = await fetch(`${BASE_URL}/${tipo}`);
  const data = await res.json();
  return data[0];
}

async function fetchHistorico(tipo) {
  const res = await fetch(`${BASE_URL}/${tipo}`);
  return await res.json();
}

/* =========================
   INDEX
========================= */
async function carregarIndex() {
  const loading = document.getElementById("loading");
  const conteudo = document.getElementById("conteudo");

  try {
    const [mega, loto] = await Promise.all([
      fetchUltimo("megasena"),
      fetchUltimo("lotofacil")
    ]);

    renderSorteio("Mega-Sena", mega, "mega");
    renderSorteio("Lotofácil", loto, "loto");

    salvarHistorico("Mega-Sena", mega.dezenas);
    salvarHistorico("Lotofácil", loto.dezenas);

    loading.style.display = "none";
    conteudo.classList.remove("hidden");

  } catch (e) {
    loading.innerText = "❌ Erro ao carregar dados";
    console.error(e);
  }
}

function renderSorteio(titulo, data, id) {
  document.getElementById(id).innerHTML = `
    <h2>${titulo}</h2>
    <p><b>Concurso:</b> ${data.concurso}</p>
    <p><b>Data:</b> ${data.data}</p>
    <p><b>Prêmio estimado:</b> ${formatCurrency(data.valorEstimadoProximoConcurso)}</p>
    <p><b>Resultado:</b> ${resultadoTexto(data.acumulou)}</p>
    <div class="numeros">${formatarNumeros(data.dezenas, titulo)}</div>
  `;
}

/* =========================
   HISTÓRICO (LocalStorage)
========================= */
function salvarHistorico(tipo, numeros) {
  const historico = JSON.parse(localStorage.getItem('historico')) || [];

  historico.unshift({
    tipo,
    numeros,
    data: new Date().toLocaleString()
  });

  localStorage.setItem('historico', JSON.stringify(historico.slice(0, 50)));
}

function carregarHistorico() {
  const container = document.getElementById('historico');
  if (!container) return;

  const historico = JSON.parse(localStorage.getItem('historico')) || [];

  if (historico.length === 0) {
    container.innerHTML = '<p>Nenhum sorteio salvo.</p>';
    return;
  }

  container.innerHTML = historico.map(item => `
    <div class="card">
      <h3>${item.tipo}</h3>
      <div class="numeros">
        ${formatarNumeros(item.numeros, item.tipo)}
      </div>
      <small>${item.data}</small>
    </div>
  `).join('');
}

function limparHistorico() {
  localStorage.removeItem('historico');
  carregarHistorico();
}

/* =========================
   GERADOR
========================= */
async function gerarMega() {
  const hist = await fetchHistorico("megasena");
  const numeros = gerarNumeros(hist, 6, 60);

  document.getElementById("megaResultado").innerText =
    numeros.join(" - ");

  salvarHistorico("Mega-Sena", numeros);
}

async function gerarLoto() {
  const numeros = [];

  while (numeros.length < 15) {
    const n = Math.floor(Math.random() * 25) + 1;
    if (!numeros.includes(n)) numeros.push(n);
  }

  numeros.sort((a, b) => a - b);

  document.getElementById('lotoResultado').innerHTML =
    formatarNumeros(numeros, 'Lotofácil');

  salvarHistorico("Lotofácil", numeros);
}

function calcularFrequencias(historico, max) {
  const freq = Array(max).fill(0);
  historico.forEach(s => s.dezenas.forEach(n => freq[n - 1]++));
  return freq;
}

function gerarNumeros(historico, qtd, max) {
  const freq = calcularFrequencias(historico, max);
  const selecionados = [];

  while (selecionados.length < qtd) {
    const pesos = freq.map((f, i) =>
      selecionados.includes(i + 1) ? 0 : f + 1
    );

    let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pesos.length; i++) {
      r -= pesos[i];
      if (r <= 0) {
        selecionados.push(i + 1);
        break;
      }
    }
  }
  return selecionados.sort((a, b) => a - b);
}

/* =========================
   NAVEGAÇÃO
========================= */
function irParaGerador() {
  window.location.href = "gerador.html";
}

function irParaHistorico() {
  window.location.href = "historico.html";
}

function voltar() {
  window.location.href = "index.html";
}

/* =========================
   AUTO INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("loading")) carregarIndex();
  if (document.getElementById("historico")) carregarHistorico();
});


function calcularFrequenciaPorTipo(tipo, max) {
  const historico = JSON.parse(localStorage.getItem('historico')) || [];
  const freq = Array(max).fill(0);

  historico
    .filter(item => item.tipo === tipo)
    .forEach(item => {
      item.numeros.forEach(n => {
        freq[n - 1]++;
      });
    });

  return freq;
}

function criarGrafico(canvasId, labels, dados, titulo) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: titulo,
        data: dados,
        backgroundColor: '#4f46e5'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}


async function carregarGraficos() {
  try {
    // Mega-Sena
    const historicoMega = await fetchHistoricoAPI('megasena');
    const freqMega = calcularFrequenciaAPI(historicoMega, 60);

    criarGrafico(
      'graficoMega',
      Array.from({ length: 60 }, (_, i) => i + 1),
      freqMega,
      'Frequência Mega-Sena (Histórico Oficial)'
    );

    // Lotofácil
    const historicoLoto = await fetchHistoricoAPI('lotofacil');
    const freqLoto = calcularFrequenciaAPI(historicoLoto, 25);

    criarGrafico(
      'graficoLoto',
      Array.from({ length: 25 }, (_, i) => i + 1),
      freqLoto,
      'Frequência Lotofácil (Histórico Oficial)'
    );

  } catch (e) {
    console.error(e);
    alert('Erro ao carregar gráficos da API');
  }
}


document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("loading")) carregarIndex();
  if (document.getElementById("historico")) carregarHistorico();
  if (document.getElementById("graficoMega")) carregarGraficos();
});

async function fetchHistoricoAPI(tipo) {
  const res = await fetch(`https://loteriascaixa-api.herokuapp.com/api/${tipo}`);
  if (!res.ok) throw new Error('Erro ao buscar histórico da API');
  return await res.json();
}

function calcularFrequenciaAPI(sorteios, max) {
  const freq = Array(max).fill(0);

  sorteios.forEach(sorteio => {
    if (!sorteio.dezenas) return;

    sorteio.dezenas.forEach(n => {
      freq[n - 1]++;
    });
  });

  return freq;
}

const toggle = document.getElementById('toggleTema');

if (toggle) {
  toggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    toggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
  });
}

/* =========================
   TEMA (CLARO / ESCURO)
========================= */

function aplicarTema(tema) {
  document.body.classList.toggle('dark', tema === 'dark');

  const botao = document.getElementById('toggleTema');
  if (botao) {
    botao.textContent = tema === 'dark' ? '☀️' : '🌙';
  }
}

function alternarTema() {
  const temaAtual = localStorage.getItem('tema') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tema', temaAtual);
  aplicarTema(temaAtual);
}

// 🔹 Aplica o tema salvo ao carregar qualquer página
document.addEventListener('DOMContentLoaded', () => {
  const temaSalvo = localStorage.getItem('tema') || 'light';
  aplicarTema(temaSalvo);

  const botao = document.getElementById('toggleTema');
  if (botao) {
    botao.addEventListener('click', alternarTema);
  }
});

function salvarJogo(tipo) {
  const resultadoEl =
    tipo === 'Mega-Sena'
      ? document.getElementById('megaResultado')
      : document.getElementById('lotoResultado');

  if (!resultadoEl || resultadoEl.innerText.trim() === '') {
    alert('Gere os números antes!');
    return;
  }

  const numeros = resultadoEl.innerText
    .replace(/\n/g, ' ')
    .split(/[\s-]+/)
    .map(n => parseInt(n))
    .filter(n => !isNaN(n));

  const jogos = JSON.parse(localStorage.getItem('jogos_apostados')) || [];

  jogos.unshift({
    tipo,
    dezenas: numeros,
    data: new Date().toLocaleString(),
    concurso: null
  });

  localStorage.setItem('jogos_apostados', JSON.stringify(jogos));

  alert('✅ Jogo salvo para conferência!');
}
async function buscarUltimoSorteio(tipo) {
  const endpoint =
    tipo === 'Mega-Sena'
      ? 'megasena/latest'
      : 'lotofacil/latest';

  const res = await fetch(`${BASE_URL}/${endpoint}`);
  const data = await res.json();

  return {
    concurso: data.concurso,
    dezenas: data.dezenas.map(n => parseInt(n))
  };
}
function contarAcertos(jogo, sorteio) {
  return jogo.dezenas.filter(n => sorteio.includes(n));
}
async function conferirResultados() {
  const container = document.getElementById('resultadoConferencia');
  const jogos = JSON.parse(localStorage.getItem('jogos_apostados')) || [];

  if (jogos.length === 0) {
    container.innerHTML = '<p>Nenhum jogo apostado.</p>';
    return;
  }

  container.innerHTML = '⏳ Conferindo resultados...';

  const sorteioMega = await buscarUltimoSorteio('Mega-Sena');
  const sorteioLoto = await buscarUltimoSorteio('Lotofácil');

  container.innerHTML = jogos.map(jogo => {
    const sorteio =
      jogo.tipo === 'Mega-Sena'
        ? sorteioMega
        : sorteioLoto;

    const acertos = contarAcertos(jogo, sorteio.dezenas);

    return `
      <div class="card">
        <h3>${jogo.tipo}</h3>
        <p><b>Concurso:</b> ${sorteio.concurso}</p>
        <p><b>Seu jogo:</b> ${jogo.dezenas.join(' - ')}</p>
        <p><b>Números sorteados:</b> ${sorteio.dezenas.join(' - ')}</p>
        <p><b>Acertos:</b> ${acertos.length}</p>
        <p style="color: green;">
          ${acertos.join(' - ') || 'Nenhum'}
        </p>
        <small>${jogo.data}</small>
      </div>
    `;
  }).join('');
}

function limparJogos() {
  if (confirm("Deseja apagar todos os jogos apostados?")) {
    localStorage.removeItem("jogos_apostados");
    document.getElementById("resultadoConferencia").innerHTML = "<p>Todos os jogos foram apagados.</p>";
  }
}
