import { forwardRef } from "react";
import { createDoubleClick } from "./double-click";
import { createFogTool } from "./fog-tool";
import { createOverlay } from "./overlay";
import { createPinch } from "./pinch";
import { createPointerDown } from "./pointer-down";
import { createPointerMove } from "./pointer-move";
import { createPointerUp } from "./pointer-up";
import { createRendering } from "./rendering";
import { createSculpting } from "./sculpting";
import { createSelectTool } from "./select-tool";
import { createStamps } from "./stamps";
import type { EditorHandle, EditorProps } from "./types";
import { useDecorSprites } from "./useDecorSprites";
import { useGroundPhotos } from "./useGroundPhotos";
import { useEditorCore } from "./useEditorCore";
import { useEditorHandle } from "./useEditorHandle";
import { useEditorLifecycle } from "./useEditorLifecycle";

/**
 * The map canvas: it draws the map and turns pointer input into edits. The
 * work is split across this folder, each file building on the earlier ones:
 * core (refs), overlay, rendering, sculpting, stamps, pinch and pointer input.
 */
export const Editor = forwardRef<EditorHandle, EditorProps>(
  function Editor(props, ref) {
    const core = useEditorCore(props);
    const overlayTools = createOverlay(core);
    const rendering = createRendering({ ...core, ...overlayTools });
    const sculpting = createSculpting({ ...core, ...rendering });
    const stamps = createStamps(core);
    const pinch = createPinch({ ...core, ...rendering });
    const selectTool = createSelectTool({ ...core, ...overlayTools });
    const fogTool = createFogTool(core);
    const all = {
      ...core,
      ...overlayTools,
      ...rendering,
      ...sculpting,
      ...stamps,
      ...pinch,
      ...selectTool,
      ...fogTool,
    };
    const { pointerDown } = createPointerDown(all);
    const { pointerMove } = createPointerMove(all);
    const { pointerUp } = createPointerUp(all);
    const { doubleClick } = createDoubleClick(core);
    useEditorHandle(ref, all);
    useEditorLifecycle(all);
    useDecorSprites(all);
    useGroundPhotos(all);
    const { host, detail, overlay, drag, renderError } = core;
    const { drawOverlay } = overlayTools;
    return (
      <div
        className={`map-stage tool-${props.tool}`}
        ref={host}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={detail} className="detail-canvas" aria-hidden="true" />
        <canvas
          ref={overlay}
          className="interaction-canvas"
          aria-label="Interactive map canvas"
          tabIndex={0}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onPointerLeave={(e) => {
            // A lifted finger also "leaves"; its ring stays as a size guide.
            if (!drag.current && e.pointerType !== "touch") drawOverlay(null);
          }}
          onDoubleClick={doubleClick}
        />
        {renderError && <div className="render-error">{renderError}</div>}
      </div>
    );
  },
);
