with open("patient_summary.txt", "r") as file:
    for line in file:
        print(line, end="")  # `end=""` prevents double newlines
