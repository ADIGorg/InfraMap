import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "../../../../src/modules/forwardings/forwardings.repository.js",
  () => ({
    findAgency: vi.fn(),
    getOccurrenceForEmail: vi.fn(),
    createForwarding: vi.fn(),
    recordForwardingResult: vi.fn(),
    listForwardingsByOccurrence: vi.fn(),
  }),
);

vi.mock("../../../../src/modules/forwardings/forwarding-pdf.service.js", () => ({
  createForwardingPdfAttachment: vi.fn().mockResolvedValue({
    filename: "InfraMap-Ocorrencia-11111111.pdf",
    contentType: "application/pdf",
    contentBase64: "JVBERi0xLjQK",
  }),
}));
vi.mock("../../../../src/infrastructure/geocoding/reverse-geocode.js", () => ({
  reverseGeocodeForEmail: vi.fn().mockResolvedValue(null),
}));
import { reverseGeocodeForEmail } from "../../../../src/infrastructure/geocoding/reverse-geocode.js";
import * as repo from "../../../../src/modules/forwardings/forwardings.repository.js";
import { forwardOccurrence } from "../../../../src/modules/forwardings/forwardings.service.js";

const userClient = {} as never;
const adminClient = {} as never;
function forwardOccurrenceForTest(
  client: Parameters<typeof forwardOccurrence>[0],
  sender: Parameters<typeof forwardOccurrence>[1],
  id: Parameters<typeof forwardOccurrence>[2],
  input: Parameters<typeof forwardOccurrence>[3],
) {
  return forwardOccurrence(client, sender, id, input, adminClient);
}

const baseAgency = {
  id: "agency-1",
  name: "Órgão Teste",
  email: "orgao@example.com",
  isActive: true,
};

const baseOccurrence = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "CONFIRMED",
  categoryCode: "CAT03",
  categoryName: "Pavimentação e Vias",
  description: "Buraco na via",
  location: { lat: -23.55, lng: -46.63 },
  createdAt: "2026-11-12T14:30:00Z",
};

const baseForwardingRow = {
  id: "fwd-1",
  occurrenceId: baseOccurrence.id,
  agencyId: "agency-1",
  adminId: "admin-1",
  recipientEmail: "orgao@example.com",
  subject: "InfraMap — Ocorrência #11111111 (Pavimentação e Vias)",
  observations: null,
  status: "SENT" as const,
  providerMessageId: "msg-1",
  errorCode: null,
  createdAt: "2026-11-12T14:30:00Z",
  sentAt: "2026-11-12T14:30:01Z",
};

function mockEmailSender() {
  return { send: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FWD-02 — forwardOccurrence", () => {
  it("registra SENT quando o provedor retorna sucesso", async () => {
    const emailSender = mockEmailSender();
    vi.mocked(repo.findAgency).mockResolvedValue(baseAgency);
    vi.mocked(repo.getOccurrenceForEmail).mockResolvedValue(baseOccurrence);
    vi.mocked(repo.createForwarding).mockResolvedValue("fwd-1");
    emailSender.send.mockResolvedValue({
      status: "SENT",
      providerMessageId: "msg-1",
    });
    vi.mocked(repo.recordForwardingResult).mockResolvedValue(baseForwardingRow);

    const result = await forwardOccurrenceForTest(
      userClient,
      emailSender as never,
      baseOccurrence.id,
      { agencyId: "agency-1" },
    );

    expect(result.status).toBe("SENT");
    expect(result.providerMessageId).toBe("msg-1");
    expect(emailSender.send).toHaveBeenCalledOnce();
    const firstEmail = emailSender.send.mock.calls[0]?.[0];
    expect(firstEmail?.body.text).toContain("Endereço aproximado: Não identificado");
    expect(firstEmail?.body.text).toContain("https://www.google.com/maps/search/?api=1&query=-23.550000%2C-46.630000");
    expect(firstEmail?.body.html).toContain("Abrir localização no Google Maps");
    expect(emailSender.send).toHaveBeenCalledWith(expect.objectContaining({
      attachments: [expect.objectContaining({
        filename: "InfraMap-Ocorrencia-11111111.pdf",
        content: "JVBERi0xLjQK",
        contentType: "application/pdf",
      })],
    }));
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "orgao@example.com" }),
    );
  });

  it("inclui endereço aproximado disponível no e-mail", async () => {
    vi.mocked(reverseGeocodeForEmail).mockResolvedValueOnce("Rua de Teste, 10 | Centro | São Paulo - SP | CEP 01000-000");
    const sender = mockEmailSender();
    vi.mocked(repo.findAgency).mockResolvedValue(baseAgency);
    vi.mocked(repo.getOccurrenceForEmail).mockResolvedValue(baseOccurrence);
    vi.mocked(repo.createForwarding).mockResolvedValue("fwd-1");
    sender.send.mockResolvedValue({ status: "SENT", providerMessageId: "msg-1" });
    vi.mocked(repo.recordForwardingResult).mockResolvedValue(baseForwardingRow);
    await forwardOccurrenceForTest(userClient, sender as never, baseOccurrence.id, { agencyId: "agency-1" });
    const payload = sender.send.mock.calls[0]?.[0];
    expect(payload?.body.text).toContain("Rua de Teste, 10");
    expect(payload?.body.html).toContain("CEP 01000-000");
  });

  it("registra FAILED quando o provedor retorna falha, sem quebrar", async () => {
    const emailSender = mockEmailSender();
    vi.mocked(repo.findAgency).mockResolvedValue(baseAgency);
    vi.mocked(repo.getOccurrenceForEmail).mockResolvedValue(baseOccurrence);
    vi.mocked(repo.createForwarding).mockResolvedValue("fwd-1");
    emailSender.send.mockResolvedValue({
      status: "FAILED",
      errorCode: "EMAIL_PROVIDER_SERVER_ERROR",
    });
    vi.mocked(repo.recordForwardingResult).mockResolvedValue({
      ...baseForwardingRow,
      status: "FAILED",
      providerMessageId: null,
      errorCode: "EMAIL_PROVIDER_SERVER_ERROR",
      sentAt: null,
    });

    const result = await forwardOccurrenceForTest(
      userClient,
      emailSender as never,
      baseOccurrence.id,
      { agencyId: "agency-1" },
    );

    expect(result.status).toBe("FAILED");
    expect(result.errorCode).toBe("EMAIL_PROVIDER_SERVER_ERROR");
  });

  it("rejeita órgão inativo (409) sem criar forwarding", async () => {
    const emailSender = mockEmailSender();
    vi.mocked(repo.findAgency).mockResolvedValue({
      ...baseAgency,
      isActive: false,
    });

    await expect(
      forwardOccurrenceForTest(userClient, emailSender as never, baseOccurrence.id, {
        agencyId: "agency-1",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(repo.createForwarding).not.toHaveBeenCalled();
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it("rejeita ocorrência não CONFIRMED (409) sem criar forwarding", async () => {
    const emailSender = mockEmailSender();
    vi.mocked(repo.findAgency).mockResolvedValue(baseAgency);
    vi.mocked(repo.getOccurrenceForEmail).mockResolvedValue({
      ...baseOccurrence,
      status: "IN_SERVICE",
    });

    await expect(
      forwardOccurrenceForTest(userClient, emailSender as never, baseOccurrence.id, {
        agencyId: "agency-1",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(repo.createForwarding).not.toHaveBeenCalled();
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it("rejeita ocorrência inexistente (404)", async () => {
    const emailSender = mockEmailSender();
    vi.mocked(repo.findAgency).mockResolvedValue(baseAgency);
    vi.mocked(repo.getOccurrenceForEmail).mockResolvedValue(null);

    await expect(
      forwardOccurrenceForTest(userClient, emailSender as never, "occ-x", {
        agencyId: "agency-1",
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("inclui observations no assunto? — não; observations só vão no corpo", async () => {
    const emailSender = mockEmailSender();
    vi.mocked(repo.findAgency).mockResolvedValue(baseAgency);
    vi.mocked(repo.getOccurrenceForEmail).mockResolvedValue(baseOccurrence);
    vi.mocked(repo.createForwarding).mockResolvedValue("fwd-1");
    emailSender.send.mockResolvedValue({ status: "SENT", providerMessageId: "m" });
    vi.mocked(repo.recordForwardingResult).mockResolvedValue({
      ...baseForwardingRow,
      observations: "Prioridade",
    });

    await forwardOccurrenceForTest(userClient, emailSender as never, baseOccurrence.id, {
      agencyId: "agency-1",
      observations: "Prioridade",
    });

    const emailPayload = emailSender.send.mock.calls[0]?.[0];
    expect(emailPayload?.body.text).toContain("Prioridade");
    expect(emailPayload?.subject).not.toContain("Prioridade");
  });
});