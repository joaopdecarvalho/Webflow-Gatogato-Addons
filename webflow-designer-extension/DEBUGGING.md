# Debugging Guide - Toggle Buttons Not Appearing

## What to Check in Console

After reloading the extension and Webflow page, look for these console messages:

### 1. **Elements Found (Good Sign)**
```
✅ Found 16 elements with attribute "data-show-in-designer"
```
This means the extension found your elements in the canvas. ✓

### 2. **Navigator Panel Structure (First Time Only)**
```
📋 Navigator panel structure: <div>...</div>
📋 Navigator classes: "some-class-names"
📋 Sample Navigator items: [...]
```
This shows what the Navigator panel looks like.

### 3. **Per-Element Processing**
For each of your 16 elements, you should see:
```
🔍 Processing canvas element 1:
   - tag: DIALOG
   - wfId: "f3afbd44-1be5-11fe-40a7-8987437185ae"
   🔍 Looking for Navigator item with wf-id: f3afbd44...
      🔎 Searching Navigator for wf-id: f3afbd44...
      📊 Total divs in Navigator: XXX
      📊 Divs with "tree" in class: XXX
      📋 Sample Navigator elements: [...]
```

### 4. **Success or Failure**

**✅ SUCCESS:**
```
   ✅ Found Navigator item: <div>...</div>
➕ Adding button for element with wf-id: f3afbd44...
✅ Button added to Navigator item
```

**❌ FAILURE:**
```
   ❌ Navigator item NOT found for wf-id: f3afbd44...
```

## Key Information to Share

If buttons still don't appear, please share:

1. **Navigator structure** - The output from "📋 Sample Navigator elements"
2. **Element wf-ids** - The wf-id values from "🔍 Processing canvas element"
3. **Match failures** - How many show "❌ Navigator item NOT found"

## Common Issues

### Issue: "Navigator item NOT found"
**Cause**: Extension can't match canvas elements to Navigator items
**Solution**: Need to see Navigator structure to find correct selector

### Issue: No "📋 Navigator panel structure" log
**Cause**: Extension can't find Navigator panel
**Solution**: Navigator panel might use different selectors

### Issue: "Found 0 elements"
**Cause**: No elements have the custom attribute
**Solution**: Add `data-show-in-designer` attribute to elements in Element Settings

## Next Steps

1. Reload extension: `chrome://extensions/`
2. Reload Webflow page
3. Open Console (F12)
4. Share the console output
5. I'll identify the correct Navigator selectors
