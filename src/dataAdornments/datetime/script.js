this.preserve = true;

function utf8ToBase64(str) {
  return btoa(
    Array.from(new TextEncoder().encode(str))
      .map((b) => String.fromCharCode(b))
      .join(""),
  );
}

const toTimeRange = (input, isAllDay = false, durationInMinutes = 30) => {
  const parseDateInput = () => {
    if (typeof input === "string") return new Date(input);
    if (input && typeof input === "object" && typeof input.label === "string") {
      const [month, day, year] = input.label.split("/");
      return new Date(`${year}-${month}-${day}T00:00:00`);
    }
    throw new Error("Date Value invalid");
  };

  const startDate = parseDateInput();
  const endDate = new Date(startDate.getTime() + (isAllDay ? 86400000 : durationInMinutes * 60000));

  return { startDate, endDate };
};

const buildEventName = (record, object, fieldId) => {
  const recordFields = Object.values(record.fields ?? {}) ?? [];
  const fieldName = recordFields.find((field) => field.id === fieldId)?.display_name;
  let recordName = recordFields.find((field) => field.name === "display_name")?.value;

  if (!recordName && recordFields.length) {
    recordName = `${recordFields.find((f) => f.name === "first_name")?.value || ""} ${
      recordFields.find((f) => f.name === "last_name")?.value || ""
    }`.trim();
  }

  if (!recordName && !fieldName && !object.object_name && !object.name) {
    return "";
  }

  if (record.activityId) {
    const recordNameResult = recordName || record.display_name || "";
    return `${object.object_name || object.name}+Activity${recordNameResult ? "+-+" + recordNameResult : ""}`;
  }

  return `${object.object_name || object.name || ""}${recordName ? "+-+" + recordName : ""}${
    fieldName ? "+-+" + fieldName : ""
  }`;
};

const getAppBaseUrl = () => {
  if (this.applicationPath.includes("integration")) return "https://v2.integration.kizen.dev";
  if (this.applicationPath.includes("staging")) return "https://v2.staging.kizen.com";
  if (this.applicationPath.includes("go")) return "https://go.kizen.com";
  return "https://fmo.kizen.com";
};

const buildEventDetails = (record, object, activityId) => {
  const baseUrl = getAppBaseUrl();
  if (!object.id || !baseUrl) return "";

  if (activityId && object.id === this.currentBusiness.client_object.id && record.id) {
    return `View activity in Kizen: ${baseUrl}/client/${record.id}/details?view_scheduled_activity_id=${activityId}`;
  } else if (activityId && record.id) {
    return `View activity in Kizen: ${baseUrl}/custom-objects/${object.id}/${record.id}/details?view_scheduled_activity_id=${activityId}`;
  } else if (activityId) {
    return "";
  } else if (object.id === this.currentBusiness.client_object.id) {
    return `View record in Kizen: ${baseUrl}/client/${record.id}/details`;
  }

  return `View record in Kizen: ${baseUrl}/custom-objects/${object.id}/${record.id}/details`;
};

const getRecordUrl = (objectId = "", recordId = "", fieldNames = "", fieldIds = "") =>
  `/records/${objectId}/${recordId}?field_names=${fieldNames}&field_ids=${fieldIds}`;
const getObjectUrl = (objectId = "") => `/custom-objects/${objectId}`;
const getActivityUrl = (activityId = "") => `/activities/${activityId}`;
const getScheduledActivityUrl = (activityId) => `/activities/scheduled-activity/${activityId}`;

// Fetch object and record
let record;
let activity = { name: "" };
let object = this.args.objectId ? await this.get(getObjectUrl(this.args.objectId)) : {};

if (this.args.activityId) {
  const scheduledActivity = await this.get(getScheduledActivityUrl(this.args.activityId));
  if (scheduledActivity) {
    activity = (await this.get(getActivityUrl(scheduledActivity.activity_object.id))) ?? { name: "" };
    object = { ...object, object_name: activity?.name || "" };
  }

  switch (this.args.fieldId) {
    case "due_datetime":
    case "due_datetime_my_time":
      record = { id: this.args.entityId, display_name: "Due Date" };
      break;
    case "original_due_datetime":
      record = { id: this.args.entityId, display_name: "Original Due Date" };
      break;
    default:
      record =
        this.args.objectId && this.args.entityId
          ? ((await this.get(getRecordUrl(this.args.objectId, this.args.entityId, "name", this.args.fieldId))) ?? {})
          : {};
      break;
  }
  record = { ...record, activityId: this.args.activityId };
} else {
  record = (await this.get(getRecordUrl(this.args.objectId, this.args.entityId, "name", this.args.fieldId))) ?? {};
}

// // ICS generation logic
// const formatDateForICS = (date) => date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

// const buildICSContent = (summary, description, start, end) => {
//   return `BEGIN:VCALENDAR
// VERSION:2.0
// CALSCALE:GREGORIAN
// BEGIN:VEVENT
// SUMMARY:${summary}
// DESCRIPTION:${description}
// DTSTART:${formatDateForICS(start)}
// DTEND:${formatDateForICS(end)}
// DTSTAMP:${formatDateForICS(new Date())}
// UID:${Date.now()}-${Math.random().toString(36).slice(2)}@kizen.com
// END:VEVENT
// END:VCALENDAR`;
// };

const isAllDayEvent = this.args.fieldType === "date";
const durationInMinutes = 30;

const { startDate, endDate } = toTimeRange(this.args.value, isAllDayEvent, durationInMinutes);
const eventName = buildEventName(record, object, this.args.fieldId);
const eventDetails = buildEventDetails(record, object, this.args.activityId);

this.console.log("Opening Outlook calendar with event:", {
  subject: eventName,
  body: eventDetails,
  startdt: startDate.toISOString(),
  enddt: endDate.toISOString(),
  allday: isAllDayEvent,
});

this.openWindow(`https://outlook.live.com/calendar/0/deeplink/compose?
  subject=${encodeURIComponent(eventName)}
  &body=${encodeURIComponent(eventDetails)}
  &startdt=${encodeURIComponent(startDate.toISOString())}
  &enddt=${encodeURIComponent(endDate.toISOString())}
  &allday=${isAllDayEvent}`);

// const icsContent = buildICSContent(eventName, eventDetails, startDate, endDate);

// const base64ICS = utf8ToBase64(icsContent);
// const dataUrl = `data:text/calendar;base64,${base64ICS}`;

// this.openWindow(dataUrl);
