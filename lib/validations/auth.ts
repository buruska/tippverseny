import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Érvénytelen email cím."),
  password: z.string().min(1, "A jelszó megadása kötelező."),
});

export type SignInInput = z.infer<typeof signInSchema>;
