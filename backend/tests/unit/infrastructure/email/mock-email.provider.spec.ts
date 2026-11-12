import { describe, expect, it } from "vitest";

import { MockEmailProvider } from "../../../../src/infrastructure/email/providers/mock-email.provider.js";

const input = {
  to: "dest@example.com",
  subject: "Teste",
  body: { text: "Corpo" },
};

describe("FWD-01 - MockEmailProvider", () => {
  it("retorna SENT com providerMessageId fixo", async () => {
    const provider = new MockEmailProvider();
    const result = await provider.send(input);

    expect(result).toEqual({
      status: "SENT",
      providerMessageId: "mock-message-id",
    });
  });

  it("lança 400 para destinatário inválido", async () => {
    const provider = new MockEmailProvider();

    await expect(
      provider.send({ ...input, to: "invalid" }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "EMAIL_INVALID_INPUT",
    });
  });
});