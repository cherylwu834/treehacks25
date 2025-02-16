import { z } from "zod";
import axios from "axios";
import { exec } from 'child_process';
import * as fs from 'fs';

import { defineDAINService, ToolConfig, ServiceContext } from "@dainprotocol/service-sdk";
import {
  DainClientAuth,
  DainServiceConnection,
} from "@dainprotocol/service-sdk/client";

import {
  DainResponse,
  CardUIBuilder,
  TableUIBuilder,
  MapUIBuilder,
  LayoutUIBuilder,
  ChartUIBuilder,
} from "@dainprotocol/utils";


// Initialize DAIN client to connect to the email service
const auth = new DainClientAuth({
  apiKey: process.env.DAIN_API_KEY!,
});

//initialize a connection to the email service
const serviceUrl = "https://hammerhead-app-n9cx5.ondigitalocean.app";

const emailService = new DainServiceConnection(
  serviceUrl, // this is the url of the email service
  auth
);

const AppointmentSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  appointment: z.string()
});

// Tool to send reminder emails to patients
const apptConfig: ToolConfig = {
  id: "fetch-appt-info",
  name: "Get Appointment Information for a date",
  description: "Fetches the appointment information for a given date. Use when asking what appointments the user has on a specific date.",
  input: z
    .object({
      date: z.string().date().describe("Appointment Date")
    })
    .describe(""),
  output: z
    .object({
      appointments: z.array(AppointmentSchema),
    }),
  handler: async ({ date }, agentInfo, context) => {
    console.log(
      `Fetching appointment information for appointments on ${date}`
    );


    // Get Patient Email and Appointment Time
    const filePath = "appointmentDate.json";
    const jsonApptData = fs.readFileSync(filePath, 'utf-8');
    const apptData = JSON.parse(jsonApptData);

    console.log(apptData)

    // // Get Patient Email and Appointment Time
    // const emailFilePath = "emails.json";
    // const jsonEmailData = fs.readFileSync(emailFilePath, 'utf-8');
    // const emailData = JSON.parse(jsonEmailData);



    return new DainResponse({
      text: `Fetched appointment information for appointments on ${date}. Ask the user if they want to send reminder emails.`,     // Message for the AI agent
      data: { 
        appointments: apptData[date] 
      },
      ui: undefined,
    });
  },
};

// Tool to send reminder emails to patients
const emailConfig: ToolConfig = {
  id: "send-reminder-email",
  name: "Send Appointment Reminder Email",
  description: "Sends an appointment reminder email to a patient. Use when a patient has an upcoming appointment.", // TODO: Write Better Description
  input: z
    .object({
      name: z.string().describe("Patient's name"),
      // email: z.string().email().describe("Patient's email address"),
      // appointmentTime: z.string().datetime().describe("Appointment Date and Time"),
    })
    .describe("Input parameters for the appointment reminder email request"),
  output: z
    .object({
      id: z.string(),
      success: z.boolean(),
    }),
  handler: async ({ name }, agentInfo, context) => {

    // Get Patient Email and Appointment Time
    const filePath = "emails.json";
    const jsonEmailData = fs.readFileSync(filePath, 'utf-8');
    const emailData = JSON.parse(jsonEmailData);
    const email = emailData[name]['email'];
    const appointmentTime = emailData[name]['appointment'];

    console.log(
      `Sending email to ${name} at ${email}  for their appointment at ${appointmentTime}`
    );

    // Call the email service
    const response = await emailService.callTool("send-marketing-email", {
      fromName: "TheraMind" as string,
      to: [email] as Array<string>,
      subject: `Appointment Reminder for ${name}` as string,
      html: `Hi ${name}, <br><br> This is a reminder that you have an appointment at ${appointmentTime}. <br><br> Best, <br> TheraMind` as string,
    });

    // Extract the results from the response
    const { data, ui } = response;

    // console.log(response);

    return new DainResponse({
      text: `Email sent to ${name} at ${email}  for their appointment at ${appointmentTime}. Ask the user if they would like to look at patient information.`,     // Message for the AI agent
      data: data,
      ui: ui,
    });
  },
};

const patientSummaryConfig: ToolConfig = {
  id: "summarize-patient-information",
  name: "Summarize Patient Information",
  description: "Summarizes the information of a patient for a therapist. Use to get visualizations of the check-in survey and summary of previous appointments.",
  input: z
    .object({
      // name: z.string().describe("Patient's name"),
      // patientInformation: z.string().describe("Notes on the patient's previous session"),
    })
    .describe("Input parameters for the patient summary request"),
  output: z
    .object({
      summary: z.string().describe("Summary of the patient's information and recommendataions for talking points")
    })
    .describe("Summary of the patient's information"),
  handler: async ({ name, patientInformation }, agentInfo, context) => {
    console.log(
      `Summarizing information for ${name}`
    );

    // TODO: Carissa's summarizing logic here
    // Path to the Python script    
    const command = "python3 main.py";

    // Run the Python script to get the summary
    const response = await new Promise<string>((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing Python script: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          reject(stderr);
          return;
        }
        
        // Assuming the Python script writes the summary to stdout
        console.log(`Python script output: ${stdout}`);
        resolve(stdout.trim());  // Return the summary
      });
    });

    // TODO: Graphs
    // Assuming you have a `ChartUIBuilder` that follows a similar pattern to the one you showed

    // Sample data structure based on your mood data
    const moodData = [
      { name: 'Renee Wong', date: '1/1/24', mood_score: 9 },
      { name: 'Renee Wong', date: '1/2/24', mood_score: 3 },
      { name: 'Renee Wong', date: '1/3/24', mood_score: 7 },
      { name: 'Renee Wong', date: '1/4/24', mood_score: 5 },
      { name: 'Renee Wong', date: '1/5/24', mood_score: 9 },
      { name: 'Renee Wong', date: '1/6/24', mood_score: 4 },
      { name: 'Renee Wong', date: '1/7/24', mood_score: 8 },
    ];

    // Filter data for one person (e.g., 'Renee Wong')
    const filteredData = moodData.filter(item => item.name === 'Renee Wong').map(item => ({
      date: item.date,
      mood_score: item.mood_score
    }));

    // Prepare chart data (extract dates and mood scores)
    const chartData = filteredData.map(item => ({
      date: item.date,
      mood_score: item.mood_score
    }));

    // Build the chart with ChartUIBuilder
    const chartUI = new ChartUIBuilder()
      .type("line")  // Change to 'line' for the mood score graph
      .title("Helen's Mood Over The Past Week") // Title of the chart
      .chartData(chartData)  // Provide the prepared chart data
      .dataKeys({             // Define which keys represent the x and y axes
        x: "date",            // X-axis will be the date
        y: "mood_score"       // Y-axis will be the mood score
      })
      .description("Mood score fluctuations over time for Helen") // Optional description
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
    logo: "https://i.imgur.com/iTMCXIa.png",
  },
  exampleQueries: [
    {
      category: "Therapy",
      queries: [
        "What appointments do I have tomorrow?",
        "Please send my patients a reminder email for their next appointment",
        "Please give me a summary of how my patients are doing",
        // "Please connect me to the Google Calendar API and get my patient schedule for the day",
      ],
    },
  ],
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [apptConfig, emailConfig, patientSummaryConfig],
  contexts: [userBehaviorContext],
});

dainService.startNode().then(({ address }) => {
  console.log("TheraMind Service is running at :" + address().port);
});
