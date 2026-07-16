export type StatusSessao = 'Aguardando' | 'Imprimindo' | 'Concluido' | 'Erro' | 'Cancelado';

export interface DashboardSessao {
  lote: number;
  idColaborador: number;
  status: StatusSessao;
  iniciada: string;
  tentativasErro: number;
  ultimoErro: string | null;
}

export interface DashboardLinha {
  linhaId: string;
  linhaNome: string;
  sessao: DashboardSessao | null;
}

export interface IniciarSessaoRequest {
  lote: number;
  idColaborador: number;
}

export interface LineSettings {
  id: string;
  nome: string;
  ip: string;
  port: number;
  impressoraNome: string;
  impressoraIp: string;
}

export interface FaixaPeso {
  id: number;
  idProduto: number;
  pesoAlvo: number;
  verdeMin: number;
  verdeMax: number;
  amarelaMin: number;
  amarelaMax: number;
}

export interface WeighingSession {
  lineId: string;
  lote: number;
  idProduto: number;
  idColaborador: number;
  quantidade: string;
  faixa: FaixaPeso;
  status: StatusSessao;
  ultimoErro: string | null;
  tentativasErro: number;
  iniciada: string;
  concluida: string | null;
  idSessaoDB: string | null;
}

export interface PesagemItem {
  idPesagem: string;
  nrRastreabilidade: string;
  dtPesagem: string;
  vlPesoBruto: number;
  vlPeso: number;
  vlTara: number;
  dsUnidade: string;
  nrResultadoComparacao: number | null;
  idOperador: number | null;
  dsOperador: string | null;
  lote: number;
}

export interface SessaoHistoricoItem {
  idSessao: string;
  lote: number;
  cdProduto: string;
  dsProduto: string;
  idColaborador: number;
  dsColaborador: string;
  status: string;
  iniciada: string;
  concluida: string | null;
  total: number;
  verde: number;
  amarela: number;
  fora: number;
}

export interface RastreabilidadeItem {
  idPesagem: string;
  nrRastreabilidade: string;
  dtPesagem: string;
  vlPesoBruto: number;
  vlTara: number;
  dsUnidade: string;
  nrResultadoComparacao: number | null;
  operador: string;
  lote: number;
  cdProduto: string;
  dsProduto: string;
  fabricacao: string;
  validade: string;
  linhaNome: string;
}

export interface Impressora {
  id: string;
  nome: string;
  ip: string;
  porta: number;
  linguagem: string;
  codePage: string;
  dpi: number;
  larguraMm: number;
  alturaMm: number;
  descricao: string | null;
  ativa: boolean;
}

export interface LinhaCadastro {
  id: string;
  nome: string;
  ip: string;
  porta: number;
  timeoutConnMs: number;
  timeoutReadMs: number;
  idImpressora: string | null;
  impressoraNome: string | null;
  ativa: boolean;
}

export interface WeightReading {
  lineId: string;
  plataforma: string | null;
  peso: number;
  pesoBruto: number;
  tara: number;
  estavel: boolean;
  liquido: boolean;
  dentroFaixa: boolean;
  zeroCapturado: boolean;
  unidade: string;
  modoContinuo: boolean;
  resultado: number;
}

export interface LabelPrintRequest {
  cdProduto: string;
  produto: string;
  codigoBarra: string;
  lote: number;
  fabricacao: string;
  validade: string;
  quantidade: string;
  data: string;
  operador: string;
  pesoBruto: string;
  nrRastreabilidade: string;
}

// 0=Unknown 1=Verde 2=AmarelaInferior 3=AmarelaSuperior 4=ForaInferior 5=ForaSuperior
export const RESULTADO_LABEL: Record<number, string> = {
  0: '—', 1: 'Verde', 2: 'Amarela ↓', 3: 'Amarela ↑', 4: 'Fora ↓', 5: 'Fora ↑',
};
export const RESULTADO_COR: Record<number, string> = {
  0: '#9ca3af', 1: '#22c55e', 2: '#f59e0b', 3: '#f59e0b', 4: '#ef4444', 5: '#ef4444',
};

export type TipoRelatorio = 'PRODUCAO_DIARIA' | 'QUALIDADE' | 'RASTREABILIDADE' | 'OPERADOR';

export interface RelatorioParametros {
  from?: string;
  to?: string;
  linhaId?: string;
  sessaoId?: string;
  idProduto?: number;
  idColaborador?: number;
}

export interface CriarRelatorioRequest {
  tipo: TipoRelatorio;
  parametros?: RelatorioParametros;
}

export type StatusRelatorio = 'Pendente' | 'Processando' | 'Concluido' | 'Erro';

export interface RelatorioJobResponse {
  idJob: string;
  tipo: string;
  status: StatusRelatorio;
  dtSolicitado: string;
  dtIniciado: string | null;
  dtConcluido: string | null;
  downloadUrl: string | null;
  erro: string | null;
}

export interface ProdutoItem {
  idProduto: number;
  cdProduto: string;
  dsProduto: string;
}

export interface OpData extends ProdutoItem {
  lote: number;
  codigoBarra: string;
  fabricacao: string;
  validade: string;
  qtdPorCaixa: number;
}

export interface ConfigAtual {
  syncPullTimes: string[];
  syncPushTimes: string[];
  syncPullIntervalHoras: number;
  syncPushIntervalHoras: number;
  retentionEnabled: boolean;
  retentionDays: number;
  retryDelaySeconds: number;
  retryMaxAttempts: number;
  comparacaoModoImpressao: string;
  comparacaoAtiva: boolean;
}

export interface ConfigEntry {
  chave: string;
  valor: string;
}
