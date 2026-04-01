this.preserve = true;
const { range_start, range_end, calendar_id } = this.args.calendar;

// Outlook timed events provide dateTime + timeZone.
// If dateTime has no explicit offset (+/- HH:MM) and the timezone is UTC, append Z before parsing.
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

if (errors) {
  return [];
}

this.console.log("Outlook events:", data.value);

return data.value
  .filter((event) => {
    return !["workingElsewhere"].includes(event.showAs);
  })
  .map((event) => {
    const { startDate, endDate } = parseDateBounds(event);

    if (!startDate || !endDate) {
      return null;
    }

    // // If the iCalUID has a "--" in it, try to extract an activity ID.
    // // This is how the calendar plugin will create events for scheduled activities.
    const activityId = event.iCalUId?.includes("--") ? event.iCalUId.split("--")[0] : undefined;

    // Outlook has a webLink property that provides a direct link to the event but it treats it as a new event

    const kizen_event = {
      id: event.id,
      activity_id: activityId,
      calendar_id: calendar_id,
      title: event.subject,
      description: event.bodyPreview,
      start_time: this.formatDateForResponse(startDate),
      end_time: this.formatDateForResponse(endDate),
      all_day: event.isAllDay || false,
      // The showAs property indicates the availability of the event. (free, tentative, busy, oof, workingElsewhere, unknown)
      busy: event.showAs !== "free",
      url: event.webLink,
      attendees:
        event.attendees
          ?.filter(
            (attendee) => attendee?.status?.response === "accepted" || attendee?.status?.response === "organizer",
          )
          .map((attendee) => attendee?.emailAddress?.address)
          .filter((email) => !!email) ?? [],
    };
    this.console.log("kizen_event:", kizen_event);
    return kizen_event;
  })
  .filter((event) => event !== null);
