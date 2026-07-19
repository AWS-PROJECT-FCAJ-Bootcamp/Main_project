from vnstock import Company

company = Company(symbol="FPT", source="VCI")

df = company.overview()

print(df.T)