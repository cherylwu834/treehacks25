import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.colors import ListedColormap, BoundaryNorm
import matplotlib.font_manager as fm

def create_symptom_chart_from_csv(csv_filepath, filename="symptom_chart.png", patient_name="Patient"):
    """
    Creates and saves a heatmap-like symptom chart from CSV data.

    Args:
        csv_filepath (str): The path to the CSV file containing the data.
                           The CSV should have the days of the month as columns and symptom rows.
        filename (str): The name of the file to save the image to (e.g., "symptom_chart.png").
        patient_name (str): The name of the patient for the chart title.
    """

    try:
        # Read the CSV file into a Pandas DataFrame
        df = pd.read_csv(csv_filepath, index_col=0)

        # Ensure that only the first 31 columns are used
        df = df.iloc[:, :31]
        data = df.to_numpy()

        # Get the symptom labels and day labels from the DataFrame
        symptom_labels = df.index.tolist()
        day_labels = df.columns.tolist()

    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_filepath}")
        return
    except Exception as e:
        print(f"Error reading CSV file: {e}")
        return

    # Colormap - Adjusted to match provided images
    colors = ["#90EE90", "#F0E68C", "#F08080"]  # LightGreen, Khaki, LightCoral
    cmap = ListedColormap(colors)
    bounds = [0, 1, 2, 3]
    norm = BoundaryNorm(bounds, cmap.N)

    # Font Setup
    plt.rcParams['font.family'] = 'sans-serif'
    plt.rcParams['font.sans-serif'] = ['Helvetica Neue', 'Arial', 'Helvetica'] # Ensure a fallback font

    fig, ax = plt.subplots(figsize=(15, 10))  # Adjust figure size

    # Create the heatmap
    img = ax.imshow(data, cmap=cmap, norm=norm, aspect='auto')

    # Set labels, increasing font size
    fontsize = 14  #Adjust font size here
    ax.set_yticks(np.arange(len(symptom_labels)))
    ax.set_yticklabels(symptom_labels, fontsize=fontsize)
    ax.set_xticks(np.arange(len(day_labels)))
    ax.set_xticklabels(day_labels, fontsize=fontsize)

    # Rotate column labels for better readability (optional)
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

    # Add gridlines (changed color to white)
    ax.set_xticks(np.arange(data.shape[1]+1)-.5, minor=True)
    ax.set_yticks(np.arange(data.shape[0]+1)-.5, minor=True)
    ax.grid(which="minor", color="white", linestyle='-', linewidth=0.5) #Grid lines are now white
    ax.tick_params(which="minor", size=0)

    # Set title and axis labels, increase font size
    title_fontsize = 16
    ax.set_title(f"Symptom Overview for {patient_name}", fontsize=title_fontsize)
    ax.set_xlabel("Day of the Month", fontsize=fontsize)
    ax.set_ylabel("Symptom", fontsize=fontsize)

    fig.tight_layout() #Adjust layout to prevent labels from overlapping

    plt.savefig(filename, dpi=300)  # Save the figure
    plt.close(fig) #Close the figure to free memory
    print(f"Chart saved to {filename}")

if __name__ == '__main__':
    # Example Usage

    # Call the function with the updated CSV file
    create_symptom_chart_from_csv("heat_map_data.csv", "heat_map_chart.png", patient_name="Helen Wong")
