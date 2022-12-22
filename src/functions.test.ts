import {
  filterEvents,
  intervalsOverlap,
} from "./functions";
/*
test.skip("days before should be empty", () => {
  const result = filterEventsForMonth(new Date(2021, 10, 8), [], {
    mo: [1],
    tu: [2],
    we: [3],
    th: [4],
    fr: [5],
  });

  for (let i = 0; i < 8; ++i) {
    expect(result[i]).toStrictEqual([]);
  }
});

test.skip("days after should not be empty", () => {
  const result = filterEventsForMonth(new Date(2021, 10, 8), [], {
    mo: [1],
    tu: [1],
    we: [1],
    th: [1],
    fr: [1],
    sa: [1],
    su: [1],
  });

  for (let i = 8; i < 31; ++i) {
    expect(result[i]).toStrictEqual([1]);
  }
});

test.skip("every tuesday should be 10, 15", () => {
  const result = filterEventsForMonth(new Date(2021, 10, 1), [], {
    tu: [10, 15],
  });

  for (let i = 0; i < 32; ++i) {
    if ([2, 9, 16, 23, 30].includes(i)) {
      expect(result[i]).toStrictEqual([10, 15]);
    }
  }
});

test.skip("every monday should be 10, and every thursday should be 10, 15", () => {
  const result = filterEventsForMonth(new Date(2021, 10, 8), [], {
    mo: [10],
    th: [10, 15],
  });

  for (let i = 0; i < 32; ++i) {
    if (i === 8 || i === 15 || i === 22) {
      expect(result[i]).toStrictEqual([10]);
    }

    if (i === 11 || i === 18 || i === 25) {
      expect(result[i]).toStrictEqual([10, 15]);
    }
  }
});

const EVENTS = [
  {
    start: { dateTime: "2021-11-15T00:00:00Z", timeZone: "Australia/Sydney" },
    end: { dateTime: "2021-11-15T03:00:00Z", timeZone: "Australia/Sydney" },
  },
  {
    start: { dateTime: "2021-11-25T04:00:00Z", timeZone: "Australia/Sydney" },
    end: { dateTime: "2021-11-25T07:00:00Z", timeZone: "Australia/Sydney" },
  },
  {
    start: { date: "2021-11-22T00:00:00Z", timeZone: "Australia/Sydney" },
  },
  {
    start: { date: "2022-01-24T00:00:00Z", timeZone: "Australia/Sydney" },
  },
];

test.skip("should remove slots when an event coincides", () => {
  const result = filterEventsForMonth(new Date(2021, 10, 3), EVENTS, {
    mo: [10],
    th: [10, 15],
  });

  expect(result[1]).toStrictEqual([]);
  expect(result[3]).toStrictEqual([]);
  expect(result[22]).toStrictEqual([]);
  expect(result[25]).toStrictEqual([10]);

  [4, 11, 18].map((x) => expect(result[x]).toStrictEqual([10, 15]));
  [8, 15, 29].map((x) => expect(result[x]).toStrictEqual([10]));
});

test.skip("test another month", () => {
  const result = filterEventsForMonth(new Date(2022, 1, 1), EVENTS, {
    mo: [10],
    th: [10, 15],
  });

  [7, 14, 21, 28].map((x) => expect(result[x]).toStrictEqual([10]));
  [3, 10, 17, 24].map((x) => expect(result[x]).toStrictEqual([10, 15]));
});

test.skip("expect range to return correct results", () => {
  const result = filterEventsInRange(
    new Date(2021, 10, 3),
    new Date(2022, 2, 7),
    EVENTS,
    {
      mo: [10],
      th: [10, 15],
    }
  );

  // November.
  expect(result[0][1]).toStrictEqual([]);
  expect(result[0][3]).toStrictEqual([]);
  expect(result[0][22]).toStrictEqual([]);
  expect(result[0][25]).toStrictEqual([10]);

  [4, 11, 18].map((x) => expect(result[0][x]).toStrictEqual([10, 15]));
  [8, 15, 29].map((x) => expect(result[0][x]).toStrictEqual([10]));

  // December.
  [2, 9, 16, 23, 30].map((x) => expect(result[1][x]).toStrictEqual([10, 15]));
  [6, 13, 20, 27].map((x) => expect(result[1][x]).toStrictEqual([10]));

  // January.
  expect(result[2][24]).toStrictEqual([]);

  [3, 10, 17, 31].map((x) => expect(result[2][x]).toStrictEqual([10]));
  [6, 13, 20, 27].map((x) => expect(result[2][x]).toStrictEqual([10, 15]));

  // February.
  [7, 14, 21, 28].map((x) => expect(result[3][x]).toStrictEqual([10]));
  [3, 10, 17, 24].map((x) => expect(result[3][x]).toStrictEqual([10, 15]));
});
*/

test("interval overlap function", () => {
  expect(intervalsOverlap(0, 1, 0, 1)).toBe(true);
  expect(intervalsOverlap(0, 2, 2.1, 3)).toBe(false);
  expect(intervalsOverlap(-2, 4, -6, -6)).toBe(false);
});

const EVENTS = [
  {
    start: { dateTime: "2021-12-15T00:00:00Z", timeZone: "Australia/Sydney" },
    end: { dateTime: "2021-12-15T03:00:00Z", timeZone: "Australia/Sydney" },
  },
  {
    start: { dateTime: "2021-12-25T04:00:00Z", timeZone: "Australia/Sydney" },
    end: { dateTime: "2021-12-25T07:00:00Z", timeZone: "Australia/Sydney" },
  },
  {
    start: { date: "2021-12-22T00:00:00Z", timeZone: "Australia/Sydney" },
  },
  {
    start: { date: "2022-01-24T00:00:00Z", timeZone: "Australia/Sydney" },
  },
  {
    start: { date: "2021-12-14", timeZone: "Australia/Melbourne" },
    end: { date: "2021-12-20", timeZone: "Australia/Melbourne" }
  },
  {
    start: { date: "2022-12-20", timeZone: "Australia/Melbourne" },
    end: { date: "2023-01-20", timeZone: "Australia/Melbourne" }
  }
];

test("multi-day events (leave)", () => {
  const result = filterEvents(new Date(2021, 11, 3), EVENTS, {
    su: ["11:0:180", "15:0:180"],
    mo: ["11:0:180", "15:0:180"],
    tu: ["11:0:180", "15:0:180"],
    we: ["11:0:180", "15:0:180"],
    th: ["11:0:180", "15:0:180"],
    fr: ["11:0:180", "15:0:180"],
    sa: ["11:0:180", "15:0:180"],
  });

  [14, 15, 16, 17, 18].map((x) => expect(result[x]).toHaveLength(0));
});


test("one event running across months", () => {
  let result = filterEvents(new Date(2022, 11, 3), EVENTS, {
    su: ["11:0:180", "15:0:180"],
    mo: ["11:0:180", "15:0:180"],
    tu: ["11:0:180", "15:0:180"],
    we: ["11:0:180", "15:0:180"],
    th: ["11:0:180", "15:0:180"],
    fr: ["11:0:180", "15:0:180"],
    sa: ["11:0:180", "15:0:180"],
  });

  [20, 21, 22, 23, 24, 31].map((x) => expect(result[x]).toHaveLength(0));

  result = filterEvents(new Date(2023, 0, 3), EVENTS, {
    su: ["11:0:180", "15:0:180"],
    mo: ["11:0:180", "15:0:180"],
    tu: ["11:0:180", "15:0:180"],
    we: ["11:0:180", "15:0:180"],
    th: ["11:0:180", "15:0:180"],
    fr: ["11:0:180", "15:0:180"],
    sa: ["11:0:180", "15:0:180"],
  });

  [1, 2, 3, 4, 5, 19].map((x) => expect(result[x]).toHaveLength(0));
})