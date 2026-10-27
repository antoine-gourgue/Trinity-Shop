import Image from "next/image";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { Leaf, ScanBarcode, Store } from "lucide-react";
import { auth } from "@/auth";
import Logo from "@/components/general/logo";

interface Props {
  children: ReactNode;
}

const PERKS = [
  { icon: Store, text: "Vos courses prêtes au drive de votre magasin Trinity" },
  { icon: Leaf, text: "Plus de 900 produits U, dont une large gamme bio" },
  { icon: ScanBarcode, text: "Scannez un code-barres pour retrouver un produit" },
];

const AuthLayout = async ({ children }: Props) => {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen w-full bg-white">
      <div className="flex w-full flex-col md:w-1/2">
        <div className="px-6 pt-6 md:px-10">
          <Logo />
        </div>
        <div className="flex flex-1">{children}</div>
      </div>

      <div className="relative m-3 hidden w-1/2 overflow-hidden rounded-3xl bg-brand-dark p-12 text-white md:flex md:flex-col md:justify-end">
        <Image
          src="/assets/fruits.png"
          alt=""
          width={640}
          height={640}
          priority
          className="pointer-events-none absolute -right-28 -top-20 w-[560px] rotate-12 opacity-90"
        />
        <div className="relative">
          <h2 className="max-w-md text-4xl font-black leading-tight">
            Vos courses du quotidien, <span className="text-highlight">en quelques clics</span>
          </h2>
          <ul className="mt-8 space-y-4">
            {PERKS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/85">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon size={20} aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
