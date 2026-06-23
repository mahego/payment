import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z
      .string()
      .min(8)
      .regex(/(?=.*[A-Z])/, 'Debe contener una mayúscula')
      .regex(/(?=.*[0-9])/, 'Debe contener un número')
      .regex(/(?=.*[^a-zA-Z0-9])/, 'Debe contener un carácter especial'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: z
      .string()
      .min(8)
      .regex(/(?=.*[A-Z])/)
      .regex(/(?=.*[0-9])/)
      .regex(/(?=.*[^a-zA-Z0-9])/),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
