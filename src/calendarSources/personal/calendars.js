this.console.log("Fetching calendars for user");

const allCalendarsEnabled = this.userConfig.enableAllCalendars ?? true; // Default to true
this.console.log("All calendars enabled:", allCalendarsEnabled);
const calendarFilterList = this.userConfig.enabledUserCalendars?.map((calendar) => calendar.value) || [];
this.console.log("Enabled user calendars:", calendarFilterList);

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
    this.console.log("Filtering calendar:", calendar.id);

    if (allCalendarsEnabled) {
      return true;
    }

    if (calendarFilterList.includes(calendar.id)) {
      return true;
    }

    return false;
  });
