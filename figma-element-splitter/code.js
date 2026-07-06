figma.showUI(__html__, { width: 380, height: 580 });

let sourceState = null;

figma.ui.onmessage = async (message) => {
  try {
    if (message.type === "split-selected") {
      await sendSelectedImageToUi();
      return;
    }

    if (message.type === "insert-elements") {
      await insertElements(message.result, message.layoutMode);
      return;
    }

    if (message.type === "notify") {
      figma.notify(message.text);
    }
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({ type: "error", text });
    figma.notify(text, { error: true });
  }
};

async function sendSelectedImageToUi() {
  const source = findSelectedImageNode();
  const image = figma.getImageByHash(source.fill.imageHash);
  if (!image) {
    throw new Error("没有找到选中节点里的图片。");
  }

  const bytes = await image.getBytesAsync();
  const parent = canAppendChildren(source.node.parent) ? source.node.parent : figma.currentPage;
  const useLocalCoordinates = parent === source.node.parent;
  sourceState = {
    node: source.node,
    parent,
    x: useLocalCoordinates ? source.node.x : source.node.absoluteTransform[0][2],
    y: useLocalCoordinates ? source.node.y : source.node.absoluteTransform[1][2],
    absoluteX: source.node.absoluteTransform[0][2],
    absoluteY: source.node.absoluteTransform[1][2],
    width: source.node.width,
    height: source.node.height,
  };

  figma.ui.postMessage({
    type: "selected-image",
    bytes: Array.from(bytes),
    source: {
      width: source.node.width,
      height: source.node.height,
      name: source.node.name,
    },
  });
}

function findSelectedImageNode() {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    throw new Error("请先在画布里选中一张图片。");
  }

  for (const node of selection) {
    const match = findImageNode(node);
    if (match) {
      return match;
    }
  }

  throw new Error("选中的图层里没有可读取的图片填充。请选中一个图片图层或包含图片的 Frame。");
}

function findImageNode(node) {
  if ("fills" in node && Array.isArray(node.fills)) {
    const fill = node.fills.find((item) => item.type === "IMAGE" && item.visible !== false && item.imageHash);
    if (fill) {
      return { node, fill };
    }
  }

  if ("children" in node) {
    for (const child of node.children) {
      const match = findImageNode(child);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

async function insertElements(result, layoutMode) {
  if (!sourceState) {
    throw new Error("请先点击拆分按钮，让插件读取选中的图片。");
  }

  const parent = sourceState.parent;
  const scaleX = sourceState.width / result.source_width;
  const scaleY = sourceState.height / result.source_height;
  const created = [];

  let gridX = sourceState.x + sourceState.width + 40;
  let gridY = sourceState.y;
  const maxGridWidth = 720;
  let rowHeight = 0;

  for (const element of result.elements) {
    const bytes = base64ToUint8Array(element.png_base64);
    const image = figma.createImage(bytes);
    const rect = figma.createRectangle();
    rect.name = element.name;

    const rectWidth = Math.max(1, element.width * scaleX);
    const rectHeight = Math.max(1, element.height * scaleY);
    rect.resize(rectWidth, rectHeight);
    rect.fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: image.hash }];

    if (layoutMode === "grid") {
      if (gridX > sourceState.x + sourceState.width + 40 && gridX + rectWidth > sourceState.x + sourceState.width + 40 + maxGridWidth) {
        gridX = sourceState.x + sourceState.width + 40;
        gridY += rowHeight + 24;
        rowHeight = 0;
      }
      rect.x = gridX;
      rect.y = gridY;
      gridX += rectWidth + 18;
      rowHeight = Math.max(rowHeight, rectHeight);
    } else {
      rect.x = sourceState.x + element.x * scaleX;
      rect.y = sourceState.y + element.y * scaleY;
    }

    parent.appendChild(rect);
    created.push(rect);
  }

  if (created.length > 0) {
    figma.currentPage.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
  }

  figma.notify(`已拆出 ${created.length} 个透明元素`);
}

function canAppendChildren(node) {
  return node && typeof node.appendChild === "function";
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
