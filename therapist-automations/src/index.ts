import { z } from "zod";
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
  ChartUIBuilder,
  ImageCardUIBuilder
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

const allPatientSummaryConfig: ToolConfig = {
  id: "summarize-patient-information",
  name: "Summarize Patient Information",
  description: "Summarizes the information of alls patient that a therapist has.",
  input: z
    .object({}),
  output: z
    .object({
      summary: z.string().describe("Summary of the patient's information and recommendataions for talking points")
    })
    .describe("Summary of the patient's information"),
  handler: async ({ }, agentInfo, context) => {

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

    return new DainResponse({
      text: `Highlights of previous interactions and give suggestions on things to touch on during the session`,     // Message for the AI agent
      data: {
        summary: response,
      },
      ui: undefined,
    });
  },
};


const patientHistoryConfig: ToolConfig = {
  id: "patient-history",
  name: "Patient History",
  description: "Historical data of patient. Use to get visualizations of all previous appointments and detailed statistics.",
  input: z
    .object({
      name: z.string().describe("Patient's name"),
      // patientInformation: z.string().describe("Notes on the patient's previous session"),
    })
    .describe("Input parameters for the patient summary request"),
  output: z
    .object({
      // summary: z.string().describe("Summary of the patient's information and recommendataions for talking points")
    })
    .describe("History of patient's past history"),
  handler: async ({ name }, agentInfo, context) => {
    console.log(
      `Getting history for information for ${name}`
    );

    // read in JSON file data
    const filePath2 = 'survey.json';
    const jsonData = fs.readFileSync(filePath2, 'utf8');
    const surveyData = JSON.parse(jsonData);
    console.log(surveyData);

    // Filter data for one person (e.g., 'Renee Wong')
    const filteredData = surveyData.filter(item => item.name === 'Helen Wong').map(item => ({
      date: item.date,
      mood_score: item.mood_score,
      therapist_score: item.therapist_score,
      irritability: item.irritability,
      depression: item.depression,
      anxiety: item.anxiety,
      sleep_quality: item.sleep_quality,
      interest_hobbies: item.interest_hobbies
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


    // NEW CHARTS
    // Prepare chart data for each metric
    const therapistScoreData = filteredData.map(item => ({
      date: item.date,
      therapist_score: item.therapist_score
    }));

    const irritabilityData = filteredData.map(item => ({
      date: item.date,
      irritability: item.irritability
    }));

    const depressionData = filteredData.map(item => ({
      date: item.date,
      depression: item.depression
    }));

    const anxietyData = filteredData.map(item => ({
      date: item.date,
      anxiety: item.anxiety
    }));

    const sleepQualityData = filteredData.map(item => ({
      date: item.date,
      sleep_quality: item.sleep_quality
    }));

    const interestHobbiesData = filteredData.map(item => ({
      date: item.date,
      interest_hobbies: item.interest_hobbies
    }));

    // Build the charts
    const therapistScoreChart = new ChartUIBuilder()
      .type("line")
      .title("Patient Care Satisfaction Over Time")
      .chartData(therapistScoreData)
      .dataKeys({ x: "date", y: "therapist_score" })
      .description("Patient's rating of their satisfaction over time.")
      .build();

    const irritabilityChart = new ChartUIBuilder()
      .type("line")
      .title("Irritability Score Over Time")
      .chartData(irritabilityData)
      .dataKeys({ x: "date", y: "irritability" })
      .description("Irritability trends over time.")
      .build();

    const depressionChart = new ChartUIBuilder()
      .type("line")
      .title("Depression Score Over Time")
      .chartData(depressionData)
      .dataKeys({ x: "date", y: "depression" })
      .description("Depression score fluctuations over time.")
      .build();

    const anxietyChart = new ChartUIBuilder()
      .type("line")
      .title("Anxiety Score Over Time")
      .chartData(anxietyData)
      .dataKeys({ x: "date", y: "anxiety" })
      .description("Anxiety trends over time.")
      .build();

    const sleepQualityChart = new ChartUIBuilder()
      .type("line")
      .title("Sleep Quality Score Over Time")
      .chartData(sleepQualityData)
      .dataKeys({ x: "date", y: "sleep_quality" })
      .description("Sleep quality changes over time.")
      .build();

    const interestHobbiesChart = new ChartUIBuilder()
      .type("line")
      .title("Interest in Hobbies Over Time")
      .chartData(interestHobbiesData)
      .dataKeys({ x: "date", y: "interest_hobbies" })
      .description("Changes in interest in hobbies over time.")
      .build();

    // compose the charts
    const dashboardUI = new CardUIBuilder()
    .title("Historical Data Dashboard")
    .addChild(chartUI)
    .addChild(therapistScoreChart)
    .addChild(irritabilityChart)
    .addChild(depressionChart)
    .addChild(anxietyChart)
    .addChild(sleepQualityChart)
    .addChild(interestHobbiesChart)

    .build();


    return new DainResponse({
      text: `Highlights of previous interactions and survey on ${name} and give suggestions on things to touch on during the session`,     // Message for the AI agent
      data: { },
      ui: dashboardUI
    });
  },
};


    
const patientSummaryConfig: ToolConfig = {
  id: "patient-information",
  name: "Patient Information",
  description: "More in depth summary of information on a patient. Use to get visualizations of the check-in survey and summary of previous appointments.",
  input: z
    .object({
      name: z.string().describe("Patient's name"),
      // patientInformation: z.string().describe("Notes on the patient's previous session"),
    })
    .describe("Input parameters for the patient summary request"),
  output: z
    .object({
      // summary: z.string().describe("Summary of the patient's information and recommendataions for talking points")
    })
    .describe("Summary of the patient's information"),
  handler: async ({ name }, agentInfo, context) => {
    console.log(
      `Summarizing information for ${name}`
    );

    // Sample data structure based on your mood data
    const moodData = [
      { name: 'Helen Wong', date: '1/1/24', mood_score: 9 },
      { name: 'Helen Wong', date: '1/2/24', mood_score: 3 },
      { name: 'Helen Wong', date: '1/3/24', mood_score: 1 },
      { name: 'Helen Wong', date: '1/4/24', mood_score: 5 },
      { name: 'Helen Wong', date: '1/5/24', mood_score: 7 },
      { name: 'Helen Wong', date: '1/6/24', mood_score: 4 },
      { name: 'Helen Wong', date: '1/7/24', mood_score: 1 },
    ];

    // Filter data for one person (e.g., 'Renee Wong')
    const filteredData = moodData.filter(item => item.name === 'Helen Wong').map(item => ({
      date: item.date,
      mood_score: item.mood_score
    }));

    // Prepare chart data (extract dates and mood scores)
    const chartData = filteredData.map(item => ({
      date: item.date,
      mood_score: item.mood_score
    }));

    // Build the chart with ChartUIBuilder
    const moodChartUI = new ChartUIBuilder()
      .type("line")  // Change to 'line' for the mood score graph
      .title("Helen's Mood Over The Past Week") // Title of the chart
      .chartData(chartData)  // Provide the prepared chart data
      .dataKeys({             // Define which keys represent the x and y axes
        x: "date",            // X-axis will be the date
        y: "mood_score"       // Y-axis will be the mood score
      })
      .description("Mood score fluctuations over time for Helen") // Optional description
      .build();


    const barChartData = [
      { category: "Irritability", frequency: 2.5 },
      { category: "Depression", frequency: 2 },
      { category: "Anxiety", frequency: 2 },
      { category: "Poor Sleep", frequency: 2.3 },
      { category: "Lost Interest in Hobbies", frequency: 2 },
    ];

    const barChartUI = new ChartUIBuilder()
      .type("bar")
      .title("Frequency of Negative Emotions") 
      .chartData(barChartData)
      .dataKeys({           
        x: "category",
        y: "frequency"
      })
      .description("Current snapshot of Emotional Well-Being") // Optional
      .build();

    const heatmapUI = new ImageCardUIBuilder("https://i.imgur.com/JbENdaa.png")
    .aspectRatio('wide')
    .build();
    

    const dashboardUI = new CardUIBuilder()
    .setRenderMode('page') // Set the render mode to 'page' for full page rendering
    .title(`Dashboard for ${name}`)
    .addChild(moodChartUI)
    .addChild(barChartUI)
    .addChild(heatmapUI)
    .build();

    return new DainResponse({
      text: `Highlights of previous interactions and survey on ${name} and give suggestions on things to touch on during the session`,     // Message for the AI agent
      data: { },
      ui: dashboardUI,
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
        "Give me an in depth analysis on one of my patients",
        "Give me historical data on one of my patients"
        // "Please connect me to the Google Calendar API and get my patient schedule for the day",
      ],
    },
  ],
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [apptConfig, emailConfig, allPatientSummaryConfig, patientSummaryConfig, patientHistoryConfig],
  // tools: [apptConfig, emailConfig, allPatientSummaryConfig, patientHistoryConfig],
  contexts: [userBehaviorContext],
});

dainService.startNode().then(({ address }) => {
  console.log("TheraMind Service is running at :" + address().port);
});
