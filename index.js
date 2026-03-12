import minimist from "minimist";
import readline from "readline";
import { readFile } from "fs/promises";
import { launchBrowser, display_width, display_height } from "./browser.js";
import { sendCUARequest } from "./openai.js";
import { handleModelAction, getScreenshotAsBase64 } from "./actions.js";

function getOSName() {
  const osType = process.platform;
  if (osType === "darwin") return "macOS";
  if (osType === "win32") return "Windows";
  return "Linux";
}

const osName = getOSName();
const args = minimist(process.argv.slice(2));
const startUrl = args["url"] || "http://bank-demo.loadmill.com/";
const saveHar = args["save-har"] === true;
const instructionsFile = args.instructions || args.i || null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function promptUser() {
  return new Promise((resolve) => rl.question("> ", resolve));
}

async function loadInstructionsFile(instructionsFile) {
  if (!instructionsFile) return [];

  const fileContent = await readFile(instructionsFile, "utf-8");
  return fileContent
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0); // Remove empty lines
}

async function runFullTurn(page, response) {
  let newResponseId = response.id;

  while (true) {
    const items = response.output || [];
    const computerCalls = items.filter((item) => item.type === "computer_call");

    // Print reasoning or assistant messages
    for (const item of items) {
      if (item.type === "reasoning") {
        for (const entry of item.summary || []) {
          if (entry.type === "summary_text") {
            console.log("[Reasoning]", entry.text);
          }
        }
      } else if (item.type === "message") {
        const textPart = item.content?.find((c) => c.type === "output_text");
        if (textPart) {
          console.log("[Message]", textPart.text);
        }
      } else if (item.type !== "computer_call") {
        console.log("Unknown OpenAI response item:", item.type);
      }
    }

    // If there are no more actions, we're done for this turn
    if (computerCalls.length === 0) break;

    const currentCall = computerCalls.at(-1);
    const actions = currentCall.actions || (currentCall.action ? [currentCall.action] : []);

    for (const action of actions) {
      await handleModelAction(page, action);
      await page.waitForTimeout(300); // Small delay to allow UI to update
    }

    const screenshotBase64 = await getScreenshotAsBase64(page);

    response = await sendCUARequest({
      messages: [],
      screenshotBase64,
      previousResponseId: newResponseId,
      callId: currentCall.call_id,
      pendingSafetyChecks: currentCall.pending_safety_checks || [],
    });
    newResponseId = response.id;
  }

  return newResponseId;
}

async function main() {
  
  const instructions = await loadInstructionsFile(instructionsFile);

  const { browser, context, page } = await launchBrowser(saveHar);
  await page.goto(startUrl);

  const initialSystemText = 
  `This is a browser-using agent operating in a controlled environment.  
  Perform the user’s requested actions within the current browser tab opened on the target platform.  
  Execute each action once unless instructed otherwise.
  Stop acting once the task appears complete—avoid unnecessary clicks.  
  Never ask for confirmation. If you think an action needs to be performed, execute it immediately. 
  Only stop for questions if you don't have enough information to complete the action.
  If unsure, take a screenshot once before proceeding.  
  Do not repeat actions that have no visible effect, wait to see if the page updates.
  
  The browser display size is ${display_width}x${display_height} pixels.

  Available browser actions:
  click, double_click, move, drag, scroll, type, keypress, wait, goto, back, forward, screenshot.
  
  **Keyboard Shortcuts:**
  This web browser is running on ${osName}.
  Use OS-specific shortcuts. For example:
  On macOS, "CMD" should be used where applicable.
  On macOS if the user asks you to go back (to the previous page), use a combination of Cmd + [ keys.
  `;

  let previousResponseId;
  let messages = [{ role: "system", content: initialSystemText }];

  while (true) {
    
    let userInput;
    if (instructions.length > 0) {
      userInput = instructions.shift();
      console.log(`> ${userInput}`);
    } else {
      userInput = await promptUser();
    }

    if (userInput.toLowerCase() === "exit") {
      await context.close();
      await browser.close();
      rl.close();
      break;
    }

    messages.push({ role: "user", content: userInput });

    const screenshotBase64 = await getScreenshotAsBase64(page);

    let response = await sendCUARequest({
      messages,
      screenshotBase64,
      previousResponseId,
    });

    previousResponseId = await runFullTurn(page, response);
    messages = [];
  }
}

main();
