import { createBrowserRouter } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Profile } from "@/pages/Profile";
import { Settings } from "@/pages/Settings";
import { Navigation } from "@/components/Navigation";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <>
        <Navigation />
        <Home />
      </>
    ),
  },
  {
    path: "/profile/:npub",
    element: (
      <>
        <Navigation />
        <Profile />
      </>
    ),
  },
  {
    path: "/settings",
    element: (
      <>
        <Navigation />
        <Settings />
      </>
    ),
  },
]);
