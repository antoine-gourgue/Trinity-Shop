import {
  Apple,
  Bean,
  Beef,
  Cake,
  CakeSlice,
  Candy,
  Carrot,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  Cuboid,
  CupSoda,
  Cylinder,
  Dessert,
  Droplet,
  Droplets,
  Drumstick,
  Egg,
  Fish,
  GlassWater,
  Ham,
  IceCreamCone,
  LeafyGreen,
  Lollipop,
  LucideProps,
  Martini,
  Milk,
  Nut,
  Pizza,
  Popcorn,
  Popsicle,
  Salad,
  Sandwich,
  Shell,
  Soup,
  UtensilsCrossed,
  Wheat,
} from "lucide-react";

// Lucide n'a pas de fromage : part de fromage dessinée dans le même style
function Cheese({ size = 24, strokeWidth = 2, className, ...props }: LucideProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 11 14 4l7 4v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M3 11h18" />
      <circle cx="8" cy="15.5" r="1" />
      <circle cx="15" cy="16" r="1.5" />
    </svg>
  );
}

const ICONS = {
  Apple,
  Bean,
  Beef,
  Cake,
  CakeSlice,
  Candy,
  Carrot,
  Cheese,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  Cuboid,
  CupSoda,
  Cylinder,
  Dessert,
  Droplet,
  Droplets,
  Drumstick,
  Egg,
  Fish,
  GlassWater,
  Ham,
  IceCreamCone,
  LeafyGreen,
  Lollipop,
  Martini,
  Milk,
  Nut,
  Pizza,
  Popcorn,
  Popsicle,
  Salad,
  Sandwich,
  Shell,
  Soup,
  UtensilsCrossed,
  Wheat,
};

interface SubcategoryIconProps extends LucideProps {
  name: string;
}

export default function SubcategoryIcon({ name, ...props }: SubcategoryIconProps) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? UtensilsCrossed;
  return <Icon aria-hidden {...props} />;
}
