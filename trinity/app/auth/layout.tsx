  import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const AuthLayout = async ({ children }: Props) => {
  const session = await auth();

  if (session?.user) {
    redirect("/");
  }

  return (
    <div className="w-full h-screen flex border-8 border-white">
      {children}
      <div className="hidden w-1/2 bg-blue-600 rounded-xl md:flex justify-center items-center"></div>
    </div>
  );
};

export default AuthLayout;
