import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DashboardLinha, StatusSessao } from '@/interfaces/ti400Interface';

const FUNDO: Record<StatusSessao, string> = {
  Aguardando: '#fff9e6',
  Imprimindo: '#e7f1ff',
  Concluido:  '#e6f4ea',
  Erro:       '#fde8e8',
  Cancelado:  '#f0f0f0',
};

const DOT: Record<StatusSessao, string> = {
  Aguardando: '#f59e0b',
  Imprimindo: '#3b82f6',
  Concluido:  '#22c55e',
  Erro:       '#ef4444',
  Cancelado:  '#9ca3af',
};

const LABEL: Record<StatusSessao, string> = {
  Aguardando: 'AGUARDANDO',
  Imprimindo: 'IMPRIMINDO',
  Concluido:  'CONCLUÍDO',
  Erro:       'ERRO',
  Cancelado:  'CANCELADO',
};

function horaFormatada(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  linha: DashboardLinha;
  loadingId: string | null;
  onIniciar:  (linhaId: string) => void;
  onCancelar: (linhaId: string) => void;
  onRetry:    (linhaId: string) => void;
  onVer:      (linhaId: string) => void;
}

export default function LinhaCard({ linha, loadingId, onIniciar, onCancelar, onRetry, onVer }: Props) {
  const { linhaId, linhaNome, sessao } = linha;
  const isLoading   = loadingId === linhaId;
  const status      = sessao?.status;
  const cardBg      = status ? FUNDO[status] : '#f5f5f0';
  const borderColor = status === 'Erro' ? '#ef4444' : '#e0ddd4';

  const podeIniciar  = !sessao || status === 'Concluido' || status === 'Cancelado';
  const podeRetry    = status === 'Erro';
  const podeCancelar = status === 'Aguardando' || status === 'Imprimindo' || status === 'Erro';

  return (
    <View style={{
      backgroundColor: cardBg,
      borderRadius: 10,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor,
      elevation: 2,
    }}>
      {/* Cabeçalho: nome da linha + badge de status + botão Ver */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 16, color: '#163029', flex: 1 }}>
          {linhaNome}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {status ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: DOT[status] }} />
              <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 12, color: DOT[status] }}>
                {LABEL[status]}
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#9ca3af' }}>
              SEM SESSÃO
            </Text>
          )}

          <Pressable
            onPress={() => onVer(linhaId)}
            hitSlop={10}
            style={{ padding: 4 }}
          >
            <Feather name="chevron-right" size={20} color="#2F4B44" />
          </Pressable>
        </View>
      </View>

      {/* Dados da sessão ativa */}
      {sessao && (
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="tag" size={13} color="#2F4B44" />
              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#2F4B44' }}>
                OP {sessao.lote}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="user" size={13} color="#2F4B44" />
              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#2F4B44' }}>
                {sessao.dsColaborador || 'Colaborador'} · ID {sessao.idColaborador}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Feather name="clock" size={13} color="#2F4B44" />
              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 13, color: '#2F4B44' }}>
                {horaFormatada(sessao.iniciada)}
              </Text>
            </View>
          </View>

          {sessao.ultimoErro && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4 }}>
              <Feather name="alert-circle" size={13} color="#ef4444" style={{ marginTop: 1 }} />
              <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#ef4444', flex: 1 }}>
                {sessao.ultimoErro}
              </Text>
            </View>
          )}

          {sessao.tentativasErro > 0 && (
            <Text style={{ fontFamily: 'Sina-Nova-Regular', fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
              Tentativas: {sessao.tentativasErro}
            </Text>
          )}
        </View>
      )}

      {/* Botões de ação */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {podeIniciar && (
          <Pressable
            onPress={() => onIniciar(linhaId)}
            disabled={isLoading}
            style={{
              flex: 1,
              backgroundColor: '#163029',
              paddingVertical: 10,
              borderRadius: 6,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isLoading
              ? <ActivityIndicator color="#d1ccbd" size="small" />
              : (
                <>
                  <Feather name="play" size={15} color="#d1ccbd" />
                  <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#d1ccbd' }}>
                    {sessao ? 'Nova Sessão' : 'Iniciar Sessão'}
                  </Text>
                </>
              )
            }
          </Pressable>
        )}

        {podeRetry && (
          <Pressable
            onPress={() => onRetry(linhaId)}
            disabled={isLoading}
            style={{
              flex: 1,
              backgroundColor: '#f59e0b',
              paddingVertical: 10,
              borderRadius: 6,
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <Feather name="refresh-cw" size={15} color="#fff" />
                  <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#fff' }}>
                    Retry
                  </Text>
                </>
              )
            }
          </Pressable>
        )}

        {podeCancelar && (
          <Pressable
            onPress={() => onCancelar(linhaId)}
            disabled={isLoading}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#163029',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isLoading
              ? <ActivityIndicator color="#163029" size="small" />
              : (
                <>
                  <Feather name="x" size={15} color="#163029" />
                  <Text style={{ fontFamily: 'Sina-Nova-Bold', fontSize: 14, color: '#163029' }}>
                    Cancelar
                  </Text>
                </>
              )
            }
          </Pressable>
        )}
      </View>
    </View>
  );
}
