export interface EquipamentoHost {
IdEquipamento: number;
  TpEquipamento: string;
  DsEquipamento: string;
  DsIpEquipamento: string;
  IdHost: number;
  IdBancada?: number | null;
  DsLocalEquipamento: string;
  DsCategoriaEquipamento: string;
  DsStatus: string;
  CdHost: string;
  DsHost: string;
  DsIpHost: string;
  DsSenhaCert?: string;
  CdPortaHttp: string;
  CdPortaHttps: string;
  DsLocalHost: string;
  DsNumeroSerie?: string;
  DsCategoriaHost?: string;
}