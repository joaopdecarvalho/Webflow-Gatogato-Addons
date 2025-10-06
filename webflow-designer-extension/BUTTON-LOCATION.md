# Where Toggle Buttons Appear

## ✅ CORRECT Location: Navigator Panel (Left Sidebar)

```
┌─ Navigator Panel ────────────────┐
│                                  │
│  📄 station_list_wrapper         │
│    📂 station-list               │
│      📂 station-item             │
│        ⚪ station-bubble 👁️     │  ← Button appears here!
│        📄 station-bubble-text... │
│        🖼️ station-bubble-image  │
│        💬 modal_dialog 👁️       │  ← And here!
│      📭 Empty State              │
│                                  │
└──────────────────────────────────┘
```

## ❌ WRONG Location: Canvas Elements

The buttons do NOT appear on the visual canvas where you edit your design.
They appear in the tree/layers panel on the left.

## Button States:

- ⚪ White with blue border = `data-show-in-designer="false"`
- 🔵 Blue background = `data-show-in-designer="true"`

## How to Add the Attribute:

1. Select an element in Webflow Designer
2. Open Element Settings panel (right sidebar)
3. Scroll to "Custom Attributes"
4. Add:
   - **Name**: `data-show-in-designer`
   - **Value**: `true` or `false`
5. Save

Within 10 seconds, a 👁️ button should appear next to that element's name in the Navigator panel!

## Keyboard Shortcut:

- **Windows**: `Ctrl + Shift + U` to publish
- **Mac**: `Cmd + Shift + U` to publish

The publish modal will auto-close after publishing completes.
