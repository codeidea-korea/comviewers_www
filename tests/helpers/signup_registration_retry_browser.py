import datetime as dt
import json
import pathlib
import sys
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

BASE = sys.argv[1]
NOW = dt.datetime(2026, 10, 26, 2, 0, tzinfo=dt.timezone.utc)
REQUEST_ID = '00000000-0000-4000-8000-000000000001'
UPLOAD_KEY = '00000000-0000-4000-8000-000000000002'
TOKEN = 'T' * 43
PROOF = 'synthetic-proof-for-retry-only'
EXPIRY = '2026-10-26T12:00:00'
failures = []
results = []


class Case:
    def __init__(self, browser, plan, expiry=EXPIRY, image=False, timezone='America/Los_Angeles'):
        self.context = browser.new_context(timezone_id=timezone)
        self.context.clock.install(time=NOW)
        self.context.clock.pause_at(NOW)
        self.calls = {'confirm': [], 'register': [], 'stage': [], 'mail': 0}
        self.errors = []
        self.unexpected = []
        self.held = []
        self.plan = plan
        self.expiry = expiry
        self.context.route('**/*', self.route)
        self.origin = self.context.new_page()
        self.origin.on('pageerror', lambda e: self.errors.append(str(e)))
        self.origin.set_default_timeout(7000)
        self.origin.goto(BASE + '/signup/profile' + ('?image=1' if image else ''))
        self.origin.wait_for_function('Boolean(window.qaSignup)')
        self.origin.get_by_test_id('begin-signup').click()
        self.origin.wait_for_function('Boolean(window.qaSignup.awaitingEmail)')
        self.email = self.context.new_page()
        self.email.on('pageerror', lambda e: self.errors.append(str(e)))
        self.email.set_default_timeout(7000)
        self.email.goto(BASE + '/email-verification?token=' + TOKEN)
        self.email.get_by_role('button', name='이메일 인증하기', exact=True).click()

    def route(self, route):
        request = route.request
        pathname = urlparse(request.url).path
        if pathname == '/backend/api/auth/email-verifications':
            self.calls['mail'] += 1
            route.fulfill(status=202, json={'code': 'S000', 'data': {'requestId': REQUEST_ID, 'expiresAt': EXPIRY}})
        elif pathname == '/backend/api/auth/email-verifications/confirm':
            self.calls['confirm'].append(request.post_data_json)
            route.fulfill(status=200, json={'code': 'S000', 'data': {'requestId': REQUEST_ID, 'verificationProof': PROOF, 'expiresAt': self.expiry}})
        elif pathname == '/backend/api/auth/signup/profile-image':
            self.calls['stage'].append(request.post_data)
            route.fulfill(status=201, json={'code': 'S000', 'data': {'uploadKey': UPLOAD_KEY}})
        elif pathname == '/backend/api/auth/register':
            self.calls['register'].append(request.post_data_json)
            entry = self.plan[min(len(self.calls['register']) - 1, len(self.plan) - 1)]
            if entry == 'hold':
                self.held.append(route)
            elif entry == 'network':
                route.abort('failed')
            elif entry == 201:
                self.success(route)
            else:
                status, code, delay = entry
                route.fulfill(status=status, headers={'Retry-After': delay}, json={'code': code, 'message': 'synthetic API diagnostic must not be displayed'})
        elif pathname.startswith('/backend/') or pathname.startswith('/api/'):
            self.unexpected.append(pathname)
            route.fulfill(status=500, json={'code': 'C003'})
        elif not request.url.startswith(BASE + '/'):
            self.unexpected.append('external request')
            route.abort()
        else:
            route.continue_()

    def success(self, route):
        route.fulfill(status=201, json={'code': 'S000', 'data': {'userId': 1, 'username': 'qa_rejoin_same', 'name': 'Synthetic QA', 'email': 'qa-retry@example.test', 'signupBonusPoints': 100}})

    def state(self, state):
        expect(self.origin.get_by_test_id('registration-state')).to_have_text(state)

    def advance(self, millis):
        self.context.clock.run_for(millis)
        self.email.wait_for_timeout(30)

    def assert_completed(self):
        expect(self.email.get_by_role('heading', name='회원가입이 완료되었습니다', exact=True)).to_be_visible()
        expect(self.email.get_by_role('link', name='메인으로', exact=True)).to_be_visible()
        expect(self.origin).to_have_url(BASE + '/signup/complete')
        expect(self.origin.get_by_role('heading', name='회원가입이 완료되었습니다.', exact=True)).to_be_visible()

    def close(self):
        assert self.calls['confirm'] == [{'token': TOKEN}], self.calls['confirm']
        assert self.calls['mail'] == 1, self.calls
        assert not self.errors, self.errors
        assert not self.unexpected, self.unexpected
        for page in self.context.pages:
            assert 'synthetic API diagnostic must not be displayed' not in page.locator('body').inner_text()
            assert page.evaluate('([proof, password]) => [...Object.values(localStorage), ...Object.values(sessionStorage)].every(value => !value.includes(proof) && !value.includes(password))', [PROOF, 'QaRetry123!'])
        self.context.close()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    def run(label, function):
        try:
            function()
            results.append({'name': label, 'passed': True})
            print('PASS', label, flush=True)
        except Exception as error:
            failures.append(label + ': ' + str(error))
            results.append({'name': label, 'passed': False, 'error': str(error)})
            print('FAIL', label, str(error), flush=True)

    def automatic_retry(status, code):
        c = Case(browser, [(status, code, '2'), 201], image=True)
        try:
            c.state('waiting')
            assert len(c.calls['register']) == 1
            assert len(c.calls['stage']) == 1
            c.origin.evaluate('(value) => window.qaSignup.duplicate(value)', {'requestId': REQUEST_ID, 'verificationProof': PROOF, 'expiresAt': EXPIRY})
            c.origin.evaluate('() => { window.qaSignup.retry(); window.qaSignup.retry(); }')
            c.advance(2900)
            assert len(c.calls['register']) == 1, 'Retry-After was bypassed by duplicate proof/manual click'
            c.advance(200)
            c.assert_completed()
            assert len(c.calls['register']) == 2
            assert len(c.calls['stage']) == 1, 'staged profile image must be reused'
            assert c.calls['register'][0] == c.calls['register'][1], 'proof, submitted fields and image key must survive retry'
            assert c.calls['register'][1]['emailVerificationProof'] == PROOF
            assert c.calls['register'][1]['profileImageUploadKey'] == UPLOAD_KEY
        finally:
            c.close()

    def bounded_manual():
        c = Case(browser, [(429, 'A007', '0')] * 4 + [201])
        try:
            c.state('waiting')
            for number in range(2, 5):
                c.advance(1100)
                c.state('waiting')
                assert len(c.calls['register']) == number
            c.advance(1100)
            c.state('retry')
            c.advance(5000)
            assert len(c.calls['register']) == 4, 'automatic retries must stop after three retries'
            c.email.get_by_role('button', name='다시 시도', exact=True).click()
            c.assert_completed()
            assert len(c.calls['register']) == 5
        finally:
            c.close()

    def in_flight_guard():
        c = Case(browser, ['hold'])
        try:
            c.state('processing')
            assert len(c.held) == 1
            c.origin.evaluate('(value) => window.qaSignup.duplicate(value)', {'requestId': REQUEST_ID, 'verificationProof': PROOF, 'expiresAt': EXPIRY})
            c.origin.evaluate('() => { for (let i=0; i<8; i++) window.qaSignup.retry(); }')
            c.advance(100)
            assert len(c.calls['register']) == 1, 'only one POST may be in flight'
            c.success(c.held.pop())
            c.assert_completed()
        finally:
            c.close()

    def expired_proof():
        c = Case(browser, [201], expiry='2026-10-26T10:59:59', image=True)
        try:
            c.state('restart')
            expect(c.email.get_by_role('link', name='다시 입력하기', exact=True)).to_be_visible()
            assert not c.calls['register'] and not c.calls['stage']
        finally:
            c.close()

    def proof_expires_before_retry():
        c = Case(browser, [(429, 'A007', '2'), 201], expiry='2026-10-26T11:00:03')
        try:
            c.state('restart')
            c.advance(10000)
            assert len(c.calls['register']) == 1, 'never retry after proof expiry'
        finally:
            c.close()

    def cancellation():
        c = Case(browser, [(429, 'A007', '2'), 201])
        try:
            c.state('waiting')
            c.origin.get_by_test_id('cancel-origin').click()
            c.state('idle')
            c.advance(10000)
            assert len(c.calls['register']) == 1, 'cancelling signup must clear pending retry timer'
        finally:
            c.close()

    def uncertain_network():
        c = Case(browser, ['network', 201])
        try:
            c.state('check-login')
            expect(c.email.get_by_role('link', name='로그인하기', exact=True)).to_be_visible()
            c.origin.evaluate('() => window.qaSignup.retry()')
            c.advance(60000)
            assert len(c.calls['register']) == 1, 'uncertain commit must never be replayed'
        finally:
            c.close()

    def lost_original():
        c = Case(browser, [(429, 'A007', '2'), 201])
        try:
            c.state('waiting')
            c.origin.close()
            c.advance(34000)
            expect(c.email.get_by_role('button', name='다시 시도', exact=True)).to_be_visible()
            c.email.get_by_role('button', name='다시 시도', exact=True).click()
            c.advance(1600)
            expect(c.email.get_by_role('link', name='회원가입 화면으로', exact=True)).to_be_visible()
            assert len(c.calls['register']) == 1
        finally:
            c.close()

    run('429/A007 obeys delay, preserves proof/image and completes both tabs', lambda: automatic_retry(429, 'A007'))
    run('503/A008 preserves metadata and automatically recovers', lambda: automatic_retry(503, 'A008'))
    run('automatic retries stop at three and explicit retry succeeds', bounded_manual)
    run('duplicate proof and rapid manual clicks do not send concurrent registration', in_flight_guard)
    run('expired KST proof on foreign-timezone browser sends no registration', expired_proof)
    run('proof expiring before Retry-After prevents replay', proof_expires_before_retry)
    run('cancelling signup clears the pending retry timer', cancellation)
    run('uncertain network response requests login check without replay', uncertain_network)
    run('closed original tab exposes usable recovery instead of hanging', lost_original)
    browser.close()

out = pathlib.Path.cwd().parent / 'tmp/signup-verification-20261026/web'
out.mkdir(parents=True, exist_ok=True)
(out / 'browser-cases.json').write_text(json.dumps({'cases': results, 'passed': len(results) - len(failures), 'failed': len(failures)}, ensure_ascii=False, indent=2), encoding='utf-8')
sys.exit(1 if failures else 0)
