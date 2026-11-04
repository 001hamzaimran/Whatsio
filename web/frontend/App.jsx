import { BrowserRouter } from "react-router-dom";
import { NavMenu } from "@shopify/app-bridge-react";
import Routes from "./Routes";
import { PolarisProvider } from "./components/providers/PolarisProvider";

export default function App() {
  const pages = import.meta.glob("./pages/**/!(*.test.[jt]sx)*.([jt]sx)", {
    eager: true,
  });

  return (
    <PolarisProvider>
      <BrowserRouter>
        <NavMenu>
          <a href="/" rel="home" />
        </NavMenu>
        <Routes pages={pages} />
      </BrowserRouter>
    </PolarisProvider>
  );
}
