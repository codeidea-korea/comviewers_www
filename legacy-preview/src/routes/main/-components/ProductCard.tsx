import { ASSET_ROOT, type Product } from "../../../storefront-data";
import Tag from "../../../components/ui/Tag";

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-card" data-testid="product-card">
      <div className="product-card__image"><img src={product.image} alt={`RCPC 상품 ${product.id}`} /><img className="product-card__windows" src={`${ASSET_ROOT}/windows-logo.svg`} alt="Windows 11" /></div>
      <dl className="product-card__specs">
        <SpecRow label="품번">WJ89023</SpecRow>
        <SpecRow label="OS" className="spec-row--single">Microsoft Windows 10 Pro (64Bit)</SpecRow>
        <SpecRow label="CPU">AMD Ryzen 3 2200G with Radeon Vega Graphics 4 Cores</SpecRow>
        <SpecRow label="RAM"><Tag color="blue">DDR3/6G</Tag></SpecRow>
        <SpecRow label="DISK"><Tag color="gray">SSD/120G</Tag></SpecRow>
        <SpecRow label="GPU"><Tag color="red">GeForce GTX 1650 (4GB)</Tag></SpecRow>
      </dl>
      <div className="product-card__price"><span>월 렌탈료</span><strong>833,000<small>원</small></strong></div>
    </article>
  );
}

function SpecRow({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`spec-row ${className}`}><dt>{label}</dt><dd>{children}</dd></div>;
}
