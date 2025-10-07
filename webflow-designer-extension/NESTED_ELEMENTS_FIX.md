# Nested Elements Fix

## Problem
Toggle buttons were not appearing on elements with the target attribute when they were nested (collapsed) in the Navigator panel when the page first loaded.

## Root Cause
The extension is a Chrome extension (not a native Webflow Designer Extension), so it cannot use the Webflow Designer API's `webflow.getAllElements()` method. Instead, it:

1. Scans the canvas iframe for elements with the target attribute
2. Tries to find matching elements in the Navigator panel
3. Adds toggle buttons to those Navigator items

**The issue:** Nested elements in collapsed tree nodes aren't visible in the Navigator DOM until they're expanded.

## Solution Implemented

### 1. More Aggressive Tree Expansion
- **Before:** Expanded tree nodes every 3 seconds with throttling
- **After:** 
  - Expands every 2 seconds during the initial 10-second search period
  - Always expands during initial search (no throttling)
  - Falls back to alternate expansion strategies if no `aria-expanded="false"` elements found
  - Triggers an automatic re-scan 500ms after expanding nodes to catch newly visible elements

### 2. Additional Scans During Initialization
Added extra scans at strategic times:
- 1 second after page load
- 3 seconds after page load
- 5 seconds after page load
- 7 seconds after page load
- Plus the existing 2-second interval checks

This ensures we catch elements as soon as they become visible in the Navigator.

### 3. Improved Element Matching
Enhanced the `findNavigatorItemByWfId()` function with:
- **ID matching**: First tries to match by element ID if it exists
- **Scoring system**: Ranks matches by quality (exact match > case-insensitive > contains)
- **Best match selection**: Returns the highest-scoring match instead of first match
- **Better performance**: Stops searching immediately when an exact match is found

### 4. Manual Refresh Enhancement
The "Refresh Buttons" feature now:
- Resets the search timeout (allowing another 10-second search period)
- Clears the cache of processed elements
- Resets the initialization timer

This lets users manually trigger a fresh scan if elements are added after the initial 10-second period.

## How It Works Now

1. **Page loads** → Extension initializes
2. **Immediate expansion** → Clicks all collapsed tree nodes in Navigator
3. **Multiple scans** → Scans at 1s, 2s, 3s, 5s, 7s, and every 2s until 10s
4. **After expansion** → Automatically re-scans 500ms later to catch newly visible elements
5. **Smart matching** → Uses improved element matching with scoring
6. **After 10 seconds** → Stops automatic scanning (user can manually refresh)

## Why Not Use `webflow.getAllElements()`?

The Webflow Designer API documentation you referenced is for **native Webflow Designer Extensions** (apps built specifically for Webflow's Designer Extension platform).

This project is a **Chrome Extension** that:
- Injects content scripts into the Webflow Designer webpage
- Manipulates the DOM directly
- Cannot access Webflow's internal Designer Extension APIs

To use `webflow.getAllElements()`, you would need to:
1. Create a native Webflow Designer Extension (different architecture)
2. Register it in the Webflow Marketplace
3. Have users install it through Webflow's Apps panel

The current Chrome Extension approach has the advantage of:
- Easy installation (just load in Chrome)
- No marketplace approval needed
- Works immediately on any Webflow project
- Can interact with the full DOM and browser APIs

## Testing

To verify the fix works:

1. **Create nested elements** in Webflow with the target attribute
2. **Collapse parent elements** in the Navigator
3. **Reload the Designer page**
4. **Watch the console** - you should see:
   - Tree expansion logs
   - Re-scan after expansion
   - Elements being found and buttons added
5. **Check Navigator** - buttons should appear on nested elements within ~3-7 seconds

If elements are still missing:
- Click "Refresh Buttons" in the extension popup
- Check the console for which elements were found
- Verify the element has the correct attribute and visible classes

## Future Improvements

Potential enhancements:
1. **Observer-based approach**: Watch for Navigator tree expansions and scan immediately
2. **Persistent scanning option**: Allow users to enable continuous scanning beyond 10 seconds
3. **Visual feedback**: Show a badge or indicator when scanning is active
4. **Better logging**: Add a debug mode that can be toggled from the popup
