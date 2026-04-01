const allCalendarsEnabled = this.userConfig.enableAllCalendars ?? true; // Default to true
const calendarFilterList = this.userConfig.enabledUserCalendars?.map((calendar) => calendar.value) || [];

const [data, errors] = await this.getWithErrors(this.getServiceUrl("personal", "/v1.0/me/calendars"));

if (errors) {
  return [];
}

this.console.log("Fetched calendars:", data.value);

return data.value
  .map((calendar) => ({
    id: calendar.id,
    description: "",
    name: calendar.name,
    default: calendar.isDefaultCalendar || false,
  }))
  .filter((calendar) => {
    if (allCalendarsEnabled) {
      return true;
    }
    if (calendarFilterList.includes(calendar.id)) {
      return true;
    }
    return false;
  });
