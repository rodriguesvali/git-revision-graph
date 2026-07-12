interface RevisionGraphWebviewSceneGeometryStyleTarget {
  readonly style: {
    width: string;
    height: string;
  };
}

interface RevisionGraphWebviewSceneGeometrySvgTarget {
  setAttribute(name: string, value: string): void;
}

interface RevisionGraphWebviewSceneGeometryTargets {
  readonly canvas: RevisionGraphWebviewSceneGeometryStyleTarget;
  readonly sceneLayer: RevisionGraphWebviewSceneGeometryStyleTarget;
  readonly graphSvg: RevisionGraphWebviewSceneGeometrySvgTarget;
}

function applyRevisionGraphWebviewSceneGeometry(
  targets: RevisionGraphWebviewSceneGeometryTargets,
  width: number,
  height: number
): void {
  const widthCss = `${width}px`;
  const heightCss = `${height}px`;
  targets.canvas.style.width = widthCss;
  targets.canvas.style.height = heightCss;
  targets.sceneLayer.style.width = widthCss;
  targets.sceneLayer.style.height = heightCss;
  targets.graphSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
}
