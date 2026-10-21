import { LoaderCircle, Mountain } from "lucide-react";
import { isReady, useAppModel } from "./app/useAppModel";
import { CanvasWorkspace } from "./layout/CanvasWorkspace";
import { HiddenFileInputs } from "./layout/HiddenFileInputs";
import { ProjectMenu } from "./layout/ProjectMenu";
import { SaveErrorBanner } from "./layout/SaveErrorBanner";
import { Sidebar } from "./layout/Sidebar";
import { StatusBar } from "./layout/StatusBar";
import { ToastMessage } from "./layout/ToastMessage";
import { ToolRail } from "./layout/ToolRail";
import { TopBar } from "./layout/TopBar";
import { ModalHost } from "./modals/ModalHost";
import { SrdDialog } from "./modals/SrdDialog";
import { TooltipLayer } from "./ui/TooltipLayer";

/** The whole screen: the model holds the state, the layout components draw it. */
export default function App() {
  const app = useAppModel();
  if (!isReady(app))
    return (
      <div className="loading-screen wood">
        <Mountain size={54} />
        <h1>ATLASFORGE</h1>
        <LoaderCircle className="spin" size={20} />
      </div>
    );
  return (
    <div
      className={`app ${app.hidePanels ? "panels-hidden" : ""} ${app.sheet ? "sheet-open" : ""}`}
    >
      <TooltipLayer />
      <TopBar app={app} />
      <ProjectMenu app={app} />
      <main className="workspace">
        <ToolRail app={app} />
        <CanvasWorkspace app={app} />
        <Sidebar app={app} />
      </main>
      <StatusBar app={app} />
      <SaveErrorBanner app={app} />
      <ToastMessage app={app} />
      <HiddenFileInputs app={app} />
      <ModalHost app={app} />
      <SrdDialog app={app} />
    </div>
  );
}
