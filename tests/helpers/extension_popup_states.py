import json
import sys
from urllib.parse import urlparse

from playwright.sync_api import Route, sync_playwright


BASE_URL = sys.argv[1].rstrip("/")
QUOTE_PATH = "/backend/api/v1/my/rentals/extension-checkout/quote"


def reply(route: Route, data=None, *, code="S000", status=200):
    route.fulfill(
        status=status,
        content_type="application/json; charset=utf-8",
        body=json.dumps({"code": code, "data": data}, ensure_ascii=False),
    )


def path_of(route: Route) -> str:
    return urlparse(route.request.url).path


def rcpc_item():
    return {
        "rentalId": 901,
        "pcAssetId": 902,
        "productNo": "QA-EXTENSION-01",
        "managementNo": "EXT-01",
        "serverRoomId": 71,
        "serverRoomName": "QA 서버실",
        "productTitle": "연장 상태 검수 RCPC",
        "orderedAt": "2026-09-12T00:00:00+09:00",
        "serviceStartedAt": "2026-09-12T00:00:00+09:00",
        "serverRoomRegion": "서울",
        "serverStatus": "running",
        "usageStatus": "using",
        "rentalStatus": "active",
        "serviceEndExclusiveDate": "2026-10-12",
        "connectionStatus": "ONLINE",
        "presenceLastSeenAt": "2026-09-12T00:00:00+09:00",
        "secondsSinceLastSeen": 10,
        "trafficCounterEpoch": 1,
        "trafficDownloadTotalBytes": 1000,
        "trafficUploadTotalBytes": 2000,
        "trafficObservedAt": "2026-09-12T00:00:00+09:00",
        "preference": {"alias": "연장 검수", "favorite": False},
        "pcSpec": None,
        "remoteSupport": None,
    }


def owner_session(route: Route):
    reply(route, {
        "customerOrganizationId": "41",
        "customerMemberId": "401",
        "memberRole": "owner",
        "myPageOnly": False,
        "customerNicknameVisible": True,
        "commerceAvailable": True,
        "cManagerManagementAvailable": True,
        "displayName": "QA 대표",
    })


def common_response(route: Route):
    path = path_of(route)
    if path == "/backend/api/auth/refresh":
        reply(route, code="A001", status=401)
    elif path == "/backend/api/auth/login" and route.request.method == "POST":
        reply(route, {
            "userId": "7002",
            "role": "USER",
            "status": "ACTIVE",
            "passwordChangeRequired": False,
            "accessToken": "qa.owner.token",
            "tokenType": "Bearer",
            "expiresInMs": 3_600_000,
        })
    elif path == "/backend/api/v1/my/organizations":
        reply(route, [{"id": "41", "name": "QA 고객사", "role": "owner"}])
    elif path == "/backend/api/v1/my/session":
        owner_session(route)
    elif path == "/backend/api/v1/cart":
        reply(route, {"cartId": None, "items": []})
    elif path == "/backend/api/v1/my/rcpcs":
        reply(route, {"items": [rcpc_item()], "page": 0, "size": 100 if "size=100" in route.request.url else 20, "totalElements": 1, "totalPages": 1})
    elif path == "/backend/api/v1/my/rcpcs/901/reboot" and route.request.method == "GET":
        reply(route, {"status": "idle", "pending": False, "available": True})
    elif path == "/backend/api/v1/orders/terms":
        reply(route, [])
    else:
        raise AssertionError(f"Unexpected API request: {route.request.method} {path}")


def login_and_open_extension(page):
    page.goto(f"{BASE_URL}/login?returnTo=%2Fmypage%2Frcpc", wait_until="domcontentloaded")
    page.get_by_label("아이디", exact=True).fill("qa_extension_owner")
    page.get_by_label("비밀번호", exact=True).fill("Password1!")
    page.get_by_role("button", name="로그인", exact=True).click()
    page.wait_for_url("**/mypage/rcpc")
    page.get_by_text("QA-EXTENSION-01", exact=True).wait_for(state="visible")
    page.locator(".rcpc-live-actions").get_by_role("button", name="기간연장", exact=True).click()
    return page.get_by_role("dialog", name="기간 연장")


def verify_pending(browser):
    context = browser.new_context()
    page = context.new_page()
    pending_routes = []

    def handle(route: Route):
        if path_of(route) == QUOTE_PATH:
            pending_routes.append(route)
            return
        common_response(route)

    page.route("**/backend/api/**", handle)
    dialog = login_and_open_extension(page)
    dialog.get_by_role("status").wait_for(state="visible")
    assert dialog.get_by_role("status").inner_text() == "연장 견적을 확인하고 있습니다."
    assert dialog.locator(".rcpc-extension-dialog__scroll").get_attribute("aria-busy") == "true"
    assert dialog.get_by_role("radio", name="기간 선택").is_disabled()
    assert dialog.get_by_role("button", name="1개월", exact=True).is_disabled()
    assert dialog.get_by_role("button", name="연장 결제하기", exact=True).is_disabled()
    assert pending_routes, "견적 API 요청이 발생하지 않았습니다."
    context.close()


def verify_error(browser):
    context = browser.new_context()
    page = context.new_page()

    def handle(route: Route):
        if path_of(route) == QUOTE_PATH:
            reply(route, code="E500", status=500)
            return
        common_response(route)

    page.route("**/backend/api/**", handle)
    dialog = login_and_open_extension(page)
    alert = dialog.get_by_role("alert")
    alert.wait_for(state="visible")
    assert alert.inner_text() == "요청을 처리하지 못했습니다."
    assert dialog.get_by_role("button", name="연장 결제하기", exact=True).is_disabled()
    context.close()


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            verify_pending(browser)
            verify_error(browser)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
