const DEVELOPMENT_MODE = true;
const PORTAL_URL = 'https://ir-comercio-portal-zcan.onrender.com';
const API_URL = 'https://ordem-compra.onrender.com/api';

let ordens = [];
let currentMonth = new Date();
let editingId = null;
let itemCounter = 0;
let currentTab = 0;
let currentInfoTab = 0;
let isOnline = false;
let sessionToken = null;
let lastDataHash = '';
let fornecedoresCache = {};

const tabs = ['tab-geral', 'tab-fornecedor', 'tab-pedido', 'tab-entrega', 'tab-pagamento'];

console.log('🚀 Ordem de Compra iniciada');
console.log('📍 API URL:', API_URL);
console.log('🔧 Modo desenvolvimento:', DEVELOPMENT_MODE);

function toUpperCase(value) {
    return value ? String(value).toUpperCase() : '';
}

function setupUpperCaseInputs() {
    const textInputs = document.querySelectorAll('input[type="text"]:not([readonly]), textarea');
    textInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            const start = this.selectionStart;
            const end = this.selectionEnd;
            this.value = toUpperCase(this.value);
            this.setSelectionRange(start, end);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (DEVELOPMENT_MODE) {
        console.log('⚠️ MODO DESENVOLVIMENTO ATIVADO');
        sessionToken = 'dev-mode';
        inicializarApp();
    } else {
        verificarAutenticacao();
    }
});

function verificarAutenticacao() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('sessionToken');

    if (tokenFromUrl) {
        sessionToken = tokenFromUrl;
        sessionStorage.setItem('ordemCompraSession', tokenFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        sessionToken = sessionStorage.getItem('ordemCompraSession');
    }

    if (!sessionToken) {
        mostrarTelaAcessoNegado();
        return;
    }

    inicializarApp();
}

function mostrarTelaAcessoNegado(mensagem = 'NAO AUTORIZADO') {
    document.body.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: var(--bg-primary); color: var(--text-primary); text-align: center; padding: 2rem;">
            <h1 style="font-size: 2.2rem; margin-bottom: 1rem;">${mensagem}</h1>
            <p style="color: var(--text-secondary); margin-bottom: 2rem;">Somente usuarios autenticados podem acessar esta area.</p>
            <a href="${PORTAL_URL}" style="display: inline-block; background: var(--btn-register); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Ir para o Portal</a>
        </div>
    `;
}

function inicializarApp() {
    updateDisplay();
    checkServerStatus();
    setInterval(checkServerStatus, 15000);
    startPolling();
}

async function checkServerStatus() {
    try {
        const headers = {
            'Accept': 'application/json'
        };

        if (!DEVELOPMENT_MODE && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }

        const response = await fetch(`${API_URL}/ordens`, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });

        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('ordemCompraSession');
            mostrarTelaAcessoNegado('Sua sessao expirou');
            return false;
        }

        const wasOffline = !isOnline;
        isOnline = response.ok;

        if (wasOffline && isOnline) {
            console.log('✅ SERVIDOR ONLINE');
            await loadOrdens();
        }

        updateConnectionStatus();
        return isOnline;
    } catch (error) {
        console.error('❌ Erro ao verificar servidor:', error);
        isOnline = false;
        updateConnectionStatus();
        return false;
    }
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.className = isOnline ? 'connection-status online' : 'connection-status offline';
    }
}

function startPolling() {
    loadOrdens();
    setInterval(() => {
        if (isOnline) loadOrdens();
    }, 10000);
}

async function loadOrdens() {
    if (!isOnline && !DEVELOPMENT_MODE) return;

    try {
        const headers = {
            'Accept': 'application/json'
        };

        if (!DEVELOPMENT_MODE && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }

        const response = await fetch(`${API_URL}/ordens`, {
            method: 'GET',
            headers: headers,
            mode: 'cors'
        });

        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('ordemCompraSession');
            mostrarTelaAcessoNegado('Sua sessao expirou');
            return;
        }

        if (!response.ok) {
            console.error('❌ Erro ao carregar ordens:', response.status);
            return;
        }

        const data = await response.json();
        ordens = data;

        atualizarCacheFornecedores(data);

        const newHash = JSON.stringify(ordens.map(o => o.id));
        if (newHash !== lastDataHash) {
            lastDataHash = newHash;
            updateDisplay();
        }
    } catch (error) {
        console.error('❌ Erro ao carregar:', error);
    }
}

async function syncData() {
    console.log('🔄 Iniciando sincronizacao...');

    if (!isOnline && !DEVELOPMENT_MODE) {
        showToast('Servidor offline. Nao e possivel sincronizar.', 'error');
        console.log('❌ Sincronizacao cancelada: servidor offline');
        return;
    }

    try {
        showToast('Sincronizando dados...', 'info');

        const headers = {
            'Accept': 'application/json'
        };

        if (!DEVELOPMENT_MODE && sessionToken) {
            headers['X-Session-Token'] = sessionToken;
        }

        const response = await fetch(`${API_URL}/ordens`, {
            method: 'GET',
            headers: headers,
            mode: 'cors',
            cache: 'no-cache'
        });

        if (!DEVELOPMENT_MODE && response.status === 401) {
            sessionStorage.removeItem('ordemCompraSession');
            mostrarTelaAcessoNegado('Sua sessao expirou');
            return;
        }

        if (!response.ok) {
            throw new Error(`Erro ao sincronizar: ${response.status}`);
        }

        const data = await response.json();
        ordens = data;

        atualizarCacheFornecedores(data);

        lastDataHash = JSON.stringify(ordens.map(o => o.id));
        updateDisplay();

        console.log(`✅ Sincronizacao concluida: ${ordens.length} ordens carregadas`);
        showToast(`Dados sincronizados com sucesso! ${ordens.length} ordens encontradas`, 'success');

    } catch (error) {
        console.error('❌ Erro na sincronizacao:', error);
        showToast('Erro ao sincronizar dados. Tente novamente.', 'error');
    }
}

function atualizarCacheFornecedores(ordens) {
    fornecedoresCache = {};

    ordens.forEach(ordem => {
        const razaoSocial = toUpperCase(ordem.razao_social || ordem.razaoSocial || '').trim();

        if (razaoSocial && !fornecedoresCache[razaoSocial]) {
            fornecedoresCache[razaoSocial] = {
                razaoSocial: toUpperCase(ordem.razao_social || ordem.razaoSocial),
                nomeFantasia: toUpperCase(ordem.nome_fantasia || ordem.nomeFantasia || ''),
                cnpj: ordem.cnpj || '',
                enderecoFornecedor: toUpperCase(ordem.endereco_fornecedor || ordem.enderecoFornecedor || ''),
                site: ordem.site || '',
                contato: toUpperCase(ordem.contato || ''),
                telefone: ordem.telefone || '',
                email: ordem.email || ''
            };
        }
    });

    console.log(`📋 Cache de fornecedores atualizado: ${Object.keys(fornecedoresCache).length} fornecedores`);
}

function getNextOrderNumber() {
    const existingNumbers = ordens
        .map(o => parseInt(o.numero_ordem || o.numeroOrdem))
        .filter(n => !isNaN(n));

    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1250;
    return nextNum.toString();
}

function updateDashboard() {
    const monthOrdens = getOrdensForCurrentMonth();
    const totalFechadas = monthOrdens.filter(o => o.status === 'fechada').length;
    const totalAbertas = monthOrdens.filter(o => o.status === 'aberta').length;

    const numeros = ordens
        .map(o => parseInt(o.numero_ordem || o.numeroOrdem))
        .filter(n => !isNaN(n));
    
    const ultimoNumero = numeros.length > 0 ? Math.max(...numeros) : 0;
    
    let valorTotalMes = 0;
    monthOrdens.forEach(ordem => {
        valorTotalMes += parseCurrency(ordem.valor_total || ordem.valorTotal);
    });

    document.getElementById('totalOrdens').textContent = ultimoNumero;
    document.getElementById('totalFechadas').textContent = totalFechadas;
    document.getElementById('totalAbertas').textContent = totalAbertas;
    document.getElementById('valorTotal').textContent = formatCurrency(valorTotalMes, 2);

    const cardAbertas = document.getElementById('cardAbertas');
    if (!cardAbertas) return;

    let pulseBadge = cardAbertas.querySelector('.pulse-badge');

    if (totalAbertas > 0) {
        cardAbertas.classList.add('has-alert');

        if (!pulseBadge) {
            pulseBadge = document.createElement('div');
            pulseBadge.className = 'pulse-badge';
            cardAbertas.appendChild(pulseBadge);
        }
        pulseBadge.textContent = totalAbertas;
        pulseBadge.style.display = 'flex';
    } else {
        cardAbertas.classList.remove('has-alert');
        if (pulseBadge) {
            pulseBadge.style.display = 'none';
        }
    }
}

function formatCurrency(value, decimals = 2) {
    const num = parseFloat(value) || 0;
    const formatted = num.toFixed(decimals);
    const [integerPart, decimalPart] = formatted.split('.');
    const integerFormatted = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `R$ ${integerFormatted},${decimalPart}`;
}

function parseCurrency(currencyString) {
    if (typeof currencyString === 'number') return currencyString;
    if (!currencyString) return 0;
    const cleaned = String(currencyString)
        .replace(/R\$\s?/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    return parseFloat(cleaned) || 0;
}

function showToast(message, type = 'success') {
    const oldMessages = document.querySelectorAll('.floating-message');
    oldMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement('div');
    messageDiv.className = `floating-message ${type}`;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

function getOrdensForCurrentMonth() {
    return ordens.filter(ordem => {
        const ordemDate = new Date((ordem.data_ordem || ordem.dataOrdem) + 'T00:00:00');
        return ordemDate.getMonth() === currentMonth.getMonth() &&
               ordemDate.getFullYear() === currentMonth.getFullYear();
    });
}

function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function changeMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    updateDisplay();
}

function updateMonthDisplay() {
    const months = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthName = months[currentMonth.getMonth()];
    const year = currentMonth.getFullYear();
    document.getElementById('currentMonth').textContent = `${monthName} ${year}`;
}

function updateDisplay() {
    updateMonthDisplay();
    updateDashboard();
    updateTable();
    updateResponsaveisFilter();
}

function updateTable() {
    const container = document.getElementById('ordensContainer');
    let filteredOrdens = getOrdensForCurrentMonth();

    const search = document.getElementById('search').value.toLowerCase();
    const filterResp = document.getElementById('filterResponsavel').value;
    const filterStatus = document.getElementById('filterStatus').value;

    if (search) {
        filteredOrdens = filteredOrdens.filter(o => 
            (o.numero_ordem || o.numeroOrdem || '').toLowerCase().includes(search) ||
            (o.razao_social || o.razaoSocial || '').toLowerCase().includes(search) ||
            (o.responsavel || '').toLowerCase().includes(search)
        );
    }

    if (filterResp) {
        filteredOrdens = filteredOrdens.filter(o => o.responsavel === filterResp);
    }

    if (filterStatus) {
        filteredOrdens = filteredOrdens.filter(o => o.status === filterStatus);
    }

    if (filteredOrdens.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem;">
                    Nenhuma ordem encontrada
                </td>
            </tr>
        `;
        return;
    }

    filteredOrdens.sort((a, b) => {
        const numA = parseInt(a.numero_ordem || a.numeroOrdem);
        const numB = parseInt(b.numero_ordem || b.numeroOrdem);
        return numA - numB;
    });

    container.innerHTML = filteredOrdens.map(ordem => `
        <tr class="${ordem.status === 'fechada' ? 'row-fechada' : ''}">
            <td style="text-align: center; padding: 8px;">
                <div class="checkbox-wrapper">
                    <input 
                        type="checkbox" 
                        id="check-${ordem.id}"
                        ${ordem.status === 'fechada' ? 'checked' : ''}
                        onchange="toggleStatus('${ordem.id}')"
                        class="styled-checkbox"
                    >
                    <label for="check-${ordem.id}" class="checkbox-label-styled"></label>
                </div>
            </td>
            <td><strong>${ordem.numero_ordem || ordem.numeroOrdem}</strong></td>
            <td>${toUpperCase(ordem.responsavel)}</td>
            <td>${toUpperCase(ordem.razao_social || ordem.razaoSocial)}</td>
            <td style="white-space: nowrap;">${formatDate(ordem.data_ordem || ordem.dataOrdem)}</td>
            <td><strong>${ordem.valor_total || ordem.valorTotal}</strong></td>
            <td>
                <span class="badge ${ordem.status}">${ordem.status.toUpperCase()}</span>
            </td>
            <td class="actions-cell">
                <div class="actions">
                    <button onclick="viewOrdem('${ordem.id}')" class="action-btn view" title="Ver detalhes">Ver</button>
                    <button onclick="editOrdem('${ordem.id}')" class="action-btn edit" title="Editar">Editar</button>
                    <button onclick="generatePDFFromTable('${ordem.id}')" class="action-btn success" title="Gerar PDF">PDF</button>
                    <button onclick="deleteOrdem('${ordem.id}')" class="action-btn delete" title="Excluir">Excluir</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateResponsaveisFilter() {
    const responsaveis = new Set();
    ordens.forEach(o => {
        if (o.responsavel?.trim()) {
            responsaveis.add(o.responsavel.trim());
        }
    });

    const select = document.getElementById('filterResponsavel');
    if (select) {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Todos</option>';
        Array.from(responsaveis).sort().forEach(r => {
            const option = document.createElement('option');
            option.value = r;
            option.textContent = toUpperCase(r);
            select.appendChild(option);
        });
        select.value = currentValue;
    }
}

function filterOrdens() {
    updateTable();
}

console.log('✅ Script carregado com sucesso!');
