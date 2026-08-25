import * as React from "react";

function CartMarketFoodIconSvg({ width = 200, height = 200, ...props }) {
  const size = Math.max(width, height);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6.5h2l2 9h10.5l2-6.5H7" />
      <circle cx={9} cy={20} r={1.5} />
      <circle cx={17} cy={20} r={1.5} />
      <path d="M9.2 6.8h5.6l.6 5a1 1 0 01-1 1.2H9.6a1 1 0 01-1-1.2l.6-5zM10.6 6.8a1.7 1.7 0 012.8-1.2 1.7 1.7 0 01.6 1.2" />
    </svg>
  );
}

const CartMarketFoodIcon = React.memo(CartMarketFoodIconSvg);
export default CartMarketFoodIcon;
