from scrapybara import Scrapybara
from scrapybara.anthropic import Anthropic
from scrapybara.tools import BashTool, ComputerTool, EditTool, BrowserTool
from scrapybara.prompts import UBUNTU_SYSTEM_PROMPT
from pydantic import BaseModel
from typing import List
from dotenv import load_dotenv
import os
import json

load_dotenv()

# Define schemas for structured output
class Patient(BaseModel):
    patientID: str
    mood: str
    feelings: str

class Patients(BaseModel):
    patients: List[Patient]

def handle_step(step, log):
    """Stores step output in a list and prints it."""
    step_info = f"\nStep output: {step.text}"
    log.append(step_info)
    print(step_info)

    if step.tool_calls:
        for call in step.tool_calls:
            tool_info = f"Tool used: {call.tool_name}"
            log.append(tool_info)
            print(tool_info)
    
    if step.usage:
        token_info = f"Tokens used: {step.usage.total_tokens}"
        log.append(token_info)
        print(token_info)

def main():
    client = Scrapybara(
        api_key=os.getenv("SCRAPYBARA_API_KEY", "YOUR_API_KEY"),
        timeout=600,
    )

    # Start instance
    print("initializing scrapybara instance")
    instance = client.start_ubuntu()
    instance.browser.start()

    try:
        tools = [
            BashTool(instance),
            ComputerTool(instance),
            EditTool(instance),
            BrowserTool(instance),
        ]
        model = Anthropic()

        # Store all step logs
        step_logs = []

        # Run the AI process
        soft_response = client.act(
            model=model,
            tools=tools,
            system=UBUNTU_SYSTEM_PROMPT,
            prompt="Go to https://drive.google.com/file/d/1jzMkVDYo3097MFXO6oblPDOvPm91zHfF/view?usp=sharing. Summarize each patient's needs in one sentence, and put them in a list (not numbered, just new line).",
            on_step=lambda step: handle_step(step, step_logs),
        )

        raw_output = step_logs[-2]
        start_index = raw_output.find("Patient 1")  # Find where patient summary starts
        clipped_text = raw_output[start_index:]  # Extract from "Patient 1" onwards

        # Save all step logs and final response
        file_path = "patient_summary.txt"
        with open(file_path, "w") as f:
            f.write(clipped_text)  

        print(f"✅ Patient summaries saved to {file_path}")

        # Run the AI process
        structured_response = client.act(
            model=model,
            tools=tools,
            system=UBUNTU_SYSTEM_PROMPT,
            prompt="Go to https://drive.google.com/file/d/1jzMkVDYo3097MFXO6oblPDOvPm91zHfF/view?usp=sharing. Extract the patient data for all 5 patients in structured JSON format with patientID, moodScore (scale of 1-10), and feelings. Please save the entirety of the journal entry in the feelings column.",
            schema=Patient,
            on_step=lambda step: handle_step(step, step_logs),
        )

        #✅ Extract structured patient data
        if structured_response.output:
            patients_data = structured_response.output  # Ensure it's parsed into the Patients schema
            
            # Save as JSON
            json_path = "patients.json"
            with open(json_path, "w") as f:
                json.dump(patients_data.model_dump(), f, indent=4)

            print(f"✅ Structured patient data saved to {json_path}")

    finally:
        instance.browser.stop()
        instance.stop()

if __name__ == "__main__":
    main()