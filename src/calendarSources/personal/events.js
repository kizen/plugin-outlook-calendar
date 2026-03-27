this.preserve = true;
const { range_start, range_end, calendar_id } = this.args.calendar;

this.console.log("Fetching events for calendar:", calendar_id, "from", range_start, "to", range_end);
// Outlook timed events provide dateTime + timeZone.
// If dateTime has no explicit offset and the timezone is UTC, append Z before parsing.
const hasOffsetOrZulu = (value = "") => /[zZ]$|[+-]\d{2}:\d{2}$/.test(value);

const parseGraphDateTime = (dateTime, timeZone) => {
  if (!dateTime) {
    return undefined;
  }

  const normalizedDateTime = !hasOffsetOrZulu(dateTime) && timeZone === "UTC" ? `${dateTime}Z` : dateTime;
  const parsedDate = new Date(normalizedDateTime);

  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
};

const parseDateBounds = (event) => {
  let startDate;
  let endDate;

  try {
    startDate = parseGraphDateTime(event.start?.dateTime, event.start?.timeZone);
    endDate = parseGraphDateTime(event.end?.dateTime, event.end?.timeZone);
  } catch (ex) {}

  return { startDate, endDate };
};

const [data, errors] = await this.getWithErrors(
  this.getServiceUrl(
    "personal",
    `/v1.0/me/calendars/${encodeURIComponent(calendar_id)}/calendarView?startDateTime=${encodeURIComponent(
      range_start,
    )}&endDateTime=${encodeURIComponent(range_end)}`,
  ),
);
this.console.log("Fetched events:", data.value);
if (errors) {
  return [];
}

return data.value
  .filter((event) => {
    const isBusy = !["free", "workingElsewhere"].includes(event.showAs);
    this.console.log("Filtering event:", event.id, "isBusy:", isBusy);
    return isBusy;
  })
  .map((event) => {
    const { startDate, endDate } = parseDateBounds(event);
    this.console.log("Parsed event dates:", event.id, "startDate:", startDate, "endDate:", endDate);
    if (!startDate || !endDate) {
      return null;
    }

    // // If the iCalUID has a "--" in it, try to extract an activity ID.
    // // This is how the calendar plugin will create events for scheduled activities.
    const activityId = event.iCalUId?.includes("--") ? event.iCalUId.split("--")[0] : undefined;

    const kizen_event = {
      id: event.id,
      activity_id: activityId,
      calendar_id: calendar_id,
      title: event.subject,
      description: event.bodyPreview,
      start_time: this.formatDateForResponse(startDate),
      end_time: this.formatDateForResponse(endDate),
      all_day: event.isAllDay || false,
      // Transparency is how google indicates free/busy
      busy: event.showAs !== "free" && event.showAs !== "workingElsewhere",
      url: event.webLink,
      attendees:
        event.attendees
          ?.filter((attendee) => attendee.status === "accepted" || attendee.status === "organizer")
          .map((attendee) => attendee.emailAddress) ?? [],
    };
    this.console.log("kizen_event", kizen_event);
    return kizen_event;
  })
  .filter((event) => event !== null);
