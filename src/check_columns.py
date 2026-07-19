import pandas as pd

df = pd.read_csv("data/listed_companies.csv")

print(df.columns.tolist())

print(df.head())