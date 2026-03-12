const keyMap = {
  ENTER: "Enter",
  ESC: "Escape",
  ARROWLEFT: "ArrowLeft",
  ARROWRIGHT: "ArrowRight",
  ARROWUP: "ArrowUp",
  ARROWDOWN: "ArrowDown",
  ALT: "Alt",
  CTRL: "Control",
  SHIFT: "Shift",
  CMD: "Meta" // macOS Command key
};

const modifierKeys = new Set(["Control", "Shift", "Alt", "Meta"]);

export async function handleModelAction(page, action) {
  try {
    const { x, y, button, path, scroll_x, scroll_y, text, keys, url } = action;

    switch (action.type) {
      case "click":
        console.log(`Clicking at (${x}, ${y}), ${button} button`);
        await page.mouse.click(x, y);
        break;
      case "double_click":
        console.log(`Double clicking at (${x}, ${y})`);
        await page.mouse.dblclick(x, y);
        break;
      case "move":
        console.log(`Moving mouse to (${x}, ${y})`);
        await page.mouse.move(x, y);
        break;
      case "drag":
        console.log("Dragging along path", path);
        if (Array.isArray(path) && path.length > 0) {
          const [firstPoint, ...restPoints] = path;
          await page.mouse.move(firstPoint.x, firstPoint.y);
          await page.mouse.down();
          for (const point of restPoints) {
            await page.mouse.move(point.x, point.y);
          }
          await page.mouse.up();
        } else {
          console.log("Drag action missing a valid path");
        }
        break;
      case "scroll":
        console.log(`Scrolling by (${scroll_x}, ${scroll_y})`);
        await page.mouse.wheel(scroll_x, scroll_y);
        break;
      case "type":
        console.log(`Typing text: ${text}`);
        await page.keyboard.type(text);
        break;
      case "keypress":
        console.log(`Pressing key: ${keys}`);
        const mappedKeys = keys.map(key => keyMap[key.toUpperCase()] || key);
        const modifiers = mappedKeys.filter(key => modifierKeys.has(key));
        const normalKeys = mappedKeys.filter(key => !modifierKeys.has(key));

        if (
          (mappedKeys[0] === "Meta" && mappedKeys[1] === "[") ||
          (mappedKeys[0] === "Alt" && mappedKeys[1] === "ArrowLeft")
        ) {
          await page.goBack();
          break;
        }

        // Hold down modifier keys
        for (const key of modifiers) {
          await page.keyboard.down(key);
        }

        // Press normal keys
        for (const key of normalKeys) {
          await page.keyboard.press(key);
        }

        // Release modifier keys
        for (const key of modifiers) {
          await page.keyboard.up(key);
        }
        break;
      case "wait":
        console.log("Waiting for browser...");
        await page.waitForTimeout(1000);
        break;
      case "goto":
        console.log(`Navigating to ${url}`);
        await page.goto(url);
        break;
      case "back":
        console.log("Navigating back");
        await page.goBack();
        break;
      case "forward":
        console.log("Navigating forward");
        await page.goForward();
        break;
      case "screenshot":
        console.log("Taking a screenshot");
        break;
      default:
        console.log("Unknown action:", action);
    }
  } catch (error) {
    console.error("Error executing action:", action, error);
  }
}

export async function getScreenshotAsBase64(page) {
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  return screenshotBuffer.toString("base64");
}
