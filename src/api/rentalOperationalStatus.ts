import { z } from 'zod'

export const rentalOperationalStatuses = ['new_registered', 'new_waiting', 'available', 'active', 'extension_waiting', 'termination_waiting'] as const
export const rentalOperationalStatusSchema = z.enum(rentalOperationalStatuses)
