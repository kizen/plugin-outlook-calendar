this.preserve = true;
const { range_start, range_end, calendar_id } = this.args.calendar;

this.console.log("Fetching events for calendar:", calendar_id, "from", range_start, "to", range_end);
// An all-day event from google will have a start and end date, but not
// a start or end datetime.
// const isAllDayEvent = (event) => {
//   return Boolean(!event.start.dateTime && !event.end.dateTime && event.start.date && event.end.date);
// };

// The date bounds need to be parsed in the user's timezone if they are an all-day event,
// otherwise we get a full timestamp that can be parsed as-is.
const parseDateBounds = (event) => {
  let startDate;
  let endDate;

  try {
    const startStr = event.start.dateTime || event.start.date;
    const endStr = event.end.dateTime || event.end.date;
    startDate = new Date(event.start.dateTime);
    endDate = new Date(event.end.dateTime);
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
    return ["free", "workingElsewhere"].includes(event.showAs);
  })
  .map((event) => {
    const { startDate, endDate } = parseDateBounds(event);

    if (!startDate || !endDate) {
      return null;
    }

    // // If the iCalUID has a "--" in it, try to extract an activity ID.
    // // This is how the calendar plugin will create events for scheduled activities.
    // const activityId = event.iCalUID?.includes("--") ? event.iCalUID.split("--")[0] : undefined;

    return {
      id: event.id,
      activity_id: activityId,
      calendar_id: calendar?.id,
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
  })
  .filter((event) => event !== null);
