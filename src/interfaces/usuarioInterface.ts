export interface UsuarioInterfaceProps {
  id: number;
  dsPessoa: string;
  dsSetor: string;
  noDiretoria: string;
  rotasPermitidas?: string[];
  loginTimestamp?: number;
}

export default UsuarioInterfaceProps;
