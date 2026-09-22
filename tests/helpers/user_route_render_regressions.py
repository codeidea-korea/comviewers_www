import json
import sys
from datetime import datetime, timedelta
from urllib.parse import urlparse

from playwright.sync_api import Route, sync_playwright


BASE_URL = sys.argv[1].rstrip("/")


def reply(route: Route, data=None, *, code="S000", status=200):
    route.fulfill(
        status=status,
        content_type="application/json; charset=utf-8",
        body=json.dumps({"code": code, "data": data}, ensure_ascii=False),
    )


def path_of(route: Route) -> str:
    return urlparse(route.request.url).path


def block_unexpected(route: Route):
    path = path_of(route)
    if path == "/backend/api/auth/refresh":
        reply(route, code="A001", status=401)
        return
    raise AssertionError(f"Unexpected API request: {route.request.method} {path}")


def verify_login_form(browser):
    context = browser.new_context()
    page = context.new_page()
    submitted = []

    def handle(route: Route):
        path = path_of(route)
        if path == "/backend/api/auth/refresh":
            reply(route, code="A001", status=401)
        elif path == "/backend/api/auth/login" and route.request.method == "POST":
            submitted.append(route.request.post_data_json)
            reply(route, code="A001", status=401)
        else:
            block_unexpected(route)

    page.route("**/backend/api/**", handle)
    page.goto(f"{BASE_URL}/login", wait_until="domcontentloaded")

    username = page.get_by_label("아이디", exact=True)
    password = page.get_by_label("비밀번호", exact=True)
    username.wait_for(state="visible")

    assert username.get_attribute("required") == "", "아이디 required 속성이 없습니다."
    assert username.get_attribute("minlength") is None
    assert username.get_attribute("maxlength") is None
    assert username.get_attribute("pattern") is None
    assert username.get_attribute("autocomplete") == "username"
    assert password.get_attribute("required") == "", "비밀번호 required 속성이 없습니다."
    assert password.get_attribute("minlength") is None
    assert password.get_attribute("maxlength") is None
    assert password.get_attribute("pattern") is None
    assert password.get_attribute("autocomplete") == "current-password"
    assert password.get_attribute("type") == "password"

    username.fill("legacy.user+01")
    password.fill("Wrong123!")
    page.get_by_role("button", name="로그인", exact=True).click()
    notice = page.locator("p.auth-notice")
    notice.wait_for(state="visible")
    assert notice.inner_text() == "아이디 또는 비밀번호가 일치하지 않습니다."
    assert notice.get_attribute("aria-live") == "polite"
    assert password.input_value() == "", "실패 후 비밀번호 입력값이 지워지지 않았습니다."
    assert submitted == [{"username": "legacy.user+01", "password": "Wrong123!", "autoLogin": False}]
    context.close()


def verify_nullable_details(browser):
    context = browser.new_context()
    page = context.new_page()

    def handle(route: Route):
        path = path_of(route)
        if path == "/backend/api/auth/refresh":
            reply(route, code="A001", status=401)
        elif path in {
            "/backend/api/v1/community/posts/54",
            "/backend/api/v1/support/articles/57",
        }:
            reply(route, None)
        else:
            block_unexpected(route)

    page.route("**/backend/api/**", handle)
    page.goto(f"{BASE_URL}/community/posts/54", wait_until="domcontentloaded")
    post_alert = page.get_by_role("alert")
    post_alert.wait_for(state="visible")
    assert post_alert.inner_text() == "게시글을 찾을 수 없습니다."
    assert page.get_by_text("게시글을 불러오지 못했습니다.", exact=True).count() == 0

    page.goto(f"{BASE_URL}/support/57", wait_until="domcontentloaded")
    article_alert = page.get_by_role("alert")
    article_alert.wait_for(state="visible")
    assert article_alert.inner_text() == "안내를 찾을 수 없습니다."
    assert page.get_by_text("안내를 불러오지 못했습니다.", exact=True).count() == 0
    context.close()


def rcpc_item():
    return {
        "rentalId": 901,
        "pcAssetId": 902,
        "productNo": 901001,
        "managementNo": "CM-01",
        "serverRoomId": 71,
        "serverRoomName": "QA 서버실",
        "productTitle": "C-manager 권한 검수 RCPC",
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
        "preference": {"alias": "담당 RCPC", "favorite": False},
        "pcSpec": None,
        "remoteSupport": None,
    }


def verify_c_manager_favorites_capabilities(browser):
    context = browser.new_context()
    page = context.new_page()
    session_headers = []
    mutation_requests = []

    def handle(route: Route):
        path = path_of(route)
        if path == "/backend/api/auth/refresh":
            reply(route, code="A001", status=401)
        elif path == "/backend/api/auth/login" and route.request.method == "POST":
            reply(route, {
                "userId": "7001",
                "role": "USER",
                "status": "ACTIVE",
                "passwordChangeRequired": False,
                "accessToken": "qa.cmanager.token",
                "tokenType": "Bearer",
                "expiresInMs": 3_600_000,
            })
        elif path == "/backend/api/v1/my/organizations":
            reply(route, [{"id": "41", "name": "QA 고객사", "role": "c_manager"}])
        elif path == "/backend/api/v1/my/session":
            session_headers.append({key.lower(): value for key, value in route.request.headers.items()})
            reply(route, {
                "customerOrganizationId": "41",
                "customerMemberId": "401",
                "memberRole": "c_manager",
                "myPageOnly": True,
                "customerNicknameVisible": False,
                "commerceAvailable": False,
                "cManagerManagementAvailable": False,
                "displayName": "QA 담당자",
            })
        elif path == "/backend/api/v1/my/rcpcs":
            item = rcpc_item()
            if "favorite=true" in route.request.url:
                item = {**item, "preference": {**item["preference"], "favorite": True, "groupId": 81}}
            reply(route, {"items": [item], "page": 0, "size": 100 if "size=100" in route.request.url else 20, "totalElements": 1, "totalPages": 1})
        elif path == "/backend/api/v1/my/rcpcs/filter-options":
            reply(route, {"regions": ["서울"], "serverRooms": [{"id": 71, "name": "QA 서버실", "region": "서울"}],
                          "total": 1, "usageCounts": {"using": 1}, "unclassifiedFavoriteCount": 0})
        elif path == "/backend/api/v1/my/rcpc-groups" and route.request.method == "GET":
            reply(route, [{"id": 81, "name": "QA 그룹", "parentGroupId": None, "groupLevel": 1, "displayOrder": 0, "rcpcCount": 1, "children": []}])
        elif path == "/backend/api/v1/my/rcpcs/901/reboot" and route.request.method == "GET":
            reply(route, {"status": "idle", "pending": False, "available": True})
        else:
            if route.request.method != "GET" and ("/my/rcpc-groups" in path or "/my/rcpcs/" in path):
                mutation_requests.append(f"{route.request.method} {path}")
            block_unexpected(route)

    page.route("**/backend/api/**", handle)
    page.goto(f"{BASE_URL}/login?returnTo=%2Fmypage%2Frcpc", wait_until="domcontentloaded")
    page.get_by_label("아이디", exact=True).fill("qa_cmanager")
    page.get_by_label("비밀번호", exact=True).fill("Password1!")
    page.get_by_role("button", name="로그인", exact=True).click()
    page.wait_for_url("**/mypage/rcpc")
    page.locator(".rcpc-list--table").get_by_text("담당 RCPC", exact=True).wait_for(state="visible")

    assert page.get_by_role("button", name="기간연장", exact=True).count() == 0
    assert page.get_by_role("link", name="기간연장", exact=True).count() == 0
    assert page.get_by_text("기간연장", exact=True).count() == 0
    assert session_headers, "C-manager capability 요청이 발생하지 않았습니다."
    assert session_headers[-1].get("x-customer-organization-id") == "41"
    assert session_headers[-1].get("authorization") == "Bearer qa.cmanager.token"

    page.get_by_role("link", name="즐겨찾기 그룹", exact=True).click()
    page.wait_for_url("**/mypage/favorites")
    page.locator(".favorites-results").wait_for(state="visible")
    page.locator(".mypage-home-rcpc").get_by_text("담당 RCPC", exact=True).wait_for(state="visible")
    assert page.get_by_role("button", name="문의", exact=True).count() >= 1
    assert page.locator('.favorites-groups a:has-text("편집")').count() == 1
    assert page.locator('.favorites-groups button:has-text("추가")').count() == 1
    assert page.locator('button[form="favorite-groups-editor"]').count() == 0
    assert page.locator("#favorite-groups-editor").count() == 0
    assert page.get_by_role("button", name="그룹 변경", exact=True).count() == 1
    assert page.get_by_role("button", name="기간연장", exact=True).count() == 0
    assert page.locator('button[aria-label*="RCPC 별명 설정"]').count() == 0
    assert page.locator('button[aria-label="즐겨찾기 추가"], button[aria-label="즐겨찾기 해제"]').count() == 1
    assert mutation_requests == [], f"C-manager 화면 진입 중 mutation 요청 발생: {mutation_requests}"
    context.close()


def account_order():
    now = datetime.now()
    ordered_at = (now - timedelta(days=1)).replace(microsecond=0).isoformat()
    service_started_at = (now - timedelta(days=1)).replace(microsecond=0).isoformat()
    service_ends_at = (now + timedelta(days=30)).replace(microsecond=0).isoformat()
    automatic_confirmation_at = (now + timedelta(days=5)).replace(microsecond=0).isoformat()
    return {
        "orderId": 801,
        "orderNo": "QA-ORDER-801",
        "orderStatus": "paid",
        "paymentStatus": "approved",
        "paymentMethod": None,
        "paymentRecordStatus": None,
        "virtualAccountStatus": None,
        "virtualAccountDepositDueAt": None,
        "paymentTerminationReason": None,
        "currency": "KRW",
        "subtotalAmount": 50000,
        "setupFeeAmount": 0,
        "couponDiscountAmount": 0,
        "pointUsedAmount": 0,
        "finalAmount": 50000,
        "orderedAt": ordered_at,
        "reservationExpiresAt": None,
        "items": [{
            "orderItemId": 802,
            "productNo": 901002,
            "title": "PDF 대시보드 검수 RCPC",
            "serverRoomName": "QA 서버실",
            "categoryCode": "RCPC",
            "categoryName": "RCPC",
            "pcAssetId": 902,
            "quantity": 1,
            "billingUnit": "30day",
            "durationUnits": 1,
            "unitPrice": 50000,
            "setupFee": 0,
            "amount": 50000,
            "itemStatus": "active",
            "serviceStartedAt": service_started_at,
            "serviceEndsAt": service_ends_at,
            "rentalId": 901,
            "rentalStatus": "active",
            "purchaseConfirmedAt": None,
            "automaticConfirmationAt": automatic_confirmation_at,
            "specSummary": None,
            "imageUrl": None,
            "couponDiscountAmount": 0,
            "pointUsedAmount": 0,
            "refundPending": False,
            "reviewId": None,
            "expectedPoints": 500,
            "accruedPoints": None,
            "customerRentalStatus": "using",
            "instantAvailable": True,
        }],
    }


def verify_dashboard_pdf_cta_and_responsive_product_search(browser):
    for width, height in ((1024, 768), (390, 844)):
        context = browser.new_context(viewport={"width": width, "height": height})
        page = context.new_page()
        searched_queries = []

        def handle(route: Route):
            path = path_of(route)
            parsed = urlparse(route.request.url)
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
                reply(route, [{"id": "42", "name": "QA 고객사", "role": "owner"}])
            elif path == "/backend/api/v1/my/session":
                reply(route, {
                    "customerOrganizationId": "42",
                    "customerMemberId": "402",
                    "memberRole": "owner",
                    "myPageOnly": False,
                    "customerNicknameVisible": True,
                    "commerceAvailable": True,
                    "cManagerManagementAvailable": True,
                    "displayName": "QA 대표관리자",
                })
            elif path == "/backend/api/v1/my/profile":
                reply(route, {
                    "username": "qa_owner", "name": "QA 대표관리자", "nickname": "QA",
                    "nicknameChangedAt": None, "nicknameChangeAvailableAt": None,
                    "phone": None, "messengerType": None, "messengerId": None,
                    "email": None, "marketingEmailAgreed": False,
                    "marketingEmailConsentChangedAt": None, "updatedAt": None,
                    "profileImageAttachmentId": None,
                })
            elif path == "/backend/api/v1/my/benefits/summary":
                reply(route, {"pointBalance": 0, "availableCouponCount": 0, "expiringCouponCount": 0})
            elif path == "/backend/api/v1/cart":
                reply(route, {"cartId": None, "items": []})
            elif path == "/backend/api/v1/my/rcpcs/summary":
                reply(route, {
                    "total": 1,
                    "usageCounts": {"using": 1, "extension_waiting": 0, "ended": 0, "other": 0},
                    "statusCounts": {
                        "pending_payment": 0, "ready": 0, "active": 1, "expiring": 0,
                        "grace_period": 0, "access_restricted": 0, "expired": 0,
                        "termination_pending": 0, "resetting": 0, "terminated": 0,
                        "cancelled": 0, "refunded": 0, "other": 0,
                    },
                })
            elif path == "/backend/api/v1/my/rcpcs":
                if "productNo=" in parsed.query:
                    searched_queries.append(parsed.query)
                item = {**rcpc_item(), "productNo": 901002}
                size = 10 if "size=10" in parsed.query else (5 if "size=5" in parsed.query else 20)
                reply(route, {"items": [item], "page": 0, "size": size, "totalElements": 1, "totalPages": 1})
            elif path == "/backend/api/v1/my/rcpcs/filter-options":
                reply(route, {"regions": ["서울"], "serverRooms": [{"id": 71, "name": "QA 서버실", "region": "서울"}],
                              "total": 1, "usageCounts": {"using": 1}, "unclassifiedFavoriteCount": 0})
            elif path == "/backend/api/v1/my/rcpcs/901/reboot":
                reply(route, {"status": "idle", "pending": False, "available": True})
            elif path == "/backend/api/v1/my/orders":
                reply(route, {"items": [account_order()], "page": 0, "size": 100, "totalElements": 1,
                              "totalPages": 1, "allCount": 1, "completedCount": 1, "cancelledOrRefundedCount": 0})
            elif path == "/backend/api/v1/my/storage":
                reply(route, {"items": [], "page": 0, "size": 1, "totalElements": 0, "totalPages": 0})
            elif path == "/backend/api/v1/my/storage/summary":
                reply(route, {"rentalCount": 0, "partCount": 0, "totalCount": 0})
            elif path == "/backend/api/v1/operation-requests":
                reply(route, {"items": [], "page": 0, "size": 5, "total": 0})
            elif path == "/backend/api/v1/community/posts":
                reply(route, {"items": [], "page": 0, "size": 100, "totalCount": 0, "totalPages": 0})
            else:
                block_unexpected(route)

        page.route("**/backend/api/**", handle)
        page.goto(f"{BASE_URL}/login?returnTo=%2Fmypage", wait_until="domcontentloaded")
        page.get_by_label("아이디", exact=True).fill("qa_owner")
        page.get_by_label("비밀번호", exact=True).fill("Password1!")
        page.get_by_role("button", name="로그인", exact=True).click()
        page.wait_for_url("**/mypage")

        orders_link = page.get_by_role("link", name="주문내역 보기", exact=True)
        if width >= 768:
            orders_link.wait_for(state="visible")
            href = orders_link.get_attribute("href")
            assert href and urlparse(page.url).scheme
            assert urlparse(page.evaluate("([href]) => new URL(href, window.location.href).href", [href])).path == "/mypage/orders"
        else:
            assert not orders_link.is_visible(), "모바일 원본에서 숨긴 주문 요약이 노출됐습니다."
        more_links = page.get_by_role("link", name="더보기", exact=True)
        if width >= 768:
            assert more_links.count() >= 1
        else:
            assert more_links.count() == 0, "모바일 원본에서 숨긴 요약 더보기가 노출됐습니다."

        if width < 768:
            page.get_by_role("button", name="품번 검색 열기", exact=True).click()
        search = page.get_by_label("품번 검색", exact=True).filter(visible=True)
        search.wait_for(state="visible")
        search_box = search.bounding_box()
        assert search_box is not None
        assert search_box["x"] >= 0 and search_box["x"] + search_box["width"] <= width
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")

        search.fill("901002")
        if width >= 768:
            result = page.get_by_role("button", name="901002", exact=True)
            result.wait_for(state="visible")
            result_box = result.bounding_box()
            assert result_box is not None
            assert result_box["x"] >= 0 and result_box["x"] + result_box["width"] <= width
            result.click()
        else:
            page.get_by_role("button", name="조회", exact=True).click()
        page.wait_for_url("**/mypage/rcpc?productNo=901002")
        if width >= 768:
            assert searched_queries, f"{width}px에서 품번 검색 API가 호출되지 않았습니다."
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        context.close()


def main():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            verify_login_form(browser)
            verify_nullable_details(browser)
            verify_c_manager_favorites_capabilities(browser)
            verify_dashboard_pdf_cta_and_responsive_product_search(browser)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
