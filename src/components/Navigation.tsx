import { Link } from "react-router-dom";
import { LoginArea } from "@/components/auth/LoginArea";

export function Navigation() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold">
          YakBak
        </Link>

        <div className="flex items-center gap-4">
          <LoginArea />
        </div>
      </div>
    </nav>
  );
}
