export interface ProdutoCompleto {
  Id_Produto: number;
  Cd_Produto: string;
  Ds_Produto: string;
  Qt_Vendida: number;
  Ds_Produto_Lingua_Estrangeira: string | null;
  Ds_LocalProduto: string | null;
  Vl_Peso: number;
  Vl_ProdutoPreco: number;
  Vl_ProdutoPrecoTotal: number;
  Secao: string | null;
  Id_Local: number;
  WarehouseCode: string | null;
  ZoneCode: string | null;
  AisleCode: string | null;
  RackCode: number;
  ShelfCode: number;
  BinCode: string | null;
  IdOrder: number;
  Ds_UrlImage: string;
  stock_quantity: number;
}
