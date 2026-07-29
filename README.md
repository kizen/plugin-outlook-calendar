# Microsoft Outlook Calendar Plugin

### Overview

This plugin connects Kizen to Microsoft Outlook Calendar. It has two independent features:

1. **Create Outlook Event** — a data adornment on Date and Date/Time fields that opens a pre-filled "create event" deeplink in Outlook Calendar for that field's value.
2. **Personal Calendar Sync** — lets each user connect their own Microsoft account via OAuth so their Outlook Calendar events show up on the scheduled activities calendar dashlet alongside their Kizen activities.

Both features are enabled by default and can be toggled independently by business administrators.

---

### Prerequisites

- A Microsoft Entra ID (Azure AD) app registration with the delegated `Calendars.Read` Microsoft Graph permission, and its client ID/secret configured under the `personal` service in [kizen.json](kizen.json)
- Users must have a Microsoft account to connect (Personal Calendar Sync only)

---

### Feature 1: Create Outlook Event

Adds a calendar icon adornment next to any Date or Date/Time field ([src/dataAdornments/date](src/dataAdornments/date), [src/dataAdornments/datetime](src/dataAdornments/datetime)). Clicking it opens Outlook's `deeplink/compose` page in a new window with the event pre-filled:

- **Subject** — built from the related object/record name, and the activity name if the field belongs to a scheduled activity
- **Body** — a link back to the record (or scheduled activity) in Kizen, pointed at the environment the user is currently in
- **Start/end** — the field's value as ISO timestamps; Date fields create an all-day event (`allday=true`, 24-hour span), Date/Time fields create a 30-minute event

This does not require OAuth — it only builds a URL and opens Microsoft's own event-creation page.

**Business setup:** In the business-level plugin config, toggle **Enable Data Adornment** (`enableAdornments`, default `true`). Disabling it removes the adornment for all users of the business.

---

### Feature 2: Personal Calendar Sync

Lets a user OAuth into their own Microsoft account so their calendar events appear on the scheduled activities calendar dashlet.

- [src/calendarSources/personal/calendars.js](src/calendarSources/personal/calendars.js) lists the user's Outlook calendars (`GET /v1.0/me/calendars`), filtered down to the calendars the user has enabled.
- [src/calendarSources/personal/events.js](src/calendarSources/personal/events.js) fetches events for a given calendar and date range (`GET /v1.0/me/calendars/{calendar_id}/calendarView`) and maps them into Kizen's event shape (title, description, start/end time, all-day flag, busy/free, attendees, link). Notable mapping details:
  - Events with `showAs: "workingElsewhere"` are dropped; anything other than `free` counts as busy.
  - Attendees are limited to those who accepted or are the organizer.
  - All-day events are parsed at local midnight so a UTC conversion can't shift them a day; timed events without an explicit offset are treated as UTC when Graph reports the timezone as `UTC`.
  - Events created by Kizen's own scheduled activities (identified by a `--` in the Graph `iCalUId`) are tagged with their originating `activity_id` so they aren't duplicated on the dashlet.

**Business setup:** Toggle **Enable External Calendars** (`enableExternalCalendars`, default `true`) in the business-level plugin config. Disabling it removes the feature for all users of the business.

**User setup:** Each user connects their own Microsoft account from their plugin settings (OAuth, `personal` service — see [kizen.json](kizen.json)). Once connected, they choose:

- **Enable All Calendars** (`enableAllCalendars`, default `true`) — sync every calendar the user has access to
- **Enabled Calendars** (`enabledUserCalendars`) — when "Enable All Calendars" is off, an explicit multi-select list of which calendars to sync

A user's calendar selection and connection are private to that user — other users of the business do not get access to those calendars.

**OAuth scopes requested:** `openid`, `profile`, `email`, `offline_access`, `https://graph.microsoft.com/Calendars.Read` (read-only — the plugin never writes to a user's Outlook Calendar).

---

### Configuration Reference

| Level    | Key                       | Type           | Default | Description                                                                             |
| -------- | ------------------------- | -------------- | ------- | --------------------------------------------------------------------------------------- |
| Business | `enableAdornments`        | boolean        | `true`  | Show the "Create Outlook Event" icon on Date/Date-Time fields                            |
| Business | `enableExternalCalendars` | boolean        | `true`  | Allow users to connect their Microsoft account and sync calendars                        |
| User     | `enableExternalCalendars` | boolean        | `true`  | This user's opt-in to sync their calendars (shown when the business setting above is on) |
| User     | `enableAllCalendars`      | boolean        | `true`  | Sync all of the user's calendars instead of a specific selection                         |
| User     | `enabledUserCalendars`    | select (multi) | —       | Which calendars to sync, when "Enable All Calendars" is off                              |

---

### Release Notes

See [releaseNotes/](releaseNotes/) for the version history, or [releaseNotes/2.0.0.md](releaseNotes/2.0.0.md) for the most recent major update (business-level toggle for the adornment, and per-user Outlook Calendar sync on the scheduled activities dashlet).
