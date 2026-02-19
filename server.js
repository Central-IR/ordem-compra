const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// ==============================
// CONFIGURAÇÃO INICIAL
// ==============================
const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// ==============================
// VARIÁVEIS DE AMBIENTE
// ==============================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PORTAL_URL = process.env.PORTAL_URL || 'https://ir-comercio-portal-zcan.onrender.com';

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
    process.exit(1);
}

// ==============================
// MIDDLEWARE DE AUTENTICAÇÃO
// ==============================
async function verificarAutenticacao(req, res, next) {
    const publicPaths = ['/', '/api/health'];

    if (publicPaths.includes(req.path)) {
        return next();
    }

    const sessionToken = req.headers['x-session-token'];

    if (!sessionToken) {
        return res.status(401).json({ error: 'Token de sessão não fornecido' });
    }

    try {
        const response = await fetch(`${PORTAL_URL}/api/verify-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionToken })
        });

        if (!response.ok) {
            return res.status(401).json({ error: 'Sessão inválida' });
        }

        const data = await response.json();

        if (!data.valid) {
            return res.status(401).json({ error: 'Sessão inválida' });
        }

        req.user = data.session;
        req.sessionToken = sessionToken;

        next();
    } catch (error) {
        console.error('Erro ao validar sessão:', error);
        res.status(500).json({ error: 'Erro interno de autenticação' });
    }
}

// ==============================
// ROTAS PÚBLICAS
// ==============================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==============================
// ROTAS PROTEGIDAS – ORDENS DE COMPRA
// ==============================

// Último número global (declarado ANTES do GET genérico para evitar conflito de rota)
app.get('/api/ordens/ultimo-numero', verificarAutenticacao, async (req, res) => {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/ordens_compra?select=numero_ordem&order=numero_ordem.desc&limit=1`,
            { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        if (!response.ok) throw new Error('Erro Supabase');
        const data = await response.json();
        const ultimoNumero = data.length > 0 ? parseInt(data[0].numero_ordem) || 0 : 0;
        res.json({ ultimoNumero });
    } catch (error) {
        console.error('❌ Erro ao buscar último número:', error.message);
        res.status(500).json({ error: 'Erro ao buscar último número' });
    }
});

// Fornecedores únicos para autocomplete (todos os meses, campos mínimos)
app.get('/api/fornecedores', verificarAutenticacao, async (req, res) => {
    try {
        const fields = 'razao_social,nome_fantasia,cnpj,endereco_fornecedor,site,contato,telefone,email';
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/ordens_compra?select=${fields}&order=created_at.desc`,
            { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
        );
        if (!response.ok) throw new Error('Erro Supabase');
        const data = await response.json();

        // Desduplicar: mantém apenas o registro mais recente por razão social
        const seen = new Set();
        const fornecedores = [];
        for (const row of data) {
            const razao = row.razao_social?.trim().toUpperCase();
            if (razao && !seen.has(razao)) {
                seen.add(razao);
                fornecedores.push(row);
            }
        }
        console.log(`👥 ${fornecedores.length} fornecedores únicos retornados`);
        res.json(fornecedores);
    } catch (error) {
        console.error('❌ Erro ao buscar fornecedores:', error.message);
        res.status(500).json({ error: 'Erro ao buscar fornecedores' });
    }
});

// Listar ordens — com filtro de mês opcional
app.get('/api/ordens', verificarAutenticacao, async (req, res) => {
    try {
        const { mes, ano } = req.query;
        let supabaseUrl;

        if (mes !== undefined && ano !== undefined) {
            const month = parseInt(mes); // 0-based (Janeiro = 0)
            const year = parseInt(ano);
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0);
            const startStr = startDate.toISOString().split('T')[0];
            const endStr = endDate.toISOString().split('T')[0];
            console.log(`📥 GET /api/ordens - Buscando de ${startStr} a ${endStr}...`);
            supabaseUrl = `${SUPABASE_URL}/rest/v1/ordens_compra?select=*&data_ordem=gte.${startStr}&data_ordem=lte.${endStr}&order=numero_ordem.asc`;
        } else {
            console.log('📥 GET /api/ordens - Buscando todos...');
            supabaseUrl = `${SUPABASE_URL}/rest/v1/ordens_compra?select=*&order=numero_ordem.desc`;
        }

        const response = await fetch(supabaseUrl, {
            headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro Supabase:', errorText);
            throw new Error(`Supabase erro ${response.status}`);
        }

        const data = await response.json();
        console.log(`✅ ${data.length} ordens carregadas`);
        res.json(data);
    } catch (error) {
        console.error('❌ Erro ao buscar ordens:', error.message);
        res.status(500).json({ error: 'Erro ao buscar ordens', details: error.message });
    }
});

// Criar ordem
app.post('/api/ordens', verificarAutenticacao, async (req, res) => {
    try {
        console.log('📝 POST /api/ordens - Criando ordem:', req.body.numero_ordem);

        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/ordens_compra`,
            {
                method: 'POST',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=representation'
                },
                body: JSON.stringify(req.body)
            }
        );

        if (!response.ok) {
            const err = await response.text();
            console.error('❌ Erro ao criar ordem:', err);
            throw new Error(err);
        }

        const data = await response.json();
        console.log('✅ Ordem criada:', data[0]?.numero_ordem);
        res.json(data);
    } catch (error) {
        console.error('❌ Erro ao criar ordem:', error.message);
        res.status(500).json({ error: 'Erro ao criar ordem', details: error.message });
    }
});

// Atualizar ordem
app.patch('/api/ordens/:id', verificarAutenticacao, async (req, res) => {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/ordens_compra?id=eq.${req.params.id}`,
            {
                method: 'PATCH',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=representation'
                },
                body: JSON.stringify(req.body)
            }
        );

        if (!response.ok) throw new Error('Erro ao atualizar ordem');

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar ordem' });
    }
});

// Excluir ordem
app.delete('/api/ordens/:id', verificarAutenticacao, async (req, res) => {
    try {
        const response = await fetch(
            `${SUPABASE_URL}/rest/v1/ordens_compra?id=eq.${req.params.id}`,
            {
                method: 'DELETE',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`
                }
            }
        );

        if (!response.ok) throw new Error('Erro ao excluir ordem');

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir ordem' });
    }
});

// ==============================
// SERVIR FRONTEND
// ==============================
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==============================
// INICIAR SERVIDOR
// ==============================
app.listen(PORT, () => {
    console.log(`🚀 Servidor Ordem de Compra rodando na porta ${PORT}`);
    console.log('🔒 Autenticação centralizada no Portal');
    console.log('📦 Supabase conectado com Service Role');
    console.log('💾 Tabela: ordens_compra');
});
