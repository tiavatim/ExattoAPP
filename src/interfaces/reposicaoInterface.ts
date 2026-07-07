export interface Reposicao {
  IdReposicao: number;
  IdRepositor: number;
  DsRepositor: string;

  IdProduto: number;
  CdProduto: string;
  DsProduto: string;

  IdLocal: number;
  CdLocal: string;
  DsLocal: string;

  QtQuantidade: number;
  DtInicio: string | null;
  DtFim: string | null;

  IdStatus: number;
  DsStatus: string;

  IdSys: number;
  DsUsuario: string;
  DtSys: string;

  DsUrlImage: string;
 DsStatusRelacionado: string;
}
