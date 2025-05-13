import { Link } from "react-router-dom";
import { LoginArea } from "@/components/auth/LoginArea";

export function Navigation() {
  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/yakbak-logo.png" alt="YakBak Logo" className="h-8 w-8" />
            <span className="text-xl font-bold">YakBak</span>
          </Link>
        </div>
        <div>
          <LoginArea />
        </div>
      </div>
    </nav>
  );
}
