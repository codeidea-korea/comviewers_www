import SelectBoxS from "./SelectBox";
import ServerState from "./ServerState";
import Tag from "./Tag";

type ProductListVariant = "장바구니" | "주문서" | "장바구니(파트)" | "주문서(파트)";

type ProductListProps = {
  property1?: ProductListVariant;
  productNumber?: string;
  location?: string;
  productName?: string;
  specifications?: string;
  setupFee?: string;
  monthlyFee?: string;
  usagePeriod?: string;
  quantity?: string;
  point?: string;
  totalPrice?: string;
  itemPrice?: string;
  imageSrc?: string;
};

const defaultSpecifications = "Microsoft Windows 10 Pro (64Bit) / AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores / DDR3 128G / SSD 120GB / NVIDIA GeForce GT 720 (2GB)ŽIntel(R) HD Graphics 4600 (1GB) (2 GB)";

function ProductImage({ imageSrc, compact }: { imageSrc: string; compact: boolean }) {
  return (
    <div className={["figma-product-list__image", compact && "figma-product-list__image--compact"].filter(Boolean).join(" ")}>
      <img className="figma-product-list__image-file" src={imageSrc} alt="" />
      <img className="figma-product-list__image-logo" src="/assets/figma-product-list-windows-logo.svg" alt="" />
    </div>
  );
}

function ProductHeader({ isCart, isPart, productNumber, location, productName }: { isCart: boolean; isPart: boolean; productNumber: string; location: string; productName: string }) {
  return (
    <div className="figma-product-list__header">
      <div className="figma-product-list__identifier">
        {isCart && <SelectBoxS state="on" />}
        {isPart ? <strong>{productName}</strong> : <><span>품번 <strong>{productNumber}</strong></span><Tag color="gray">{location}</Tag></>}
      </div>
      {isCart && <img className="figma-product-list__close" src="/assets/figma-product-list-close.svg" alt="" />}
    </div>
  );
}

function ConnectionInfo({ specifications }: { specifications: string }) {
  return (
    <div className="figma-product-list__connection">
      <span className="figma-product-list__available"><ServerState server="on" />구매 즉시 접속 가능합니다.</span>
      <span className="figma-product-list__specifications">{specifications}</span>
    </div>
  );
}

function Quantity({ quantity }: { quantity: string }) {
  return <div className="figma-product-list__quantity"><span><img src="/assets/figma-product-list-remove.svg" alt="" /></span><strong>{quantity}</strong><span><img src="/assets/figma-product-list-add.svg" alt="" /></span></div>;
}

export default function ProductList({ property1 = "장바구니", productNumber = "89023", location = "IRC코리아/메가서버실", productName = "파트상품이름", specifications = defaultSpecifications, setupFee = "5,000", monthlyFee = "32,000", usagePeriod = "1", quantity = "1", point = "370", totalPrice, itemPrice = "120,000", imageSrc = "/assets/figma-product-list-windows.png" }: ProductListProps) {
  const isCart = property1.startsWith("장바구니");
  const isPart = property1.endsWith("(파트)");
  const resolvedTotal = totalPrice ?? (isPart && isCart ? itemPrice : "37,000");

  return (
    <article className={["figma-product-list", isCart ? "figma-product-list--cart" : "figma-product-list--order", isPart && "figma-product-list--part"].filter(Boolean).join(" ")}>
      <ProductHeader isCart={isCart} isPart={isPart} productNumber={productNumber} location={location} productName={productName} />
      <div className="figma-product-list__product">
        <ProductImage imageSrc={imageSrc} compact={!isCart} />
        <div className="figma-product-list__details">
          {!isCart || !isPart ? <ConnectionInfo specifications={specifications} /> : <span className="figma-product-list__specifications">{specifications}</span>}
          {isCart && !isPart && <div className="figma-product-list__fees"><span>세팅비 <strong>{setupFee}원</strong></span><span>월 렌탈료 <strong>{monthlyFee}원</strong></span></div>}
          {isCart && <div className="figma-product-list__cart-summary"><span className="figma-product-list__count"><Quantity quantity={quantity} />{isPart ? "개" : "개월"}</span><span className="figma-product-list__cart-price">{!isPart && <span className="figma-product-list__point">포인트 적립 <strong>{point}점</strong></span>}<strong>{resolvedTotal}원</strong></span></div>}
        </div>
      </div>
      {!isCart && <div className="figma-product-list__order-summary">{isPart ? <><span>상품금액 <strong>{itemPrice}원</strong></span><i /><span>수량 <strong>{quantity}원</strong></span></> : <><span>세팅비 <strong>{setupFee}원</strong></span><i /><span>월 렌탈료 <strong>{monthlyFee}원</strong></span><i /><span>이용기간 <strong>{usagePeriod}일</strong></span></>}<span className="figma-product-list__order-total">{!isPart && <span className="figma-product-list__point"><strong>{point}점</strong> 적립</span>}<strong>{resolvedTotal}원</strong></span></div>}
    </article>
  );
}
