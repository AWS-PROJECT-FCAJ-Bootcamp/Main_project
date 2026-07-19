from provider import StockProvider

provider = StockProvider()

df = provider.get_ohlcv("FPT")

print(df.head())

print(df.shape)