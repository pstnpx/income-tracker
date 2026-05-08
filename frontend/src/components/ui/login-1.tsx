import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Login1Props {
  heading?: string;
  logo?: {
    url: string;
    src: string;
    alt: string;
    title?: string;
  };
  buttonText?: string;
  googleText?: string;
}

const Login1 = ({
  heading = "Income Dashboard",
  logo,
  buttonText = "Login",
  googleText = "Sign in with Google",
}: Login1Props) => {
  return (
    <section className="bg-background h-screen">
      <div className="flex h-full items-center justify-center">
        <div className="border-muted bg-background flex w-full max-w-sm flex-col items-center gap-y-8 rounded-md border px-6 py-12 shadow-md">
          <div className="flex flex-col items-center gap-y-2">
            {logo ? (
              <div className="flex items-center gap-1">
                <a href={logo.url}>
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    title={logo.title}
                    className="h-10 dark:invert"
                  />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
              </div>
            )}
            {heading && <h1 className="text-3xl font-semibold">{heading}</h1>}
          </div>

          <div className="flex w-full flex-col gap-8">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Input type="email" placeholder="Email" required />
              </div>
              <div className="flex flex-col gap-2">
                <Input type="password" placeholder="Password" required />
              </div>
              <div className="flex flex-col gap-4">
                <Button type="submit" className="mt-2 w-full">
                  {buttonText}
                </Button>
                <Button variant="outline" className="w-full" disabled>
                  <FcGoogle className="mr-2 size-5" />
                  {googleText}
                </Button>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">Google sign-in coming soon</p>
        </div>
      </div>
    </section>
  );
};

export { Login1 };
