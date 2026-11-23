import { describe, expect, it } from 'vitest';
import { extractReplyText } from './extract-reply-text';

describe('extractReplyText', () => {
  it('mostra só a resposta antes da citação do Gmail em português', () => {
    const text = 'Vamos realizar a vistoria.\n\nEm seg., 23 de nov. de 2026 às 08:12, InfraMap <inframap@example.com> escreveu:\n> Ocorrência encaminhada';
    expect(extractReplyText(text)).toBe('Vamos realizar a vistoria.');
  });

  it('remove mensagem citada do Gmail em inglês', () => {
    expect(extractReplyText('Received.\n\nOn Mon, Nov 23, 2026 at 8 AM Sender wrote:\n> Original')).toBe('Received.');
  });

  it('remove o cabeçalho de mensagem anterior do Outlook', () => {
    expect(extractReplyText('Providência iniciada.\n\nDe: InfraMap <x@example.com>\nEnviado: segunda-feira\nPara: secretaria')).toBe('Providência iniciada.');
  });

  it('remove bloco citado com >', () => {
    expect(extractReplyText('A equipe foi acionada.\n\n> Relatório enviado\n> Mais informações')).toBe('A equipe foi acionada.');
  });

  it('preserva respostas sem trechos citados', () => {
    expect(extractReplyText('  Resposta simples\r\nCom segunda linha  ')).toBe('Resposta simples\nCom segunda linha');
  });

  it('não retorna a mensagem original se o corpo for só uma citação', () => {
    expect(extractReplyText('> Mensagem antiga\n> Outra linha')).toBe('');
  });
});
