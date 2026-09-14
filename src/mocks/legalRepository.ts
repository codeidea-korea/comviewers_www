import type { LegalRepository } from '@/domain/legal/legalRepository'
// Approved complete legal copy is not available locally. Never fabricate it.
export function createMockLegalRepository(): LegalRepository { return { list: async () => [] } }
