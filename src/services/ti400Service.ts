import axios from 'axios';
import {
  ConfigAtual,
  ConfigEntry,
  CriarRelatorioRequest,
  DashboardLinha,
  FaixaPeso,
  IniciarSessaoRequest,
  LineSettings,
  PesagemItem,
  ProdutoItem,
  RastreabilidadeItem,
  RelatorioJobResponse,
  SessaoHistoricoItem,
  WeighingSession,
} from '@/interfaces/ti400Interface';

// Em dev: Security:ApiKey vazia na API → sem autenticação.
// Em produção: preencher com o valor de Security:ApiKey do servidor.
const TI400_API_KEY = '';

const ti400Api = axios.create({
  baseURL: 'http://localhost:5260',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': TI400_API_KEY,
  },
  timeout: 10000,
});

class Ti400Service {
  async getDashboard(): Promise<DashboardLinha[]> {
    const res = await ti400Api.get<DashboardLinha[]>('/api/dashboard');
    return res.data;
  }

  async getLinhas(): Promise<LineSettings[]> {
    const res = await ti400Api.get<LineSettings[]>('/api/lines');
    return res.data;
  }

  async getSessaoAtual(linhaId: string): Promise<WeighingSession | null> {
    try {
      const res = await ti400Api.get<WeighingSession>(`/api/lines/${linhaId}/sessions/current`);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  async getPesagensLinha(
    linhaId: string,
    take = 50,
    offset = 0,
    from?: string,
    to?: string,
    lote?: number,
  ): Promise<PesagemItem[]> {
    const res = await ti400Api.get<PesagemItem[]>(`/api/lines/${linhaId}/pesagens`, {
      params: { take, offset, from, to, lote },
    });
    return res.data;
  }

  async getSessoesLinha(
    linhaId: string,
    take = 20,
    offset = 0,
    from?: string,
    to?: string,
  ): Promise<SessaoHistoricoItem[]> {
    const res = await ti400Api.get<SessaoHistoricoItem[]>(`/api/lines/${linhaId}/sessoes`, {
      params: { take, offset, from, to },
    });
    return res.data;
  }

  async getPesagensSessao(sessaoId: string): Promise<PesagemItem[]> {
    const res = await ti400Api.get<PesagemItem[]>(`/api/sessoes/${sessaoId}/pesagens`);
    return res.data;
  }

  async iniciarSessao(linhaId: string, req: IniciarSessaoRequest): Promise<void> {
    await ti400Api.post(`/api/lines/${linhaId}/sessions`, req);
  }

  async cancelarSessao(linhaId: string): Promise<void> {
    await ti400Api.delete(`/api/lines/${linhaId}/sessions/current`);
  }

  async retrySessao(linhaId: string): Promise<void> {
    await ti400Api.post(`/api/lines/${linhaId}/sessions/current/retry`);
  }

  async getRastreabilidade(nr: string): Promise<RastreabilidadeItem | null> {
    try {
      const res = await ti400Api.get<RastreabilidadeItem>(`/api/rastreabilidade/${encodeURIComponent(nr)}`);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  async criarRelatorio(req: CriarRelatorioRequest): Promise<RelatorioJobResponse> {
    const res = await ti400Api.post<RelatorioJobResponse>('/api/relatorios', req);
    return res.data;
  }

  async getRelatorio(jobId: string): Promise<RelatorioJobResponse> {
    const res = await ti400Api.get<RelatorioJobResponse>(`/api/relatorios/${jobId}`);
    return res.data;
  }

  async reimprimirPesagem(idPesagem: string): Promise<string> {
    const res = await ti400Api.post<{ destination: string }>(`/api/pesagens/${idPesagem}/reprint`);
    return res.data.destination;
  }

  // ── Produtos ──────────────────────────────────────────────────────────────

  async getProdutos(): Promise<ProdutoItem[]> {
    const res = await ti400Api.get<ProdutoItem[]>('/api/produtos');
    return res.data;
  }

  // ── Faixas de Peso ────────────────────────────────────────────────────────

  async getFaixas(): Promise<FaixaPeso[]> {
    const res = await ti400Api.get<FaixaPeso[]>('/api/faixas');
    return res.data;
  }

  async upsertFaixa(faixa: FaixaPeso): Promise<FaixaPeso> {
    const res = await ti400Api.post<FaixaPeso>('/api/faixas', faixa);
    return res.data;
  }

  async deleteFaixa(id: number): Promise<void> {
    await ti400Api.delete(`/api/faixas/${id}`);
  }

  // ── Configurações gerais ──────────────────────────────────────────────────

  async getConfig(): Promise<ConfigAtual> {
    const res = await ti400Api.get<ConfigAtual>('/api/config');
    return res.data;
  }

  async updateConfig(entries: ConfigEntry[]): Promise<ConfigAtual> {
    const res = await ti400Api.patch<ConfigAtual>('/api/config', entries);
    return res.data;
  }

  // ── Sync manual ───────────────────────────────────────────────────────────

  async syncPull(): Promise<void> {
    await ti400Api.post('/api/sync/pull');
  }

  async syncPush(): Promise<void> {
    await ti400Api.post('/api/sync/push');
  }
}

export default new Ti400Service();
