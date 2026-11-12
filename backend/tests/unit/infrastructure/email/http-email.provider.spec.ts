import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  HttpEmailProvider,
} from "../../../../src/infrastructure/email/providers/http-email.provider.js";

const config = {
  apiUrl: "https://api.example.com/emails",
  apiKey: "test-key",
  from: "noreply@example.com",
};

const input = {
  to: "dest@example.com",
  subject: "Ocorrência #123",
  body: {
    text: "Descrição da ocorrência...",
  },
};

function mockResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("FWD-01 - HttpEmailProvider", () => {
  it("envia e retorna providerMessageId (Resend)", async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(mockResponse({ id: "resend-id-123" }));

    const provider = new HttpEmailProvider(config, http);
    const result = await provider.send(input);

    expect(result).toEqual({
      status: "SENT",
      providerMessageId: "resend-id-123",
    });
    expect(http).toHaveBeenCalledOnce();
  });

  it("tolera resposta sem id — SENT sem providerMessageId", async () => {
    const http = vi.fn<typeof fetch>().mockResolvedValue(mockResponse({}));

    const provider = new HttpEmailProvider(config, http);
    const result = await provider.send(input);

    expect(result).toEqual({ status: "SENT" });
  });

  it("retorna FAILED em erro HTTP 4xx", async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(mockResponse({ error: "invalid" }, 422));

    const provider = new HttpEmailProvider(config, http);
    const result = await provider.send(input);

    expect(result).toEqual({
      status: "FAILED",
      errorCode: "EMAIL_PROVIDER_CLIENT_ERROR",
    });
  });

  it("retorna FAILED em erro HTTP 5xx", async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(mockResponse({ error: "down" }, 503));

    const provider = new HttpEmailProvider(config, http);
    const result = await provider.send(input);

    expect(result).toEqual({
      status: "FAILED",
      errorCode: "EMAIL_PROVIDER_SERVER_ERROR",
    });
  });

  it("retorna FAILED em falha de rede", async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("network error"));

    const provider = new HttpEmailProvider(config, http);
    const result = await provider.send(input);

    expect(result).toEqual({
      status: "FAILED",
      errorCode: "EMAIL_PROVIDER_NETWORK",
    });
  });

  it("lança 400 para destinatário inválido", async () => {
    const http = vi.fn<typeof fetch>();
    const provider = new HttpEmailProvider(config, http);

    await expect(
      provider.send({ ...input, to: "not-an-email" }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "EMAIL_INVALID_INPUT",
    });
    expect(http).not.toHaveBeenCalled();
  });

  it("lança 400 para assunto vazio", async () => {
    const http = vi.fn<typeof fetch>();
    const provider = new HttpEmailProvider(config, http);

    await expect(
      provider.send({ ...input, subject: "   " }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "EMAIL_INVALID_INPUT",
    });
    expect(http).not.toHaveBeenCalled();
  });

  it("lança 400 para assunto acima do limite", async () => {
    const http = vi.fn<typeof fetch>();
    const provider = new HttpEmailProvider(config, http);

    await expect(
      provider.send({ ...input, subject: "x".repeat(201) }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "EMAIL_INVALID_INPUT",
    });
    expect(http).not.toHaveBeenCalled();
  });

  it("lança 400 para corpo vazio", async () => {
    const http = vi.fn<typeof fetch>();
    const provider = new HttpEmailProvider(config, http);

    await expect(
      provider.send({ ...input, body: { text: "   " } }),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "EMAIL_INVALID_INPUT",
    });
    expect(http).not.toHaveBeenCalled();
  });

  it("inclui html no payload quando fornecido", async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(mockResponse({ id: "id" }));

    const provider = new HttpEmailProvider(config, http);
    await provider.send({
      ...input,
      body: { text: "text", html: "<p>html</p>" },
    });

    const call = http.mock.calls[0];
    expect(call).toBeDefined();
    const body = JSON.parse((call![1]!.body as string));
    expect(body.html).toBe("<p>html</p>");
    expect(body.text).toBe("text");
    expect(body.from).toBe("noreply@example.com");
    expect(body.to).toBe("dest@example.com");
  });

  it("omite html do payload quando ausente", async () => {
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValue(mockResponse({ id: "id" }));

    const provider = new HttpEmailProvider(config, http);
    await provider.send(input);

    const call = http.mock.calls[0];
    const body = JSON.parse((call![1]!.body as string));
    expect(body.html).toBeUndefined();
  });
});