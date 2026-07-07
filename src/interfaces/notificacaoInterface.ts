// src/interfaces/notificacaoInterface.ts
export interface Notificacao {
  IdNotificacao: number;

  IdUsuarioOrigem?: number;
  DsUsuarioOrigem?: string;

  IdUsuarioDestino?: number;
  DsUsuarioDestino?: string;

  DsAssunto: string;
  DsTexto: string;
  DsLink?: string;

  IdStatus?: number;
  DsStatus?: string;

  DtNotificar?: string | null;
  DtSys: string;

  IdSys: number;
  DsSys?: string;
}
