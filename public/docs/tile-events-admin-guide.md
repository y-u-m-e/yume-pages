# ⚙️ Tile Events Admin Guide

This guide covers everything you need to know to create, manage, and moderate tile events.

---

## Table of Contents

1. [Creating an Event](#creating-an-event)
2. [Managing Tiles](#managing-tiles)
3. [Google Sheets Sync](#google-sheets-sync)
4. [Reviewing Submissions](#reviewing-submissions)
5. [Managing Participants](#managing-participants)
6. [Advanced Features](#advanced-features)

---

## Creating an Event

### Step 1: Access Admin Panel

1. Navigate to **Events** → **Admin Panel**
2. Click **"+ New Event"**

### Step 2: Fill Event Details

| Field | Description |
|-------|-------------|
| **Name** | Event display name (e.g., "January Bingo 2026") |
| **Description** | Brief description shown to participants |
| **Start Date** | When the event becomes visible |
| **End Date** | When submissions close |
| **Status** | `draft` (hidden), `active` (live), `completed` (ended) |
| **Max Participants** | Optional limit on participants |

### Step 3: Save & Configure

After creating the event, you'll be redirected to the event management page where you can add tiles.

---

## Managing Tiles

### Adding Tiles Manually

1. In the event admin panel, scroll to **Tiles**
2. Click **"+ Add Tile"**
3. Fill in the tile details:

| Field | Description |
|-------|-------------|
| **Position** | Order number (1, 2, 3...) |
| **Title** | Short name (e.g., "Vorkath") |
| **Description** | Task details |
| **Image URL** | Optional tile image |
| **Keywords** | Comma-separated keywords for auto-approval |
| **Required Submissions** | How many proofs needed (default: 1) |
| **Reward Ingots** | Points earned for completion |
| **Skip Reward** | Skips granted at this tile (milestone tiles only) |

### Keywords for Auto-Approval

Keywords are used by the AI/OCR system to automatically approve submissions.

**Best Practices:**
- Include boss names: `vorkath, vorki`
- Include KC indicators: `kill count, kc, kills`
- Include loot names: `draconic visage, vorkath's head`
- Use variations: `zulrah, zul, snakeling`

**Example:**
```
vorkath, vorki, kill count, draconic visage, vorkath's head, skeletal visage
```

### Multi-Submission Tiles

Set **Required Submissions** > 1 for tiles that need multiple completions.

Example: A "Kill Vorkath 5 times" tile would have:
- Required Submissions: `5`
- Keywords: `vorkath, kill count`

The system tracks each submission separately and only unlocks the next tile once all required submissions are made.

---

## Google Sheets Sync

For bulk tile management, you can sync tiles from a Google Sheet.

### Sheet Format

Your sheet should have these columns:

| A | B | C | D | E |
|---|---|---|---|---|
| **Position** | **Title** | **Description** | **Keywords** | **Required** |
| 1 | Vorkath | Kill Vorkath | vorkath,vorki,kc | 1 |
| 2 | Zulrah | Kill Zulrah 3x | zulrah,snakeling | 3 |

### Setting Up Sync

1. Get your Google Sheet ID from the URL: `docs.google.com/spreadsheets/d/**SHEET_ID**/edit`
2. In the event admin, enter the Sheet ID
3. Click **"Sync from Sheet"**

> **Note:** The sheet must be publicly viewable (Anyone with link can view)

### Re-syncing

Click **"Sync from Sheet"** anytime to update tiles. Existing tiles are matched by position.

---

## Reviewing Submissions

### Accessing Submissions

1. Go to the event admin panel
2. Click **"View Submissions"** or scroll to the submissions section
3. Filter by status: `pending`, `approved`, `rejected`

### Reviewing a Submission

Each submission shows:
- **User**: Who submitted
- **Tile**: Which tile they're submitting for
- **Image**: Click to view full size
- **Status**: Current status
- **AI Analysis**: What the OCR detected (if available)

### Approving/Rejecting

- Click ✅ **Approve** to accept the submission
- Click ❌ **Reject** to deny (optionally provide a reason)

**When to Reject:**
- Screenshot doesn't show completion
- Wrong tile/task
- Suspected manipulation
- Missing RSN (if required)

---

## Managing Participants

### Viewing Participants

The Participants tab shows:
- Username / RSN
- Current tile position
- Submissions count
- Skips used

### Adjusting Skips

To manually adjust a user's skip count:
1. Find the participant
2. Click the **+/-** buttons next to their skip count
3. Useful for compensating issues or revoking misused skips

### Viewing User Submissions

Click the **📋** icon next to a participant to see all their submissions for review.

---

## Advanced Features

### Milestone Configuration

Milestones grant bonus rewards at specific tiles:

| Tile Position | Default Skip Reward | Default Ingots |
|--------------|---------------------|----------------|
| 6 | +1 skip | 50,000 |
| 12 | +2 skips | 100,000 |
| 18 | +3 skips | 150,000 |

Set these values on the specific tile's **Skip Reward** and **Reward Ingots** fields.

### Event Status Lifecycle

```
draft → active → completed
```

- **Draft**: Only admins can see; use for setup
- **Active**: Visible to all participants; submissions open
- **Completed**: Visible but submissions closed; final standings

### Bulk Actions

- **Save All Tiles**: Saves all tile changes at once
- **Delete All Tiles**: Clears all tiles (careful!)
- **Export Data**: Download participant progress as CSV

---

## Troubleshooting

### Common Issues

**"Submission not showing"**
- Check if the user has the correct tile unlocked
- Verify the image uploaded successfully

**"Auto-approval not working"**
- Add more keywords to the tile
- Check if the screenshot contains readable text
- OCR works best with clear, full screenshots

**"User stuck on wrong tile"**
- Check for rejected submissions
- Verify previous tiles are properly approved
- Manually approve if needed

### Need More Help?

Contact a developer if you encounter technical issues or need database-level fixes.

---

Happy event managing! 🎮

