import { describe, expect, it, vi } from "vitest";
import { listNotifications } from "../../../../src/modules/notifications/application/use-cases/list-notifications.use-case.js";
import { markAllNotificationsRead } from "../../../../src/modules/notifications/application/use-cases/mark-all-notifications-read.use-case.js";
import { markNotificationRead } from "../../../../src/modules/notifications/application/use-cases/mark-notification-read.use-case.js";
import { notificationQuery } from "../../../../src/modules/notifications/presentation/notifications.schema.js";

describe("NOTIF-01", () => {
  it("valida a paginação antes da consulta", async () => {
    const list = vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } });
    const { page, limit } = notificationQuery.parse({});
    await listNotifications({ list }, page, limit);
    expect(list).toHaveBeenCalledWith(1, 20);
    expect(notificationQuery.safeParse({ page: "0", limit: "101" }).success).toBe(false);
  });

  it("retorna 404 quando o identificador não existe para o destinatário", async () => {
    const markRead = vi.fn().mockResolvedValue(false);
    await expect(markNotificationRead({ markRead }, "notification-id"))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(markRead).toHaveBeenCalledWith("notification-id");
  });

  it("solicita a atualização em lote sem identificador", async () => {
    const markRead = vi.fn().mockResolvedValue(true);
    await markAllNotificationsRead({ markRead });
    expect(markRead).toHaveBeenCalledWith();
  });
});
