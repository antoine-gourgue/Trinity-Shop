import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X } from "lucide-react";

const PopoverCart = () => {
  return (
    <Popover>
      <PopoverTrigger>
        <X size={24} />
      </PopoverTrigger>
      <PopoverContent>Place content for the popover here.</PopoverContent>
    </Popover>
  );
};

export default PopoverCart;
