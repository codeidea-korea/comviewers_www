import sys, time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

base = sys.argv[1]
token = 'Q' * 43
failures = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    def scenario(role, width, state='ready', cold=False):
        context = browser.new_context(viewport={'width': width, 'height': 1000})
        page = context.new_page()
        page.set_default_timeout(5000)
        calls = {'validate': [], 'confirm': [], 'refresh': 0}
        errors = []
        page.on('pageerror', lambda value: errors.append(str(value)))
        def route(request):
            url = request.request.url
            pathname = urlparse(url).path
            if pathname == '/backend/api/auth/refresh' and cold:
                calls['refresh'] += 1
                time.sleep(0.15)
                request.fulfill(status=401 if role == 'anonymous' else 200, json={'code': 'A001'} if role == 'anonymous' else {'code': 'S000', 'data': {'userId': '1', 'role': role, 'status': 'ACTIVE', 'passwordChangeRequired': False, 'accessToken': 'qa.synthetic.access', 'tokenType': 'Bearer', 'expiresInMs': 3600000}})
            elif pathname == '/backend/api/v1/my/organizations' and cold:
                request.fulfill(status=200, json={'code': 'S000', 'data': [{'id': '1', 'name': 'QA', 'role': 'c_manager' if role == 'C_MANAGER' else 'owner', 'organizationNo': 'ORG_QA1'}]})
            elif pathname == '/backend/api/v1/my/session' and cold:
                manager = role == 'C_MANAGER'
                request.fulfill(status=200, json={'code': 'S000', 'data': {'customerOrganizationId': '1', 'customerMemberId': '1', 'memberRole': 'c_manager' if manager else 'owner', 'myPageOnly': manager, 'customerNicknameVisible': not manager, 'commerceAvailable': not manager, 'cManagerManagementAvailable': not manager, 'displayName': 'QA'}})
            elif pathname == '/backend/api/auth/password-reset/validate':
                assert 'authorization' not in request.request.headers
                calls['validate'].append(request.request.post_data_json)
                request.fulfill(status=400 if state == 'used' else 200, json={'code': 'A017'} if state == 'used' else {'code': 'S000'})
            elif pathname == '/backend/api/auth/password-reset/confirm':
                assert 'authorization' not in request.request.headers
                calls['confirm'].append(request.request.post_data_json)
                # First same-password rejection must retain the token and allow retry.
                request.fulfill(status=400 if len(calls['confirm']) == 1 else 200, json={'code': 'A026'} if len(calls['confirm']) == 1 else {'code': 'S000'})
            elif pathname.startswith('/backend/') or pathname.startswith('/api/'):
                raise AssertionError('unexpected non-synthetic request path: ' + pathname)
            elif not url.startswith(base):
                request.abort()
            else:
                request.continue_()
        context.route('**/*', route)
        actual_token = '' if state == 'missing' else token
        target = '/login' if state == 'login-control' else '/account/reset-password/' if state == 'trailing-ready' else '/account/reset-password'
        page.goto(f'{base}{target}?token={actual_token}&qaRole={role}&qaCold={int(cold)}')
        if cold and role != 'anonymous':
            page.wait_for_function("window.qaReset.snapshot().status === 'authenticated' && window.qaReset.scopes.includes(1)")
        if state == 'login-control':
            expect(page.locator('output')).to_have_text('QA redirected route')
            assert urlparse(page.url).path == ('/manager/ORG_QA1/mypage' if role == 'C_MANAGER' else '/mypage')
            assert not calls['validate'] and not calls['confirm']
        elif state not in ('ready', 'trailing-ready'):
            expect(page.get_by_role('alert')).to_contain_text('유효하지 않거나 만료되었거나 이미 사용되었습니다')
            assert not calls['confirm']
            assert len(calls['validate']) == (0 if state == 'missing' else 1)
        else:
            expect(page.get_by_label('새 비밀번호', exact=True)).to_be_visible()
            assert urlparse(page.url).path == target
            assert urlparse(page.url).query == ''
            if cold:
                assert calls['validate'] and all(body == {'token': token} for body in calls['validate']), 'every mounted public validation must retain the original token'
            else:
                assert calls['validate'] == [{'token': token}]
            if cold:
                assert calls['refresh'] == 1
                assert page.evaluate('window.qaReset.snapshot().status') == ('anonymous' if role == 'anonymous' else 'authenticated')
                if role != 'anonymous':
                    assert page.evaluate('window.qaReset.snapshot().scopeRevision') == 1
                    assert page.evaluate('window.qaReset.scopes.includes(0) && window.qaReset.scopes.includes(1)')
                assert page.evaluate("(value) => [...Object.values(sessionStorage), ...Object.values(localStorage)].every(item => !item.includes(value))", token)
            page.get_by_label('새 비밀번호', exact=True).fill('Example123!')
            page.get_by_label('비밀번호 확인', exact=True).fill('Example123!')
            page.get_by_role('button', name='확인', exact=True).click()
            expect(page.get_by_text('* 기존 비밀번호와 다른 비밀번호를 입력해 주세요.', exact=True)).to_be_visible()
            expect(page.get_by_label('새 비밀번호', exact=True)).to_have_value('Example123!')
            page.get_by_label('새 비밀번호', exact=True).fill('Changed123!')
            page.get_by_label('비밀번호 확인', exact=True).fill('Changed123!')
            page.get_by_role('button', name='확인', exact=True).click()
            expect(page.get_by_text('비밀번호가 변경되었습니다.', exact=True)).to_be_visible()
            assert calls['confirm'] == [
                {'token': token, 'newPassword': 'Example123!', 'newPasswordConfirm': 'Example123!'},
                {'token': token, 'newPassword': 'Changed123!', 'newPasswordConfirm': 'Changed123!'},
            ]
        assert not errors, errors
        context.close()
    for role, width, state in [('USER', 1440, 'ready'), ('C_MANAGER', 1440, 'ready'), ('anonymous', 1440, 'ready'), ('USER', 390, 'ready'), ('C_MANAGER', 390, 'ready'), ('USER', 1440, 'used'), ('C_MANAGER', 1440, 'missing'), ('C_MANAGER', 1440, 'trailing-ready'), ('USER', 1440, 'login-control'), ('C_MANAGER', 1440, 'login-control')]:
        label = f'{role} {width}px {state}'
        try:
            scenario(role, width, state)
            print('PASS', label, flush=True)
        except Exception as error:
            failures.append(label + ': ' + str(error))
            print('FAIL', label, str(error), flush=True)
    for role, width in [('USER', 1440), ('C_MANAGER', 1440), ('anonymous', 1440), ('USER', 390), ('C_MANAGER', 390)]:
        label = f'cold AppProviders/auth HTTP restore {role} {width}px'
        try:
            scenario(role, width, cold=True)
            print('PASS', label, flush=True)
        except Exception as error:
            failures.append(label + ': ' + str(error))
            print('FAIL', label, str(error), flush=True)
    browser.close()
sys.exit(1 if failures else 0)
