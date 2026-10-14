import base64
import sys
import time
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1].rstrip('/')
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9ZkAAAAASUVORK5CYII=')
EXPIRED = '이메일 인증 유효시간이 만료되었습니다. 회원가입을 다시 시도해 주세요.'
INVALID = '이미 사용되었거나 유효하지 않은 링크입니다.'


def fixture(page, suffix=''):
    page.goto(f'{BASE}/__qa_customer__?nonce={time.monotonic_ns()}&{suffix}', wait_until='domcontentloaded')
    try:
        page.locator('.inquiry-product-choice__row').first.wait_for()
    except Exception:
        print(page.locator('body').inner_text())
        raise


def rows(page):
    return page.locator('.inquiry-product-choice__row')


def choose_type(page, label='기타 문의'):
    page.get_by_role('radio', name=label, exact=True).locator('..').click()
    page.get_by_role('button', name='문의 접수하기', exact=True).click()


def send(page):
    page.get_by_label('문의 메시지').fill('QA synthetic inquiry; never persisted')
    page.get_by_role('button', name='문의 접수', exact=True).click()
    expect(page.get_by_role('alert')).to_have_text('QA synthetic response: no persistent write')


def verify_selection(page):
    fixture(page)
    expect(rows(page)).to_have_count(3)
    assert page.get_by_text('과거 이력', exact=True).count() == 0
    # Label click must change once; repeated aliases remain independently addressable.
    rows(page).nth(0).click()
    expect(rows(page).nth(0).get_by_role('checkbox')).to_be_checked()
    rows(page).nth(1).get_by_role('checkbox').check()
    expect(page.get_by_role('button', name='2대 선택')).to_be_enabled()
    rows(page).nth(0).click()
    expect(rows(page).nth(0).get_by_role('checkbox')).not_to_be_checked()
    expect(rows(page).nth(1).get_by_role('checkbox')).to_be_checked()
    rows(page).nth(0).get_by_role('checkbox').check()
    page.get_by_role('button', name='2대 선택').click()
    page.get_by_role('button', name='상품 선택으로 돌아가기', exact=True).click()
    expect(rows(page).nth(0).get_by_role('checkbox')).to_be_checked()
    expect(rows(page).nth(1).get_by_role('checkbox')).to_be_checked()
    page.get_by_role('button', name='2대 선택').click()
    choose_type(page)
    expect(page.locator('.inquiry-chat__product')).to_have_count(2)
    send(page)
    assert page.evaluate('window.qa.submitted[0].targetPcAssetIds') == [2, 1]
    print('PASS TC-USR-0478/0480/0728: label+checkbox, uncheck, history dedup, back preservation, two target payload order')


def verify_rooms(page):
    fixture(page)
    control = page.get_by_label('문의 상품 서버실')
    assert control.locator('option').all_text_contents() == ['전체 서버실', 'A 서버실', 'B 서버실']
    control.select_option('71')
    expect(rows(page)).to_have_count(2)
    rows(page).first.get_by_role('checkbox').check()
    control.select_option('72')
    expect(rows(page)).to_have_count(1)
    expect(rows(page).first.get_by_role('checkbox')).not_to_be_checked()
    expect(page.get_by_role('button', name='다음', exact=True)).to_be_disabled()
    rows(page).first.get_by_role('checkbox').check()
    page.get_by_role('button', name='1대 선택').click()
    choose_type(page)
    send(page)
    assert page.evaluate('window.qa.submitted[0].targetPcAssetIds') == [3]
    print('PASS TC-USR-0726: only authorized rooms, A/B filtering, old count/selection cleared, only B payload')


def verify_business_rooms(page):
    fixture(page)
    rows(page).nth(0).get_by_role('checkbox').check()
    rows(page).nth(2).get_by_role('checkbox').check()
    page.get_by_role('button', name='2대 선택').click()
    choose_type(page)
    expect(page.locator('.inquiry-chat__product')).to_have_count(2)
    send(page)
    assert page.evaluate('window.qa.submitted[0].targetPcAssetIds') == [1, 3]
    for business in ['different', 'missing']:
        fixture(page, 'business=' + business)
        rows(page).nth(0).get_by_role('checkbox').check()
        rows(page).nth(2).get_by_role('checkbox').check()
        page.get_by_role('button', name='2대 선택').click()
        expect(page.get_by_role('alert')).to_have_text('일괄문의는 동일 사업자에서만 가능합니다.')
        assert page.get_by_role('radio', name='기타 문의').count() == 0
        assert page.evaluate('window.qa.submitted') == []
    print('PASS C1 business boundary: same business cross-room [1,3] payload; different/missing business blocked before type/API')


def verify_business_action(page):
    page.goto(f'{BASE}/__qa_customer__?mode=action&nonce={time.monotonic_ns()}')
    page.get_by_role('button', name='문의', exact=True).click()
    page.get_by_role('radio', name='기타 문의', exact=True).wait_for()
    choose_type(page)
    expect(page.locator('.inquiry-chat__product')).to_have_count(2)
    send(page)
    assert page.evaluate('window.qa.submitted[0].targetPcAssetIds') == [1, 3]
    for business in ['different', 'missing']:
        page.goto(f'{BASE}/__qa_customer__?mode=action&business={business}&nonce={time.monotonic_ns()}')
        page.get_by_role('button', name='문의', exact=True).click()
        expect(page.get_by_role('dialog')).to_contain_text('일괄문의는 동일 사업자에서만 가능합니다.')
        expect(page.get_by_role('dialog')).not_to_contain_text('동일 서버실')
        assert page.get_by_role('radio', name='기타 문의').count() == 0
        assert page.evaluate('window.qa.submitted') == []
    print('PASS C1 bulk InquiryAction: same-business cross-room fixed-target entry; different/missing business notice uses business policy')


def verify_business_addition(page):
    for business in ['same', 'different', 'missing']:
        page.goto(f'{BASE}/__qa_customer__?mode=addition&business={business}&nonce={time.monotonic_ns()}')
        expect(rows(page)).to_have_count(2)
        rows(page).nth(1).get_by_role('checkbox').check()
        page.get_by_role('button', name='1대 추가하기', exact=True).click()
        if business == 'same':
            expect(page.get_by_role('alert')).to_have_text('QA synthetic add response: no persistent write')
            assert page.evaluate('window.qa.added') == [{'requestId': 1, 'ids': [3]}]
        else:
            expect(page.get_by_role('alert')).to_have_text('일괄문의는 동일 사업자에서만 가능합니다.')
            assert page.evaluate('window.qa.added') == []
    print('PASS C1 target addition: existing room A + new room B same business forwarded; different/missing business blocked')


def verify_empty(page):
    fixture(page)
    rows(page).first.get_by_role('checkbox').check()
    page.get_by_role('button', name='선택안함').click()
    choose_type(page, 'AS·점검 요청')
    expect(page.get_by_role('alert')).to_have_text('선택한 문의 유형은 문의 상품을 선택해 주세요.')
    choose_type(page)
    expect(page.locator('.inquiry-chat__product')).to_have_count(0)
    send(page)
    assert page.evaluate('window.qa.submitted[0].targetPcAssetIds') == []
    fixture(page)
    page.get_by_role('button', name='선택안함').click()
    page.get_by_role('button', name='상품 선택으로 돌아가기', exact=True).click()
    expect(rows(page).first.get_by_role('checkbox')).not_to_be_checked()
    rows(page).first.get_by_role('checkbox').check()
    page.get_by_role('button', name='1대 선택').click()
    choose_type(page)
    send(page)
    assert page.evaluate('window.qa.submitted[0].targetPcAssetIds') == [1]
    print('PASS TC-USR-0727: RCPC -> empty and empty -> RCPC; empty AS blocked, inquiry empty payload')


def verify_fixed(page):
    page.goto(f'{BASE}/__qa_customer__?fixed=1', wait_until='domcontentloaded')
    page.get_by_role('radio', name='기타 문의').wait_for()
    choose_type(page)
    page.get_by_role('button', name='문의 메뉴').click()
    page.get_by_role('menuitem', name='문의 상품 추가').click()
    expect(rows(page).first.get_by_role('checkbox')).to_be_disabled()
    expect(rows(page).first.get_by_role('checkbox')).to_be_checked()
    assert page.get_by_role('button', name='선택안함').count() == 0
    assert page.get_by_label('문의 상품 서버실').count() == 0
    page.get_by_label('모두선택', exact=True).check()
    page.get_by_label('모두선택', exact=True).uncheck()
    expect(rows(page).first.get_by_role('checkbox')).to_be_checked()
    print('PASS inquiry boundaries: 21 blocked, 20 complete payload, missing target blocked, fixed target locked/filter absent')


def verify_email(browser):
    for message, expected, token in [(EXPIRED, EXPIRED, 'a' * 43), (INVALID, INVALID, 'b' * 43), ('cancelled', INVALID, 'c' * 43), ('unused', INVALID, 'invalid'), ('unused', INVALID, '')]:
        context = browser.new_context()
        page = context.new_page()
        confirmations = []
        def handle(route):
            path = urlparse(route.request.url).path
            if path == '/backend/api/auth/email-verifications/confirm':
                confirmations.append(route.request.post_data_json)
                route.fulfill(status=400, json={'code': 'A009', 'message': message, 'data': None})
            elif path.startswith('/backend/'):
                route.fulfill(status=401, json={'code': 'A001', 'data': None})
            else:
                route.continue_()
        page.route('**/*', handle)
        page.goto(f'{BASE}/email-verification?token={token}', wait_until='domcontentloaded')
        if token:
            page.get_by_role('button', name='이메일 인증하기', exact=True).click()
        expect(page.get_by_role('alert')).to_have_text(expected)
        assert '?' not in page.url
        assert len(confirmations) == (1 if len(token) == 43 else 0)
        context.close()
    print('PASS TC-USR-0687: natural expired/used/cancelled mapping, invalid/missing token no API, URL sanitized')


def verify_png_refresh(page):
    page.context.route('**/__qa_png__', lambda route: route.fulfill(status=200, body=PNG, content_type='image/png', headers={'Content-Disposition': "attachment; filename*=UTF-8''QA%20original.png"}))
    page.goto(f'{BASE}/__qa_customer__?mode=attachment', wait_until='domcontentloaded')
    with page.expect_download() as info:
        page.get_by_role('link', name='QA 원본.png PNG · 1KB').click()
    download = info.value
    assert download.suggested_filename == 'QA original.png'
    with open(download.path(), 'rb') as file:
        assert file.read() == PNG
    page.goto(f'{BASE}/__qa_customer__?mode=refresh', wait_until='domcontentloaded')
    expect(page.locator('output')).to_have_text('1')
    page.get_by_role('button', name='마운트 전환').click()
    page.get_by_role('button', name='마운트 전환').click()
    expect(page.locator('output')).to_have_text('2')
    print('PASS TC-USR-0650: actual attachment anchor -> mock original PNG bytes/MIME filename; coupon read remount refresh')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()
    page.set_default_timeout(15000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(BASE + '/') else route.abort())
    verify_selection(page)
    verify_rooms(page)
    verify_business_rooms(page)
    verify_business_action(page)
    verify_business_addition(page)
    verify_empty(page)
    # Boundary case uses a fresh query client on navigation.
    fixture(page, 'count=21')
    page.get_by_label('모두선택', exact=True).check()
    expect(page.get_by_role('button', name='21대 선택')).to_be_disabled()
    expect(page.get_by_role('alert')).to_have_text('최대 20대까지 선택할 수 있습니다. 선택한 상품을 줄여 주세요.')
    rows(page).nth(20).get_by_role('checkbox').uncheck()
    page.get_by_role('button', name='20대 선택').click()
    choose_type(page)
    send(page)
    assert page.evaluate('window.qa.submitted[0].targetPcAssetIds') == list(range(1, 21))
    fixture(page)
    rows(page).first.get_by_role('checkbox').check()
    page.evaluate('window.qa.remove(1)')
    expect(page.get_by_role('alert')).to_have_text('선택한 문의 대상 RCPC를 확인할 수 없습니다. 다시 확인해 주세요.')
    expect(page.get_by_role('button', name='1대 선택')).to_be_disabled()
    verify_fixed(page)
    verify_png_refresh(page)
    assert errors == [], errors
    context.close()
    verify_email(browser)
    browser.close()
