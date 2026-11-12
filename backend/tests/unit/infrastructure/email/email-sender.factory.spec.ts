import { describe, expect, it } from "vitest";

import { createEmailSender } from "../../../../src/infrastructure/email/email-sender.factory.js";
import { MockEmailProvider } from "../../../../src/infrastructure/email/providers/mock-email.provider.js";

describe("FWD-01 - createEmailSender", () => {
  it("seleciona MockEmailProvider quando EMAIL_PROVIDER=mock (default)", () => {
    // tests/setup.ts define EMAIL_PROVIDER=mock antes de qualquer import.
    expect(createEmailSender()).toBeInstanceOf(MockEmailProvider);
  });
});