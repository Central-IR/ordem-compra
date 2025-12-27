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

// CORS mais permissivo para desenvolvimento
app.use(cors({
    origin: function(origin, callback) {
        // Permite requisições sem origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'https://ordem-compra.onrender.com',
            'http://localhost:3000',
            'http://localhost:10000',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:10000'
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(null, true); // Permitir todas as origens em desenvolvimento
        }
    },
    credentials: true,
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
    const publicPaths = ['/', '/health', '/diagnostico.html'];
    if (publicPaths.includes(req.path)) return next();

    // FORÇAR MODO DESENVOLVIMENTO - DESABILITAR PARA PRODUÇÃO
    const DEVELOPMENT_MODE = true; // SEMPRE TRUE = SEM AUTENTICAÇÃO
    if (DEVELOPMENT_MODE) {
        console.log('⚠️ MODO DESENVOLVIMENTO - Autenticação desabilitada');
        return next();
    }

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

// ROTAS DA API
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

app.post('/api/ordens', verificarAutenticacao, async (req, res) => {
    try {
        console.log('➕ Criando nova ordem...');
        
        const { 
            numeroOrdem, responsavel, dataOrdem, razaoSocial, nomeFantasia, 
            cnpj, enderecoFornecedor, site, contato, telefone, email, items, 
            valorTotal, frete, localEntrega, prazoEntrega, transporte, 
            formaPagamento, prazoPagamento, dadosBancarios, status 
        } = req.body;

        const novaOrdem = {
            numero_ordem: numeroOrdem,
            responsavel,
            data_ordem: dataOrdem,
            razao_social: razaoSocial,
            nome_fantasia: nomeFantasia || null,
            cnpj,
            endereco_fornecedor: enderecoFornecedor || null,
            site: site || null,
            contato: contato || null,
            telefone: telefone || null,
            email: email || null,
            items: items || [],
            valor_total: valorTotal || 'R$ 0,00',
            frete: frete || null,
            local_entrega: localEntrega || null,
            prazo_entrega: prazoEntrega || null,
            transporte: transporte || null,
            forma_pagamento: formaPagamento,
            prazo_pagamento: prazoPagamento,
            dados_bancarios: dadosBancarios || null,
            status: status || 'aberta'
        };

        const { data, error } = await supabase
            .from('ordens_compra')
            .insert([novaOrdem])
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

app.put('/api/ordens/:id', verificarAutenticacao, async (req, res) => {
    try {
        console.log(`✏️ Atualizando ordem ID: ${req.params.id}`);
        
        const { 
            numeroOrdem, responsavel, dataOrdem, razaoSocial, nomeFantasia, 
            cnpj, enderecoFornecedor, site, contato, telefone, email, items, 
            valorTotal, frete, localEntrega, prazoEntrega, transporte, 
            formaPagamento, prazoPagamento, dadosBancarios, status 
        } = req.body;

        const ordemAtualizada = {
            numero_ordem: numeroOrdem,
            responsavel,
            data_ordem: dataOrdem,
            razao_social: razaoSocial,
            nome_fantasia: nomeFantasia || null,
            cnpj,
            endereco_fornecedor: enderecoFornecedor || null,
            site: site || null,
            contato: contato || null,
            telefone: telefone || null,
            email: email || null,
            items: items || [],
            valor_total: valorTotal || 'R$ 0,00',
            frete: frete || null,
            local_entrega: localEntrega || null,
            prazo_entrega: prazoEntrega || null,
            transporte: transporte || null,
            forma_pagamento: formaPagamento,
            prazo_pagamento: prazoPagamento,
            dados_bancarios: dadosBancarios || null,
            status: status || 'aberta',
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('ordens_compra')
            .update(ordemAtualizada)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Ordem não encontrada' });
            }
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

app.patch('/api/ordens/:id/status', verificarAutenticacao, async (req, res) => {
    try {
        console.log(`🔄 Atualizando status da ordem ID: ${req.params.id}`);
        const updates = {
            status: req.body.status,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('ordens_compra')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ success: false, error: 'Ordem não encontrada' });
            }
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

app.delete('/api/ordens/:id', verificarAutenticacao, async (req, res) => {
    try {
        console.log(`🗑️ Deletando ordem ID: ${req.params.id}`);
        const { error } = await supabase
            .from('ordens_compra')
            .delete()
            .eq('id', req.params.id);

        if (error) throw error;

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

app.listen(PORT, '0.0.0.0', () => {
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
