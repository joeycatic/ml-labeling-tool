import { PrismaClient } from "@prisma/client";

import { buildContentFingerprint } from "../src/lib/email-fingerprint";

const prisma = new PrismaClient();

type SampleEmail = {
  messageId: string;
  threadId: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  snippet: string;
  bodyText: string | null;
  bodyHtml?: string | null;
  receivedAt: Date;
  source: string;
};

const sampleEmails = [
  {
    messageId: "sample-001",
    threadId: "thread-exam-1",
    senderName: "Prof. Anna Becker",
    senderEmail: "anna.becker@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Final exam room change for Data Mining",
    snippet: "The final exam has been moved to Lecture Hall C and starts 30 minutes earlier.",
    bodyText:
      "Hello everyone,\n\nPlease note that the final exam for Data Mining will now take place in Lecture Hall C on 22 July at 08:30 instead of 09:00. Bring your student ID and arrive at least 15 minutes early.\n\nBest,\nProf. Becker",
    receivedAt: new Date("2026-04-02T08:15:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-002",
    threadId: "thread-assignment-1",
    senderName: "Moodle Notifications",
    senderEmail: "no-reply@moodle.uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Assignment 3 deadline extended",
    snippet: "The submission deadline for Assignment 3 has been extended by 48 hours.",
    bodyText:
      "Your course Advanced Algorithms has updated Assignment 3. The new deadline is Friday, 17 May at 23:59. Please review the rubric before resubmitting.",
    receivedAt: new Date("2026-04-04T10:20:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-003",
    threadId: "thread-course-1",
    senderName: "Dr. Leo Martin",
    senderEmail: "leo.martin@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Tomorrow's machine learning lecture slides",
    snippet: "Slides and reading questions for tomorrow's lecture are attached.",
    bodyText:
      "Hi all,\n\nI uploaded tomorrow's machine learning lecture slides to PANDA. Please read section 5 before class and bring your questions.\n\nRegards,\nDr. Martin",
    receivedAt: new Date("2026-04-06T15:40:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-004",
    threadId: "thread-event-1",
    senderName: "Faculty Events",
    senderEmail: "events@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "AI research seminar this Thursday",
    snippet: "Join us for a guest seminar on trustworthy AI with visiting researchers.",
    bodyText:
      "The Computer Science faculty invites you to an AI research seminar this Thursday at 17:00 in Room B204. Snacks will be provided. Registration is optional.",
    receivedAt: new Date("2026-04-08T09:00:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-005",
    threadId: "thread-career-1",
    senderName: "Career Center",
    senderEmail: "career@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Summer internship fair registration open",
    snippet: "Meet employers from tech, consulting, and research at the summer career fair.",
    bodyText:
      "Registration is now open for the university summer internship fair on 4 June. You can book CV review slots and meet companies hiring for working student roles.",
    receivedAt: new Date("2026-04-09T11:05:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-006",
    threadId: "thread-newsletter-1",
    senderName: "Campus Weekly",
    senderEmail: "newsletter@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Campus Weekly: spring highlights",
    snippet: "This week's newsletter covers sports, alumni stories, and cafeteria specials.",
    bodyText:
      "Welcome to Campus Weekly. In this issue: alumni success stories, sports team updates, new cafeteria menus, and a photo recap from spring festival.",
    receivedAt: new Date("2026-04-10T06:50:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-007",
    threadId: "thread-library-1",
    senderName: "University Library",
    senderEmail: "library@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Library reminder: borrowed book due soon",
    snippet: "One of your borrowed books is due in three days.",
    bodyText:
      "Dear student,\n\nThe book 'Introduction to Statistical Learning' is due back on 14 April. Please renew it online if you need more time to avoid fines.",
    receivedAt: new Date("2026-04-11T07:30:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-008",
    threadId: "thread-admin-1",
    senderName: "Student Office",
    senderEmail: "studentoffice@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Missing enrollment certificate for semester registration",
    snippet: "Your semester registration is pending because one document is still missing.",
    bodyText:
      "We cannot finalize your semester registration until you upload the updated enrollment certificate to the student portal by 19 April. Please contact us if you need help.",
    receivedAt: new Date("2026-04-12T12:10:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-009",
    threadId: "thread-system-1",
    senderName: "PANDA",
    senderEmail: "no-reply@panda.uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "New forum post in Applied NLP",
    snippet: "A new course forum post has been published.",
    bodyText:
      "There is a new forum post in Applied NLP titled 'Clarification on project milestone expectations'. Visit the course space to read and reply.",
    receivedAt: new Date("2026-04-13T16:25:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-010",
    threadId: "thread-prof-1",
    senderName: "Prof. Clara Nguyen",
    senderEmail: "clara.nguyen@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Please confirm your project presentation slot",
    snippet: "I need your confirmation for the presentation slot by tomorrow noon.",
    bodyText:
      "Hello,\n\nI assigned you the 10:20 presentation slot on 28 April for the ML Systems seminar. Please confirm by tomorrow 12:00 so I can finalize the schedule.\n\nBest,\nClara Nguyen",
    receivedAt: new Date("2026-04-15T18:45:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-011",
    threadId: "thread-marketing-1",
    senderName: "Notebook Deals",
    senderEmail: "offers@best-laptops.example",
    recipientEmail: "student@uni-example.edu",
    subject: "Flash sale on gaming laptops",
    snippet: "Upgrade today with discounts up to 40 percent on premium devices.",
    bodyText:
      "Exclusive student-like savings on gaming laptops, accessories, and RGB keyboards. Buy today and get free shipping across Europe.",
    receivedAt: new Date("2026-04-16T05:55:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-012",
    threadId: "thread-deadline-1",
    senderName: "Exam Office",
    senderEmail: "examoffice@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Last day to register for Operating Systems exam",
    snippet: "Exam registration closes this Friday at 23:59.",
    bodyText:
      "This is a reminder that registration for the Operating Systems written exam closes on Friday, 26 April at 23:59. Late registrations cannot be accepted.",
    receivedAt: new Date("2026-04-17T09:12:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-013",
    threadId: "thread-workshop-1",
    senderName: "Data Lab",
    senderEmail: "datalab@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Workshop: Git for thesis projects",
    snippet: "A practical workshop on Git workflows for team research projects.",
    bodyText:
      "The Data Lab is hosting a two-hour Git workshop for bachelor and master students next Wednesday. This session is optional and targeted at thesis and seminar projects.",
    receivedAt: new Date("2026-04-18T14:05:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-014",
    threadId: "thread-system-2",
    senderName: "IT Services",
    senderEmail: "it-support@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Scheduled maintenance for university mail",
    snippet: "Email access may be interrupted this weekend.",
    bodyText:
      "IT Services will perform scheduled maintenance on the mail gateway on Saturday from 01:00 to 04:00. You may experience delayed delivery during that period.",
    receivedAt: new Date("2026-04-19T08:00:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-015",
    threadId: "thread-course-2",
    senderName: "Teaching Assistant Team",
    senderEmail: "ta-ds@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Tutorial cancelled due to public holiday",
    snippet: "The Thursday tutorial will not take place this week.",
    bodyText:
      "Please note that this week's Data Structures tutorial is cancelled because the university is closed on Thursday. Replacement office hours will be offered online on Friday.",
    receivedAt: new Date("2026-04-20T13:22:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-016",
    threadId: "thread-duplicate-1",
    senderName: "Campus Weekly",
    senderEmail: "newsletter@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Campus Weekly: spring highlights",
    snippet: "Reminder copy of this week's newsletter.",
    bodyText:
      "This is a reminder copy of Campus Weekly covering sports, alumni stories, and cafeteria specials.",
    receivedAt: new Date("2026-04-20T18:10:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-017",
    threadId: "thread-admin-2",
    senderName: "International Office",
    senderEmail: "international@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "Application documents missing for exchange nomination",
    snippet: "Two required application documents are still missing.",
    bodyText:
      "Your exchange nomination can only be processed once your transcript and language certificate are uploaded. Please submit them by 30 April.",
    receivedAt: new Date("2026-04-22T07:48:00.000Z"),
    source: "seed",
  },
  {
    messageId: "sample-018",
    threadId: "thread-empty-1",
    senderName: "Unknown Sender",
    senderEmail: "unknown@uni-example.edu",
    recipientEmail: "student@uni-example.edu",
    subject: "",
    snippet: "",
    bodyText: null,
    bodyHtml: null,
    receivedAt: new Date("2026-04-23T19:00:00.000Z"),
    source: "seed",
  },
] satisfies SampleEmail[];

async function main() {
  for (const email of sampleEmails) {
    const contentFingerprint = buildContentFingerprint({
      senderEmail: email.senderEmail,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      snippet: email.snippet,
      bodyText: email.bodyText,
      receivedAt: email.receivedAt,
    });

    await prisma.email.upsert({
      where: { messageId: email.messageId },
      update: {
        threadId: email.threadId,
        senderName: email.senderName,
        senderEmail: email.senderEmail,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        snippet: email.snippet,
        bodyText: email.bodyText,
        bodyHtml: email.bodyHtml ?? null,
        attachmentCount: 0,
        attachmentNamesJson: null,
        contentFingerprint,
        receivedAt: email.receivedAt,
        source: email.source,
      },
      create: {
        ...email,
        attachmentCount: 0,
        attachmentNamesJson: null,
        contentFingerprint,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
