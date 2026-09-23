import sys
from playwright.sync_api import sync_playwright, expect


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    try:
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(sys.argv[1] + '/__manager_qa')
        submit = page.get_by_role('button', name='담당자 등록', exact=True)
        expect(submit).to_be_disabled()
        page.get_by_label('담당자명', exact=False).fill('검수담당자')
        page.get_by_label('아이디', exact=False).fill('test_manager')
        page.get_by_role('button', name='중복확인', exact=True).click()
        expect(page.get_by_text('사용 가능한 아이디입니다.')).to_be_visible()
        page.get_by_label('비밀번호', exact=False).fill('Test123!')
        page.get_by_role('button', name='권한 그룹 만들기', exact=True).click()
        expect(page.get_by_role('checkbox')).to_have_count(20)
        assert page.get_by_role('checkbox').evaluate_all('(items) => items.every(item => !item.checked)')
        page.get_by_label('권한 그룹 이름', exact=True).fill('조회 담당자 그룹')
        page.get_by_label('RCPC 조회·재부팅 조회', exact=True).check()
        page.get_by_label('원격 접속정보 조회', exact=True).check()
        expect(submit).to_be_disabled()
        page.evaluate('window.managerQa.failNext = true')
        page.get_by_role('button', name='권한 그룹 저장', exact=True).click()
        expect(page.get_by_role('alert')).to_contain_text('저장 결과를 확인하지 못했습니다')
        expect(submit).to_be_disabled()
        assert page.evaluate('window.managerQa.saved.length') == 0
        page.get_by_role('button', name='권한 그룹 저장', exact=True).click()
        expect(page.get_by_label('권한 그룹', exact=True)).to_have_value('1')
        expect(submit).to_be_enabled()
        submit.click()
        page.wait_for_function('window.managerQa.saved.length === 1')
        assert page.evaluate('window.managerQa.saved[0].permissionGroupId') == 1
        rules = page.evaluate('window.managerQa.rules[0]')
        assert next(rule for rule in rules if rule['featureCode'] == 'rcpc')['canUpdate'] is False
        assert next(rule for rule in rules if rule['featureCode'] == 'rcpc.remote_access')['canRead'] is True
        assert not errors, errors
    finally:
        context.close()
        browser.close()
