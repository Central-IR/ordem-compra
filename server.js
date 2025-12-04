const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const app = express();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Supabase configurado:', supabaseUrl);

// MIDDLEWARES
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
        else if (filepath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
        else if (filepath.endsWith('.html')) res.setHeader('Content-Type', 'text/html');
    }
}));

app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// AUTENTICAÇÃO
const PORTAL_URL = process.env.PORTAL_URL || 'https://ir-comercio-portal-zcan.onrender.com';

async function verificarAutenticacao(req, res, next) {
    const publicPaths = ['/', '/health'];
    if (publicPaths.includes(req.path)) return next();

    const sessionToken = req.headers['x-session-token'];
    if (!sessionToken) {
        console.log('❌ Token não fornecido');
        return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
        const verifyResponse = await fetch(`${PORTAL_URL}/api/verify-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
        });

        if (!verifyResponse.ok) {
            console.log('❌ Sessão inválida - Status:', verifyResponse.status);
            return res.status(401).json({ error: 'Sessão inválida' });
        }

        const sessionData = await verifyResponse.json();
        if (!sessionData.valid) {
            console.log('❌ Sessão não válida');
            return res.status(401).json({ error: 'Sessão inválida' });
        }

        req.user = sessionData.session;
        req.sessionToken = sessionToken;
        console.log('✅ Autenticação OK');
        next();
    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error.message);
        return res.status(500).json({ error: 'Erro ao verificar autenticação', details: error.message });
    }
}

// GET /api/ordens
app.get('/api/ordens', verificarAutenticacao, async (req, res) => {
    try {
        console.log('📋 Listando ordens...');
        const { data, error } = await supabase
            .from('ordens_compra')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Erro Supabase ao listar:', error);
            throw error;
        }
        
        console.log(`✅ ${data?.length || 0} ordens encontradas`);
        res.json(data || []);
    } catch (error) {
        console.error('❌ Erro ao listar ordens:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao listar ordens',
            message: error.message
        });
    }
});

// GET /api/ordens/:id
app.get('/api/ordens/:id', verificarAutenticacao, async (req, res) => {
    try {
        console.log(`🔍 Buscando ordem ID: ${req.params.id}`);
        const { data, error } = await supabase
            .from('ordens_compra')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log('❌ Ordem não encontrada');
                return res.status(404).json({ success: false, error: 'Ordem não encontrada' });
            }
            console.error('❌ Erro Supabase:', error);
            throw error;
        }

        console.log('✅ Ordem encontrada');
        res.json(data);
    } catch (error) {
        console.error('❌ Erro ao buscar ordem:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao buscar ordem',
            message: error.message
        });
    }
});

// POST /api/ordens
app.post('/api/ordens', verificarAutenticacao, async (req, res) => {
    try {
        console.log('➕ Criando nova ordem...');
        
        const ordemData = {
            numero_ordem: req.body.numeroOrdem,
            responsavel: req.body.responsavel,
            data_ordem: req.body.dataOrdem,
            razao_social: req.body.razaoSocial,
            nome_fantasia: req.body.nomeFantasia || null,
            cnpj: req.body.cnpj,
            endereco_fornecedor: req.body.enderecoFornecedor || null,
            site: req.body.site || null,
            contato: req.body.contato || null,
            telefone: req.body.telefone || null,
            email: req.body.email || null,
            items: req.body.items,
            valor_total: req.body.valorTotal,
            frete: req.body.frete || null,
            local_entrega: req.body.localEntrega || null,
            prazo_entrega: req.body.prazoEntrega || null,
            transporte: req.body.transporte || null,
            forma_pagamento: req.body.formaPagamento,
            prazo_pagamento: req.body.prazoPagamento,
            dados_bancarios: req.body.dadosBancarios || null,
            status: 'aberta'
        };

        console.log('📤 Dados a inserir:', JSON.stringify(ordemData, null, 2));

        const { data, error } = await supabase
            .from('ordens_compra')
            .insert([ordemData])
            .select()
            .single();

        if (error) {
            console.error('❌ Erro Supabase ao inserir:', error);
            throw error;
        }

        console.log('✅ Ordem criada com sucesso! ID:', data.id);
        res.status(201).json(data);
    } catch (error) {
        console.error('❌ Erro ao criar ordem:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao criar ordem',
            message: error.message
        });
    }
});

// PUT /api/ordens/:id
app.put('/api/ordens/:id', verificarAutenticacao, async (req, res) => {
    try {
        console.log(`✏️ Atualizando ordem ID: ${req.params.id}`);
        
        const ordemData = {
            numero_ordem: req.body.numeroOrdem,
            responsavel: req.body.responsavel,
            data_ordem: req.body.dataOrdem,
            razao_social: req.body.razaoSocial,
            nome_fantasia: req.body.nomeFantasia || null,
            cnpj: req.body.cnpj,
            endereco_fornecedor: req.body.enderecoFornecedor || null,
            site: req.body.site || null,
            contato: req.body.contato || null,
            telefone: req.body.telefone || null,
            email: req.body.email || null,
            items: req.body.items,
            valor_total: req.body.valorTotal,
            frete: req.body.frete || null,
            local_entrega: req.body.localEntrega || null,
            prazo_entrega: req.body.prazoEntrega || null,
            transporte: req.body.transporte || null,
            forma_pagamento: req.body.formaPagamento,
            prazo_pagamento: req.body.prazoPagamento,
            dados_bancarios: req.body.dadosBancarios || null,
            status: req.body.status || 'aberta'
        };

        console.log('📤 Dados a atualizar:', JSON.stringify(ordemData, null, 2));

        const { data, error } = await supabase
            .from('ordens_compra')
            .update(ordemData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log('❌ Ordem não encontrada');
                return res.status(404).json({ success: false, error: 'Ordem não encontrada' });
            }
            console.error('❌ Erro Supabase:', error);
            throw error;
        }

        console.log('✅ Ordem atualizada com sucesso!');
        res.json(data);
    } catch (error) {
        console.error('❌ Erro ao atualizar ordem:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar ordem',
            message: error.message
        });
    }
});

// PATCH /api/ordens/:id/status
app.patch('/api/ordens/:id/status', verificarAutenticacao, async (req, res) => {
    try {
        console.log(`🔄 Atualizando status da ordem ID: ${req.params.id}`);
        const { status } = req.body;

        if (!['aberta', 'fechada'].includes(status)) {
            return res.status(400).json({ error: 'Status inválido' });
        }

        const { data, error } = await supabase
            .from('ordens_compra')
            .update({ status: status })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log('❌ Ordem não encontrada');
                return res.status(404).json({ success: false, error: 'Ordem não encontrada' });
            }
            console.error('❌ Erro Supabase:', error);
            throw error;
        }

        console.log('✅ Status atualizado com sucesso!');
        res.json(data);
    } catch (error) {
        console.error('❌ Erro ao atualizar status:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao atualizar status',
            message: error.message
        });
    }
});

// DELETE /api/ordens/:id
app.delete('/api/ordens/:id', verificarAutenticacao, async (req, res) => {
    try {
        console.log(`🗑️ Deletando ordem ID: ${req.params.id}`);
        const { error } = await supabase
            .from('ordens_compra')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            console.error('❌ Erro Supabase:', error);
            throw error;
        }

        console.log('✅ Ordem deletada com sucesso!');
        res.json({ success: true, message: 'Ordem removida com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao deletar ordem:', error.message);
        res.status(500).json({ 
            success: false, 
            error: 'Erro ao deletar ordem',
            message: error.message
        });
    }
});

// ROTAS DE SAÚDE
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// TRATAMENTO GLOBAL DE ERROS
app.use((err, req, res, next) => {
    console.error('❌ Erro não tratado:', err);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        message: err.message
    });
});

// INICIAR SERVIDOR
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
    console.log('');
    console.log('===============================================');
    console.log('🚀 ORDEM DE COMPRA');
    console.log('===============================================');
    console.log(`✅ Porta: ${PORT}`);
    console.log(`✅ Supabase: ${supabaseUrl}`);
    console.log(`✅ Portal: ${PORTAL_URL}`);
    console.log('===============================================');
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

module.exports = app;
