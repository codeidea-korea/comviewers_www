import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  canManageFavorites,
  FavoritesManageOnly,
} from '../src/routes/mypage/-components/favoritesAccess.ts'

const ownerActions = createElement(
  'nav',
  null,
  createElement('button', null, '편집'),
  createElement('button', null, '추가'),
  createElement('button', null, '그룹 변경'),
)

test('favorites management actions render for an owner', () => {
  assert.equal(canManageFavorites('owner'), true)
  const markup = renderToStaticMarkup(createElement(
    FavoritesManageOnly,
    { allowed: canManageFavorites('owner') },
    ownerActions,
  ))
  assert.match(markup, /편집/)
  assert.match(markup, /추가/)
  assert.match(markup, /그룹 변경/)
})

test('favorites management actions render for a C-manager account independently', () => {
  assert.equal(canManageFavorites('c_manager'), true)
  const markup = renderToStaticMarkup(createElement(
    FavoritesManageOnly,
    { allowed: canManageFavorites('c_manager') },
    ownerActions,
  ))
  assert.match(markup, /편집/)
  assert.match(markup, /추가/)
  assert.match(markup, /그룹 변경/)
})
