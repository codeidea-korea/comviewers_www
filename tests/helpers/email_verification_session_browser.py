import sys, time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base = sys.argv[1]
token = 'E' * 43
expired = '이메일 인증 유효시간이 만료되었습니다. 회원가입을 다시 시도해 주세요.'
invalid = '이미 사용되었거나 유효하지 않은 링크입니다.'
failures = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    def scenario(role, width, state):
        context = browser.new_context(viewport={'width': width, 'height': 1000})
        page = context.new_page()
        page.set_default_timeout(5000)
        calls = {'refresh': 0, 'confirm': []}
        errors = []
        page.on('pageerror', lambda value: errors.append(str(value)))
        def route(request):
            url = request.request.url
            pathname = urlparse(url).path
            if pathname == '/backend/api/auth/refresh':
                calls['refresh'] += 1
                time.sleep(0.15)
                request.fulfill(status=401 if role == 'anonymous' else 200, json={'code': 'A001'} if role == 'anonymous' else {'code': 'S000', 'data': {'userId': '1', 'role': 'USER', 'status': 'ACTIVE', 'passwordChangeRequired': False, 'accessToken': 'qa.synthetic.access', 'tokenType': 'Bearer', 'expiresInMs': 3600000}})
            elif pathname == '/backend/api/v1/my/organizations':
                request.fulfill(status=200, json={'code': 'S000', 'data': [{'id': '1', 'name': 'QA', 'role': 'owner', 'organizationNo': 'ORG_QA1'}]})
            elif pathname == '/backend/api/v1/my/session':
                request.fulfill(status=200, json={'code': 'S000', 'data': {'customerOrganizationId': '1', 'customerMemberId': '1', 'memberRole': 'owner', 'myPageOnly': False, 'customerNicknameVisible': True, 'commerceAvailable': True, 'cManagerManagementAvailable': True, 'displayName': 'QA'}})
            elif pathname == '/backend/api/auth/email-verifications/confirm':
                assert 'authorization' not in request.request.headers
                calls['confirm'].append(request.request.post_data_json)
                if state == 'normal':
                    request.fulfill(status=200, json={'code': 'S000', 'data': {'requestId': 'qa-email-request', 'verificationProof': 'qa-proof', 'expiresAt': '2026-10-15T12:00:00'}})
                else:
                    code = 'A009' if state.startswith('legacy') else 'A027' if state == 'expired' else 'A028'
                    request.fulfill(status=400, json={'code': code, 'message': expired if 'expired' in state else invalid})
            elif pathname.startswith('/backend/') or pathname.startswith('/api/'):
                raise AssertionError('unexpected synthetic API path: ' + pathname)
            elif not url.startswith(base):
                request.abort()
            else:
                request.continue_()
        context.route('**/*', route)
        actual_token = '' if state == 'missing' else 'invalid' if state == 'malformed' else token
        page.goto(f'{base}/email-verification?token={actual_token}')
        page.wait_for_function('window.qaEmail?.restoring === false')
        if role == 'USER':
            page.wait_for_function("window.qaEmail.snapshot().status === 'authenticated' && window.qaEmail.scopes.includes(1)")
        assert urlparse(page.url).path == '/email-verification'
        assert urlparse(page.url).query == ''
        if state == 'missing':
            expect(page.get_by_role('alert')).to_have_text(invalid)
            assert page.get_by_role('button', name='이메일 인증하기', exact=True).count() == 0
        else:
            page.get_by_role('button', name='이메일 인증하기', exact=True).click()
            if state == 'normal':
                expect(page.get_by_role('heading', name='이메일 인증이 완료되었습니다', exact=True)).to_be_visible()
                page.wait_for_function('window.qaEmail.delivered.length === 1')
                page.evaluate('window.qaEmail.complete()')
                expect(page.get_by_role('heading', name='회원가입이 완료되었습니다', exact=True)).to_be_visible()
                expect(page.get_by_role('link', name='메인으로', exact=True)).to_be_visible()
            else:
                expect(page.get_by_role('alert')).to_have_text(expired if 'expired' in state else invalid)
        assert calls['confirm'] == ([] if state in ('missing', 'malformed') else [{'token': token}])
        assert calls['refresh'] == 1
        assert page.evaluate('(value) => [...Object.values(sessionStorage), ...Object.values(localStorage)].every(item => !item.includes(value))', token)
        assert not errors, errors
        context.close()
    def normal_restore_race(width):
        context = browser.new_context(viewport={'width': width, 'height': 1000})
        page = context.new_page()
        page.set_default_timeout(5000)
        pending_refresh = []
        confirmations = []
        errors = []
        page.on('pageerror', lambda value: errors.append(str(value)))
        def route(request):
            url = request.request.url
            pathname = urlparse(url).path
            if pathname == '/backend/api/auth/refresh':
                pending_refresh.append(request)
            elif pathname == '/backend/api/v1/my/organizations':
                request.fulfill(status=200, json={'code': 'S000', 'data': [{'id': '1', 'name': 'QA', 'role': 'owner', 'organizationNo': 'ORG_QA1'}]})
            elif pathname == '/backend/api/v1/my/session':
                request.fulfill(status=200, json={'code': 'S000', 'data': {'customerOrganizationId': '1', 'customerMemberId': '1', 'memberRole': 'owner', 'myPageOnly': False, 'customerNicknameVisible': True, 'commerceAvailable': True, 'cManagerManagementAvailable': True, 'displayName': 'QA'}})
            elif pathname == '/backend/api/auth/email-verifications/confirm':
                confirmations.append(request.request.post_data_json)
                request.fulfill(status=200, json={'code': 'S000', 'data': {'requestId': 'qa-email-request', 'verificationProof': 'qa-proof', 'expiresAt': '2026-10-15T12:00:00'}})
            elif pathname.startswith('/backend/') or pathname.startswith('/api/'):
                raise AssertionError('unexpected synthetic API path: ' + pathname)
            elif not url.startswith(base):
                request.abort()
            else:
                request.continue_()
        context.route('**/*', route)
        page.goto(f'{base}/email-verification?token={token}', wait_until='domcontentloaded')
        page.wait_for_function('window.qaEmail?.restoring === true')
        button = page.get_by_role('button', name='이메일 인증하기', exact=True)
        expect(button).to_be_visible()
        disabled_while_restoring = button.is_disabled()
        button.evaluate('node => node.click()')
        page.wait_for_timeout(150)
        early_count = len(confirmations)
        if early_count:
            expect(page.get_by_role('heading', name='이메일 인증이 완료되었습니다', exact=True)).to_be_visible()
            page.wait_for_function('window.qaEmail.delivered.length === 1')
        assert len(pending_refresh) == 1
        pending_refresh[0].fulfill(status=200, json={'code': 'S000', 'data': {'userId': '1', 'role': 'USER', 'status': 'ACTIVE', 'passwordChangeRequired': False, 'accessToken': 'qa.synthetic.access', 'tokenType': 'Bearer', 'expiresInMs': 3600000}})
        page.wait_for_function("window.qaEmail.restoring === false && window.qaEmail.snapshot().scopeRevision === 1 && window.qaEmail.scopes.includes(1)")
        if not early_count:
            expect(button).to_be_enabled()
            button.click()
        # A consumed normal response must never revert to the confirmation button after restoration.
        expect(page.get_by_role('heading', name='이메일 인증이 완료되었습니다', exact=True)).to_be_visible()
        assert disabled_while_restoring and early_count == 0, 'email confirmation must wait for auth restoration'
        assert confirmations == [{'token': token}]
        assert button.count() == 0
        assert page.evaluate('(value) => [...Object.values(sessionStorage), ...Object.values(localStorage)].every(item => !item.includes(value))', token)
        assert not errors, errors
        context.close()
    matrix = [(role, width, state) for role in ['USER', 'anonymous'] for width in [1440, 390] for state in ['normal', 'expired', 'used']]
    matrix += [('USER', 1440, state) for state in ['legacy-expired', 'legacy-used', 'missing', 'malformed']]
    for role, width, state in matrix:
        label = f'StrictMode/cold auth restore {role} {width}px {state}'
        try:
            scenario(role, width, state)
            print('PASS', label, flush=True)
        except Exception as error:
            failures.append(label + ': ' + str(error))
            print('FAIL', label, str(error), flush=True)
    for width in [1440, 390]:
        label = f'normal success faster than deferred auth restoration {width}px'
        try:
            normal_restore_race(width)
            print('PASS', label, flush=True)
        except Exception as error:
            failures.append(label + ': ' + str(error))
            print('FAIL', label, str(error), flush=True)
    browser.close()
sys.exit(1 if failures else 0)
