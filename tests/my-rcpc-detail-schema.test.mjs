import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('RCPC 상세 응답은 목록 전용 productTitle과 orderedAt 없이 파싱된다', async () => {
  const server = await createServer({ root: projectRoot, logLevel: 'error', server: { middlewareMode: true, hmr: false } })
  try {
    const { myRcpcDetailSchema } = await server.ssrLoadModule('/src/api/myRcpc.ts')
    const detail = myRcpcDetailSchema.parse({
      rentalId: 1,
      pcAssetId: 2,
      productNo: 28001,
      managementNo: 'QA-MGMT-1',
      serverRoomId: 3,
      serverRoomName: 'QA 서버실',
      rentalStatus: 'active',
      serviceEndExclusiveDate: '2026-10-01',
      serviceStartedAt: '2026-09-01T00:00:00+09:00',
      serviceEndsAt: '2026-10-01T00:00:00+09:00',
      connectionStatus: 'online',
      presenceLastSeenAt: null,
      secondsSinceLastSeen: null,
      trafficCounterEpoch: null,
      trafficDownloadTotalBytes: null,
      trafficUploadTotalBytes: null,
      trafficObservedAt: null,
      maskedWanIp: '***.***.***.***',
      pcSpec: null,
      remoteSupport: null,
      preference: { favorite: false },
      serverRoomRegion: '서울',
      serverStatus: 'running',
      usageStatus: 'using',
    })

    assert.equal(detail.productNo, '28001')
    assert.equal(detail.productTitle, null)
    assert.equal(detail.orderedAt, null)
  } finally {
    await server.close()
  }
})
