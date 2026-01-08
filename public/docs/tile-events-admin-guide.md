# ⚙️ Tile Events - Admin Guide

This guide covers everything you need to know to create, manage, and moderate tile events as an administrator.

---

## Table of Contents

1. [Accessing the Admin Panel](#accessing-the-admin-panel)
2. [Creating an Event](#creating-an-event)
3. [Managing Tiles](#managing-tiles)
4. [Google Sheets Sync](#google-sheets-sync)
5. [Reviewing Submissions](#reviewing-submissions)
6. [Managing Participants](#managing-participants)
7. [Troubleshooting](#troubleshooting)

---

## Accessing the Admin Panel

1. Log in at [ironforged-events.emuy.gg](https://ironforged-events.emuy.gg)
2. Click **"⚙️ Admin"** in the navigation header
3. You'll see a list of all events you can manage

> **Note:** You need the `view_events_admin` permission to access the admin panel.

---

## Creating an Event

### Step 1: Click "New Event"

From the admin panel, click the **"+ New Event"** button.

### Step 2: Fill in Event Details

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Event display name | "January Bingo 2026" |
| **Description** | Brief description | "Complete tiles to earn ingots!" |
| **Start Date** | When event becomes visible | 2026-01-15 |
| **End Date** | When submissions close | 2026-01-31 |
| **Status** | Event visibility | `draft`, `active`, or `completed` |

### Step 3: Save and Add Tiles

After saving, you'll be redirected to the event management page where you can add tiles.

---

## Managing Tiles

### Adding Tiles Manually

1. Scroll to the **Tiles** section
2. Click **"+ Add Tile"**
3. Fill in the tile details:

| Field | Description | Example |
|-------|-------------|---------|
| **Position** | Order number (1, 2, 3...) | 1 |
| **Title** | Short name | "Vorkath" |
| **Description** | Task details | "Kill Vorkath and screenshot the KC" |
| **Image URL** | Optional banner image | `/images/banners/Vorkath.png` |
| **Keywords** | For auto-approval (comma-separated) | `vorkath, vorki, kill count` |
| **Required Submissions** | How many proofs needed | 1 (or 3 for "Kill 3x") |
| **Reward Ingots** | Points earned | 0 (or 50000 for milestones) |
| **Skip Reward** | Skips granted | 0 (or 1, 2, 3 for milestones) |

### Keywords for Auto-Approval

Keywords help the AI automatically approve submissions. The OCR scans the screenshot for these terms.

**Best Practices:**
- Include the boss/task name: `vorkath, zulrah, gauntlet`
- Include KC indicators: `kill count, kc, kills, completed`
- Include loot names: `draconic visage, tanzanite fang`
- Use variations: `zulrah, zul, snakeling, magma, tanzanite`
- Lowercase works best

**Example Keywords:**
```
vorkath, vorki, kill count, kc, draconic visage, vorkath's head, skeletal visage, dragonbone necklace
```

### Editing Tiles

- Click **"Edit"** on any tile to modify it
- Click **"Save"** to save individual tile changes
- Click **"Save All"** to batch-save all modifications

### Deleting Tiles

- Click the **🗑️** button on a tile to remove it
- **Warning:** This also removes all submissions for that tile!

---

## Google Sheets Sync

For bulk tile management, sync from a Google Sheet.

### Sheet Format

Set up your sheet with these columns:

| A | B | C | D | E |
|---|---|---|---|---|
| **Position** | **Title** | **Description** | **Keywords** | **Required** |
| 1 | Vorkath | Kill Vorkath | vorkath,vorki,kc | 1 |
| 2 | Zulrah x3 | Kill Zulrah 3 times | zulrah,snakeling | 3 |
| 3 | Gauntlet | Complete the Gauntlet | gauntlet,corrupted | 1 |

### Making the Sheet Public

1. Open your Google Sheet
2. Click **Share** → **General access** → **Anyone with the link**
3. Set permission to **Viewer**

### Getting the Sheet ID

From the URL: `docs.google.com/spreadsheets/d/**SHEET_ID_HERE**/edit`

Copy the long string between `/d/` and `/edit`.

### Syncing

1. Paste the Sheet ID in the admin panel
2. Click **"Sync from Sheet"**
3. Tiles will be created/updated based on position

> **Note:** Syncing matches tiles by position number. Existing tiles at the same position will be updated.

---

## Reviewing Submissions

### Accessing Submissions

1. Go to the event admin page
2. Scroll to **"Pending Submissions"** or click **"View All Submissions"**
3. Filter by status: `pending`, `approved`, `rejected`

### Submission Details

Each submission shows:
- **User** - RSN and Discord info
- **Tile** - Which tile they're completing
- **Image** - Click to view full size
- **AI Analysis** - What the OCR detected (if available)
- **Timestamp** - When submitted

### Approving/Rejecting

| Action | When to Use |
|--------|-------------|
| ✅ **Approve** | Screenshot clearly shows task completion |
| ❌ **Reject** | Screenshot doesn't show completion, wrong task, or suspicious |

**Rejection Reasons:**
- Screenshot doesn't show the required completion
- RSN not visible (if required)
- Suspected screenshot manipulation
- Wrong tile/task

> **Tip:** When rejecting, consider messaging the user on Discord to explain why, so they can resubmit correctly.

---

## Managing Participants

### Viewing Participants

The **Participants** tab shows:
- RSN / Discord username
- Current tile position
- Total submissions
- Skips used / available

### Adjusting Skips

Use the **+/-** buttons to manually adjust a user's skip count:
- **Add skips:** Compensate for issues or as a reward
- **Remove skips:** If skips were used incorrectly

### Viewing User Progress

Click the **📋** icon next to a participant to see:
- All their submissions
- Submission status for each tile
- Approval/rejection history

---

## Event Settings

### Event Status

| Status | Description |
|--------|-------------|
| **Draft** | Only admins can see. Use for setup. |
| **Active** | Visible to all. Submissions open. |
| **Completed** | Visible but submissions closed. Final standings. |

### Milestone Configuration

Standard milestone rewards:

| Tile | Skip Reward | Ingots |
|------|-------------|--------|
| 6 | +1 | 50,000 |
| 12 | +2 | 100,000 |
| 18 | +3 | 150,000 |

Set these on the individual tile's **Skip Reward** and **Reward Ingots** fields.

---

## Troubleshooting

### "Submission not showing for user"

1. Check if the user has the correct tile unlocked
2. Verify the image uploaded successfully (check network tab)
3. Look for error messages in the submission response

### "Auto-approval not working"

1. Add more relevant keywords to the tile
2. Check if the screenshot text is readable
3. OCR works best with clear, full-screen screenshots
4. Some fonts or overlays may interfere with text detection

### "User stuck on wrong tile"

1. Check for rejected submissions on previous tiles
2. Verify all previous tiles are approved
3. For multi-submission tiles, check if all required submissions are in
4. Manually approve any stuck pending submissions

### "Tiles not syncing from sheet"

1. Verify the sheet is publicly viewable
2. Check the Sheet ID is correct (no extra characters)
3. Ensure column format matches expected (A=Position, B=Title, etc.)
4. Check for empty rows that might cause issues

### "User can't see the event"

1. Verify event status is **Active** (not Draft)
2. Check if the user is logged in
3. Verify the event dates include today

---

## Quick Reference

### Keyboard Shortcuts

- None currently implemented

### Image Paths

Local images are stored at: `/images/banners/[filename].png`

Available banners (check `public/images/banners/`):
- Amoxliatl.png, Barrows.png, Dag_kings.png
- Gauntlet.png, GWD.png, Nightmare.png
- Raids.png, Scurrius.png, Vorkath.png
- Yama.png, Zulrah.png, and more...

### API Endpoints (for debugging)

- `GET /tile-events` - List all events
- `GET /tile-events/:id` - Get event details
- `GET /tile-events/:id/progress` - User's progress
- `POST /tile-events/:id/tiles/:tileId/submit` - Submit proof

---

## Need Help?

- **Technical Issues:** Contact a developer in Discord
- **Permission Issues:** Ask a super admin to check your roles
- **Feature Requests:** Submit in #suggestions

Happy event managing! 🎮
