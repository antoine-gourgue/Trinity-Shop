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
  Brush,
  Cloud,
  Feather,
  ScrollText,
  ShowerHead,
  SprayCan,
  WashingMachine,
  Waves,
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

// Ni dent ni rasoir chez Lucide : dessinés dans le même style
function Tooth({ size = 24, strokeWidth = 2, className, ...props }: LucideProps) {
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
      <path d="M12 5.5C10.5 4 8.7 3.5 7 3.5 4.5 3.5 3 5.5 3 8c0 2.5 1 4 1.5 6s.8 6.5 2.5 6.5c1.8 0 1.8-4.5 3-6 .5-.6 1.5-.6 2 0 1.2 1.5 1.2 6 3 6 1.7 0 2-4.5 2.5-6.5S21 10.5 21 8c0-2.5-1.5-4.5-4-4.5-1.7 0-3.5.5-5 2Z" />
    </svg>
  );
}

function Razor({ size = 24, strokeWidth = 2, className, ...props }: LucideProps) {
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
      <rect x="4" y="3" width="16" height="5" rx="1.5" />
      <path d="M7 5.5h10" />
      <path d="M12 8v13" />
      <path d="M10.5 12h3M10.5 15.5h3" />
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
  Brush,
  Cloud,
  Feather,
  Razor,
  ScrollText,
  ShowerHead,
  SprayCan,
  Tooth,
  WashingMachine,
  Waves,
};

interface SubcategoryIconProps extends LucideProps {
  name: string;
}

export default function SubcategoryIcon({ name, ...props }: SubcategoryIconProps) {
  const Icon = ICONS[name as keyof typeof ICONS] ?? UtensilsCrossed;
  return <Icon aria-hidden {...props} />;
}
