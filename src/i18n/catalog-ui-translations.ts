/** Protected catalog/accessibility copy; product specifications stay unchanged. */
export const catalogUiTranslations = [
  ['catalogUi.mouseUnknown', '마우스 정보 없음', 'Chưa có thông tin chuột', 'マウス情報なし', 'Mouse information unavailable', '暂无鼠标信息', '暫無滑鼠資訊'],
  ['catalogUi.mouseAvailable', '마우스 사용 가능', 'Có thể sử dụng chuột', 'マウス利用可能', 'Mouse available', '鼠标可用', '滑鼠可用'],
  ['catalogUi.mouseUnavailable', '마우스 사용 불가', 'Không thể sử dụng chuột', 'マウス利用不可', 'Mouse unavailable', '鼠标不可用', '滑鼠不可用'],
  ['catalogUi.keyboardUnknown', '키보드 정보 없음', 'Chưa có thông tin bàn phím', 'キーボード情報なし', 'Keyboard information unavailable', '暂无键盘信息', '暫無鍵盤資訊'],
  ['catalogUi.keyboardAvailable', '키보드 사용 가능', 'Có thể sử dụng bàn phím', 'キーボード利用可能', 'Keyboard available', '键盘可用', '鍵盤可用'],
  ['catalogUi.keyboardUnavailable', '키보드 사용 불가', 'Không thể sử dụng bàn phím', 'キーボード利用不可', 'Keyboard unavailable', '键盘不可用', '鍵盤不可用'],
  ['catalogUi.mouseIncluded', '마우스 포함', 'Có chuột', 'マウス付属', 'Mouse included', '包含鼠标', '包含滑鼠'],
  ['catalogUi.mouseExcluded', '마우스 미포함', 'Không kèm chuột', 'マウスなし', 'Mouse not included', '不含鼠标', '不含滑鼠'],
  ['catalogUi.keyboardIncluded', '키보드 포함', 'Có bàn phím', 'キーボード付属', 'Keyboard included', '包含键盘', '包含鍵盤'],
  ['catalogUi.keyboardExcluded', '키보드 미포함', 'Không kèm bàn phím', 'キーボードなし', 'Keyboard not included', '不含键盘', '不含鍵盤'],
  ['catalogUi.korea', '대한민국', 'Hàn Quốc', '韓国', 'South Korea', '韩国', '韓國'],
  ['catalogUi.countryUnknown', '국가/IP 정보 없음', 'Chưa có thông tin quốc gia/IP', '国・IP情報なし', 'Country/IP information unavailable', '暂无国家/IP信息', '暫無國家/IP資訊'],
  ['catalogUi.addProduct', '{id} 장바구니 담기', 'Thêm {id} vào giỏ hàng', '{id}をカートに追加', 'Add {id} to cart', '将{id}加入购物车', '將{id}加入購物車'],
  ['catalogUi.productList', 'RCPC 상품 목록', 'Danh sách sản phẩm RCPC', 'RCPC商品一覧', 'RCPC product list', 'RCPC商品列表', 'RCPC商品清單'],
  ['catalogUi.productDetails', '상품 {id} 상세 보기', 'Xem chi tiết sản phẩm {id}', '商品{id}の詳細を見る', 'View product {id} details', '查看商品{id}详情', '查看商品{id}詳情'],
  ['catalogUi.skipMain', '본문으로 건너뛰기', 'Chuyển đến nội dung chính', '本文へスキップ', 'Skip to main content', '跳至正文', '跳至正文'],
  ['catalogUi.routeLoading', '화면을 불러오는 중입니다.', 'Đang tải trang.', '画面を読み込んでいます。', 'Loading page.', '正在加载页面。', '正在載入頁面。'],
  ['catalogUi.back', '뒤로가기', 'Quay lại', '戻る', 'Go back', '返回', '返回'],
  ['catalogUi.closeSelector', '{label} 선택 닫기', 'Đóng lựa chọn {label}', '{label}の選択を閉じる', 'Close {label} selection', '关闭{label}选择', '關閉{label}選取'],
  ['catalogUi.chooseFilter', '{label} 선택', 'Chọn {label}', '{label}を選択', 'Select {label}', '选择{label}', '選取{label}'],
  ['catalogUi.removeFilter', '{label} 필터 해제', 'Xóa bộ lọc {label}', '{label}のフィルターを解除', 'Remove {label} filter', '清除{label}筛选', '清除{label}篩選'],
  ['catalogUi.serverRoomId', '서버실 {id}', 'Phòng máy chủ {id}', 'サーバールーム{id}', 'Server room {id}', '机房{id}', '機房{id}'],
  ['catalogUi.supportLoading', '안내를 불러오는 중입니다.', 'Đang tải thông tin hướng dẫn.', '案内を読み込んでいます。', 'Loading information.', '正在加载说明。', '正在載入說明。'],
  ['catalogUi.documentLoading', '문서를 불러오는 중입니다.', 'Đang tải tài liệu.', '文書を読み込んでいます。', 'Loading document.', '正在加载文档。', '正在載入文件。'],
  ['catalogUi.noticeLoading', '공지사항을 불러오는 중입니다.', 'Đang tải thông báo.', 'お知らせを読み込んでいます。', 'Loading notices.', '正在加载公告。', '正在載入公告。'],
  ['catalogUi.recommendedLoading', '추천 상품을 불러오는 중입니다.', 'Đang tải sản phẩm đề xuất.', 'おすすめ商品を読み込んでいます。', 'Loading recommended products.', '正在加载推荐商品。', '正在載入推薦商品。'],
] as const

export const catalogUiOverrides = catalogUiTranslations.map(([key, ko, vi, ja, en, simplified, traditional]) => ({
  key, source: 'catalogUi' as const, ko, vi, ja, en, 'zh-CN': simplified, 'zh-TW': traditional,
}))
