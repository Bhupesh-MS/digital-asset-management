import { Navbar } from "../components/layout/Navbar.js";
import { useRouter } from "../hooks/useRouter.js";
import { HomePage } from "./HomePage.js";
import { UploadPage } from "./UploadPage.js";
import { GalleryPage } from "./GalleryPage.js";
import { AdminDashboardPage } from "./AdminDashboardPage.js";
import { AdminLoginPage } from "./AdminLoginPage.js";

export function App() {
  const { route, navigate } = useRouter();

  let content = null;
  switch (route) {
    case "/":
      content = <HomePage navigate={navigate} />;
      break;
    case "/upload":
      content = <UploadPage />;
      break;
    case "/gallery":
      content = <GalleryPage />;
      break;
    case "/admin":
      content = <AdminDashboardPage onUnauthorized={() => navigate("/admin/login")} />;
      break;
    case "/admin/login":
      content = <AdminLoginPage navigate={navigate} />;
      break;
    default:
      content = <HomePage navigate={navigate} />;
  }

  return (
    <main className="min-h-screen bg-fog">
      <Navbar currentRoute={route} navigate={navigate} />
      {content}
    </main>
  );
}
