import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Separacao } from 'src/interfaces/separacao';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';
import PedidoService from 'src/services/pedidoService';
import Toast from 'react-native-toast-message';

interface SeparacaoCardProps {
  separacao: Separacao;
  onIniciar: (id: number) => void;
  onRetomar: (id: number) => void;
}

function parseMicrosoftDate(dateString: string): Date | null {
  const match = /\/Date\((\d+)\)\//.exec(dateString);
  if (match && match[1]) return new Date(Number(match[1]));
  return null;
}

export default function SeparacaoCard({ separacao, onIniciar, onRetomar }: SeparacaoCardProps) {
  const data = parseMicrosoftDate(separacao.DtInicio);
  const previsao = parseMicrosoftDate(separacao.DtPrevisaoFim);
  const dataFormatada = data ? data.toLocaleDateString() : 'Data inválida';

  const estiloTitulo = { fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#163029' };
  const estiloTexto = { fontFamily: 'Sina-Nova-Regular', fontSize: 14, color: '#163029', marginTop: 4 };

  const statusColors: Record<string, string> = {
    'TAREFA INICIADA': '#e6f4ea',
    'TAREFA PAUSADA': '#fff3cd',
    'TAREFA INCLUÍDA': '#e7f1ff',
    'TAREFA FINALIZADA': '#f8d7da',
  };
  const bgColor = statusColors[separacao.DsStatus] || '#fff';

  return (
    <View style={{ backgroundColor: bgColor, marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: 8 }}>
      <Text style={{ ...estiloTitulo, marginBottom: 8 }}>
        {separacao.IdPedidoVenda} - {separacao.DsCliente}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        {/* COLUNA ESQUERDA */}
        <View style={{ flex: 1 }}>
          <Text style={estiloTexto}><Ionicons name="calendar-outline" size={16} /> Início: {dataFormatada}</Text>
          <Text style={estiloTexto}><Feather name="info" size={16} /> Status: {separacao.DsStatus}</Text>
          <Text style={estiloTexto}><Feather name="refresh-cw" size={16} /> Ciclo: {separacao.CdCicloPedido}</Text>
        </View>

        {/* COLUNA DIREITA */}
        <View style={{ flex: 1 }}>
          <Text style={estiloTexto}><MaterialCommunityIcons name="calendar-clock" size={16} /> Previsão: {previsao?.toLocaleDateString() ?? '-'}</Text>
          <Text style={estiloTexto}>
            <MaterialCommunityIcons name="progress-check" size={16} /> Separado: {separacao.QtTotalSeparada ?? 0} de {separacao.QtTotalVendida ?? 0} ({separacao.PcTotalSeparado ?? 0}%)
          </Text>
          {/* ✅ NOVO ÍCONE PARA GRUPO LOGÍSTICA */}
          <Text style={estiloTexto}><Ionicons name="git-network-outline" size={16} /> Grupo: {separacao.DsGrupoLogistica}</Text>
        </View>

        {/* BOTÕES */}
        <View style={{ justifyContent: 'space-between', gap: 8 }}>
          {separacao.DsStatus === 'TAREFA INCLUÍDA' && (
            <TouchableOpacity style={{ backgroundColor: '#2F4B44', padding: 8, borderRadius: 6 }} onPress={() => onIniciar(separacao.IdSeparacao)}>
              <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold' }}><Feather name="play" size={16} /> Iniciar</Text>
            </TouchableOpacity>
          )}

          {(separacao.DsStatus === 'TAREFA INICIADA' || separacao.DsStatus === 'TAREFA PAUSADA') && (
            <TouchableOpacity
              style={{ backgroundColor: '#aaa', padding: 8, borderRadius: 6 }}
              onPress={async () => {
                const ok = await PedidoService.retomarSeparacao(separacao.IdSeparacao);
                if (ok) {
                  Toast.show({ type: 'success', text1: 'Separação retomada com sucesso!' });
                  onRetomar(separacao.IdSeparacao);
                } else {
                  Toast.show({ type: 'error', text1: 'Erro ao retomar separação' });
                }
              }}
            >
              <Text style={{ color: '#fff', fontFamily: 'Sina-Nova-Bold' }}><Feather name="repeat" size={16} /> Retomar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ✅ OBS EM LINHA ABAIXO OCUPANDO TELA TODA */}
      {separacao.DsObs && (
        <View style={{ marginTop: 12 }}>
          <Text style={estiloTexto}>
            <Feather name="alert-circle" size={16} /> Obs: {separacao.DsObs}
          </Text>
        </View>
      )}
    </View>
  );
}
