export function CartMoney({ className = '', value }: { className?: string; value: number | null }) {
  if (value === null) return <span className={`cart-money${className ? ` ${className}` : ''}`}>-</span>
  return <span className={`cart-money${className ? ` ${className}` : ''}`}><span>{value.toLocaleString('ko-KR')}</span><span>원</span></span>
}
