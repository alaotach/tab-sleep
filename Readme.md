# Tab Sleep

Tab Sleep is a browser extension designed to help you save memory by automatically (or manually) putting inactive tabs to sleep. Rather than using the native discard feature, it replaces the tab's content with a lightweight rest screen keeping ur tabs organized w/o the heavy memory footprint.

## Features

- **Automated Memory Saving:** automatically puts tabs to sleep after a customizable period of inactivity.
- **Control:** 
  - **Sleep Left / Right:** instantly sleep all tabs to the left or right of ur current one.
  - **Wake Left / Right:** instantly wake up adjacent sleeping tabs.
  - **Sleep All / Wake All:** single click buttons to control your entire session.
- **Whitelisting:** prevent specific sites from ever going to sleep.
- **Context Menu:** right click anywhere on a page to send it to sleep.

## Installation

Since this extension is in development, you can install it manually in your Chromium-based or Firefox browser:

1. Download or clone this repository to your local machine.
2. Open your browser and go to your extensions dashboard:
   - **Chrome / Edge / Brave:** Navigate to `chrome://extensions` or `edge://extensions`.
   - **Firefox:** Navigate to `about:debugging#/runtime/this-firefox`.
3. Enable **Developer Mode** (usually a toggle in the top right corner).
4. Click on **Load unpacked** (or **Load Temporary Add-on** in Firefox).
5. Select the `Tab-Sleep` folder.

## Usage

- **Click the extension icon** to open the control panel.
- Change the **timer** to dictate how many minutes a tab must be inactive before sleeping.
- Use the **Whitelist** text box to add permanent exceptions so you don't lose progress on important pages.
- Right-click anywhere on a webpage and select "Sleep Tab" to put it to rest manually.