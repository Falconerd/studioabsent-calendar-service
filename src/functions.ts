import fs from "fs";
import readline from "readline";
import { readFile, writeFile } from "fs/promises";
import * as calendar from "@googleapis/calendar";
import * as drive from "@googleapis/drive";
import { OAuth2Client } from "googleapis-common";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
import * as gaxios from "gaxios";
import { resourceLimits } from "worker_threads";
import { file } from "googleapis/build/src/apis/file";
import { BookingReferenceFile } from ".";
import path from "path";
import { exit } from "process";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isBetween);

dayjs.tz.setDefault("Australia/Melbourne");

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
];
const TOKEN_PATH = "token.json";

type TimeSlot = {
  hour: number;
  minute: number;
  duration: number;
};

type Schedule = {
  mo?: string[];
  tu?: string[];
  we?: string[];
  th?: string[];
  fr?: string[];
  sa?: string[];
  su?: string[];
};

interface InstalledCredentials {
  installed: {
    client_secret: string;
    client_id: string;
    redirect_uris: string[];
  };
}

export async function authorize(
  credentials: InstalledCredentials
): Promise<OAuth2Client> {
  const { client_secret, client_id, redirect_uris } = credentials.installed;

  const oAuth2Client = new calendar.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  const token = await getAccessToken(oAuth2Client);

  oAuth2Client.setCredentials(token);

  // const x = await oAuth2Client.getAccessToken();
  // console.log(x);
  
  return oAuth2Client;
}

/** Need this to authorise the application. */
async function getAccessToken(oAuth2Client: OAuth2Client): Promise<any> {
  try {
    const savedToken: any = await readFile(TOKEN_PATH);
    // TODO: Should token expiry be checked here and a new one fetched with refresh?
    // Is that happening automatically?
    // const st = JSON.parse(savedToken.toString());
    // console.log(dayjs().format(), dayjs(new Date(st.expiry_date)).format());
    return JSON.parse(savedToken.toString());
  } catch (err) {
    console.log("Could not parse token.", err);
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("Authorise this app by visiting this url:", authUrl);

  const token = await requestCode(oAuth2Client);

  if (!token) {
    throw new Error("No token.");
  }

  return token;
}

function requestCode(oAuth2Client: OAuth2Client): Promise<any> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("Enter the code from that page here:", async (code) => {
      rl.close();
      const tokenResponse = await oAuth2Client.getToken(code);

      if (!tokenResponse.res?.data) {
        return reject("Empty token");
      }

      const token = tokenResponse.res.data;

      oAuth2Client.setCredentials(token);

      try {
        await writeFile(TOKEN_PATH, JSON.stringify(token));
        resolve(token);
      } catch (e) {
        return reject(e);
      }
    });
  });
}

/* Need the upcoming events from any calendar given the id. */
export async function getEvents(
  auth: OAuth2Client,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  const _calendar = calendar.calendar({ version: "v3", auth });

  const res = await _calendar.events.list({ calendarId, timeMax, timeMin });
  const events = res.data.items;

  if (!events || !events.length) {
    console.log("No events found.");
    return [];
  }

  for (const event of events) {
      console.log({start: event.start, end: event.end});
  }

  return events;
}

export function dayNumberToAvailability(
  day: number,
  schedule: Schedule
): string[] | undefined {
  switch (day) {
    case 0:
      return schedule.su;
    case 1:
      return schedule.mo;
    case 2:
      return schedule.tu;
    case 3:
      return schedule.we;
    case 4:
      return schedule.th;
    case 5:
      return schedule.fr;
    case 6:
      return schedule.sa;
    default:
      return undefined;
  }
}

export function offsetToHourMinuteDuration(
  offset: string
): [number, number, number] {
  const [h, m, d] = offset.split(":").map((x) => parseInt(x, 10));
  return [h, m, d];
}

// Dumb slow version which should hopefully work better. Handles only single months
export function filterEvents(target: Date, events: calendar.calendar_v3.Schema$Event[], schedule: Schedule): string[][] {
  // 0 (1) -> 31 for each day of a month
  // Format is as such: HH:MM:du+ where du+ = variable length duration in minutes
  // EG: 15:10:120 - 3:10pm lasting 2 hours
  const availabilities: string[][] = [[]];

  const t = dayjs(target).tz('Australia/Melbourne');
  const startOfMonth = t.startOf("month");
  const endOfMonth = t.endOf("month");

  // Add to the availabilities array using the schedule.
  // TODO: clean up this garbage code
  for (let i = 1; i <= t.daysInMonth(); ++i) {
    const a = dayNumberToAvailability(startOfMonth.add(i - 1, "day").day(), schedule);
    if (!a) {
      availabilities[i] = [];
      continue;
    }

    if (a.length === undefined) {
      availabilities[i] = [...a];
      continue;
    }
    availabilities[i] = a;
  }
  for (let i = 1; i <= t.daysInMonth(); ++i) {
    if (typeof availabilities[i] === "string") {
      availabilities[i] = [(availabilities[i] as unknown) as string];
    }
  }
  console.log(availabilities);


  for (let i = 1; i <= availabilities.length; ++i) {
    const d = startOfMonth.add(i - 1, "day");

    if (!availabilities[i])
      continue;

    const slotDates = availabilities[i].filter((slot) => {
      const [hour, minute, duration] = slot.split(":").map(x => parseInt(x, 10));

      const slotStart = d.add(hour, "hour").add(minute, "minute");
      const slotEnd = slotStart.add(duration, "minute");

      // Check each event to see if it coincides with the start and end of each slot
      for (const event of events) {
        if (!event.start) {
          continue;
        }

        const start = dayjs(event.start?.date || event.start?.dateTime).tz('Australia/Melbourne');
        const end = dayjs(event.end?.date || event.end?.dateTime).tz('Australia/Melbourne');

	if (start.isSame(slotStart, 'date')) {
            console.log('event_start', start.format(), 'event_end', end.format());
            console.log('slot_start', slotStart.format(), 'slot_end', slotEnd.format());
            console.log(' ');
	}

        if (intervalsOverlap(slotStart.unix(), slotEnd.unix(), start.unix(), end.unix())) {
          return false;
        }
      }

      return true;
    });

    availabilities[i] = slotDates;
  }

  return availabilities;
}

export function filterEventsInRange(
  start: Date,
  end: Date,
  events: calendar.calendar_v3.Schema$Event[],
  schedule: Schedule
): string[][][] {
  const availablities: string[][][] = [];

  const startDate = dayjs(start);
  const endDate = dayjs(end);
  const diff = endDate.diff(startDate, "month");
  const range = diff > 0 ? diff + 1 : 0;

  for (let i = 0; i < range; ++i) {
    const currentMonth = startDate.add(i, "month");
    const d =
      i === 0 ? currentMonth.toDate() : currentMonth.startOf("month").toDate();
    availablities.push(filterEvents(d, events, schedule));
  }

  return availablities;
}

export async function createEvent(
  auth: OAuth2Client,
  event: calendar.calendar_v3.Params$Resource$Events$Insert
) {
  const _calendar = calendar.calendar({ version: "v3", auth });

  const res = await _calendar.acl.list({ auth, calendarId: event.calendarId });

  // Hardcoded emails... heh
  const artistEmail = res.data?.items?.reduce((acc: string, curr: any) => {
    if (curr.id?.includes("group.calendar.google")) {
      return "";
    }

    if (
      curr.id === "user:falcoderp@gmail.com" ||
      curr.id === "user:studioabsent.au@gmail.com"
    ) {
      return "";
    }

    return curr.id?.split(":")[1];
  }, "");

  if (artistEmail?.length && event.requestBody?.attendees) {
    await _calendar.events.insert({
      ...event,
      requestBody: {
        ...event.requestBody,
        attendees: [...event.requestBody.attendees, { email: artistEmail }],
      },
    });
  } else {
    await _calendar.events.insert(event);
  }
}

type UploadedFile = {
  id: string;
  webViewLink: string;
  name: string;
  mimeType: string;
};

export async function createFile(
  auth: OAuth2Client,
  file: BookingReferenceFile
): Promise<UploadedFile | null> {
  console.count();
  const _drive = drive.drive({ version: "v3", auth });
  console.count();

  const fileName = Date.now() + file.filename;
  console.count();
  const filePath = path.join("uploads", fileName);
  console.count();

  await writeFile(filePath, file.payload);
  console.count();

  const res = await _drive.files.create({
    auth,
    requestBody: {
      name: fileName,
    },
    media: {
      body: fs.createReadStream(filePath),
    },
  });

  console.log('attempted to create file:', res);

  if (!res.data.id || !res.data.mimeType || !res.data.name) {
    console.log('error: missing either id, mimeType, or name');
    return null;
  }

  await _drive.permissions.create({
    auth,
    fileId: res.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const linkRes = await _drive.files.get({
    fileId: res.data.id,
    fields: "webViewLink",
  });

  console.log('creating link:', linkRes);

  if (!linkRes.data.webViewLink) {
    console.log('error: missing webViewLink');
    return null;
  }

  return {
    id: res.data.id,
    webViewLink: linkRes.data.webViewLink,
    name: res.data.name,
    mimeType: res.data.mimeType,
  };
}

type Attachment = {
  fileId: string;
  fileUrl: string;
  title: string;
  mimeType: string;
};

export async function createFiles(
  auth: OAuth2Client,
  files: BookingReferenceFile[]
): Promise<Attachment[]> {
  const promises: Promise<UploadedFile | null>[] = [];

  for (const file of files) {
    promises.push(createFile(auth, file));
  }

  console.log('files uploaded:', files);

  const results: Attachment[] = [];

  await Promise.all(promises).then((uploadedFiles: (UploadedFile | null)[]) => {
    for (const uf of uploadedFiles) {
      if (uf) {
        results.push({
          fileId: uf.id,
          fileUrl: uf.webViewLink,
          title: uf.name,
          mimeType: uf.mimeType,
        });
      }
    }
  });

  return results;
}

export function intervalsOverlap(
  a: number,
  b: number,
  c: number,
  d: number
): boolean {
  let min, max;

  if (a <= c) {
    min = a;
    max = d;
  } else {
    min = c;
    max = b;
  }

  const width = max - min;

  return width <= b - a + (d - c);
}
