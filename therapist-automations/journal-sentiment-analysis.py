import nltk
nltk.download('vader_lexicon')
import pandas as pd
from nltk.sentiment import SentimentIntensityAnalyzer

file_path = "journal_entries.csv" 
df = pd.read_csv(file_path)

sia = SentimentIntensityAnalyzer()

def calculate_mood_score(text):
    sentiment = sia.polarity_scores(text)
    compound_score = sentiment['compound']
    return round(((compound_score + 1) / 2) * 9 + 1) 

df['mood_score'] = df['journal_entry'].apply(calculate_mood_score)

df['name'] = df['first_name'] + " " + df['last_name']
output_df = df[['name', 'date', 'mood_score']]

output_df.to_csv("mood_scores.csv", index=False)

print("Mood scores saved to mood_scores.csv")
