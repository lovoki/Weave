/*
 * 文件作用：前端入口，挂载二维图应用。
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");
if (!container) {
  throw new Error("root container not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
