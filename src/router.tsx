import { createBrowserRouter } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Profile } from "@/pages/Profile";
import { Settings } from "@/pages/Settings";
import { About } from "@/pages/About";
import { VoiceMessagePage } from "@/pages/VoiceMessagePage";
import { HashtagPage } from "@/pages/HashtagPage";
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
  {
    path: "/about",
    element: (
      <>
        <Navigation />
        <About />
      </>
    ),
  },
  {
    path: "/message/:nevent",
    element: (
      <>
        <Navigation />
        <VoiceMessagePage />
      </>
    ),
  },
  {
    path: "/hashtag/:hashtag",
    element: (
      <>
        <Navigation />
        <HashtagPage />
      </>
    ),
  },
]);
