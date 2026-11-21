import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { createForwardingPdfAttachment, generateForwardingPdf } from "../../../../src/modules/forwardings/forwarding-pdf.service.js";

const photo = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAIAAADZF8uwAAAAFklEQVR4nGMUiqpiIASYCKoYVTQAigCjTwD+/ukiGgAAAABJRU5ErkJggg==", "base64");
const occurrence = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "CONFIRMED",
  categoryCode: "CAT03",
  categoryName: "Pavimentação e Vias",
  description: "Buraco na via pública",
  priority: "HIGH" as const,
  location: { lat: -12.300714, lng: -38.951828 },
  createdAt: "2026-11-20T12:20:00Z",
  photos: [{ storagePath: "occurrences/example/photo-1.png", mimeType: "image/png", sizeBytes: photo.length, position: 1 }],
};
const input = {
  occurrence, agencyName: "Secretaria de Obras", address: "Rua de Exemplo | Feira de Santana - BA",
  observations: "Favor verificar as condições da via.",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=-12.300714%2C-38.951828",
  emittedAt: new Date("2026-11-21T09:00:00Z"),
};
describe("relatório PDF de encaminhamento", () => {
  it("gera PDF válido com página de evidência", async () => {
    const bytes = await generateForwardingPdf(input, [{ position: 1, mimeType: "image/png", bytes: photo }]);
    expect(Buffer.from(bytes.subarray(0, 5)).toString("ascii")).toBe("%PDF-");
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(2);
  });
  it("baixa fotos do Storage privado e retorna anexo base64", async () => {
    const download = vi.fn().mockResolvedValue({ data: new Blob([photo], { type: "image/png" }), error: null });
    const storageClient = { storage: { from: vi.fn().mockReturnValue({ download }) } } as never;
    const attachment = await createForwardingPdfAttachment(storageClient, input);
    expect(download).toHaveBeenCalledWith("occurrences/example/photo-1.png");
    expect(attachment.filename).toBe("InfraMap-Ocorrencia-11111111.pdf");
    expect(attachment.contentType).toBe("application/pdf");
    expect(Buffer.from(attachment.contentBase64, "base64").subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
  it("recusa PDF quando a evidência não está disponível", async () => {
    const download = vi.fn().mockResolvedValue({ data: null, error: new Error("objeto não encontrado") });
    const storageClient = { storage: { from: vi.fn().mockReturnValue({ download }) } } as never;
    await expect(createForwardingPdfAttachment(storageClient, input)).rejects.toMatchObject({
      code: "REPORT_PHOTO_UNAVAILABLE", statusCode: 409,
    });
  });
  it("recusa relatório sem fotografias", async () => {
    const storageClient = { storage: { from: vi.fn() } } as never;
    await expect(createForwardingPdfAttachment(storageClient, { ...input, occurrence: { ...occurrence, photos: [] } }))
      .rejects.toMatchObject({ code: "REPORT_PHOTOS_MISSING", statusCode: 409 });
  });
});
