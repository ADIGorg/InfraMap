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

import * as repo from "../../../../src/modules/forwardings/forwardings.repository.js";
import { forwardOccurrence } from "../../../../src/modules/forwardings/forwardings.service.js";

const userClient = {} as never;

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

    const result = await forwardOccurrence(
      userClient,
      emailSender as never,
      baseOccurrence.id,
      { agencyId: "agency-1" },
    );

    expect(result.status).toBe("SENT");
    expect(result.providerMessageId).toBe("msg-1");
    expect(emailSender.send).toHaveBeenCalledOnce();
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "orgao@example.com" }),
    );
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

    const result = await forwardOccurrence(
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
      forwardOccurrence(userClient, emailSender as never, baseOccurrence.id, {
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
      forwardOccurrence(userClient, emailSender as never, baseOccurrence.id, {
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
      forwardOccurrence(userClient, emailSender as never, "occ-x", {
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

    await forwardOccurrence(userClient, emailSender as never, baseOccurrence.id, {
      agencyId: "agency-1",
      observations: "Prioridade",
    });

    const emailPayload = emailSender.send.mock.calls[0]?.[0];
    expect(emailPayload?.body.text).toContain("Prioridade");
    expect(emailPayload?.subject).not.toContain("Prioridade");
  });
});