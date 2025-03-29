"use client";

import { Plus } from "lucide-react";
import { Button } from "../ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Product } from "@prisma/client";

interface AddTocartProps {
  id: Product["id"];
}

const AddToCart = ({ id }: AddTocartProps) => {
  const router = useRouter();
  const session = useSession();

  const handleClick = (event: any) => {
    if (!session?.data?.user) {
      router.push("/auth");
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    console.log("Add to cart");
    event.preventDefault();
    event.stopPropagation();
  };
  return (
    <Button
      size={"icon"}
      className="rounded-full absolute top-2 right-2"
      onClick={handleClick}
    >
      <Plus />
    </Button>
  );
};

export default AddToCart;
