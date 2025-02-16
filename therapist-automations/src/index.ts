import { z } from "zod";
import axios from "axios";

import { defineDAINService, ToolConfig, ServiceContext } from "@dainprotocol/service-sdk";

import {
  DainResponse,
  CardUIBuilder,
  TableUIBuilder,
  MapUIBuilder,
  LayoutUIBuilder,
  ChartUIBuilder,
} from "@dainprotocol/utils";


const emailConfig: ToolConfig = {
  id: "send-reminder-email",
  name: "Send Appointment Reminder Email",
  description: "Sends an appointment reminder email to a patient.", // TODO: Write Better Description
  input: z
    .object({
      name: z.string().describe("Patient's name"),
      email: z.string().email().describe("Patient's email address"),
      appointmentTime: z.string().datetime().describe("Appointment Date and Time"),
    })
    .describe("Input parameters for the appointment reminder email request"),
  output: z
    .object({
      emailRequest: z.string().describe("Content for the email request"),
    })
    .describe("Email sending status"),
  handler: async ({ name, email, appointmentTime }, agentInfo, context) => {
    console.log(
      `Sending email to ${name} at ${email}  for their appointment at ${appointmentTime}`
    );

    // TODO: Send email logic here
   // const response = await axios.get();

    return new DainResponse({
      text: `Please connect to the Gmail service and invoke the Gmail Send Email tool to send email to ${name} at ${email}  for their appointment at ${appointmentTime}`,     // Message for the AI agent
      data: {
        emailRequest: "Success",
      },     // Structured data matching the output schema
      ui: undefined,
    });
  },
};

const patientSummaryConfig: ToolConfig = {
  id: "summarize-patient-information",
  name: "Summarize Patient Information",
  description: "Summarizes the information of a patient for a therapist. Use to get visualizations of the check-in survey and summary of previous appointments.",
  input: z
    .object({
      name: z.string().describe("Patient's name"),
      patientInformation: z.string().describe("Notes on the patient's previous session"),
    })
    .describe("Input parameters for the patient summary request"),
  output: z
    .object({
      summary: z.string().describe("Summary of the patient's information and recommendataions for talking points")
    })
    .describe("Summary of the patient's information"),
  handler: async ({ name, patientInformation }, agentInfo, context) => {
    console.log(
      `Summarizing information for ${name}. The information passed in is: ${patientInformation}`
    );

    // TODO: Carissa's summarizing logic here
    const response = "[Placeholder Summary of patient's information]"

    // TODO: Graphs
    const chartUI = new ChartUIBuilder()
      .type("bar")           // Mandatory: 'bar' | 'line' | 'pie'
      .title("Monthly Sales") // Mandatory
      .chartData([           // Mandatory
        { month: "Jan", sales: 4000 },
        { month: "Feb", sales: 3000 }
      ])
      .dataKeys({            // Mandatory
        x: "month",
        y: "sales"
      })
      .description("Sales performance over time") // Optional
      .build();

    return new DainResponse({
      text: `Highlights of previous interactions and survey on ${name} and give suggestions on things to touch on during the session`,     // Message for the AI agent
      data: {
        summary: response,
      },
      ui: chartUI,
    });
  },
};

const userBehaviorContext: ServiceContext = {
  id: "userBehavior",
  name: "Usage Patterns",
  description: "User interaction patterns",
  getContextData: async () => {
    return `User typically tells about all the patients they have for the day, 
    then asks to send reminder emails to patients. Then they'll want a summary 
    of how their patients are doing.`;
  }
};

const dainService = defineDAINService({
  metadata: {
    title: "Therapist Automation Service",
    description:
      "A DAIN service to provide therapists with workflow automations",
    version: "1.0.0",
    author: "Cheryl Wu, Sean Chan, Carissa Ott, Michelle Liu",
    tags: ["Therapy", "Automation", "Summary"],
    logo: "https://i.imgur.com/iTMCXIa.png", // TODO: Update the logo URL
  },
  exampleQueries: [
    {
      category: "Therapy",
      queries: [
        "What can this service do?",
        "Please send my patients a reminder email for their next appointment",
        "Please give me a summary of how my patients are doing",
        "Please connect me to the Google Calendar API and get my patient schedule for the day",
      ],
    },
  ],
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [emailConfig, patientSummaryConfig],
  contexts: [userBehaviorContext],
});

dainService.startNode().then(({ address }) => {
  console.log("TheraMind Service is running at :" + address().port);
});

// const emailConfig: ToolConfig = {
//   id: "send-reminder-email",
//   name: "Send Appointment Reminder Email",
//   description: "Sends an appointment reminder email to a patient.", // TODO: Write Better Description
//   input: z
//     .object({
//       name: z.string().describe("Patient's name"),
//       email: z.string().email().describe("Patient's email address"),
//       appointmentTime: z.string().datetime().describe("Appointment Date and Time"),
//     })
//     .describe("Input parameters for the appointment reminder email request"),
//   output: z
//     .object({
//       success: z.string().describe("Success the email successfully sent, Failed if not"),
//     })
//     .describe("Email sending status"),
//   handler: async ({ name, email, appointmentTime }, agentInfo, context) => {
//     console.log(
//       `Sending email to ${name} at ${email}  for their appointment at ${appointmentTime}`
//     );

//     // TODO: Send email logic here
//    // const response = await axios.get();

//     return new DainResponse({
//       text: `Email sent to ${name} at ${email} for their appointment at ${appointmentTime}`,     // Message for the AI agent
//       data: {
//         success: "Success",
//       },     // Structured data matching the output schema
//       ui: new CardUIBuilder()
//       .title("Email Sent")
//       .content(`Reminder email sent to ${name} for appointment.`)
//       .build(),
//     });
//   },
// };
