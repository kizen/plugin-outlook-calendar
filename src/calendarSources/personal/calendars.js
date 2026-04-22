const allCalendarsEnabled = this.userConfig.enableAllCalendars ?? true; // Default to true
const calendarFilterList = this.userConfig.enabledUserCalendars?.map((calendar) => calendar.value) || [];
this.preserve = true;
this.console.log("All calendars enabled:", this.userConfig.enableAllCalendars);
this.console.log("User enabled calendars:", this.userConfig.enabledUserCalendars);
this.console.log("Calendar filter list:", calendarFilterList);
const [data, errors] = await this.getWithErrors(this.getServiceUrl("personal", "/v1.0/me/calendars"));
this.console.log("Calendars API response data:", data);
if (errors) {
  return [];
}

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
