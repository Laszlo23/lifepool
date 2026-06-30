import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PoolProvider } from "./context/PoolContext";
import { Web3Provider } from "./providers/Web3Provider";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Web3Provider>
      <PoolProvider>
        <App />
      </PoolProvider>
    </Web3Provider>
  </StrictMode>,
);
