import { z } from "zod";

const level = z.enum(["MASTER", "OPERATIONAL"]);
export const createAdminSchema = z.strictObject({
  name: z.string().trim().min(1).max(150),
  email: z.email().max(254),
  password: z.string().min(8).max(72),
  admin_level: level,
});
export const updateAdminSchema = z.strictObject({
  admin_level: level.optional(),
  is_active: z.boolean().optional(),
}).refine(value => Object.keys(value).length > 0, "Informe nível ou situação.");
export const adminIdSchema = z.object({ id: z.uuid() });
