# Webflow Designer Extension

A Chrome extension that enhances your Webflow Designer experience with quick publish shortcuts, completion sound notifications, and custom attribute toggle buttons.

## ✨ Features

### 🚀 Quick Publish
- **Keyboard shortcut**: Press `Ctrl+Shift+U` (Windows/Linux) or `Cmd+Shift+U` (Mac) to publish your site instantly
- **One-click publish**: Use the extension popup to trigger publishing
- **Visual feedback**: Get real-time status updates during the publish process

### 🔊 Completion Sound
- Plays a pleasant sound notification when publishing completes
- Helps you know when the publish is done without watching the screen
- Can be toggled on/off in settings

### 🎯 Custom Attribute Toggle Buttons
- Automatically adds toggle buttons to elements with the `data-show-in-designer` attribute
- Click the button to toggle the attribute value between `true` and `false`
- Visual feedback shows the current state (blue = true, white = false)
- Fully configurable attribute names

## 📋 Requirements

- Google Chrome browser (or Chromium-based browsers like Edge, Brave, etc.)
- Access to Webflow Designer (https://webflow.com/design/)

## 🛠️ Installation

### Step 1: Clone or Download
```bash
git clone https://github.com/yourusername/webflow-designer-extension.git
cd webflow-designer-extension
```

Or download the ZIP file and extract it.

### Step 2: Add Required Assets

#### Icons (Required)
Create or download icons and place them in `src/assets/icons/`:
- `icon16.png` (16×16 pixels)
- `icon48.png` (48×48 pixels)
- `icon128.png` (128×128 pixels)

See `src/assets/icons/README.md` for more details.

#### Sound File (Optional but recommended)
Add a `complete.mp3` file to `src/assets/sounds/` for the completion notification.

See `src/assets/sounds/README.md` for suggested sources.

### Step 3: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `src` folder from this project
5. The extension should now appear in your extensions list

## 🎮 Usage

### Publishing Your Site

**Method 1: Keyboard Shortcut**
1. Open any Webflow Designer page
2. Press `Ctrl+Shift+U` (or `Cmd+Shift+U` on Mac)
3. The publish process will start automatically

**Method 2: Extension Popup**
1. Click the extension icon in your Chrome toolbar
2. Click the "🚀 Publish Website" button
3. Watch the status message for progress

### Toggle Buttons

1. In your Webflow Designer, add the attribute `data-show-in-designer` to any element
2. The extension will automatically add a toggle button (👁️) to these elements
3. Click the button to toggle the `data-show-in-designer` attribute between `true` and `false`
4. The button color changes based on the current state:
   - **Blue background**: Value is `true` (shown in designer)
   - **White background**: Value is `false` (hidden in designer)

### Customizing Settings

1. Click the extension icon to open the popup
2. Configure your preferences:
   - **Enable completion sound**: Toggle sound notifications on/off
   - **Target Attribute**: The attribute to look for (default: `data-custom-toggle`)
   - **Toggle Attribute**: The attribute to toggle (default: `data-toggle-state`)
3. Click **Save Settings**
4. Click **Refresh Buttons** to apply changes to the current page

## ⚙️ Configuration

### Default Settings
```javascript
{
  targetAttribute: 'data-show-in-designer',  // Elements with this attribute get toggle buttons
  toggleAttribute: 'data-show-in-designer',  // This attribute gets toggled between 'true' and 'false'
  soundEnabled: true                          // Play sound on publish completion
}
```

### Customizing Attributes

You can customize which attributes to use:

1. Open the extension popup
2. Update the attribute names in the settings
3. Save and refresh

Example: If you want to use different attributes:
- Target Attribute: `data-custom-visibility`
- Toggle Attribute: `data-custom-visibility`

The toggle will switch values between `true` and `false`.

## 📁 Project Structure

```
webflow-designer-extension/
├── src/
│   ├── manifest.json          # Extension configuration
│   ├── background/
│   │   └── background.js      # Service worker for shortcuts
│   ├── content/
│   │   └── content.js         # Injected into Webflow Designer pages
│   ├── popup/
│   │   ├── popup.html         # Extension popup UI
│   │   ├── popup.js           # Popup functionality
│   │   └── popup.css          # Popup styling
│   ├── utils/
│   │   └── webflow-api.js     # Webflow interaction utilities
│   └── assets/
│       ├── icons/             # Extension icons (16, 48, 128)
│       └── sounds/            # Completion sound
├── package.json
└── README.md
```

## 🔧 Development

### Making Changes

1. Edit the files in the `src/` directory
2. Go to `chrome://extensions/`
3. **Click the refresh/reload icon** on the extension card (🔄)
   - You do NOT need to remove and re-add the extension
   - Just click the circular arrow icon next to the on/off toggle
4. Reload any Webflow Designer pages to see changes

**Note:** After clicking refresh in `chrome://extensions/`, the extension updates immediately. You only need to reload the Webflow page to apply the changes to that page.

### Debugging

The extension now includes comprehensive logging. To see debug output:

#### For Content Script (runs on Webflow pages):
1. Open a Webflow Designer page
2. Open Chrome DevTools (`F12` or `Ctrl+Shift+I`)
3. Go to the **Console** tab
4. Look for messages with emojis like 🚀, 🔍, ✅, etc.

**What to check:**
- `🚀 Webflow Designer Extension: Content script loaded` - Confirms script is running
- `🔍 Searching for elements with selector: [data-show-in-designer]` - Shows what it's looking for
- `✅ Found X elements` - How many elements were found
- `⚠️ No elements found` - Means no elements have the attribute

#### For Background Script (service worker):
1. Go to `chrome://extensions/`
2. Find your extension
3. Click **"service worker"** or **"Inspect views: service worker"**
4. A DevTools window opens showing background script logs

#### For Popup:
1. Click the extension icon
2. Right-click anywhere in the popup
3. Select **Inspect**
4. Check the Console tab

### Quick Test

To test if the extension is working:

1. Open any webpage (even a blank page)
2. Open DevTools (F12)
3. In the Console, type:
```javascript
// Add test element
const testDiv = document.createElement('div');
testDiv.setAttribute('data-show-in-designer', 'true');
testDiv.style.width = '200px';
testDiv.style.height = '100px';
testDiv.style.background = 'lightblue';
testDiv.style.margin = '20px';
testDiv.textContent = 'Test Element';
document.body.appendChild(testDiv);
```

You should see a toggle button (👁️) appear on this element within 2 seconds.

### Debug Log Reference

Here's what the emoji indicators mean in the console:

- 🚀 - Extension/feature initialization
- 🔍 - Searching/scanning for elements
- ✅ - Success/confirmation
- ❌ - Error occurred
- ⚠️ - Warning (e.g., no elements found)
- 🎯 - Processing specific element
- 🔨 - Creating/building something
- 🖱️ - Click event
- 🔄 - Refresh/update action
- 📨 - Message received
- 📤 - Message sent
- 💾 - Storage operation
- 🔊 - Sound/audio
- 👀 - Observer/watcher
- ⏰ - Periodic/scheduled action

### Debugging

- **Background script**: Inspect the service worker from `chrome://extensions/`
- **Content script**: Open DevTools on a Webflow Designer page
- **Popup**: Right-click the extension icon → Inspect popup

### Common Issues

**Extension not loading:**
- Check for errors in `chrome://extensions/` (click "Errors" button if it appears)
- Make sure Developer mode is enabled
- Try removing and re-adding the extension

**Toggle buttons not appearing:**
- Open DevTools Console (F12) and look for the debug messages
- Check if you see `⚠️ No elements found with attribute "data-show-in-designer"`
- Make sure elements have the correct attribute (default: `data-show-in-designer`)
- Verify the attribute value is set (e.g., `data-show-in-designer="true"`)
- Try clicking "Refresh Buttons" in the popup
- Check if content script loaded: look for `🚀 Webflow Designer Extension: Content script loaded`

**Keyboard shortcut not working:**
- Verify you're on a Webflow Designer page (`webflow.com/design/...`)
- Check `chrome://extensions/shortcuts` to see if the shortcut is registered
- Try a different shortcut if there's a conflict
- Look for `⌨️ Keyboard command received` in the background service worker console

**Publish not working:**
- Ensure you're on a Webflow Designer page (`webflow.com/design/...`)
- Check that you have publish permissions for the site
- The extension simulates clicking the publish button, so make sure it's visible
- Check console for `❌ Publish button not found` error

**Sound not playing:**
- Ensure `complete.mp3` exists in `src/assets/sounds/`
- Check that sound is enabled in settings
- Browser may block autoplay - interact with the page first
- Look for `🔊 Playing completion sound...` in console

**Content script not loading:**
- Check the manifest `content_scripts` matches setting
- Verify the page URL matches the pattern in manifest.json
- Look at `chrome://extensions/` for any errors
- Check if scripts are being blocked by CSP (Content Security Policy)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This is an unofficial extension and is not affiliated with, endorsed by, or sponsored by Webflow, Inc. Use at your own risk.

## 🙏 Acknowledgments

- Built for the Webflow community
- Inspired by the need for faster publishing workflows
- Sound assets from various free sources (see `src/assets/sounds/README.md`)

---

**Made with ❤️ for Webflow Designers**