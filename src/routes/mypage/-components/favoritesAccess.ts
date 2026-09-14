import { createElement, Fragment, type ReactNode } from 'react'

export type FavoritesMemberRole = 'owner' | 'c_manager' | null | undefined

export const favoriteUngroupedCountQuery = {
  favorite: true,
  ungrouped: true,
  page: 0,
  size: 1,
} as const

export function canManageFavorites(memberRole: FavoritesMemberRole): boolean {
  return memberRole === 'owner' || memberRole === 'c_manager'
}

export function FavoritesManageOnly({ allowed, children }: { allowed: boolean; children: ReactNode }) {
  return allowed ? createElement(Fragment, null, children) : null
}
