export interface ItemSeparacao {
  produto: string;
  idProduto: number;
  codigo: string;
  quantidade: number;
  local: {
    aisle: string;
    rack: number;
    shelf: number;
    bin: string;
    pickingOrder: number;
    ds_LocalProduto: string;
    idLocalProduto: number;
    urlImagem : string;
  };
  separado: boolean;
}
