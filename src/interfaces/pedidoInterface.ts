export interface PedidoInterface {
  Id_PedidoVenda: number;
  Dt_PedidoVenda: string;
  Dt_AprovacaoPedidoVenda: string;
  Vl_PedidoVenda: number;
  Vl_Acressimo: number;
  Vl_Desconto: number;
  Vl_Frete: number;
  Id_Status: number;
  Ds_Status: string;
  Ds_Natureza: string | null;
  Ds_CanalNegocio: string | null;
  Ds_CondicaoPagamento: string;
  Cm_Obs: string;
  Id_GrupoLogistica: number;
  Ds_GrupoLogistica: string;
  Id_CicloPeiddo: number;
  Ds_CicloPeiddo: string;

  Transacao: {
    Id_TransacaoExtrato: number | null;
    Id_ContasPagarParcela: number;
    Fornecedor: string | null;
    Cd_Titulo: string | null;
    Data: string;
    Dt_Vencimento: string;
    Descricao: string;
    Tipo: string | null;
    Valor: number;
    Valor_Exatto: number;
    Id_Status: number;
    Ds_Status: string | null;
    Tp_Provisao: string | null;
  };

  Cliente: {
    Id_Pessoa: number;
    Ds_Pessoa: string;
    Cd_Documento: string;
    Id_TipoCliente: number;
    Ds_TipoCliente: string;
    Endereco: {
      Id_PessoaEndereco: number;
      Ds_Logradouro: string;
      Nr_Endereco: string;
      Ds_Bairro: string;
      Ds_Cidade: string;
      Ds_Pais: string | null;
      Cd_Cep: string;
      Cd_Uf: string;
    };
    Contato: any;
  };

  ClienteEndereco: any;

  Vendedor: {
    Id_Pessoa: number;
    Ds_Pessoa: string;
    Cd_Documento: string | null;
    Id_TipoCliente: number;
    Ds_TipoCliente: string | null;
    Endereco: any;
    Contato: any;
  };

  Transportadora: {
    Id_Pessoa: number;
    Ds_Pessoa: string;
    Cd_Documento: string | null;
    Id_TipoCliente: number;
    Ds_TipoCliente: string | null;
    Endereco: any;
    Contato: any;
  };

  Filial: {
    Id_Filial: number;
    Ds_Filial: string;
    Cd_Documento: string | null;
    Endereco: any;
    Contato: any;
  };

  Itens: {
    Qt_Vendida: number;
    Vl_Venda: number;
    Produto: {
      Id_Produto: number;
      Cd_Produto: string;
      Ds_Produto: string;
      Qt_Vendida: number;
      Ds_Produto_Lingua_Estrangeira: string | null;
      Ds_LocalProduto: string;
      Vl_Peso: number;
      Vl_ProdutoPreco: number;
      Vl_ProdutoPrecoTotal: number;
      Secao: any;
      Id_Local: number;
      WarehouseCode: string;
      ZoneCode: string;
      AisleCode: string;
      RackCode: number;
      ShelfCode: number;
      BinCode: string;
      IdOrder: number;
      Ds_UrlImage: string;
      stock_quantity: number;
    };
  }[];
}
