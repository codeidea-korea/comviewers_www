import { eligibleRentalSchema, productReviewSchema, reviewDraftSchema, reviewPageSchema, type ProductReview, type ReviewRepository } from '@/domain/reviews/reviewRepository'
import { reviewFixtures } from './productReviewFixtures'

// Explicit synthetic confirmed rentals. A live adapter must use server eligibility.
const confirmedRentals = [{ id: 'review-rental-89023', productId: '89023', label: '품번 89023 · 구매확정 렌탈' }]
const dateLabel = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())

export function createMockReviewRepository(): ReviewRepository {
  let reviews: ProductReview[] = reviewFixtures.map((review, index) => productReviewSchema.parse({
    ...review, id: `product-review-${index + 1}`, productId: '89023', rentalId: `other-rental-${index + 1}`,
    rating: 4, date: '2026.07.14 15:12', edited: true, isMine: false,
  }))
  function owned(productId: string, id: string) {
    const review = reviews.find((item) => item.id === id && item.productId === productId)
    if (!review || !review.isMine) throw new Error('수정하거나 삭제할 후기를 찾을 수 없습니다.')
    return review
  }
  return {
    async list(productId, { page, size, signal }) {
      signal?.throwIfAborted()
      const matches = reviews.filter((review) => review.productId === productId)
      return reviewPageSchema.parse({ items: matches.slice(page * size, (page + 1) * size), page,
        totalCount: matches.length, totalPages: Math.ceil(matches.length / size) })
    },
    async listEligibleRentals(productId, signal) {
      signal?.throwIfAborted()
      return eligibleRentalSchema.array().parse(confirmedRentals.filter((rental) => rental.productId === productId
        && !reviews.some((review) => review.rentalId === rental.id)).map(({ id, label }) => ({ id, label })))
    },
    async create(productId, rentalId, input) {
      const draft = reviewDraftSchema.parse(input)
      if (!confirmedRentals.some((rental) => rental.id === rentalId && rental.productId === productId) || reviews.some((review) => review.rentalId === rentalId)) throw new Error('후기를 작성할 수 있는 구매확정 렌탈이 없습니다.')
      const review = productReviewSchema.parse({ ...draft, id: crypto.randomUUID(), productId, rentalId, author: '나', avatar: reviewFixtures[0].avatar, avatarClassName: reviewFixtures[0].avatarClassName, date: dateLabel(), edited: false, isMine: true })
      reviews = [review, ...reviews]
      return productReviewSchema.parse(review)
    },
    async update(productId, id, input) {
      const previous = owned(productId, id)
      const review = productReviewSchema.parse({ ...previous, ...reviewDraftSchema.parse(input), edited: true, date: dateLabel() })
      reviews = reviews.map((item) => item.id === id ? review : item)
      return productReviewSchema.parse(review)
    },
    async remove(productId, id) {
      owned(productId, id)
      reviews = reviews.filter((review) => review.id !== id)
    },
  }
}
