import { Product } from "@prisma/client";

interface Props {
  product: Product;
}

const ProductDetails = ({ product }: Props) => {
  return (
    <div>
      <h1>{product.name}</h1>
    </div>
  );
};

export default ProductDetails;
