
import { z } from "zod";

/**
 * Validação dos campos permitidos na
 * atualização do perfil do usuário.
 */
export const updateProfileBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "O nome deve ter no mínimo 3 caracteres.")
      .max(150, "O nome deve ter no máximo 150 caracteres.")
      .optional(),

    phone: z
      .string()
      .trim()
      .min(8, "O telefone deve ter no mínimo 8 caracteres.")
      .max(20, "O telefone deve ter no máximo 20 caracteres.")
      .regex(
        /^\+?[0-9 ()-]+$/,
        "O telefone contém caracteres inválidos."
      )
      .refine(
        (value) => {
          const digits = value.replace(/\D/g, "");

          return digits.length >= 8 && digits.length <= 15;
        },
        "O telefone deve conter entre 8 e 15 dígitos."
      )
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.phone !== undefined,
    {
      message:
        "Informe pelo menos um campo para atualização.",
    }
  );

export type UpdateProfileBody = z.infer<
  typeof updateProfileBodySchema
>;