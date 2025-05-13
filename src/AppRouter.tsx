import { RouterProvider } from "react-router-dom";
import { router } from "./router";

export function AppRouter() {
  return <RouterProvider router={router} />;
}

export default AppRouter;
