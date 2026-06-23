import { z } from 'zod';

export const customerSchema = z.object({
  firstName: z.string().min(1, 'El nombre es obligatorio'),
      lastName: z.string().min(1, 'El apellido es obligatorio'),
      phone: z.string().optional().or(z.literal('')),
      email: z.string().email('Email inválido').optional().or(z.literal('')),
      addressLine: z.string().min(1, 'La dirección es obligatoria'),
      locality: z.string().optional().or(z.literal('')),
      municipality: z.string().optional().or(z.literal('')),
      pppoeUsername: z.string().optional().or(z.literal('')),
      currentBalance: z.coerce.number().min(0, 'El saldo no puede ser negativo'),
      signupDate: z.string().min(1, 'La fecha de alta es obligatoria'),
      billingCutoffDay: z.coerce
        .number()
        .int()
        .min(1, 'El día mínimo es 1')
        .max(28, 'El día máximo es 28'),
    });

export type CustomerFormValues = z.infer<typeof customerSchema>;
