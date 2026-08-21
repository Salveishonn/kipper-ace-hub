import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { syncPublicAssistant } from "@/lib/botmakerWebchat";

syncPublicAssistant(window.location.pathname);

createRoot(document.getElementById("root")!).render(<App />);
