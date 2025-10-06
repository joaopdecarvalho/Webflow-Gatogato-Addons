# Webflow Designer Extension - Usage Guide

## ✅ Current Status

The extension is now **working correctly**! The console messages you're seeing are normal.

---

## 🚀 Features

### 1. Quick Publish Feature
- **Keyboard Shortcut**: `Ctrl+Shift+U` (Windows) or `Cmd+Shift+U` (Mac)
- **Extension Popup**: Click the extension icon and press "Publish Website"
- **Sound Notification**: Plays a completion sound when publishing finishes (can be toggled in settings)

### 2. Custom Attribute Toggle Buttons
- Automatically adds eye icon (👁️) buttons to elements with the `data-show-in-designer` attribute
- Click the button to toggle the attribute value between `true` and `false`
- Blue button = attribute is `true`
- White button = attribute is `false`

---

## 📝 How to Use

### Setting Up Toggle Buttons

To see toggle buttons on your elements, you need to add the custom attribute to your Webflow elements:

1. **In Webflow Designer**, select an element
2. Go to **Element Settings** (gear icon) > **Custom Attributes**
3. Add a new attribute:
   - **Name**: `data-show-in-designer`
   - **Value**: `true` or `false`
4. The extension will automatically detect it and add a toggle button!

### Publishing Your Site

**Method 1: Keyboard Shortcut**
- Press `Ctrl+Shift+U` (or `Cmd+Shift+U` on Mac) while on the Webflow Designer page

**Method 2: Extension Popup**
1. Click the extension icon in your Chrome toolbar
2. Click "🚀 Publish Website" button
3. Wait for the publish to complete

**Method 3: Manual Trigger**
- The extension will try to click the Webflow publish button for you
- If it can't find it, you can still publish manually through Webflow

### Customizing Settings

1. Click the extension icon
2. In the settings section:
   - **Toggle Sound**: Enable/disable the completion sound
   - **Target Attribute**: Change which attribute to look for (default: `data-show-in-designer`)
   - **Toggle Attribute**: Change which attribute to toggle (default: `data-show-in-designer`)
3. Click "💾 Save Settings"
4. **Reload the Webflow page** to apply changes

### Refreshing Toggle Buttons

If you add new elements with the custom attribute and don't see buttons:
1. Click the extension icon
2. Click "🔄 Refresh Toggle Buttons"

Or just wait a few seconds - the extension checks every 2 seconds automatically.

---

## 🔍 Understanding Console Messages

### Normal Messages (These are GOOD!)
```
🚀 Webflow Designer Extension: Content script loaded
✅ WebflowAPI attached to window object
✅ DOM already loaded, initializing now...
🔍 Searching for elements with selector: [data-show-in-designer]
⚠️ No elements found with attribute "data-show-in-designer"
```
**This just means** you haven't added any elements with the custom attribute yet. It's working fine!

### When Publishing:
```
📤 Publishing site...
🔍 Looking for publish button...
✅ Publish button found
🖱️ Publish button clicked
```

### Errors to Watch For:
```
❌ Publish button not found
```
**Solution**: The Webflow UI may have changed. You can still publish manually, or the selectors may need updating.

---

## 🛠️ Troubleshooting

### "No elements found" warning keeps appearing
- **This is normal!** It means you haven't added the `data-show-in-designer` attribute to any elements yet
- Add the attribute to elements you want to toggle (see "Setting Up Toggle Buttons" above)

### Keyboard shortcut not working
1. Make sure you're on a Webflow Designer page (`*.design.webflow.com` or `webflow.com/design/*`)
2. Reload the extension at `chrome://extensions/`
3. Reload the Webflow Designer page
4. Try the shortcut again

### Publish button not working
1. Check the console for error messages
2. Make sure you're logged into Webflow
3. Make sure you have publish permissions for the site
4. Try publishing manually through Webflow UI

### Toggle buttons not appearing
1. Verify the element has `data-show-in-designer` attribute in Webflow
2. Click "🔄 Refresh Toggle Buttons" in the extension popup
3. Check the console - it shows how many elements were found
4. The attribute name is case-sensitive!

---

## 🎨 Use Cases

### Show/Hide Elements in Designer
Perfect for hiding elements during design that should appear in production:
- Development notes
- Debug sections
- Admin-only elements

### Example Workflow:
1. Add `data-show-in-designer="false"` to elements you want hidden initially
2. When designing, click the eye button to show them
3. Click again to hide before publishing

---

## 🔧 Advanced Configuration

You can change which attribute the extension monitors:

1. Open extension popup
2. Change "Target Attribute Name" to your custom attribute (e.g., `data-debug-mode`)
3. Change "Toggle Attribute Name" if you want to toggle a different attribute
4. Save settings and reload Webflow page

---

## ⚠️ Known Limitations

- The extension runs on Webflow Designer pages only
- Publish button detection may fail if Webflow updates their UI significantly
- Custom attributes must be set in Webflow - the extension doesn't create them

---

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages (F12 → Console tab)
2. Reload the extension at `chrome://extensions/`
3. Reload the Webflow Designer page
4. Check this guide for troubleshooting steps

**The CORS error you see is from Webflow's own code, not the extension - it's safe to ignore!**
