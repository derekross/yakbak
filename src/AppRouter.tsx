import { BrowserRouter, Route, Routes } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { VoiceFeed } from "./pages/VoiceFeed";
import { Profile } from "./pages/Profile";
import { Navigation } from "@/components/Navigation";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<VoiceFeed />} />
        <Route path="/about" element={<Index />} />
        <Route path="/profile/:npub" element={<Profile />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
export default AppRouter;
