import { describe, expect, it, vi } from "vitest";
import { HttpEmailProvider } from "../../../../src/infrastructure/email/providers/http-email.provider.js";

describe("Resend HTTP — PDF em anexo", () => {
  it("transmite o PDF em base64 no campo attachments", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email-id-123" }), {
      status: 200, headers: { "content-type": "application/json" },
    }));
    const provider = new HttpEmailProvider({
      apiUrl: "https://api.resend.com/emails", apiKey: "test_key", from: "onboarding@resend.dev",
    }, request as unknown as typeof fetch);
    const result = await provider.send({
      to: "recipient@example.com", subject: "Encaminhamento InfraMap",
      body: { text: "Relatório em anexo", html: "<p>Relatório em anexo</p>" },
      attachments: [{ filename: "relatorio.pdf", content: "JVBERi0xLjQK", contentType: "application/pdf" }],
    });
    expect(result).toMatchObject({ status: "SENT", providerMessageId: "email-id-123" });
    const call = request.mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.attachments).toEqual([{
      filename: "relatorio.pdf", content: "JVBERi0xLjQK", content_type: "application/pdf",
    }]);
  });
});
