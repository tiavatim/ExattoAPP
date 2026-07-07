export interface Separacao {
  IdSeparacao: number;
  IdPedidoVenda: number;
  IdUsuario: number;
  DsUsuario: string;
  DsPessoaReduzido: string;
  DtInicio: string;
  DtFim: string | null;
  IdStatus: number;
  DsStatus: string;
  DsObs: string;

  // Dados do sistema (quem criou)
  IdSys: number;
  DsUsuarioSys: string | null;
  DtSys: string | null;

  // Previsão de execução
  DtPrevisaoInicio: string | null;
  DtPrevisaoFim: string | null;

  // Métricas de tempo
  MinutosGastos: number;
  MinutosPrevistos: number;
  DifMintutosPrevisao: number;
  PcUtilizacaoPrevisao: number;

  // Totais
  QtTotalEsperada: number;
  QtTotalSeparada: number;
  QtTotalVendida: number;

  // Desempenho
  PcTotalSeparado: number;

  // Dados do pedido (novos)
  IdCliente: number;
  DsCliente: string;
  IdFilial: number;
  DsFilial: string;
  CdCnpjCpf: string;
  DsNaturezaOperacao: string;
  CmObs: string;
  CdCicloPedido: string | null;
  IdTransportadora: number;
  DsTransportadora: string;
  IdVendedor: number;
  DsVendedor: string;
  DsGrupoLogistica: string;
}
