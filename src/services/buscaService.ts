import { LocalOuProduto, ResultadoBusca } from 'src/interfaces/buscaInterface';
import { ProdutoCompleto } from '../interfaces/produtoCompletoInterface';
const API_BASE = 'https://chartmenus.avatim.com.br';

export default {
    async getLocais(): Promise<LocalOuProduto[]> {
        const res = await fetch(`${API_BASE}/Localizacao/GetLocais`, { method: 'POST' });
        const json = await res.json();

        if (!json.success) throw new Error('Erro ao carregar locais');

        return json.data.map((item: any) => ({
            value: item.Codigo,
            label: item.Descricao,
        }));
    },

    async getProdutos(): Promise<LocalOuProduto[]> {
        const res = await fetch(`${API_BASE}/Localizacao/GetProdutos`, { method: 'POST' });

        const json = await res.json();

        if (!json.success) throw new Error('Erro ao carregar produtos');

        return json.data.map((item: any) => ({
            value: item.Cd_Produto,
            label: item.Ds_Produto,
            Ds_UrlImage: item.Ds_UrlImage,
        }));
    },


    async getProdutosCompletos(): Promise<ProdutoCompleto[]> {
        const res = await fetch(`${API_BASE}/Localizacao/GetProdutos`, { method: 'POST' });

        const json = await res.json();

        if (!json.success) throw new Error('Erro ao carregar produtos completos');

        return json.data as ProdutoCompleto[];
    },


    async buscar(tipo: 'local' | 'sku', valor: string): Promise<ResultadoBusca[]> {
        const url =
            tipo === 'local'
                ? `${API_BASE}/Localizacao/GetProdutosPorLocal`
                : `${API_BASE}/Localizacao/GetLocaisPorSku`;


        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tipo === 'local' ? { locationCode: valor } : { sku: valor }),
        });

        const json = await res.json();

        if (!json.success) throw new Error(json.message || 'Erro na busca');

        return json.locations || [];
    },


    async transferirProduto(code: string, toLocationCode: string, quantity: number, fromLocationCode: string): Promise<string> {


        const body = {
            code,
            fromLocationCode,
            toLocationCode,
            quantity,
        };

        const res = await fetch(`${API_BASE}/Localizacao/TransferByCode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.message || 'Erro na transferência');

        return json.returnCode;
    },




};
