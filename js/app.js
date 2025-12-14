/* =========================
   CONFIG
========================= */
const BASE_URL = "https://loteriascaixa-api.herokuapp.com/api";
const GUIDI_URL = "https://api.guidi.dev.br/loteria";           
const LOTTOLOOKUP_URL = "https://lottolookup.com.br/api"; 
const CAIXA_URL = "https://servicebus2.caixa.gov.br/portaldeloterias/api";

/* =========================
   UTIL
========================= */
function formatCurrency(valor) {
  return typeof valor === "number"
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
    : valor;
}

function resultadoTexto(acumulou) {
  return acumulou ? 'Não houve ganhadores' : 'Houve ganhadores';
}

function formatarNumeros(numeros, tipo) {
  if (!Array.isArray(numeros)) return '';
  let html = '';
  numeros.forEach((num, index) => {
    html += num.toString().padStart(2, '0') + ' ';
    if (tipo === 'Lotofácil' && (index + 1) % 5 === 0) html += '<br>';
  });
  return html;
}

// Função para converter datas "dd/MM/yyyy" em Date
function parseDataPtBr(dataStr) {
  if (!dataStr) return null;
  const [dia, mes, ano] = dataStr.split('/');
  if (!dia || !mes || !ano) return null;
  return new Date(`${ano}-${mes}-${dia}T00:00:00`);
}

function formatarData(data) {
  if (!data) return '—';
  const d = (data instanceof Date) ? data : new Date(data);
  if (isNaN(d)) return data;
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

/* =========================
   BUSCA ÚLTIMO SORTEIO - 4 APIs
========================= */
async function buscarUltimoSorteioAtualizado(tipo) {
  const urls = {
    loteriascaixa: `${BASE_URL}/${tipo}`,
    guidi: `${GUIDI_URL}/${tipo}/ultimo`,
    lottoLookup: `${LOTTOLOOKUP_URL}/${tipo}/latest`,
    caixa: `${CAIXA_URL}/${tipo}`
  };

  const resultados = [];

  for (const key in urls) {
    try {
      const res = await fetch(urls[key]);
      if (!res.ok) continue;
      const data = await res.json();

      let sorteio = null;

      switch (key) {
        case 'loteriascaixa':
          if (!data[0]) break;
          sorteio = {
            concurso: data[0].concurso,
            dezenas: (data[0].dezenas || []).map(n => parseInt(n)),
            data: parseDataPtBr(data[0].data),
            acumulou: data[0].acumulou,
            valorEstimado: data[0].valorEstimadoProximoConcurso
          };
          break;
        case 'guidi':
          sorteio = {
            concurso: data.numero || data.concurso,
            dezenas: (data.listaDezenas || data.dezenas || []).map(n => parseInt(n)),
            data: parseDataPtBr(data.dataApuracao || data.data),
            acumulou: data.acumulado ?? data.acumulou,
            valorEstimado: data.valorEstimadoProximoConcurso || data.valorEstimado
          };
          break;
        case 'lottoLookup':
          sorteio = {
            concurso: data.numero || data.drawNumber || data.concurso,
            dezenas: (data.listaDezenas || data.numbers || []).map(n => parseInt(n)),
            data: parseDataPtBr(data.dataApuracao || data.drawDate || data.data),
            acumulou: data.acumulado ?? false,
            valorEstimado: data.valorEstimadoProximoConcurso || data.valorEstimado || null
          };
          break;
        case 'caixa':
          sorteio = {
            concurso: data.numeroConcurso || data.numero,
            dezenas: (data.listaDezenas || []).map(n => parseInt(n)),
            data: parseDataPtBr(data.dataApuracao),
            acumulou: data.acumulado,
            valorEstimado: data.valorEstimadoProximoConcurso || data.valorEstimativa || null
          };
          break;
      }

      if (sorteio) resultados.push(sorteio);
    } catch (e) {
      console.warn(`Erro ao consultar ${key}:`, e);
    }
  }

  resultados.sort((a, b) => {
    if ((b.concurso ?? 0) !== (a.concurso ?? 0)) return (b.concurso ?? 0) - (a.concurso ?? 0);
    return (b.data ?? 0) - (a.data ?? 0);
  });

  const ultimo = resultados[0];

  if (ultimo && !ultimo.valorEstimado) {
    const caixaRes = resultados.find(r => r.valorEstimado);
    ultimo.valorEstimado = caixaRes?.valorEstimado ?? "Em breve";
  }

  return ultimo;
}

/* =========================
   INDEX
========================= */
async function carregarIndex() {
  const loading = document.getElementById("loading");
  const conteudo = document.getElementById("conteudo");

  try {
    const [mega, loto] = await Promise.all([
      buscarUltimoSorteioAtualizado("megasena"),
      buscarUltimoSorteioAtualizado("lotofacil")
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
  if (!data) {
    document.getElementById(id).innerHTML = `<h2>${titulo}</h2><p>❌ Dados indisponíveis</p>`;
    return;
  }

  const concurso = data.concurso ?? "—";
  const date = formatarData(data.data);
  const dezenas = data.dezenas ?? [];
  const premio = data.valorEstimado ?? "Em breve";

  document.getElementById(id).innerHTML = `
    <h2>${titulo}</h2>
    <p><b>Concurso:</b> ${concurso}</p>
    <p><b>Data:</b> ${date}</p>
    <p><b>Prêmio estimado:</b> ${formatCurrency(premio)}</p>
    <p><b>Resultado:</b> ${resultadoTexto(data.acumulou)}</p>
    <div class="numeros">${formatarNumeros(dezenas, titulo)}</div>
  `;
}

/* =========================
   HISTÓRICO
========================= */
function salvarHistorico(tipo, numeros) {
  const historico = JSON.parse(localStorage.getItem('historico')) || [];
  historico.unshift({ tipo, numeros, data: new Date().toLocaleString() });
  localStorage.setItem('historico', JSON.stringify(historico.slice(0, 50)));
}

function carregarHistorico() {
  const container = document.getElementById('historico');
  if (!container) return;

  const historico = JSON.parse(localStorage.getItem('historico')) || [];
  if (historico.length === 0) { container.innerHTML = '<p>Nenhum sorteio salvo.</p>'; return; }

  container.innerHTML = historico.map(item => `
    <div class="card">
      <h3>${item.tipo}</h3>
      <div class="numeros">${formatarNumeros(item.numeros, item.tipo)}</div>
      <small>${item.data}</small>
    </div>
  `).join('');
}

function limparHistorico() {
  localStorage.removeItem('historico');
  carregarHistorico();
}

/* =========================
   GERADOR DE NÚMEROS
========================= */
function calcularFrequencias(historico, max) {
  const freq = Array(max).fill(0);
  historico.forEach(s => s.dezenas?.forEach(n => freq[n - 1]++));
  return freq;
}

function gerarNumeros(historico, qtd, max) {
  const freq = calcularFrequencias(historico, max);
  const selecionados = [];

  while (selecionados.length < qtd) {
    const pesos = freq.map((f, i) => selecionados.includes(i + 1) ? 0 : f + 1);
    let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pesos.length; i++) {
      r -= pesos[i];
      if (r <= 0) { selecionados.push(i + 1); break; }
    }
  }
  return selecionados.sort((a, b) => a - b);
}

async function gerarMega() {
  const hist = JSON.parse(localStorage.getItem('historico')) || [];
  const numeros = gerarNumeros(hist.filter(h => h.tipo === "Mega-Sena"), 6, 60);
  document.getElementById("megaResultado").innerText = numeros.join(" - ");
  salvarHistorico("Mega-Sena", numeros);
}

async function gerarLoto() {
  const hist = JSON.parse(localStorage.getItem('historico')) || [];
  const numeros = gerarNumeros(hist.filter(h => h.tipo === "Lotofácil"), 15, 25);
  document.getElementById("lotoResultado").innerText = numeros.join(" - ");
  salvarHistorico("Lotofácil", numeros);
}

/* =========================
   NAVEGAÇÃO
========================= */
function irParaGerador() { window.location.href = "gerador.html"; }
function irParaHistorico() { window.location.href = "historico.html"; }
function voltar() { window.location.href = "index.html"; }

/* =========================
   JOGOS APOSTADOS
========================= */
function salvarJogo(tipo) {
  const resultadoEl = tipo === 'Mega-Sena'
    ? document.getElementById('megaResultado')
    : document.getElementById('lotoResultado');

  if (!resultadoEl || resultadoEl.innerText.trim() === '') {
    alert('Gere os números antes!');
    return;
  }

  const numeros = resultadoEl.innerText.replace(/\n/g,' ').split(/[\s-]+/).map(n => parseInt(n)).filter(n => !isNaN(n));
  const jogos = JSON.parse(localStorage.getItem('jogos_apostados')) || [];
  jogos.unshift({ tipo, dezenas: numeros, data: new Date().toLocaleString(), concurso: null });
  localStorage.setItem('jogos_apostados', JSON.stringify(jogos));
  alert('✅ Jogo salvo para conferência!');
}

async function buscarUltimoSorteio(tipo) {
  return await buscarUltimoSorteioAtualizado(tipo === 'Mega-Sena' ? 'megasena' : 'lotofacil');
}

function contarAcertos(jogo, sorteio) {
  return jogo.dezenas.filter(n => sorteio.includes(n));
}

async function conferirResultados() {
  const container = document.getElementById('resultadoConferencia');
  const jogos = JSON.parse(localStorage.getItem('jogos_apostados')) || [];
  if (jogos.length === 0) { container.innerHTML = '<p>Nenhum jogo apostado.</p>'; return; }

  container.innerHTML = '⏳ Conferindo resultados...';

  const sorteioMega = await buscarUltimoSorteio('Mega-Sena');
  const sorteioLoto = await buscarUltimoSorteio('Lotofácil');

  container.innerHTML = jogos.map(jogo => {
    const sorteio = jogo.tipo === 'Mega-Sena' ? sorteioMega : sorteioLoto;
    const acertos = contarAcertos(jogo, sorteio.dezenas);

    return `
      <div class="card">
        <h3>${jogo.tipo}</h3>
        <p><b>Concurso:</b> ${sorteio.concurso}</p>
        <p><b>Seu jogo:</b> ${jogo.dezenas.join(' - ')}</p>
        <p><b>Números sorteados:</b> ${sorteio.dezenas.join(' - ')}</p>
        <p><b>Acertos:</b> ${acertos.length}</p>
        <p style="color: green;">${acertos.join(' - ') || 'Nenhum'}</p>
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

/* =========================
   GRAFICOS
========================= */
function criarGrafico(canvasId, labels, dados, titulo) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: titulo, data: dados, backgroundColor: '#4f46e5' }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

async function carregarGraficos() {
  try {
    const historicoMega = await fetchHistoricoAPI('megasena');
    const freqMega = calcularFrequenciaAPI(historicoMega, 60);
    criarGrafico('graficoMega', Array.from({ length: 60 }, (_, i) => i + 1), freqMega, 'Frequência Mega-Sena (Histórico Oficial)');

    const historicoLoto = await fetchHistoricoAPI('lotofacil');
    const freqLoto = calcularFrequenciaAPI(historicoLoto, 25);
    criarGrafico('graficoLoto', Array.from({ length: 25 }, (_, i) => i + 1), freqLoto, 'Frequência Lotofácil (Histórico Oficial)');

  } catch (e) {
    console.error(e);
    alert('Erro ao carregar gráficos da API');
  }
}

async function fetchHistoricoAPI(tipo) {
  const res = await fetch(`${BASE_URL}/${tipo}`);
  if (!res.ok) throw new Error('Erro ao buscar histórico da API');
  return await res.json();
}

function calcularFrequenciaAPI(sorteios, max) {
  const freq = Array(max).fill(0);
  sorteios.forEach(sorteio => sorteio.dezenas?.forEach(n => freq[n - 1]++));
  return freq;
}

/* =========================
   TEMA CLARO / ESCURO
========================= */
const toggle = document.getElementById('toggleTema');
function aplicarTema(tema) {
  document.body.classList.toggle('dark', tema === 'dark');
  if(toggle) toggle.textContent = tema === 'dark' ? '☀️' : '🌙';
}
function alternarTema() {
  const temaAtual = localStorage.getItem('tema') === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tema', temaAtual);
  aplicarTema(temaAtual);
}

/* =========================
   AUTO INIT
========================= */
document.addEventListener('DOMContentLoaded', () => {
  const temaSalvo = localStorage.getItem('tema') || 'light';
  aplicarTema(temaSalvo);
  if(toggle) toggle.addEventListener('click', alternarTema);

  if (document.getElementById("loading")) carregarIndex();
  if (document.getElementById("historico")) carregarHistorico();
  if (document.getElementById("graficoMega")) carregarGraficos();
});
