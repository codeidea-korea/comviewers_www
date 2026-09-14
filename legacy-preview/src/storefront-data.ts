export const ASSET_ROOT = "/assets";

export type Product = { id: number; image: string };

export const products: Product[] = Array.from({ length: 8 }, (_, index) => ({ id: index + 1, image: `${ASSET_ROOT}/product-${index + 1}.png` }));

export const introCards = [
  { image: `${ASSET_ROOT}/intro-remote.png`, title: "하드웨어를 구매하지 않아도\n전문 PC 환경에서", description: "새로운 장비를 직접 구매하지 않아도 필요한 고사양 PC 또는 특정 콘텐츠가 구성된 PC 환경을 간편하게 렌탈하여 사용할 수 있습니다." },
  { image: `${ASSET_ROOT}/intro-compare.png`, title: "사양과 목적에 맞는\nRCPC 상품 비교", description: "CPU, RAM, SSD, GPU, OS 등 주요 사양과 이용 조건을 확인하고 업무, 연구, 교육, 테스트 등 목적에 맞는 상품을 선택할 수 있습니다." },
  { image: `${ASSET_ROOT}/intro-server.png`, title: "서버실 기반의\n전문 운영 구조", description: "서버실에서 운영되는 RCPC 상품을 기반으로 상품 정보, 이용 조건, 원격 접속 환경을 확인할 수 있어 보다 체계적인 이용이 가능합니다." },
] as const;

export const banners = [
  { image: `${ASSET_ROOT}/banner-office.png`, overlay: undefined, eyebrow: "업무에 최적화된 RCPC", title: "문서 작업부터 협업 환경까지\n안정적으로 지원합니다" },
  { image: `${ASSET_ROOT}/banner-game.png`, overlay: `${ASSET_ROOT}/banner-game-overlay.png`, eyebrow: "인기 게임을 위한 고성능 RCPC", title: "안정적인 플레이 환경을\n렌탈로 바로 이용해보세요" },
  { image: `${ASSET_ROOT}/banner-new.png`, overlay: undefined, eyebrow: "새롭게 추가된 RCPC 상품", title: "최신 사양의 원격 PC 환경을\n빠르게 만나보세요" },
] as const;

export const boardColumns = [
  { title: "사용자 Q&A", action: "질문하기", items: ["게임용 RCPC는 어떤 사양으로 선택하면 될까요?", "렌탈한 RCPC는 결제 후 바로 접속해서 사용할 수 있나요?", "영상 편집 작업용으로 안정적인 RCPC 추천 부탁드립니다", "사용 중인 RCPC 사양은 중간에 변경할 수 있나요?", "원격 접속할 때 끊김이나 지연이 심하지 않은가요?"] },
  { title: "커뮤니티 게시판", action: "전체보기", items: ["바로 이용할 수 있어서 편하네요", "게임용 RCPC 렌탈 스펙 추천 부탁드려요. 오버워치 하고싶은데 컴이 제대로 돌아가질 않아요 ㅜ", "설치 없이 원격 PC 쓰니까 관리가 편하네요", "렌탈 PC 사용 중 지연 없이 플레이 가능할까요?", "렌탈 PC 사용 중 지연 없이 플레이 가능할까요?"] },
] as const;

export const steps = [
  { icon: `${ASSET_ROOT}/step-compare.svg`, title: "비교하기", description: "원하는 RCPC 상품을\n비교해보세요." },
  { icon: `${ASSET_ROOT}/step-purchase.svg`, title: "구매하기", description: "RCPC 상품 구매를\n구매해보세요." },
  { icon: `${ASSET_ROOT}/step-access.svg`, title: "접속확인", description: "원격 접속 정보를\n확인해요." },
  { icon: `${ASSET_ROOT}/step-use.svg`, title: "즉시이용", description: "바로 이용이\n가능해요." },
] as const;

export const infoBlocks = [
  { icon: `${ASSET_ROOT}/info-remote.png`, title: "원격제어 기반 접속 구조", description: "사용자는 별도 장비 설치 없이 원격제어 환경을 통해 RCPC에 접속할 수 있으며, 상품별 접속 정보를 기준으로 필요한 PC 환경을 이용할 수 있습니다." },
  { icon: `${ASSET_ROOT}/info-status.png`, title: "상태 신호 기반 운영 확인", description: "RCPC 상품의 상태 신호를 기준으로 운영 여부를 실시간으로 확인하고, 상품 이용에 필요한 상태 정보를 보다 체계적으로 관리할 수 있습니다." },
  { icon: `${ASSET_ROOT}/info-auth.png`, title: "이용 권한 기반 접속 정보 제공", description: "RCPC 접속 정보는 주문 및 이용 권한을 기준으로 제공되며, 사용자는 본인에게 부여된 상품 정보에 따라 원격 PC에 접속할 수 있습니다." },
  { icon: `${ASSET_ROOT}/info-network.png`, title: "네트워크 접속 환경 지원", description: "RCPC 이용에 필요한 원격 접속 환경과 네트워크 구성을 기반으로, 사용자가 안정적으로 PC 환경에 연결할 수 있도록 지원합니다." },
] as const;

