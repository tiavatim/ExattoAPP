export interface ProdutoSeparacao {
  // Dados do pedido
  idPedidoVenda: number;
  dtPedidoVenda: string;
  cdCpfCnpj: string;
  DsCliente: string;
  dsNaturezaOperacao: string;
  CdProduto: string;
  DsProduto: string;
  QtVendida: number;
  dsStatus: string;
  dsFilial: string;
  dsTransacaoEstoque: string;
  idCliente: number;
  idFilial: number;
  idStatus: number;
  idItemPedidoVenda: number;
  IdProdutoPedido: number;
  idTransacaoEstoque: number;
  dsPessoaReduzido: string;
  cmObs: string;
  dsGrupoLogistica: string;
  dtAprovacao: string;
  ciclo: string;
  localSeparacao: string;
  idLocal: number;

  // Localização fixa
  WarehouseCode: string;
  ZoneCode: string;
  AisleCode: string;
  RackCode: number;
  ShelfCode: number;
  BinCode: string;
  PickingOrder: number;

  // Imagem e estoque
  ImageUrl: string;
  StockQuantity: number;

  // Dados da separação
  IdSeparacao: number;
  idSeparacaoProduto: number;
  idUsuario: number;
  dsUsuario: string;
  QtSeparada: number;
  QtEsperada: number;
  dtHoraSeparacao: string | null;
  IdLocalizacao: number;
  DsLocalizacao: string;

  // Métricas
  percSeparado: number;
  qtDiferenca: number;
  minutosItem: number;
  minutosTotalSeparacao: number;
  totalSeparadoPorSeparacao: number;
  TotalItensPorSeparacao: number;
}
