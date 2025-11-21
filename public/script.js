// ============================================
// CONFIGURAÇÃO
// ============================================
let ordens = [];
let currentMonth = new Date();
let editingId = null;
let itemCounter = 0;
let currentTab = 0;
let isOnline = false;

const tabs = ['tab-geral', 'tab-fornecedor', 'tab-pedido', 'tab-entrega', 'tab-pagamento'];

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    updateDisplay();
    checkServerStatus();
    startRealtimeSync();
});

// ============================================
// CONEXÃO E STATUS
// ============================================
function startRealtimeSync() {
    setInterval(async () => {
        await checkServerStatus();
    }, 3000);
}

async function checkServerStatus() {
    try {
        const response = await fetch(window.location.origin, { 
            method: 'HEAD',
            cache: 'no-cache'
        });
        isOnline = response.ok;
    } catch (error) {
        isOnline = false;
    }
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        statusElement.className = isOnline ? 'connection-status online' : 'connection-status offline';
    }
}

// ============================================
// LOCAL STORAGE
// ============================================
function loadFromLocalStorage() {
    const stored = localStorage.getItem('ordens');
    if (stored) {
        try {
            ordens = JSON.parse(stored);
        } catch (e) {
            console.error('Erro ao carregar dados:', e);
            ordens = [];
        }
    }
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('ordens', JSON.stringify(ordens));
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
    }
}

// ============================================
// NAVEGAÇÃO DE MÊS
// ============================================
function changeMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    updateDisplay();
}

function updateMonthDisplay() {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const monthName = months[currentMonth.getMonth()];
    const year = currentMonth.getFullYear();
    const elem = document.getElementById('currentMonth');
    if (elem) {
        elem.textContent = `${monthName} ${year}`;
    }
}

// ============================================
// SISTEMA DE ABAS
// ============================================
function switchTab(tabId) {
    const tabIndex = tabs.indexOf(tabId);
    if (tabIndex !== -1) {
        currentTab = tabIndex;
        showTab(currentTab);
    }
}

function showTab(index) {
    const modal = document.getElementById('formModal');
    if (!modal) return;
    
    const tabButtons = modal.querySelectorAll('.tab-btn');
    const tabContents = modal.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    if (tabButtons[index]) tabButtons[index].classList.add('active');
    if (tabContents[index]) tabContents[index].classList.add('active');
    
    updateNavigationButtons();
}

function nextTab() {
    if (currentTab < tabs.length - 1) {
        currentTab++;
        showTab(currentTab);
    } else {
        handleSubmit(new Event('submit'));
    }
}

function previousTab() {
    if (currentTab > 0) {
        currentTab--;
        showTab(currentTab);
    }
}

function updateNavigationButtons() {
    const btnVoltar = document.getElementById('btnVoltar');
    const btnProximo = document.getElementById('btnProximo');
    
    if (!btnVoltar || !btnProximo) return;
    
    btnVoltar.style.display = currentTab === 0 ? 'none' : 'inline-flex';
    
    if (currentTab === tabs.length - 1) {
        btnProximo.textContent = editingId ? 'Atualizar Ordem' : 'Registrar Ordem';
        btnProximo.classList.remove('secondary');
        btnProximo.classList.add('save');
    } else {
        btnProximo.textContent = 'Próximo';
        btnProximo.classList.add('secondary');
        btnProximo.classList.remove('save');
    }
}

function switchInfoTab(tabId) {
    const modal = document.getElementById('infoModal');
    if (!modal) return;
    
    modal.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    const clickedBtn = window.event?.target?.closest('.tab-btn');
    if (clickedBtn) clickedBtn.classList.add('active');
    
    const targetContent = document.getElementById(tabId);
    if (targetContent) targetContent.classList.add('active');
}

// ============================================
// MODAL DE FORMULÁRIO
// ============================================
function openFormModal() {
    editingId = null;
    currentTab = 0;
    itemCounter = 0;
    
    const nextNumber = getNextOrderNumber();
    const today = new Date().toISOString().split('T')[0];
    
    const modalHTML = createFormModalHTML(nextNumber, today, null);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    addItem();
    updateNavigationButtons();
    
    setTimeout(() => {
        const input = document.getElementById('numeroOrdem');
        if (input) input.focus();
    }, 100);
}

function createFormModalHTML(nextNumber, today, ordem) {
    const isEdit = ordem !== null;
    const title = isEdit ? 'Editar Ordem de Compra' : 'Nova Ordem de Compra';
    
    return `
        <div class="modal-overlay" id="formModal" style="display: flex;">
            <div class="modal-content" style="max-width: 1200px;">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                </div>
                
                <div class="tabs-container">
                    <div class="tabs-nav">
                        <button type="button" class="tab-btn active" onclick="switchTab('tab-geral')">Geral</button>
                        <button type="button" class="tab-btn" onclick="switchTab('tab-fornecedor')">Fornecedor</button>
                        <button type="button" class="tab-btn" onclick="switchTab('tab-pedido')">Pedido</button>
                        <button type="button" class="tab-btn" onclick="switchTab('tab-entrega')">Entrega</button>
                        <button type="button" class="tab-btn" onclick="switchTab('tab-pagamento')">Pagamento</button>
                    </div>

                    <form id="ordemForm" onsubmit="return false;">
                        <input type="hidden" id="editId" value="${isEdit ? ordem.id : ''}">
                        
                        ${createTabGeral(nextNumber, today, ordem)}
                        ${createTabFornecedor(ordem)}
                        ${createTabPedido(ordem)}
                        ${createTabEntrega(ordem)}
                        ${createTabPagamento(ordem)}

                        <div class="modal-actions">
                            <button type="button" id="btnVoltar" onclick="previousTab()" class="secondary" style="display: none;">Voltar</button>
                            <button type="button" id="btnProximo" onclick="nextTab()" class="secondary">Próximo</button>
                            <button type="button" onclick="closeFormModal(true)" class="secondary">Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function createTabGeral(nextNumber, today, ordem) {
    return `
        <div class="tab-content active" id="tab-geral">
            <div class="form-grid">
                <div class="form-group">
                    <label for="numeroOrdem">Número da Ordem *</label>
                    <input type="text" id="numeroOrdem" value="${ordem ? ordem.numeroOrdem : nextNumber}" required>
                </div>
                <div class="form-group">
                    <label for="responsavel">Responsável *</label>
                    <input type="text" id="responsavel" value="${ordem ? ordem.responsavel : ''}" required>
                </div>
                <div class="form-group">
                    <label for="dataOrdem">Data da Ordem *</label>
                    <input type="date" id="dataOrdem" value="${ordem ? ordem.dataOrdem : today}" required>
                </div>
            </div>
        </div>
    `;
}

function createTabFornecedor(ordem) {
    return `
        <div class="tab-content" id="tab-fornecedor">
            <div class="form-grid">
                <div class="form-group">
                    <label for="razaoSocial">Razão Social *</label>
                    <input type="text" id="razaoSocial" value="${ordem ? ordem.razaoSocial : ''}" required>
                </div>
                <div class="form-group">
                    <label for="nomeFantasia">Nome Fantasia</label>
                    <input type="text" id="nomeFantasia" value="${ordem ? (ordem.nomeFantasia || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="cnpj">CNPJ *</label>
                    <input type="text" id="cnpj" value="${ordem ? ordem.cnpj : ''}" required>
                </div>
                <div class="form-group">
                    <label for="enderecoFornecedor">Endereço</label>
                    <input type="text" id="enderecoFornecedor" value="${ordem ? (ordem.enderecoFornecedor || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="site">Site</label>
                    <input type="text" id="site" value="${ordem ? (ordem.site || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="contato">Contato</label>
                    <input type="text" id="contato" value="${ordem ? (ordem.contato || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="telefone">Telefone</label>
                    <input type="text" id="telefone" value="${ordem ? (ordem.telefone || '') : ''}">
                </div>
                <div class="form-group">
                    <label for="email">E-mail</label>
                    <input type="email" id="email" value="${ordem ? (ordem.email || '') : ''}">
                </div>
            </div>
        </div>
    `;
}

function createTabPedido(ordem) {
    return `
        <div class="tab-content" id="tab-pedido">
            <button type="button" onclick="addItem()" class="success small" style="margin-bottom: 1rem;">+ Adicionar Item</button>
            <div style="overflow-x: auto;">
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;">Item</th>
                            <th style="min-width: 200px;">Especificação</th>
                            <th style="width: 80px;">QTD</th>
                            <th style="width: 80px;">Unid</th>
                            <th style="width: 100px;">Valor UN</th>
                            <th style="width: 100px;">IPI</th>
                            <th style="width: 100px;">ST</th>
                            <th style="width: 120px;">Total</th>
                            <th style="width: 80px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="itemsBody"></tbody>
                </table>
            </div>
            <div class="form-group" style="margin-top: 1rem;">
                <label for="valorTotalOrdem">Valor Total da Ordem</label>
                <input type="text" id="valorTotalOrdem" readonly value="${ordem ? ordem.valorTotal : 'R$ 0,00'}">
            </div>
            <div class="form-group">
                <label for="frete">Frete</label>
                <input type="text" id="frete" value="${ordem ? (ordem.frete || '') : ''}" placeholder="Ex: CIF, FOB">
            </div>
        </div>
    `;
}

function createTabEntrega(ordem) {
    return `
        <div class="tab-content" id="tab-entrega">
            <div class="form-grid">
                <div class="form-group">
                    <label for="localEntrega">Local de Entrega</label>
                    <input type="text" id="localEntrega" value="${ordem ? (ordem.localEntrega || '') : ''}" placeholder="Rua Tadorna nº 472, sala 2, Novo Horizonte - Serra/ES  |  CEP: 29.163-318">
                </div>
                <div class="form-group">
                    <label for="prazoEntrega">Prazo de Entrega</label>
                    <input type="text" id="prazoEntrega" value="${ordem ? (ordem.prazoEntrega || '') : ''}" placeholder="Ex: 10 dias úteis">
                </div>
                <div class="form-group">
                    <label for="transporte">Transporte</label>
                    <input type="text" id="transporte" value="${ordem ? (ordem.transporte || '') : ''}" placeholder="Ex: Por conta do fornecedor">
                </div>
            </div>
        </div>
    `;
}

function createTabPagamento(ordem) {
    return `
        <div class="tab-content" id="tab-pagamento">
            <div class="form-grid">
                <div class="form-group">
                    <label for="formaPagamento">Forma de Pagamento *</label>
                    <input type="text" id="formaPagamento" value="${ordem ? ordem.formaPagamento : ''}" required placeholder="Ex: Boleto, PIX, Cartão">
                </div>
                <div class="form-group">
                    <label for="prazoPagamento">Prazo de Pagamento *</label>
                    <input type="text" id="prazoPagamento" value="${ordem ? ordem.prazoPagamento : ''}" required placeholder="Ex: 30 dias">
                </div>
                <div class="form-group">
                    <label for="dadosBancarios">Dados Bancários</label>
                    <textarea id="dadosBancarios" rows="3">${ordem ? (ordem.dadosBancarios || '') : ''}</textarea>
                </div>
            </div>
        </div>
    `;
}

function closeFormModal(showCancelMessage = false) {
    const modal = document.getElementById('formModal');
    if (modal) {
        if (showCancelMessage) {
            showToast(editingId ? 'Atualização cancelada' : 'Registro cancelado', 'error');
        }
        modal.remove();
    }
}

// ============================================
// GESTÃO DE ITENS
// ============================================
function addItem() {
    itemCounter++;
    const tbody = document.getElementById('itemsBody');
    if (!tbody) return;
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td style="text-align: center;">${itemCounter}</td>
        <td>
            <textarea class="item-especificacao" placeholder="Descrição do item..." rows="2"></textarea>
        </td>
        <td>
            <input type="number" class="item-qtd" min="0" step="0.01" value="1" onchange="calculateItemTotal(this)">
        </td>
        <td>
            <input type="text" class="item-unid" value="UN" placeholder="UN">
        </td>
        <td>
            <input type="number" class="item-valor" min="0" step="0.01" value="0" onchange="calculateItemTotal(this)">
        </td>
        <td>
            <input type="text" class="item-ipi" placeholder="Ex: Isento">
        </td>
        <td>
            <input type="text" class="item-st" placeholder="Ex: Não incluído">
        </td>
        <td>
            <input type="text" class="item-total" readonly value="R$ 0,00">
        </td>
        <td class="item-actions">
            <button type="button" class="danger small" onclick="removeItem(this)">Excluir</button>
        </td>
    `;
    tbody.appendChild(row);
}

function removeItem(btn) {
    const row = btn.closest('tr');
    if (row) {
        row.remove();
        recalculateOrderTotal();
        renumberItems();
    }
}

function renumberItems() {
    const rows = document.querySelectorAll('#itemsBody tr');
    rows.forEach((row, index) => {
        if (row.cells[0]) {
            row.cells[0].textContent = index + 1;
        }
    });
    itemCounter = rows.length;
}

function calculateItemTotal(input) {
    const row = input.closest('tr');
    if (!row) return;
    
    const qtd = parseFloat(row.querySelector('.item-qtd')?.value) || 0;
    const valor = parseFloat(row.querySelector('.item-valor')?.value) || 0;
    const total = qtd * valor;
    
    const totalInput = row.querySelector('.item-total');
    if (totalInput) {
        totalInput.value = formatCurrency(total);
    }
    
    recalculateOrderTotal();
}

function recalculateOrderTotal() {
    const totals = document.querySelectorAll('.item-total');
    let sum = 0;
    
    totals.forEach(input => {
        const value = input.value.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        sum += parseFloat(value) || 0;
    });
    
    const totalInput = document.getElementById('valorTotalOrdem');
    if (totalInput) {
        totalInput.value = formatCurrency(sum);
    }
}

// ============================================
// SUBMIT DO FORMULÁRIO
// ============================================
function handleSubmit(event) {
    if (event) event.preventDefault();
    
    const form = document.getElementById('ordemForm');
    if (!form || !form.checkValidity()) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return false;
    }
    
    const items = [];
    const rows = document.querySelectorAll('#itemsBody tr');
    
    rows.forEach((row, index) => {
        items.push({
            item: index + 1,
            especificacao: row.querySelector('.item-especificacao')?.value || '',
            quantidade: parseFloat(row.querySelector('.item-qtd')?.value) || 0,
            unidade: row.querySelector('.item-unid')?.value || 'UN',
            valorUnitario: parseFloat(row.querySelector('.item-valor')?.value) || 0,
            ipi: row.querySelector('.item-ipi')?.value || '',
            st: row.querySelector('.item-st')?.value || '',
            valorTotal: row.querySelector('.item-total')?.value || 'R$ 0,00'
        });
    });
    
    const timestamp = Date.now();
    const editId = document.getElementById('editId')?.value;
    
    const formData = {
        id: editId || timestamp.toString(),
        numeroOrdem: document.getElementById('numeroOrdem')?.value || '',
        responsavel: document.getElementById('responsavel')?.value || '',
        dataOrdem: document.getElementById('dataOrdem')?.value || '',
        razaoSocial: document.getElementById('razaoSocial')?.value || '',
        nomeFantasia: document.getElementById('nomeFantasia')?.value || '',
        cnpj: document.getElementById('cnpj')?.value || '',
        enderecoFornecedor: document.getElementById('enderecoFornecedor')?.value || '',
        site: document.getElementById('site')?.value || '',
        contato: document.getElementById('contato')?.value || '',
        telefone: document.getElementById('telefone')?.value || '',
        email: document.getElementById('email')?.value || '',
        items: items,
        valorTotal: document.getElementById('valorTotalOrdem')?.value || 'R$ 0,00',
        frete: document.getElementById('frete')?.value || '',
        localEntrega: document.getElementById('localEntrega')?.value || '',
        prazoEntrega: document.getElementById('prazoEntrega')?.value || '',
        transporte: document.getElementById('transporte')?.value || '',
        formaPagamento: document.getElementById('formaPagamento')?.value || '',
        prazoPagamento: document.getElementById('prazoPagamento')?.value || '',
        dadosBancarios: document.getElementById('dadosBancarios')?.value || '',
        status: 'aberta',
        timestamp: timestamp
    };
    
    if (editId) {
        const index = ordens.findIndex(o => o.id === editId);
        if (index !== -1) {
            formData.timestamp = ordens[index].timestamp;
            ordens[index] = formData;
            showToast('Ordem atualizada com sucesso!', 'success');
        }
    } else {
        ordens.push(formData);
        showToast('Ordem criada com sucesso!', 'success');
    }
    
    saveToLocalStorage();
    updateDisplay();
    closeFormModal();
    
    return false;
}

// ============================================
// EDIÇÃO
// ============================================
function editOrdem(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) {
        showToast('Ordem não encontrada!', 'error');
        return;
    }
    
    editingId = id;
    currentTab = 0;
    itemCounter = 0;
    
    const today = new Date().toISOString().split('T')[0];
    const modalHTML = createFormModalHTML('', today, ordem);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Carregar itens
    if (ordem.items && ordem.items.length > 0) {
        ordem.items.forEach(item => {
            addItem();
            const row = document.querySelector('#itemsBody tr:last-child');
            if (row) {
                const esp = row.querySelector('.item-especificacao');
                const qtd = row.querySelector('.item-qtd');
                const unid = row.querySelector('.item-unid');
                const valor = row.querySelector('.item-valor');
                const ipi = row.querySelector('.item-ipi');
                const st = row.querySelector('.item-st');
                const total = row.querySelector('.item-total');
                
                if (esp) esp.value = item.especificacao || '';
                if (qtd) qtd.value = item.quantidade || 1;
                if (unid) unid.value = item.unidade || 'UN';
                if (valor) valor.value = item.valorUnitario || 0;
                if (ipi) ipi.value = item.ipi || '';
                if (st) st.value = item.st || '';
                if (total) total.value = item.valorTotal || 'R$ 0,00';
            }
        });
    } else {
        addItem();
    }
    
    updateNavigationButtons();
}

// ============================================
// EXCLUSÃO
// ============================================
async function deleteOrdem(id) {
    const confirmed = await showConfirm('Tem certeza que deseja excluir esta ordem?', {
        title: 'Excluir Ordem',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        type: 'warning'
    });

    if (!confirmed) return;

    ordens = ordens.filter(o => o.id !== id);
    saveToLocalStorage();
    updateDisplay();
    showToast('Ordem excluída com sucesso!', 'success');
}

function showConfirm(message, options = {}) {
    return new Promise((resolve) => {
        const { title = 'Confirmação', confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning' } = options;

        const modalHTML = `
            <div class="modal-overlay" id="confirmModal" style="z-index: 10001; display: flex;">
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                    </div>
                    <p style="margin: 1.5rem 0; color: var(--text-primary); font-size: 1rem; line-height: 1.6;">${message}</p>
                    <div class="modal-actions">
                        <button class="secondary" id="modalCancelBtn">${cancelText}</button>
                        <button class="${type === 'warning' ? 'danger' : 'success'}" id="modalConfirmBtn">${confirmText}</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        const modal = document.getElementById('confirmModal');
        const confirmBtn = document.getElementById('modalConfirmBtn');
        const cancelBtn = document.getElementById('modalCancelBtn');

        const closeModal = (result) => {
            if (modal) modal.remove();
            resolve(result);
        };

        if (confirmBtn) confirmBtn.addEventListener('click', () => closeModal(true));
        if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(false));
    });
}

// ============================================
// TOGGLE STATUS
// ============================================
function toggleStatus(id) {
    const ordem = ordens.find(o => o.id === id);
    if (ordem) {
        ordem.status = ordem.status === 'aberta' ? 'fechada' : 'aberta';
        saveToLocalStorage();
        updateDisplay();
        showToast(`Ordem marcada como ${ordem.status}!`, 'success');
    }
}

// ============================================
// VISUALIZAÇÃO
// ============================================
function viewOrdem(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) return;
    
    const modalNumero = document.getElementById('modalNumero');
    if (modalNumero) modalNumero.textContent = ordem.numeroOrdem;
    
    const geralTab = document.getElementById('info-tab-geral');
    if (geralTab) {
        geralTab.innerHTML = `
            <div class="info-section">
                <h4>Informações Gerais</h4>
                <p><strong>Responsável:</strong> ${ordem.responsavel}</p>
                <p><strong>Data:</strong> ${formatDate(ordem.dataOrdem)}</p>
                <p><strong>Status:</strong> <span class="badge ${ordem.status}">${ordem.status.toUpperCase()}</span></p>
            </div>
        `;
    }
    
    const fornecedorTab = document.getElementById('info-tab-fornecedor');
    if (fornecedorTab) {
        fornecedorTab.innerHTML = `
            <div class="info-section">
                <h4>Dados do Fornecedor</h4>
                <p><strong>Razão Social:</strong> ${ordem.razaoSocial}</p>
                ${ordem.nomeFantasia ? `<p><strong>Nome Fantasia:</strong> ${ordem.nomeFantasia}</p>` : ''}
                <p><strong>CNPJ:</strong> ${ordem.cnpj}</p>
                ${ordem.enderecoFornecedor ? `<p><strong>Endereço:</strong> ${ordem.enderecoFornecedor}</p>` : ''}
                ${ordem.site ? `<p><strong>Site:</strong> ${ordem.site}</p>` : ''}
                ${ordem.contato ? `<p><strong>Contato:</strong> ${ordem.contato}</p>` : ''}
                ${ordem.telefone ? `<p><strong>Telefone:</strong> ${ordem.telefone}</p>` : ''}
                ${ordem.email ? `<p><strong>E-mail:</strong> ${ordem.email}</p>` : ''}
            </div>
        `;
    }
    
    const pedidoTab = document.getElementById('info-tab-pedido');
    if (pedidoTab && ordem.items) {
        pedidoTab.innerHTML = `
            <div class="info-section">
                <h4>Itens do Pedido</h4>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; margin-top: 0.5rem;">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Especificação</th>
                                <th>QTD</th>
                                <th>Unid</th>
                                <th>Valor UN</th>
                                <th>IPI</th>
                                <th>ST</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ordem.items.map(item => `
                                <tr>
                                    <td>${item.item}</td>
                                    <td>${item.especificacao}</td>
                                    <td>${item.quantidade}</td>
                                    <td>${item.unidade}</td>
                                    <td>R$ ${item.valorUnitario.toFixed(2)}</td>
                                    <td>${item.ipi || '-'}</td>
                                    <td>${item.st || '-'}</td>
                                    <td>${item.valorTotal}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <p style="margin-top: 1rem; font-size: 1.1rem;"><strong>Valor Total:</strong> ${ordem.valorTotal}</p>
                ${ordem.frete ? `<p><strong>Frete:</strong> ${ordem.frete}</p>` : ''}
            </div>
        `;
    }
    
    const entregaTab = document.getElementById('info-tab-entrega');
    if (entregaTab) {
        entregaTab.innerHTML = `
            <div class="info-section">
                <h4>Informações de Entrega</h4>
                ${ordem.localEntrega ? `<p><strong>Local de Entrega:</strong> ${ordem.localEntrega}</p>` : ''}
                ${ordem.prazoEntrega ? `<p><strong>Prazo de Entrega:</strong> ${ordem.prazoEntrega}</p>` : ''}
                ${ordem.transporte ? `<p><strong>Transporte:</strong> ${ordem.transporte}</p>` : ''}
            </div>
        `;
    }
    
    const pagamentoTab = document.getElementById('info-tab-pagamento');
    if (pagamentoTab) {
        pagamentoTab.innerHTML = `
            <div class="info-section">
                <h4>Dados de Pagamento</h4>
                <p><strong>Forma de Pagamento:</strong> ${ordem.formaPagamento}</p>
                <p><strong>Prazo de Pagamento:</strong> ${ordem.prazoPagamento}</p>
                ${ordem.dadosBancarios ? `<p><strong>Dados Bancários:</strong> ${ordem.dadosBancarios}</p>` : ''}
            </div>
        `;
    }
    
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        modal.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        const firstBtn = modal.querySelector('.tab-btn');
        if (firstBtn) firstBtn.classList.add('active');
        
        if (geralTab) geralTab.classList.add('active');
        
        modal.classList.add('show');
    }
}

function closeInfoModal() {
    const modal = document.getElementById('infoModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ============================================
// FILTROS
// ============================================
function filterOrdens() {
    updateTable();
}

function clearFilters() {
    const search = document.getElementById('search');
    const filterResp = document.getElementById('filterResponsavel');
    const filterStatus = document.getElementById('filterStatus');
    
    if (search) search.value = '';
    if (filterResp) filterResp.value = '';
    if (filterStatus) filterStatus.value = '';
    
    updateDisplay();
}

// ============================================
// ATUALIZAÇÃO DA TELA
// ============================================
function updateDisplay() {
    updateMonthDisplay();
    updateDashboard();
    updateTable();
    updateResponsaveisFilter();
}

function updateDashboard() {
    const monthOrdens = getOrdensForCurrentMonth();
    const totalFechadas = monthOrdens.filter(o => o.status === 'fechada').length;
    const totalAbertas = monthOrdens.filter(o => o.status === 'aberta').length;
    
    const totalElem = document.getElementById('totalOrdens');
    const fechadasElem = document.getElementById('totalFechadas');
    const abertasElem = document.getElementById('totalAbertas');
    
    if (totalElem) totalElem.textContent = monthOrdens.length;
    if (fechadasElem) fechadasElem.textContent = totalFechadas;
    if (abertasElem) abertasElem.textContent = totalAbertas;
    
    // Alerta visual
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

function updateTable() {
    const container = document.getElementById('ordensContainer');
    if (!container) return;
    
    let filteredOrdens = getOrdensForCurrentMonth();
    
    const searchElem = document.getElementById('search');
    const filterRespElem = document.getElementById('filterResponsavel');
    const filterStatusElem = document.getElementById('filterStatus');
    
    const search = searchElem ? searchElem.value.toLowerCase() : '';
    const filterResp = filterRespElem ? filterRespElem.value : '';
    const filterStatus = filterStatusElem ? filterStatusElem.value : '';
    
    if (search) {
        filteredOrdens = filteredOrdens.filter(o => 
            (o.numeroOrdem && o.numeroOrdem.toLowerCase().includes(search)) ||
            (o.razaoSocial && o.razaoSocial.toLowerCase().includes(search)) ||
            (o.responsavel && o.responsavel.toLowerCase().includes(search))
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
        const numA = parseInt(a.numeroOrdem) || 0;
        const numB = parseInt(b.numeroOrdem) || 0;
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
            <td><strong>${ordem.numeroOrdem}</strong></td>
            <td>${ordem.responsavel}</td>
            <td>${ordem.razaoSocial}</td>
            <td style="white-space: nowrap;">${formatDate(ordem.dataOrdem)}</td>
            <td><strong>${ordem.valorTotal}</strong></td>
            <td>
                <span class="badge ${ordem.status}">${ordem.status.toUpperCase()}</span>
            </td>
            <td class="actions-cell" style="text-align: center; white-space: nowrap;">
                <button onclick="viewOrdem('${ordem.id}')" class="action-btn view" title="Ver detalhes">Ver</button>
                <button onclick="editOrdem('${ordem.id}')" class="action-btn edit" title="Editar">Editar</button>
                <button onclick="generatePDFFromTable('${ordem.id}')" class="action-btn success" title="Gerar PDF">PDF</button>
                <button onclick="deleteOrdem('${ordem.id}')" class="action-btn delete" title="Excluir">Excluir</button>
            </td>
        </tr>
    `).join('');
}

function updateResponsaveisFilter() {
    const responsaveis = new Set();
    ordens.forEach(o => {
        if (o.responsavel && o.responsavel.trim()) {
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
            option.textContent = r;
            select.appendChild(option);
        });
        select.value = currentValue;
    }
}

// ============================================
// UTILIDADES
// ============================================
function getOrdensForCurrentMonth() {
    return ordens.filter(ordem => {
        if (!ordem.dataOrdem) return false;
        const ordemDate = new Date(ordem.dataOrdem + 'T00:00:00');
        return ordemDate.getMonth() === currentMonth.getMonth() &&
               ordemDate.getFullYear() === currentMonth.getFullYear();
    });
}

function getNextOrderNumber() {
    const existingNumbers = ordens
        .map(o => parseInt(o.numeroOrdem))
        .filter(n => !isNaN(n));
    
    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1250;
    return nextNum.toString();
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
}

function formatCurrency(value) {
    const num = parseFloat(value) || 0;
    return `R$ ${num.toFixed(2).replace('.', ',')}`;
}

function showToast(message, type = 'success') {
    const oldMessages = document.querySelectorAll('.floating-message');
    oldMessages.forEach(msg => msg.remove());
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `floating-message ${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// ============================================
// GERAÇÃO DE PDF
// ============================================
function generatePDFFromTable(id) {
    const ordem = ordens.find(o => o.id === id);
    if (!ordem) {
        showToast('Ordem não encontrada!', 'error');
        return;
    }
    generatePDFForOrdem(ordem);
}

function generatePDF() {
    const modalNumero = document.getElementById('modalNumero');
    if (!modalNumero) return;
    
    const ordem = ordens.find(o => o.numeroOrdem === modalNumero.textContent);
    
    if (!ordem) {
        showToast('Ordem não encontrada!', 'error');
        return;
    }
    generatePDFForOrdem(ordem);
}

function generatePDFForOrdem(ordem) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast('Biblioteca jsPDF não carregada!', 'error');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let y = 20;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;
    const lineHeight = 5;
    
    // Logo
    try {
        const logo = new Image();
        logo.src = 'I.R.-COMERCIO-E-MATERIAIS-ELETRICOS-LTDA.png';
        logo.onload = function() {
            const imgWidth = 50;
            const imgHeight = (logo.height / logo.width) * imgWidth;
            doc.addImage(logo, 'PNG', margin, 20, imgWidth, imgHeight);
        };
    } catch (e) {
        console.log('Logo não carregada');
    }
    
    y = 40;
    
    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('ORDEM DE COMPRA', pageWidth / 2, y, { align: 'center' });
    
    y += 8;
    doc.setFontSize(14);
    doc.text(`Nº ${ordem.numeroOrdem}`, pageWidth / 2, y, { align: 'center' });
    
    y += 12;
    
    // Dados para faturamento
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('DADOS PARA FATURAMENTO', margin, y);
    
    y += lineHeight + 1;
    doc.text('I.R. COMÉRCIO E MATERIAIS ELÉTRICOS LTDA', margin, y);
    
    y += lineHeight + 1;
    doc.setFont(undefined, 'normal');
    doc.text('CNPJ: 33.149.502/0001-38  |  IE: 083.780.74-2', margin, y);
    
    y += lineHeight + 1;
    doc.text('RUA TADORNA Nº 472, SALA 2', margin, y);
    
    y += lineHeight + 1;
    doc.text('NOVO HORIZONTE - SERRA/ES  |  CEP: 29.163-318', margin, y);
    
    y += lineHeight + 1;
    doc.text('TELEFAX: (27) 3209-4291  |  E-MAIL: COMERCIAL.IRCOMERCIO@GMAIL.COM', margin, y);
    
    y += 10;
    
    // Dados do fornecedor
    doc.setFont(undefined, 'bold');
    doc.text('DADOS DO FORNECEDOR', margin, y);
    
    y += lineHeight + 1;
    doc.text(ordem.razaoSocial, margin, y);
    
    if (ordem.nomeFantasia) {
        y += lineHeight + 1;
        doc.setFont(undefined, 'normal');
        doc.text(ordem.nomeFantasia, margin, y);
    }
    
    y += lineHeight + 1;
    doc.setFont(undefined, 'normal');
    doc.text(ordem.cnpj, margin, y);
    
    if (ordem.enderecoFornecedor) {
        y += lineHeight + 1;
        doc.text(ordem.enderecoFornecedor, margin, y);
    }
    
    if (ordem.contato) {
        y += lineHeight + 1;
        doc.text(ordem.contato, margin, y);
    }
    
    if (ordem.telefone) {
        y += lineHeight;
        doc.text(ordem.telefone, margin, y);
    }
    
    if (ordem.email) {
        y += lineHeight + 1;
        doc.text(ordem.email, margin, y);
    }
    
    y += 10;
    
    // Itens
    doc.setFont(undefined, 'bold');
    doc.text('ITENS DO PEDIDO', margin, y);
    y += 6;
    
    // Tabela simplificada
    doc.setFontSize(9);
    if (ordem.items && ordem.items.length > 0) {
        ordem.items.forEach(item => {
            if (y > 250) {
                doc.addPage();
                y = 20;
            }
            doc.setFont(undefined, 'normal');
            doc.text(`${item.item}. ${item.especificacao}`, margin, y);
            y += 5;
            doc.text(`   QTD: ${item.quantidade} ${item.unidade} | Valor: R$ ${item.valorUnitario.toFixed(2)} | Total: ${item.valorTotal}`, margin, y);
            y += 8;
        });
    }
    
    y += 5;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`VALOR TOTAL: ${ordem.valorTotal}`, margin, y);
    
    y += 10;
    
    // Local de entrega
    doc.text('LOCAL DE ENTREGA:', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    const localPadrao = 'Rua Tadorna nº 472, sala 2, Novo Horizonte - Serra/ES  |  CEP: 29.163-318';
    const localEntrega = ordem.localEntrega && ordem.localEntrega.trim() ? ordem.localEntrega : localPadrao;
    doc.text(localEntrega, margin, y);
    
    y += 10;
    
    // Prazo e frete
    doc.setFont(undefined, 'bold');
    doc.text('PRAZO DE ENTREGA:', margin, y);
    doc.setFont(undefined, 'normal');
    doc.text(ordem.prazoEntrega || '-', margin + 42, y);
    
    doc.setFont(undefined, 'bold');
    doc.text('FRETE:', pageWidth - margin - 35, y);
    doc.setFont(undefined, 'normal');
    doc.text(ordem.frete || '-', pageWidth - margin - 20, y);
    
    y += 10;
    
    // Pagamento
    doc.setFont(undefined, 'bold');
    doc.text('CONDIÇÕES DE PAGAMENTO:', margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`Forma: ${ordem.formaPagamento}`, margin, y);
    y += 5;
    doc.text(`Prazo: ${ordem.prazoPagamento}`, margin, y);
    
    if (ordem.dadosBancarios) {
        y += 5;
        doc.setFont(undefined, 'bold');
        doc.text('Dados Bancários:', margin, y);
        y += 5;
        doc.setFont(undefined, 'normal');
        doc.text(ordem.dadosBancarios, margin, y);
        y += 5;
    }
    
    y += 10;
    
    // Aviso
    const avisoY = doc.internal.pageSize.height - 70;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, avisoY - 25, pageWidth - (2 * margin), 20, 'F');
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('ATENÇÃO SR. FORNECEDOR:', margin + 5, avisoY - 18);
    
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text('1) GENTILEZA MENCIONAR NA NOTA FISCAL O Nº 907/08/2024', margin + 5, avisoY - 12);
    doc.text('2) FAVOR ENVIAR A NOTA FISCAL ELETRÔNICA (ARQUIVO .XML) PARA: FINANCEIRO.IRCOMERCIO@GMAIL.COM', margin + 5, avisoY - 6);
    
    // Assinaturas
    const assinaturaY = doc.internal.pageSize.height - 40;
    const col1X = margin;
    const col2X = pageWidth / 2 + 10;
    
    // Assinatura imagem
    try {
        const assinatura = new Image();
        assinatura.src = 'assinatura.png';
        assinatura.onload = function() {
            const imgWidth = 70;
            const imgHeight = (assinatura.height / assinatura.width) * imgWidth;
            doc.addImage(assinatura, 'PNG', col1X, assinaturaY - imgHeight - 10, imgWidth, imgHeight);
        };
    } catch (e) {
        console.log('Assinatura não carregada');
    }
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    doc.line(col1X, assinaturaY, col1X + 80, assinaturaY);
    doc.setFont(undefined, 'bold');
    doc.text('Rosemeire Bicalho de L. Gravino', col1X + 2, assinaturaY + 5);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text('MG-10.078.568 / CPF: 045.160.616-78', col1X + 2, assinaturaY + 10);
    doc.text('Diretora', col1X + 2, assinaturaY + 14);
    
    doc.setFontSize(10);
    doc.line(col2X, assinaturaY, col2X + 80, assinaturaY);
    doc.text('Fornecedor', col2X + 25, assinaturaY + 6);
    
    // Salvar
    doc.save(`Ordem_Compra_${ordem.numeroOrdem}.pdf`);
    showToast('PDF gerado com sucesso!', 'success');
}
