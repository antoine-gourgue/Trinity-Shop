import { z } from "zod";

export const signinUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
});
