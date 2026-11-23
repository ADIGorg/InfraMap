/**
 * Remove trechos citados por clientes de e-mail conhecidos.
 * Uso exclusivo na apresentação: o texto original permanece no banco.
 * Não é possível distinguir com 100% de certeza citações e respostas inline.
 */
export function extractReplyText(body: string): string {
  const normalized = body.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  const lines = normalized.split('\n');
  let end = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim();
    const next = (lines[i + 1] ?? '').trim();
    const afterNext = (lines[i + 2] ?? '').trim();

    // Gmail (português/inglês): "Em ... escreveu:" / "On ... wrote:"
    const gmailAttribution = /^(?:Em\s+.{3,250}\s+escreveu:|On\s+.{3,250}\s+wrote:)$/i.test(line);
    // Outlook e similares: cabeçalho de mensagem anterior.
    const outlookHeader = /^(?:De|From):\s*\S/i.test(line) &&
      (/^(?:Enviado|Sent|Data|Date|Para|To):\s*\S/i.test(next) ||
       (/^\s*$/.test(next) && /^(?:Enviado|Sent|Data|Date|Para|To):\s*\S/i.test(afterNext)));
    const originalSeparator = /^-{2,}\s*(?:Original Message|Mensagem original)\s*-{2,}$/i.test(line) ||
      /^_{8,}$/.test(line);
    // Bloco de linhas citadas: remove quando aparece após texto novo.
    const quotedBlock = /^>/.test(line) && (i === 0 || (lines[i - 1] ?? '').trim() === '');

    if (gmailAttribution || outlookHeader || originalSeparator || quotedBlock) {
      end = i;
      break;
    }
  }

  return lines.slice(0, end).join('\n').trim();
}
