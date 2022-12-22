import { readFile } from "fs/promises";
import Hapi from "@hapi/hapi";
import {
  authorize,
  getEvents,
  filterEventsInRange,
  createEvent,
  createFiles,
} from "./functions";

const init = async () => {
  const server = Hapi.server({
    port: 3333,
    host: "localhost",
    routes: {
      cors: {
        origin: ["http://studioabsent.com", "https://studioabsent.com"],
      },
    },
  });

  server.route({
    method: "GET",
    path: "/",
    handler: handleGet,
  });

  server.route({
    method: "POST",
    path: "/",
    options: {
      payload: {
        output: "stream",
        parse: true,
        multipart: {
          output: "annotated",
        },
      },
    },
    handler: handlePost,
  });

  await server.start();
  console.log("Server running on %s", server.info.uri);
};

async function handleGet(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { calendarId, mo, tu, we, th, fr, sa, su, timeMin, timeMax } =
    req.query;

  const schedule = { mo, tu, we, th, fr, sa, su };

  try {
    if (!calendarId) {
      throw new Error("No calendar id provided.");
    }

    if (!mo && !tu && !we && !th && !fr && !sa && !su) {
      throw new Error("No schedule provided.");
    }

    if (!timeMin || !timeMax) {
      throw new Error("No date range provided.");
    }

    const credentials = await readFile("credentials.json");
    const oAuth2Client = await authorize(JSON.parse(credentials.toString()));
    const events = await getEvents(oAuth2Client, calendarId, timeMin, timeMax);

    if (!events) {
      throw new Error("Could not get events.");
    }

    const availableEvents = filterEventsInRange(
      new Date(timeMin),
      new Date(timeMax),
      events,
      schedule
    );

    return h
      .response({
        availableEvents,
      })
      .code(200)
      .header("Access-Control-Allow-Origin", "http://localhost:3000");
  } catch (err) {
    // Just set all error to 500 for now, view them in the logs if required.
    console.log("ERROR:", err);
    return h.response({ message: "Internal server error." }).code(500);
  }
}

type BookingPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  description: string;
  sizing: string;
  placement: string;
  date: string;
  calendarId: string;
  references: BookingReferenceFile[];
};

export type BookingReferenceFile = {
  filename: string;
  headers: any;
  payload: Buffer;
};

async function handlePost(req: Hapi.Request, h: Hapi.ResponseToolkit) {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      description,
      sizing,
      placement,
      date,
      calendarId,
    } = req.payload as any;
    let {references} = req.payload as any;

    if (!(references instanceof Array)) {
        references = [references];
    }

    const credentials = await readFile("credentials.json");
    const oAuth2Client = await authorize(JSON.parse(credentials.toString()));

let attachments;
    try {
    attachments = await createFiles(oAuth2Client, references);
    } catch (e) {
        console.log(e);    }
    console.log(attachments);

    await createEvent(oAuth2Client, {
      calendarId,
      supportsAttachments: true,
      sendUpdates: "all",
      requestBody: {
        attendees: [{ email }],
        summary: `${first_name} ${last_name}`,
        start: {
          dateTime: date,
          timeZone: "Australia/Melbourne",
        },
        end: {
          dateTime: date,
          timeZone: "Australia/Melbourne",
        },
        location: "381-387 Flinders Lane, Melbourne, VIC 3000",
        reminders: {
          useDefault: true,
        },
        description: `<p>${description}</p><h4>Sizing</h4><p>${sizing}</p><h4>Placement</h4><p>${placement}</p><p>${
          phone || "No phone number provided"
        }</p>`,
        attachments,
      },
    });

    return h.response().code(200);
  } catch (err) {
    console.log("ERROR:", err);
    return h.response({ message: "Internal server error." }).code(500);
  }
}

process.on("unhandledRejection", (err) => {
  console.error(err);
  process.exit(1);
});

init();
