import { createBrowserRouter } from "react-router";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProfilePage } from "./pages/ProfilePage";
import { MyListPage } from "./pages/MyListPage";
import { ExplorePage } from "./pages/ExplorePage";

export const router = createBrowserRouter([
  {
    path: "/",
    children: [
      { path: "login", Component: LoginPage },
      { path: "register", Component: RegisterPage },
      {
        Component: ProtectedRoute,
        children: [
          {
            Component: Layout,
            children: [
              { index: true, Component: HomePage },
              { path: "explore", Component: ExplorePage },
              { path: "my-list", Component: MyListPage },
              { path: "profile", Component: ProfilePage },
            ],
          },
        ],
      },
    ],
  },
]);
