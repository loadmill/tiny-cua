![tiny-CUA logo](https://github.com/user-attachments/assets/de9ff2ea-8e42-4c9c-bced-99537352360f)

A minimal implementation of a Computer-Using Agent on top of OpenAI's `gpt-5.4` computer-use capabilities, using Node.js and Playwright. It's only four files and has fewer than 350 lines of code.

https://github.com/user-attachments/assets/7d8b8e19-edf4-4a58-a4ad-00988bb2be07

## Goal
Automate web interactions in a browser with Node.js, Playwright, and OpenAI's computer use API. tiny-CUA can click, type, scroll, and navigate by analyzing screenshots and receiving AI-generated actions.

## How It Works
1. The agent launches a browser using Playwright.  
2. It navigates to a provided URL.  
3. The user enters commands in the terminal (or the agent reads them from a text file if specified).  
4. The user input, along with a screenshot, is sent to OpenAI's model set for computer use.  
5. OpenAI manages the conversation context automatically.  
6. If the API returns actions (for example, click or type), the agent performs them.  
7. After each action, the agent takes another screenshot and sends it to OpenAI for further steps.  
8. The loop continues until the user types **exit**.

## Run the Agent
1. Install dependencies:
   ```sh
   npm install
   ```
2. Install the Playwright browser:
   ```sh
   npx playwright install chromium
   ```
3. Create a `.env` file with your OpenAI API key:
   ```sh
   echo "OPENAI_API_KEY=your-key" > .env
   ```
4. Run tiny-CUA:
   ```sh
   node index.js
   ```

### Flags

- `--url=https://example.com/`  
  Sets the initial URL to open. If not provided, a default test URL is used.

- `--save-har`  
  Captures a HAR file of the session. When the session ends, the file `cua-session-<timestamp>.har` is created in the current directory.

- `--instructions=FILENAME` or `-i FILENAME`  
  Reads commands from a text file, one line at a time. When the file is fully read, the agent continues in interactive mode unless one of the instructions was `exit`.  

#### Example
```sh
node index.js --url=http://bank-demo.loadmill.com/ --save-har --instructions=example-instructions.txt
```

Sample `example-instructions.txt`:
```
Start a new chat
Send a hello world message in the chat
Go back to the main page
Go to the agent login and login using a@b.com and the pass 123456
reply "ok" to the first message
exit
```

When run, each line is passed to the agent as if you typed it in. If you include `exit` in the file, the session ends after that instruction. If you do not include `exit`, the agent switches to interactive mode once all file lines are consumed.

## Code Structure
- **index.js**  
  - Manages user input and the main loop  
  - Feeds either file-based instructions or interactive terminal input to the agent  
  - Sends the user's commands and a screenshot to the API with `previousResponseId` to maintain context on the OpenAI server  
  - Processes any returned computer actions until there are none left  

- **actions.js**  
  - Contains functions to execute actions on the browser page, including clicking, dragging, scrolling, typing, and more  

- **openai.js**  
  - Builds requests to the OpenAI API with messages, screenshots, and safety checks  

- **browser.js**  
  - Uses Playwright to launch Chromium with a fixed window size  
  - (Optional) Records a HAR file if launched with the `--save-har` flag  

## Handling Safety Checks
The CUA API may return `pending_safety_checks` for sensitive or potentially harmful requests. To proceed, you must include them as `acknowledged_safety_checks` in your next request. The current code acknowledges them automatically, but a real production system would likely pause or log them for confirmation.

## Features
- Performs actions in the browser (click, double-click, scroll, drag-and-drop, typing, and more).  
- Uses OpenAI to plan actions and maintain conversation context on the server side.  
- Sends iterative screenshots for real-time guidance from the model.  
- Acknowledges safety checks automatically for demonstration purposes.  
- Uses `previousResponseId` to keep messages minimal while linking conversation turns.  
- Captures a HAR file of the network activity when run with `--save-har`.  
- Reads commands line-by-line from a file when run with `--instructions=FILENAME` or `-i FILENAME`.
